# UVI & RUVI

A horror-themed, interactive build guide for two Halloween cosplays, built for **31 Oct 2026, 19:00 (Asia/Colombo)**:

- **UVI**: a pyramid-helmet executioner (Pyramid Head–inspired), worn by Uvi.
- **RUVI**: a swollen, bandage-headed nurse (Bubble Head Nurse–inspired), worn by Ruvi.

Every number comes from typed data files and live measurements. The 3D models are procedural, the 1:1 templates are generated from the geometry, and every sound is synthesised in the browser.

> Fan-made cosplay build guide. Not affiliated with or endorsed by any game publisher.

## Features

| Area | What you get |
| --- | --- |
| Landing (`/`) | Glitch title, Colombo countdown, cursor-flashlight reveal, a 3D hero with both figures in shader fog (turntable character sheets, original procedural figures or your own scans), rusted name plates, flashlight mode, duo moment, tilt on phones and an easter egg (type `uvi` or `ruvi`). |
| Hubs (`/uvi`, `/ruvi`) | Sticky, keyboard-accessible tabs: Overview · Measure · 3D · Build · Templates · Paint · Body · Safety · Schedule · Sources. |
| Fit lab | Measurement form with how-to SVGs. The 3D model, every template dimension and every number in the text update live. Named profiles are saved in the browser. |
| 3D viewers | Camera presets, X-ray, measurement labels, exploded slider, assembly scrubber with step text, raw/finished noise shader, dark scene with flashlight, mannequin, screenshot and two-finger touch controls. |
| Templates (`/uvi/print`, `/ruvi/print`) | Flat SVG patterns unfolded from the geometry, tiled on A4 at true 1:1 with 1 cm overlaps, crop marks, A1/A2/B1 page labels and a 10 cm calibration square. Print via CSS `@page`, or use **Export PDF** (jsPDF + svg2pdf.js). |
| Step mode | A full-screen card per step with big text, a mini 3D view, swipe navigation and a Wake Lock toggle. |
| `/progress` | A combined checklist board: the schedule per person, build steps and shopping lists. |
| `/gallery`, `/booth` | Local-only photos in IndexedDB, and a "scare test" photo booth (grain, flicker, red tint) processed on the device. |
| `/duo` | Both builds side by side with linked cameras. |
| Extras | Drying timers with notifications, shopping lists with "copy as text", synthesised ambient audio (off by default), a cm/in toggle, calm mode and support for `prefers-reduced-motion`. |

## Design

A "streaming special" look: each build is an **episode**, with a poster-style header (giant condensed Anton title, outlined subtitle, meta chips, ▶ Play/Resume into step mode, and a "What's next?" panel with your next two steps). Each episode has its own accent: ember `#E8833A` for UVI and formalin `#8FD3C8` for RUVI. Pitch-deck sections (brush-stroke headings, "The plan" big-number stats, "The cast" cards) sit below the landing hero. Panels are rounded "screens" with hairline gradient edges and no backdrop blur, so they stay cheap on phones.

Key art comes from the character sheets: `npm run frames` (also run automatically before `dev` and `build`) slices each sheet into `public/characters/generated/*-frame-N.webp`, so pages load one pose instead of the whole sheet. Below-the-fold art loads after the page.

## Stack

Next.js 16 (App Router, Turbopack, Cache Components), TypeScript (strict), Tailwind CSS 4, three.js with `@react-three/fiber`, `@react-three/drei` and `@react-three/postprocessing`, framer-motion, zustand (persisted to localStorage), jsPDF with svg2pdf.js, and vitest.

## Setup

