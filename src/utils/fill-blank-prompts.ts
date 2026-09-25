import { normalizePecsLabel } from "@/data/pecs-card-manifest";

/**
 * One built-in Fill in the blank sentence per PECS card. Each gives a situation, so only one card fits the
 * gap (the meaning groups in `activity-option-sets.ts` keep look-alike cards out of the choices).
 * Rules: exactly one ____, a short situation then the sentence (7 to 12 words), no bare "I feel ____." prompts.
 */
const fillBlankPromptByLabel: Record<string, string> = {
  hello: "A new classmate comes in. I wave and say ____.",
  goodbye: "School is over. I wave and say ____.",
  "good morning": "I arrive at school. I say ____ to my teacher.",
  "thank you": "My friend helps me. I say ____.",
  please: "I want the red crayon. Can I have it, ____?",
  sorry: "I bumped into my friend. I say ____.",
  happy: "Everyone sings on my birthday. I feel ____.",
  sad: "My balloon flew away. I feel ____.",
  angry: "My friend took my toy. I feel ____.",
  scared: "The thunder is so loud. I feel ____.",
  tired: "I played all day. Now I feel ____.",
  sick: "I have a fever. I feel ____.",
  i: "My name is Sam, and ____ like to draw.",
  you: "I point to my friend. Do ____ want to play?",
  mother: "My mom cooks for us. She is my ____.",
  father: "My dad drives me to school. He is my ____.",
  teacher: "In class, my ____ writes on the board.",
  friend: "At recess, I play tag with my ____.",
  eat: "It is lunch time. I want to ____ my sandwich.",
  drink: "I am thirsty. I want to ____ some water.",
  food: "My tummy is rumbling. I need some ____.",
  water: "It is hot. Can I have a glass of ____?",
  rice: "For lunch, I have chicken and white ____.",
  bread: "I put butter on my ____ for breakfast.",
  milk: "I pour cold ____ on my cereal.",
  banana: "The monkey peels a long yellow ____.",
  sit: "The story is starting. Please ____ down on the mat.",
  stand: "It is time to line up. Please ____ up.",
  listen: "The teacher reads a story. Be quiet and ____.",
  look: "The teacher points at the board. Please ____ at it.",
  read: "I open my book and ____ the story.",
  write: "I hold my pencil and ____ my name.",
  wait: "My friend is on the swing. I ____ for my turn.",
  stop: "The light is red. We must ____ now.",
  toilet: "I need to pee. I go to the ____.",
  help: "I cannot tie my shoe. Can you ____ me?",
  rest: "I ran a lot. Now I need a ____.",
  sleep: "It is night. I close my eyes and ____.",
  "wash hands": "Before we eat, we ____ with soap.",
  more: "I am still hungry. Can I have some ____?",
  finished: "I colored the whole picture. Now I am ____.",
  danger: "The sign says keep out. There is ____ inside.",
  hot: "The soup just came off the stove. It is ____!",
  hurt: "I fell and scraped my knee. I am ____.",
  yes: "Do you want to play outside? I nod and say ____.",
  no: "I do not like spicy food. I say ____.",
  want: "I see the toy train. I ____ to play with it.",
  am: "Let me tell you about me. I ____ seven years old.",
  is: "Look at my puppy. He ____ very fluffy.",
  are: "My friends and I play together. We ____ best friends."
};

/** The longer Sep 26 sentences. Saved activities that still use one get the short sentence. */
const longFillBlankPromptByLabel: Record<string, string> = {
  hello: "A new classmate walks into our room. I wave and say ____.",
  goodbye: "School is over and my mother is here. I wave to my teacher and say ____.",
  "good morning": "I arrive at school before class starts. I smile and say ____ to my teacher.",
  "thank you": "My friend helps me pick up my pencils. I say ____ to my friend.",
  please: "I want to use the red crayon, so I ask nicely: Can I have it, ____?",
  sorry: "I bumped into my friend by accident. I say ____ to my friend.",
  happy: "It is my birthday and everyone sings to me. I feel ____.",
  sad: "My balloon flew away and I cannot get it back. I feel ____.",
  angry: "My friend took my toy without asking. I feel ____.",
  scared: "The thunder is very loud and the lights go out. I feel ____.",
  tired: "I played outside all afternoon. Now I feel ____ and want to rest.",
  sick: "My head hurts and I have a fever. I feel ____, so I stay home.",
  i: "My name is Sam, and ____ like to draw pictures of cats.",
  you: "I point to my friend and ask: Do ____ want to play with me?",
  mother: "My mom is my ____. She cooks dinner for our family.",
  father: "My dad is my ____. He drives me to school every morning.",
  teacher: "In class, my ____ writes on the board and helps me learn.",
  friend: "At recess, I play tag with my best ____.",
  eat: "It is lunch time and I am hungry. I want to ____ my sandwich.",
  drink: "I am thirsty after running. I want to ____ some water.",
  food: "My tummy is rumbling because I am hungry. I need some ____.",
  water: "It is very hot and I am thirsty. Can I have a glass of ____, please?",
  rice: "For lunch, I eat chicken with a bowl of white ____.",
  bread: "I spread butter on a slice of ____ for breakfast.",
  milk: "I pour cold ____ on my cereal in the morning.",
  banana: "The monkey peels a long yellow ____ and eats it.",
  sit: "The story is about to start. Please ____ down on the mat.",
  stand: "It is time to line up at the door. Please ____ up.",
  listen: "The teacher is reading a story. Please be quiet and ____.",
  look: "The teacher points at the board. Please ____ at the picture.",
  read: "I open my favorite book and ____ the story.",
  write: "I hold my pencil and ____ my name on the paper.",
  wait: "My friend is on the swing. I need to ____ for my turn.",
  stop: "The traffic light is red. We must ____ and not cross the road.",
  toilet: "After I use the ____, I flush and wash my hands.",
  help: "My shoelace is untied and I cannot tie it. Can you ____ me, please?",
  rest: "I ran around the field many times. Now I need to take a ____.",
  sleep: "It is night and my bed is warm. I close my eyes and go to ____.",
  "wash hands": "Before we eat lunch, we always ____ with soap and water.",
  more: "I ate all my rice, but I am still hungry. Can I have some ____, please?",
  finished: "I colored the whole picture. Now I am ____, so I put my crayons away.",
  danger: "The sign on the fence says keep out. There is ____ inside, so we stay away.",
  hot: "The soup just came off the stove. Be careful, it is very ____!",
  hurt: "I fell off my bike and scraped my knee. I am ____.",
  yes: "My teacher asks: Do you want to play outside? I nod and say ____.",
  no: "My friend offers me a spicy pepper, but I do not like it. I shake my head and say ____.",
  want: "I see the toy train on the shelf. I ____ to play with it.",
  am: "Let me tell you about myself. I ____ seven years old.",
  is: "Look at my puppy. He ____ very fluffy and soft.",
  are: "My friends and I play together every day. We ____ best friends."
};

