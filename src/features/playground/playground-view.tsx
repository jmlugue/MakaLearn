"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  Search,
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
import { Input } from "@/components/ui/form";
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
import { createUtterance } from "@/lib/speech";
import { playCue } from "@/lib/sound-cues";
import { Maki } from "@/features/student-mode/maki";
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
// Full class strings are kept literal so Tailwind keeps them. Same hues as the Content tints in
// `src/lib/category-colors.ts`: change both together.
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

/** Shown (not spoken; the voice says only "Try again.") after a wrong Check. About the next try, not the mistake. */
const encouragingLine = "You\u2019re doing great! Let\u2019s try one more time.";

type DragSource = { kind: "library"; card: PlaygroundCard } | { kind: "board"; index: number; card: PlaygroundCard };
type DragState = { source: DragSource; x: number; y: number; overIndex: number | null; overBoard: boolean };

/** What is under the pointer: a board place (numbered slot) and whether it is over the board at all. */
function hitTest(x: number, y: number) {
  const element = document.elementFromPoint(x, y);
  const slot = element?.closest<HTMLElement>("[data-slot-index]");
  return {
    overIndex: slot ? Number(slot.dataset.slotIndex) : null,
    overBoard: Boolean(element?.closest("[data-board]"))
  };
}

// On touch, a card is picked up after a short hold, so a quick swipe still scrolls the card list.
const TOUCH_HOLD_MS = 170;

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
  const [cardSearch, setCardSearch] = useState("");
  const [cardOrderIds, setCardOrderIds] = useState<string[]>([]);
  const [sentenceCards, setSentenceCards] = useState<PlaygroundCard[]>([]);
  // Cards are dragged only (no tapping), with a mouse or a finger. Pointer events, so it works on tablets too.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingRef = useRef<{ source: DragSource; pointerId: number; pointerType: string; startX: number; startY: number; timer?: number } | null>(null);
  const [result, setResult] = useState<PecsSentenceValidationResult | null>(null);
  const [speaking, setSpeaking] = useState(false);
  // The card being read aloud, so Listen can highlight each card in turn.
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  // After Check, a pop-up says "Good job" or "Try again". Any change to the board closes it.
  const [feedbackModal, setFeedbackModal] = useState<"success" | "retry" | null>(null);
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
    const categoryCards = activeCategory === allCategoriesLabel
      ? orderedCards
      : orderedCards.filter((card) => card.category === activeCategory);
    const query = cardSearch.trim().toLowerCase();

    if (!query) return categoryCards;

    return categoryCards.filter((card) => card.label.trim().toLowerCase().startsWith(query));
  }, [activeCategory, cardSearch, orderedCards]);

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
    setFeedbackModal(null);
    // Hearing the card as it lands ties the picture to the word.
    if (!speaking) void sayCard(card);
  }

  function removeCard(index: number) {
    setSentenceCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
    setResult(null);
    setFeedbackModal(null);
  }

  function swapCards(fromIndex: number, toIndex: number) {
    setSentenceCards((current) => swapBoardItems(current, fromIndex, toIndex));
    setResult(null);
    setFeedbackModal(null);
  }

  function placeLibraryCard(card: PlaygroundCard, targetIndex?: number) {
    if (targetIndex === undefined && sentenceCards.length >= maxSentenceCards) {
      notify({ title: "The board is full", description: "Remove a card to add another.", tone: "info" });
      return;
    }

    setSentenceCards((current) => placeLibraryItem(current, card, targetIndex, maxSentenceCards));
    setResult(null);
    setFeedbackModal(null);
    if (!speaking) void sayCard(card);
  }

  function setDragState(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>, source: DragSource) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const pending = { source, pointerId: event.pointerId, pointerType: event.pointerType, startX: event.clientX, startY: event.clientY } as NonNullable<typeof pendingRef.current>;
    pendingRef.current = pending;
    if (event.pointerType !== "mouse") {
      pending.timer = window.setTimeout(() => {
        if (pendingRef.current === pending) setDragState({ source, x: pending.startX, y: pending.startY, ...hitTest(pending.startX, pending.startY) });
      }, TOUCH_HOLD_MS);
    }
  }

  function dropDragged(state: DragState, x: number, y: number) {
    const { overIndex, overBoard } = hitTest(x, y);
    if (state.source.kind === "library") {
      if (overIndex !== null) placeLibraryCard(state.source.card, overIndex);
      else if (overBoard) placeLibraryCard(state.source.card);
      return;
    }
    if (overIndex !== null && overIndex !== state.source.index && overIndex < sentenceCards.length) swapCards(state.source.index, overIndex);
  }

  // While a card is held, follow the pointer anywhere on the page until it is let go.
  useEffect(() => {
    function finish(event: PointerEvent, drop: boolean) {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      window.clearTimeout(pending.timer);
      pendingRef.current = null;
      const current = dragRef.current;
      if (current && drop) dropDragged(current, event.clientX, event.clientY);
      setDragState(null);
    }

    function onMove(event: PointerEvent) {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      const moved = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
      if (!dragRef.current) {
        if (pending.pointerType === "mouse") {
          if (moved > 5) setDragState({ source: pending.source, x: event.clientX, y: event.clientY, ...hitTest(event.clientX, event.clientY) });
        } else if (moved > 10) {
          // Moved before the hold finished: the learner is scrolling the list, not picking up a card.
          window.clearTimeout(pending.timer);
          pendingRef.current = null;
        }
        return;
      }
      event.preventDefault();
      setDragState({ ...dragRef.current, x: event.clientX, y: event.clientY, ...hitTest(event.clientX, event.clientY) });
    }

    const onUp = (event: PointerEvent) => finish(event, true);
    const onCancel = (event: PointerEvent) => finish(event, false);
    // Once a card is picked up on touch, stop the page from scrolling under the finger.
    const onTouchMove = (event: TouchEvent) => {
      if (dragRef.current) event.preventDefault();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouchMove);
    };
    // The handlers read the latest board through refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentenceCards.length, speaking]);

  function checkSentence() {
    const nextResult = validatePecsSentence(sentenceCards, approvedCardIds);
    setResult(nextResult);

    if (nextResult.isValid) {
      setFeedbackModal("success");
      playCue("correct");
      void speakSentenceLike();
      return;
    }

    setFeedbackModal("retry");
    if ("speechSynthesis" in window) void speakText("Try again.");
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
    setFeedbackModal(null);
  }

  function mixUpCards() {
    setCardOrderIds((current) => {
      const sourceIds = current.length === cards.length ? current : cards.map((card) => card.id);
      return shuffleValues(sourceIds);
    });
  }

  const isDraggingCard = drag?.source.kind === "library";
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
                  ? "fixed inset-0 z-40 bg-[#fcfdff] bg-no-repeat px-2 pb-2 pt-20 sm:px-3 sm:pb-3 lg:px-4"
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex min-h-10 items-center text-sm font-bold text-ink">Categories</p>
                        <label className="relative block h-10 shrink-0 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:shadow-[0_10px_24px_rgba(37,99,235,0.12)] sm:min-w-72">
                          <span className="sr-only">Search cards</span>
                          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                          <Input
                            type="search"
                            aria-label="Search cards"
                            value={cardSearch}
                            onChange={(event) => setCardSearch(event.target.value)}
                            placeholder="Search PECS cards"
                            className="h-full min-h-0 border-0 bg-white/95 pl-9 pr-3 shadow-none backdrop-blur-none hover:border-0 hover:bg-white/95 focus:border-0 focus:bg-white/95 focus:shadow-none focus:ring-0"
                          />
                        </label>
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
                        <Button type="button" variant="outline" size="sm" className="min-h-10 shrink-0 rounded-xl border-2" onClick={mixUpCards}>
                          <Shuffle className="h-4 w-4" aria-hidden="true" />
                          Mix up
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
                        <div className={`grid ${isStudentMode ? "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"}`}>
                          {filteredCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              onPointerDown={(event) => beginDrag(event, { kind: "library", card })}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  addCard(card);
                                }
                              }}
                              onContextMenu={(event) => event.preventDefault()}
                              aria-label={`Drag ${card.label} to the board`}
                              className={`group cursor-grab touch-pan-y select-none rounded-lg border border-blue-100 bg-white p-2 text-left shadow-sm transition [-webkit-touch-callout:none] hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-blue-100 active:cursor-grabbing ${
                                drag?.source.kind === "library" && drag.source.card.id === card.id ? "opacity-40" : ""
                              }`}
                            >
                              <span className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                {/* Provided PECS/AAC card images are used unchanged from public/pecs. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={card.imageUrl} alt={`${card.label} PECS card`} className="pointer-events-none h-full w-full object-contain" draggable={false} />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon={Library} title="No cards found" description={cardSearch ? "Try another search or category." : "Try another category."} />
                      )}
                  </div>
                </section>

                <section className={`flex min-h-0 flex-col border-t border-blue-100 lg:border-l lg:border-t-0 ${isStudentMode ? "bg-white/85 p-3 sm:p-4 lg:p-5" : "bg-white p-3 sm:p-4"}`}>
                  <div
                    data-board=""
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
                              data-slot-index={index}
                              style={slotStyle}
                              className={`grid aspect-[3/4] place-items-center rounded-lg border-2 border-dashed text-xl font-black transition ${
                                isNext
                                  ? `border-blue-400 bg-white/80 text-blue-500 ${isDraggingCard ? "scale-105" : ""}`
                                  : "border-blue-200/80 bg-white/45 text-blue-200"
                              } ${drag && drag.overIndex === index ? "scale-110 border-blue-500 bg-blue-50 ring-4 ring-blue-200" : ""}`}
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
                            data-slot-index={index}
                            style={slotStyle}
                            onPointerDown={(event) => beginDrag(event, { kind: "board", index, card })}
                            onContextMenu={(event) => event.preventDefault()}
                            className={`relative cursor-grab touch-none select-none rounded-lg border bg-white shadow-sm transition [-webkit-touch-callout:none] hover:-translate-y-0.5 hover:border-red-300 hover:shadow-soft ${
                              isSpeaking ? "-translate-y-1.5 border-blue-500 ring-4 ring-blue-200" : "border-blue-100"
                            } ${drag?.source.kind === "board" && drag.source.index === index ? "opacity-40" : ""} ${
                              drag && drag.overIndex === index && !(drag.source.kind === "board" && drag.source.index === index) ? "ring-4 ring-blue-300" : ""
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
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={() => removeCard(index)}
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

                    <CardFooter className="mt-0 grid grid-cols-3 gap-3 border-t-0 pb-1.5 pt-0">
                      <button
                        type="button"
                        className={`${gameButtonClass} bg-emerald-500 shadow-[0_5px_0_#047857] hover:bg-emerald-600`}
                        onClick={checkSentence}
                        disabled={!sentenceCards.length}
                      >
                        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                        Check
                      </button>
                      <button
                        type="button"
                        className={`${gameButtonClass} bg-blue-600 shadow-[0_5px_0_#1e40af] hover:bg-blue-700`}
                        onClick={speakSentence}
                        disabled={!sentenceCards.length || speaking}
                      >
                        <Volume2 className="h-6 w-6" aria-hidden="true" />
                        {speaking ? "Listening..." : "Listen"}
                      </button>
                      <button
                        type="button"
                        className={`${gameButtonClass} bg-red-500 shadow-[0_5px_0_#b91c1c] hover:bg-red-600`}
                        onClick={resetSentence}
                        disabled={!sentenceCards.length}
                      >
                        <RotateCcw className="h-6 w-6" aria-hidden="true" />
                        Clear
                      </button>
                    </CardFooter>
                  </div>
                </section>
                {drag ? (
                  <div
                    className="pointer-events-none fixed left-0 top-0 z-[80] w-24 -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-lg border-2 border-blue-400 bg-white p-1.5 shadow-[0_18px_40px_rgba(37,99,235,0.3)] sm:w-28"
                    style={{ left: drag.x, top: drag.y }}
                    aria-hidden="true"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={drag.source.card.imageUrl} alt="" className="aspect-[3/4] w-full object-contain" draggable={false} />
                  </div>
                ) : null}
                {feedbackModal === "success" ? (
                  <div className="fixed inset-0 z-[60] grid place-items-center bg-emerald-950/20 px-3 py-6">
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="playground-success-title"
                      className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[1.75rem] border-4 border-emerald-200 bg-gradient-to-b from-emerald-50 via-white to-emerald-50 p-5 text-center shadow-[0_24px_80px_rgba(16,185,129,0.25)] sm:p-6"
                    >
                      {/* Bottom padding keeps the button's 3D edge and focus ring inside the scroll area. */}
                      <div className="relative max-h-[calc(90vh-2.5rem)] overflow-y-auto px-1 pb-3 clean-scrollbar">
                        {/* Top padding leaves room for Maki's jump and stars inside the scroll area. */}
                        <div className="flex justify-center pt-6" aria-hidden="true">
                          <Maki mood="cheer" size={150} label="" />
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
                        <button type="button" className={`${popupButtonClass} bg-emerald-500 shadow-[0_5px_0_#047857] hover:bg-emerald-600 focus-visible:ring-emerald-200`} onClick={() => setFeedbackModal(null)}>
                          Play again
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {feedbackModal === "retry" && result ? (
                  <div className="fixed inset-0 z-[60] grid place-items-center bg-sky-900/20 px-3 py-6" onClick={() => setFeedbackModal(null)}>
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="playground-retry-title"
                      onClick={(event) => event.stopPropagation()}
                      className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-red-200 bg-gradient-to-b from-white via-white to-red-50 p-5 text-center shadow-[0_24px_80px_rgba(220,38,38,0.18)] sm:p-6"
                    >
                      <div className="relative max-h-[calc(90vh-2.5rem)] overflow-y-auto px-1 pb-3 clean-scrollbar">
                        <div className="flex justify-center pt-6" aria-hidden="true">
                          <Maki mood="encourage" size={150} label="" />
                        </div>
                        <h2 id="playground-retry-title" className="mt-4 text-4xl font-black tracking-wide text-red-600 sm:text-5xl">
                          TRY AGAIN
                        </h2>
                        <p className="mt-2 text-lg font-bold text-slate-700">{encouragingLine}</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                          {sentenceCards.map((card, index) => (
                            <div key={`retry-${card.id}-${index}`} className="w-20 rounded-xl border border-red-100 bg-white p-2 shadow-sm sm:w-24">
                              <div className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={card.imageUrl} alt={card.label} className="h-full w-full object-contain" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button" className={`${popupButtonClass} bg-red-500 shadow-[0_5px_0_#b91c1c] hover:bg-red-600 focus-visible:ring-red-200`} onClick={() => setFeedbackModal(null)}>
                          Let’s go!
                        </button>
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

/** Big 3D button in the Good job and Try again pop-ups. */
const popupButtonClass =
  "mt-6 inline-flex min-h-14 items-center justify-center rounded-full px-10 text-xl font-black text-white transition active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-4";

/** Chunky toy-style buttons under the board: the darker bottom edge presses down on tap. */
const gameButtonClass =
  "inline-flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 pb-2 pt-3 text-base font-black leading-tight text-white transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 sm:text-lg";

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
    const utterance = createUtterance(text);
    if (onWord) utterance.onboundary = (event) => onWord(event.charIndex);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
