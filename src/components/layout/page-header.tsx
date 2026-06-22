import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="glass-panel mb-6 overflow-hidden rounded-[1.75rem] border">
      <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
        <div className="relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="absolute -right-12 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-blue-300/25 to-cyan-200/10 blur-xl" aria-hidden="true" />
          <div className="relative">
        {eyebrow ? (
          <p className="mb-2 inline-flex rounded-full border border-white/80 bg-white/60 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700 shadow-sm backdrop-blur">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.035em] text-ink md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/70 bg-white/35 p-5 backdrop-blur-xl lg:min-w-72 lg:justify-end lg:border-l lg:border-t-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
