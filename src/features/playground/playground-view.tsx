"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  GripVertical,
  Library,
  MessageSquareText,
  RotateCcw,
  Search,
  Volume2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import { learningItems as mockLearningItems } from "@/data/mock-data";
import {
  normalizePecsLabel,
  pecsCardCategories,
  pecsCardManifest,
  type PecsCardCategory,
  type PecsManifestCard
} from "@/data/pecs-card-manifest";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { validatePecsSentence, type PecsSentenceValidationResult } from "@/utils/pecs-sentence-validation";
import type { LearningItem, SentenceRole } from "@/types";

type PlaygroundCard = PecsManifestCard & {
  id: string;
  learningItemId?: string;
  audioUrl?: string;
  imageUrl: string;
};

const CONTENT_LIBRARY_STORAGE_KEY = "makalearn-content-library";
const allCategoriesLabel = "All cards";
const filterCategories: Array<PecsCardCategory | typeof allCategoriesLabel> = [
  allCategoriesLabel,
  ...pecsCardCategories
];

type LocalContentLibraryState = {
  items: LearningItem[];
};

function readLocalContentLibrary(): LocalContentLibraryState | null {
  if (typeof window === "undefined" || isSupabaseConfigured()) return null;

  try {
    const value = window.localStorage.getItem(CONTENT_LIBRARY_STORAGE_KEY);
    return value ? (JSON.parse(value) as LocalContentLibraryState) : null;
  } catch {
    return null;
  }
}

function getPecsItems(items: LearningItem[]) {
  return items.filter((item) => item.contentType === "pecs");
}

function buildPlaygroundCards(items: LearningItem[]) {
  const itemByLabel = new Map(getPecsItems(items).map((item) => [normalizePecsLabel(item.label), item]));

  return pecsCardManifest.map((card) => {
    const matchingItem = itemByLabel.get(normalizePecsLabel(card.label));
    const itemAudioUrl = matchingItem?.audioUrl;

    return {
      ...card,
      id: matchingItem?.id ?? `manifest-${card.filename.replace(/\.png$/i, "")}`,
      learningItemId: matchingItem?.id,
      sentenceRole: matchingItem?.sentenceRole ?? card.sentenceRole,
      audioUrl: itemAudioUrl && isEmbeddableMediaUrl(itemAudioUrl) ? itemAudioUrl : card.audioPath,
      imageUrl: matchingItem?.symbolImageUrl && isEmbeddableMediaUrl(matchingItem.symbolImageUrl)
        ? matchingItem.symbolImageUrl
        : card.imagePath
    };
  });
}

function isEmbeddableMediaUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
}

function getRoleLabel(role: SentenceRole) {
  return role.replace("_", " ");
}

function canUseAudioUrl(value?: string) {
  return Boolean(value && isEmbeddableMediaUrl(value));
}

function getFeedbackTitle(result: PecsSentenceValidationResult) {
  if (result.isValid) return result.patternName ?? "Sentence ready";
  if (/^try again/i.test(result.feedback)) return "Check the card order";
  return "Needs a change";
}

function getFeedbackMessage(result: PecsSentenceValidationResult) {
  if (result.isValid) return result.feedback;

  const message = result.feedback.replace(/^try again\.?\s*/i, "").trim();
  return message || "Check the sentence and try another card order.";
}

