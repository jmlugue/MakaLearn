import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className = "", markClassName = "" }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm shadow-blue-900/10",
          markClassName
        )}
      >
        <Image src="/makalearn_logo.png" alt="" width={44} height={44} className="h-full w-full object-contain p-1" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold text-ink">MakaLearn</span>
      </span>
    </span>
  );
}
