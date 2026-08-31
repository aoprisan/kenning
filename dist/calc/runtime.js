export function renderCalc(c) {
    if (!c)
        return `<p class="empty">Modulul acesta nu are calculator — teoria lui e conceptuală.</p>`;
    return `<div class="calc">
    <div class="calc-hd"><b>${c.title}</b><em>${c.hint}</em></div>
    <div class="calc-body">
      ${c.fields.map((f) => `<div class="row">
        <label for="f_${f.k}">${f.l}${f.u ? ` <small>${f.u}</small>` : ""}</label>
        ${f.sel
        ? `<select id="f_${f.k}" data-k="${f.k}">${f.sel.map(([v, t]) => `<option value="${v}" ${String(f.v) === v ? "selected" : ""}>${t}</option>`).join("")}</select>`
        : `<input id="f_${f.k}" data-k="${f.k}" type="number" step="any" value="${f.v}">`}
      </div>`).join("")}
    </div>
    <div class="readout" id="readout"></div>
  </div>
  <p class="calc-note">Valorile sunt orientative, pentru înțelegerea relațiilor. Un calcul de proiect ia în considerare factorii de corecție, modul de pozare și temperatura reală.</p>`;
}
export function wireCalc(c, root) {
    if (!c)
        return;
    const out = root.querySelector("#readout");
    if (!out)
        return;
    const read = () => {
        const f = {};
        for (const fl of c.fields) {
            const el = root.querySelector("#f_" + fl.k);
            if (!el)
                continue;
            f[fl.k] = fl.sel ? el.value : (el.value === "" ? null : parseFloat(el.value));
        }
        const r = c.run(f);
        out.innerHTML =
            r.lines.map(([a, b]) => `<div class="ro-line"><span>${a}</span><b>${b}</b></div>`).join("") +
                (r.ok ? `<div class="verdict ok">${r.ok}</div>` : "") +
                (r.bad ? `<div class="verdict bad">${r.bad}</div>` : "");
    };
    for (const fl of c.fields) {
        const el = root.querySelector("#f_" + fl.k);
        if (!el)
            continue;
        el.addEventListener("input", read);
        el.addEventListener("change", read);
    }
    read();
}
//# sourceMappingURL=runtime.js.map