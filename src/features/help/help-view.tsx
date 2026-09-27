"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, HelpCircle, PlayCircle, RotateCcw, SearchX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast-provider";
import { useAuthState } from "@/features/auth/use-auth-user";
import { SearchInput } from "@/features/admin/admin-shared";
import { GuideStepsDialog } from "@/features/guide/guide-steps-dialog";
import { HelpDemoDialog } from "@/features/help/help-demo";
import { contentHelpDemos } from "@/features/help/help-demo-scenes";
import { moreHelpDemos } from "@/features/help/help-demo-more";

/** Help topic id to its Show me animation. Every guide has one; a topic without one would open the step cards. */
const helpDemos = { ...contentHelpDemos, ...moreHelpDemos };
import { helpFaqsFor, helpTopicsFor, matchesHelp, type HelpTopic } from "@/features/help/help-content";
import { useUserSettings } from "@/features/settings/user-settings-context";
import { useStudentMode } from "@/features/student-mode/student-mode-context";

const goThereClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200/80 bg-white/60 px-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";

/**
 * Help: searchable guides, a Go there button for each, and FAQs. Show me plays an animated copy of the real screens
 * for guides that have one (`helpDemos`); the rest open as short animated steps.
 */
export function HelpView() {
  const { user } = useAuthState();
  const { resetGuide } = useUserSettings();
  const { enterStudentMode } = useStudentMode();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [openTopic, setOpenTopic] = useState<HelpTopic | null>(null);
  const role = user?.role ?? "teacher";

  const topics = helpTopicsFor(role).filter((topic) =>
    matchesHelp(search, topic.title, topic.summary, ...topic.steps.flatMap((step) => [step.title, step.text]))
  );
  const faqs = helpFaqsFor(role).filter((faq) => matchesHelp(search, faq.question, faq.answer));

  async function replayTour() {
    const ok = await resetGuide();
    notify(
      ok
        ? { title: "Tour reset", description: "The welcome tour and page intros will show again.", tone: "success" }
        : { title: "Tour reset on this device", description: "It could not be saved to your account.", tone: "info" }
    );
  }

  return (
    <>
      <PageHeader
        title="Help"
        icon={HelpCircle}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={replayTour}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Replay tour
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput label="Search help" placeholder="Search help" value={search} onChange={setSearch} />
      </div>

      <section aria-labelledby="help-howtos">
        <h2 id="help-howtos" className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Guides
        </h2>
        {topics.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => {
              const Icon = topic.icon;
              return (
                <article
                  key={topic.id}
                  className="flex flex-col rounded-2xl border border-white/80 bg-white/75 p-4 shadow-soft backdrop-blur-xl"
                >
                  <button
                    type="button"
                    onClick={() => setOpenTopic(topic)}
                    className="flex flex-1 items-start gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-bold text-ink">{topic.title}</span>
                      <span className="mt-0.5 block text-sm leading-5 text-slate-600">{topic.summary}</span>
                    </span>
                  </button>
                  <div className="mt-4 flex gap-2">
                    <Button type="button" size="sm" onClick={() => setOpenTopic(topic)}>
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      Show me
                    </Button>
                    <GoThere topic={topic} onStudentMode={enterStudentMode} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <NoMatches />
        )}
      </section>

      <section aria-labelledby="help-faqs" className="mt-8">
        <h2 id="help-faqs" className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Frequently asked questions
        </h2>
        {faqs.length ? (
          <div className="divide-y divide-blue-100 rounded-2xl border border-white/80 bg-white/75 px-5 py-1 shadow-soft backdrop-blur-xl">
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
        ) : (
          <NoMatches />
        )}
      </section>

      <HelpDemoDialog
        open={Boolean(openTopic && helpDemos[openTopic.id])}
        title={openTopic?.title ?? ""}
        scenes={openTopic ? helpDemos[openTopic.id] ?? [] : []}
        goThere={openTopic ? <GoThere topic={openTopic} onStudentMode={enterStudentMode} primary /> : null}
        onClose={() => setOpenTopic(null)}
      />
      <GuideStepsDialog
        open={Boolean(openTopic && !helpDemos[openTopic.id])}
        title={openTopic?.title ?? ""}
        steps={openTopic?.steps ?? []}
        onClose={() => setOpenTopic(null)}
      />
    </>
  );
}

/**
 * Opens the page. Student mode pages (Playground, Gesture practice, Student mode activities) turn Student mode on and
 * open there. `primary` is the solid version used at the end of a Show me.
 */
function GoThere({ topic, onStudentMode, primary = false }: { topic: HelpTopic; onStudentMode: (startAt?: string) => void; primary?: boolean }) {
  const className = primary
    ? "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    : goThereClass;
  const content = (
    <>
      Go there
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </>
  );
  return topic.studentStart ? (
    <button type="button" className={className} onClick={() => onStudentMode(topic.studentStart === "menu" ? undefined : topic.studentStart)}>
      {content}
    </button>
  ) : (
    <Link href={topic.href} className={className}>
      {content}
    </Link>
  );
}

function NoMatches() {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-blue-200 bg-white/50 py-8 text-center">
      <SearchX className="h-7 w-7 text-blue-300" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-slate-500">Nothing matches. Try another word.</p>
    </div>
  );
}
