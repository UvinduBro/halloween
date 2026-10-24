"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as U from "@/data/uvi";
import * as R from "@/data/ruvi";
import type { CharacterId, StepGroup } from "@/data/types";
import { Tabs, type TabDef } from "./Tabs";
import { Card, SectionHeading } from "./Section";
import { RT, VarsProvider } from "./Vars";
import { StepList } from "./StepList";
import { ShoppingList } from "./ShoppingList";
import { ScheduleList } from "./ScheduleList";
import { MeasureForm, Profiles } from "./MeasureForm";
import { LiveNumbers } from "./LiveNumbers";
import { SourcesList } from "./SourcesList";
import { DryingTimers } from "./Timers";
import { Countdown } from "./Countdown";
import { ViewerTab } from "./ViewerTab";
import { TemplatesTab } from "./TemplatesTab";
import dynamic from "next/dynamic";
import { FitLab } from "./FitLab";
import { Portal } from "./Portal";

const StepMode = dynamic(() => import("./StepMode").then((m) => m.StepMode), { ssr: false });

const config = {
  uvi: {
    meta: U.uviMeta,
    groups: U.uviSteps,
    paint: [U.paintSteps],
    body: U.uviBody,
    safety: U.uviSafety,
    shopping: U.uviShopping,
    timers: U.uviTimers,
    sources: U.uviSources,
    live: U.uviLiveNumbers,
  },
  ruvi: {
    meta: R.ruviMeta,
    groups: R.ruviSteps,
    paint: [R.weatheringSteps],
    body: R.ruviBody,
    safety: R.ruviSafety,
    shopping: R.ruviShopping,
    timers: R.ruviTimers,
    sources: R.ruviSources,
    live: R.ruviLiveNumbers,
  },
};

