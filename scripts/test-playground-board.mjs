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
