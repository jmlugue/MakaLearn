import type { LearningItem } from "@/types";

const starterLearningItemPromptDescriptions: Record<string, { oldDescription: string; description: string }> = {
  "pecs-hello": {
    oldDescription: "Use when greeting a teacher, classmate, or visitor at the start of an interaction.",
    description: "What do we say when we meet someone?"
  },
  "pecs-eat": {
    oldDescription: "Use when the learner wants food, snack time, or a meal break.",
    description: "What do we ask for when we are hungry?"
  },
  "pecs-drink": {
    oldDescription: "Use when the learner wants water, milk, or another drink.",
    description: "What do we ask for when we are thirsty?"
  },
  "pecs-more": {
    oldDescription: "Use when the learner wants an activity, turn, or item to continue.",
    description: "What do we ask for when we want more?"
  },
  "pecs-help": {
    oldDescription: "Use when the learner needs support, assistance, or a task broken into smaller steps.",
    description: "What do we ask for when we need help?"
  },
  "pecs-yes": {
    oldDescription: "Use to answer yes, accept a choice, or confirm that something is correct.",
    description: "What do we say when the answer is yes?"
  },
  "pecs-no": {
    oldDescription: "Use to answer no, reject a choice, or show that something is not wanted.",
    description: "What do we say when the answer is no?"
  },
  "gesture-toilet": {
    oldDescription: "Use when the learner needs to ask to use the toilet.",
    description: "Use this gesture to ask for the toilet."
  },
  "gesture-eat-food": {
    oldDescription: "Use when the learner wants food or needs to communicate hunger.",
    description: "Use this gesture to ask for food."
  },
  "gesture-drink-water": {
    oldDescription: "Use when the learner wants water or needs a drink break.",
    description: "Use this gesture to ask for a drink."
  },
  "gesture-help": {
    oldDescription: "Use when the learner needs support with a task or classroom routine.",
    description: "Use this gesture to ask for help."
  },
  "gesture-yes": {
    oldDescription: "Use when the learner wants to answer yes or confirm a choice.",
    description: "Use this gesture to answer yes."
  },
  "gesture-no": {
    oldDescription: "Use when the learner wants to answer no or decline a choice.",
    description: "Use this gesture to answer no."
  },
  "gesture-sit-down": {
    oldDescription: "Use when practising the classroom direction to sit down.",
    description: "Use this gesture for sit down."
  }
};

export function upgradeStarterLearningItemPrompts(items: LearningItem[]) {
  return items.map((item) => {
    const starterPrompt = starterLearningItemPromptDescriptions[item.id];

    if (!starterPrompt || item.description !== starterPrompt.oldDescription) {
      return item;
    }

    return {
      ...item,
      description: starterPrompt.description
    };
  });
}

export function getStarterLearningItemPromptDescription(itemId: string) {
  return starterLearningItemPromptDescriptions[itemId]?.description;
}
