import { shuffle } from "./helpers.js";
/** 80 % correct marks a module as mastered. */
export const PASS = 0.8;
/** Question count for the mixed exam. */
export const EXAM_SIZE = 25;
export function startQuiz(all, mod) {
    const qs = mod === "__exam__"
        ? shuffle(all).slice(0, EXAM_SIZE)
        : shuffle(all.filter((q) => q[0] === mod));
    return { mod, qs, i: 0, correct: 0, picked: null };
}
export function renderQuiz(q) {
    const { qs, i, correct, picked } = q;
    if (!qs.length)
        return `<p class="empty">Nu există încă întrebări pentru acest modul.</p>`;
    if (i >= qs.length) {
        const pct = Math.round((correct / qs.length) * 100);
        const pass = pct >= PASS * 100;
        return `<div class="score ${pass ? "pass" : "fail"}">
      <div class="score-big">${pct}%</div>
      <p class="score-sub">${correct} din ${qs.length} corecte. ${pass
            ? "Modulul e marcat ca stăpânit pe bară."
            : "Sub pragul de 80 %. Reia teoria și încearcă din nou — întrebările vin în altă ordine."}</p>
      <div class="btnbar">
        <button class="btn" id="again">Reia testul</button>
        <button class="btn ghost" id="back">Înapoi la teorie</button>
      </div></div>`;
    }
    const [, text, opts, ans, expl] = qs[i];
    const answered = picked !== null;
    return `<div class="quiz">
    <div class="qmeta"><span>întrebarea ${i + 1} / ${qs.length}</span><span>corecte ${correct}</span></div>
    <div class="qtext">${text}</div>
    <div class="opts">
      ${opts.map((o, k) => {
        let cls = "opt";
        if (answered && k === ans)
            cls += " correct";
        else if (answered && k === picked)
            cls += " wrong";
        return `<button class="${cls}" data-k="${k}" ${answered ? "disabled" : ""}>
          <span class="key">${String.fromCharCode(65 + k)}</span><span>${o}</span></button>`;
    }).join("")}
    </div>
    ${answered ? `<div class="explain"><b>de ce</b>${expl}</div>
      <div class="btnbar"><button class="btn" id="next">${i + 1 < qs.length ? "Următoarea" : "Vezi rezultatul"}</button></div>` : ""}
  </div>`;
}
//# sourceMappingURL=quiz.js.map