// Activity rules from the Sep 26 review: 4 creatable types, clear instructions, one right answer per
// question, and contextual Fill in the blank sentences. Loads the real source files, no database.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

/** Transpile a TypeScript file and run it, answering its imports from `modules`. */
function loadModule(path, modules = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const exports = {};
  const requireStub = (name) => {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected import in ${path}: ${name}`);
  };
  new Function("exports", "require", compiled)(exports, requireStub);
  return exports;
}

const normalizePecsLabel = (label) => label.trim().toLowerCase().replace(/\s+/g, " ");
const manifestModule = { normalizePecsLabel };

const options = loadModule("src/utils/activity-option-sets.ts");
const categoryPrompts = loadModule("src/utils/category-prompts.ts");
const fillBlank = loadModule("src/utils/fill-blank-prompts.ts", {
  "@/data/pecs-card-manifest": manifestModule,
  "@/utils/category-prompts": categoryPrompts
});
const choose = loadModule("src/utils/starter-learning-item-prompts.ts", {
  "@/data/pecs-card-manifest": manifestModule,
  "@/utils/category-prompts": categoryPrompts
});
const helpers = loadModule("src/features/activities/activity-helpers.ts", {
  "@/utils/fill-blank-prompts": fillBlank,
  "@/utils/pecs-content-library": { ensurePecsManifestItems: (items) => items },
  "@/utils/starter-learning-item-prompts": choose
});

const manifest = JSON.parse(fs.readFileSync("public/pecs/pecs_arasaac_manifest.json", "utf8")).map((row) => ({
  label: row.label,
  sentenceRole: row.sentence_role
}));
const creatableTypes = ["match-word-symbol", "choose-correct-symbol", "fill-blank", "drag-drop-symbol"];

test("teachers can make exactly the 4 kept types", () => {
  assert.deepEqual([...helpers.activityTypes].sort(), [...creatableTypes].sort());
});

test("Choose the word and Gesture practice are hidden, kept types are not", () => {
  assert.equal(helpers.isRetiredActivity({ type: "simple-quiz" }), true);
  assert.equal(helpers.isRetiredActivity({ type: "gesture-practice" }), true);
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

test("every PECS card has a contextual Fill in the blank sentence", () => {
  manifest.forEach((card) => {
    const sentence = fillBlank.getSavedFillBlankPromptForLabel(card.label);
    assert.ok(sentence, `${card.label} has no sentence`);
    assert.equal(sentence.split("____").length, 2, `${card.label}: needs exactly one ____`);
    assert.match(sentence, /[.?!]$/, `${card.label}: must end with punctuation`);
    assert.ok(sentence.split(/\s+/).length >= 7, `${card.label}: too short to give context`);
    assert.ok(sentence.split(/\s+/).length <= 12, `${card.label}: too long for a child to read`);
    assert.equal(fillBlank.isGenericFillBlankPrompt(card.label, sentence), false, `${card.label}: generic sentence`);
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

test("every Choose the picture question is short, one sentence, and never names its answer", () => {
  const entries = choose.chooseCorrectSymbolPromptEntries();
  manifest.forEach((card) => {
    const entry = entries.find((candidate) => candidate.label === normalizePecsLabel(card.label));
    assert.ok(entry, `${card.label} has no question`);
    assert.equal(hasWord(entry.prompt, card.label), false, `${card.label}: "${entry.prompt}" names the answer`);
    assert.match(entry.prompt, /\?$/, `${card.label}: must be a question`);
    const sentences = entry.prompt.replace(/"[^"]*"/g, "").split(/[.?!]/).filter((part) => part.trim());
    assert.equal(sentences.length, 1, `${card.label}: one sentence`);
    assert.ok(entry.prompt.split(/\s+/).length <= 12, `${card.label}: too long`);
  });
});

test("no Fill in the blank sentence names its answer", () => {
  manifest.forEach((card) => {
    const sentence = fillBlank.getSavedFillBlankPromptForLabel(card.label);
    assert.equal(hasWord(sentence, card.label), false, `${card.label}: "${sentence}" names the answer`);
  });
});

test("a teacher's own card gets a category starter that never names it", () => {
  const categories = ["Greetings", "Emotions", "Family", "Food", "Classroom Commands", "Daily Needs", "Safety Words", "Numbers"];
  const labels = ["Three", "Apple", "Grandma", "Jump", "Numbers"];
  categories.forEach((categoryName) => {
    labels.forEach((label) => {
      const item = { id: `custom-${label}`, label, categoryId: "custom-cat" };
      const fill = fillBlank.createFillBlankPromptForLabel(label, item, categoryName);
      const question = choose.createChooseCorrectSymbolPrompt(item, categoryName);
      assert.equal(fill.split("____").length, 2, `${categoryName}/${label}: one blank`);
      assert.equal(hasWord(fill, label), false, `${categoryName}/${label}: "${fill}" names the card`);
      assert.equal(hasWord(question, label), false, `${categoryName}/${label}: "${question}" names the card`);
      assert.equal(fillBlank.isGenericFillBlankPrompt(label, fill), false);
    });
  });
  // A built-in category is read from its id when no name is given.
  assert.equal(
    choose.createChooseCorrectSymbolPrompt({ id: "x", label: "Apple", categoryId: "cat-pecs-food" }),
    categoryPrompts.allCategoryPrompts().find((entry) => entry.name === "food").choose
  );
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
  assert.equal(upgraded.questions[1].prompt, "What do we eat with adobo?");
});
