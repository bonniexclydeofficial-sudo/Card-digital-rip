/** Economics from SPEC §5 and the pack validator from §5.4 / §6 / §21. */

export const BASE_CASE = {
  beta: 0.92,
  b: 0.9,
  k: 0.85,
  f: 0.045,
  targetMargin: 0.05,
} as const;

export type EconAssumptions = {
  beta: number;
  b: number;
  k: number;
  f: number;
  targetMargin?: number;
  m?: number;
};

export function costFactor(a: EconAssumptions = BASE_CASE): number {
  return a.beta * a.b + (1 - a.beta) * a.k;
}

/** RTP that hits target margin m. SPEC §5.2. */
export function targetRtp(params: Partial<EconAssumptions> & { m?: number } = {}): number {
  const a = { ...BASE_CASE, ...params };
  const m = params.m ?? params.targetMargin ?? a.targetMargin;
  return (1 - a.f - m) / costFactor(a);
}

/** Gross margin as a fraction of rip revenue. SPEC §5.2. */
export function grossMargin(rtp: number, params: Partial<EconAssumptions> = {}): number {
  const a = { ...BASE_CASE, ...params };
  return 1 - rtp * costFactor(a) - a.f;
}

/** Value the player receives ÷ spend, counting kept cards at full FMV. */
export function playerReturn(rtp: number, params: Partial<EconAssumptions> = {}): number {
  const a = { ...BASE_CASE, ...params };
  return rtp * (a.beta * a.b + (1 - a.beta));
}

export const BUYBACK_RATE_BPS = 9000;
export const LOW_CONFIDENCE_HAIRCUT_BPS = 9000;

export function buybackCreditCents(
  fmvCents: number,
  confidence: "high" | "low",
  rateBps = BUYBACK_RATE_BPS,
): { creditCents: number; haircutBps: number; rateBps: number } {
  const haircutBps = confidence === "low" ? LOW_CONFIDENCE_HAIRCUT_BPS : 10_000;
  const creditCents = Number(
    (BigInt(fmvCents) * BigInt(haircutBps) * BigInt(rateBps)) / 100_000_000n,
  );
  return { creditCents, haircutBps, rateBps };
}

export const TIER_ORDER = ["common", "rare", "epic", "legendary", "grail"] as const;
export type TierName = (typeof TIER_ORDER)[number];

export const RULES = {
  rtpMin: 0.98,
  rtpMax: 1.03,
  minMargin: 0.04,
  maxCardEvShare: 0.1,
  minCardsPerTier: 3,
  staleMs: 7 * 24 * 60 * 60 * 1000,
  highValueCents: 100_000,
  highValueStaleMs: 24 * 60 * 60 * 1000,
} as const;

export function isStalePrice(fmvCents: number, fmvAt: Date | string, now: Date): boolean {
  const at = new Date(fmvAt).getTime();
  const age = now.getTime() - at;
  const limit = fmvCents > RULES.highValueCents ? RULES.highValueStaleMs : RULES.staleMs;
  return age > limit;
}

export interface PoolCard {
  id: string;
  fmvCents: number;
  fmvAt: Date | string;
  imageFrontUrl?: string | null;
  imageBackUrl?: string | null;
}

export interface PoolTier {
  tier: string;
  oddsBps: number;
  cards: PoolCard[];
}

export interface PackValidation {
  ok: boolean;
  errors: { code: string; message: string }[];
  evCents: number;
  rtp: number;
  gm: number;
  liabilityCents: number;
}

export function stockWeightedEvCents(tiers: Pick<PoolTier, "oddsBps" | "cards">[]): number {
  let weighted = 0;
  for (const tier of tiers) {
    if (tier.cards.length === 0 || tier.oddsBps === 0) continue;
    const sum = tier.cards.reduce((s, c) => s + c.fmvCents, 0);
    weighted += tier.oddsBps * (sum / tier.cards.length);
  }
  return weighted / 10_000;
}

