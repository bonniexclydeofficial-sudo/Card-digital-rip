import Link from "next/link";
import { getCatalog, latestPull, liveFeed } from "@cdr/db";
import { Slab } from "@/components/slab";
import { money, oddsLabel, TIER_LABEL } from "@/lib/format";

export default async function HomePage() {
  const [packs, feed, latest] = await Promise.all([getCatalog(), liveFeed(10), latestPull()]);
  const cards = packs.flatMap((pack) =>
    pack.tiers.flatMap((tier) =>
      tier.cards.map((card) => ({ ...card, tier: tier.tier, packName: pack.name, slug: pack.slug })),
    ),
  );
  const whale = cards.reduce<(typeof cards)[number] | null>((best, card) => {
    if (!best || card.fmvCents > best.fmvCents) return card;
    return best;
  }, null);
  const ticker = feed.length > 0 ? [...feed, ...feed] : [];
  return (
    <div>
      <p className="banner">Example inventory. These slabs are fictional, generated from a cert, and marked EXAMPLE.</p>
      <p className="kicker">A vault, not a casino floor</p>
      <h1>Open the pack. Keep the slab. Or sell it back for credits.</h1>
      <p className="lede">
        Three published packs. Odds, expected value, and the server-seed hash are on the pack page before you rip.
        Buyback pays credits only. Nothing here withdraws to a bank.
      </p>
      <div className="decision" style={{ margin: "24px 0 8px" }}>
        <Link className="btn" href="/catalog">
          See the packs
        </Link>
        <Link className="btn secondary" href="/how-it-works">
          How a rip is settled
        </Link>
      </div>
      <div className="ticker" aria-label="Recent pulls">
        <div className="ticker-track">
          {ticker.length === 0 ? <span>The floor is quiet. The example verify pull is ready.</span> : null}
          {ticker.map((pull, index) => (
            <span key={`${pull.id}-${index}`}>
              <b>{pull.username}</b> · {pull.pack} · {TIER_LABEL[pull.tier] ?? pull.tier}
            </span>
          ))}
        </div>
      </div>
      <ul className="proof">
        <li>
          <strong>{cards.length}</strong>
          Example slabs sitting in the live pools.
        </li>
        <li>
          <strong>100%</strong>
          Odds published before the sleeve moves.
        </li>
        <li>
          <strong>72h</strong>
          Separate purchase offer. Not a refund.
        </li>
        <li>
          <strong>2 days</strong>
          Business-day ship target after a clean request.
        </li>
      </ul>
      <h2>Packs</h2>
      <div className="grid-3">
        {packs.map((pack) => (
          <Link key={pack.id} href={`/packs/${pack.slug}`} className="ticket rarity-card">
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
      {whale ? (
        <section>
          <h2>Whale spotlight</h2>
          <p className="muted">Highest fair market value still listed in a live pool. Example art, not a photograph.</p>
          <article className="ticket" style={{ maxWidth: 420 }}>
            <div className="holo">
              <Slab
                cert={whale.certNumber}
                subject={whale.subject}
                grade={whale.grade}
                grader={whale.grader}
                year={whale.year}
                setName={whale.setName}
                pulled={whale.slotState !== "available"}
              />
            </div>
            <p className={`kicker tier-${whale.tier}`}>{TIER_LABEL[whale.tier] ?? whale.tier}</p>
            <h2>{whale.subject}</h2>
            <p className="price">{money(whale.fmvCents)}</p>
            <p className="muted">
              {whale.grader} {whale.grade} · {whale.packName}
              {latest ? ` · latest rip ${latest.subject}` : ""}
            </p>
            <Link className="btn" href={`/packs/${whale.slug}`}>
              Open {whale.packName}
            </Link>
          </article>
        </section>
      ) : null}
    </div>
  );
}