function UviCutList() {
  return (
    <section aria-labelledby="cutlist" className="mb-12">
      <SectionHeading kicker="Measure twice. Cut twice." title="Cut list" id="cutlist" />
      <ul className="space-y-3 md:hidden">
        {U.helmetCutList.map((r) => (
          <li key={r.piece} className="border border-fog/10 bg-ash-2/80 p-4">
            <h3 className="font-heading text-lg text-bandage">
              {r.piece} <span className="text-sm text-fog-dim">· {r.qty}</span>
            </h3>
            <RT as="p" className="mt-1 text-fog" text={r.edges} />
            <RT as="p" className="mt-1 text-sm text-fog-dim" text={r.notes} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Helmet cut list</caption>
          <thead>
            <tr className="border-b border-fog/20 text-xs uppercase tracking-widest text-fog-dim">
              <th scope="col" className="py-2 pr-3">Piece</th>
              <th scope="col" className="py-2 pr-3">Qty</th>
              <th scope="col" className="py-2 pr-3">Edges</th>
              <th scope="col" className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {U.helmetCutList.map((r) => (
              <tr key={r.piece} className="border-b border-fog/10 align-top">
                <th scope="row" className="py-3 pr-3 font-heading text-base font-normal text-bandage">{r.piece}</th>
                <td className="py-3 pr-3 text-fog">{r.qty}</td>
                <td className="py-3 pr-3 text-fog"><RT text={r.edges} /></td>
                <td className="py-3 text-fog"><RT text={r.notes} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-fog">
        {U.helmetCutNotes.map((n) => (
          <RT key={n} as="li" text={n} />
        ))}
      </ul>
    </section>
  );
}

function RuviMaskExtras() {
  return (
    <div className="mb-12 grid gap-4 md:grid-cols-2">
      <Card>
        <h3 className="font-heading text-xl text-bandage">Wall layers, inside to outside</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-fog">
          {R.maskSpec.wallLayers.map((l) => (
            <RT key={l} as="li" text={l} />
          ))}
        </ol>
      </Card>
      <Card>
        <h3 className="font-heading text-xl text-bandage">Lumps</h3>
        <p className="mt-1 text-sm text-fog-dim">
          <RT text={`{${R.maskSpec.lumpRange.size}} across and {${R.maskSpec.lumpRange.height}} high. Off-centre, asymmetric, clear of the openings.`} />
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-fog">
          {R.maskSpec.lumps.map((l) => (
            <li key={l.id}>· {l.name}</li>
          ))}
        </ul>
      </Card>
      <Card className="md:col-span-2">
        <p className="text-fog">
          <span className="font-heading text-sick">Split: </span>
          <RT text="cut into front and back halves along a line over the crown, just behind the ears. The back overlaps the front, closed with {4} Velcro tabs." />
        </p>
        <p className="mt-2 text-fog">
          <span className="font-heading text-sick">Openings: </span>
          <RT text="all covered with sheer chiffon only." />
        </p>
        <p className="mt-2 text-fog-dim">{R.maskFallback}</p>
      </Card>
    </div>
  );
}

export function CharacterHub({ character }: { character: CharacterId }) {
  return (
    <VarsProvider character={character}>
      <HubInner character={character} />
    </VarsProvider>
  );
}

function HubInner({ character }: { character: CharacterId }) {
  const c = config[character];
  const [stepMode, setStepMode] = useState<{ group: StepGroup; index: number } | null>(null);
  const allGroups = useMemo(() => [...c.groups, ...c.paint], [c]);
  const openStepMode = (groupId: string, index: number) => {
    const group = allGroups.find((g) => g.id === groupId);
    if (group) setStepMode({ group, index });
  };

  const tabs: TabDef[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading kicker={c.meta.tagline} title={c.meta.build} />
            <div className="prose-horror max-w-2xl text-lg text-fog">
              {c.meta.overview.map((p) => (
                <RT key={p} as="p" text={p} />
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {c.groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openStepMode(g.id, 0)}
                  className="min-h-11 border border-fog/15 bg-ash-2/80 p-4 text-left transition hover:border-blood-bright"
                >
                  <span className="block text-xs uppercase tracking-widest text-sick">{g.kicker}</span>
                  <span className="mt-1 block font-heading text-xl text-bandage">{g.title}</span>
                  <span className="mt-1 block text-sm text-fog-dim">{g.steps.length} steps · open step-by-step</span>
                </button>
              ))}
            </div>
            <p className="mt-6 text-sm text-fog-dim">
              Working together? Open <Link href="/duo" className="underline hover:text-bandage">duo mode</Link> or the{" "}
              <Link href="/progress" className="underline hover:text-bandage">shared progress board</Link>.
            </p>
          </div>
          <Card>
            <ShoppingList items={c.shopping} title={`${c.meta.wearer}'s materials`} />
          </Card>
        </div>
      ),
    },
    {
      id: "measure",
      label: "Measure",
      content: (
        <div>
          <SectionHeading kicker="Hold still" title="Fit lab" />
          <p className="mb-6 max-w-3xl text-fog">
            Enter {c.meta.wearer}&apos;s measurements. The 3D model, every template dimension and every number on this page update as you type.
          </p>
          <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
            <MeasureForm character={character} />
            <div className="space-y-4">
              <FitLab character={character} />
              <LiveNumbers items={c.live} />
              <Profiles character={character} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "3d",
      label: "3D",
      content: <ViewerTab character={character} />,
    },
    {
      id: "build",
      label: "Build",
      content: (
        <div>
          {character === "uvi" && <UviCutList />}
          {c.groups.map((g) => (
            <div key={g.id}>
              <StepList group={g} character={character} timers={c.timers} onStepMode={openStepMode} />
              {g.id === "mask" && <RuviMaskExtras />}
              {g.id === "dress" && <p className="-mt-8 mb-12 text-fog-dim">{R.dressNoSew}</p>}
            </div>
          ))}
          <Card>
            <DryingTimers presets={c.timers} character={character} />
          </Card>
        </div>
      ),
    },
    {
      id: "templates",
      label: "Templates",
      content: <TemplatesTab character={character} />,
    },
    {
      id: "paint",
      label: "Paint",
      content: (
        <div>
          {c.paint.map((g) => (
            <StepList key={g.id} group={g} character={character} timers={c.timers} onStepMode={openStepMode} />
          ))}
          {character === "ruvi" && (
            <Card>
              <h3 className="font-heading text-2xl text-bandage">{R.fakeBlood.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-fog">
                {R.fakeBlood.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="mt-3 text-sick">{R.fakeBlood.note}</p>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: "body",
      label: "Body",
      content: (
        <div className="grid gap-6 md:grid-cols-2">
          {c.body.map((s) => (
            <Card key={s.id}>
              {s.kicker && <p className="font-heading text-xs uppercase tracking-[0.3em] text-sick">{s.kicker}</p>}
              <h3 className="mt-1 font-heading text-2xl text-bandage">{s.title}</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-fog">
                {s.items.map((i) => (
                  <RT key={i} as="li" text={i} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: "safety",
      label: "Safety",
      content: (
        <div>
          <SectionHeading kicker="Come back alive" title="Safety" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.safety.map((s, i) => (
              <li key={s} className="flex gap-3 border border-blood-bright/30 bg-blood/10 p-4 text-bandage">
                <span className="font-heading text-blood-text" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <RT text={s} />
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "schedule",
      label: "Schedule",
      content: (
        <div>
          <SectionHeading kicker="Eight nights" title={`${c.meta.wearer}'s schedule`} />
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <Countdown compact />
            <Link href="/progress" className="min-h-11 border border-fog/20 px-3 py-2.5 text-sm hover:text-bandage">
              Combined board →
            </Link>
          </div>
          <ScheduleList who={character} />
        </div>
      ),
    },
    {
      id: "sources",
      label: "Sources",
      content: (
        <div>
          <SectionHeading kicker="Those who came before" title="Sources" />
          <SourcesList sources={c.sources} />
          <p className="mt-4 text-sm text-fog-dim">
            All sources for both builds: <Link href="/sources" className="underline hover:text-bandage">sources page</Link>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="py-10 sm:py-14">
        <p className="font-heading text-sm uppercase tracking-[0.35em] text-sick">
          Worn by {c.meta.wearer} · {c.meta.build}
        </p>
        <h1 className="glitch mt-2 font-heading text-6xl text-bandage sm:text-8xl">{c.meta.name}</h1>
        <p className="flicker mt-3 font-heading text-2xl text-blood-text">{c.meta.tagline}</p>
      </header>
      <Tabs tabs={tabs} label={`${c.meta.name} build sections`} />
      {stepMode && (
        <Portal>
          <StepMode
            character={character}
            group={stepMode.group}
            start={stepMode.index}
            timers={c.timers}
            onClose={() => setStepMode(null)}
          />
        </Portal>
      )}
    </div>
  );
}
