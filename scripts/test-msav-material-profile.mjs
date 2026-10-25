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
const { buildMsavClassificationPrompt, getPlaygroundAvailability, isBuiltInMsavLabel, isPlaygroundReady, parseMsavMaterialProfile } = profileModule;

test("existing manifest cards are ready without an AI profile", () => {
  assert.equal(isBuiltInMsavLabel(" Water "), true);
  const water = { contentType: "pecs", label: "Water", symbolImageUrl: "https://example.test/water.png" };
  assert.equal(getPlaygroundAvailability(water), "ready");
  assert.equal(isPlaygroundReady(water), true);
});

test("new cards stay hidden until a checked profile is ready", () => {
  const pending = { contentType: "pecs", label: "Juice", playgroundPreparationStatus: "pending" };
  assert.equal(isPlaygroundReady(pending), false);

  const profile = parseMsavMaterialProfile({
    roles: ["object"],
    traits: ["requestable", "drinkable", "more_target", "postpositive_please"]
  });
  assert.ok(profile);
  const prepared = { ...pending, playgroundPreparationStatus: "ready", msavProfile: profile };
  assert.equal(getPlaygroundAvailability(prepared), "missing-image");
  assert.equal(isPlaygroundReady(prepared), false);
  assert.equal(isPlaygroundReady({ ...prepared, symbolImageUrl: "https://example.test/juice.png" }), true);
});

test("the shared readiness reason identifies missing or unusable card artwork", () => {
  assert.equal(getPlaygroundAvailability({ contentType: "pecs", label: "Water" }), "missing-image");
  assert.equal(getPlaygroundAvailability({ contentType: "pecs", label: "Water", symbolImageUrl: "blob:preview" }), "missing-image");
  assert.equal(
    getPlaygroundAvailability({ contentType: "pecs", label: "Water", symbolImageUrl: "https://example.test/water.png" }),
    "ready"
  );
});

test("profile parsing rejects invented values and contradictory predicate metadata", () => {
  assert.equal(parseMsavMaterialProfile({ roles: ["made_up"], traits: [] }), null);
  assert.equal(parseMsavMaterialProfile({ roles: ["object"], traits: [], predicateKind: "drink" }), null);
  assert.equal(parseMsavMaterialProfile({ roles: ["subject"], traits: ["base_subject"], beVerbForm: "are" })?.schemaVersion, 1);
});

test("new preparations require valid standalone classifications while legacy profiles remain readable", () => {
  const legacy = { roles: ["object"], traits: ["requestable"] };
  assert.ok(parseMsavMaterialProfile(legacy));
  assert.equal(parseMsavMaterialProfile(legacy, "Apple"), null);
  for (const [label, singleCardType] of [["Apple", "word"], ["Red apple", "phrase"], ["I am happy", "sentence"]]) {
    const profile = parseMsavMaterialProfile({ ...legacy, singleCardType }, label);
    assert.equal(profile?.singleCardType, singleCardType, label);
    assert.deepEqual(parseMsavMaterialProfile(JSON.parse(JSON.stringify(profile))), profile);
  }
  for (const [label, singleCardType] of [
    ["Apple", "sentence"], ["Apple", "phrase"], ["Red apple", "word"], ["Apple", "expression"], ["", "word"], ["Apple", null],
    ["Red apple", ["phrase"]], ["Red apple", { singleCardType: "phrase" }]
  ]) {
    assert.equal(parseMsavMaterialProfile({ ...legacy, singleCardType }, label), null, `${label}: ${singleCardType}`);
  }
});

test("Gemini is asked for structured standalone types rather than feedback prose", () => {
  const prompt = buildMsavClassificationPrompt({ id: "new", label: "Help", description: "Ask for assistance.", instruction: "", tags: [] }, "Daily Needs");
  assert.match(prompt, /singleCardType.*required/);
  assert.match(prompt, /word for every one-word label/);
  assert.match(prompt, /phrase for multi-word labels/);
  assert.match(prompt, /sentence only for a multi-word label/);
  assert.match(prompt, /never learner-facing feedback prose/);
});

test("preparation saves checked standalone metadata and rejects incomplete or contradictory Gemini output", async () => {
  const routeSource = fs.readFileSync("src/app/api/playground-prepare/route.ts", "utf8");
  const routeCode = ts.transpileModule(routeSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  for (const [label, singleCardType, expectedStatus] of [
    ["Apple", "word", 200], ["Red apple", "phrase", 200], ["I am happy", "sentence", 200],
    ["Apple", undefined, 502], ["Apple", "sentence", 502], ["Red apple", ["phrase"], 502]
  ]) {
    const updates = [];
    const item = { id: "new", content_type: "pecs", label, tags: [], category_id: "category" };
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "teacher" } } }) },
      from(table) {
        const record = table === "profiles" ? { role: "teacher", status: "active" } : table === "categories" ? { name: "Daily Needs" } : item;
        return {
          select() { return this; }, eq() { return this; }, or() { return this; },
          single: async () => ({ data: record }), maybeSingle: async () => ({ data: record }),
          update(value) { updates.push(value); return this; },
          insert: async () => ({ error: null })
        };
      }
    };
    const route = {};
    const dependencies = (specifier) => {
      if (specifier === "next/server") return { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } };
      if (specifier === "@/lib/supabase/server") return { createSupabaseServerClient: () => supabase };
      if (specifier === "@/utils/msav-material-profile") return profileModule;
      throw new Error(`Unexpected import: ${specifier}`);
    };
    const fetchGemini = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        status: "supported", profile: { roles: ["object"], traits: [], ...(singleCardType !== undefined ? { singleCardType } : {}) }
      }) }] } }] })
    });
    // Use the real route with isolated provider/database stubs: no key, network call, or saved test row.
    new Function("exports", "require", "process", "fetch", routeCode)(route, dependencies, { env: { GEMINI_MSAV_API_KEY: "test-only" } }, fetchGemini);
    const result = await route.POST({ json: async () => ({ learningItemId: "new" }) });
    assert.equal(result.status, expectedStatus, `${label}: ${singleCardType}`);
    const saved = updates.find((value) => value.playground_preparation_status === "ready");
    if (expectedStatus === 200) {
      assert.equal(saved?.msav_profile.singleCardType, singleCardType);
      assert.equal(result.body.profile.singleCardType, singleCardType);
    } else {
      assert.equal(saved, undefined);
      assert.equal(updates.at(-1).playground_preparation_error, "invalid_model_response");
    }
  }
});
