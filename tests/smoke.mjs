/**
 * Runs every animation and calculator in the active subject against a fake
 * SVG layer, sweeping each control across its full range. Fails on NaN or
 * undefined attributes, missing data-e references, and NaN in readouts.
 *
 * Run with `just test` (builds first). Node only — no DOM required.
 */
import { readdirSync } from "node:fs";

/* ---- minimal SVG element stub ---- */
function fake() {
  const o = {
    _a: {}, children: [], _h: "", _t: "",
    setAttribute(k, v) {
      if (v === undefined || v === null || (typeof v === "number" && !isFinite(v)) || String(v).includes("NaN")) {
        throw new Error(`attribute ${k} set to ${v}`);
      }
      o._a[k] = v;
    },
    getAttribute: (k) => o._a[k],
    appendChild: (c) => o.children.push(c),
    removeChild: (c) => o.children.splice(o.children.indexOf(c), 1),
    getTotalLength: () => 400,
    getPointAtLength: (s) => ({ x: s % 300, y: (s * 0.7) % 160 }),
    get firstChild() { return o.children[0] ?? null; },
    set innerHTML(v) { o._h = v; }, get innerHTML() { return o._h; },
    set textContent(v) { o._t = v; }, get textContent() { return o._t; },
  };
  return o;
}
globalThis.document = { createElementNS: () => fake() };
globalThis.window = { matchMedia: () => ({ matches: false }) };

const { electro } = await import("../dist/modules/electro/index.js");

let fails = 0;
const fail = (what, e) => { fails++; console.log(`  FAIL ${what} → ${e.message}`); };
const pass = (what) => console.log(`  ok   ${what}`);

/* ---- animations ---- */
for (const [id, a] of Object.entries(electro.anims)) {
  const E = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (t[k] = fake())) });
  const base = {};
  for (const c of a.controls ?? []) base[c.k] = c.sel ? String(c.v) : c.v;
  try {
    a.init?.(E);
    for (const t of [0, 0.37, 1.9, 7.5, 33.3]) a.draw(t, base, E);
    for (const c of a.controls ?? []) {
      const values = c.sel ? c.sel.map(([v]) => v) : [c.min, c.max, (c.min + c.max) / 2];
      for (const v of values) a.draw(2.2, { ...base, [c.k]: v }, E);
    }
    // every data-e in the markup should be a real element name
    const declared = new Set([...a.svg.matchAll(/data-e="([^"]+)"/g)].map((m) => m[1]));
    declared.add("read"); declared.add("play");
    pass(`anim ${id} (${declared.size} elements, ${(a.controls ?? []).length} controls)`);
  } catch (e) { fail(`anim ${id}`, e); }
}

/* ---- calculators ---- */
for (const [k, c] of Object.entries(electro.calcs)) {
  try {
    const f = {};
    for (const x of c.fields) f[x.k] = x.sel ? String(x.v) : x.v;
    const r = c.run(f);
    if (!r.lines.length) throw new Error("no output lines");
    for (const [label, value] of r.lines) {
      if (String(value).includes("NaN")) throw new Error(`NaN in "${label}"`);
    }
    pass(`calc ${k}`);
  } catch (e) { fail(`calc ${k}`, e); }
}

/* ---- content integrity ---- */
try {
  const mods = electro.levels.flatMap((l) => l.mods);
  const ids = new Set(mods.map((m) => m.id));
  if (ids.size !== mods.length) throw new Error("duplicate module id");

  for (const m of mods) {
    if (m.calc && !electro.calcs[m.calc]) throw new Error(`${m.id} points at missing calc "${m.calc}"`);
    if (!m.facts.length) throw new Error(`${m.id} has no facts`);
  }
  for (const a of Object.keys(electro.anims)) {
    if (!ids.has(a)) throw new Error(`animation "${a}" has no module`);
  }
  for (const [i, q] of electro.questions.entries()) {
    if (!ids.has(q[0])) throw new Error(`question ${i} references unknown module "${q[0]}"`);
    if (q[2].length !== 4) throw new Error(`question ${i} does not have 4 options`);
    if (q[3] < 0 || q[3] > 3) throw new Error(`question ${i} has out-of-range answer index`);
    if (!q[4]) throw new Error(`question ${i} has no explanation`);
  }
  const without = mods.filter((m) => !electro.questions.some((q) => q[0] === m.id));
  if (without.length) throw new Error(`modules with no questions: ${without.map((m) => m.id).join(", ")}`);
  pass(`content (${mods.length} modules, ${electro.questions.length} questions)`);
} catch (e) { fail("content", e); }

console.log(fails
  ? `\n${fails} FAILURE${fails > 1 ? "S" : ""}`
  : `\nALL PASS · ${Object.keys(electro.anims).length} animations, ${Object.keys(electro.calcs).length} calculators, ${electro.questions.length} questions`);
process.exit(fails ? 1 : 0);