Requires Node.js 20.9 or newer (22 recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest: geometry (5.1 edge lengths, angles, unfolding, sections, window, scaling), dress pattern, mask and tiling |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run frames` | Slice character sheets into per-pose WebPs for posters |

## Deploy to Vercel

1. Push the repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repository and keep the detected **Next.js** preset (build: `next build`, output: `.next`).
3. Click **Deploy**. Every route is static, so no environment variables are needed.

Or use the CLI: `npm i -g vercel && vercel` (preview), then `vercel --prod`.

Hero assets are detected at **build time**, so redeploy after adding or replacing files in `public/characters` or `public/models`.

## Project structure

```
app/                 routes (landing, hubs, print, progress, gallery, booth, duo, sources)
components/3d/       viewers, models, mask geometry, hero scene and figures
components/ui/       tabs, fit lab, templates, step mode, timers, gate, overlays…
data/                uvi.ts, ruvi.ts, schedule.ts, site.ts (all build data, typed)
lib/                 geometry.ts, uvi.ts, ruvi.ts, templates.ts, tiling.ts, units.ts, store.ts, audio.ts…
lib/__tests__/       vitest suites
public/characters/   character sheets / frames for the hero
public/models/       optional .glb scans for the hero
```

### Editing build data

All instructions and numbers live in `data/*.ts`. Text uses unit tokens, so the inch toggle and the fit lab can rewrite them:

| Token | Renders |
| --- | --- |
| `{32}` | 32 cm (or inches) |
| `{2.5–3}` | a range |
| `{$skirtWidth\|0}` | a live value from `lib/uvi.ts` / `lib/ruvi.ts`, here with 0 decimals |
| `{mm:25}`, `{m:2.5}`, `{m2:3}`, `{ml:500}` | other units |
| `{n:$k}` | a plain number |

The helmet is defined by the six vertices in `data/uvi.ts`. Everything else (panels, angles, formers, window, templates and the 3D model) is derived from them, and the tests check the published edge lengths.

## Hero characters

The hero picks, per character, the first of these that exists (checked at build time):

1. **A 3D model:** `public/models/uvi.glb` / `public/models/ruvi.glb`. For example, a phone scan of the finished costume made with **Polycam**, **Luma AI** or **KIRI Engine** and exported as GLB (aim for under 10 MB; decimate if needed). It is auto-scaled to a 2 m slot, centred and stood on the floor, and keeps every interaction (tracking, hover flare, tap to step forward).
2. **Four separate frames:** `public/characters/uvi-1.png` … `uvi-4.png` (`.webp` also works), in the order front ¾, side right, side left, back.
3. **A character sheet:** `public/characters/uvi-sheet.png` (a `.webp` next to it is preferred). It's one wide image with four equal-width poses in the same order, sliced by UV offset.
4. **The original procedural figures:** *The Lantern Warden* (UVI) and *The Moth Widow* (RUVI).

Add `?figures=original` to the landing URL to see the original figures even when sheets exist.

Sheet backgrounds: if the image has real transparency, its alpha is used. If it's opaque, a shader keys out the background against the sampled corner and edge colours and feathers the edges. Tune `keyStrength` per character in `data/site.ts`; if it still looks rough, export background-removed PNGs. Keep each frame at 2048 px or less (WebP or KTX2 recommended). If the artwork is someone else's, set `credit` in `data/site.ts` to show a credit line under the figure.

The hero is kept off the main thread until the visitor interacts: a 2D canvas poster stands in, and the WebGL scene fades in on the first pointer move, tap, scroll or key press.

## Printing templates

- Print at **100% / Actual size**, A4 portrait, with no "fit to page". Page 1 has a 10 cm calibration square: measure it before cutting.
- Shaded strips are the 1 cm overlaps: trim them and glue under the neighbouring page. Labels run A1, A2… across and A, B… down.
- Blank grid cells are skipped. Long pieces may be rotated 90° to save paper (noted on the cover page).
- Laminate helmet pieces from two layers with crossed corrugation, and flip the side and back templates for the mirrored pieces.

## Accessibility, motion and privacy

- A first-visit content gate offers **Enter** or **Enter with effects off** (calm mode). Calm mode and `prefers-reduced-motion` remove flicker, glitch, jitter and transitions, and freeze the fog.
- Keyboard-accessible tabs (arrow keys, Home, End), visible focus, alt text on generated images, and body-text contrast of at least 4.5:1.
- Audio is off by default and fully synthesised. Photos and measurements never leave the device.

### Lighthouse (mobile, local production build)

Measured in this container with Lighthouse 12 (simulated slow 4G, 4× CPU slowdown). Because the container is noisy, results varied by a few points between runs.

| Page | Performance | Accessibility | Best Practices |
| --- | --- | --- | --- |
| `/` | 92–93 | 100 | 100 |
| `/uvi` | 91 | 100 | 100 |
| `/ruvi` | 89–92 | 100 | 100 |
| `/progress` | 93 | 100 | 100 |
| `/uvi/print` | 94 | 100 | 100 |

3D is excluded from first paint: every WebGL canvas is lazy-loaded with `ssr: false` and mounts only after the first interaction.

## Sources

The tutorials this guide draws on are listed on `/sources` and in each hub's Sources tab.
