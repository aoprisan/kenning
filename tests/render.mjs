/**
 * Renders the real app in jsdom: every module, every enabled tab, a full quiz
 * answered correctly, and the reset path. Catches breakage in app.ts that the
 * pure-maths smoke test cannot see.
 *
 * Run with `just test`. Requires the jsdom devDependency.
 */
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
const dom = new JSDOM(html, { url: "http://localhost/" });
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
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

const { electro } = await import("../dist/modules/electro/index.js");
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

const modCount = electro.levels.flatMap((l) => l.mods).length;
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
check(anims === Object.keys(electro.anims).length, `all ${anims} animations mounted`);
check(calcs === Object.keys(electro.calcs).length, `all ${calcs} calculators wired`);

/* Answer one module's quiz correctly and confirm it is marked mastered. */
qa("nav .term")[0].click();
q('.tab[data-t="test"]').click();
for (let guard = 0; q(".qtext") && guard < 60; guard++) {
  const text = q(".qtext").textContent;
  const row = electro.questions.find((x) => x[1] === text);
  check(!!row, "quiz question traces back to the bank");
  qa(".opt")[row[3]].click();
  q("#next")?.click();
}
check(q(".score-big")?.textContent === "100%", "answering correctly scores 100%");
check(q("#gaugeNum")?.textContent === `1/${modCount}`, "mastered module advances the gauge");
check(qa('nav .term[data-state="done"]').length === 1, "terminal switches to done");

q("#btnReset").click();
check(q("#gaugeNum")?.textContent === `0/${modCount}`, "reset clears progress");

console.log(fails ? `\n${fails} RENDER FAILURE${fails > 1 ? "S" : ""}` : `\nRENDER PASS · ${views} tab views exercised`);
process.exit(fails ? 1 : 0);
