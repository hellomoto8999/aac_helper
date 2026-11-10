export interface DocSettings {
  frame: boolean;
  wrap: boolean;
  margin: number;
  paged: boolean;
}

export interface DocSnapshot {
  version: 1;
  html: string;
  settings: DocSettings;
  updatedAt: number;
}

export type SaveResult = "indexeddb" | "localstorage" | "error";

const DB_NAME = "aac-helper";
const DB_VERSION = 1;
const STORE = "autosave";
const KEY = "current";
const LS_KEY = "aac-autosave-v1";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB non disponibile"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  return dbPromise;
}

function normalizeSettings(input: Partial<DocSettings> | undefined): DocSettings {
  const margin = Number(input?.margin);
  return {
    frame: input?.frame !== false,
    wrap: input?.wrap !== false,
    margin: Number.isFinite(margin) ? Math.min(40, Math.max(0, margin)) : 16,
    paged: input?.paged !== false,
  };
}

function isSnapshot(value: unknown): value is DocSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DocSnapshot>;
  return v.version === 1 && typeof v.html === "string";
}

async function idbGet(): Promise<DocSnapshot | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(isSnapshot(req.result) ? req.result : null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
}

async function idbPut(snapshot: DocSnapshot): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(snapshot, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
  });
}

async function idbDelete(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
}

export async function loadAutosave(): Promise<DocSnapshot | null> {
  try {
    const snapshot = await idbGet();
    if (snapshot) return snapshot;
  } catch {
    /* fallback a localStorage */
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) return null;
    return {
      ...parsed,
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    return null;
  }
}

export async function saveAutosave(
  html: string,
  settings: DocSettings,
): Promise<SaveResult> {
  const snapshot: DocSnapshot = {
    version: 1,
    html,
    settings: normalizeSettings(settings),
    updatedAt: Date.now(),
  };

  try {
    await idbPut(snapshot);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    return "indexeddb";
  } catch {
    /* fallback a localStorage */
  }

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    return "localstorage";
  } catch {
    return "error";
  }
}

export async function clearAutosave(): Promise<void> {
  try {
    await idbDelete();
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
