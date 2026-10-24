import Link from "next/link";
import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-fog/10 px-4 py-10 text-sm text-fog-dim no-print">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>{site.disclaimer}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link className="hover:text-bandage" href="/sources">
            Sources
          </Link>
          <Link className="hover:text-bandage" href="/progress">
            Progress
          </Link>
          <Link className="hover:text-bandage" href="/gallery">
            Gallery
          </Link>
          <Link className="hover:text-bandage" href="/booth">
            Scare test
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-4 max-w-6xl text-xs text-fog-dim/80">
        All models are procedural and every sound is synthesised in your browser. Photos never leave your device.
      </p>
    </footer>
  );
}
