import { parsePlaygroundDecision, playgroundGradingInstructions, type PlaygroundDecision } from "@/utils/playground-grading";

/** Existing Gemini REST integration style; no client key or generated prose is exposed. */
export async function gradePlaygroundText(text: string, apiKey: string, model: string): Promise<PlaygroundDecision> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: playgroundGradingInstructions }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify({ text }) }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
        responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: {
          type: "object", additionalProperties: false,
          properties: { valid: { type: "boolean" }, type: { type: ["string", "null"], enum: ["word", "phrase", "sentence", null] } },
          required: ["valid", "type"]
        } } }
      }
    })
  });
  if (!response.ok) throw new Error("Playground provider unavailable");
  const completion = await response.json();
  const candidate = completion.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw new Error("Incomplete Playground decision");
  const textResult = candidate.content?.parts?.filter((part: { thought?: boolean }) => !part.thought)
    .map((part: { text?: string }) => part.text ?? "").join("");
  const decision = parsePlaygroundDecision(JSON.parse(textResult || "null"), text);
  if (!decision) throw new Error("Invalid Playground decision");
  return decision;
}
