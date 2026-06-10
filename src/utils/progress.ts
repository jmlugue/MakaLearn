import type { ActivityResult, Learner, PracticeAttempt } from "@/types";

export function getLearnerAccuracy(
  learner: Learner,
  results: ActivityResult[],
  attempts: PracticeAttempt[]
) {
  const learnerResults = results.filter((result) => result.learnerId === learner.id);
  const learnerAttempts = attempts.filter((attempt) => attempt.learnerId === learner.id);
  const activityPoints = learnerResults.reduce((sum, result) => sum + result.scorePercentage, 0);
  const gesturePoints = learnerAttempts.reduce((sum, attempt) => {
    if (attempt.status === "Correct") return sum + 100;
    if (attempt.status === "Good attempt") return sum + 75;
    if (attempt.status === "Needs practice") return sum + 40;
    return sum;
  }, 0);
  const totalItems = learnerResults.length + learnerAttempts.length;

  if (!totalItems) return 0;
  return Math.round((activityPoints + gesturePoints) / totalItems);
}

export function getMostPracticedItemIds(attempts: PracticeAttempt[], results: ActivityResult[]) {
  const counts = new Map<string, number>();

  attempts.forEach((attempt) => {
    counts.set(attempt.learningItemId, (counts.get(attempt.learningItemId) ?? 0) + 1);
  });
  results.forEach((result) => {
    result.relatedLearningItemIds.forEach((itemId) => {
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    });
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}
