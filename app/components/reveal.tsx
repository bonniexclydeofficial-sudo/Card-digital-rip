"use client";

import { useEffect, useRef, useState } from "react";
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
  pulledAt?: string | null;
}

const TICKS = ["Common", "Rare", "Epic", "Legendary", "Grail"];
const SPARKS = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const radius = 90 + (index % 4) * 28;
  return { dx: `${Math.cos(angle) * radius}px`, dy: `${Math.sin(angle) * radius - 20}px` };
});

function OfferClock({ from }: { from: string }) {
  const [label, setLabel] = useState("72:00:00");
  useEffect(() => {
    const end = new Date(from).getTime() + 72 * 60 * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, end - Date.now());
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setLabel(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [from]);
  return (
    <p className="timer">
      Offer window {label}. Separate purchase offer. It expires in 72 hours. It is not a refund.
    </p>
  );
}

export function RevealStage({ pull }: { pull: RevealPull }) {
  const [reduced, setReduced] = useState(false);
  const [heldSkip, setHeldSkip] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const skip = pull.skip || reduced || heldSkip;
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

  function startHold() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setHeldSkip(true), 650);
  }
  function endHold() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  async function shareCard() {
    const text = `${pull.subject} · ${pull.grader} ${pull.grade} · fair market ${money(pull.fmvCents)}. Separate purchase offer from Card Digital Rip.`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pull.subject, text, url: window.location.href });
        setShareNote("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("Card summary copied.");
    } catch {
      setShareNote("Share closed.");
    }
  }

  const showSlab = state.phase === "slab" || state.phase === "decision";
  const tierName = TIER_NAMES[state.inputs.tier] ?? "common";
  const celebrate = state.inputs.tier >= 1 && (state.phase === "burst" || state.phase === "slab");

  return (
    <div
      className="reveal"
      data-testid="reveal-stage"
      data-drawn-tier={state.inputs.tier}
      data-meter-ceiling={state.meterCeiling}
      data-meter-pos={pos}
      data-phase={state.phase}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
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
        {celebrate ? (
          <div className="particles confetti" aria-hidden="true">
            {SPARKS.map((spark, index) => (
              <i key={index} style={{ ["--dx" as string]: spark.dx, ["--dy" as string]: spark.dy }} />
            ))}
          </div>
        ) : state.phase === "burst" ? (
          <div className="particles" aria-hidden="true">
            {SPARKS.slice(0, 8).map((spark, index) => (
              <i key={index} style={{ ["--dx" as string]: spark.dx, ["--dy" as string]: spark.dy }} />
            ))}
          </div>
        ) : null}
        <div className="decision" style={{ marginTop: 0 }}>
          <button type="button" className="btn secondary" onClick={() => setHeldSkip(true)}>
            Skip
          </button>
          <span className="muted">Hold anywhere on the stage to skip.</span>
        </div>
        {showSlab ? (
          <div aria-live="polite">
            <div className="holo">
              <Slab
                cert={pull.certNumber}
                subject={pull.subject}
                grade={pull.grade}
                grader={pull.grader}
                year={pull.year}
                setName={pull.setName}
              />
            </div>
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
            </form>
            <button type="button" className="btn secondary" onClick={() => void shareCard()}>
              Share card
            </button>
            {pull.pulledAt ? <OfferClock from={pull.pulledAt} /> : (
              <p className="muted">Separate purchase offer. It expires in 72 hours. It is not a refund.</p>
            )}
            {shareNote ? <p className="muted">{shareNote}</p> : null}
          </div>
        ) : null}
        <p className="muted">From {pull.packName}. The draw was settled before this animation started.</p>
      </div>
    </div>
  );
}
