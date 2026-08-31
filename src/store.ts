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

export interface ModProgress { seen: true; score?: number; total?: number }
export type Progress = Record<string, ModProgress>;

/**
 * Interface state, kept apart from progress so that clearing progress does
 * not also reset which parts of the menu the reader collapsed.
 * `closedLevels` holds `subjectId:levelName` keys — collapsed is the
 * exception, so an unknown level defaults to open.
 */
export interface Prefs { closedLevels: string[] }

export const Store = {
  load(): Progress {
    try {
      const v = usable ? localStorage.getItem(KEY) : mem[KEY];
      return v == null ? {} : (JSON.parse(v) as Progress);
    } catch { return {}; }
  },
  save(p: Progress): void {
    try {
      const s = JSON.stringify(p);
      if (usable) localStorage.setItem(KEY, s); else mem[KEY] = s;
    } catch { mem[KEY] = JSON.stringify(p); }
  },
  clear(): void {
    try { if (usable) localStorage.removeItem(KEY); } catch { /* ignore */ }
    delete mem[KEY];
  },
  loadPrefs(): Prefs {
    try {
      const v = usable ? localStorage.getItem(UI_KEY) : mem[UI_KEY];
      const p = v == null ? null : (JSON.parse(v) as Partial<Prefs>);
      return { closedLevels: Array.isArray(p?.closedLevels) ? p.closedLevels : [] };
    } catch { return { closedLevels: [] }; }
  },
  savePrefs(p: Prefs): void {
    try {
      const s = JSON.stringify(p);
      if (usable) localStorage.setItem(UI_KEY, s); else mem[UI_KEY] = s;
    } catch { mem[UI_KEY] = JSON.stringify(p); }
  },
};
