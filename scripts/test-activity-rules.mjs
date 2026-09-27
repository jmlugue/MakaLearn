// Activity rules from the Sep 26 review: 4 creatable types, clear instructions, one right answer per
// question, and contextual Fill in the blank sentences. Loads the real source files, no database.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const normalizePecsLabel = (label) => label.trim().toLowerCase().replace(/\s+/g, " ");
// The manifest module reads JSON and Supabase helpers are not needed here, so both are stubbed.
const stubs = {
  "@/data/pecs-card-manifest": { normalizePecsLabel },
  "@/utils/pecs-content-library": { ensurePecsManifestItems: (items) => items }
};

const options = loadTs("src/utils/activity-option-sets.ts", stubs);
const categoryPrompts = loadTs("src/utils/category-prompts.ts", stubs);
const fillBlank = loadTs("src/utils/fill-blank-prompts.ts", stubs);
const choose = loadTs("src/utils/starter-learning-item-prompts.ts", stubs);
const helpers = loadTs("src/features/activities/activity-helpers.ts", stubs);

const manifest = JSON.parse(fs.readFileSync("public/pecs/pecs_arasaac_manifest.json", "utf8")).map((row) => ({
  label: row.label,
  sentenceRole: row.sentence_role
}));
const creatableTypes = ["match-word-symbol", "fill-blank", "drag-drop-symbol"];

test("teachers can make exactly the 3 kept types", () => {
  assert.deepEqual([...helpers.activityTypes].sort(), [...creatableTypes].sort());
});

test("Choose the word, Choose the picture, and Gesture practice are hidden, kept types are not", () => {
  assert.equal(helpers.isRetiredActivity({ type: "simple-quiz" }), true);
  assert.equal(helpers.isRetiredActivity({ type: "gesture-practice" }), true);
  assert.equal(helpers.isRetiredActivity({ type: "choose-correct-symbol" }), true);
  creatableTypes.forEach((type) => assert.equal(helpers.isRetiredActivity({ type }), false));
});

test("every instruction says what to pick, and Match names the word", () => {
  assert.equal(helpers.activityInstruction("match-word-symbol", "Happy"), 'Tap the picture for "Happy".');
  assert.match(helpers.activityInstruction("fill-blank"), /finishes the sentence/);
  assert.match(helpers.activityInstruction("choose-correct-symbol"), /answers the question/);
  assert.match(helpers.activityInstruction("drag-drop-symbol"), /onto its word/);
});

test("every PECS card belongs to at least one meaning group", () => {
  const grouped = new Set(Object.values(options.activityMeaningGroups).flat());
  manifest.forEach((card) => assert.ok(grouped.has(normalizePecsLabel(card.label)), `${card.label} has no meaning group`));
});

test("no question offers a second card that could also be right", () => {
  creatableTypes.forEach((type) => {
    manifest.forEach((answer, index) => {
      const pool = manifest.map((card) => card.label);
      const exclusions = manifest
        .filter((candidate) => options.isUnsafeActivityDistractor(type, answer, candidate))
        .map((candidate) => candidate.label);
      const [choices] = options.buildActivityOptionSets([answer.label], pool, 0.1 + index, 3, [exclusions]);

      assert.equal(choices.length, 3, `${type} ${answer.label}: expected 3 choices`);
      assert.equal(new Set(choices).size, 3, `${type} ${answer.label}: duplicate choices`);
      assert.equal(choices.filter((choice) => choice === answer.label).length, 1, `${type} ${answer.label}: answer not once`);
      choices
        .filter((choice) => choice !== answer.label)
        .forEach((choice) => {
          const candidate = manifest.find((card) => card.label === choice);
          assert.equal(
            options.isUnsafeActivityDistractor(type, answer, candidate),
            false,
            `${type} ${answer.label}: ${choice} could also be right`
          );
        });
    });
  });
});

test("look-alike cards are never wrong options for each other", () => {
  const pairs = [
    ["Eat", "Bread"],
    ["Eat", "Rice"],
    ["Drink", "Water"],
    ["Drink", "Milk"],
    ["Happy", "Sad"],
    ["Angry", "Scared"],
    ["Water", "Milk"],
    ["Food", "Rice"],
    ["More", "Rice"],
    ["Sit", "Stand"],
    ["Hello", "Good morning"],
    ["Mother", "Father"],
    ["Is", "Are"],
    ["Yes", "No"]
  ];
  creatableTypes.forEach((type) => {
    pairs.forEach(([answer, other]) => {
      const answerCard = manifest.find((card) => card.label === answer);
      const otherCard = manifest.find((card) => card.label === other);
      assert.equal(options.isUnsafeActivityDistractor(type, answerCard, otherCard), true, `${type}: ${answer} vs ${other}`);
    });
  });
});

