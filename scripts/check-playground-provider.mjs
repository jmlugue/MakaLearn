// Opt-in live grading check. Uses only the dedicated Playground key and does not
// seed or overwrite the permanent decision cache.
import nextEnv from "@next/env";
import { loadTs } from "./load-ts.mjs";
nextEnv.loadEnvConfig(process.cwd());
const key = process.env.GEMINI_PLAYGROUND_API_KEY?.trim();
if (!key) {
  console.log("Live Playground check skipped: GEMINI_PLAYGROUND_API_KEY is unset.");
  process.exit(0);
}
const { gradePlaygroundText } = loadTs("src/lib/playground-provider.ts");
const model = process.env.GEMINI_PLAYGROUND_MODEL?.trim() || "gemini-3.5-flash-lite";
const cases = [
  ["Water", true, "word"], ["More water", true, "phrase"],
  ["I am sorry", true, "sentence"], ["I am a friend", true, "sentence"],
  ["I am a teacher", true, "sentence"], ["You are a teacher", true, "sentence"],
  ["I are a friend", false, null], ["I am an friend", false, null],
  ["You are teacher", false, null], ["You am a teacher", false, null],
  ["I want hot water", true, "sentence"], ["I want hot food", true, "sentence"],
  ["I want water please", true, "sentence"], ["I want rice please", true, "sentence"],
  ["Are you happy", true, "sentence"], ["The water is hot", true, "sentence"],
  ["An angry teacher", true, "phrase"], ["A angry teacher", false, null],
  ["I want to eat", true, "sentence"], ["I want eat", false, null],
  ["Food and water", true, "phrase"], ["I am not happy", true, "sentence"],
  ["Water want I", false, null], ["I am banana", false, null]
];
let failures = 0;
for (const [text, valid, type] of cases) {
  try {
    const actual = await gradePlaygroundText(text, key, model);
    const pass = actual.valid === valid && actual.type === type;
    if (!pass) failures += 1;
    console.log(JSON.stringify({ text, pass, actual }));
  } catch {
    failures += 1;
    console.log(JSON.stringify({ text, pass: false, error: "Provider check failed; credentials and provider details are not printed." }));
    break;
  }
}
if (failures) process.exitCode = 1;
