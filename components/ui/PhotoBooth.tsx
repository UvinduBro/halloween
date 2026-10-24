"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { addPhoto } from "@/lib/idb";
import { useMotionAllowed } from "@/lib/hooks";
import { SectionHeading } from "./Section";

/** Grain + flicker + red tint, applied on a 2D canvas. Everything stays on the device. */
function scareFilter(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, flicker: boolean) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const f = flicker ? 0.82 + 0.18 * Math.abs(Math.sin(t * 0.013)) * (Math.random() > 0.93 ? 0.4 : 1) : 0.92;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const n = (Math.random() - 0.5) * 60;
    // crushed contrast, red-tinted monochrome
    const c = Math.max(0, Math.min(255, (l - 128) * 1.35 + 118 + n)) * f;
    d[i] = Math.min(255, c * 1.15 + 18);
    d[i + 1] = c * 0.62;
    d[i + 2] = c * 0.56;
  }
  ctx.putImageData(img, 0, 0);
  // vignette
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // scan lines
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

export function PhotoBooth() {
  const motion = useMotionAllowed();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [shot, setShot] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const uploadId = useId();

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
  }, []);

  const start = useCallback(
    async (mode = facing) => {
      setMsg(null);
      setShot(null);
      try {
        stop();
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 960 } }, audio: false });
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play();
        }
        setLive(true);
      } catch {
        setMsg("No camera available, or permission was denied. You can still upload a photo below.");
      }
    },
    [facing, stop],
  );

  useEffect(() => stop, [stop]);

  // render loop
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const draw = (t: number) => {
      const v = video.current;
      const c = canvas.current;
      if (v && c && v.videoWidth) {
        const w = 480;
        const h = Math.round((v.videoHeight / v.videoWidth) * w);
        if (c.width !== w) {
          c.width = w;
          c.height = h;
        }
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.save();
        if (facing === "user") {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, w, h);
        ctx.restore();
        scareFilter(ctx, w, h, t, motion);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [live, facing, motion]);

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const out = document.createElement("canvas");
    out.width = Math.min(1280, v.videoWidth);
    out.height = Math.round((v.videoHeight / v.videoWidth) * out.width);
    const ctx = out.getContext("2d", { willReadFrequently: true })!;
    if (facing === "user") {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, out.width, out.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    scareFilter(ctx, out.width, out.height, performance.now(), false);
    setShot(out.toDataURL("image/jpeg", 0.9));
    stop();
  };

  const fromFile = (f: File | undefined) => {
    if (!f) return;
    const img = new window.Image();
    img.onload = () => {
      const out = document.createElement("canvas");
      out.width = Math.min(1280, img.naturalWidth);
      out.height = Math.round((img.naturalHeight / img.naturalWidth) * out.width);
      const ctx = out.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, out.width, out.height);
      scareFilter(ctx, out.width, out.height, 0, false);
      setShot(out.toDataURL("image/jpeg", 0.9));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  const save = async () => {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    await addPhoto(blob, "Scare test");
    setMsg("Saved to your gallery.");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <SectionHeading kicker="Do not look away" title="Scare test" />
      <p className="text-fog">Take a photo in costume and see how it reads in the dark. Processed on your device only; nothing is uploaded.</p>
      <div className="grainy-frame mt-6">
        {shot ? (
          <Image src={shot} alt="Your scare-test photo with grain and a red tint" width={1280} height={960} unoptimized className="h-auto w-full" />
        ) : (
          <canvas ref={canvas} className={`block h-auto w-full ${live ? "" : "hidden"}`} role="img" aria-label="Live camera preview with grain, flicker and red tint" />
        )}
        {!live && !shot && <div className="flex aspect-[4/3] items-center justify-center font-heading text-xl text-fog-dim">The lens is dark.</div>}
      </div>
      <video ref={video} className="hidden" playsInline muted />
      <div className="mt-4 flex flex-wrap gap-2">
        {!live ? (
          <button type="button" onClick={() => void start()} className="min-h-11 bg-blood px-5 font-heading text-lg text-bandage hover:bg-blood-bright">
            {shot ? "Retake" : "Start camera"}
          </button>
        ) : (
          <>
            <button type="button" onClick={capture} className="min-h-11 bg-blood px-5 font-heading text-lg text-bandage hover:bg-blood-bright">
              Take photo
            </button>
            <button
              type="button"
              onClick={() => {
                const next = facing === "user" ? "environment" : "user";
                setFacing(next);
                void start(next);
              }}
              className="min-h-11 border border-fog/30 px-4 text-fog hover:text-bandage"
            >
              Switch camera
            </button>
            <button type="button" onClick={stop} className="min-h-11 px-4 text-fog-dim underline">
              Stop
            </button>
          </>
        )}
        <label htmlFor={uploadId} className="inline-flex min-h-11 cursor-pointer items-center border border-fog/30 px-4 text-fog hover:text-bandage">
          Upload a photo
        </label>
        <input id={uploadId} type="file" accept="image/*" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
        {shot && (
          <>
            <a href={shot} download="scare-test.jpg" className="inline-flex min-h-11 items-center border border-sick/50 px-4 text-sick hover:bg-sick/10">
              Download
            </a>
            <button type="button" onClick={() => void save()} className="min-h-11 border border-sick/50 px-4 text-sick hover:bg-sick/10">
              Save to gallery
            </button>
          </>
        )}
      </div>
      {msg && (
        <p className="mt-3 text-sick" role="status">
          {msg} {msg.startsWith("Saved") && <Link href="/gallery" className="underline">Open gallery</Link>}
        </p>
      )}
    </div>
  );
}