test("old built-in sentences are upgraded, teacher sentences are kept", () => {
  const activity = {
    type: "fill-blank",
    questions: [
      { id: "q1", prompt: "I feel ____.", answer: "Angry", learningItemId: "pecs-angry", options: [] },
      { id: "q2", prompt: "When my brother shouts, I feel ____.", answer: "Angry", learningItemId: "pecs-angry", options: [] }
    ]
  };
  const [upgraded] = helpers.upgradeStarterActivityPrompts([activity]);

  assert.equal(upgraded.questions[0].prompt, fillBlank.getSavedFillBlankPromptForLabel("Angry"));
  assert.equal(upgraded.questions[1].prompt, "When my brother shouts, I feel ____.");
});

/** True when `text` contains `word` as a whole word or phrase. */
function hasWord(text, word) {
  const escaped = normalizePecsLabel(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(text.toLowerCase());
}

test("a card the bank does not know: Fill starts empty, Choose names the category and never the card", () => {
  const categories = ["Greetings", "Emotions", "Family", "Food", "Numbers"];
  const labels = ["Zorbly", "Mimsy", "Numbers"];
  categories.forEach((categoryName) => {
    labels.forEach((label) => {
      const item = { id: `custom-${label}`, label, categoryId: "custom-cat" };
      assert.equal(fillBlank.createFillBlankPromptForLabel(label, item, categoryName), "", `${categoryName}/${label}: Fill should start empty`);
      const question = choose.createChooseCorrectSymbolPrompt(item, categoryName);
      assert.equal(hasWord(question, label), false, `${categoryName}/${label}: "${question}" names the card`);
    });
  });
  assert.equal(choose.createChooseCorrectSymbolPrompt({ id: "x", label: "Zorbly", categoryId: "custom" }, "Snack Time"), "Which picture is from Snack Time?");
  // A built-in category is read from its id when no name is given.
  assert.equal(
    choose.createChooseCorrectSymbolPrompt({ id: "x", label: "Zorbly", categoryId: "cat-pecs-daily-needs" }),
    "Which picture is from Daily Needs?"
  );
});

test("a teacher's own card named after a Makaton / PECS word gets bank questions", () => {
  const apple = { id: "custom-apple", label: "Apple", categoryId: "cat-pecs-food" };
  assert.match(fillBlank.createFillBlankPromptForLabel("Apple", apple), /____/);
  assert.equal(choose.createChooseCorrectSymbolPrompt(apple), "Which fruit is red, round, and crunchy?");
  // "Orange" in a Colors category asks about the color, not the fruit.
  const orange = { id: "custom-orange", label: "Orange", categoryId: "custom" };
  assert.equal(choose.createChooseCorrectSymbolPrompt(orange, "Colors"), "What color is a carrot?");
  assert.equal(choose.createChooseCorrectSymbolPrompt(orange, "Fruits"), "Which fruit is round and has a thick peel?");
});

test("teacher-made cards keep the rest of their category out of the choices", () => {
  const apple = { label: "Apple", categoryId: "cat-pecs-food" };
  const grape = { label: "Grape", categoryId: "cat-pecs-food" };
  const rice = { label: "Rice", categoryId: "cat-pecs-food" };
  const teacher = { label: "Teacher", categoryId: "cat-pecs-family" };
  const three = { label: "Three", categoryId: "cat-numbers" };
  const four = { label: "Four", categoryId: "cat-numbers" };
  creatableTypes.forEach((type) => {
    assert.equal(options.isUnsafeActivityDistractor(type, apple, grape), true);
    assert.equal(options.isUnsafeActivityDistractor(type, apple, rice), true);
    assert.equal(options.isUnsafeActivityDistractor(type, rice, apple), true);
    assert.equal(options.isUnsafeActivityDistractor(type, three, four), true);
    assert.equal(options.isUnsafeActivityDistractor(type, three, teacher), false);
  });
});

test("wrong choices avoid cards the question points at", () => {
  const question = "What do I want to eat today?";
  const rice = { label: "Rice" };
  ["Eat", "Food", "Banana", "Bread", "More", "Want"].forEach((label) => {
    const unsafe = options.isUnsafeActivityDistractor("choose-correct-symbol", rice, { label });
    const pointed = options.isQuestionRelatedDistractor(question, rice, { label });
    assert.ok(unsafe || pointed, `${label} could be offered for "${question}"`);
  });
  assert.equal(options.isQuestionRelatedDistractor(question, rice, { label: "Teacher" }), false);
  // A card the question names is only a last resort.
  assert.equal(
    options.isQuestionRelatedDistractor("Where do we wash hands after the toilet?", { label: "Toilet" }, { label: "Wash hands" }),
    true
  );

  const pool = manifest.map((card) => card.label);
  const avoided = manifest.filter((card) => options.isQuestionRelatedDistractor(question, rice, card)).map((card) => card.label);
  const excluded = manifest
    .filter((card) => options.isUnsafeActivityDistractor("choose-correct-symbol", rice, card))
    .map((card) => card.label);
  for (let seed = 1; seed < 40; seed += 1) {
    const [choices] = options.buildActivityOptionSets(["Rice"], pool, seed / 7, 3, [excluded], [avoided]);
    assert.equal(choices.length, 3);
    choices
      .filter((choice) => choice !== "Rice")
      .forEach((choice) => {
        assert.equal(avoided.includes(choice) || excluded.includes(choice), false, `seed ${seed}: ${choice}`);
      });
  }
  // Avoided cards still fill in when nothing else is left.
  const [small] = options.buildActivityOptionSets(["Rice"], ["Rice", "Eat", "Teacher"], 0.3, 3, [[]], [["Eat"]]);
  assert.equal(small.length, 3);
});

test("built-in Fill sentences with a second answer keep it out", () => {
  const card = (label) => manifest.find((entry) => entry.label === label);
  [
    ["Finished", "Happy"],
    ["Food", "Help"],
    ["Food", "Water"],
    ["Rest", "Drink"],
    ["No", "Thank you"]
  ].forEach(([answer, other]) => {
    assert.equal(options.isUnsafeActivityDistractor("fill-blank", card(answer), card(other)), true, `${answer} vs ${other}`);
  });
});

test("built-in Choose questions are upgraded, teacher questions are kept", () => {
  const activity = {
    type: "choose-correct-symbol",
    questions: [
      { id: "q1", prompt: "Which card shows rice?", answer: "pecs-rice", learningItemId: "pecs-rice", options: [] },
      { id: "q2", prompt: "What do we eat with adobo?", answer: "pecs-rice", learningItemId: "pecs-rice", options: [] }
    ]
  };
  const [upgraded] = helpers.upgradeStarterActivityPrompts([activity]);
  assert.equal(upgraded.questions[0].prompt, "What white food do we eat with chicken?");
  // A current bank question other than the main one is kept too.
  const [kept] = helpers.upgradeStarterActivityPrompts([
    { type: "choose-correct-symbol", questions: [{ id: "q3", prompt: "What small white grains do we eat at lunch?", answer: "pecs-rice", learningItemId: "pecs-rice", options: [] }] }
  ]);
  assert.equal(kept.questions[0].prompt, "What small white grains do we eat at lunch?");
  assert.equal(upgraded.questions[1].prompt, "What do we eat with adobo?");
});

test("the creator swaps an old saved built-in question for a current one, and keeps a teacher's own", () => {
  const rice = { id: "pecs-rice", label: "Rice", categoryId: "cat-pecs-food" };
  const hot = { id: "pecs-hot", label: "Hot", categoryId: "cat-pecs-safety-words" };
  const store = {
    "choose-correct-symbol:pecs-rice": "Which card shows rice?",
    "choose-correct-symbol:pecs-hot": "How is soup that just came off the stove?",
    "fill-blank:pecs-rice": "I want ____."
  };
  const riceChoose = helpers.getSavedQuestionPrompt("choose-correct-symbol", rice, store);
  assert.ok(choose.isCurrentChooseCorrectSymbolPrompt(rice, riceChoose), riceChoose);
  const hotChoose = helpers.getSavedQuestionPrompt("choose-correct-symbol", hot, store);
  assert.ok(choose.isCurrentChooseCorrectSymbolPrompt(hot, hotChoose), hotChoose);
  const riceFill = helpers.getSavedQuestionPrompt("fill-blank", rice, store);
  assert.ok(fillBlank.isCurrentFillBlankPrompt("Rice", riceFill), riceFill);

  // A current bank question and a teacher's own question are both kept as saved.
  const current = { "choose-correct-symbol:pecs-rice": "What small white grains do we eat at lunch?" };
  assert.equal(helpers.getSavedQuestionPrompt("choose-correct-symbol", rice, current), "What small white grains do we eat at lunch?");
  const own = { "choose-correct-symbol:pecs-rice": "What do we eat with adobo?" };
  assert.equal(helpers.getSavedQuestionPrompt("choose-correct-symbol", rice, own), "What do we eat with adobo?");
});

test("reworded Fill sentences upgrade in saved activities", () => {
  const activity = {
    type: "fill-blank",
    questions: [{ id: "q1", prompt: "I do not like spicy food. I say ____.", answer: "No", learningItemId: "pecs-no", options: [] }]
  };
  const [upgraded] = helpers.upgradeStarterActivityPrompts([activity]);
  assert.equal(upgraded.questions[0].prompt, "I shake my head and say ____.");

  // The Sep 27 situation sentences upgrade too; a teacher's own sentence stays.
  const [situation] = helpers.upgradeStarterActivityPrompts([{
    type: "fill-blank",
    questions: [
      { id: "q2", prompt: "She tucks me in at night. She is my ____.", answer: "Mother", learningItemId: "pecs-mother", options: [] },
      { id: "q3", prompt: "Nanay and I go to the market. She is my ____.", answer: "Mother", learningItemId: "pecs-mother", options: [] }
    ]
  }]);
  assert.equal(situation.questions[0].prompt, "I give my ____ a hug when she comes home.");
  assert.equal(situation.questions[1].prompt, "Nanay and I go to the market. She is my ____.");
});
