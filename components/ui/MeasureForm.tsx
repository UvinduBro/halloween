"use client";

import { useId, useState } from "react";
import { ruviMeasureFields, type RuviMeasurements } from "@/data/ruvi";
import { uviMeasureFields, type UviMeasurements } from "@/data/uvi";
import type { CharacterId, MeasureField } from "@/data/types";
import { useStore } from "@/lib/store";
import { convNum, fromCm, toCm } from "@/lib/units";
import { MeasureFigure } from "./MeasureFigure";
import { RT } from "./Vars";

function Field<K extends string>({
  field,
  value,
  onChange,
}: {
  field: MeasureField<K>;
  value: number;
  onChange: (cm: number) => void;
}) {
  const unit = useStore((s) => s.unit);
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? convNum(value, unit, 1);
  const step = unit === "in" ? 0.25 : field.step;

  const commit = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n) && n > 0) {
      const cm = Math.min(field.max, Math.max(field.min, toCm(n, unit)));
      onChange(Math.round(cm * 10) / 10);
    }
    setDraft(null);
  };

  return (
    <div className="flex gap-3 panel p-3">
      <MeasureFigure kind={field.figure} label={field.label} />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="font-heading text-lg text-bandage">
          {field.label}
        </label>
        <RT as="p" className="mt-0.5 text-sm text-fog-dim" text={field.how} />
        <div className="mt-2 flex items-center gap-2">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={step}
            min={convNum(field.min, unit)}
            max={convNum(field.max, unit)}
            value={shown}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            }}
            className="min-h-11 w-24 rounded-lg border border-fog/20 bg-ash px-2 text-bandage"
          />
          <span className="text-sm text-fog-dim">{unit}</span>
          <input
            type="range"
            aria-label={`${field.label} slider`}
            min={fromCm(field.min, unit)}
            max={fromCm(field.max, unit)}
            step={step}
            value={fromCm(value, unit)}
            onChange={(e) => onChange(Math.round(toCm(Number(e.target.value), unit) * 10) / 10)}
            className="h-11 min-w-0 flex-1 accent-[#c06a35]"
          />
        </div>
      </div>
    </div>
  );
}

export function MeasureForm({ character }: { character: CharacterId }) {
  const uvi = useStore((s) => s.uvi);
  const ruvi = useStore((s) => s.ruvi);
  const setUvi = useStore((s) => s.setUvi);
  const setRuvi = useStore((s) => s.setRuvi);

  if (character === "uvi") {
    return (
      <div className="grid content-start items-start gap-3 md:grid-cols-2">
        {uviMeasureFields.map((f) => (
          <Field key={f.key} field={f} value={uvi[f.key]} onChange={(cm) => setUvi({ [f.key]: cm } as Partial<UviMeasurements>)} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid content-start items-start gap-3 md:grid-cols-2">
      {ruviMeasureFields.map((f) => (
        <Field key={f.key} field={f} value={ruvi[f.key]} onChange={(cm) => setRuvi({ [f.key]: cm } as Partial<RuviMeasurements>)} />
      ))}
    </div>
  );
}

export function Profiles({ character }: { character: CharacterId }) {
  const profiles = useStore((s) => s.profiles).filter((p) => p.character === character);
  const save = useStore((s) => s.saveProfile);
  const load = useStore((s) => s.loadProfile);
  const del = useStore((s) => s.deleteProfile);
  const reset = useStore((s) => s.resetMeasurements);
  const defaultName = character === "uvi" ? "Uvi" : "Ruvi";
  const [name, setName] = useState(defaultName);
  const id = useId();

  return (
    <div className="panel p-4">
      <h3 className="font-heading text-xl text-bandage">Profiles</h3>
      <p className="mt-1 text-sm text-fog-dim">Saved in this browser. Loading a profile updates the 3D, templates and every number on the page.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={id} className="block text-xs uppercase tracking-widest text-fog-dim">
            Profile name
          </label>
          <input id={id} value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-lg border border-fog/20 bg-ash px-2 text-bandage" />
        </div>
        <button type="button" onClick={() => save(character, name.trim() || defaultName)} className="min-h-11 bg-blood px-4 text-bandage hover:bg-blood-bright">
          Save profile
        </button>
        <button type="button" onClick={() => reset(character)} className="min-h-11 border border-fog/20 px-4 hover:text-bandage">
          Reset to defaults
        </button>
      </div>
      {profiles.length > 0 && (
        <ul className="mt-3 divide-y divide-fog/10">
          {profiles.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-bandage">
                {p.name} <span className="text-xs text-fog-dim">· {new Date(p.savedAt).toLocaleDateString("en-GB")}</span>
              </span>
              <span className="flex gap-2">
                <button type="button" onClick={() => load(p.id)} className="min-h-11 border border-sick/40 px-3 text-sm text-sick hover:bg-sick/10">
                  Load
                </button>
                <button type="button" onClick={() => del(p.id)} className="min-h-11 px-3 text-sm text-fog-dim underline hover:text-bandage">
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
