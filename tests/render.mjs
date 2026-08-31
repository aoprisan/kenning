/**
 * Renders the real app in jsdom: every module of every registered subject,
 * every enabled tab, a full quiz answered correctly, and the reset path.
 * Catches breakage in app.ts that the pure-maths smoke test cannot see.
 *
 * `app.ts` binds its subject once, at import time, from `?subject=`. ES module
 * instances are cached per process, so each subject is rendered in a child
 * process of its own — which also gives every run a clean localStorage.
 *
 * Run with `just test`. Requires the jsdom devDependency.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const only = process.env.KENNING_SUBJECT;

/* ---- parent: fan out one child per subject ---- */
if (!only) {
  const { SUBJECTS } = await import("../dist/modules/index.js");
  const self = fileURLToPath(import.meta.url);
  let bad = 0;
  for (const s of SUBJECTS) {
    const r = spawnSync(process.execPath, [self], {
      stdio: "inherit",
      env: { ...process.env, KENNING_SUBJECT: s.id },
    });
    if (r.status !== 0) bad++;
  }
  console.log(bad ? `\n${bad} SUBJECT${bad > 1 ? "S" : ""} FAILED` : `\nRENDER PASS · ${SUBJECTS.length} subjects`);
  process.exit(bad ? 1 : 0);
}

/* ---- child: render one subject ---- */
const { JSDOM } = await import("jsdom");

