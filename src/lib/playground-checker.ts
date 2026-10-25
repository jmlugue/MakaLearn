import type { PlaygroundDecision } from "@/utils/playground-grading";

export type PlaygroundClaim = { state: "ready"; decision: PlaygroundDecision } |
  { state: "claimed"; token: string } | { state: "busy" } | { state: "limited" };
export type PlaygroundDecisionStore = {
  claim(): Promise<PlaygroundClaim>;
  read(): Promise<PlaygroundDecision | null>;
  finish(token: string, decision: PlaygroundDecision): Promise<PlaygroundDecision | null>;
  release(token: string): Promise<void>;
};

/** Persistence is authoritative. Failed requests and fallback grades never enter
 * the decision cache. The separate MSAV validator remains the caller's fallback. */
export async function getPlaygroundDecision(
  store: PlaygroundDecisionStore,
  grade: () => Promise<PlaygroundDecision>,
  wait: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 250))
): Promise<PlaygroundDecision | null> {
  let token: string | undefined;
  try {
    const claim = await store.claim();
    if (claim.state === "ready") return claim.decision;
    if (claim.state === "limited") return null;
    if (claim.state === "busy") {
      // A bounded wait shares another request's result without another paid call.
      for (let attempt = 0; attempt < 36; attempt += 1) {
        await wait();
        const saved = await store.read();
        if (saved) return saved;
      }
      return null;
    }
    token = claim.token;
    const decision = await grade();
    return await store.finish(token, decision);
  } catch {
    // Provider, quota, and persistence failures use the ordinary local feedback.
    return null;
  } finally {
    if (token) {
      try { await store.release(token); } catch { /* The database lease also expires. */ }
    }
  }
}
