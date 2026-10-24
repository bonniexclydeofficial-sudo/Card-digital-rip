"use client";

import { useEffect, useState } from "react";
import { buybackAction } from "@/lib/actions";
import { money, TIER_LABEL } from "@/lib/format";
import {
  advanceReveal,
  initialReveal,
  meterFillPercent,
  meterPositionAt,
  PHASE_MS,
  TIER_NAMES,
  type RevealState,
} from "@/lib/reveal/machine";
import { RevealFx } from "./reveal-fx";
import { Slab } from "./slab";

export interface RevealPull {
  id: string;
  tierIndex: number;
  isGrail: boolean;
  skip: boolean;
  packName: string;
  subject: string;
  grader: string;
  grade: string;
  certNumber: string;
  year: number;
  setName: string;
  fmvCents: number;
  vaultItemId: string | null;
  creditCents: number | null;
  vaultStatus: string | null;
  haptics?: boolean;
  muteSound?: boolean;
}

const TICKS = ["Common", "Rare", "Epic", "Legendary", "Grail"];

export function RevealStage({ pull }: { pull: RevealPull }) {
  const [reduced, setReduced] = useState(false);
  const skip = pull.skip || reduced;
  const [state, setState] = useState<RevealState>(() =>
    initialReveal({ tier: pull.tierIndex, isGrail: pull.isGrail, skip: pull.skip }),
  );
  const [pos, setPos] = useState(pull.skip ? pull.tierIndex + 1 : 0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (skip) {
      const done = initialReveal({ tier: pull.tierIndex, isGrail: pull.isGrail, skip: true });
      setState(done);
      setPos(done.meterCeiling);
      return;
    }
    let current = initialReveal({ tier: pull.tierIndex, isGrail: pull.isGrail, skip: false });
    setState(current);
    setPos(0);
    let cancelled = false;
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      const sequence = ["arm", "meter", "burst", "slab", "decision"] as const;
      for (const phase of sequence) {
        if (cancelled) return;
        current = advanceReveal(current);
        setState({ ...current });
        if (phase === "meter") {
          const started = performance.now();
          await new Promise<void>((resolve) => {
            const frame = (now: number) => {
              if (cancelled) {
                resolve();
                return;
              }
              const next = meterPositionAt(now - started, PHASE_MS.meter, pull.tierIndex);
              setPos(next);
              if (now - started >= PHASE_MS.meter) resolve();
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          });
        } else if (PHASE_MS[phase] > 0) {
          await wait(PHASE_MS[phase]);
        }
      }
      if (!cancelled) setPos(current.meterCeiling);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [skip, pull.tierIndex, pull.isGrail]);

  const showSlab = state.phase === "slab" || state.phase === "decision";
  const tierName = TIER_NAMES[state.inputs.tier] ?? "common";

  return (
    <div
      className="reveal"
      data-testid="reveal-stage"
      data-drawn-tier={state.inputs.tier}
      data-meter-ceiling={state.meterCeiling}
      data-meter-pos={pos}
      data-phase={state.phase}
    >
      <div className="assay" aria-hidden="true">
        <div className="assay-fill" style={{ height: `${meterFillPercent(pos)}%` }} />
        {TICKS.map((label, index) => (
          <div key={label} className="assay-tick" style={{ bottom: `${((index + 1) / 5) * 100}%` }}>
            {label}
          </div>
        ))}
      </div>
      <RevealFx phase={state.phase} haptics={pull.haptics ?? false} mute={pull.muteSound ?? false} reduced={skip} />
      <div className="stage">
        {showSlab ? (
          <div>
            <Slab
              cert={pull.certNumber}
              subject={pull.subject}
              grade={pull.grade}
              grader={pull.grader}
              year={pull.year}
              setName={pull.setName}
            />
            <p className={`kicker tier-${tierName}`}>{TIER_LABEL[tierName]}</p>
            <h2>{pull.subject}</h2>
            <p className="muted">
              {pull.grader} {pull.grade} · fair market {money(pull.fmvCents)}
            </p>
          </div>
        ) : state.phase === "burst" ? (
          <div className={`burst tier-${tierName}`}>{TIER_LABEL[tierName]}</div>
        ) : (
          <div className={state.phase === "arm" ? "sleeve arm" : "sleeve"}>
            <div className="seal">CDR</div>
          </div>
        )}
        {state.phase === "decision" && pull.vaultStatus === "held" && pull.vaultItemId ? (
          <div className="decision">
            <a className="btn" href="/vault">
              Keep in the vault
            </a>
            <form action={buybackAction}>
              <input type="hidden" name="vaultItemId" value={pull.vaultItemId} />
              <button className="btn secondary" type="submit">
                Buy back for {pull.creditCents != null ? money(pull.creditCents) : "credits"}
              </button>
              <p className="muted">Separate purchase offer. It expires in 72 hours. It is not a refund.</p>
            </form>
          </div>
        ) : null}
        <p className="muted">From {pull.packName}. The draw was settled before this animation started.</p>
      </div>
    </div>
  );
}
