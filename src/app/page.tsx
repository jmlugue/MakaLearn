import Link from "next/link";
import { ArrowRight, BookOpen, Hand, LineChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const highlights = [
  {
    icon: BookOpen,
    title: "Local content library",
    text: "Organize demo learning items, lessons, categories, and media upload placeholders."
  },
  {
    icon: Hand,
    title: "Guided gesture practice",
    text: "Use webcam preview with simulated teacher feedback and learner assignment."
  },
  {
    icon: LineChart,
    title: "Progress view",
    text: "Track local practice attempts and activity scores before backend integration."
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3 text-xl font-bold text-ink">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-900/20">
            ML
          </span>
          <span>MakaLearn</span>
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
        >
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
      <section className="mx-auto grid max-w-7xl items-center gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] lg:min-h-[calc(100vh-8rem)]">
        <div className="relative">
          <p className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm">
            Teacher-guided Makaton learning support
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink md:text-6xl">
            MakaLearn
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            A local-first classroom app for SPED teachers to manage learners, organize placeholder
            learning content, run guided activities, and review progress.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex">
              <Button size="lg">
                Open demo login <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/help" className="inline-flex">
              <Button variant="secondary" size="lg">
                View guide
              </Button>
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-soft">
          <div className="cue-stripes h-8 border-b border-blue-100" />
          <div className="bg-skywash p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">Classroom session</p>
                <h2 className="mt-1 text-2xl font-bold text-ink">Snack Time Requests</h2>
              </div>
              <ShieldCheck className="h-10 w-10 text-blue-600" aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Eat", "Drink", "More"].map((label) => (
                <div key={label} className="rounded-lg border border-blue-100 bg-white p-4 text-center shadow-sm">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-mint text-xl font-bold text-blue-700 shadow-inner">
                    {label.slice(0, 3).toUpperCase()}
                  </div>
                  <p className="mt-3 font-semibold">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-blue-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Ella M.</span>
                <span className="text-blue-700">82% accuracy</span>
              </div>
              <div className="h-3 rounded-full bg-blue-100">
                <div className="h-3 w-4/5 rounded-full bg-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 pb-10 md:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title} className="flex h-full flex-col bg-[#fbfdff]">
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-blue-100 bg-white text-blue-600 shadow-sm">
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
