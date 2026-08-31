import type { Subject } from "../types.js";
import { electro } from "./electro/index.js";

/** Every subject the app knows about. Add new ones here. */
export const SUBJECTS: Subject[] = [electro];

/** The subject rendered on load. */
export const active: Subject = electro;
