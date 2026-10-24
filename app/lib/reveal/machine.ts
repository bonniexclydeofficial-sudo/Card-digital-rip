export const TIER_NAMES = ["common", "rare", "epic", "legendary", "grail"] as const;

export type RevealPhase = "idle" | "arm" | "meter" | "burst" | "slab" | "decision";

/** Same inputs a future Rive file would take. The view is original CSS/SVG. */
export interface RevealInputs {
  tier: number;
  isGrail: boolean;
  skip: boolean;
}

export interface RevealState {
  phase: RevealPhase;
  inputs: RevealInputs;
  /** Inclusive stop in 1..5. The meter is not allowed past the drawn tier. */
  meterCeiling: number;
  meterTier: number;
}

/** Arm + meter + burst + slab = 5.26s. The meter duration is the climb, and it stops on the drawn tier. */
export const PHASE_MS: Record<RevealPhase, number> = {
  idle: 0,
  arm: 640,
  meter: 2400,
  burst: 720,
  slab: 1500,
  decision: 0,
};

export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(4, Math.round(tier)));
}

export function initialReveal(inputs: RevealInputs): RevealState {
  const tier = clampTier(inputs.tier);
  const ceiling = tier + 1;
  const skip = inputs.skip;
  return {
    phase: skip ? "decision" : "idle",
    inputs: { tier, isGrail: tier === 4, skip },
    meterCeiling: ceiling,
    meterTier: skip ? ceiling : 0,
  };
}

export function advanceReveal(state: RevealState): RevealState {
  if (state.inputs.skip && state.phase !== "decision") {
    return { ...state, phase: "decision", meterTier: state.meterCeiling };
  }
  switch (state.phase) {
    case "idle":
      return { ...state, phase: "arm", meterTier: 0 };
    case "arm":
      return { ...state, phase: "meter", meterTier: 0 };
    case "meter":
      return { ...state, phase: "burst", meterTier: state.meterCeiling };
    case "burst":
      return { ...state, phase: "slab", meterTier: state.meterCeiling };
    case "slab":
      return { ...state, phase: "decision", meterTier: state.meterCeiling };
    default:
      return state;
  }
}

/**
 * Meter head in stop units (0 → drawn tier's tick).
 * A common stops on tick 1. It never travels toward rare.
 */
export function meterPositionAt(elapsedMs: number, durationMs: number, drawnTier: number): number {
  const ceiling = clampTier(drawnTier) + 1;
  if (durationMs <= 0) return ceiling;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const eased = 1 - (1 - t) ** 3;
  return Math.min(ceiling, eased * ceiling);
}

export function meterFillPercent(position: number): number {
  return (Math.min(5, Math.max(0, position)) / 5) * 100;
}
