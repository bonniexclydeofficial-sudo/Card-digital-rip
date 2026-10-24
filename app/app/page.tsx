import Link from "next/link";
import { getCatalog } from "@cdr/db";
import { money, oddsLabel, TIER_LABEL } from "@/lib/format";

export default async function HomePage() {
  const packs = await getCatalog();
  return (
    <div>
      <p className="banner">Example inventory. These slabs are fictional, generated from a cert, and marked EXAMPLE.</p>
      <p className="kicker">A vault, not a casino floor</p>
      <h1>Open the pack. Keep the slab. Or sell it back for credits.</h1>
      <p className="lede">
        Three published packs. Odds, expected value, and the server-seed hash are on the pack page before you rip.
        Buyback pays credits only. Nothing here withdraws to a bank.
      </p>
      <div className="decision" style={{ margin: "24px 0 40px" }}>
        <Link className="btn" href="/catalog">
          See the packs
        </Link>
        <Link className="btn secondary" href="/how-it-works">
          How a rip is settled
        </Link>
      </div>
      <div className="grid-3">
        {packs.map((pack) => (
          <Link key={pack.id} href={`/packs/${pack.slug}`} className="ticket">
            <p className="kicker">{pack.status === "live" ? "Live" : pack.status}</p>
            <h2>{pack.name}</h2>
            <p className="price">{money(pack.priceCents)}</p>
            <p className="muted">{pack.description}</p>
            <div className="row">
              <span>Expected value</span>
              <span className="stat">{money(Math.round(pack.evCents))}</span>
            </div>
            {pack.tiers.map((tier) => (
              <div className="row" key={tier.tier}>
                <span className={`tier-${tier.tier}`}>{TIER_LABEL[tier.tier] ?? tier.tier}</span>
                <span>{oddsLabel(tier.oddsBps)}</span>
              </div>
            ))}
          </Link>
        ))}
      </div>
    </div>
  );
}
