import { electro } from "./electro/index.js";
import { dsys } from "./dsys/index.js";
/** Every subject the app knows about. Add new ones here. */
export const SUBJECTS = [electro, dsys];
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
//# sourceMappingURL=index.js.map