/**
 * Progress persistence. Tries localStorage, falls back silently to memory
 * when storage is unavailable (private mode, sandboxed iframe, file://).
 * Nothing else in the app may touch localStorage directly.
 */
const KEY = "kenning.progress";
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
};
//# sourceMappingURL=store.js.map