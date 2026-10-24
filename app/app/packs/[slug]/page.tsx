import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackPage } from "@cdr/db";
import { DemoNote } from "@/components/demo-note";
import { PoolGrid } from "@/components/pool-grid";
import { RipButton } from "@/components/rip-button";
import { getSession } from "@/lib/session";
import { money, oddsLabel, rtpLabel, TIER_LABEL } from "@/lib/format";

const PROFILES = [
  { label: "Steady", href: "/packs/pack-25", match: (cents: number) => cents <= 2500 },
  { label: "Balance", href: "/packs/pack-100", match: (cents: number) => cents > 2500 && cents <= 10_000 },
  { label: "Wild", href: "/packs/pack-500", match: (cents: number) => cents > 10_000 },
];

export default async function PackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getPackPage(slug);
  if (!pack) notFound();
  const session = await getSession();
  const stock = pack.tiers.reduce((sum, tier) => sum + tier.stock, 0);
  const cards = pack.tiers.flatMap((tier) => tier.cards.map((card) => ({ ...card, tier: tier.tier })));
  return (
    <div className="pack-page">
      <DemoNote />
      {pack.status !== "live" ? (
        <section className="state-panel" data-testid="pack-paused">
          <p className="kicker">Paused</p>
          <h2>This pack is resting.</h2>
          <p>
            Published odds stay on the page. The sleeve does not move until the pack is live again. Nothing already in a
            vault changes.
          </p>
        </section>
      ) : null}
      {stock === 0 ? (
        <section className="state-panel" data-testid="pack-refill">
          <p className="kicker">Refilling</p>
          <h2>The pool is empty.</h2>
          <p>Every listed slab has been pulled. Odds stay published. A new rip waits until stock returns.</p>
        </section>
      ) : null}
      <div className="pack-top">
        <div>
          <p className="kicker">{pack.status === "live" ? "Live pack" : "Paused"}</p>
          <h1>{pack.name}</h1>
          <p className="lede">{pack.description}</p>
          <div className="chips" aria-label="Pack posture">
            {PROFILES.map((profile) => (
              <Link
                key={profile.label}
                className="chip"
                href={profile.href}
                aria-current={profile.match(pack.priceCents) ? "true" : undefined}
              >
                {profile.label}
              </Link>
            ))}
          </div>
          <p className="price" data-testid="pack-price">
            {money(pack.priceCents)}
          </p>
          <div className="row">
            <span>Expected value</span>
            <span data-testid="pack-ev">{money(Math.round(pack.evCents))}</span>
          </div>
          <div className="row">
            <span>RTP</span>
            <span>{rtpLabel(pack.rtp)}</span>
          </div>
          <div className="row">
            <span>Separate purchase offer</span>
            <span data-testid="buyback-rate">{pack.buybackBps / 100}%</span>
          </div>
          <div className="row">
            <span>Stock left</span>
            <span>{stock}</span>
          </div>
          <section data-testid="pack-odds" aria-label="Published odds">
            {pack.tiers.map((tier) => (
              <div className="odds-line" key={tier.tier} data-tier={tier.tier}>
                <div className="row">
                  <span className={`tier-${tier.tier}`}>{TIER_LABEL[tier.tier] ?? tier.tier}</span>
                  <span>
                    {oddsLabel(tier.oddsBps)} · {tier.stock}/{tier.total}
                    {tier.stock === 0 ? " · Refilling" : ""}
                  </span>
                </div>
                <div className="odds-track" aria-hidden="true">
                  <div className="odds-fill" style={{ width: `${Math.max(tier.oddsBps / 100, 1.2)}%` }} />
                </div>
              </div>
            ))}
          </section>
          <div className="badges">
            <span className="badge">Provably fair</span>
            <span className="badge">Vaulted</span>
            <span className="badge">Ship in 2 business days</span>
          </div>
          <p data-testid="fee-note">{pack.fees.note}</p>
          <p className="muted" data-testid="tax-note">
            Sales tax is collected when credits are spent on a card, not when credits are purchased. This demo rate is 0.
          </p>
          <p className="muted">The purchase offer expires 72 hours after it is made. It is not a refund.</p>
          <p className="kicker">Server seed hash</p>
          <p className="hash mono" data-testid="seed-hash">
            {pack.seedHash}
          </p>
        </div>
        <aside className="buy-dock" aria-label="Rip">
          <p className="kicker">Rip</p>
          <p className="price">{money(pack.priceCents)}</p>
          <p className="muted">EV {money(Math.round(pack.evCents))}. The draw is written before the animation.</p>
          {session ? (
            <RipButton
              slug={pack.slug}
              disabled={pack.status !== "live" || stock === 0}
              label={pack.status === "live" ? `Rip x1 · ${money(pack.priceCents)}` : "Pack paused"}
            />
          ) : (
            <Link className="btn" href="/login">
              Sign in to rip
            </Link>
          )}
        </aside>
      </div>
      <h2>Pool</h2>
      <PoolGrid cards={cards} />
    </div>
  );
}
