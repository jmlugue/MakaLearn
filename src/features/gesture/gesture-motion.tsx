"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    let active = true;
    setFailed(false);
    void availableMotions().then((ids) => {
      if (active) setHasMotion(ids.has(id));
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!hasMotion || failed) return <>{fallback}</>;
  return (
    <video
      key={id}
      src={gestureMotionUrl(id)}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setFailed(true)}
      className={className ?? "h-full w-full rounded-[1.5rem] bg-white object-contain"}
      aria-hidden="true"
    />
  );
}
