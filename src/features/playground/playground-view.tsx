"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Apple,
  CheckCircle2,
  Hand,
  Heart,
  LayoutGrid,
  Library,
  RotateCcw,
  School,
  ShieldAlert,
  Shuffle,
  Smile,
  Star,
  Sun,
  Volume2,
  X,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import {
  normalizePecsLabel,
  pecsCardCategories,
  pecsCardManifest,
  type PecsCardCategory,
  type PecsManifestCard
} from "@/data/pecs-card-manifest";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { placeLibraryItem, swapBoardItems } from "@/utils/playground-board";
import { validatePecsSentence, type PecsSentenceValidationResult } from "@/utils/pecs-sentence-validation";
import { ensurePecsManifestItems } from "@/utils/pecs-content-library";
import { normalizeLearningSpeechText } from "@/utils/speech-text";
import type { LearningItem } from "@/types";

type PlaygroundCard = PecsManifestCard & {
  id: string;
  learningItemId?: string;
  audioUrl?: string;
  imageUrl: string;
};

const allCategoriesLabel = "All cards";
const maxSentenceCards = 5;

// Student mode is for children, so each category gets its own color and icon to find it by.
// Full class strings are kept literal so Tailwind keeps them.
const categoryStyles: Record<PecsCardCategory | typeof allCategoriesLabel, { icon: LucideIcon; idle: string; active: string }> = {
  "All cards": {
    icon: LayoutGrid,
    idle: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
    active: "border-blue-600 bg-blue-600 text-white"
  },
  Greetings: {
    icon: Hand,
    idle: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    active: "border-amber-400 bg-amber-400 text-amber-950"
  },
  Emotions: {
    icon: Smile,
    idle: "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100",
    active: "border-pink-600 bg-pink-600 text-white"
  },
  Family: {
    icon: Heart,
    idle: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    active: "border-violet-600 bg-violet-600 text-white"
  },
  Food: {
    icon: Apple,
    idle: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100",
    active: "border-orange-400 bg-orange-400 text-orange-950"
  },
  "Classroom Commands": {
    icon: School,
    idle: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100",
    active: "border-teal-600 bg-teal-600 text-white"
  },
  "Daily Needs": {
    icon: Sun,
    idle: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    active: "border-emerald-600 bg-emerald-600 text-white"
  },
  "Safety Words": {
    icon: ShieldAlert,
    idle: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
    active: "border-red-600 bg-red-600 text-white"
  }
};
// Each board slot is a fifth of the board wide, but never taller than the board allows.
const slotStyle = { width: "min(calc((100cqw - 3rem) / 5), calc(100cqh * 0.7))" };
const filterCategories: Array<PecsCardCategory | typeof allCategoriesLabel> = [
  allCategoriesLabel,
  ...pecsCardCategories
];

function getPecsItems(items: LearningItem[]) {
  return items.filter((item) => item.contentType === "pecs");
}

function buildPlaygroundCards(items: LearningItem[]): PlaygroundCard[] {
  const manifestByLabel = new Map(pecsCardManifest.map((card) => [normalizePecsLabel(card.label), card]));

  return getPecsItems(ensurePecsManifestItems(items))
    .flatMap((item) => {
      if (!item.symbolImageUrl || !isEmbeddableMediaUrl(item.symbolImageUrl)) return [];

      const manifestCard = manifestByLabel.get(normalizePecsLabel(item.label));

      return [{
        filename: manifestCard?.filename ?? `${item.id}.png`,
        label: item.label,
        category: manifestCard?.category ?? "Daily Needs",
        sentenceRole: item.sentenceRole ?? manifestCard?.sentenceRole ?? "object",
        id: item.id,
        learningItemId: item.id,
        audioUrl: item.audioUrl && isEmbeddableMediaUrl(item.audioUrl) ? item.audioUrl : undefined,
        imageUrl: item.symbolImageUrl
      }];
    })
    .sort((left, right) => {
      const leftIndex = pecsCardManifest.findIndex((card) => normalizePecsLabel(card.label) === normalizePecsLabel(left.label));
      const rightIndex = pecsCardManifest.findIndex((card) => normalizePecsLabel(card.label) === normalizePecsLabel(right.label));
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    });
}

function isEmbeddableMediaUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function canUseAudioUrl(value?: string) {
  return Boolean(value && isEmbeddableMediaUrl(value));
}

function getFeedbackTitle(result: PecsSentenceValidationResult) {
  return result.isValid ? "Good job" : "Try again";
}

function getSpeechLabel(label: string) {
  return normalizeLearningSpeechText(label);
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
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [ready, setReady] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PecsCardCategory | typeof allCategoriesLabel>(allCategoriesLabel);
  const [cardOrderIds, setCardOrderIds] = useState<string[]>([]);
  const [sentenceCards, setSentenceCards] = useState<PlaygroundCard[]>([]);
  const [draggedLibraryCardId, setDraggedLibraryCardId] = useState("");
  const [draggedSentenceIndex, setDraggedSentenceIndex] = useState<number | null>(null);
  const [result, setResult] = useState<PecsSentenceValidationResult | null>(null);
  const [speaking, setSpeaking] = useState(false);
  // The card being read aloud, so Listen can highlight each card in turn.
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toolbarReady, setToolbarReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCards() {
      try {
        const data = await fetchMakaLearnData();
        if (!active) return;
        setLearningItems(data.learningItems);
        setReady(true);
      } catch (error) {
        if (!active) return;
        setLearningItems([]);
        setReady(true);
        notify({
          title: "PECS cards unavailable",
          description: "Supabase learning items could not be loaded.",
          tone: "error"
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
    if (sentenceCards.length >= maxSentenceCards) {
      notify({ title: "The board is full", description: "Remove a card to add another.", tone: "info" });
      return;
    }

    setSentenceCards((current) => (current.length >= maxSentenceCards ? current : [...current, card]));
    setResult(null);
    setShowSuccessModal(false);
    // Hearing the card as it lands ties the picture to the word.
    if (!speaking) void sayCard(card);
  }

  function removeCard(index: number) {
    setSentenceCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
    setResult(null);
    setShowSuccessModal(false);
  }

  function swapCards(fromIndex: number, toIndex: number) {
    setSentenceCards((current) => swapBoardItems(current, fromIndex, toIndex));
    setResult(null);
    setShowSuccessModal(false);
  }

  function placeLibraryCard(card: PlaygroundCard, targetIndex?: number) {
    if (targetIndex === undefined && sentenceCards.length >= maxSentenceCards) {
      notify({ title: "The board is full", description: "Remove a card to add another.", tone: "info" });
      return;
    }

    setSentenceCards((current) => placeLibraryItem(current, card, targetIndex, maxSentenceCards));
    setResult(null);
    setShowSuccessModal(false);
    if (!speaking) void sayCard(card);
  }

  function handleSentenceDrop(event: DragEvent<HTMLElement>, targetIndex?: number) {
    event.preventDefault();
    // Occupied slots have their own drop handler. Stop the event here so the
    // board background cannot process the same library card a second time.
    if (targetIndex !== undefined) event.stopPropagation();

    if (draggedSentenceIndex !== null && targetIndex !== undefined) {
      swapCards(draggedSentenceIndex, targetIndex);
      setDraggedSentenceIndex(null);
      return;
    }

    if (!draggedLibraryCardId) return;
    const card = cards.find((candidate) => candidate.id === draggedLibraryCardId);
    if (card) placeLibraryCard(card, targetIndex);
    setDraggedLibraryCardId("");
  }

  function checkSentence() {
    const nextResult = validatePecsSentence(sentenceCards, approvedCardIds);
    setResult(nextResult);

    if (nextResult.isValid) {
      setShowSuccessModal(true);
      void speakSentenceLike();
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

    const currentResult = validatePecsSentence(sentenceCards, approvedCardIds);
    if (currentResult.isValid && "speechSynthesis" in window) {
      await speakSentenceLike();
      return;
    }

    setSpeaking(true);
    try {
      for (const [index, card] of sentenceCards.entries()) {
        setSpeakingIndex(index);
        await sayCard(card);
      }
    } finally {
      setSpeaking(false);
      setSpeakingIndex(null);
    }
  }

  async function speakSentenceLike() {
    if (!sentenceCards.length || speaking || !("speechSynthesis" in window)) return;

    setSpeaking(true);
    const words = sentenceCards.map((card) => getSpeechLabel(card.label));
    const wordStarts = words.map((_, index) => (index ? words.slice(0, index).join(" ").length + 1 : 0));
    try {
      // Word boundaries move the highlight. Voices that do not report them simply show no highlight.
      await speakText(words.join(" "), (charIndex) => {
        let index = 0;
        wordStarts.forEach((start, position) => {
          if (charIndex >= start) index = position;
        });
        setSpeakingIndex(index);
      });
    } finally {
      setSpeaking(false);
      setSpeakingIndex(null);
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

  const isDraggingCard = Boolean(draggedLibraryCardId);
  const dropZoneClass = `relative min-h-72 flex-1 overflow-hidden rounded-2xl border bg-[#f8fbff] shadow-inner transition ${
    isDraggingCard ? "border-blue-400 ring-4 ring-blue-200" : "border-blue-100"
  }`;
  const sentenceCanvasClass = "absolute bottom-[9%] left-[5%] right-[5%] top-[24%] overflow-hidden p-2 sm:left-[6%] sm:right-[6%] sm:top-[23%] sm:p-3";

  return (
    <>
      {toolbarReady && typeof document !== "undefined"
        ? createPortal(
            <div
              className={
                isStudentMode
                  ? "fixed inset-0 z-40 bg-sky-100 bg-no-repeat px-2 pb-2 pt-20 sm:px-3 sm:pb-3 lg:px-4"
                  : "fixed bottom-24 left-0 right-0 top-0 z-40 px-3 py-2 md:px-6 lg:bottom-0 lg:left-72 lg:px-8 lg:py-4"
              }
              style={
                isStudentMode
                  ? {
                      backgroundImage: "url('/playground/student-mode-background.png')",
                      backgroundPosition: "top center",
                      backgroundSize: "100% auto"
                    }
                  : undefined
              }
            >
              <div className={`mx-auto grid h-full overflow-hidden rounded-2xl border border-blue-100 shadow-[0_16px_44px_rgba(37,99,235,0.16)] backdrop-blur-2xl ${
                isStudentMode
                  ? "max-w-none grid-rows-[minmax(0,1fr)_minmax(22rem,0.9fr)] bg-white/80 lg:grid-cols-[minmax(0,0.88fr)_minmax(30rem,1.12fr)] lg:grid-rows-1"
                  : "max-w-7xl grid-rows-[minmax(0,1fr)_minmax(22rem,0.9fr)] bg-white/95 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:grid-rows-1"
              }`}>
                <section className={`flex min-h-0 flex-col ${isStudentMode ? "bg-[#f8fbff]/80 p-3 sm:p-4 lg:p-5" : "bg-[#f8fbff] p-3 sm:p-4"}`}>
                  <div className="shrink-0 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">Categories</p>
                        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={mixUpCards}>
                          <Shuffle className="h-4 w-4" aria-hidden="true" />
                          Mix up
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {filterCategories.map((category) => {
                          const style = categoryStyles[category];
                          const CategoryIcon = style.icon;
                          const isActive = activeCategory === category;
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setActiveCategory(category)}
                              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-bold transition ${
                                isActive ? `${style.active} shadow-soft` : style.idle
                              }`}
                              aria-pressed={isActive}
                            >
                              <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                              {category}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-blue-100 bg-white shadow-sm clean-scrollbar ${isStudentMode ? "p-4" : "p-3"}`}>
                      {!ready ? (
                        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-blue-100 bg-[#f8fbff] text-sm font-semibold text-slate-600">
                          Loading PECS cards...
                        </div>
                      ) : filteredCards.length ? (
                        <div className={`grid ${isStudentMode ? "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"}`}>
                          {filteredCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              draggable
                              onClick={() => addCard(card)}
                              onDragStart={() => {
                                setDraggedSentenceIndex(null);
                                setDraggedLibraryCardId(card.id);
                              }}
                              onDragEnd={() => setDraggedLibraryCardId("")}
                              aria-label={`Add ${card.label} to sentence`}
                              className="group rounded-lg border border-blue-100 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-blue-100"
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

                <section className={`flex min-h-0 flex-col border-t border-blue-100 lg:border-l lg:border-t-0 ${isStudentMode ? "bg-white/85 p-3 sm:p-4 lg:p-5" : "bg-white p-3 sm:p-4"}`}>
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleSentenceDrop}
                    className={dropZoneClass}
                    aria-label="Sentence card drop area"
                  >
                    {/* User-provided board artwork for the student playground drop area. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/playground-drop-area.png"
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
                      draggable={false}
                    />
                    <ol className={`${sentenceCanvasClass} flex items-center justify-center gap-2 sm:gap-3`} style={{ containerType: "size" }}>
                      {Array.from({ length: maxSentenceCards }, (_, index) => {
                        const card = sentenceCards[index];

                        if (!card) {
                          const isNext = index === sentenceCards.length;
                          return (
                            <li
                              key={`slot-${index}`}
                              style={slotStyle}
                              className={`grid aspect-[3/4] place-items-center rounded-lg border-2 border-dashed text-xl font-black transition ${
                                isNext
                                  ? `border-blue-400 bg-white/80 text-blue-500 ${isDraggingCard ? "scale-105" : ""}`
                                  : "border-blue-200/80 bg-white/45 text-blue-200"
                              }`}
                              aria-label={isNext ? `Place ${index + 1}, the next card goes here` : `Place ${index + 1}, empty`}
                            >
                              {index + 1}
                            </li>
                          );
                        }

                        const isSpeaking = speakingIndex === index;
                        return (
                          <li
                            key={`${card.id}-${index}`}
                            style={slotStyle}
                            draggable
                            onDragStart={() => {
                              setDraggedLibraryCardId("");
                              setDraggedSentenceIndex(index);
                            }}
                            onDragEnd={() => setDraggedSentenceIndex(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleSentenceDrop(event, index)}
                            className={`relative rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-soft ${
                              isSpeaking ? "-translate-y-1.5 border-blue-500 ring-4 ring-blue-200" : "border-blue-100"
                            }`}
                          >
                            <span className="grid w-full place-items-center rounded-lg p-1.5">
                              <span className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-md bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={card.imageUrl} alt={card.label} className="pointer-events-none h-full w-full object-contain" draggable={false} />
                              </span>
                            </span>
                            <button
                              type="button"
                              draggable={false}
                              onClick={() => removeCard(index)}
                              onDragStart={(event) => event.preventDefault()}
                              aria-label={`Remove ${card.label} from board`}
                              title={`Remove ${card.label}`}
                              className="absolute right-0 top-0 z-10 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-red-600 text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 sm:h-9 sm:w-9"
                            >
                              <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <div className="mt-3 grid shrink-0 gap-3">
                    {result ? (
                      <div
                        className={`flex items-start gap-3 rounded-xl border p-3 shadow-sm ${
                          result.isValid ? "border-emerald-200 bg-emerald-50/90" : "border-amber-200 bg-amber-50/90"
                        }`}
                        role="status"
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                            result.isValid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {result.isValid ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <RotateCcw className="h-5 w-5" aria-hidden="true" />}
                        </span>
                        <div>
                          <p className={`text-lg font-bold ${result.isValid ? "text-emerald-800" : "text-amber-900"}`}>{getFeedbackTitle(result)}</p>
                          {result.feedback ? <p className={`text-sm ${result.isValid ? "text-emerald-900/80" : "text-amber-900/80"}`}>{result.feedback}</p> : null}
                        </div>
                      </div>
                    ) : null}

                    <CardFooter className="mt-0 grid grid-cols-3 gap-2 border-t-0 pt-0">
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                        onClick={checkSentence}
                        disabled={!sentenceCards.length}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Check
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                        onClick={speakSentence}
                        disabled={!sentenceCards.length || speaking}
                      >
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                        {speaking ? "Listening..." : "Listen"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 bg-red-600 text-white shadow-sm hover:bg-red-700"
                        onClick={resetSentence}
                        disabled={!sentenceCards.length}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Clear
                      </Button>
                    </CardFooter>
                  </div>
                </section>
                {showSuccessModal ? (
                  <div className="fixed inset-0 z-[60] grid place-items-center bg-sky-900/20 px-3 py-6">
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="playground-success-title"
                      className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-gradient-to-b from-white via-white to-sky-50 p-5 text-center shadow-[0_24px_80px_rgba(37,99,235,0.2)] sm:p-6"
                    >
                      <div className="relative max-h-[calc(90vh-2.5rem)] overflow-y-auto clean-scrollbar">
                        <div className="relative mx-auto h-20 w-20 rounded-full bg-gradient-to-b from-lime-300 to-green-300 shadow-[0_12px_24px_rgba(16,185,129,0.16),inset_0_-6px_0_rgba(15,23,42,0.08)]" aria-hidden="true">
                          <span className="absolute h-3 w-3 rounded-full bg-ink" style={{ left: "21px", top: "25px" }} />
                          <span className="absolute h-3 w-3 rounded-full bg-ink" style={{ right: "21px", top: "25px" }} />
                          <span className="absolute left-1/2 h-6 w-10 -translate-x-1/2 rounded-b-full border-b-[5px] border-green-800" style={{ top: "42px" }} />
                        </div>
                        <h2 id="playground-success-title" className="mt-4 flex items-center justify-center gap-3 text-4xl font-black tracking-wide text-emerald-600 sm:text-5xl">
                          <Star className="h-8 w-8 fill-yellow-300 text-yellow-400 sm:h-10 sm:w-10" aria-hidden="true" />
                          <span>GOOD JOB</span>
                          <Star className="h-8 w-8 fill-yellow-300 text-yellow-400 sm:h-10 sm:w-10" aria-hidden="true" />
                        </h2>
                        <p className="mt-2 text-base font-semibold text-slate-700">{result?.feedback}</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                          {sentenceCards.map((card, index) => (
                            <div
                              key={`success-${card.id}-${index}`}
                              className={`w-24 rounded-xl border bg-white p-2 shadow-sm transition sm:w-28 md:w-32 ${
                                speakingIndex === index ? "-translate-y-1.5 border-blue-500 ring-4 ring-blue-200" : "border-blue-100"
                              }`}
                            >
                              <div className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={card.imageUrl} alt={`${card.label} completed board card`} className="h-full w-full object-contain" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button type="button" className="mt-6 min-h-12 px-6" onClick={() => setShowSuccessModal(false)}>
                          PLAY AGAIN
                        </Button>
                      </div>
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

/** One card's sound: its recorded audio when there is one, otherwise the browser voice. */
function sayCard(card: PlaygroundCard) {
  if (canUseAudioUrl(card.audioUrl)) return playAudio(card.audioUrl as string);
  if ("speechSynthesis" in window) return speakText(getSpeechLabel(card.label));
  return Promise.resolve();
}

function speakText(text: string, onWord?: (charIndex: number) => void) {
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    if (onWord) utterance.onboundary = (event) => onWord(event.charIndex);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
