"use client";

import { useMemo, useState } from "react";
import { TIER_ORDER, validatePack, type TierName } from "@cdr/econ";
import { builderAction } from "@/lib/actions";
import { money, rtpLabel } from "@/lib/format";

export interface BuilderCard {
  id: string;
  subject: string;
  certNumber: string;
  fmvCents: number;
  fmvAt: string;
  imageFrontUrl: string | null;
  imageBackUrl: string | null;
}

const DEFAULT_ODDS: Record<TierName, number> = {
  common: 7200,
  rare: 2000,
  epic: 650,
  legendary: 140,
  grail: 10,
};

export function PackBuilder({ cards, inventoryFmvCents }: { cards: BuilderCard[]; inventoryFmvCents: number }) {
  const [name, setName] = useState("Desk draft");
  const [slug, setSlug] = useState("desk-draft");
  const [priceDollars, setPriceDollars] = useState("25");
  const [odds, setOdds] = useState<Record<TierName, number>>(DEFAULT_ODDS);
  const [assigned, setAssigned] = useState<Record<string, TierName | "">>({});

  const priceCents = Math.round(Number(priceDollars) * 100);
  const validation = useMemo(() => {
    const tiers = TIER_ORDER.map((tier) => ({
      tier,
      oddsBps: Number(odds[tier]) || 0,
      cards: cards
        .filter((card) => assigned[card.id] === tier)
        .map((card) => ({
          id: card.id,
          fmvCents: card.fmvCents,
          fmvAt: card.fmvAt,
          imageFrontUrl: card.imageFrontUrl,
          imageBackUrl: card.imageBackUrl,
        })),
    }));
    return validatePack({
      priceCents: Number.isInteger(priceCents) ? priceCents : 0,
      tiers,
      inventoryFmvCents,
    });
  }, [assigned, cards, inventoryFmvCents, odds, priceCents]);

  const payload = JSON.stringify({
    name,
    slug,
    priceCents,
    publish: false,
    tiers: TIER_ORDER.map((tier) => ({
      tier,
      oddsBps: Number(odds[tier]) || 0,
      cardIds: cards.filter((card) => assigned[card.id] === tier).map((card) => card.id),
    })),
  });

  return (
    <form action={builderAction} className="ticket">
      <p className="kicker">Pack builder</p>
      <h2>Draft a pack</h2>
      <p className="muted">The same validator runs here and again on the server. Publish stays blocked under 4% gross margin.</p>
      <label htmlFor="builder-name">Name</label>
      <input id="builder-name" value={name} onChange={(event) => setName(event.target.value)} />
      <label htmlFor="builder-slug">Slug</label>
      <input id="builder-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
      <label htmlFor="builder-price">Price (USD)</label>
      <input id="builder-price" value={priceDollars} onChange={(event) => setPriceDollars(event.target.value)} />
      <div className="grid-3">
        {TIER_ORDER.map((tier) => (
          <label key={tier}>
            {tier} odds (bps)
            <input
              value={odds[tier]}
              onChange={(event) => setOdds((current) => ({ ...current, [tier]: Number(event.target.value) }))}
            />
          </label>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Card</th>
            <th>FMV</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td>
                {card.subject}
                <div className="muted">{card.certNumber}</div>
              </td>
              <td>{money(card.fmvCents)}</td>
              <td>
                <select
                  aria-label={`Tier for ${card.certNumber}`}
                  value={assigned[card.id] ?? ""}
                  onChange={(event) =>
                    setAssigned((current) => ({ ...current, [card.id]: event.target.value as TierName | "" }))
                  }
                >
                  <option value="">Leave out</option>
                  {TIER_ORDER.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div data-testid="builder-readout">
        <div className="row">
          <span>EV</span>
          <span>{money(Math.round(validation.evCents))}</span>
        </div>
        <div className="row">
          <span>RTP</span>
          <span>{rtpLabel(validation.rtp)}</span>
        </div>
        <div className="row">
          <span>Gross margin</span>
          <span>{rtpLabel(validation.gm)}</span>
        </div>
        {validation.errors.length > 0 ? (
          <ul>
            {validation.errors.map((error) => (
              <li key={`${error.code}:${error.message}`} className="error">
                {error.code}: {error.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ok">This draft clears the guard. Saving keeps it unpublished.</p>
        )}
      </div>
      <input type="hidden" name="payload" value={payload} />
      <button className="btn" type="submit">
        Save draft
      </button>
    </form>
  );
}
