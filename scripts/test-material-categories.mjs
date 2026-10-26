import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { pecsCardManifest, pecsCardCategories } = loadTs("src/data/pecs-card-manifest.ts");
const { createPecsManifestCategories, ensurePecsManifestItems } = loadTs("src/utils/pecs-content-library.ts");
const { isUnsafeActivityDistractor } = loadTs("src/utils/activity-option-sets.ts");

test("all 50 built-in materials have a reviewed category with no duplicate Choices category", () => {
  const expected = {
    Greetings: ["Hello", "Goodbye", "Good morning"],
    "Polite Words": ["Please", "Thank you", "Sorry"],
    Emotions: ["Happy", "Sad", "Angry", "Scared"],
    Health: ["Sick", "Tired", "Hurt"],
    Family: ["Mother", "Father"],
    People: ["Teacher", "Friend"],
    Grammar: ["I", "You", "Am", "Is", "Are"],
    Choices: ["Yes", "No"],
    Food: ["Eat", "Drink", "Food", "Water", "Rice", "Bread", "Milk", "Banana"],
    "Classroom Commands": ["Sit", "Stand", "Listen", "Look", "Read", "Write", "Wait", "Stop"],
    "Daily Needs": ["Toilet", "Help", "Rest", "Sleep", "Wash hands", "More", "Finished", "Want"],
    "Safety Words": ["Danger", "Hot"]
  };
  assert.equal(pecsCardManifest.length, 50);
  assert.equal(new Set(pecsCardManifest.map((card) => card.label)).size, 50);
  assert.deepEqual([...pecsCardCategories].sort(), Object.keys(expected).sort());
  for (const [category, labels] of Object.entries(expected)) {
    assert.deepEqual(pecsCardManifest.filter((card) => card.category === category).map((card) => card.label).sort(), labels.sort());
  }
  const categories = createPecsManifestCategories();
  assert.equal(categories.find((category) => category.name === "Choices").id, "cat-choices");
  assert.equal(categories.some((category) => category.id === "cat-pecs-choices"), false);
});

test("loading material metadata preserves a teacher's saved category and grammatical roles", () => {
  const input = {
    id: "pecs-please", contentType: "pecs", label: "Please", categoryId: "teacher-custom-category",
    description: "Teacher-written instruction", sentenceRole: "polite_word", tags: [],
    symbolImageUrl: "https://example.test/please.png"
  };
  const [output] = ensurePecsManifestItems([input]);
  assert.equal(output.categoryId, input.categoryId);
  assert.equal(output.description, input.description);
  assert.equal(output.sentenceRole, input.sentenceRole);
});

test("semantic distractor exclusions survive the Health, People, and Grammar category splits", () => {
  const get = (label) => {
    const card = pecsCardManifest.find((entry) => entry.label === label);
    return { label, sentenceRole: card.sentenceRole, categoryId: card.category };
  };
  for (const [answer, candidate] of [["Happy", "Tired"], ["Sad", "Sick"], ["Hurt", "Hot"], ["Mother", "Teacher"], ["Friend", "I"], ["I", "You"], ["Please", "Sorry"], ["Eat", "Banana"], ["Drink", "Water"]]) {
    for (const type of ["match-word-symbol", "choose-correct-symbol", "fill-blank", "simple-quiz", "drag-drop-symbol"]) {
      assert.equal(isUnsafeActivityDistractor(type, get(answer), get(candidate)), true, `${type}: ${answer}/${candidate}`);
    }
  }
});
