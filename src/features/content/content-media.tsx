"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Image as ImageIcon, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSpeechFallbackLabel, isSpeechFallbackAudio } from "@/utils/pecs-content-library";
import { normalizeLearningSpeechText } from "@/utils/speech-text";

export function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
}

export function isImageUrl(value: string) {
  return isUrl(value) && /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value);
}

export function isVideoUrl(value: string) {
  return isUrl(value) && /\.(mov|mp4|mpeg|ogv|webm|m4v)(\?.*)?$/i.test(value);
}

export function isAudioUrl(value: string) {
  return isUrl(value) && /\.(aac|m4a|mp3|oga|ogg|opus|wav|weba)(\?.*)?$/i.test(value);
}

export function getMediaFileName(value: string | undefined) {
  if (!value || value.startsWith("blob:") || !isUrl(value)) return undefined;
  const lastSegment = value.split("?")[0].split("/").filter(Boolean).pop();
  return lastSegment ? decodeURIComponent(lastSegment) : undefined;
}

export function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(normalizeLearningSpeechText(text));
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

/** Card picture: uploaded image, or the stored text (or label) as a big word when there is no image. */
export function CardImage({ value, label, className }: { value?: string; label: string; className?: string }) {
  if (value && isUrl(value)) {
    // eslint-disable-next-line @next/next/no-img-element -- uploads can use temporary blob URLs.
    return <img src={value} alt={`${label} card`} className={cn("h-full w-full object-contain", className)} />;
  }

  return (
    <span className={cn("grid h-full w-full place-items-center p-2 text-center text-2xl font-black text-blue-700", className)}>
      {value || label}
    </span>
  );
}

/**
 * A fixed-shape picture box (3:4 like a PECS card unless `className` says otherwise). The picture is placed
 * absolutely inside it, so the whole image always shows. In a plain grid cell the image kept its own height
 * and the bottom of the card, where the word is, was cut off.
 */
export function PictureBox({
  value,
  label,
  className,
  inset = "inset-1.5",
  textClassName
}: {
  value?: string;
  label: string;
  className?: string;
  /** Space around the picture, as a Tailwind inset class. */
  inset?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("relative block aspect-[3/4] w-full overflow-hidden", className)}>
      <span className={cn("absolute", inset)}>
        <CardImage value={value} label={label} className={textClassName} />
      </span>
    </span>
  );
}

// One shared player so starting a new sound stops the previous one.
let currentAudio: HTMLAudioElement | null = null;

/** Small round play button for an audio URL or a browser speech fallback value. */
export function AudioButton({ value, label, className }: { value?: string; label: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop this button's sound when it leaves the screen (for example when a pop-up closes).
  useEffect(() => () => audioRef.current?.pause(), []);

  if (!value) {
    return (
      <span
        title="No audio"
        className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-300", className)}
      >
        <VolumeX className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">No audio</span>
      </span>
    );
  }

  function play(event: React.MouseEvent) {
    event.stopPropagation();
    if (!value) return;
    if (isSpeechFallbackAudio(value)) {
      speakText(getSpeechFallbackLabel(value));
      return;
    }
    if (!isUrl(value)) {
      speakText(label);
      return;
    }
    if (playing) {
      currentAudio?.pause();
      setPlaying(false);
      return;
    }
    currentAudio?.pause();
    const audio = new Audio(value);
    currentAudio = audio;
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onpause = () => setPlaying(false);
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`${playing ? "Stop" : "Play"} ${label} audio`}
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700 transition hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        playing && "bg-blue-600 text-white",
        className
      )}
    >
      {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

export type MediaKind = "image" | "gesture" | "audio";

const emptyLabels: Record<MediaKind, string> = {
  image: "No image yet",
  gesture: "No file yet",
  audio: "No audio yet"
};

/** Full preview for one media value: image, playable video, or audio player. */
export function MediaPreview({ value, kind, label, className }: { value?: string; kind: MediaKind; label: string; className?: string }) {
  const media = value?.trim();

  if (!media) {
    const Icon = kind === "audio" ? VolumeX : kind === "gesture" ? Film : ImageIcon;
    return (
      <div className={cn("flex min-h-16 items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-[#f8fbff] px-3 text-sm font-semibold text-slate-400", className)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {emptyLabels[kind]}
      </div>
    );
  }

  if (kind === "audio") {
    if (isSpeechFallbackAudio(media) || !isUrl(media)) {
      return (
        <div className={cn("flex items-center gap-3 rounded-xl bg-[#f8fbff] px-3 py-2", className)}>
          <AudioButton value={media} label={label} />
          <span className="text-sm font-semibold text-slate-600">Browser voice</span>
        </div>
      );
    }
    return <audio controls src={media} className={cn("h-10 w-full", className)} aria-label={`${label} audio`} />;
  }

  // Videos are no longer used. Older video files are listed so they can still be deleted, but not played.
  if (isVideoUrl(media)) {
    return (
      <div className={cn("flex min-h-24 items-center justify-center gap-2 rounded-xl bg-[#f8fbff] px-3 text-sm font-semibold text-slate-500", className)}>
        <Film className="h-5 w-5" aria-hidden="true" />
        Old video file. Videos are no longer used.
      </div>
    );
  }

  if (isUrl(media)) {
    return (
      <div className={cn("grid max-h-72 place-items-center overflow-hidden rounded-xl bg-[#f8fbff]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media} alt={label} className="max-h-72 w-full object-contain" />
      </div>
    );
  }

  return (
    <div className={cn("grid min-h-24 place-items-center rounded-xl bg-[#f8fbff] text-3xl font-black text-blue-700", className)}>{media}</div>
  );
}
