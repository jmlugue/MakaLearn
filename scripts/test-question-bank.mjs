// The question bank (src/utils/question-bank/): every question passes the rules for early primary SPED
// learners, every built-in card has several questions, every vocabulary word has at least one, and words that
// share a sentence are never wrong choices for each other. Loads the real source files, no database.
import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const stubs = { "@/data/pecs-card-manifest": { normalizePecsLabel: (label) => label.trim().toLowerCase().replace(/\s+/g, " ") } };
const bank = loadTs("src/utils/question-bank/index.ts", stubs);
const { checkQuestion, checkFillStyle } = loadTs("src/utils/question-bank/rules.ts", stubs);
const { symbolVocabulary } = loadTs("src/data/symbol-vocabulary.ts", stubs);
const options = loadTs("src/utils/activity-option-sets.ts", stubs);
const { builtIn, vocabulary } = bank.bankLabels();

function everyQuestion(labels) {
  return labels.flatMap((label) =>
    bank.rawBankEntries(label).flatMap((entry) =>
      ["fill", "choose"].flatMap((kind) => entry[kind].map((text) => ({ label, kind, text })))
    )
  );
}

test("every bank question passes the rules", () => {
  const broken = everyQuestion([...builtIn, ...vocabulary])
    .map((question) => ({ ...question, problems: bank.checkBankQuestion(question.kind, question.label, question.text) }))
    .filter((question) => question.problems.length);
  assert.deepEqual(broken, [], broken.map((question) => `${question.label} [${question.kind}] ${question.text}: ${question.problems.join(" ")}`).join("\n"));
});

test("every Fill sentence is one plain sentence, no conversations or restated answers", () => {
  const broken = everyQuestion([...builtIn, ...vocabulary])
    .filter((question) => question.kind === "fill")
    .map(({ label, text }) => ({ label, text, problems: checkFillStyle(text) }))
    .filter((entry) => entry.problems.length);
  assert.deepEqual(broken, [], broken.map((entry) => `${entry.label}: ${entry.text}: ${entry.problems.join(" ")}`).join("\n"));
});

test("every built-in card has at least 3 Fill and 3 Choose questions", () => {
  assert.equal(builtIn.length, 50);
  builtIn.forEach((label) => {
    assert.ok(bank.bankQuestions("fill", label).length >= 3, `${label}: needs 3 Fill sentences`);
    assert.ok(bank.bankQuestions("choose", label).length >= 3, `${label}: needs 3 Choose questions`);
  });
});

test("every vocabulary word has at least one Fill and one Choose question", () => {
  const missing = symbolVocabulary.filter(
    (word) => !bank.bankQuestions("fill", word).length || !bank.bankQuestions("choose", word).length
  );
  assert.deepEqual(missing, []);
});

test("every vocabulary sentence belongs to a word, and each meaning has one", () => {
  const { vocabularyFill } = loadTs("src/utils/question-bank/vocabulary-fill.ts", stubs);
  const used = new Set(vocabulary.flatMap((label) => bank.rawBankEntries(label).flatMap((entry) => entry.fill)));
  const orphans = Object.entries(vocabularyFill).filter(([, text]) => !used.has(text)).map(([key]) => key);
  assert.deepEqual(orphans, []);
  const empty = vocabulary.filter((label) => bank.rawBankEntries(label).some((entry) => !entry.fill.length));
  assert.deepEqual(empty, []);
});

test("no question is used for two different words", () => {
  const seen = new Map();
  everyQuestion([...builtIn, ...vocabulary]).forEach(({ label, kind, text }) => {
    const key = `${kind}:${text.toLowerCase()}`;
    assert.ok(!seen.has(key) || seen.get(key) === label, `"${text}" is used for ${seen.get(key)} and ${label}`);
    seen.set(key, label);
  });
});

test("words in the same bank group are never wrong choices for each other", () => {
  const byGroup = new Map();
  [...builtIn, ...vocabulary].forEach((label) => {
    bank.bankGroupsOf(label).forEach((group) => byGroup.set(group, [...(byGroup.get(group) ?? []), label]));
  });
  byGroup.forEach((labels, group) => {
    labels.forEach((answer) => {
      labels.forEach((candidate) => {
        if (answer === candidate || (bank.isBuiltInBankLabel(answer) && bank.isBuiltInBankLabel(candidate))) return;
        assert.equal(
          options.isUnsafeActivityDistractor("choose-correct-symbol", { label: answer }, { label: candidate }),
          true,
          `${group}: ${candidate} could be offered for ${answer}`
        );
      });
    });
  });
});

test("the rules catch what they should", () => {
  const problems = (kind, answer, text) => checkQuestion(kind, answer, text);
  assert.notDeepEqual(problems("fill", "Sad", "I am sad. I feel ____."), [], "names the answer");
  assert.notDeepEqual(checkFillStyle("My mom cooks for us. She is my ____."), [], "restates the answer");
  assert.notDeepEqual(checkFillStyle('Mom: "Why are you crying?" Me: "I am ____."'), [], "conversation");
  assert.deepEqual(checkFillStyle("I give my ____ a hug when she comes home."), []);
  assert.deepEqual(problems("fill", "No", "I say ____ when I do not like something."), [], "general dislike is fine");
  assert.notDeepEqual(problems("fill", "Am", "Let me tell you about me. I ____ seven years old."), [], "age");
  assert.notDeepEqual(problems("fill", "No", "I do not like spicy food. I say ____."), [], "likes");
  assert.notDeepEqual(problems("choose", "Rice", "Which card shows food?"), [], "talks about cards");
  assert.notDeepEqual(problems("choose", "Rice", "What?"), [], "too short");
  assert.notDeepEqual(problems("choose", "Rice", "What white food do we always eat with chicken and egg at home?"), [], "too long");
  assert.notDeepEqual(problems("fill", "Rice", "Mom cooks a tremendous pot. It is ____."), [], "hard word");
  assert.notDeepEqual(problems("fill", "Rice", "Mom cooks ____ and ____."), [], "two blanks");
  assert.deepEqual(problems("fill", "Sad", "I feel ____ because my blue balloon flew away."), []);
  assert.deepEqual(problems("fill", "I", "____ can tie my shoes by myself."), [], "I is allowed");
});

test("No category does not make teacher cards related, a real shared category does", () => {
  const card = (label, categoryId) => ({ label, categoryId });
  assert.equal(
    options.isUnsafeActivityDistractor("fill-blank", card("Zorbly", "cat-no-category"), card("Blipto", "cat-no-category")),
    false
  );
  assert.equal(options.isUnsafeActivityDistractor("fill-blank", card("Zorbly", "cat-toys"), card("Blipto", "cat-toys")), true);
});
