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
