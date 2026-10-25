import { validatePecsSentence, type PecsSentenceCard } from "./pecs-sentence-validation";
import { parsePlaygroundDecision, playgroundDecisionResult } from "./playground-grading";

/** Client adapter keeps provider details out of the UI and the original validator intact. */
export async function checkPlayground(cards: PecsSentenceCard[], approvedIds: Set<string>, signal?: AbortSignal) {
  const fallback = () => validatePecsSentence(cards, approvedIds);
  if (!cards.length || cards.length > 5 || cards.some((card) => !approvedIds.has(card.id))) return fallback();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15_000);
  try {
    const response = await fetch("/api/playground-check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardIds: cards.map((card) => card.id) }), signal: controller.signal
    });
    if (response.ok) {
      const body = await response.json();
      const decision = parsePlaygroundDecision(body.decision, cards.map((card) => card.label).join(" "));
      if (decision) return playgroundDecisionResult(cards, decision);
    }
  } catch { /* Offline or unavailable checks keep the existing algorithm working. */ }
  finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
  return fallback();
}
