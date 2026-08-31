# Kenning

Interactive learning modules. Each subject teaches through four surfaces:
theory prose, an animated SVG you can manipulate, a calculator, and a quiz
that can be failed. The quiz is the point — notes without testing are a
collection, not learning.

## Hard constraints

- **No bundler, no framework, no runtime dependencies.** TypeScript compiles
  with `tsc` alone to plain ES modules in `dist/`. That is the entire build.
- **`dist/` is committed.** GitHub Pages serves the repo root. Run
  `just build` before pushing or CI fails.
- **Imports carry the `.js` extension** even though the sources are `.ts`
  (`import { rd } from "../../helpers.js"`). `tsc` does not rewrite specifiers.
- **All colour and type come from the `:root` tokens in `styles.css`.**
  Never hardcode a hex outside that block. The animation palette in
  `src/anim/runtime.ts` mirrors those tokens — change both together.
- **`localStorage` is touched only by `src/store.ts`.** It falls back to
  memory when storage is unavailable; nothing else may bypass it.
- **`prefers-reduced-motion` is respected.** Animations start paused.

## Layout

```
index.html            shell; loads dist/main.js as a module
styles.css            all styling, tokens first
src/types.ts          contracts for Anim, Calc, Module, Question, Subject
src/helpers.ts        F, W, num, rd, shuffle
src/store.ts          guarded progress persistence
src/quiz.ts           quiz state machine and rendering
src/app.ts            routing, nav, tabs, wiring
src/anim/runtime.ts   frame loop, dot pools, path helpers, palette
src/calc/runtime.ts   calculator rendering and wiring
src/modules/<id>/     one folder per subject
tests/smoke.mjs       maths sweep, no DOM
tests/render.mjs      full jsdom render of every module and tab
```

## Adding a subject

Create `src/modules/<id>/` with `curriculum.ts`, `questions.ts`, `anims.ts`,
`calcs.ts`, and an `index.ts` exporting a `Subject`. Register it in
`src/modules/index.ts`. Follow `electro` exactly — it is the reference.

## Animation contract

`{ title, caption, controls?, svg, init?(E), draw(t, c, E) }`

- `svg` marks the elements the loop touches with `data-e="name"`; the runtime
  collects them into `E`.
- `draw` runs every frame with elapsed seconds. It must be a pure function of
  `(t, c)` — the only permitted mutable state lives on `E._`-prefixed keys.
- **Never set an SVG attribute to `NaN`, `undefined`, or `null`.**
  `tests/smoke.mjs` sweeps every control to its extremes and fails on this.
- Annotate each animation's control shape:
  `draw(t: number, c: { U: number; R: number }, E: Els)`. Do not fall back to
  the default `CtlValues`.

## Content rules

- The `electro` subject is written in Romanian. The terminology matches ANRE
  usage and is what gets examined; do not translate it to English.
- **Do not invent normative values.** Disconnection times, insulation minima,
  earthing resistances, section tables, curve multipliers: if the value is not
  already in the repo, leave a `TODO` and say so in your reply. A plausible
  wrong number in this domain is worse than a gap, because it will be trusted.
- Question format: `[moduleId, text, [4 options], correctIndex, explanation]`.
  The explanation says why the distractors are wrong, not only why the answer
  is right. Four options, always.
- Every module needs at least one question, or `tests/smoke.mjs` fails.

## Before finishing any task

Run `just check && just test`. Both must pass. Do not report a task complete
on the strength of reading the code.
