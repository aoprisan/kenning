/** Shared shapes for every subject module. See CLAUDE.md for the contracts. */

/** A slider control. */
export interface RangeCtl {
  k: string; l: string;
  min: number; max: number; step: number; v: number; u?: string;
}
/** A dropdown control. Values arrive in `draw` as strings. */
export interface SelectCtl {
  k: string; l: string; v: string; sel: [value: string, label: string][];
}
export type Ctl = RangeCtl | SelectCtl;

/**
 * Elements collected from an animation's `data-e` attributes, keyed by name.
 * Deliberately loose: animations touch arbitrary SVG attributes, and keys
 * prefixed with `_` hold the animation's own scratch state.
 */
export type Els = Record<string, any>;

/** Current control values, keyed by `Ctl.k`. Each animation narrows this itself. */
export type CtlValues = Record<string, any>;

export interface Anim<C = CtlValues> {
  title: string;
  caption: string;
  controls?: Ctl[];
  /** Raw SVG. Elements the draw loop needs carry `data-e="name"`. */
  svg: string;
  /** Called once after mount. Create dot pools and scratch state here. */
  init?(E: Els): void;
  /** Called every frame with elapsed seconds. Must never set an attribute to NaN. */
  draw(t: number, c: C, E: Els): void;
}

export interface CalcField {
  k: string; l: string; u: string; v: number | string;
  sel?: [value: string, label: string][];
}
export interface CalcResult {
  lines: [label: string, value: string][];
  ok?: string | null;
  bad?: string | null;
}
export interface Calc {
  title: string; hint: string; fields: CalcField[];
  run(f: Record<string, any>): CalcResult;
}

export interface Module {
  id: string;
  t: string;
  blurb: string;
  /** HTML. Built with the `F` / `W` helpers from `src/helpers.ts`. */
  body: string;
  facts: string[];
  /** Key into the subject's `calcs` registry, or null. */
  calc: string | null;
}
export interface Level { name: string; mods: Module[] }

export type Question = [
  moduleId: string, text: string, options: string[],
  correct: number, explain: string,
];

/** One subject: everything needed to render its modules. */
export interface Subject {
  id: string;
  name: string;
  tagline: string;
  levels: Level[];
  questions: Question[];
  anims: Record<string, Anim<any>>;
  calcs: Record<string, Calc>;
  /** Paragraphs shown in the footer of every module. */
  disclaimer: string[];
}
