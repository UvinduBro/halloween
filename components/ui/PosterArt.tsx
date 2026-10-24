import Image from "next/image";
import type { PosterArt as Art } from "@/lib/assets";

/**
 * One frame of a character sheet as an image (the sheet is cropped by overflow, not re-encoded).
 * Falls back to a stylised silhouette when there is no art.
 */
export function PosterArt({
  art,
  alt,
  className = "",
  priority = false,
  frameVw = [60, 30],
}: {
  art: Art | null;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Displayed frame width in vw on [mobile, desktop]; the sheet image is `frames` times wider. */
  frameVw?: [number, number];
}) {
  if (!art) {
    return (
      <div className={`relative ${className}`} role="img" aria-label={alt}>
        <svg viewBox="0 0 100 260" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="sil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9c4ba" stopOpacity="0.35" />
              <stop offset="1" stopColor="#c9c4ba" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="30" rx="14" ry="18" fill="url(#sil)" />
          <path d="M30 52 Q50 44 70 52 L84 250 L16 250 Z" fill="url(#sil)" />
        </svg>
      </div>
    );
  }
  const frameAspect = art.width / art.frames / art.height;
  const sizes = `(max-width: 768px) ${frameVw[0] * art.frames}vw, ${frameVw[1] * art.frames}vw`;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${frameAspect}` }}>
      <Image
        src={art.src}
        alt={alt}
        width={art.width}
        height={art.height}
        priority={priority}
        sizes={sizes}
        className="absolute top-0 h-full max-w-none"
        style={{ width: `${art.frames * 100}%`, left: `${-art.frame * 100}%` }}
      />
    </div>
  );
}
