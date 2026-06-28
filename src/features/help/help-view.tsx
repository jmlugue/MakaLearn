import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

const manualSections = [
  {
    title: "Start a class session",
    steps: [
      "Sign in with a teacher or admin account.",
      "Open Content to review the PECS cards and gesture records for the session.",
      "Use Student Mode when the learner should only access Playground, Gesture Practice, and Activities."
    ]
  },
  {
    title: "Add or update learning content",
    steps: [
      "Open Content, then choose PECS or Gestures on the content board.",
      "Use Add learning item for new records, or Edit on an existing record to update label, category, description, instruction, and tags.",
      "Attach PECS images, gesture image/video references, and audio cues from the upload controls on each content card.",
      "Select a media thumbnail to preview it in a larger viewer."
    ]
  },
  {
    title: "Create lessons",
    steps: [
      "Choose Generate lesson on a PECS or gesture card, or open Lessons and choose Create manual lesson.",
      "Add a clear lesson title, objective, and teaching sequence.",
      "Use Search learning items in the lesson form to find the PECS cards or gestures to include.",
      "Save the lesson. PECS lessons create a related activity. Gesture lessons link to Gesture Practice instead."
    ]
  },
  {
    title: "Run practice",
    steps: [
      "For PECS lessons, choose Open activity from the saved lesson or open Activities directly.",
      "For gesture lessons, choose Practice gesture from the saved lesson and use Gesture Practice.",
      "Use Playground when the learner needs to build a PECS/AAC sentence from cards.",
      "One card is accepted as a valid Playground sentence when the learner is practising a single response."
    ]
  },
  {
    title: "Admin workflow",
    steps: [
      "Admin accounts see the Admin tab at the top of navigation.",
      "Use Admin to review teacher accounts, content activity, uploads, and development tools.",
      "Use Content and Activities to verify shared classroom materials before teachers use them."
    ]
  }
];

const faqs = [
  {
    question: "Why did my gesture lesson open Gesture Practice instead of Activities?",
    answer: "Gesture lessons are practised in Gesture Practice, so they do not create Activity Library records."
  },
  {
    question: "Why does a PECS lesson create an activity automatically?",
    answer: "PECS lessons create a related activity so the teacher can open the practice step directly from the saved lesson."
  },
  {
    question: "Where do I find an activity after creating it?",
    answer: "Open Activities, then choose Activity library. New PECS lesson activities and manually created activities appear there."
  },
  {
    question: "Why is some media shown as placeholder content?",
    answer: "The app does not include official Makaton symbols, gesture videos, or audio yet. Replace placeholders with approved classroom materials."
  },
  {
    question: "Can learners sign in by themselves?",
    answer: "No. In this MVP, teachers sign in and select guided classroom modes for learners."
  },
  {
    question: "What is Student Mode for?",
    answer: "Student Mode hides teacher editing tools and keeps the learner in Playground, Gesture Practice, and Activities."
  },
  {
    question: "Why is Supabase still mentioned if local data works?",
    answer: "The app is local-first for the MVP. Supabase integration points are prepared for auth, storage, and database records later."
  }
];

export function HelpView() {
  return (
    <>
      <PageHeader
        eyebrow="Help / Guide"
        title="MakaLearn manual"
        description="How to navigate the app, prepare lessons, and run guided practice."
      />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-blue-100 bg-white/80 p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">Manual</h2>
          <div className="mt-5 space-y-6">
            {manualSections.map((section) => (
              <section key={section.title} className="border-t border-blue-100 pt-5 first:border-t-0 first:pt-0">
                <h3 className="text-base font-bold text-ink">{section.title}</h3>
                <ol className="mt-3 space-y-2">
                  {section.steps.map((step, index) => (
                    <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 text-sm leading-6 text-slate-700">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-blue-100 bg-white/80 p-5 shadow-sm">
          <h2 className="text-xl font-bold text-ink">FAQs</h2>
          <div className="mt-4 divide-y divide-blue-100">
            {faqs.map((item) => (
              <details key={item.question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink">
                  {item.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-blue-600 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
