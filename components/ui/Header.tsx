"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AudioToggle, CalmToggle, UnitToggle } from "./Toggles";

const links = [
  { href: "/uvi", label: "Uvi" },
  { href: "/ruvi", label: "Ruvi" },
  { href: "/progress", label: "Progress" },
  { href: "/duo", label: "Duo" },
  { href: "/gallery", label: "Gallery" },
  { href: "/booth", label: "Scare test" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-fog/10 bg-ash/95 no-print">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-ash-2 focus:p-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5">
        <Link href="/" className="flex min-h-11 items-center font-heading text-xl text-bandage" aria-label="UVI & RUVI home">
          UVI <span className="mx-1.5 text-blood-text">&amp;</span> RUVI
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={`flex min-h-11 items-center px-3 text-sm transition ${pathname.startsWith(l.href) ? "text-bandage underline decoration-blood-bright underline-offset-8" : "text-fog-dim hover:text-bandage"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <UnitToggle />
          <CalmToggle />
          <AudioToggle />
        </div>
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center border border-fog/20 px-3 text-sm lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-fog/10 bg-ash-2 px-4 pb-4 lg:hidden">
          <nav aria-label="Mobile" className="grid grid-cols-2 gap-1 py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                className="flex min-h-11 items-center border border-fog/10 px-3 text-fog hover:text-bandage"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2 md:hidden">
            <UnitToggle />
            <CalmToggle />
            <AudioToggle />
          </div>
        </div>
      )}
    </header>
  );
}
