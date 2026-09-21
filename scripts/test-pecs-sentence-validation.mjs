import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("src/utils/pecs-sentence-validation.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const validationModule = {};
new Function("exports", compiled)(validationModule);
const { validatePecsSentence } = validationModule;

const manifest = JSON.parse(fs.readFileSync("public/pecs/pecs_arasaac_manifest.json", "utf8"));
const manifestByLabel = new Map(manifest.map((card) => [card.label, card]));

function validate(entries) {
  const cards = entries.map(([label, sentenceRole], index) => ({ id: String(index), label, sentenceRole }));
  return validatePecsSentence(cards, new Set(cards.map((card) => card.id)));
}

function validateLabels(labels) {
  return validate(labels.map((label) => {
    const card = manifestByLabel.get(label);
    assert.ok(card, `Missing manifest card: ${label}`);
    return [card.label, card.sentence_role];
  }));
}

const subjects = [
  ["I", "Am"],
  ["You", "Are"],
  ["Mother", "Is"],
  ["Father", "Is"],
  ["Teacher", "Is"],
  ["Friend", "Is"]
];
const people = ["Mother", "Father", "Teacher", "Friend"];
const emotions = ["Happy", "Sad", "Angry", "Scared", "Tired", "Sick"];
const describingComplements = [...emotions, "Hot", "Hurt", "Finished"];
const actionPredicates = [
  "Eat",
  "Drink",
  "Sit",
  "Stand",
  "Listen",
  "Look",
  "Read",
  "Write",
  "Wait",
  "Stop",
  "Help",
  "Rest",
  "Sleep",
  "Wash hands"
];
const edible = ["Food", "Rice", "Bread", "Banana"];
const drinkable = ["Water", "Milk"];
const consumable = [...edible, ...drinkable];

test("addressed greetings, responses, and polite expressions accept named people", () => {
  for (const lead of ["Hello", "Goodbye", "Good morning", "Sorry", "Thank you", "Please", "Yes", "No"]) {
    for (const person of people) {
      const result = validateLabels([lead, person]);
      assert.equal(result.isValid, true, `${lead} ${person}`);
      assert.equal(result.constructionType, "expression");
    }
  }

  assert.equal(validateLabels(["Hello", "I"]).isValid, false);
  assert.equal(validateLabels(["Mother", "Hello"]).isValid, false);
  assert.equal(validateLabels(["Danger", "Mother"]).isValid, false);
});

test("describing sentences require subject agreement and allow safety or completion states", () => {
  const beVerbs = ["Am", "Is", "Are"];

  for (const [subject, expectedBeVerb] of subjects) {
    for (const beVerb of beVerbs) {
      for (const complement of describingComplements) {
        const result = validateLabels([subject, beVerb, complement]);
        assert.equal(result.isValid, beVerb === expectedBeVerb, `${subject} ${beVerb} ${complement}`);
      }
    }
  }

  assert.equal(validateLabels(["I", "Am", "Danger"]).isValid, false);
  assert.equal(validateLabels(["I", "Am", "Food"]).isValid, false);
});

test("base-form action cards only follow I or You", () => {
  for (const subject of ["I", "You"]) {
    for (const predicate of actionPredicates) {
      assert.equal(validateLabels([subject, predicate]).isValid, true, `${subject} ${predicate}`);
    }
  }

  for (const subject of people) {
    for (const predicate of actionPredicates) {
      assert.equal(validateLabels([subject, predicate]).isValid, false, `${subject} ${predicate}`);
    }
  }
});

test("requests accept every available object plus More and Help", () => {
  const targets = ["Food", "Water", "Rice", "Bread", "Milk", "Banana", "Toilet", "Rest", "More", "Help"];

  for (const subject of ["I", "You"]) {
    for (const target of targets) {
      assert.equal(validateLabels([subject, "Want", target]).isValid, true, `${subject} Want ${target}`);
    }
  }

  assert.equal(validateLabels(["I", "Want"]).isValid, false);
  assert.equal(validateLabels(["Mother", "Want", "Water"]).isValid, false);
  assert.equal(validateLabels(["I", "Want", "Happy"]).isValid, false);
});

test("action targets are checked for meaning in statements and commands", () => {
  for (const food of edible) {
    assert.equal(validateLabels(["I", "Eat", food]).isValid, true);
    assert.equal(validateLabels(["Eat", food]).isValid, true);
    assert.equal(validateLabels(["Please", "Eat", food]).isValid, true);
    assert.equal(validateLabels(["Eat", food, "Please"]).isValid, true);
  }

  for (const drink of drinkable) {
    assert.equal(validateLabels(["You", "Drink", drink]).isValid, true);
    assert.equal(validateLabels(["Drink", drink]).isValid, true);
    assert.equal(validateLabels(["Please", "Drink", drink]).isValid, true);
    assert.equal(validateLabels(["Drink", drink, "Please"]).isValid, true);
  }

  for (const person of ["You", ...people]) {
    assert.equal(validateLabels(["Help", person]).isValid, true);
    assert.equal(validateLabels(["Please", "Help", person]).isValid, true);
    assert.equal(validateLabels(["Help", person, "Please"]).isValid, true);
  }

  assert.equal(validateLabels(["I", "Eat", "Water"]).isValid, false);
  assert.equal(validateLabels(["Drink", "Banana"]).isValid, false);
  assert.equal(validateLabels(["Help", "Food"]).isValid, false);
  assert.equal(validateLabels(["I", "Help", "I"]).isValid, false);
  assert.equal(validateLabels(["You", "Help", "You"]).isValid, false);
});

test("common compact phrases are accepted without opening role-only false positives", () => {
  for (const target of [...consumable, "Rest", "Help"]) {
    assert.equal(validateLabels(["More", target]).isValid, true, `More ${target}`);
  }

  for (const target of consumable) {
    assert.equal(validateLabels(["Hot", target]).isValid, true, `Hot ${target}`);
  }

  for (const expression of [
    ["Yes", "Please"],
    ["Yes", "Thank you"],
    ["No", "Thank you"],
    ["No", "More"],
    ["More", "Please"],
    ["Water", "Please"],
    ["Toilet", "Please"]
  ]) {
    assert.equal(validateLabels(expression).isValid, true, expression.join(" "));
  }

  assert.equal(validateLabels(["More", "Toilet"]).isValid, false);
  assert.equal(validateLabels(["Hot", "Mother"]).isValid, false);
  assert.equal(validateLabels(["Thank you", "Sit"]).isValid, false);
  assert.equal(validateLabels(["Please", "Want"]).isValid, false);
});

test("greetings and named addressees can introduce a complete sentence", () => {
  assert.equal(validateLabels(["Hello", "Mother", "I", "Am", "Happy"]).isValid, true);
  assert.equal(validateLabels(["Hello", "I", "Want", "Water"]).isValid, true);
  assert.equal(validateLabels(["Mother", "I", "Am", "Tired"]).isValid, true);
  assert.equal(validateLabels(["Hello", "Mother", "Danger"]).isValid, false);
});

test("every two-card result across the 50-card manifest matches the approved pair list", () => {
  const expectedValidPairs = new Set();
  const addPairs = (leftValues, rightValues) => {
    for (const left of leftValues) {
      for (const right of rightValues) expectedValidPairs.add(`${left}|${right}`);
    }
  };

  addPairs(["Hello", "Goodbye", "Good morning", "Sorry", "Thank you", "Please", "Yes", "No"], people);
  addPairs(["I", "You"], actionPredicates);
  addPairs(["Please"], actionPredicates);
  addPairs(actionPredicates, ["Please"]);
  addPairs(["Eat"], edible);
  addPairs(["Drink"], drinkable);
  addPairs(["Help"], ["You", ...people]);
  addPairs(["More"], [...consumable, "Rest", "Help"]);
  addPairs(["Hot"], consumable);
  addPairs(["Food", "Water", "Rice", "Bread", "Milk", "Banana", "Toilet", "Rest"], ["Please"]);

  for (const pair of [
    ["Yes", "Please"],
    ["Yes", "Thank you"],
    ["No", "Thank you"],
    ["No", "More"],
    ["More", "Please"]
  ]) {
    expectedValidPairs.add(pair.join("|"));
  }

  for (const first of manifest) {
    for (const second of manifest) {
      const key = `${first.label}|${second.label}`;
      assert.equal(
        validateLabels([first.label, second.label]).isValid,
        expectedValidPairs.has(key),
        key
      );
    }
  }
});