/** The first built-in sentences (before Sep 26). Saved activities that still use one get the new sentence. */
const legacyFillBlankPromptByLabel: Record<string, string> = {
  hello: "Say ____ when greeting someone.",
  goodbye: "Say ____ when leaving.",
  "good morning": "Say ____ at the start of the day.",
  "thank you": "Say ____ when someone helps you.",
  please: "Say ____ when asking nicely.",
  sorry: "Say ____ after a mistake.",
  happy: "I feel ____.",
  sad: "I feel ____.",
  angry: "I feel ____.",
  scared: "I feel ____.",
  tired: "I feel ____.",
  sick: "I feel ____.",
  i: "____ want a turn.",
  you: "I am talking to ____.",
  mother: "My ____ is here.",
  father: "My ____ is here.",
  teacher: "My ____ helps me learn.",
  friend: "I play with my ____.",
  eat: "I want to ____.",
  drink: "I want to ____.",
  food: "I want ____.",
  water: "I want ____.",
  rice: "I want ____.",
  bread: "I want ____.",
  milk: "I want ____.",
  banana: "I want ____.",
  sit: "Please ____.",
  stand: "Please ____.",
  listen: "Please ____.",
  look: "Please ____.",
  read: "I can ____ a book.",
  write: "I can ____.",
  wait: "Please ____.",
  stop: "Please ____.",
  toilet: "I need the ____.",
  help: "I need ____.",
  rest: "I need a ____.",
  sleep: "I want to ____.",
  "wash hands": "I need to ____.",
  more: "I want ____.",
  finished: "I am ____.",
  danger: "This is ____.",
  hot: "This is ____.",
  hurt: "I am ____.",
  yes: "Answer ____ when it is right.",
  no: "Answer ____ when it is not right.",
  want: "I ____ a turn.",
  am: "I ____ happy.",
  is: "It ____ my turn.",
  are: "You ____ here."
};

/** For a card with no built-in sentence. The creator asks the teacher to replace it with a real sentence. */
export function neutralFillBlankPrompt(label: string) {
  return `Use ____ to talk about ${label}.`;
}

export function createFillBlankPromptForLabel(label: string) {
  const normalized = normalizePecsLabel(label);
  return fillBlankPromptByLabel[normalized] ?? neutralFillBlankPrompt(label);
}

export function getSavedFillBlankPromptForLabel(label: string) {
  return fillBlankPromptByLabel[normalizePecsLabel(label)];
}

/** Every card label that has a built-in sentence. */
export function fillBlankPromptLabels() {
  return Object.keys(fillBlankPromptByLabel);
}

export function isGenericFillBlankPrompt(label: string, prompt: string) {
  const normalizedPrompt = normalizePecsLabel(prompt).replace(/\s+/g, " ");
  const normalizedLabel = normalizePecsLabel(label);

  return (
    /^choose\s+_+\s+for\s+.+\.?$/i.test(prompt.trim()) ||
    /^use\s+_+\s+to\s+talk\s+about\s+.+\.?$/i.test(prompt.trim()) ||
    normalizedPrompt === normalizePecsLabel(`Choose ____ for ${label}.`) ||
    normalizedPrompt === normalizePecsLabel(`Use ____ to talk about ${label}.`) ||
    normalizedPrompt === `choose ____ for ${normalizedLabel}` ||
    normalizedPrompt === `use ____ to talk about ${normalizedLabel}`
  );
}

/** True when a saved sentence is one MakaLearn wrote (old, current, or generic), not one a teacher wrote. */
export function isBuiltInFillBlankPrompt(label: string, prompt: string) {
  const normalizedLabel = normalizePecsLabel(label);
  const normalizedPrompt = normalizePecsLabel(prompt);
  return (
    isGenericFillBlankPrompt(label, prompt) ||
    normalizePecsLabel(legacyFillBlankPromptByLabel[normalizedLabel] ?? "") === normalizedPrompt ||
    normalizePecsLabel(longFillBlankPromptByLabel[normalizedLabel] ?? "") === normalizedPrompt ||
    normalizePecsLabel(fillBlankPromptByLabel[normalizedLabel] ?? "") === normalizedPrompt
  );
}
