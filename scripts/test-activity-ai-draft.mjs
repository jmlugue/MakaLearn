// Provider-independent activity-draft rules. The API route sends this prompt to Gemini,
// while this test keeps the classroom constraints and response validation deterministic.
import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const draft = loadTs("src/utils/activity-ai-draft.ts", {
  "@/utils/activity-labels": {
    activityTypeLabels: {
      "choose-correct-symbol": "Choose the picture",
      "fill-blank": "Fill in the blank"
    }
  },
  "@/utils/fill-blank-prompts": { createFillBlankPromptForLabel: () => "" },
  "@/utils/starter-learning-item-prompts": { createChooseCorrectSymbolPrompt: () => "" }
});

const material = {
  id: "custom-umbrella",
  contentType: "pecs",
  label: "Umbrella",
  categoryId: "cat-things",
  description: "Used to stay dry in rain.",
  instruction: "Choose it when someone is outside in the rain.",
  tags: ["rain", "outside"],
  createdBy: "teacher-test",
  updatedAt: "2026-09-28T00:00:00.000Z"
};

test("Gemini activity drafts use a provider-separated prompt version", () => {
  assert.equal(draft.ACTIVITY_PROMPT_TEMPLATE_VERSION, "activity-prompt-v8");
  assert.notEqual(
    draft.buildActivityPromptMaterialHash("fill-blank", [material]),
    draft.buildActivityPromptMaterialHash("fill-blank", [material], "activity-prompt-v3")
  );
});

test("the activity prompt gives Gemini strict classroom-question instructions", () => {
  const prompt = draft.buildPromptDraftRequest("fill-blank", [material]);
  assert.match(prompt, /SPED learners at Kinder to Grade 2/i);
  assert.match(prompt, /exactly one ____ blank/i);
  assert.match(prompt, /only sensible answer/i);
  assert.match(prompt, /5 to 12 words/i);
  assert.match(prompt, /untrusted teaching data/i);
  assert.match(prompt, /idioms/i);
  assert.match(prompt, /approvedSimpleExamples/);
  assert.match(prompt, /approvedSimpleExamples sentence that differs/i);
  assert.match(prompt, /Fix any failed prompt in this same response/i);
  assert.match(prompt, /The kind leader of our family/);
  assert.match(prompt, /I call my dad/);
  assert.match(prompt, /Return only valid JSON/i);
  assert.match(prompt, /custom-umbrella/);
  assert.match(prompt, /Used to stay dry in rain/);
});

