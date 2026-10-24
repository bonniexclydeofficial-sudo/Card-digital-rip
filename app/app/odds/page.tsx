import Link from "next/link";
import { getCatalog } from "@cdr/db";
import { money, oddsLabel, rtpLabel, TIER_LABEL } from "@/lib/format";

export default async function OddsPage() {
  const packs = await getCatalog();
  return (
    <div>
      <p className="kicker">Disclosure</p>
      <h1>Odds, value, and what buyback pays.</h1>
      <p className="lede">
        Each pack version publishes tier odds in basis points. They sum to 10,000. Expected value is the odds-weighted average
        fair market value of the cards in that version, including slabs already pulled. A rip does not quietly rewrite the
        odds.
      </p>
      <p>
        Instant buyback is 90% of fair market value, rounded down to the cent, with a 0.9 haircut when price confidence is low.
        Credits cannot be cashed out. Shipping later is a flat $7.99, waived above $500 of fair market value, and it is not
        charged in this build.
      </p>
      {packs.map((pack) => (
        <section key={pack.id}>
          <h2>
            <Link href={`/packs/${pack.slug}`}>{pack.name}</Link>
          </h2>
          <div className="row">
            <span>Price</span>
            <span>{money(pack.priceCents)}</span>
          </div>
          <div className="row">
            <span>Expected value</span>
            <span>{money(Math.round(pack.evCents))}</span>
          </div>
          <div className="row">
            <span>RTP</span>
            <span>{rtpLabel(pack.rtp)}</span>
          </div>
          {pack.tiers.map((tier) => (
            <div className="row" key={tier.tier}>
              <span>{TIER_LABEL[tier.tier] ?? tier.tier}</span>
              <span>
                {oddsLabel(tier.oddsBps)} · {tier.total} cards · {tier.stock} available
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
