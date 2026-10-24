"use client";

import { RT } from "./Vars";

export function LiveNumbers({ items, title = "Live numbers" }: { items: { label: string; text: string }[]; title?: string }) {
  return (
    <div className="panel p-4">
      <h3 className="font-heading text-xl text-bandage">{title}</h3>
      <dl className="mt-2 divide-y divide-fog/10" aria-live="polite">
        {items.map((n) => (
          <div key={n.label} className="flex flex-wrap justify-between gap-x-4 py-2 text-sm">
            <dt className="text-fog-dim">{n.label}</dt>
            <dd className="text-right text-bandage">
              <RT text={n.text} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
