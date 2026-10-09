import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("src/utils/msav-material-profile.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const manifest = JSON.parse(fs.readFileSync("public/pecs/pecs_arasaac_manifest.json", "utf8"));
const profileModule = {};
const requireStub = (specifier) => {
  if (specifier === "@/data/pecs-card-manifest") {
    return {
      pecsCardManifest: manifest.map((card) => ({ ...card, sentenceRole: card.sentence_role })),
      normalizePecsLabel: (label) => label.trim().toLowerCase().replace(/\s+/g, " ")
    };
  }
  throw new Error(`Unexpected import: ${specifier}`);
};
new Function("exports", "require", compiled)(profileModule, requireStub);
const { isBuiltInMsavLabel, isPlaygroundReady, parseMsavMaterialProfile } = profileModule;

test("existing manifest cards are ready without an AI profile", () => {
  assert.equal(isBuiltInMsavLabel(" Water "), true);
  assert.equal(isPlaygroundReady({ contentType: "pecs", label: "Water" }), true);
});

test("new cards stay hidden until a checked profile is ready", () => {
  const pending = { contentType: "pecs", label: "Juice", playgroundPreparationStatus: "pending" };
  assert.equal(isPlaygroundReady(pending), false);

  const profile = parseMsavMaterialProfile({
    roles: ["object"],
    traits: ["requestable", "drinkable", "more_target", "postpositive_please"]
  });
  assert.ok(profile);
  assert.equal(isPlaygroundReady({ ...pending, playgroundPreparationStatus: "ready", msavProfile: profile }), true);
});

test("profile parsing rejects invented values and contradictory predicate metadata", () => {
  assert.equal(parseMsavMaterialProfile({ roles: ["made_up"], traits: [] }), null);
  assert.equal(parseMsavMaterialProfile({ roles: ["object"], traits: [], predicateKind: "drink" }), null);
  assert.equal(parseMsavMaterialProfile({ roles: ["subject"], traits: ["base_subject"], beVerbForm: "are" })?.schemaVersion, 1);
});
