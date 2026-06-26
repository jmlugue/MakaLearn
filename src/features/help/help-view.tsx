import { Bot, BookOpen, HelpCircle, Library, PlayCircle, Upload, UserCog } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const guides = [
  {
    icon: Upload,
    title: "Add PECS cards",
    text: "Open Content Library, use Content, choose PECS, and add card labels with image and audio uploads only."
  },
  {
    icon: BookOpen,
    title: "Create lessons",
    text: "Use Generate lesson on a PECS card or create a manual lesson with objectives, PECS cards, instructions, activity type, duration, and notes."
  },
  {
    icon: PlayCircle,
    title: "Use gesture recognition",
    text: "Choose a supported classroom gesture, start the camera, and practise with the live hand outline."
  },
  {
    icon: Library,
    title: "Run activities",
    text: "Choose or create an activity from PECS cards, answer the prompts, and score the session."
  },
  {
    icon: Bot,
    title: "Draft activities",
    text: "In Activity creation, select PECS cards and prepare an editable activity draft before saving."
  },
  {
    icon: UserCog,
    title: "Admin controls",
    text: "Admins create and deactivate teacher accounts, monitor teacher-managed content, review uploads, and check logs."
  },
  {
    icon: HelpCircle,
    title: "Classroom content",
    text: "Use approved classroom materials and review each activity before using it with learners."
  }
];

export function HelpView() {
  return (
    <>
      <PageHeader
        eyebrow="Help / Guide"
        title="Using MakaLearn"
        description="A quick guide for teachers and admins working with MakaLearn."
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