export function validatePack(input: {
  priceCents: number;
  tiers: PoolTier[];
  inventoryFmvCents: number;
  now?: Date;
  assumptions?: Partial<EconAssumptions>;
}): PackValidation {
  const now = input.now ?? new Date();
  const errors: { code: string; message: string }[] = [];
  const oddsSum = input.tiers.reduce((s, t) => s + t.oddsBps, 0);
  if (oddsSum !== 10_000) {
    errors.push({
      code: "ODDS_SUM",
      message: `Tier odds must sum to 10000 bps (got ${oddsSum}).`,
    });
  }

  const seen = new Set<string>();
  let liabilityCents = 0;
  for (const tier of input.tiers) {
    if (tier.oddsBps > 0 && tier.cards.length < RULES.minCardsPerTier) {
      errors.push({
        code: "TIER_DEPTH",
        message: `${tier.tier} has ${tier.cards.length} cards; minimum is ${RULES.minCardsPerTier}.`,
      });
    }
    for (const card of tier.cards) {
      if (seen.has(card.id)) {
        errors.push({ code: "DUPLICATE_CARD", message: `Card ${card.id} is in more than one slot.` });
      }
      seen.add(card.id);
      liabilityCents += card.fmvCents;
      if (!card.imageFrontUrl || !card.imageBackUrl) {
        errors.push({
          code: "MISSING_IMAGE",
          message: `Card ${card.id} needs front and back art before allocation.`,
        });
      }
      if (isStalePrice(card.fmvCents, card.fmvAt, now)) {
        errors.push({
          code: "STALE_PRICE",
          message: `Card ${card.id} has a stale FMV.`,
        });
      }
    }
  }

  if (liabilityCents > input.inventoryFmvCents) {
    errors.push({
      code: "LIABILITY",
      message: `Allocated FMV ${liabilityCents} exceeds in-custody inventory ${input.inventoryFmvCents}.`,
    });
  }

  const evCents = stockWeightedEvCents(input.tiers);
  const rtp = input.priceCents > 0 ? evCents / input.priceCents : Number.POSITIVE_INFINITY;
  if (!(rtp >= RULES.rtpMin - 1e-9 && rtp <= RULES.rtpMax + 1e-9)) {
    errors.push({
      code: "RTP_BAND",
      message: `RTP ${(rtp * 100).toFixed(2)}% is outside [98%, 103%].`,
    });
  }

  const gm = grossMargin(rtp, input.assumptions);
  if (!(gm >= RULES.minMargin - 1e-9)) {
    errors.push({
      code: "MARGIN",
      message: `Gross margin ${(gm * 100).toFixed(2)}% is under 4%.`,
    });
  }

  if (evCents > 0) {
    for (const tier of input.tiers) {
      if (tier.oddsBps <= 0 || tier.cards.length === 0) continue;
      for (const card of tier.cards) {
        const share = ((tier.oddsBps / 10_000) / tier.cards.length) * card.fmvCents / evCents;
        if (share > RULES.maxCardEvShare + 1e-9) {
          errors.push({
            code: "CARD_EV_SHARE",
            message: `Card ${card.id} is ${(share * 100).toFixed(2)}% of pack EV (max 10%).`,
          });
        }
      }
    }
  }

  const unique = new Map<string, { code: string; message: string }>();
  for (const error of errors) {
    const key = `${error.code}:${error.message}`;
    if (!unique.has(key)) unique.set(key, error);
  }

  return {
    ok: unique.size === 0,
    errors: [...unique.values()],
    evCents,
    rtp,
    gm,
    liabilityCents,
  };
}

export interface ExampleTierSpec {
  tier: TierName;
  oddsBps: number;
  fmvCents: number;
  count: number;
}

export interface ExamplePackSpec {
  slug: string;
  name: string;
  priceCents: number;
  description: string;
  featured: boolean;
  tiers: ExampleTierSpec[];
}

const PACK_25_TIERS: ExampleTierSpec[] = [
  { tier: "common", oddsBps: 7500, fmvCents: 1400, count: 16 },
  { tier: "rare", oddsBps: 1800, fmvCents: 2800, count: 8 },
  { tier: "epic", oddsBps: 550, fmvCents: 7000, count: 6 },
  { tier: "legendary", oddsBps: 140, fmvCents: 22_000, count: 4 },
  { tier: "grail", oddsBps: 10, fmvCents: 273_000, count: 3 },
];

