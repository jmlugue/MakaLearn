import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync("src/utils/playground-board.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const boardModule = {};
new Function("exports", compiled)(boardModule);
const { placeLibraryItem } = boardModule;

const playground = fs.readFileSync("src/features/playground/playground-view.tsx", "utf8");

// Run the actual component handlers with controlled voice completion, without a browser or live backend.
const playgroundAst = ts.createSourceFile("playground.tsx", playground, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const view = playgroundAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "PlaygroundView");
const handlerNames = ["cancelNarration", "checkSentence", "removeCard", "resetSentence", "addCard", "placeLibraryCard", "speakSentence", "speakSentenceLike"];
const handlers = view.body.statements
  .filter((node) => ts.isFunctionDeclaration(node) && handlerNames.includes(node.name?.text))
  .map((node) => node.getText(playgroundAst)).join("\n");
const compiledHandlers = ts.transpileModule(handlers, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 }
}).outputText;

function narrationHarness({ valid = true, read = async () => {}, grade = async () => ({ isValid: valid }) } = {}) {
  const callbacks = [];
  const spoken = [];
  let cancellations = 0;
  const context = {
    sentenceCards: [{ label: "Hello" }, { label: "Help" }],
    narrationRevision: { current: 0 }, speaking: false, approvedCardIds: new Set(), maxSentenceCards: 5,
    pendingCheck: { current: null }, checkingRef: { current: false }, setChecking() {}, result: null,
    window: { speechSynthesis: { cancel: () => { cancellations += 1; } } },
    setSpeaking() {}, setSpeakingIndex() {}, setSentenceCards() {}, setResult() {}, setFeedbackModal() {}, setMakiReaction() {},
    checkPlayground: grade, pickCheer: () => ({}), playCue() {}, encourageAfterWrong() {},
    sayMakiLine: (_, callback) => callbacks.push(callback),
    sayCard: (card) => { spoken.push(card.label); return read(); },
    speakText: (text) => { spoken.push(text); return read(); },
    getSpeechLabel: (label) => label, placeLibraryItem, notify() {}
  };
  const actions = new Function(...Object.keys(context), `${compiledHandlers}\nreturn { ${handlerNames.join(", ")} };`)(...Object.values(context));
  return { actions, callbacks, spoken, cancellations: () => cancellations };
}

test("an unchanged board is read after Maki finishes praising it", async () => {
  const { actions, callbacks, spoken } = narrationHarness();
  await actions.checkSentence();
  assert.deepEqual(spoken, []);
  callbacks[0]();
  assert.deepEqual(spoken, ["Hello Help"]);
});

test("board edits invalidate the readout queued behind Maki", async () => {
  for (const edit of [
    (actions) => actions.removeCard(0),
    (actions) => actions.resetSentence(),
    (actions) => actions.addCard({ label: "More" }),
    (actions) => actions.placeLibraryCard({ label: "More" })
  ]) {
    const { actions, callbacks, spoken, cancellations } = narrationHarness();
    await actions.checkSentence();
    edit(actions);
    callbacks[0]();
    assert.ok(!spoken.includes("Hello Help"));
    assert.equal(cancellations(), 2);
  }
});

test("a newer Check invalidates an older praise completion", async () => {
  const { actions, callbacks, spoken } = narrationHarness();
  await actions.checkSentence();
  await actions.checkSentence();
  callbacks[0]();
  assert.deepEqual(spoken, []);
  callbacks[1]();
  assert.deepEqual(spoken, ["Hello Help"]);
});

test("removing a card during Listen stops the remaining card sequence", async () => {
  let finishWord;
  const { actions, spoken } = narrationHarness({ valid: false, read: () => new Promise((resolve) => { finishWord = resolve; }) });
  const reading = actions.speakSentence();
  await Promise.resolve();
  assert.deepEqual(spoken, ["Hello"]);
  actions.removeCard(0);
  finishWord();
  await reading;
  assert.deepEqual(spoken, ["Hello"]);
});

test("editing the board aborts a pending check and suppresses its result", async () => {
  let resolveGrade;
  let signal;
  const { actions, callbacks } = narrationHarness({ grade: (_, __, pendingSignal) => {
    signal = pendingSignal;
    return new Promise((resolve) => { resolveGrade = resolve; });
  } });
  const pending = actions.checkSentence();
  actions.removeCard(0);
  assert.equal(signal.aborted, true);
  resolveGrade({ isValid: true });
  await pending;
  assert.deepEqual(callbacks, []);
});

test("repeated Check taps share the pending operation", async () => {
  let calls = 0;
  let finish;
  const { actions } = narrationHarness({ grade: () => {
    calls += 1;
    return new Promise((resolve) => { finish = resolve; });
  } });
  const first = actions.checkSentence();
  await actions.checkSentence();
  assert.equal(calls, 1);
  finish({ isValid: true });
  await first;
});

test("a clicked or dropped card goes to the next empty place", () => {
  assert.deepEqual(placeLibraryItem([], "one", undefined, 5), ["one"]);
  assert.deepEqual(placeLibraryItem(["one", "two"], "new", undefined, 5), ["one", "two", "new"]);
});

test("the board holds five cards and a full board takes no more", () => {
  assert.match(playground, /const maxSentenceCards = 5;/);
  assert.deepEqual(
    placeLibraryItem(["one", "two", "three", "four", "five"], "new", undefined, 5),
    ["one", "two", "three", "four", "five"]
  );
});

// Owner's rule (Sep 30): a drop anywhere on the board fills the next empty place, never swaps or replaces a card.
test("the Playground never swaps or replaces a placed card", () => {
  assert.doesNotMatch(playground, /swapBoardItems/);
  assert.match(playground, /placeLibraryCard\(state\.source\.card\)/);
  assert.doesNotMatch(playground, /(?<!function )placeLibraryCard\([^)]*,[^)]*\)/);
});

test("Playground categories come from the saved category record", () => {
  assert.match(playground, /const categoryById = new Map\(categories\.map/);
  assert.match(playground, /category: categoryById\.get\(item\.categoryId\)/);
  assert.match(playground, /setCategories\(data\.categories\)/);
});

test("Playground uses one shared speech voice instead of mixing uploaded recordings with browser speech", () => {
  assert.match(playground, /function sayCard\(card: PlaygroundCard\)/);
  assert.match(playground, /return speakText\(getSpeechLabel\(card\.label\)\)/);
  assert.doesNotMatch(playground, /function playAudio\(/);
});
