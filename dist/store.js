/**
 * Progress persistence. Tries localStorage, falls back silently to memory
 * when storage is unavailable (private mode, sandboxed iframe, file://).
 * Nothing else in the app may touch localStorage directly.
 */
const KEY = "kenning.progress";
const UI_KEY = "kenning.ui";
const mem = {};
let usable = false;
try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    usable = true;
}
catch {
    usable = false;
}
export const Store = {
    load() {
        try {
            const v = usable ? localStorage.getItem(KEY) : mem[KEY];
            return v == null ? {} : JSON.parse(v);
        }
        catch {
            return {};
        }
    },
    save(p) {
        try {
            const s = JSON.stringify(p);
            if (usable)
                localStorage.setItem(KEY, s);
            else
                mem[KEY] = s;
        }
        catch {
            mem[KEY] = JSON.stringify(p);
        }
    },
    clear() {
        try {
            if (usable)
                localStorage.removeItem(KEY);
        }
        catch { /* ignore */ }
        delete mem[KEY];
    },
    loadPrefs() {
        try {
            const v = usable ? localStorage.getItem(UI_KEY) : mem[UI_KEY];
            const p = v == null ? null : JSON.parse(v);
            return { closedLevels: Array.isArray(p?.closedLevels) ? p.closedLevels : [] };
        }
        catch {
            return { closedLevels: [] };
        }
    },
    savePrefs(p) {
        try {
            const s = JSON.stringify(p);
            if (usable)
                localStorage.setItem(UI_KEY, s);
            else
                mem[UI_KEY] = s;
        }
        catch {
            mem[UI_KEY] = JSON.stringify(p);
        }
    },
};
//# sourceMappingURL=store.js.map