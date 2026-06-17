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
    <header className="mb-6 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
        <div className="relative overflow-hidden bg-[#f7fbff] p-5 sm:p-6 lg:p-7">
          <div className="cue-stripes absolute inset-y-0 right-0 hidden w-28 border-l border-blue-100 opacity-70 md:block" />
          <div className="relative">
        {eyebrow ? (
          <p className="mb-2 inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight text-ink md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-blue-100 bg-white p-5 lg:min-w-72 lg:justify-end lg:border-l lg:border-t-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
