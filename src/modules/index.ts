import type { Subject } from "../types.js";
import { electro } from "./electro/index.js";
import { dsys } from "./dsys/index.js";
import { crypto } from "./crypto/index.js";

/** Every subject the app knows about. Add new ones here. */
export const SUBJECTS: Subject[] = [electro, dsys, crypto];

/** The subject rendered when nothing else is asked for. */
export const fallback: Subject = electro;

/**
 * `?subject=<id>` renders another registered subject, so one still being
 * written can be reviewed in the browser without changing the default.
 * An unknown id falls back rather than blanking the page.
 */
const requested: string | null =
  typeof location !== "undefined" && location.search
    ? new URLSearchParams(location.search).get("subject")
    : null;

/** The subject rendered on load. */
export const active: Subject = SUBJECTS.find((s) => s.id === requested) ?? fallback;
