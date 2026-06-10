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
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-600">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold text-ink md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
