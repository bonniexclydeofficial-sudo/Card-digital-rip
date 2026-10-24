import Link from "next/link";
import { getCatalog, liveFeed } from "@cdr/db";
import { DemoNote } from "@/components/demo-note";
import { money, oddsLabel, rtpLabel, TIER_LABEL } from "@/lib/format";

export default async function CatalogPage() {
  const packs = await getCatalog();
  const feed = await liveFeed(16);
  return (
    <div>
      <DemoNote />
      <p className="kicker">Packs</p>
      <h1>Field Notes, Archive, Vault Door.</h1>
      <div className="grid-3">
        {packs.map((pack) => (
          <Link key={pack.id} href={`/packs/${pack.slug}`} className="ticket rarity-card">
            <p className="kicker">{money(pack.priceCents)}</p>
            <h2>{pack.name}</h2>
            <p className="muted">{pack.description}</p>
            <div className="row">
              <span>EV</span>
              <span>{money(Math.round(pack.evCents))}</span>
            </div>
            <div className="row">
              <span>RTP</span>
              <span>{rtpLabel(pack.rtp)}</span>
            </div>
            {pack.tiers.map((tier) => (
              <div className="row" key={tier.tier}>
                <span className={`tier-${tier.tier}`}>{TIER_LABEL[tier.tier] ?? tier.tier}</span>
                <span>
                  {oddsLabel(tier.oddsBps)} · {tier.stock} left
                </span>
              </div>
            ))}
          </Link>
        ))}
      </div>
      <h2>Recent rips</h2>
      <ul>
        {feed.map((pull) => (
          <li className="feed-chip" key={pull.id} style={{ margin: "8px 0" }}>
            <span className="avatar" aria-hidden="true">
              {pull.username.slice(0, 2).toUpperCase()}
            </span>
            <span>{pull.username}</span>
            <span className={`tier-chip tier-${pull.tier}`}>{TIER_LABEL[pull.tier] ?? pull.tier}</span>
            <span className="muted">
              {pull.pack} · {pull.subject}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
