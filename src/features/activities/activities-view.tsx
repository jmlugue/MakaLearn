"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Dices, Play, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { activities as mockActivities, learners as mockLearners, learningItems as mockLearningItems } from "@/data/mock-data";
import { useAuthUser } from "@/features/auth/use-auth-user";
import {
  createActivityQuestions,
  fetchMakaLearnData,
  insertActivity,
  insertActivityResult
} from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { activityTypeLabels } from "@/utils/activity-labels";
import type { Activity, ActivityResult, ActivityType, Learner, LearningItem } from "@/types";

const activityTypes = Object.keys(activityTypeLabels) as ActivityType[];

export function ActivitiesView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [learners, setLearners] = useState<Learner[]>(mockLearners);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(mockLearningItems);
  const [selectedActivityId, setSelectedActivityId] = useState(mockActivities[0].id);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState("");
  const [result, setResult] = useState<{ score: number; correct: number; incorrect: number } | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("simple-quiz");
  const [privateActivity, setPrivateActivity] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        const nextActivities = data.activities.length ? data.activities : mockActivities;
        setActivities(nextActivities);
        setLearners(data.learners.length ? data.learners : mockLearners);
        setLearningItems(data.learningItems.length ? data.learningItems : mockLearningItems);
        setSelectedActivityId((current) => nextActivities.some((activity) => activity.id === current) ? current : nextActivities[0]?.id ?? "");
      } catch (error) {
        notify({
          title: "Using local activity data",
          description: error instanceof Error ? error.message : "Supabase activities could not be loaded."
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [notify]);

  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? activities[0];
  const teacherLearners = learners.filter((learner) => user.role === "admin" || learner.assignedTeacherId === user.id);
  const selectedItems = useMemo(
    () => selectedActivity.learningItemIds.map((id) => learningItems.find((item) => item.id === id)).filter(Boolean),
    [learningItems, selectedActivity]
  );

  function chooseAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setResult(null);
  }

  async function scoreActivity() {
    const correct = selectedActivity.questions.reduce(
      (sum, question) => sum + (answers[question.id] === question.answer ? 1 : 0),
      0
    );
    const incorrect = selectedActivity.questions.length - correct;
    const score = selectedActivity.questions.length ? Math.round((correct / selectedActivity.questions.length) * 100) : 0;
    setResult({ score, correct, incorrect });
    if (!selectedLearnerId) {
      notify({ title: "Result not saved", description: "No learner selected, so this activity result was not saved." });
      return;
    }
    const activityResult: ActivityResult = {
      id: `result-${Date.now()}`,
      learnerId: selectedLearnerId,
      activityId: selectedActivity.id,
      activityType: selectedActivity.type,
      scorePercentage: score,
      correctCount: correct,
      incorrectCount: incorrect,
      timeSpentSeconds: 120,
      completedAt: new Date().toISOString(),
      relatedLearningItemIds: selectedActivity.learningItemIds,
      savedBy: user.id
    };

    if (isSupabaseConfigured()) {
      try {
        await insertActivityResult(activityResult);
      } catch (error) {
        notify({
          title: "Activity result saved locally",
          description: error instanceof Error ? error.message : "Supabase result insert failed."
        });
        return;
      }
    }

    notify({
      title: isSupabaseConfigured() ? "Activity result saved" : "Activity result saved locally",
      description: `${score}% score recorded for this session.`,
      tone: "success"
    });
  }

  function resetPlayer(activityId = selectedActivityId) {
    setSelectedActivityId(activityId);
    setAnswers({});
    setDragged("");
    setResult(null);
  }

  async function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Activity title is required.");
      return;
    }
    const baseItems = learningItems.slice(0, 3);
    const questions = createActivityQuestions(type, baseItems);
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      title,
      type,
      prompt: "Teacher-created local activity.",
      learningItemIds: baseItems.map((item) => item.id),
      questions,
      visibility: privateActivity ? "private" : "shared",
      createdBy: user.id
    };
    let savedActivity = newActivity;
    if (isSupabaseConfigured()) {
      try {
        savedActivity = await insertActivity(newActivity);
      } catch (error) {
        notify({
          title: "Activity created locally",
          description: error instanceof Error ? error.message : "Supabase activity insert failed."
        });
      }
    }
    setActivities((current) => [savedActivity, ...current]);
    resetPlayer(savedActivity.id);
    setTitle("");
    setPrivateActivity(false);
    setError("");
    notify({
      title: "Activity created",
      description: isSupabaseConfigured() ? "The new activity was saved to Supabase." : "The new activity is available locally.",
      tone: "success"
    });
  }

  async function autoGenerate() {
    const item = learningItems[Math.floor(Math.random() * learningItems.length)];
    const generated: Activity = {
      id: `activity-auto-${Date.now()}`,
      title: `${item.label} quick quiz`,
      type: "simple-quiz",
      prompt: `Answer a quick question about ${item.label}.`,
      learningItemIds: [item.id],
      questions: [
        {
          id: `q-auto-${Date.now()}`,
          prompt: `Which word is being practiced?`,
          answer: item.label,
          options: [item.label, "Stop", "Drink"].filter((value, index, array) => array.indexOf(value) === index),
          learningItemId: item.id
        }
      ],
      visibility: "shared",
      createdBy: user.id
    };
    let savedActivity = generated;
    if (isSupabaseConfigured()) {
      try {
        savedActivity = await insertActivity(generated);
      } catch (error) {
        notify({
          title: "Activity generated locally",
          description: error instanceof Error ? error.message : "Supabase activity insert failed."
        });
      }
    }
    setActivities((current) => [savedActivity, ...current]);
    resetPlayer(savedActivity.id);
    notify({ title: "Activity generated", description: `Created a quick activity from ${item.label}.`, tone: "success" });
  }

  return (
    <>
      <PageHeader
        eyebrow="Activities"
        title="Activity library and player"
        description="Run scored local activities. Results are saved only when a learner is selected."
        actions={
          <Button onClick={autoGenerate}>
            <Dices className="h-4 w-4" aria-hidden="true" />
            Auto-generate
          </Button>
        }
      />
      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <Card className="bg-[#fbfdff]">
            <CardTitle>Create activity</CardTitle>
            <CardDescription>Teachers and admins can manually create shared or private activities.</CardDescription>
            <form className="mt-4 space-y-4" onSubmit={createActivity}>
              <div>
                <Label htmlFor="activity-title">Activity title</Label>
                <Input id="activity-title" value={title} onChange={(event) => setTitle(event.target.value)} />
                <FieldError message={error} />
              </div>
              <div>
                <Label htmlFor="activity-type">Activity type</Label>
                <Select id="activity-type" value={type} onChange={(event) => setType(event.target.value as ActivityType)}>
                  <optgroup label="Symbol and word activities">
                    {activityTypes.slice(0, 4).map((item) => (
                      <option key={item} value={item}>
                        {activityTypeLabels[item]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Guided practice">
                    {activityTypes.slice(4).map((item) => (
                      <option key={item} value={item}>
                        {activityTypeLabels[item]}
                      </option>
                    ))}
                  </optgroup>
                </Select>
                <FieldHint>The underlying activity type value stays typed for future database records.</FieldHint>
              </div>
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-blue-100 bg-skywash p-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={privateActivity}
                  onChange={(event) => setPrivateActivity(event.target.checked)}
                  className="h-5 w-5"
                />
                Private to me
              </label>
              <Textarea placeholder="Optional instructions for the activity" />
              <Button type="submit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create activity
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>Activity Library</CardTitle>
            <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1 clean-scrollbar">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => resetPlayer(activity.id)}
                  className={`flex min-h-24 w-full flex-col justify-between rounded-lg border p-3 text-left transition ${
                    selectedActivity.id === activity.id
                      ? "border-blue-500 bg-skywash"
                      : "border-blue-100 bg-white hover:bg-skywash"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{activity.title}</p>
                    <Badge>{activity.visibility}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{activityTypeLabels[activity.type]}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge>{activityTypeLabels[selectedActivity.type]}</Badge>
              <CardTitle className="mt-3 text-2xl">{selectedActivity.title}</CardTitle>
              <CardDescription>{selectedActivity.prompt}</CardDescription>
            </div>
            <div className="min-w-56">
              <Label htmlFor="activity-learner">Learner</Label>
              <Select id="activity-learner" value={selectedLearnerId} onChange={(event) => setSelectedLearnerId(event.target.value)}>
                <option value="">No learner - do not save</option>
                {teacherLearners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.name}
                  </option>
                ))}
              </Select>
              <FieldHint>Select a learner only when the result should be saved later.</FieldHint>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-skywash p-4">
            <p className="text-sm font-semibold text-slate-700">Related learning items</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedItems.map((item) =>
                item ? (
                  <Badge key={item.id} className="bg-white text-blue-700">
                    {item.label}
                  </Badge>
                ) : null
              )}
            </div>
          </div>

          <ActivityPlayer
            activity={selectedActivity}
            answers={answers}
            dragged={dragged}
            setDragged={setDragged}
            chooseAnswer={chooseAnswer}
          />

          {result ? (
            <div className="mt-5 rounded-lg bg-mint p-4">
              <p className="text-xl font-bold text-green-800">{result.score}% score</p>
              <p className="mt-1 text-sm text-green-800">
                {result.correct} correct · {result.incorrect} incorrect
              </p>
            </div>
          ) : null}

          <CardFooter className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={scoreActivity}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Score activity
            </Button>
            <Button variant="secondary" onClick={() => resetPlayer()}>
              Reset answers
            </Button>
            <Button variant="outline" onClick={() => notify({ title: "Draft saved", description: "This simulates saving activity edits locally." })}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save edits
            </Button>
          </CardFooter>
        </Card>
      </section>
    </>
  );
}

function ActivityPlayer({
  activity,
  answers,
  dragged,
  setDragged,
  chooseAnswer
}: {
  activity: Activity;
  answers: Record<string, string>;
  dragged: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
}) {
  if (activity.type === "drag-drop-symbol") {
    const uniqueCards = [...new Set(activity.questions.flatMap((question) => question.options))];
    return (
      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Drag cards to the matching words.</p>
        <div className="mb-4 flex flex-wrap gap-3">
          {uniqueCards.map((card) => (
            <button
              key={card}
              type="button"
              draggable
              onDragStart={() => setDragged(card)}
              onClick={() => setDragged(card)}
              className={`grid h-16 min-w-20 place-items-center rounded-lg border bg-white px-4 text-xl font-bold text-blue-700 ${
                dragged === card ? "border-blue-500 ring-4 ring-blue-100" : "border-blue-100"
              }`}
            >
              {card}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {activity.questions.map((question) => (
            <div
              key={question.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dragged && chooseAnswer(question.id, dragged)}
              className="min-h-28 rounded-lg border-2 border-dashed border-blue-200 bg-skywash p-4"
            >
              <p className="font-semibold">{question.prompt}</p>
              <Button className="mt-3" variant="secondary" onClick={() => dragged && chooseAnswer(question.id, dragged)}>
                Drop selected card
              </Button>
              <p className="mt-2 text-sm text-slate-600">Answer: {answers[question.id] ?? "None"}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {activity.questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Question {index + 1}</p>
          <p className="mt-1 text-lg font-semibold">{question.prompt}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {question.options.map((option) => (
              <Button
                key={option}
                variant={answers[question.id] === option ? "primary" : "outline"}
                onClick={() => chooseAnswer(question.id, option)}
                className="min-h-16"
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
