/**
 * Progress persistence. Tries localStorage, falls back silently to memory
 * when storage is unavailable (private mode, sandboxed iframe, file://).
 * Nothing else in the app may touch localStorage directly.
 */
const KEY = "kenning.progress";

const mem: Record<string, string> = {};
let usable = false;
try {
  localStorage.setItem("__t", "1");
  localStorage.removeItem("__t");
  usable = true;
} catch { usable = false; }

export interface ModProgress { seen: true; score?: number; total?: number }
export type Progress = Record<string, ModProgress>;

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
};
