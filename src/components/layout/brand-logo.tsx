import Image from "next/image";
import { cn } from "@/lib/utils";

/** App logo tile. Uses the cropped mark (no white margin), so it stays readable at 48px. */
export function BrandLogo({ className = "", markClassName = "" }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span
        className={cn(
          "grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-[#fff] p-1 shadow-sm shadow-blue-900/10",
          markClassName
        )}
      >
        <Image src="/makalearn_logo_mark.png" alt="" width={128} height={128} className="h-full w-full object-contain" />
      </span>
    </span>
  );
}
