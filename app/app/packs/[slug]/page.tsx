import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackPage } from "@cdr/db";
import { RipButton } from "@/components/rip-button";
import { Slab } from "@/components/slab";
import { getSession } from "@/lib/session";
import { money, oddsLabel, rtpLabel, TIER_LABEL } from "@/lib/format";

export default async function PackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getPackPage(slug);
  if (!pack) notFound();
  const session = await getSession();
  const stock = pack.tiers.reduce((sum, tier) => sum + tier.stock, 0);
  return (
    <div>
      <p className="banner">Example inventory. Slabs are generative art from the cert. They are not photographs of real cards.</p>
      <div className="grid-2">
        <div>
          <p className="kicker">{pack.status === "live" ? "Live pack" : "Paused"}</p>
          <h1>{pack.name}</h1>
          <p className="lede">{pack.description}</p>
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
          <section data-testid="pack-odds">
            {pack.tiers.map((tier) => (
              <div className="row" key={tier.tier} data-tier={tier.tier}>
                <span className={`tier-${tier.tier}`}>{TIER_LABEL[tier.tier] ?? tier.tier}</span>
                <span>
                  {oddsLabel(tier.oddsBps)} · {tier.stock}/{tier.total}
                </span>
              </div>
            ))}
          </section>
          <p data-testid="fee-note">{pack.fees.note}</p>
          <p className="muted" data-testid="tax-note">
            Sales tax is collected when credits are spent on a card, not when credits are purchased. This demo rate is 0.
          </p>
          <p className="muted">The purchase offer expires 72 hours after it is made. It is not a refund.</p>
          <p className="kicker">Server seed hash</p>
          <p className="hash mono" data-testid="seed-hash">
            {pack.seedHash}
          </p>
          {session ? (
            <RipButton
              slug={pack.slug}
              disabled={pack.status !== "live" || stock === 0}
              label={pack.status === "live" ? `Rip for ${money(pack.priceCents)}` : "Pack paused"}
            />
          ) : (
            <Link className="btn" href="/login">
              Sign in to rip
            </Link>
          )}
        </div>
        <div>
          <p className="kicker">Pool</p>
          <div className="pool" data-testid="pool">
            {pack.tiers.flatMap((tier) =>
              tier.cards.map((card) => (
                <div key={`${tier.tier}-${card.certNumber}-${card.id}`}>
                  <Slab
                    cert={card.certNumber}
                    subject={card.subject}
                    grade={card.grade}
                    grader={card.grader}
                    year={card.year}
                    setName={card.setName}
                    pulled={card.slotState !== "available"}
                  />
                  <p className={`kicker tier-${tier.tier}`}>{TIER_LABEL[tier.tier] ?? tier.tier}</p>
                  <p>
                    {card.subject}
                    <br />
                    <span className="muted">{money(card.fmvCents)}</span>
                  </p>
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
