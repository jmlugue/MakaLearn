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
const fillBlank = loadModule("src/utils/fill-blank-prompts.ts", { "@/data/pecs-card-manifest": manifestModule });
const helpers = loadModule("src/features/activities/activity-helpers.ts", {
  "@/utils/fill-blank-prompts": fillBlank,
  "@/utils/pecs-content-library": { ensurePecsManifestItems: (items) => items },
  "@/utils/starter-learning-item-prompts": {
    getSavedChooseCorrectSymbolPrompt: () => undefined,
    getStarterLearningItemPromptDescription: () => undefined,
    isGenericChooseCorrectSymbolPrompt: () => false
  }
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
