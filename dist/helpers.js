/** Formula block. */
export const F = (s) => `<div class="fx">${s}</div>`;
/** Warning block. */
export const W = (s) => `<div class="warn">${s}</div>`;
/** Romanian number formatting, fixed decimals. */
export const num = (v, d = 2) => isFinite(v)
    ? Number(v).toLocaleString("ro-RO", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";
/** Readout rows, shared by calculators and animations. */
export const rd = (lines) => lines.map(([a, b]) => `<div class="ro-line"><span>${a}</span><b>${b}</b></div>`).join("");
export function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}
//# sourceMappingURL=helpers.js.map