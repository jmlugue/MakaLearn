"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient, isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/client";

/**
 * Cartoon-hand animations of the fixed gestures: short looping WebM videos in the `gesture-media` storage bucket,
 * under `gesture-motions/<gesture id>.webm` (for example `gesture-motions/gesture-eat-food.webm`). They are made
 * outside the app with a one-off recording tool (a person signs once, only the hand points are kept and replayed as
 * a cartoon hand) and uploaded to Supabase; nothing is stored in the repo. A gesture with no video keeps its picture.
 */
const FOLDER = "gesture-motions";

let listing: Promise<Set<string>> | null = null;

/** The ids that have an animation, read once per page load (one storage list call, no failed video requests). */
function availableMotions() {
  listing ??= (async () => {
    if (!isSupabaseConfigured()) return new Set<string>();
    try {
      const client = getSupabaseBrowserClient();
      if (!client) return new Set<string>();
      const { data, error } = await client.storage.from("gesture-media").list(FOLDER, { limit: 100 });
      if (error || !data) return new Set<string>();
      return new Set(data.filter((file) => file.name.endsWith(".webm")).map((file) => file.name.replace(/\.webm$/, "")));
    } catch {
      return new Set<string>();
    }
  })();
  return listing;
}

export function gestureMotionUrl(id: string) {
  return `${supabaseUrl}/storage/v1/object/public/gesture-media/${FOLDER}/${encodeURIComponent(id)}.webm`;
}

/** Plays the gesture's animation on a loop when there is one, otherwise shows `fallback` (its picture). */
export function GestureMotion({ id, fallback, className }: { id: string; fallback: ReactNode; className?: string }) {
  const [hasMotion, setHasMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setHasMotion(false);
    setPlaying(false);
    void availableMotions().then((ids) => {
      if (active) setHasMotion(ids.has(id));
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!hasMotion || failed) return <>{fallback}</>;
  function playAnimation() {
    // Safari can refuse autoplay. Keep the picture visible and offer a real tap.
    const request = videoRef.current?.play();
    request?.catch(() => setPlaying(false));
  }
  return (
    <div className={cn("gesture-motion relative h-full min-h-0 w-full overflow-hidden rounded-[1.5rem]", className)}>
      <div className={cn("absolute inset-0 h-full w-full", playing && "invisible")} aria-hidden={playing}>{fallback}</div>
      <video
        ref={videoRef}
        key={id}
        src={gestureMotionUrl(id)}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={playAnimation}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        className={cn("absolute inset-0 h-full w-full object-contain", !playing && "opacity-0")}
        aria-hidden="true"
      />
      {!playing ? (
        <button type="button" onClick={playAnimation} aria-label="Play animation" title="Play gesture animation" className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-xl border border-blue-200 bg-white/95 text-blue-800 shadow-sm">
          <Play className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
