import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedFileName,
  extensionError,
  fileNameError,
  labelFromWord,
  namePart,
  parseFileName
} from "../src/utils/media-filename.ts";

test("name parts are lowercase with hyphens for spaces", () => {
  assert.equal(namePart("Thank you"), "thank-you");
  assert.equal(namePart("  Daily   Needs "), "daily-needs");
  assert.equal(namePart("Don't"), "dont");
  assert.equal(expectedFileName("Thank you", "Greetings", "png"), "thank-you_greetings.png");
});

test("a valid name parses into word, category, and extension", () => {
  assert.deepEqual(parseFileName("eat_food.png"), { word: "eat", category: "food", extension: "png" });
  assert.deepEqual(parseFileName("Thank-You_Greetings.MP3"), { word: "thank-you", category: "greetings", extension: "mp3" });
  assert.equal(labelFromWord("thank-you"), "Thank you");
});

test("names that break the rule do not parse", () => {
  assert.equal(parseFileName("eat.png"), null, "no underscore");
  assert.equal(parseFileName("eat_food_2.png"), null, "two underscores");
  assert.equal(parseFileName("_food.png"), null, "no word");
  assert.equal(parseFileName("eat_.png"), null, "no category");
  assert.equal(parseFileName("eat_food"), null, "no extension");
  assert.equal(parseFileName("eat_fo@od.png"), null, "odd characters");
});

test("the file must match the material's word and category", () => {
  assert.equal(fileNameError("eat_food.png", "symbol-images", "Eat", "Food"), "");
  assert.equal(fileNameError("EAT_FOOD.PNG", "symbol-images", "Eat", "Food"), "", "capitals are fine");
  assert.equal(fileNameError("thank-you_greetings.wav", "audio-files", "Thank you", "Greetings"), "");
  assert.match(fileNameError("drink_food.png", "symbol-images", "Eat", "Food"), /eat_food\.png/, "wrong word");
  assert.match(fileNameError("eat_drinks.png", "symbol-images", "Eat", "Food"), /eat_food\.png/, "wrong category");
  assert.match(fileNameError("eat.png", "symbol-images", "Eat", "Food"), /eat_food\.png/, "no underscore");
  assert.match(fileNameError("eat_food_1.png", "symbol-images", "Eat", "Food"), /eat_food\.png/, "two underscores");
});

test("the file type must suit the bucket", () => {
  assert.equal(extensionError("eat_food.png", "symbol-images"), "");
  assert.notEqual(extensionError("eat_food.svg", "symbol-images"), "");
  assert.notEqual(extensionError("eat_food.png", "audio-files"), "");
  assert.notEqual(fileNameError("eat_food.mp3", "symbol-images", "Eat", "Food"), "");
  assert.equal(fileNameError("eat_food.mp3", "audio-files", "Eat", "Food"), "");
});
