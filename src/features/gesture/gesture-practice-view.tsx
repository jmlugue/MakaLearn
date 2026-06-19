"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Save, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { categories as mockCategories, learners as mockLearners, learningItems as mockLearningItems } from "@/data/mock-data";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchMakaLearnData, insertPracticeAttempt } from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { generateFeedbackPlaceholder } from "@/utils/gesture-feedback";
import type { Category, Learner, LearningItem, PracticeAttempt, PracticeStatus } from "@/types";

const statuses: PracticeStatus[] = ["Correct", "Good attempt", "Needs practice", "No hand detected"];

export function GesturePracticeView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(mockLearningItems);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [learners, setLearners] = useState<Learner[]>(mockLearners);
  const [selectedItemId, setSelectedItemId] = useState(mockLearningItems[0]?.id ?? "");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [status, setStatus] = useState<PracticeStatus | null>(null);
  const [feedback, setFeedback] = useState("Choose a learning item and start practice.");
  const selectedItem = learningItems.find((item) => item.id === selectedItemId) ?? learningItems[0];
  const selectedCategory = categories.find((category) => category.id === selectedItem.categoryId);
  const teacherLearners = learners.filter((learner) => user.role === "admin" || learner.assignedTeacherId === user.id);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        setLearningItems(data.learningItems.length ? data.learningItems : mockLearningItems);
        setCategories(data.categories.length ? data.categories : mockCategories);
        setLearners(data.learners.length ? data.learners : mockLearners);
        if (data.learningItems[0]?.id) {
          setSelectedItemId((current) => current || data.learningItems[0].id);
        }
      } catch (error) {
        notify({
          title: "Using local practice data",
          description: error instanceof Error ? error.message : "Supabase practice data could not be loaded."
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [notify]);

  async function startPractice() {
    setPracticeStarted(true);
    setStatus(null);
    setFeedback("Practice is ready. Use the teacher controls after the attempt.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      notify({
        title: "Camera unavailable",
        description: "You can still use simulated feedback controls without webcam access."
      });
    }
  }

  function simulate(nextStatus: PracticeStatus) {
    setStatus(nextStatus);
    setFeedback(generateFeedbackPlaceholder(nextStatus));
  }

  function reset() {
    setStatus(null);
    setFeedback("Practice reset. Try the attempt again.");
  }

  async function saveAttempt() {
    if (!status) {
      notify({ title: "Choose a simulated result", description: "Select a result before saving." });
      return;
    }
    if (!selectedLearnerId) {
      notify({ title: "Attempt not saved", description: "No learner selected, so this attempt was not saved." });
      return;
    }
    const attempt: PracticeAttempt = {
      id: `attempt-${Date.now()}`,
      learnerId: selectedLearnerId,
      learningItemId: selectedItem.id,
      status,
      feedback,
      attemptedAt: new Date().toISOString(),
      savedBy: user.id
    };

    if (isSupabaseConfigured()) {
      try {
        await insertPracticeAttempt(attempt);
      } catch (error) {
        notify({
          title: "Attempt saved locally",
          description: error instanceof Error ? error.message : "Supabase practice attempt insert failed."
        });
        return;
      }
    }

    notify({
      title: isSupabaseConfigured() ? "Attempt saved" : "Attempt saved locally",
      description: isSupabaseConfigured()
        ? "The simulated practice result was written to practice_attempts."
        : "This local save simulates the practice_attempts insert.",
      tone: "success"
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Gesture Practice"
        title="Teacher-guided practice"
        description="Use webcam preview and simulated teacher controls. Practice without a learner runs without saving results."
      />
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Webcam preview</CardTitle>
              <CardDescription>Keep camera, reference, controls, and feedback visible during practice.</CardDescription>
            </div>
            <Button onClick={startPractice}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {practiceStarted ? "Restart camera" : "Start practice"}
            </Button>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg bg-ink shadow-inner">
            {practiceStarted ? (
              <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
            ) : (
              <div className="grid aspect-video place-items-center text-center text-white">
                <div>
                  <Camera className="mx-auto h-12 w-12" aria-hidden="true" />
                  <p className="mt-3 font-semibold">Camera preview will appear here</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-[#fbfdff]">
            <CardTitle>Session setup</CardTitle>
            <div className="mt-4 grid gap-4">
              <div>
                <Label htmlFor="learning-item">Learning item</Label>
                <Select id="learning-item" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
                  {learningItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} - {categories.find((category) => category.id === item.categoryId)?.name ?? "Uncategorized"}
                    </option>
                  ))}
                </Select>
                <FieldHint>Choose the cue the learner will practice.</FieldHint>
              </div>
              <div>
                <Label htmlFor="learner-select">Learner</Label>
                <Select id="learner-select" value={selectedLearnerId} onChange={(event) => setSelectedLearnerId(event.target.value)}>
                  <option value="">No learner - do not save</option>
                  {teacherLearners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.name}
                    </option>
                  ))}
                </Select>
                <FieldHint>Leave blank when you do not want to save results.</FieldHint>
              </div>
            </div>
          </Card>

          <Card className="flex h-full flex-col">
            <Badge>{selectedCategory?.name}</Badge>
            <CardTitle className="mt-3">{selectedItem.label}</CardTitle>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedItem.instruction}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PracticeReferenceMedia
                title="Symbol image"
                value={selectedItem.symbolImageUrl}
                label={`${selectedItem.label} symbol image`}
                emptyText="No symbol image added"
              />
              <PracticeReferenceMedia
                title="Gesture reference"
                value={selectedItem.gestureMediaUrl}
                label={`${selectedItem.label} gesture reference`}
                emptyText="No gesture reference added"
              />
              <PracticeReferenceMedia
                title="Audio cue"
                value={selectedItem.audioUrl}
                label={`${selectedItem.label} audio cue`}
                emptyText="No audio cue added"
                kind="audio"
                className="md:col-span-2"
              />
            </div>
          </Card>

          <Card className="flex h-full flex-col">
            <CardTitle>Simulated result</CardTitle>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {statuses.map((item) => (
                <Button
                  key={item}
                  variant={status === item ? "primary" : "outline"}
                  onClick={() => simulate(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-skywash p-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <p className="font-semibold">{status ?? "Waiting for result"}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feedback}</p>
            </div>
            <CardFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset attempt
              </Button>
              <Button onClick={saveAttempt}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save attempt
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </>
  );
}

function PracticeReferenceMedia({
  title,
  value,
  label,
  emptyText,
  kind = "visual",
  className = ""
}: {
  title: string;
  value?: string;
  label: string;
  emptyText: string;
  kind?: "visual" | "audio";
  className?: string;
}) {
  const mediaValue = value?.trim();

  return (
    <div className={`overflow-hidden rounded-lg border border-blue-100 bg-[#f8fbff] shadow-inner ${className}`}>
      <div className="border-b border-blue-100 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
        {title}
      </div>
      <div className={kind === "audio" ? "min-h-36 p-3" : "grid min-h-36 place-items-center p-3"}>
        {!mediaValue ? (
          kind === "audio" ? (
            <AudioEmptyState message={emptyText} />
          ) : (
            <p className="text-center text-sm font-semibold text-slate-500">{emptyText}</p>
          )
        ) : isImageUrl(mediaValue) ? (
          // Official/approved symbol or gesture images can be uploaded through Supabase Storage later.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaValue} alt={label} className="max-h-64 w-full rounded-md object-contain" />
        ) : isVideoUrl(mediaValue) ? (
          <video controls className="max-h-64 w-full rounded-md" aria-label={label}>
            <source src={mediaValue} />
          </video>
        ) : isAudioUrl(mediaValue) ? (
          <div className="grid h-full min-h-28 gap-3">
            <AudioWaveform />
            <audio controls className="w-full self-end" aria-label={label}>
              <source src={mediaValue} />
            </audio>
          </div>
        ) : (
          <p className="break-words text-center text-2xl font-bold text-blue-700">{mediaValue}</p>
        )}
      </div>
    </div>
  );
}

function AudioEmptyState({ message }: { message: string }) {
  return (
    <div className="grid h-full min-h-28 place-items-center rounded-md bg-white/60 p-4">
      <div className="w-full max-w-xl">
        <AudioWaveform muted />
        <p className="mt-4 text-center text-sm font-semibold text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function AudioWaveform({ muted = false }: { muted?: boolean }) {
  const bars = [18, 34, 52, 28, 64, 42, 76, 48, 30, 58, 38, 70, 44, 24, 54, 32];

  return (
    <div className="flex h-20 items-center justify-center gap-1.5 rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4">
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={muted ? "w-1.5 rounded-full bg-blue-200" : "w-1.5 rounded-full bg-blue-500"}
          style={{ height: `${height}%`, opacity: muted ? 0.55 : 0.85 }}
        />
      ))}
    </div>
  );
}

function isImageUrl(value: string) {
  return isUrl(value) && /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value);
}

function isVideoUrl(value: string) {
  return isUrl(value) && /\.(mov|mp4|mpeg|ogg|ogv|webm)(\?.*)?$/i.test(value);
}

function isAudioUrl(value: string) {
  return isUrl(value) && /\.(aac|m4a|mp3|oga|ogg|opus|wav|weba)(\?.*)?$/i.test(value);
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
}
