import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Page title row: icon tile and a big page name, with optional actions on the right. No band or box.
 * The icon tile matches the Admin stat card icons (`src/components/common/stat-card.tsx`).
 */
export function PageHeader({ title, icon: Icon, actions }: { title: string; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/80 bg-gradient-to-br from-white/90 to-blue-50/70 text-blue-600 shadow-[0_10px_24px_rgba(37,99,235,0.12)]">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
        ) : null}
        {/* leading-normal + pb-1: truncate hides overflow, and tighter line-height clipped descenders like the "g" in Settings. */}
        <h1 className="truncate pb-1 text-3xl font-extrabold leading-normal tracking-[-0.035em] text-ink md:text-4xl">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
