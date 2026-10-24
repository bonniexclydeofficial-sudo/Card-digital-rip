import { createHash, createHmac, randomBytes } from "node:crypto";

export const TIER_ORDER = ["common", "rare", "epic", "legendary", "grail"] as const;
export type TierName = (typeof TIER_ORDER)[number];

/** 32-byte fixture. HMAC key is these raw bytes, not the hex ASCII. */
export const EXAMPLE_SERVER_SEED_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const EXAMPLE_CLIENT_SEED = "ada-client-seed";

export function randomServerSeedHex(): string {
  return randomBytes(32).toString("hex");
}

export function seedKey(serverSeedHex: string): Buffer {
  if (!/^[0-9a-fA-F]+$/.test(serverSeedHex) || serverSeedHex.length % 2 !== 0) {
    throw new Error("server seed must be hex");
  }
  const key = Buffer.from(serverSeedHex, "hex");
  if (key.length !== 32) throw new Error("server seed must be 32 bytes");
  return key;
}

export function commitHash(serverSeedHex: string): string {
  return createHash("sha256").update(seedKey(serverSeedHex)).digest("hex");
}

export function messageFor(clientSeed: string, nonce: number, packVersion: number): string {
  return `${clientSeed}:${nonce}:${packVersion}`;
}

export function hmacSha256(serverSeedHex: string, message: string): Buffer {
  return createHmac("sha256", seedKey(serverSeedHex)).update(message, "utf8").digest();
}

/** Largest multiple of `modulus` that fits in a uint32. Values at or above this are rejected. */
export function rejectionLimit(modulus: number): number {
  if (!Number.isInteger(modulus) || modulus <= 0 || modulus > 0x1_0000_0000) {
    throw new Error(`bad modulus ${modulus}`);
  }
  return Math.floor(0x1_0000_0000 / modulus) * modulus;
}

/** Null means "draw the next uint32". */
export function rejectionSample(value: number, modulus: number): number | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`bad uint32 ${value}`);
  }
  if (value >= rejectionLimit(modulus)) return null;
  return value % modulus;
}

export function firstAccepted(words: number[], modulus: number): { value: number; wordsUsed: number } {
  for (let i = 0; i < words.length; i++) {
    const sampled = rejectionSample(words[i], modulus);
    if (sampled !== null) return { value: sampled, wordsUsed: i + 1 };
  }
  throw new Error("rejection sampling exhausted the provided words");
}

export interface TierOdds {
  tier: string;
  oddsBps: number;
}

class ByteStream {
  private blocks: Buffer[] = [];
  private bytePos = 0;

  constructor(
    private readonly serverSeedHex: string,
    private readonly message: string,
  ) {}

  private block(index: number): Buffer {
    while (this.blocks.length <= index) {
      const n = this.blocks.length;
      const msg = n === 0 ? this.message : `${this.message}:${n}`;
      this.blocks.push(hmacSha256(this.serverSeedHex, msg));
    }
    return this.blocks[index];
  }

  get hmacHex(): string {
    return this.block(0).toString("hex");
  }

  nextUint32(): number {
    const blockIndex = Math.floor(this.bytePos / 32);
    const offset = this.bytePos % 32;
    const value = this.block(blockIndex).readUInt32BE(offset);
    this.bytePos += 4;
    return value;
  }

  sample(modulus: number): number {
    for (let i = 0; i < 64; i++) {
      const sampled = rejectionSample(this.nextUint32(), modulus);
      if (sampled !== null) return sampled;
    }
    throw new Error("rejection sampling exhausted");
  }
}

function orderedTiers(tiers: TierOdds[]): TierOdds[] {
  return [...tiers].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.tier as TierName);
    const bi = TIER_ORDER.indexOf(b.tier as TierName);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export interface DrawInput {
  serverSeedHex: string;
  clientSeed: string;
  nonce: number;
  packVersion: number;
  tiers: TierOdds[];
  /** Available slots in the drawn tier. Verifiers pass the stored list length. */
  slotCount: number;
}

