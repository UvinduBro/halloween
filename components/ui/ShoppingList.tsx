"use client";

import { useState } from "react";
import type { ShopItem } from "@/data/types";
import { useStore } from "@/lib/store";
import { useRT } from "./Vars";

export function shopCheckId(item: ShopItem) {
  return `shop:${item.id}`;
}

export function ShoppingList({ items, title }: { items: ShopItem[]; title: string }) {
  const checks = useStore((s) => s.checks);
  const toggle = useStore((s) => s.toggleCheck);
  const rt = useRT();
  const [copied, setCopied] = useState(false);
  const groups = [...new Set(items.map((i) => i.group))];
  const have = items.filter((i) => checks[shopCheckId(i)]).length;

  const copy = async () => {
    const text = [
      `${title} — shopping list`,
      ...groups.flatMap((g) => [
        "",
        `${g}:`,
        ...items.filter((i) => i.group === g).map((i) => `${checks[shopCheckId(i)] ? "[x]" : "[ ]"} ${rt(i.text)}`),
      ]),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the list:", text);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-xl text-bandage">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-fog-dim">
            {have} / {items.length}
          </span>
          <button type="button" onClick={copy} className="min-h-11 border border-fog/20 px-3 text-sm hover:text-bandage">
            {copied ? "Copied" : "Copy as text"}
          </button>
        </div>
      </div>
      {groups.map((g) => (
        <fieldset key={g} className="mt-4">
          <legend className="text-xs uppercase tracking-widest text-sick">{g}</legend>
          <ul className="mt-1">
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const checked = !!checks[shopCheckId(i)];
                return (
                  <li key={i.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-fog/5 py-1">
                      <input type="checkbox" checked={checked} onChange={() => toggle(shopCheckId(i))} className="size-5 shrink-0 accent-[#9FA87A]" />
                      <span className={checked ? "text-fog-dim line-through" : "text-fog"}>{rt(i.text)}</span>
                    </label>
                  </li>
                );
              })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
