import { writeFileSync } from "node:fs";
import path from "node:path";
import { draw, EXAMPLE_CLIENT_SEED, EXAMPLE_SERVER_SEED_HEX } from "../packages/fair/src/index";

const archive = [
  { tier: "common", oddsBps: 7200 },
  { tier: "rare", oddsBps: 2000 },
  { tier: "epic", oddsBps: 650 },
  { tier: "legendary", oddsBps: 140 },
  { tier: "grail", oddsBps: 10 },
];

const notes = [
  { tier: "common", oddsBps: 7500 },
  { tier: "rare", oddsBps: 1800 },
  { tier: "epic", oddsBps: 550 },
  { tier: "legendary", oddsBps: 140 },
  { tier: "grail", oddsBps: 10 },
];

const cases = [
  { name: "archive-nonce-0", clientSeed: EXAMPLE_CLIENT_SEED, nonce: 0, packVersion: 1, tiers: archive, slotCount: 24 },
  { name: "archive-nonce-1", clientSeed: EXAMPLE_CLIENT_SEED, nonce: 1, packVersion: 1, tiers: archive, slotCount: 12 },
  { name: "archive-nonce-2", clientSeed: EXAMPLE_CLIENT_SEED, nonce: 2, packVersion: 1, tiers: archive, slotCount: 8 },
  { name: "archive-nonce-7", clientSeed: "client-seed-test", nonce: 7, packVersion: 1, tiers: archive, slotCount: 3 },
  { name: "notes-nonce-0", clientSeed: EXAMPLE_CLIENT_SEED, nonce: 0, packVersion: 1, tiers: notes, slotCount: 16 },
  { name: "notes-nonce-4", clientSeed: "rotated-client", nonce: 4, packVersion: 2, tiers: notes, slotCount: 3 },
];

const vectors = cases.map((item) => {
  const result = draw({
    serverSeedHex: EXAMPLE_SERVER_SEED_HEX,
    clientSeed: item.clientSeed,
    nonce: item.nonce,
    packVersion: item.packVersion,
    tiers: item.tiers,
    slotCount: item.slotCount,
  });
  return {
    name: item.name,
    serverSeedHex: EXAMPLE_SERVER_SEED_HEX,
    clientSeed: item.clientSeed,
    nonce: item.nonce,
    packVersion: item.packVersion,
    tiers: item.tiers,
    slotCount: item.slotCount,
    expected: {
      hmac: result.hmac,
      tier: result.tier,
      roll: result.roll,
      slotIndex: result.slotIndex,
    },
  };
});

const target = path.join(process.cwd(), "packages/fair/vectors/published.json");
writeFileSync(target, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${vectors.length} vectors to ${target}`);
