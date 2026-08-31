import type { Anim } from "../../types.js";

/**
 * Distributed-systems animations. Each entry is keyed by module id; a module
 * without an entry simply has no visual tab. See the animation contract in
 * CLAUDE.md — `draw` is a pure function of `(t, c)` and must never set an
 * attribute to NaN at any control extreme.
 */
export const anims: Record<string, Anim<any>> = {

};
