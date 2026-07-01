import { normalizePecsLabel } from "@/data/pecs-card-manifest";
import type { LearningItem } from "@/types";

const chooseCorrectSymbolPromptsByLabel: Record<string, string> = {
  hello: "What do we say when we meet someone?",
  goodbye: "What do we say when we leave or finish saying hello?",
  "good morning": "What do we say at the start of the day?",
  "thank you": "What do we say when someone helps us or gives us something?",
  please: "What polite word do we use when asking for something?",
  sorry: "What do we say when we make a mistake or hurt someone?",
  happy: "Which card shows feeling happy?",
  sad: "Which card shows feeling sad?",
  angry: "Which card shows feeling angry?",
  scared: "Which card shows feeling scared?",
  tired: "Which card shows feeling tired?",
  sick: "Which card shows feeling sick?",
  i: "Which card means I or me?",
  you: "Which card means you?",
  mother: "Which card shows mother?",
  father: "Which card shows father?",
  teacher: "Which card shows teacher?",
  friend: "Which card shows friend?",
  eat: "What do we ask to do when we are hungry?",
  drink: "What do we ask to do when we are thirsty?",
  food: "Which card do we use for food?",
  water: "Which card do we use when we want water?",
  rice: "Which card shows rice?",
  bread: "Which card shows bread?",
  milk: "Which card shows milk?",
  banana: "Which card shows banana?",
  sit: "Which card tells us to sit down?",
  stand: "Which card tells us to stand up?",
  listen: "Which card tells us to listen?",
  look: "Which card tells us to look?",
  read: "Which card means read?",
  write: "Which card means write?",
  wait: "Which card tells us to wait?",
  stop: "Which card tells us to stop?",
  toilet: "Which card do we use to ask for the toilet?",
  help: "What do we ask for when we need help?",
  rest: "Which card do we use when we need a rest?",
  sleep: "Which card means sleep?",
  "wash hands": "Which card means wash hands?",
  more: "What do we ask for when we want more?",
  finished: "Which card means finished?",
  danger: "Which card tells us something is dangerous?",
  hot: "Which card tells us something is hot?",
  hurt: "Which card do we use when something hurts?",
  yes: "What do we say when the answer is yes?",
  no: "What do we say when the answer is no?",
  want: "Which card means want?",
  am: "Which card helps us say am?",
  is: "Which card helps us say is?",
  are: "Which card helps us say are?"
};

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

function labelFromLearningItemId(itemId: string) {
  return itemId
    .replace(/^pecs-/, "")
    .replace(/^gesture-/, "")
    .replace(/-/g, " ");
}

export function createChooseCorrectSymbolPrompt(item: Pick<LearningItem, "id" | "label">) {
  const labelPrompt = chooseCorrectSymbolPromptsByLabel[normalizePecsLabel(item.label)];
  if (labelPrompt) return labelPrompt;

  const idPrompt = chooseCorrectSymbolPromptsByLabel[normalizePecsLabel(labelFromLearningItemId(item.id))];
  if (idPrompt) return idPrompt;

  return `Which card means "${item.label}"?`;
}

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
  return starterLearningItemPromptDescriptions[itemId]?.description
    ?? chooseCorrectSymbolPromptsByLabel[normalizePecsLabel(labelFromLearningItemId(itemId))];
}
