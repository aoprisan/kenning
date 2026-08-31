/** Formula block. */
export const F = (s: string): string => `<div class="fx">${s}</div>`;
/** Warning block. */
export const W = (s: string): string => `<div class="warn">${s}</div>`;

/** Romanian number formatting, fixed decimals. */
export const num = (v: number, d = 2): string =>
  isFinite(v)
    ? Number(v).toLocaleString("ro-RO", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

/** Readout rows, shared by calculators and animations. */
export const rd = (lines: [string, string][]): string =>
  lines.map(([a, b]) => `<div class="ro-line"><span>${a}</span><b>${b}</b></div>`).join("");

export function shuffle<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
