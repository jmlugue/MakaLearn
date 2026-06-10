import { BookOpen, ChartBar, HelpCircle, Library, PlayCircle, Upload } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const guides = [
  {
    icon: Upload,
    title: "Add learning items",
    text: "Open Content Library, use Learning Items, add demo labels, and attach symbol, gesture, and audio placeholder files."
  },
  {
    icon: BookOpen,
    title: "Create lessons",
    text: "Use Generate lesson on an item card or create a manual lesson with objectives, items, instructions, activity type, duration, and notes."
  },
  {
    icon: PlayCircle,
    title: "Use gesture practice",
    text: "Select a learner or stay in demo mode, start the camera, run the attempt, simulate feedback, then save only when a learner is selected."
  },
  {
    icon: Library,
    title: "Run activities",
    text: "Choose an activity, optionally select a learner, answer the prompts, and score the result. Demo mode does not save."
  },
  {
    icon: ChartBar,
    title: "Read progress reports",
    text: "Use Progress to review activity results, practice attempts, accuracy, charts, and the current export placeholder."
  },
  {
    icon: HelpCircle,
    title: "Official content and models",
    text: "Official approved learning content and recognition model data will be added later. Current content is placeholder-only."
  }
];

export function HelpView() {
  return (
    <>
      <PageHeader
        eyebrow="Help / Guide"
        title="Using MakaLearn"
        description="A quick guide for teachers and admins working with the local-first MVP."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((guide) => (
          <Card key={guide.title}>
            <guide.icon className="h-8 w-8 text-blue-600" aria-hidden="true" />
            <CardTitle className="mt-4">{guide.title}</CardTitle>
            <CardDescription>{guide.text}</CardDescription>
          </Card>
        ))}
      </section>
    </>
  );
}
