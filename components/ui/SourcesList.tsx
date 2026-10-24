import type { SourceLink } from "@/data/types";

export function SourcesList({ sources }: { sources: SourceLink[] }) {
  return (
    <ul className="space-y-3">
      {sources.map((s) => (
        <li key={s.url} className="panel p-4">
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-heading text-lg text-bandage underline decoration-rust-bright underline-offset-4 hover:text-sick">
            {s.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="mt-1 text-sm text-fog">{s.note}</p>
          <p className="mt-1 break-all text-xs text-fog-dim">{s.url.replace(/^https:\/\/(www\.)?/, "")}</p>
        </li>
      ))}
    </ul>
  );
}
