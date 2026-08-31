import { Store } from "./store.js";
import { active } from "./modules/index.js";
import { renderAnim, mountAnim } from "./anim/runtime.js";
import { renderCalc, wireCalc } from "./calc/runtime.js";
import { startQuiz, renderQuiz, PASS } from "./quiz.js";
const S = active;
const ALL = S.levels.flatMap((l) => l.mods);
const byId = Object.fromEntries(ALL.map((m) => [m.id, m]));
let progress = Store.load();
let prefs = Store.loadPrefs();
let current = ALL[0].id;
let tab = "teorie";
let quiz = null;
let animHandle = null;
const nav = document.getElementById("nav");
const main = document.getElementById("main");
const navToggle = document.getElementById("navToggle");
const scrim = document.getElementById("navScrim");
/** Width at which the sidebar becomes an off-canvas drawer. Matches styles.css. */
const NARROW = 880;
const isNarrow = () => window.innerWidth <= NARROW;
/** jsdom implements no layout, so scrolling is best-effort everywhere. */
const scrollToMain = () => {
    if (typeof main.scrollIntoView === "function") {
        main.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};
const stateOf = (id) => {
    const p = progress[id];
    if (!p)
        return "new";
    if (p.score != null && p.total && p.score / p.total >= PASS)
        return "done";
    return "seen";
};
const doneCount = () => ALL.filter((m) => stateOf(m.id) === "done").length;
/* ---------- collapsible menu ---------- */
const lvlKey = (name) => S.id + ":" + name;
const levelOpen = (name) => !prefs.closedLevels.includes(lvlKey(name));
function setLevelOpen(name, open) {
    const k = lvlKey(name);
    const closed = prefs.closedLevels.filter((x) => x !== k);
    if (!open)
        closed.push(k);
    prefs = { closedLevels: closed };
    Store.savePrefs(prefs);
}
/** Expands whatever level holds `current`, so a jump never lands out of sight. */
function revealCurrent() {
    const l = S.levels.find((x) => x.mods.some((m) => m.id === current));
    if (l && !levelOpen(l.name))
        setLevelOpen(l.name, true);
}
function setDrawer(open) {
    document.body.classList.toggle("nav-open", open);
    if (scrim)
        scrim.hidden = !open;
    if (navToggle) {
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Închide meniul" : "Deschide meniul");
    }
    // Keep Tab inside the open drawer. Only meaningful while it actually is a
    // drawer; always cleared on close, so a resize cannot strand the page inert.
    const behind = open && isNarrow();
    document.querySelector("header.top")?.toggleAttribute("inert", behind);
    main.toggleAttribute("inert", behind);
}
const drawerOpen = () => document.body.classList.contains("nav-open");
function closeDrawer(refocus) {
    if (!drawerOpen())
        return;
    setDrawer(false);
    if (refocus)
        navToggle?.focus();
}
/* ---------- chrome ---------- */
function renderGauge() {
    const d = doneCount();
    document.getElementById("gaugeFill").style.width = (d / ALL.length) * 100 + "%";
    document.getElementById("gaugeNum").textContent = d + "/" + ALL.length;
}
function renderNav() {
    // The drawer header is styled away while the nav is a static sidebar.
    const hd = `
    <div class="nav-hd">
      <span>Module</span>
      <button class="navclose" id="navClose" aria-label="Închide meniul">✕</button>
    </div>`;
    nav.innerHTML = hd + S.levels.map((l, li) => {
        const open = levelOpen(l.name);
        const done = l.mods.filter((m) => stateOf(m.id) === "done").length;
        return `
    <section class="lvl">
      <h3 class="lvl-hd">
        <button class="lvl-btn" data-li="${li}" aria-expanded="${open}" aria-controls="rail-${li}">
          <span class="chev" aria-hidden="true"></span>
          <span class="lvl-name">${l.name}</span>
          <span class="lvl-count">${done}/${l.mods.length}</span>
        </button>
      </h3>
      <div class="rail" id="rail-${li}"${open ? "" : " hidden"}>
        ${l.mods.map((m) => `
          <button class="term" data-id="${m.id}" data-state="${stateOf(m.id)}" aria-current="${m.id === current}">
            <span class="pip"></span>
            <span class="term-n">${ALL.indexOf(m) + 1}</span>
            <span>${m.t}</span>
          </button>`).join("")}
      </div>
    </section>`;
    }).join("");
    const close = document.getElementById("navClose");
    if (close)
        close.onclick = () => closeDrawer(true);
    nav.querySelectorAll(".lvl-btn").forEach((b) => {
        b.onclick = () => {
            const l = S.levels[Number(b.dataset.li)];
            setLevelOpen(l.name, !levelOpen(l.name));
            renderNav();
            // Keep the keyboard where it was: re-rendering replaced the button.
            nav.querySelector(`.lvl-btn[data-li="${b.dataset.li}"]`)?.focus();
        };
    });
    nav.querySelectorAll(".term").forEach((b) => {
        b.onclick = () => {
            current = b.dataset.id;
            tab = "teorie";
            quiz = null;
            const narrow = isNarrow();
            closeDrawer(false);
            renderAll();
            if (narrow)
                scrollToMain();
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
/* ---------- drawer ---------- */
function wireDrawer() {
    if (!navToggle)
        return;
    navToggle.onclick = () => {
        if (drawerOpen()) {
            closeDrawer(true);
            return;
        }
        revealCurrent();
        renderNav();
        setDrawer(true);
        // Land on the module being read rather than the top of the list.
        nav.querySelector('.term[aria-current="true"]')?.focus();
    };
    if (scrim)
        scrim.onclick = () => closeDrawer(true);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawerOpen()) {
            e.preventDefault();
            closeDrawer(true);
        }
    });
    // The drawer only exists below NARROW; widening must not leave it latched.
    window.addEventListener("resize", () => { if (!isNarrow())
        closeDrawer(false); });
}
/* ---------- global actions ---------- */
export function wireChrome() {
    document.getElementById("brandName").textContent = "Kenning";
    document.getElementById("brandTag").textContent = S.tagline;
    wireDrawer();
    document.getElementById("btnExam").onclick = () => {
        current = ALL[0].id;
        tab = "test";
        quiz = startQuiz(S.questions, "__exam__");
        closeDrawer(false);
        renderMain();
        wireQuiz();
        scrollToMain();
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
        revealCurrent();
        closeDrawer(false);
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