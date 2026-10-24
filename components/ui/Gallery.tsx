"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { addPhoto, deletePhoto, listPhotos, updateCaption, type Photo } from "@/lib/idb";
import { SectionHeading } from "./Section";

interface Shown extends Photo {
  url: string;
}

export function Gallery() {
  const [photos, setPhotos] = useState<Shown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const inputId = useId();

  const refresh = useCallback(async () => {
    try {
      const list = await listPhotos();
      setPhotos((old) => {
        old.forEach((p) => URL.revokeObjectURL(p.url));
        return list.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) }));
      });
    } catch {
      setError("This browser blocked local storage for photos (private mode?).");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) if (f.type.startsWith("image/")) await addPhoto(f, f.name.replace(/\.[^.]+$/, ""));
    await refresh();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading kicker="Proof you were there" title="Gallery" />
      <p className="max-w-2xl text-fog">
        Add photos of your costumes in progress. They are stored only in this browser (IndexedDB) and never uploaded.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center bg-blood px-5 font-heading text-lg text-bandage hover:bg-blood-bright">
          Add photos
        </label>
        <input id={inputId} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
        <Link href="/booth" className="inline-flex rounded-full min-h-11 items-center border border-fog/30 px-4 text-fog hover:text-bandage">
          Take a scare-test photo →
        </Link>
      </div>
      {error && <p className="mt-4 text-blood-text">{error}</p>}
      <div className="min-h-[16rem]">
        {ready && !photos.length && !error && <p className="mt-10 font-heading text-xl text-fog-dim">Nothing here yet. The frames are waiting.</p>}
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id}>
              <figure>
                <div className="grainy-frame">
                  <Image
                    src={p.url}
                    alt={p.caption ? `Costume photo: ${p.caption}` : `Costume photo added ${new Date(p.createdAt).toLocaleDateString("en-GB")}`}
                    width={600}
                    height={800}
                    unoptimized
                    className="aspect-[3/4] h-auto w-full object-cover grayscale-[35%] sepia-[20%]"
                  />
                </div>
                <figcaption className="mt-2 flex items-center gap-2">
                  <label className="sr-only" htmlFor={`cap-${p.id}`}>
                    Caption
                  </label>
                  <input
                    id={`cap-${p.id}`}
                    defaultValue={p.caption}
                    placeholder="Caption"
                    onBlur={(e) => void updateCaption(p.id, e.target.value)}
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-fog/20 bg-ash px-2 text-sm text-bandage"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await deletePhoto(p.id);
                      await refresh();
                    }}
                    className="min-h-11 px-3 text-sm text-fog-dim underline hover:text-blood-text"
                  >
                    Delete
                  </button>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