export interface DrawResult {
  message: string;
  hmac: string;
  tier: string;
  tierIndex: number;
  roll: number;
  slotIndex: number;
}

export function draw(input: DrawInput): DrawResult {
  const tiers = orderedTiers(input.tiers);
  const sum = tiers.reduce((total, tier) => total + tier.oddsBps, 0);
  if (sum !== 10_000) throw new Error(`odds must sum to 10000, got ${sum}`);
  if (!Number.isInteger(input.slotCount) || input.slotCount <= 0) {
    throw new Error("slotCount must be a positive integer");
  }
  const message = messageFor(input.clientSeed, input.nonce, input.packVersion);
  const stream = new ByteStream(input.serverSeedHex, message);
  const roll = stream.sample(10_000);
  let acc = 0;
  let tierIndex = 0;
  for (let i = 0; i < tiers.length; i++) {
    acc += tiers[i].oddsBps;
    if (roll < acc) {
      tierIndex = i;
      break;
    }
  }
  const slotIndex = stream.sample(input.slotCount);
  return {
    message,
    hmac: stream.hmacHex,
    tier: tiers[tierIndex].tier,
    tierIndex,
    roll,
    slotIndex,
  };
}

/**
 * Same byte stream as `draw`, but the slot modulus is chosen after the tier
 * roll so an empty tier can pause the pack without sampling a slot.
 */
export function openDraw(input: Omit<DrawInput, "slotCount" | "tiers"> & { tiers: TierOdds[] }): {
  message: string;
  hmac: string;
  pickTier: () => { tier: string; tierIndex: number; roll: number };
  pickSlot: (slotCount: number) => number;
} {
  const tiers = orderedTiers(input.tiers);
  const sum = tiers.reduce((total, tier) => total + tier.oddsBps, 0);
  if (sum !== 10_000) throw new Error(`odds must sum to 10000, got ${sum}`);
  const message = messageFor(input.clientSeed, input.nonce, input.packVersion);
  const stream = new ByteStream(input.serverSeedHex, message);
  return {
    message,
    get hmac() {
      return stream.hmacHex;
    },
    pickTier() {
      const roll = stream.sample(10_000);
      let acc = 0;
      for (let i = 0; i < tiers.length; i++) {
        acc += tiers[i].oddsBps;
        if (roll < acc) return { tier: tiers[i].tier, tierIndex: i, roll };
      }
      return { tier: tiers[tiers.length - 1].tier, tierIndex: tiers.length - 1, roll };
    },
    pickSlot(slotCount: number) {
      if (!Number.isInteger(slotCount) || slotCount <= 0) {
        throw new Error("slotCount must be a positive integer");
      }
      return stream.sample(slotCount);
    },
  };
}

export function hashSlotList(slotIds: readonly string[]): string {
  return createHash("sha256").update(slotIds.join(","), "utf8").digest("hex");
}

export interface VerifyInput {
  serverSeedHex: string;
  clientSeed: string;
  nonce: number;
  packVersion: number;
  tiers: TierOdds[];
  slotIds: readonly string[];
  expected: {
    hmac: string;
    tier: string;
    slotIndex: number;
    slotId: string;
    slotListHash: string;
  };
}

export function verifyPull(input: VerifyInput): {
  ok: boolean;
  mismatches: string[];
  recomputed: DrawResult;
  slotId: string | null;
} {
  const recomputed = draw({ ...input, slotCount: input.slotIds.length });
  const mismatches: string[] = [];
  const slotListHash = hashSlotList(input.slotIds);
  if (recomputed.hmac !== input.expected.hmac) mismatches.push("hmac");
  if (recomputed.tier !== input.expected.tier) mismatches.push("tier");
  if (recomputed.slotIndex !== input.expected.slotIndex) mismatches.push("slotIndex");
  if (slotListHash !== input.expected.slotListHash) mismatches.push("slotListHash");
  const slotId = input.slotIds[recomputed.slotIndex] ?? null;
  if (slotId !== input.expected.slotId) mismatches.push("slotId");
  return { ok: mismatches.length === 0, mismatches, recomputed, slotId };
}
