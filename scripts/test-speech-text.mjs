import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("src/utils/speech-text.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const speechModule = {};
new Function("exports", compiled)(speechModule);
const { normalizeLearningSpeechText } = speechModule;

test("pronounces Am as a word instead of the letters A M", () => {
  assert.equal(normalizeLearningSpeechText("Am"), "am");
  assert.equal(normalizeLearningSpeechText("AM"), "am");
  assert.equal(normalizeLearningSpeechText("I Am Happy"), "I am Happy");
});

test("leaves unrelated learning labels unchanged", () => {
  assert.equal(normalizeLearningSpeechText("Good morning"), "Good morning");
  assert.equal(normalizeLearningSpeechText("Wash hands"), "Wash hands");
});
