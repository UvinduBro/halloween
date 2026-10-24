"use client";

/** Tiny IndexedDB wrapper for local-only costume photos. Nothing is uploaded anywhere. */

export interface Photo {
  id: string;
  blob: Blob;
  caption: string;
  createdAt: number;
}

const DB = "uvi-ruvi";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export async function listPhotos(): Promise<Photo[]> {
  const all = await tx<Photo[]>("readonly", (s) => s.getAll() as IDBRequest<Photo[]>);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addPhoto(blob: Blob, caption = ""): Promise<Photo> {
  const photo: Photo = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, blob, caption, createdAt: Date.now() };
  await tx("readwrite", (s) => s.put(photo));
  return photo;
}

export async function updateCaption(id: string, caption: string) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const s = t.objectStore(STORE);
    const get = s.get(id);
    get.onsuccess = () => {
      const p = get.result as Photo | undefined;
      if (p) s.put({ ...p, caption });
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
}

export async function deletePhoto(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}
