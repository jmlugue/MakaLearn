import { NextResponse } from "next/server";
import {
  buildPromptDraftRequest,
  canDraftQuestionPrompts,
  parsePromptDraftText
} from "@/utils/activity-ai-draft";
import type { ActivityDraftResult } from "@/utils/activity-ai-draft";
import type { ActivityType, LearningItem } from "@/types";

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice"
];

type ActivityDraftRequest = {
  activityType?: ActivityType;
  learningItems?: LearningItem[];
  missingLearningItemIds?: string[];
};

type HuggingFaceChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && activityTypes.includes(value as ActivityType);
}

function sanitizeLearningItem(value: unknown): LearningItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<LearningItem>;
  if (typeof item.id !== "string" || typeof item.label !== "string") return null;

  return {
    id: item.id,
    contentType: item.contentType === "gesture" ? "gesture" : "pecs",
    label: item.label,
    categoryId: typeof item.categoryId === "string" ? item.categoryId : "",
    description: typeof item.description === "string" ? item.description : "",
    instruction: typeof item.instruction === "string" ? item.instruction : "",
    symbolImageUrl: typeof item.symbolImageUrl === "string" ? item.symbolImageUrl : undefined,
    gestureMediaUrl: typeof item.gestureMediaUrl === "string" ? item.gestureMediaUrl : undefined,
    audioUrl: typeof item.audioUrl === "string" ? item.audioUrl : undefined,
    sentenceRole: item.sentenceRole,
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
    createdBy: typeof item.createdBy === "string" ? item.createdBy : "",
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : ""
  };
}

function jsonDraft(draft: ActivityDraftResult, status = 200) {
  return NextResponse.json(draft, { status });
}

export async function POST(request: Request) {
  let body: ActivityDraftRequest;

  try {
    body = (await request.json()) as ActivityDraftRequest;
  } catch {
    return NextResponse.json({ error: "Invalid activity draft request." }, { status: 400 });
  }

  if (!isActivityType(body.activityType)) {
    return NextResponse.json({ error: "Choose a valid activity type." }, { status: 400 });
  }

  if (!canDraftQuestionPrompts(body.activityType)) {
    return jsonDraft({
      source: "local",
      note: "This activity does not need AI-generated questions.",
      suggestions: []
    });
  }

  const learningItems = Array.isArray(body.learningItems)
    ? body.learningItems.map(sanitizeLearningItem).filter((item): item is LearningItem => Boolean(item)).slice(0, 5)
    : [];

  const missingIds = new Set(
    Array.isArray(body.missingLearningItemIds)
      ? body.missingLearningItemIds.filter((id): id is string => typeof id === "string")
      : []
  );
  const missingLearningItems = learningItems.filter((item) => missingIds.has(item.id));

  if (!missingLearningItems.length) {
    return jsonDraft({
      source: "local",
      note: "Each selected item already has a question.",
      suggestions: []
    });
  }

  const token = process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
  const model = process.env.HUGGINGFACE_ACTIVITY_MODEL || "openai/gpt-oss-120b:fastest";

  if (!token) {
    return jsonDraft({
      source: "local",
      note: "AI questions are not available right now. You can type the questions instead.",
      suggestions: []
    });
  }

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You create concise, reusable classroom question prompts for early communication learning. Return JSON only."
          },
          {
            role: "user",
            content: buildPromptDraftRequest(body.activityType, missingLearningItems)
          }
        ],
        temperature: 0.4,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face returned ${response.status}`);
    }

    const completion = (await response.json()) as HuggingFaceChatCompletion;
    const content = completion.choices?.[0]?.message?.content ?? "";
    return jsonDraft(parsePromptDraftText(content, body.activityType, missingLearningItems));
  } catch (error) {
    console.error("Hugging Face activity draft failed.", error);
    return jsonDraft({
      source: "local",
      note: "AI questions are not available right now. You can type the questions instead.",
      suggestions: []
    });
  }
}
