import { grossMargin, stockWeightedEvCents, RULES, type PoolTier } from "@cdr/econ";

export interface FeedCard {
  id: string;
  grader: string;
  certNumber: string;
  fmvCents: number;
}

export interface FeedQuote {
  fmvCents: number;
  source: string;
  confidence: "high" | "low";
}

export interface PriceFeed {
  name: string;
  quote(card: FeedCard): Promise<FeedQuote | null>;
}

/** Scripted feed for tests and the nightly job until a licensed feed is contracted. */
export class ExamplePriceFeed implements PriceFeed {
  name = "example";
  constructor(private readonly quotes: Record<string, FeedQuote> = {}) {}
  async quote(card: FeedCard): Promise<FeedQuote | null> {
    return this.quotes[card.certNumber] ?? this.quotes[card.id] ?? null;
  }
}

export function dropExceeds(previousCents: number, nextCents: number, threshold = 0.1): boolean {
  if (previousCents <= 0) return false;
  return (previousCents - nextCents) / previousCents > threshold;
}

export function packStillInBand(input: { priceCents: number; tiers: PoolTier[] }): {
  ok: boolean;
  rtp: number;
  gm: number;
} {
  const ev = stockWeightedEvCents(input.tiers);
  const rtp = input.priceCents > 0 ? ev / input.priceCents : Number.POSITIVE_INFINITY;
  const gm = grossMargin(rtp);
  const ok = rtp >= RULES.rtpMin - 1e-9 && rtp <= RULES.rtpMax + 1e-9 && gm >= RULES.minMargin - 1e-9;
  return { ok, rtp, gm };
}