const PACK_100_TIERS: ExampleTierSpec[] = [
  { tier: "common", oddsBps: 7200, fmvCents: 6200, count: 24 },
  { tier: "rare", oddsBps: 2000, fmvCents: 12_000, count: 12 },
  { tier: "epic", oddsBps: 650, fmvCents: 28_000, count: 8 },
  { tier: "legendary", oddsBps: 140, fmvCents: 65_000, count: 4 },
  { tier: "grail", oddsBps: 10, fmvCents: 500_000, count: 3 },
];

const PACK_500_TIERS: ExampleTierSpec[] = [
  { tier: "common", oddsBps: 7400, fmvCents: 28_000, count: 20 },
  { tier: "rare", oddsBps: 1800, fmvCents: 52_000, count: 12 },
  { tier: "epic", oddsBps: 600, fmvCents: 140_000, count: 6 },
  { tier: "legendary", oddsBps: 180, fmvCents: 400_000, count: 4 },
  { tier: "grail", oddsBps: 20, fmvCents: 2_400_000, count: 3 },
];

export const LIVE_PACKS: ExamplePackSpec[] = [
  {
    slug: "pack-25",
    name: "Field Notes",
    priceCents: 2500,
    featured: true,
    description: "A short session. Commons sit near the cost of a blaster, with a thin grail tail.",
    tiers: PACK_25_TIERS,
  },
  {
    slug: "pack-100",
    name: "Archive",
    priceCents: 10_000,
    featured: true,
    description: "The reference pack. Odds and tier values follow the published $100 example.",
    tiers: PACK_100_TIERS,
  },
  {
    slug: "pack-500",
    name: "Vault Door",
    priceCents: 50_000,
    featured: true,
    description: "Fewer rips, heavier slabs. Still inside the 98–103% RTP band.",
    tiers: PACK_500_TIERS,
  },
];

/** Valid draft: RTP 100.8%, every card under the 10% EV cap. */
export const DRAFT_OK: ExamplePackSpec = {
  slug: "draft-ok",
  name: "Draft — ready",
  priceCents: 2500,
  featured: false,
  description: "Unpublished pack that clears the margin guard.",
  tiers: [
    { tier: "common", oddsBps: 7500, fmvCents: 2520, count: 8 },
    { tier: "rare", oddsBps: 1800, fmvCents: 2520, count: 3 },
    { tier: "epic", oddsBps: 550, fmvCents: 2520, count: 3 },
    { tier: "legendary", oddsBps: 140, fmvCents: 2520, count: 3 },
    { tier: "grail", oddsBps: 10, fmvCents: 2520, count: 3 },
  ],
};

/**
 * RTP 102.5% is inside the band, but base-case GM is about 3.66%.
 * Publish must stop on MARGIN alone.
 */
export const DRAFT_THIN_MARGIN: ExamplePackSpec = {
  slug: "draft-thin-margin",
  name: "Draft — thin margin",
  priceCents: 100_000,
  featured: false,
  description: "Blocked by the 4% margin guard.",
  tiers: [
    { tier: "common", oddsBps: 7200, fmvCents: 102_500, count: 8 },
    { tier: "rare", oddsBps: 2000, fmvCents: 102_500, count: 3 },
    { tier: "epic", oddsBps: 650, fmvCents: 102_500, count: 3 },
    { tier: "legendary", oddsBps: 140, fmvCents: 102_500, count: 3 },
    { tier: "grail", oddsBps: 10, fmvCents: 102_500, count: 3 },
  ],
};

export const SPARE_CARD_COUNT = 27;

export function designEvCents(pack: ExamplePackSpec): number {
  return pack.tiers.reduce((sum, tier) => sum + tier.oddsBps * tier.fmvCents, 0) / 10_000;
}

export function packCardCount(pack: ExamplePackSpec): number {
  return pack.tiers.reduce((sum, tier) => sum + tier.count, 0);
}

export function tiersToPool(pack: ExamplePackSpec, now: Date): PoolTier[] {
  return pack.tiers.map((tier) => ({
    tier: tier.tier,
    oddsBps: tier.oddsBps,
    cards: Array.from({ length: tier.count }, (_, index) => ({
      id: `${pack.slug}-${tier.tier}-${index}`,
      fmvCents: tier.fmvCents,
      fmvAt: now.toISOString(),
      imageFrontUrl: `/api/slab/${pack.slug}-${tier.tier}-${index}?side=front`,
      imageBackUrl: `/api/slab/${pack.slug}-${tier.tier}-${index}?side=back`,
    })),
  }));
}
