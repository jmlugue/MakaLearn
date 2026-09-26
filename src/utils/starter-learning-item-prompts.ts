import { normalizePecsLabel } from "@/data/pecs-card-manifest";
import type { LearningItem } from "@/types";
import { categoryPromptFor } from "@/utils/category-prompts";

/**
 * One Choose the picture question per built-in card: one short sentence with a situation, and the answer
 * word never appears in it (a test checks both). Look-alike answers are kept out of the choices by
 * `activity-option-sets.ts`.
 */
const chooseCorrectSymbolPromptsByLabel: Record<string, string> = {
  hello: "What do we say when we meet someone?",
  goodbye: "What do we say when we leave school?",
  "good morning": "What do we say at the start of the day?",
  "thank you": "What do we say when someone helps us or gives us something?",
  please: "What polite word do we use when asking for something?",
  sorry: "What do we say when we make a mistake or hurt someone?",
  happy: "How do I feel on my birthday?",
  sad: "How do I feel when my toy breaks?",
  angry: "How do I feel when someone takes my toy?",
  scared: "How do I feel when the thunder is loud?",
  tired: "How do I feel after playing all day?",
  sick: "How do I feel when I have a fever?",
  i: "Which word do I use to talk about myself?",
  you: "Which word do I use for the person I talk to?",
  mother: "Who is the woman who looks after me at home?",
  father: "Who is the man who looks after me at home?",
  teacher: "Who helps us learn at school?",
  friend: "Who do I play with at recess?",
  eat: "What do we want to do when we are hungry?",
  drink: "What do we want to do when we are thirsty?",
  food: "What do I need when my tummy is rumbling?",
  water: "What clear drink do we have when we are thirsty?",
  rice: "What white food do we eat with chicken?",
  bread: "What do we spread butter on for breakfast?",
  milk: "What white drink do we pour on cereal?",
  banana: "What long yellow fruit do monkeys love?",
  sit: "What do we do on the mat at story time?",
  stand: "What do we do when it is time to line up?",
  listen: "What do we do when the teacher reads a story?",
  look: "What do we do when the teacher points at the board?",
  read: "What do we do with a storybook?",
  write: "What do we do with a pencil and paper?",
  wait: "What do we do until it is our turn?",
  stop: "What do we do when the light is red?",
  toilet: "Where do I go when I need to pee?",
  help: "What do I ask for when I cannot tie my shoe?",
  rest: "What do I need when my body wants a break?",
  sleep: "What do I do in bed at night?",
  "wash hands": "What do we do with soap before we eat?",
  more: "What do I ask for when I am still hungry?",
  finished: "What do I say when my work is all done?",
  danger: "What does a keep-out sign warn us about?",
  hot: "How does soup feel right off the stove?",
  hurt: "What am I when I fall and scrape my knee?",
  yes: "What do I say when I nod my head?",
  no: "What do I say when I shake my head?",
  want: "Which word do I use when I wish for a toy?",
  am: 'Which word finishes "I ___ happy"?',
  is: 'Which word finishes "She ___ my friend"?',
  are: 'Which word finishes "We ___ friends"?'
};

/** Oct questions reworded because they were awkward. Saved activities that use one get the new question. */
const retiredChooseCorrectSymbolPromptsByLabel: Record<string, string> = {
  i: "Which word means me, myself?",
  you: "Which word is for the person we talk to?",
  eat: "What do we ask to do when we are hungry?",
  drink: "What do we ask to do when we are thirsty?",
  danger: "What does a keep out sign warn us about?",
  hot: "How is soup that just came off the stove?",
  hurt: "How am I when I fall and scrape my knee?"
};

/** The questions before Oct 1. Saved activities that still use one get the new question at play time. */
const legacyChooseCorrectSymbolPromptsByLabel: Record<string, string> = {
  goodbye: "What do we say when we leave or finish saying hello?",
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
  eat: "What do we want to do when we are hungry?",
  drink: "What do we want to do when we are thirsty?",
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
    description: "Use this gesture to say that the learner wants to eat."
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

/**
 * The built-in question for a card, or for a card a teacher made, "Which picture is from (category)?", which
 * fits any card and never names it.
 */
export function createChooseCorrectSymbolPrompt(
  item: Pick<LearningItem, "id" | "label"> & { categoryId?: string },
  categoryName?: string
) {
  return getSavedChooseCorrectSymbolPrompt(item) ?? categoryPromptFor("choose", item, categoryName);
}

export function getSavedChooseCorrectSymbolPrompt(item: Pick<LearningItem, "id" | "label">) {
  const labelPrompt = chooseCorrectSymbolPromptsByLabel[normalizePecsLabel(item.label)];
  if (labelPrompt) return labelPrompt;

  return chooseCorrectSymbolPromptsByLabel[normalizePecsLabel(labelFromLearningItemId(item.id))];
}

export function isGenericChooseCorrectSymbolPrompt(item: Pick<LearningItem, "label">, prompt: string) {
  return normalizePecsLabel(prompt) === normalizePecsLabel(`Which card means "${item.label}"?`);
}

/**
 * True when a saved Choose question is one MakaLearn wrote (old, current, or generic), not one a teacher
 * wrote. Only these are upgraded at play time.
 */
export function isBuiltInChooseCorrectSymbolPrompt(item: Pick<LearningItem, "id" | "label">, prompt: string) {
  const normalizedPrompt = normalizePecsLabel(prompt);
  const labels = [normalizePecsLabel(item.label), normalizePecsLabel(labelFromLearningItemId(item.id))];
  return (
    isGenericChooseCorrectSymbolPrompt(item, prompt) ||
    labels.some(
      (label) =>
        normalizePecsLabel(chooseCorrectSymbolPromptsByLabel[label] ?? "") === normalizedPrompt ||
        normalizePecsLabel(legacyChooseCorrectSymbolPromptsByLabel[label] ?? "") === normalizedPrompt ||
        normalizePecsLabel(retiredChooseCorrectSymbolPromptsByLabel[label] ?? "") === normalizedPrompt
    ) ||
    Object.values(starterLearningItemPromptDescriptions).some(
      (entry) => normalizePecsLabel(entry.description) === normalizedPrompt
    )
  );
}

/** Every built-in Choose question with its card label, for tests. */
export function chooseCorrectSymbolPromptEntries() {
  return Object.entries(chooseCorrectSymbolPromptsByLabel).map(([label, prompt]) => ({ label, prompt }));
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
