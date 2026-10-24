"use client";

import { useEffect, useRef } from "react";
import { heroFigures } from "@/data/site";
import type { CharacterId } from "@/data/types";
import type { HeroAsset } from "@/lib/heroState";

/**
 * A cheap 2D stand-in for the 3D hero, drawn on a canvas after page load (canvas is not an LCP
 * candidate and costs no WebGL). The full scene replaces it on the first interaction.
 */
export function HeroPoster({ assets, mobile }: { assets: Record<CharacterId, HeroAsset>; mobile: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const images: Partial<Record<CharacterId, { img: CanvasImageSource & { width: number; height: number }; frames: number }>> = {};

    const draw = () => {
      const c = ref.current;
      if (!c || cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      const spread = mobile ? 0.26 : 0.085;
      (["uvi", "ruvi"] as CharacterId[]).forEach((id, i) => {
        const cx = w * (0.5 + (i ? spread : -spread));
        const figH = h * (mobile ? 0.8 : 0.78);
        const base = h * 0.9;
        // back glow
        const g = ctx.createRadialGradient(cx, base - figH * 0.55, 0, cx, base - figH * 0.55, figH * 0.55);
        g.addColorStop(0, `${heroFigures[id].rim}55`);
        g.addColorStop(1, `${heroFigures[id].rim}00`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - figH, base - figH * 1.2, figH * 2, figH * 1.3);
        const entry = images[id];
        if (entry) {
          const { img, frames } = entry;
          const fw = img.width / frames;
          const fh = img.height;
          const dw = (figH * fw) / fh;
          ctx.globalAlpha = 0.92;
          ctx.drawImage(img, 0, 0, fw, fh, cx - dw / 2, base - figH, dw, figH);
          ctx.globalAlpha = 1;
        } else {
          // silhouette for procedural / model figures
          const sg = ctx.createLinearGradient(0, base - figH, 0, base);
          sg.addColorStop(0, "rgba(201,196,186,0.18)");
          sg.addColorStop(1, "rgba(201,196,186,0)");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.ellipse(cx, base - figH * 0.88, figH * 0.06, figH * 0.08, 0, 0, Math.PI * 2);
          ctx.moveTo(cx - figH * 0.12, base - figH * 0.78);
          ctx.lineTo(cx + figH * 0.12, base - figH * 0.78);
          ctx.lineTo(cx + figH * 0.2, base);
          ctx.lineTo(cx - figH * 0.2, base);
          ctx.fill();
        }
      });
      // ground fog
      const fog = ctx.createLinearGradient(0, h * 0.55, 0, h);
      fog.addColorStop(0, "rgba(14,13,12,0)");
      fog.addColorStop(1, "rgba(14,13,12,0.85)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, w, h);
    };

    const load = () => {
      (["uvi", "ruvi"] as CharacterId[]).forEach((id) => {
        const a = assets[id];
        const src = a.kind === "sheet" ? a.url : a.kind === "frames" ? a.urls[0] : null;
        if (!src) return;
        // decode off the main thread, then draw
        void fetch(src)
          .then((r) => r.blob())
          .then((b) => createImageBitmap(b))
          .then((bmp) => {
            if (cancelled) return;
            images[id] = { img: bmp, frames: a.kind === "sheet" ? 4 : 1 };
            draw();
          })
          .catch(() => {});
      });
      draw();
    };

    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const later = () => (w.requestIdleCallback ? w.requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 300));
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("load", later);
    };
  }, [assets, mobile]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
