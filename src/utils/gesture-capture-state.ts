export const REQUIRED_MATCHING_CANDIDATES = 2;

export type GestureCapturePhase =
  | "normal-capture"
  | "reserved-a"
  | "ignoring-b"
  | "completed";

export type GestureCaptureCandidate<TPayload> = {
  label: string;
  confidence: number;
  payload: TPayload;
};

type CandidateStreak<TPayload> = {
  label: string;
  count: number;
  best: GestureCaptureCandidate<TPayload>;
};

export type GestureCaptureState<TPayload> = {
  phase: GestureCapturePhase;
  streak: CandidateStreak<TPayload> | null;
  reservedA: GestureCaptureCandidate<TPayload> | null;
  ignoredBLabel: string | null;
};

export function createGestureCaptureState<TPayload>(): GestureCaptureState<TPayload> {
  return {
    phase: "normal-capture",
    streak: null,
    reservedA: null,
    ignoredBLabel: null
  };
}

/**
 * Tracks repeated background predictions without changing the ordinary capture.
 * Two matching observations reserve A; two matching observations of a different
 * label identify B. Once B is identified, A and its payload stay frozen.
 */
export function observeGestureCandidate<TPayload>(
  state: GestureCaptureState<TPayload>,
  candidate: GestureCaptureCandidate<TPayload> | null
): GestureCaptureState<TPayload> {
  if (state.phase === "completed" || state.phase === "ignoring-b") return state;

  if (!candidate) {
    return state;
  }

  if (state.phase === "reserved-a" && state.reservedA?.label === candidate.label) {
    return {
      ...state,
      streak: null,
      reservedA:
        candidate.confidence > state.reservedA.confidence ? candidate : state.reservedA
    };
  }

  const streak =
    state.streak?.label === candidate.label
      ? {
          label: candidate.label,
          count: state.streak.count + 1,
          best:
            candidate.confidence > state.streak.best.confidence
              ? candidate
              : state.streak.best
        }
      : { label: candidate.label, count: 1, best: candidate };

  if (streak.count < REQUIRED_MATCHING_CANDIDATES) {
    return { ...state, streak };
  }

  if (state.phase === "normal-capture") {
    return {
      ...state,
      phase: "reserved-a",
      streak: null,
      reservedA: streak.best
    };
  }

  return {
    ...state,
    phase: "ignoring-b",
    streak: null,
    ignoredBLabel: streak.label
  };
}

export function completeGestureCapture<TPayload>(
  state: GestureCaptureState<TPayload>
): GestureCaptureState<TPayload> {
  return { ...state, phase: "completed", streak: null };
}

export function shouldUseReservedGesture<TPayload>(
  state: GestureCaptureState<TPayload>
) {
  return Boolean(state.reservedA && state.ignoredBLabel);
}

export function getGestureCandidateCheckStep(minimumFrameCount: number) {
  return Math.max(1, Math.floor(minimumFrameCount / 4));
}

export function takeRecentGestureWindow<T>(
  frames: T[],
  minimumFrameCount: number
) {
  return frames.slice(-minimumFrameCount);
}
