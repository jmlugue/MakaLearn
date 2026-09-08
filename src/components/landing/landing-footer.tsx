import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-6 max-w-7xl border-t border-blue-100 py-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm">
            <Image
              src="/makalearn_logo_current.png"
              alt=""
              width={96}
              height={96}
              className="h-full w-full scale-125 object-contain object-center"
            />
          </span>
          <span className="text-lg font-black tracking-[-0.03em] text-ink">MakaLearn</span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
          <Link href="#what-is" className="text-sm font-semibold text-slate-600 hover:text-blue-700">
            What is MakaLearn
          </Link>
          <Link href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-blue-700">
            How it works
          </Link>
          <Link href="/login" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </nav>
      </div>

      <p className="mt-6 text-xs leading-5 text-slate-500">
        Sample cards, sign drawings and audio are reference material. No official Makaton symbols are included.
      </p>
      <p className="mt-2 text-xs text-slate-400">&copy; {new Date().getFullYear()} MakaLearn</p>
    </footer>
  );
}
