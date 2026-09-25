import Image from "next/image";
import { cn } from "@/lib/utils";

/** Bobbing logo and three hopping dots (red, yellow, blue). Motion stops under Reduce motion. */
function Loader({ size, label }: { size: "lg" | "md"; label: string }) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <span
        className={cn(
          "loader-bob grid place-items-center overflow-hidden rounded-[1.75rem] border border-blue-100 bg-[#fff] p-2 shadow-[0_18px_45px_rgba(37,99,235,0.18)]",
          size === "lg" ? "h-24 w-24" : "h-16 w-16 rounded-2xl p-1.5"
        )}
      >
        <Image src="/makalearn_logo_mark.png" alt="" width={128} height={128} className="h-full w-full object-contain" priority />
      </span>
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="loader-dot h-2.5 w-2.5 rounded-full bg-brand-red" />
        <span className="loader-dot h-2.5 w-2.5 rounded-full bg-brand-yellow" />
        <span className="loader-dot h-2.5 w-2.5 rounded-full bg-brand-blue" />
      </span>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
    </div>
  );
}

/** Full-screen loader for the sign-in check and other whole-page waits. */
export function LoadingScreen({ label = "Getting things ready" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Loader size="lg" label={label} />
    </main>
  );
}

/** In-page loader while a page loads its data (Content, Activities). */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Loader size="md" label={label} />
    </div>
  );
}