const html = readFileSync("index.html", "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const dom = new JSDOM(html, { url: `http://localhost/?subject=${encodeURIComponent(only)}` });
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.location = window.location;
globalThis.localStorage = window.localStorage;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.confirm = () => true;
window.confirm = () => true;
globalThis.performance = { now: () => Date.now() };

/* Run a bounded number of animation frames so mountAnim's loop terminates. */
let budget = 0;
globalThis.requestAnimationFrame = (fn) => (budget++ < 3 ? (fn(Date.now()), budget) : 0);
globalThis.cancelAnimationFrame = () => { budget = 0; };

/* jsdom implements no SVG geometry. */
window.SVGElement.prototype.getTotalLength = () => 400;
window.SVGElement.prototype.getPointAtLength = (s) => ({ x: s % 300, y: (s * 0.7) % 160 });

const { active } = await import("../dist/modules/index.js");
if (active.id !== only) {
  console.log(`  FAIL ?subject=${only} selected "${active.id}"`);
  process.exit(1);
}
const S = active;
console.log(`\n${S.id} · ${S.name}`);

const app = await import("../dist/app.js");
app.wireChrome();
app.renderAll();

const q = (s) => window.document.querySelector(s);
const qa = (s) => [...window.document.querySelectorAll(s)];
let fails = 0;
const check = (cond, msg) => {
  if (cond) console.log("  ok   " + msg);
  else { fails++; console.log("  FAIL " + msg); }
};

const modCount = S.levels.flatMap((l) => l.mods).length;
check(qa("nav .term").length === modCount, `nav renders ${modCount} terminals`);
check(qa(".tab").length === 4, "four tabs present");
check(q("#gaugeNum")?.textContent === `0/${modCount}`, "gauge starts empty");

let anims = 0, calcs = 0, views = 0;
for (const term of qa("nav .term")) {
  term.click();
  const name = term.textContent.trim().split("\n").pop().trim();
  check(!!q("h2.mod")?.textContent, `${name}: title renders`);
  for (const t of ["vizual", "calc", "test"]) {
    const tab = q(`.tab[data-t="${t}"]`);
    if (!tab || tab.disabled) continue;
    tab.click();
    views++;
    if (t === "vizual") { anims++; check(!!q(".anim-stage svg"), `${name}: animation mounts`); }
    if (t === "calc") { calcs++; check(!!q("#readout")?.innerHTML, `${name}: calculator computes`); }
    if (t === "test") check(!!q(".qtext"), `${name}: quiz renders`);
  }
}
check(anims === Object.keys(S.anims).length, `all ${anims} animations mounted`);
check(calcs === Object.keys(S.calcs).length, `all ${calcs} calculators wired`);

/* Answer one module's quiz correctly and confirm it is marked mastered. */
qa("nav .term")[0].click();
q('.tab[data-t="test"]').click();
for (let guard = 0; q(".qtext") && guard < 60; guard++) {
  const text = q(".qtext").textContent;
  const row = S.questions.find((x) => x[1] === text);
  check(!!row, "quiz question traces back to the bank");
  qa(".opt")[row[3]].click();
  q("#next")?.click();
}
check(q(".score-big")?.textContent === "100%", "answering correctly scores 100%");
check(q("#gaugeNum")?.textContent === `1/${modCount}`, "mastered module advances the gauge");
check(qa('nav .term[data-state="done"]').length === 1, "terminal switches to done");

/* Scores are filed under the subject, so two subjects sharing a module id
   cannot overwrite each other. Reaching into storage on purpose: this is the
   guarantee, and store.ts is the only code allowed to write it. */
check(window.localStorage.getItem(`kenning.progress:${S.id}`) != null,
  "progress is stored under the subject's own key");
check(window.localStorage.getItem("kenning.progress") === null,
  "nothing is written to the shared pre-namespace key");

q("#btnReset").click();
check(q("#gaugeNum")?.textContent === `0/${modCount}`, "reset clears progress");

/* ---- collapsible menu ---- */
const lvlCount = S.levels.length;
check(qa("nav .lvl-btn").length === lvlCount, `menu renders ${lvlCount} collapsible levels`);
check(qa("nav .lvl-btn").every((b) => b.getAttribute("aria-expanded") === "true"),
  "levels start expanded");
check(qa("nav .lvl-btn").every((b, i) => {
  const rail = q(`#rail-${i}`);
  return rail && b.getAttribute("aria-controls") === rail.id;
}), "each level header controls its own rail");

const first = () => qa("nav .lvl-btn")[0];
const firstRail = () => q("#rail-0");
const inLevel0 = S.levels[0].mods.length;

first().click();
check(first().getAttribute("aria-expanded") === "false", "clicking a level collapses it");
check(firstRail().hidden === true, "collapsed rail is hidden from tab order");
check(qa("nav .term").length === modCount, "collapsing keeps every module in the DOM");
check(qa("#rail-0 .term").length === inLevel0, "collapsed rail keeps its own modules");

/* Collapse survives a re-render driven by something else entirely. */
app.renderAll();
check(first().getAttribute("aria-expanded") === "false", "collapse survives a re-render");

first().click();
check(first().getAttribute("aria-expanded") === "true", "clicking again expands it");
check(firstRail().hidden === false, "expanded rail is visible");

/* Per-level progress counter. */
check(/^\d+\/\d+$/.test(q("nav .lvl-count")?.textContent ?? ""), "level shows a done/total count");
check(q("nav .lvl-count")?.textContent === `0/${inLevel0}`, "count is empty after a reset");

/* ---- drawer ---- */
const toggle = q("#navToggle");
check(!!toggle, "menu toggle exists");
check(toggle.getAttribute("aria-controls") === "nav", "toggle points at the nav");
check(toggle.getAttribute("aria-expanded") === "false", "drawer starts closed");
check(q("#navScrim")?.hidden === true, "scrim starts hidden");

toggle.click();
check(window.document.body.classList.contains("nav-open"), "toggle opens the drawer");
check(toggle.getAttribute("aria-expanded") === "true", "open drawer is announced");
check(q("#navScrim").hidden === false, "scrim appears with the drawer");

window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
check(!window.document.body.classList.contains("nav-open"), "Escape closes the drawer");
check(q("#navScrim").hidden === true, "scrim goes away again");

toggle.click();
q("#navClose").click();
check(!window.document.body.classList.contains("nav-open"), "in-drawer close button closes it");

toggle.click();
qa("nav .term")[1].click();
check(!window.document.body.classList.contains("nav-open"), "choosing a module closes the drawer");
check(q("h2.mod")?.textContent === S.levels.flatMap((l) => l.mods)[1].t, "and navigates to it");

/* ---- subject picker ---- */
const { SUBJECTS: ALL_SUBJECTS, subjectHref } = await import("../dist/modules/index.js");
const pick = q("#subjectPick");
check(!!pick, "subject picker exists");
check(!!pick?.getAttribute("aria-label"), "picker is labelled for screen readers");
check(qa("#subjectPick option").length === ALL_SUBJECTS.length,
  `picker lists all ${ALL_SUBJECTS.length} subjects`);
check(qa("#subjectPick option").every((o, i) => o.value === ALL_SUBJECTS[i].id
  && o.textContent === ALL_SUBJECTS[i].name), "each option carries a subject id and name");
check(pick?.value === S.id, "picker opens on the active subject");
/* The handler navigates, which jsdom cannot do, so verify the destination
   it would send the browser to rather than firing the change. */
check(new URLSearchParams(subjectHref(ALL_SUBJECTS.at(-1).id, window.location.search))
  .get("subject") === ALL_SUBJECTS.at(-1).id, "picking a subject builds its URL");

/* ---- pwa boot is inert where the APIs are missing ---- */
const { initPWA } = await import("../dist/pwa.js");
let threw = null;
try { initPWA(); } catch (e) { threw = e; }
check(threw === null, `initPWA is a no-op without a service worker${threw ? ` (${threw.message})` : ""}`);
check(q("#btnInstall")?.hidden === true, "install button stays hidden until prompted");

console.log(fails
  ? `  ${fails} RENDER FAILURE${fails > 1 ? "S" : ""} in ${S.id}`
  : `  ${S.id} pass · ${views} tab views exercised`);
process.exit(fails ? 1 : 0);
