import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/utils/activity-option-sets.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const optionModule = {};
new Function("exports", compiled)(optionModule);
const { buildActivityOptionSets, isUnsafeActivityDistractor } = optionModule;

const symbolSource = fs.readFileSync("src/utils/activity-symbol-options.ts", "utf8");
const compiledSymbols = ts.transpileModule(symbolSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const symbolModule = {};
new Function("exports", compiledSymbols)(symbolModule);
const { findPecsLearningItemForActivityValue } = symbolModule;

const selectedAnswers = ["father", "mother", "you", "friend", "teacher"];
const libraryCards = ["angry", "m", "happy", "drink", "help", "stop", "yes", "no"];

test("every question includes its answer and two unique choices from the full library", () => {
  const optionSets = buildActivityOptionSets(selectedAnswers, libraryCards, 0.42);

  optionSets.forEach((options, index) => {
    assert.equal(options.length, 3);
    assert.equal(new Set(options).size, 3);
    assert.ok(options.includes(selectedAnswers[index]));
    assert.ok(
      options
        .filter((option) => option !== selectedAnswers[index])
        .every((option) => libraryCards.includes(option))
    );
  });
});

test("questions do not all reuse the same distractor pair", () => {
  const optionSets = buildActivityOptionSets(selectedAnswers, libraryCards, 0.42);
  const distractorPairs = optionSets.map((options, index) =>
    options.filter((option) => option !== selectedAnswers[index]).sort().join("|")
  );

  assert.ok(new Set(distractorPairs).size > 1);
});

test("another activity answer is only used when the library cannot fill every choice", () => {
  const optionSets = buildActivityOptionSets(["father", "mother"], ["angry"], 0.42);

  assert.equal(optionSets[0].length, 3);
  assert.ok(optionSets[0].includes("father"));
  assert.ok(optionSets[0].includes("angry"));
  assert.ok(optionSets[0].includes("mother"));
  assert.equal(new Set(optionSets[0]).size, 3);
});

test("a round keeps the same choices for the same seed", () => {
  assert.deepEqual(
    buildActivityOptionSets(selectedAnswers, libraryCards, 0.42),
    buildActivityOptionSets(selectedAnswers, libraryCards, 0.42)
  );
});

test("a shared label resolves to the PECS material instead of the gesture material", () => {
  const learningItems = [
    { id: "gesture-help", contentType: "gesture", label: "Help", gestureMediaUrl: "/gestures/help.mp4" },
    { id: "pecs-help", contentType: "pecs", label: "Help", symbolImageUrl: "/pecs/generated_cards/help.png" }
  ];

  assert.equal(findPecsLearningItemForActivityValue("Help", learningItems)?.id, "pecs-help");
  assert.equal(findPecsLearningItemForActivityValue("gesture-help", learningItems), undefined);
});

test("every built-in PECS card has dedicated no-text activity artwork", () => {
  const manifest = JSON.parse(fs.readFileSync("public/pecs/pecs_arasaac_manifest.json", "utf8"));

  manifest.forEach((card) => {
    assert.ok(
      fs.existsSync(`public/pecs/generated_cards_no_text/${card.filename}`),
      `Missing no-text activity image for ${card.label}`
    );
  });
});

test("an Eat question excludes food cards that are also reasonable answers", () => {
  const eat = { label: "Eat", sentenceRole: "verb" };
  const foodCards = ["Food", "Rice", "Bread", "Banana"];

  foodCards.forEach((label) => {
    assert.equal(
      isUnsafeActivityDistractor("choose-correct-symbol", eat, { label, sentenceRole: "object" }),
      true
    );
  });
  assert.equal(
    isUnsafeActivityDistractor("choose-correct-symbol", eat, { label: "Teacher", sentenceRole: "subject" }),
    false
  );
});

test("fill-in-the-blank excludes other cards that can fill the same sentence role", () => {
  const answer = { label: "Mother", sentenceRole: "subject" };

  assert.equal(
    isUnsafeActivityDistractor("fill-blank", answer, { label: "Father", sentenceRole: "subject" }),
    true
  );
  assert.equal(
    isUnsafeActivityDistractor("fill-blank", answer, { label: "Happy", sentenceRole: "emotion" }),
    false
  );
});

test("the option builder never reintroduces excluded semantic distractors", () => {
  const options = buildActivityOptionSets(
    ["eat"],
    ["food", "rice", "teacher", "happy"],
    0.42,
    3,
    [["food", "rice"]]
  )[0];

  assert.deepEqual(new Set(options), new Set(["eat", "teacher", "happy"]));
});
