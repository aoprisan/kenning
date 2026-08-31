import { electro } from "./electro/index.js";
import { dsys } from "./dsys/index.js";
import { crypto } from "./crypto/index.js";
import { os } from "./os/index.js";
import { arch } from "./arch/index.js";
/** Every subject the app knows about. Add new ones here. */
export const SUBJECTS = [electro, dsys, crypto, os, arch];
/** The subject rendered when nothing else is asked for. */
export const fallback = electro;
/**
 * `?subject=<id>` renders another registered subject, so one still being
 * written can be reviewed in the browser without changing the default.
 * An unknown id falls back rather than blanking the page.
 */
const requested = typeof location !== "undefined" && location.search
    ? new URLSearchParams(location.search).get("subject")
    : null;
/** The subject rendered on load. */
export const active = SUBJECTS.find((s) => s.id === requested) ?? fallback;
/**
 * The URL that opens `id`, keeping every other query parameter intact.
 * Switching subject is a fresh page load: `active` is resolved once, at
 * import time, and the whole app is built around it.
 */
export function subjectHref(id, search) {
    const p = new URLSearchParams(search);
    p.set("subject", id);
    return "?" + p.toString();
}
//# sourceMappingURL=index.js.map