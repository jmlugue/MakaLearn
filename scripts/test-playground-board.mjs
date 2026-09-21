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
const { placeLibraryItem, swapBoardItems } = boardModule;

test("dropping one placed card onto another swaps only those positions", () => {
  assert.deepEqual(swapBoardItems(["one", "two"], 0, 1), ["two", "one"]);
  assert.deepEqual(swapBoardItems(["one", "two", "three"], 0, 2), ["three", "two", "one"]);
  assert.deepEqual(swapBoardItems(["one", "two", "three"], 2, 1), ["one", "three", "two"]);
});

test("dropping a library card onto an occupied position replaces one card", () => {
  assert.deepEqual(placeLibraryItem(["one", "two"], "new", 0, 5), ["new", "two"]);
  assert.deepEqual(placeLibraryItem(["one", "two"], "new", 1, 5), ["one", "new"]);
  assert.deepEqual(
    placeLibraryItem(["one", "two", "three", "four", "five"], "new", 0, 5),
    ["new", "two", "three", "four", "five"]
  );
});

test("dropping on the board background appends once and respects the limit", () => {
  assert.deepEqual(placeLibraryItem(["one", "two"], "new", undefined, 5), ["one", "two", "new"]);
  assert.deepEqual(
    placeLibraryItem(["one", "two", "three", "four", "five"], "new", undefined, 5),
    ["one", "two", "three", "four", "five"]
  );
});
