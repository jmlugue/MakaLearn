import { BookOpen, ChartBar, HelpCircle, Library, PlayCircle, Upload } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const guides = [
  {
    icon: Upload,
    title: "Add learning items",
    text: "Open Content Library, use Learning Items, add placeholder labels, and attach symbol, gesture, and audio files."
  },
  {
    icon: BookOpen,
    title: "Create lessons",
    text: "Use Generate lesson on an item card or create a manual lesson with objectives, items, instructions, activity type, duration, and notes."
  },
  {
    icon: PlayCircle,
    title: "Use gesture practice",
    text: "Select a learner or practice without one, start the camera, run the attempt, simulate feedback, then save only when a learner is selected."
  },
  {
    icon: Library,
    title: "Run activities",
    text: "Choose an activity, optionally select a learner, answer the prompts, and score the result. Results without a learner are not saved."
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
          <Card key={guide.title} className="flex h-full flex-col bg-[#fbfdff]">
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-blue-100 bg-white text-blue-600 shadow-sm">
              <guide.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <CardTitle className="mt-4">{guide.title}</CardTitle>
            <CardDescription>{guide.text}</CardDescription>
          </Card>
        ))}
      </section>
    </>
  );
}
