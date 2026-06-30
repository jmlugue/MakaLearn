"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  GripVertical,
  Library,
  MessageSquareText,
  RotateCcw,
  Shuffle,
  Volume2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
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
import type { LearningItem } from "@/types";

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

function buildPlaygroundCards(items: LearningItem[]): PlaygroundCard[] {
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

function canUseAudioUrl(value?: string) {
  return Boolean(value && isEmbeddableMediaUrl(value));
}

function getFeedbackTitle(result: PecsSentenceValidationResult) {
  return result.isValid ? "Good job" : "Try again";
}

function getFeedbackMessage(result: PecsSentenceValidationResult) {
  return result.feedback;
}

function shuffleValues<T>(values: T[]) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function PlaygroundView() {
  const { notify } = useToast();
  const { isStudentMode } = useStudentMode();
  const [learningItems, setLearningItems] = useState<LearningItem[]>(mockLearningItems);
  const [ready, setReady] = useState(!isSupabaseConfigured());
  const [activeCategory, setActiveCategory] = useState<PecsCardCategory | typeof allCategoriesLabel>(allCategoriesLabel);
  const [cardOrderIds, setCardOrderIds] = useState<string[]>([]);
  const [sentenceCards, setSentenceCards] = useState<PlaygroundCard[]>([]);
  const [draggedLibraryCardId, setDraggedLibraryCardId] = useState("");
  const [draggedSentenceIndex, setDraggedSentenceIndex] = useState<number | null>(null);
  const [result, setResult] = useState<PecsSentenceValidationResult | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
  const orderedCards = useMemo(() => {
    const cardById = new Map(cards.map((card) => [card.id, card]));
    const ordered: PlaygroundCard[] = [];

    for (const id of cardOrderIds) {
      const card = cardById.get(id);
      if (card) ordered.push(card);
    }

    const orderedIds = new Set(ordered.map((card) => card.id));
    const missingCards = cards.filter((card) => !orderedIds.has(card.id));

    return [...ordered, ...missingCards];
  }, [cardOrderIds, cards]);
  const filteredCards = useMemo(() => {
    return activeCategory === allCategoriesLabel
      ? orderedCards
      : orderedCards.filter((card) => card.category === activeCategory);
  }, [activeCategory, orderedCards]);

  useEffect(() => {
    setCardOrderIds(cards.map((card) => card.id));
  }, [cards]);

  function addCard(card: PlaygroundCard) {
    setSentenceCards((current) => (current.length >= 5 ? current : [...current, card]));
    setResult(null);
    setShowSuccessModal(false);
  }

  function removeCard(index: number) {
    setSentenceCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
    setResult(null);
    setShowSuccessModal(false);
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
    setShowSuccessModal(false);
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

    if (nextResult.isValid) {
      setShowSuccessModal(true);
      return;
    }

    notify({
      title: getFeedbackTitle(nextResult),
      description: nextResult.feedback,
      tone: "info"
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
    setShowSuccessModal(false);
  }

  function mixUpCards() {
    setCardOrderIds((current) => {
      const sourceIds = current.length === cards.length ? current : cards.map((card) => card.id);
      return shuffleValues(sourceIds);
    });
  }

  const dropZoneClass = `min-h-32 rounded-xl border-2 border-dashed p-2 transition-colors sm:min-h-36 sm:p-3 ${
    sentenceCards.length ? "border-blue-200 bg-[#f8fbff]" : "border-blue-200 bg-skywash"
  }`;
  const emptyDropZoneClass = "grid min-h-28 place-items-center rounded-lg bg-white/55 p-4 text-center";

  return (
    <>
      {toolbarReady && typeof document !== "undefined"
        ? createPortal(
            <div className={isStudentMode ? "fixed inset-0 z-40 px-2 py-2 sm:px-3 lg:px-4" : "fixed bottom-24 left-0 right-0 top-0 z-40 px-3 py-2 md:px-6 lg:bottom-0 lg:left-72 lg:px-8 lg:py-4"}>
              <div className={`mx-auto grid h-full overflow-hidden rounded-2xl border border-blue-100 bg-white/95 shadow-[0_16px_44px_rgba(37,99,235,0.16)] backdrop-blur-2xl ${
                isStudentMode
                  ? "max-w-none grid-rows-[minmax(0,1fr)_minmax(20rem,0.78fr)] lg:grid-cols-[minmax(0,1.22fr)_minmax(24rem,0.78fr)] lg:grid-rows-1"
                  : "max-w-7xl grid-rows-[minmax(0,1fr)_minmax(22rem,0.9fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:grid-rows-1"
              }`}>
                <section className={`flex min-h-0 flex-col bg-[#f8fbff] ${isStudentMode ? "p-3 sm:p-4 lg:p-5" : "p-3 sm:p-4"}`}>
                  <div className="shrink-0 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-ink">Categories</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {filterCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setActiveCategory(category)}
                            className={`inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3 text-sm font-bold transition ${
                              activeCategory === category
                                ? "border-blue-500 bg-blue-600 text-white shadow-soft"
                                : "border-blue-100 bg-white text-slate-700 hover:border-blue-300 hover:bg-skywash"
                            }`}
                            aria-pressed={activeCategory === category}
                          >
                            {category}
                          </button>
                        ))}
                        <Button type="button" className="min-h-10 shrink-0" onClick={mixUpCards}>
                          <Shuffle className="h-4 w-4" aria-hidden="true" />
                          Mix Up
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-blue-100 bg-white shadow-sm clean-scrollbar ${isStudentMode ? "p-4" : "p-3"}`}>
                      {!ready ? (
                        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-blue-100 bg-[#f8fbff] text-sm font-semibold text-slate-600">
                          Loading PECS cards...
                        </div>
                      ) : filteredCards.length ? (
                        <div className={`grid ${isStudentMode ? "gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"}`}>
                          {filteredCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              draggable
                              onClick={() => addCard(card)}
                              onDragStart={() => setDraggedLibraryCardId(card.id)}
                              onDragEnd={() => setDraggedLibraryCardId("")}
                              aria-label={`Add ${card.label} to sentence`}
                              className={`group rounded-lg border border-blue-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-blue-100 ${isStudentMode ? "p-3" : "p-2"}`}
                            >
                              <span className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                {/* Provided PECS/AAC card images are used unchanged from public/pecs. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={card.imageUrl} alt={`${card.label} PECS card`} className="h-full w-full object-contain" />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon={Library} title="No cards found" description="Try another category." />
                      )}
                  </div>
                </section>

                <section className={`flex min-h-0 flex-col border-t border-blue-100 bg-white lg:border-l lg:border-t-0 ${isStudentMode ? "p-3 sm:p-4 lg:p-5" : "p-3 sm:p-4"}`}>
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleSentenceDrop}
                    className={`${dropZoneClass} min-h-0 flex-1 overflow-y-auto clean-scrollbar`}
                  >
                    {sentenceCards.length ? (
                      <div className={`grid ${isStudentMode ? "gap-3 sm:grid-cols-2 xl:grid-cols-2" : "gap-2 sm:grid-cols-2 xl:grid-cols-3"}`}>
                        {sentenceCards.map((card, index) => (
                          <div
                            key={`${card.id}-${index}`}
                            draggable
                            onDragStart={() => setDraggedSentenceIndex(index)}
                            onDragEnd={() => setDraggedSentenceIndex(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleSentenceDrop(event, index)}
                            className={`flex min-w-0 flex-col rounded-lg border border-blue-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-soft ${isStudentMode ? "p-3" : "p-2"}`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                <GripVertical className="h-4 w-4" aria-hidden="true" />
                                {index + 1}
                              </span>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${card.label}`} onClick={() => removeCard(index)}>
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                            <div className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={card.imageUrl} alt={`${card.label} selected card`} className="h-full w-full object-contain" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={emptyDropZoneClass}>
                        <div>
                          <MessageSquareText className="mx-auto h-7 w-7 text-blue-600" aria-hidden="true" />
                          <p className="mt-2 text-base font-bold text-ink">Drop cards here</p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">You can also tap a card in the library to add it.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid shrink-0 gap-3">
                    <div className={`rounded-xl border p-3 shadow-sm ${result ? (result.isValid ? "border-emerald-200 bg-emerald-50/90" : "border-amber-200 bg-amber-50/90") : "border-blue-100 bg-[#f8fbff]"}`}>
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

                    <CardFooter className="mt-0 grid gap-2 border-t-0 pt-0 sm:grid-cols-3">
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
                </section>
                {showSuccessModal ? (
                  <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="playground-success-title"
                      className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-[0_24px_80px_rgba(16,185,129,0.28)] clean-scrollbar sm:p-6"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                      </div>
                      <h2 id="playground-success-title" className="mt-4 text-4xl font-black tracking-wide text-emerald-600 sm:text-5xl">
                        GOOD WORK
                      </h2>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {sentenceCards.map((card, index) => (
                          <div key={`success-${card.id}-${index}`} className="rounded-lg border border-blue-100 bg-white p-2 shadow-sm">
                            <div className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={card.imageUrl} alt={`${card.label} correct sentence card`} className="h-full w-full object-contain" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button type="button" className="mt-6 min-h-12 px-6" onClick={() => setShowSuccessModal(false)}>
                        PLAY AGAIN
                      </Button>
                    </div>
                  </div>
                ) : null}
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
