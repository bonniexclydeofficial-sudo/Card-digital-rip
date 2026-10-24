"use client";

import { useState } from "react";
import { Slab } from "@/components/slab";
import { money, TIER_LABEL } from "@/lib/format";

export interface PoolCard {
  id: string;
  tier: string;
  certNumber: string;
  subject: string;
  grade: string;
  grader: string;
  year: number;
  setName: string;
  category?: string;
  fmvCents: number;
  slotState: string;
}

const FILTERS = ["all", "common", "rare", "epic", "legendary", "grail"] as const;

export function PoolGrid({ cards }: { cards: PoolCard[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const shown = filter === "all" ? cards : cards.filter((card) => card.tier === filter);
  return (
    <div>
      <div className="filters" role="toolbar" aria-label="Rarity filter">
        {FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            className="chip"
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
          >
            {name === "all" ? "All" : (TIER_LABEL[name] ?? name)}
          </button>
        ))}
      </div>
      <div className="pool" data-testid="pool">
        {shown.map((card) => (
          <div key={`${card.tier}-${card.certNumber}-${card.id}`}>
            <div className="holo">
              <Slab
                cert={card.certNumber}
                subject={card.subject}
                grade={card.grade}
                grader={card.grader}
                year={card.year}
                setName={card.setName}
                category={card.category}
                pulled={card.slotState !== "available"}
              />
            </div>
            <p className={`kicker tier-${card.tier}`}>{TIER_LABEL[card.tier] ?? card.tier}</p>
            <p>
              {card.subject}
              <br />
              <span className="muted">{money(card.fmvCents)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
