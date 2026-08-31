import { Store } from "./store.js";
import { active } from "./modules/index.js";
import { renderAnim, mountAnim } from "./anim/runtime.js";
import { renderCalc, wireCalc } from "./calc/runtime.js";
import { startQuiz, renderQuiz, PASS } from "./quiz.js";
const S = active;
const ALL = S.levels.flatMap((l) => l.mods);
const byId = Object.fromEntries(ALL.map((m) => [m.id, m]));
let progress = Store.load();
let current = ALL[0].id;
let tab = "teorie";
let quiz = null;
let animHandle = null;
const nav = document.getElementById("nav");
const main = document.getElementById("main");
const stateOf = (id) => {
    const p = progress[id];
    if (!p)
        return "new";
    if (p.score != null && p.total && p.score / p.total >= PASS)
        return "done";
    return "seen";
};
const doneCount = () => ALL.filter((m) => stateOf(m.id) === "done").length;
/* ---------- chrome ---------- */
function renderGauge() {
    const d = doneCount();
    document.getElementById("gaugeFill").style.width = (d / ALL.length) * 100 + "%";
    document.getElementById("gaugeNum").textContent = d + "/" + ALL.length;
}
function renderNav() {
    nav.innerHTML = S.levels.map((l) => `
    <div class="lvl">
      <div class="lvl-hd">${l.name}</div>
      <div class="rail">
        ${l.mods.map((m) => `
          <button class="term" data-id="${m.id}" data-state="${stateOf(m.id)}" aria-current="${m.id === current}">
            <span class="pip"></span>
            <span class="term-n">${ALL.indexOf(m) + 1}</span>
            <span>${m.t}</span>
          </button>`).join("")}
      </div>
    </div>`).join("");
    nav.querySelectorAll(".term").forEach((b) => {
        b.onclick = () => {
            current = b.dataset.id;
            tab = "teorie";
            quiz = null;
            renderAll();
            if (window.innerWidth <= 880)
                main.scrollIntoView({ behavior: "smooth", block: "start" });
        };
    });
}
/* ---------- module view ---------- */
function renderMain() {
    animHandle?.stop();
    animHandle = null;
    const m = byId[current];
    const lvl = S.levels.find((l) => l.mods.includes(m));
    const idx = ALL.indexOf(m) + 1;
    const p = progress[m.id];
    const hasAnim = !!S.anims[m.id];
    let inner = "";
    if (tab === "teorie") {
        inner = `<div class="prose">${m.body}
      <div class="facts"><h4>de reținut</h4><ul>
        ${m.facts.map((f) => `<li><span></span><span>${f}</span></li>`).join("")}
      </ul></div>
      <div class="btnbar" style="margin-top:26px">
        ${hasAnim ? `<button class="btn" id="goAnim">Vezi animația</button>` : ""}
        <button class="btn ${hasAnim ? "ghost" : ""}" id="goQuiz">Dă testul pe acest modul</button>
        ${m.calc ? `<button class="btn ghost" id="goCalc">Deschide calculatorul</button>` : ""}
      </div></div>`;
    }
    else if (tab === "vizual") {
        inner = renderAnim(S.anims[m.id]);
    }
    else if (tab === "calc") {
        inner = renderCalc(m.calc ? S.calcs[m.calc] : undefined);
    }
    else {
        if (!quiz)
            quiz = startQuiz(S.questions, m.id);
        inner = renderQuiz(quiz);
    }
    main.innerHTML = `
    <div class="crumb">${lvl.name} · modulul ${idx} din ${ALL.length}${p?.score != null ? ` · ultimul test ${p.score}/${p.total}` : ""}</div>
    <h2 class="mod">${m.t}</h2>
    <p class="blurb">${m.blurb}</p>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-t="teorie" aria-selected="${tab === "teorie"}">Teorie</button>
      <button class="tab" role="tab" data-t="vizual" aria-selected="${tab === "vizual"}" ${hasAnim ? "" : "disabled"}>Vizual</button>
      <button class="tab" role="tab" data-t="calc" aria-selected="${tab === "calc"}" ${m.calc ? "" : "disabled"}>Calculator</button>
      <button class="tab" role="tab" data-t="test" aria-selected="${tab === "test"}">Test</button>
    </div>
    ${inner}
    <div class="foot">${S.disclaimer.map((d) => `<p>${d}</p>`).join("")}</div>`;
    main.querySelectorAll(".tab").forEach((b) => {
        b.onclick = () => {
            if (b.disabled)
                return;
            tab = b.dataset.t;
            if (tab === "test")
                quiz = startQuiz(S.questions, current);
            renderMain();
            wireQuiz();
        };
    });
    const go = (id, t) => {
        const el = document.getElementById(id);
        if (el)
            el.onclick = () => {
                tab = t;
                if (t === "test")
                    quiz = startQuiz(S.questions, current);
                renderMain();
                wireQuiz();
            };
    };
    go("goQuiz", "test");
    go("goCalc", "calc");
    go("goAnim", "vizual");
    if (tab === "teorie" && !progress[m.id]) {
        progress[m.id] = { seen: true };
        Store.save(progress);
        renderNav();
    }
    if (tab === "calc")
        wireCalc(m.calc ? S.calcs[m.calc] : undefined, main);
    if (tab === "vizual")
        animHandle = mountAnim(S.anims[m.id], main);
}
/* ---------- quiz wiring ---------- */
function wireQuiz() {
    if (!quiz)
        return;
    if (quiz.i >= quiz.qs.length && quiz.mod !== "__exam__") {
        progress[quiz.mod] = { seen: true, score: quiz.correct, total: quiz.qs.length };
        Store.save(progress);
        renderNav();
        renderGauge();
    }
    main.querySelectorAll(".opt:not([disabled])").forEach((b) => {
        b.onclick = () => {
            const q = quiz;
            q.picked = Number(b.dataset.k);
            if (q.picked === q.qs[q.i][3])
                q.correct++;
            renderMain();
            wireQuiz();
        };
    });
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el)
            el.onclick = fn;
    };
    bind("next", () => { quiz.i++; quiz.picked = null; renderMain(); wireQuiz(); });
    bind("again", () => { quiz = startQuiz(S.questions, quiz.mod); renderMain(); wireQuiz(); });
    bind("back", () => { tab = "teorie"; renderAll(); });
}
export function renderAll() {
    renderNav();
    renderMain();
    wireQuiz();
    renderGauge();
}
/* ---------- global actions ---------- */
export function wireChrome() {
    document.getElementById("brandName").textContent = "Kenning";
    document.getElementById("brandTag").textContent = S.tagline;
    document.getElementById("btnExam").onclick = () => {
        current = ALL[0].id;
        tab = "test";
        quiz = startQuiz(S.questions, "__exam__");
        renderMain();
        wireQuiz();
        main.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.getElementById("btnReset").onclick = () => {
        if (!confirm(`Se șterge progresul pe toate cele ${ALL.length} module. Continui?`))
            return;
        progress = {};
        Store.clear();
        Store.save({});
        quiz = null;
        tab = "teorie";
        current = ALL[0].id;
        renderAll();
    };
    document.addEventListener("keydown", (e) => {
        if (tab !== "test" || !quiz)
            return;
        if (quiz.picked === null && /^[1-4]$/.test(e.key)) {
            main.querySelector(`.opt[data-k="${Number(e.key) - 1}"]`)?.click();
        }
        else if (quiz.picked !== null && (e.key === "Enter" || e.key === " ")) {
            const n = document.getElementById("next");
            if (n) {
                e.preventDefault();
                n.click();
            }
        }
    });
}
/** Exposed for tests. */
export const _internals = { ALL, subject: S };
//# sourceMappingURL=app.js.map