test("regeneration tells Gemini which sentence must change and uses more variation", () => {
  const current = "Rain falls outside, so I carry my ____.";
  const context = { previousPromptById: { [material.id]: current } };
  const prompt = draft.buildPromptDraftRequest("fill-blank", [material], context);

  assert.match(prompt, /currentPromptToReplace/);
  assert.match(prompt, /meaningfully different everyday situation/i);
  assert.match(prompt, new RegExp(current.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(draft.activityPromptDraftTemperature(), 0.2);
  assert.equal(draft.activityPromptDraftTemperature(context), 0.5);
});

test("vague or stereotyped family-role wording is rejected", () => {
  const father = {
    ...material,
    id: "pecs-father",
    label: "Father",
    categoryId: "cat-pecs-family",
    description: "Use when identifying a father or dad.",
    sentenceRole: "subject"
  };
  const result = draft.parsePromptDraftText(
    JSON.stringify({
      prompts: [{ learningItemId: father.id, prompt: "The kind leader of our family is ____." }]
    }),
    "fill-blank",
    [father]
  );

  assert.deepEqual(result.suggestions, []);
  assert.match(result.issues[0].reasons.join(" "), /family-role stereotype/);
  assert.match(result.issues[0].reasons.join(" "), /praise word/);
});

test("a direct familiar Father sentence is accepted", () => {
  const father = {
    ...material,
    id: "pecs-father",
    label: "Father",
    categoryId: "cat-pecs-family",
    description: "Use when identifying a father or dad.",
    sentenceRole: "subject"
  };
  const result = draft.parsePromptDraftText(
    JSON.stringify({ prompts: [{ learningItemId: father.id, prompt: "I call my dad ____." }] }),
    "fill-blank",
    [father]
  );

  assert.equal(result.source, "gemini");
  assert.equal(result.suggestions[0].prompt, "I call my dad ____.");
});

test("a valid Gemini response is accepted and labelled as Gemini", () => {
  const result = draft.parsePromptDraftText(
    JSON.stringify({
      prompts: [{ learningItemId: material.id, prompt: "Rain falls outside, so I carry my ____." }]
    }),
    "fill-blank",
    [material]
  );

  assert.equal(result.source, "gemini");
  assert.deepEqual(result.suggestions, [
    {
      learningItemId: material.id,
      label: material.label,
      prompt: "Rain falls outside, so I carry my ____."
    }
  ]);
});

test("a Gemini question that reveals the answer is rejected", () => {
  const result = draft.parsePromptDraftText(
    JSON.stringify({
      prompts: [{ learningItemId: material.id, prompt: "I carry my umbrella when it rains: ____." }]
    }),
    "fill-blank",
    [material]
  );

  assert.equal(result.source, "local-fallback");
  assert.deepEqual(result.suggestions, []);
  assert.equal(result.issues[0].code, "invalid-prompt");
});

test("multi-sentence and overly short Gemini fill prompts are rejected", () => {
  const result = draft.parsePromptDraftText(
    JSON.stringify({
      prompts: [{ learningItemId: material.id, prompt: "It rains. Carry ____." }]
    }),
    "fill-blank",
    [material]
  );

  assert.deepEqual(result.suggestions, []);
  assert.ok(result.issues[0].reasons.includes("Use exactly one sentence."));
  assert.ok(result.issues[0].reasons.includes("Use 5 to 12 words."));
});

test("duplicate, missing, and unknown IDs are reported instead of accepted", () => {
  const second = { ...material, id: "custom-coat", label: "Coat" };
  const result = draft.parsePromptDraftText(
    JSON.stringify({
      prompts: [
        { learningItemId: material.id, prompt: "Rain falls outside, so I carry my ____." },
        { learningItemId: material.id, prompt: "I stay dry when I hold my ____." },
        { learningItemId: "not-requested", prompt: "This should never be used." }
      ]
    }),
    "fill-blank",
    [material, second]
  );

  assert.deepEqual(result.suggestions, []);
  assert.deepEqual(
    result.issues.map((issue) => issue.code).sort(),
    ["duplicate-output", "missing-output", "unknown-item"]
  );
});

test("semantic-conflict context rejects a question that points to another valid answer", () => {
  const rice = { ...material, id: "pecs-rice", label: "Rice", categoryId: "cat-food", sentenceRole: "object" };
  const bread = { ...material, id: "pecs-bread", label: "Bread", categoryId: "cat-food", sentenceRole: "object" };
  const result = draft.parsePromptDraftText(
    JSON.stringify({
      prompts: [{ learningItemId: rice.id, prompt: "What food do we eat at lunch?" }]
    }),
    "choose-correct-symbol",
    [rice],
    { conflictingItemsById: { [rice.id]: [bread] } }
  );

  assert.deepEqual(result.suggestions, []);
  assert.match(result.issues[0].reasons.join(" "), /Could also point to: Bread/);
});

test("a Fill sentence is kept when look-alikes exist, and rejected only when it names one", () => {
  const happy = { ...material, id: "pecs-happy", label: "Happy", categoryId: "cat-emotions", sentenceRole: "feeling" };
  const sad = { ...material, id: "pecs-sad", label: "Sad", categoryId: "cat-emotions", sentenceRole: "feeling" };
  const context = { conflictingItemsById: { [happy.id]: [sad] } };
  const kept = draft.parsePromptDraftText(
    JSON.stringify({ prompts: [{ learningItemId: happy.id, prompt: "I feel ____ when I get a gift." }] }),
    "fill-blank",
    [happy],
    context
  );
  assert.deepEqual(kept.suggestions.map((suggestion) => suggestion.prompt), ["I feel ____ when I get a gift."]);

  const named = draft.parsePromptDraftText(
    JSON.stringify({ prompts: [{ learningItemId: happy.id, prompt: "I feel ____ and not sad at my party." }] }),
    "fill-blank",
    [happy],
    context
  );
  assert.deepEqual(named.suggestions, []);
  assert.match(named.issues[0].reasons.join(" "), /Could also point to: Sad/);
});

test("valid suggestions from separate passes merge in requested order", () => {
  const second = { ...material, id: "custom-coat", label: "Coat" };
  const merged = draft.mergeActivityPromptSuggestions(
    [material, second],
    [{ learningItemId: second.id, label: second.label, prompt: "Cold rain comes, so I wear my ____." }],
    [{ learningItemId: material.id, label: material.label, prompt: "Rain falls outside, so I carry my ____." }]
  );

  assert.deepEqual(merged.map((suggestion) => suggestion.learningItemId), [material.id, second.id]);
  assert.deepEqual(draft.getUnresolvedPromptItems([material, second], merged), []);
});

test("regeneration rejects the sentence already shown in the form", () => {
  const current = "Rain falls outside, so I carry my ____.";
  const result = draft.parsePromptDraftText(
    JSON.stringify({ prompts: [{ learningItemId: material.id, prompt: current }] }),
    "fill-blank",
    [material],
    { previousPromptById: { [material.id]: current } }
  );

  assert.deepEqual(result.suggestions, []);
  assert.match(result.issues[0].reasons.join(" "), /different sentence from the current one/i);
});

test("checked bank wording silently completes a rejected model sentence", () => {
  const father = {
    ...material,
    id: "pecs-father",
    label: "Father",
    categoryId: "cat-pecs-family",
    sentenceRole: "subject"
  };
  const completed = draft.completeActivityPromptSuggestions("fill-blank", [father], []);

  assert.equal(completed.suggestions.length, 1);
  assert.match(completed.suggestions[0].prompt, /____/);
  assert.deepEqual(completed.issues, []);
  assert.deepEqual(completed.missingItems, []);
});

test("checked fallback regeneration chooses a different sentence", () => {
  const father = {
    ...material,
    id: "pecs-father",
    label: "Father",
    categoryId: "cat-pecs-family",
    sentenceRole: "subject"
  };
  const current = "I give my ____ a hug when he comes home.";
  const completed = draft.completeActivityPromptSuggestions("fill-blank", [father], [], {
    previousPromptById: { [father.id]: current }
  });

  assert.equal(completed.suggestions.length, 1);
  assert.notEqual(completed.suggestions[0].prompt, current);
  assert.deepEqual(completed.issues, []);
});

test("a genuinely unknown material gets a neutral teacher action, not a provider rejection", () => {
  const completed = draft.completeActivityPromptSuggestions("fill-blank", [material], []);

  assert.deepEqual(completed.suggestions, []);
  assert.equal(completed.issues[0].code, "needs-teacher-input");
  assert.equal(completed.issues[0].message, "Add a sentence for this material before saving.");
  assert.doesNotMatch(completed.issues[0].message, /Gemini|rejected/i);
});

test("locked sentences are never selected for AI regeneration", () => {
  const targets = draft.selectActivityPromptDraftTargets(
    ["hello", "father", "water"],
    { hello: "I say ____ when I greet someone.", father: "My own ____ sentence.", water: "I drink cold ____." },
    ["father"]
  );

  assert.deepEqual(targets, { itemIds: ["hello", "water"], regenerate: true });
  assert.deepEqual(
    draft.selectActivityPromptDraftTargets(["hello", "father"], { hello: "", father: "Keep ____ here." }, ["father"]),
    { itemIds: ["hello"], regenerate: false }
  );
  assert.deepEqual(
    draft.selectActivityPromptDraftTargets(["father"], { father: "Keep ____ here." }, ["father"]),
    { itemIds: [], regenerate: false }
  );
});
