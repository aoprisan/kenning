/**
 * Progress persistence. Tries localStorage, falls back silently to memory
 * when storage is unavailable (private mode, sandboxed iframe, file://).
 * Nothing else in the app may touch localStorage directly.
 */
const KEY = "kenning.progress";
const UI_KEY = "kenning.ui";

const mem: Record<string, string> = {};
let usable = false;
try {
  localStorage.setItem("__t", "1");
  localStorage.removeItem("__t");
  usable = true;
} catch { usable = false; }

const get = (k: string): string | null => {
  try { return usable ? localStorage.getItem(k) : (mem[k] ?? null); } catch { return mem[k] ?? null; }
};
const set = (k: string, v: string): void => {
  try { if (usable) localStorage.setItem(k, v); else mem[k] = v; } catch { mem[k] = v; }
};
const del = (k: string): void => {
  try { if (usable) localStorage.removeItem(k); } catch { /* ignore */ }
  delete mem[k];
};

/**
 * Which subject's progress this store reads and writes. Set by `use`; the
 * bare key is only ever seen by the migration below.
 */
let key = KEY;

export interface ModProgress { seen: true; score?: number; total?: number }
export type Progress = Record<string, ModProgress>;

/**
 * Interface state, kept apart from progress so that clearing progress does
 * not also reset which parts of the menu the reader collapsed.
 * `closedLevels` holds `subjectId:levelName` keys — collapsed is the
 * exception, so an unknown level defaults to open. Already scoped by
 * subject, so it stays under one key for the whole app.
 */
export interface Prefs { closedLevels: string[] }

export const Store = {
  /**
   * Binds the store to one subject, before anything reads it. Progress lives
   * under `kenning.progress:<subjectId>`, so two subjects that happen to
   * share a module id keep separate scores.
   *
   * `legacyOwner` names the subject that inherits `kenning.progress`, written
   * back when the app had one namespace for every subject. The move runs once
   * and takes the old key with it; a reader who never switched subjects keeps
   * their scores.
   */
  use(subjectId: string, legacyOwner: string): void {
    key = KEY + ":" + subjectId;
    if (subjectId !== legacyOwner) return;
    const old = get(KEY);
    if (old == null) return;
    if (get(key) == null) set(key, old);
    del(KEY);
  },
  load(): Progress {
    try {
      const v = get(key);
      return v == null ? {} : (JSON.parse(v) as Progress);
    } catch { return {}; }
  },
  save(p: Progress): void {
    set(key, JSON.stringify(p));
  },
  clear(): void {
    del(key);
  },
  loadPrefs(): Prefs {
    try {
      const v = get(UI_KEY);
      const p = v == null ? null : (JSON.parse(v) as Partial<Prefs>);
      return { closedLevels: Array.isArray(p?.closedLevels) ? p.closedLevels : [] };
    } catch { return { closedLevels: [] }; }
  },
  savePrefs(p: Prefs): void {
    set(UI_KEY, JSON.stringify(p));
  },
};
