"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Save, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { categories, learners, learningItems } from "@/data/mock-data";
import { useDemoUser } from "@/features/auth/use-demo-user";
import { generateFeedbackPlaceholder } from "@/utils/gesture-feedback";
import type { PracticeStatus } from "@/types";

const statuses: PracticeStatus[] = ["Correct", "Good attempt", "Needs practice", "No hand detected"];

export function GesturePracticeView() {
  const { user } = useDemoUser();
  const { notify } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedItemId, setSelectedItemId] = useState(learningItems[0]?.id ?? "");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [status, setStatus] = useState<PracticeStatus | null>(null);
  const [feedback, setFeedback] = useState("Choose a learning item and start practice.");
  const selectedItem = learningItems.find((item) => item.id === selectedItemId) ?? learningItems[0];
  const selectedCategory = categories.find((category) => category.id === selectedItem.categoryId);
  const teacherLearners = learners.filter((learner) => user.role === "admin" || learner.assignedTeacherId === user.id);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

  function saveAttempt() {
    if (!status) {
      notify({ title: "Choose a simulated result", description: "Select a result before saving." });
      return;
    }
    if (!selectedLearnerId) {
      notify({ title: "Demo mode", description: "No learner selected, so this attempt was not saved." });
      return;
    }
    // Future Supabase database: insert into practice_attempts with learner_id,
    // learning_item_id, status, generated feedback, and saved_by.
    notify({
      title: "Attempt saved locally",
      description: "This local save simulates the future practice_attempts insert.",
      tone: "success"
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Gesture Practice"
        title="Teacher-guided practice"
        description="Use webcam preview and simulated teacher controls. Demo mode runs without saving results when no learner is selected."
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
                  <option value="">Demo mode - do not save</option>
                  {teacherLearners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.name}
                    </option>
                  ))}
                </Select>
                <FieldHint>Leave in demo mode when you do not want to save results.</FieldHint>
              </div>
            </div>
          </Card>

          <Card className="flex h-full flex-col">
            <Badge>{selectedCategory?.name}</Badge>
            <CardTitle className="mt-3">{selectedItem.label}</CardTitle>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selectedItem.instruction}</p>
            <div className="mt-4 grid min-h-24 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] text-2xl font-bold text-blue-700 shadow-inner">
              {selectedItem.symbolImageUrl}
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