export function PlaygroundView() {
  const { notify } = useToast();
  const [learningItems, setLearningItems] = useState<LearningItem[]>(mockLearningItems);
  const [ready, setReady] = useState(!isSupabaseConfigured());
  const [activeCategory, setActiveCategory] = useState<PecsCardCategory | typeof allCategoriesLabel>(allCategoriesLabel);
  const [search, setSearch] = useState("");
  const [sentenceCards, setSentenceCards] = useState<PlaygroundCard[]>([]);
  const [draggedLibraryCardId, setDraggedLibraryCardId] = useState("");
  const [draggedSentenceIndex, setDraggedSentenceIndex] = useState<number | null>(null);
  const [result, setResult] = useState<PecsSentenceValidationResult | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [toolbarReady, setToolbarReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCards() {
      if (!isSupabaseConfigured()) {
        const localContent = readLocalContentLibrary();
        if (!active) return;
        setLearningItems(localContent?.items?.length ? localContent.items : mockLearningItems);
        setReady(true);
        return;
      }

      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        setLearningItems(data.learningItems.length ? data.learningItems : mockLearningItems);
        setReady(true);
      } catch (error) {
        if (!active) return;
        setReady(true);
        notify({
          title: "PECS cards ready",
          description: "Saved PECS cards are available in this workspace."
        });
      }
    }

    loadCards();

    return () => {
      active = false;
    };
  }, [notify]);

  useEffect(() => {
    setToolbarReady(true);
  }, []);

  const cards = useMemo(() => buildPlaygroundCards(learningItems), [learningItems]);
  const approvedCardIds = useMemo(() => new Set(cards.map((card) => card.id)), [cards]);
  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cards.filter((card) => {
      const categoryMatches = activeCategory === allCategoriesLabel || card.category === activeCategory;
      const queryMatches =
        !query ||
        [card.label, card.category, getRoleLabel(card.sentenceRole)]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, cards, search]);

  function addCard(card: PlaygroundCard) {
    setSentenceCards((current) => (current.length >= 5 ? current : [...current, card]));
    setResult(null);
  }

  function removeCard(index: number) {
    setSentenceCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
    setResult(null);
  }

  function moveCard(fromIndex: number, toIndex: number) {
    setSentenceCards((current) => {
      if (toIndex < 0 || toIndex >= current.length) return current;
      const next = [...current];
      const [card] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, card);
      return next;
    });
    setResult(null);
  }

  function handleSentenceDrop(event: DragEvent<HTMLDivElement>, targetIndex?: number) {
    event.preventDefault();

    if (draggedSentenceIndex !== null && targetIndex !== undefined) {
      moveCard(draggedSentenceIndex, targetIndex);
      setDraggedSentenceIndex(null);
      return;
    }

    if (!draggedLibraryCardId) return;
    const card = cards.find((candidate) => candidate.id === draggedLibraryCardId);
    if (card) addCard(card);
    setDraggedLibraryCardId("");
  }

  function checkSentence() {
    const nextResult = validatePecsSentence(sentenceCards, approvedCardIds);
    setResult(nextResult);
    notify({
      title: nextResult.isValid ? nextResult.patternName ?? "Sentence ready" : "Sentence needs a change",
      description: nextResult.feedback,
      tone: nextResult.isValid ? "success" : "info"
    });
  }

  async function speakSentence() {
    if (!sentenceCards.length || speaking) return;

    setSpeaking(true);
    try {
      for (const card of sentenceCards) {
        if (canUseAudioUrl(card.audioUrl)) {
          await playAudio(card.audioUrl as string);
        } else if ("speechSynthesis" in window) {
          await speakText(card.label);
        }
      }
    } finally {
      setSpeaking(false);
    }
  }

  function resetSentence() {
    setSentenceCards([]);
    setResult(null);
  }

  const dropZoneClass = `min-h-32 rounded-xl border-2 border-dashed p-2 transition-colors sm:min-h-36 sm:p-3 ${
    sentenceCards.length ? "border-blue-200 bg-[#f8fbff]" : "border-blue-200 bg-skywash"
  }`;
  const emptyDropZoneClass = "grid min-h-28 place-items-center rounded-lg bg-white/55 p-4 text-center";

  return (
    <>
      {toolbarReady && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed bottom-24 left-0 right-0 top-0 z-40 px-3 py-2 md:px-6 lg:bottom-0 lg:left-72 lg:px-8 lg:py-4">
              <div className="mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-blue-100 bg-white/95 shadow-[0_16px_44px_rgba(37,99,235,0.16)] backdrop-blur-2xl">
                <div className="border-b border-blue-100 bg-white/90 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Build your sentence here</CardTitle>
                      <CardDescription>Drop up to five cards. Selected cards fill this workspace from left to right.</CardDescription>
                    </div>
                    <Badge className="bg-white text-slate-700">{sentenceCards.length}/5</Badge>
                  </div>

                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleSentenceDrop}
                    className={`${dropZoneClass} mt-3`}
                  >
                    {sentenceCards.length ? (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {sentenceCards.map((card, index) => (
                          <div
                            key={`${card.id}-${index}`}
                            draggable
                            onDragStart={() => setDraggedSentenceIndex(index)}
                            onDragEnd={() => setDraggedSentenceIndex(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleSentenceDrop(event, index)}
                            className="flex w-36 shrink-0 flex-col rounded-lg border border-blue-100 bg-white p-2 shadow-sm sm:w-40"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                <GripVertical className="h-4 w-4" aria-hidden="true" />
                                {index + 1}
                              </span>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${card.label}`} onClick={() => removeCard(index)}>
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                            <div className="grid h-28 w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white sm:h-32">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={card.imageUrl} alt={`${card.label} selected card`} className="h-full w-full object-contain" />
                            </div>
                            <div className="mt-2">
                              <span className="block truncate text-sm font-bold text-ink">{card.label}</span>
                              <Badge className="mt-1 bg-emerald-50 text-emerald-700">{getRoleLabel(card.sentenceRole)}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={emptyDropZoneClass}>
                        <div>
                          <MessageSquareText className="mx-auto h-7 w-7 text-blue-600" aria-hidden="true" />
                          <p className="mt-2 text-base font-bold text-ink">Drop cards here</p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">You can also tap a card in the library below to add it.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className={`rounded-xl border p-3 shadow-sm ${result ? (result.isValid ? "border-emerald-200 bg-emerald-50/90" : "border-amber-200 bg-amber-50/90") : "border-blue-100 bg-white/75"}`}>
                      {result ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${result.isValid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {result.isValid ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <RotateCcw className="h-5 w-5" aria-hidden="true" />}
                            </span>
                            <div>
                              <p className={`text-lg font-bold ${result.isValid ? "text-emerald-800" : "text-amber-900"}`}>
                                {getFeedbackTitle(result)}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">{getFeedbackMessage(result)}</p>
                            </div>
                          </div>
                          {result.generatedSentence ? (
                            <p className="rounded-lg border border-white/80 bg-white/75 p-3 text-sm font-bold text-ink">
                              {result.generatedSentence}
                            </p>
                          ) : null}
                          {result.suggestion ? <p className="text-sm leading-6 text-slate-700">{result.suggestion}</p> : null}
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-lg font-bold text-ink">Sentence feedback</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">Build a sentence and check it when the learner is ready.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <CardFooter className="mt-0 flex flex-col gap-2 border-t-0 pt-0 sm:flex-row lg:justify-end">
                      <Button type="button" className="min-h-10" onClick={checkSentence}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Check Sentence
                      </Button>
                      <Button type="button" variant="secondary" className="min-h-10" onClick={speakSentence} disabled={!sentenceCards.length || speaking}>
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                        {speaking ? "Speaking..." : "Speak Sentence"}
                      </Button>
                      <Button type="button" variant="outline" className="min-h-10" onClick={resetSentence}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Reset
                      </Button>
                    </CardFooter>
                  </div>
                </div>

                <div className="grid min-h-0 gap-3 bg-[#f8fbff] p-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
                  <aside className="flex min-h-0 flex-col rounded-xl border border-blue-100 bg-white/80 p-3 shadow-sm">
                    <div className="shrink-0">
                      <p className="text-sm font-bold text-ink">Categories</p>
                      <p className="mt-1 hidden text-xs leading-5 text-slate-500 lg:block">Choose a card group.</p>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
                      {filterCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(category)}
                          className={`min-h-11 shrink-0 rounded-xl border px-4 text-left text-sm font-bold transition lg:w-full ${
                            activeCategory === category
                              ? "border-blue-500 bg-blue-600 text-white shadow-soft"
                              : "border-blue-100 bg-white/70 text-slate-700 hover:border-blue-300 hover:bg-white"
                          }`}
                          aria-pressed={activeCategory === category}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </aside>

                  <div className="flex min-h-0 flex-col rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
                    <div className="shrink-0 border-b border-blue-50 pb-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <CardTitle>PECS/AAC card library</CardTitle>
                          <CardDescription>Use the approved classroom card set. Category and role labels stay outside the images.</CardDescription>
                        </div>
                        <div className="w-full lg:max-w-sm">
                          <Label htmlFor="playground-search">Search cards</Label>
                          <div className="relative mt-1">
                            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                            <Input
                              id="playground-search"
                              value={search}
                              onChange={(event) => setSearch(event.target.value)}
                              className="pl-10"
                              placeholder="Search word, category, or role"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto pt-3">
                      {!ready ? (
                        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-blue-100 bg-[#f8fbff] text-sm font-semibold text-slate-600">
                          Loading PECS cards...
                        </div>
                      ) : filteredCards.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                          {filteredCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              draggable
                              onClick={() => addCard(card)}
                              onDragStart={() => setDraggedLibraryCardId(card.id)}
                              onDragEnd={() => setDraggedLibraryCardId("")}
                              className="group flex min-h-[23rem] flex-col rounded-lg border border-blue-100 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-blue-100"
                            >
                              <span className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                {/* Provided PECS/AAC card images are used unchanged from public/pecs. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={card.imageUrl} alt={`${card.label} PECS card`} className="h-full w-full object-contain" />
                              </span>
                              <span className="mt-3 flex flex-wrap gap-2">
                                <Badge>{card.category}</Badge>
                                <Badge className="bg-emerald-50 text-emerald-700">{getRoleLabel(card.sentenceRole)}</Badge>
                              </span>
                              <span className="mt-auto pt-3 text-sm font-bold text-blue-700">Add to sentence</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon={Library} title="No cards found" description="Try another category or search word." />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function playAudio(url: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function speakText(text: string) {
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
