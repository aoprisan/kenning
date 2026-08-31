import type { Anim, Els, CtlValues, Ctl, RangeCtl, SelectCtl } from "../types.js";

export const RM: boolean =
  typeof window !== "undefined" && !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const NS = "http://www.w3.org/2000/svg";

/** Palette. Mirrors the :root tokens in styles.css — keep the two in sync. */
export const C_L1 = "#6B4A2F", C_L2 = "#2A2A2E", C_L3 = "#8C8F91",
             C_N = "#2C5C99", C_PE = "#3F8C24", C_CU = "#B87333",
             C_RED = "#B3261E", C_GREY = "#C2C7C1";

/** Fill a group with `n` circles and return them, replacing any previous pool. */
export function mkDots(g: any, n: number, r: number, fill: string): any[] {
  while (g.firstChild) g.removeChild(g.firstChild);
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("r", String(r));
    c.setAttribute("fill", fill);
    g.appendChild(c);
    out.push(c);
  }
  return out;
}

/** Distribute dots along a path at `off` with spacing `gap`. */
export function along(path: any, dots: any[], off: number, gap: number, hide?: boolean): void {
  const L = path.getTotalLength();
  dots.forEach((d, i) => {
    if (hide) { d.setAttribute("opacity", "0"); return; }
    let s = (off + i * gap) % L;
    if (s < 0) s += L;
    const p = path.getPointAtLength(s);
    d.setAttribute("cx", String(p.x));
    d.setAttribute("cy", String(p.y));
    d.setAttribute("opacity", "1");
  });
}

/** Rewrite a path's `d` from a y = f(x) sampler. */
export function wave(el: any, fn: (x: number) => number, x0: number, x1: number, step: number): void {
  let p = "";
  for (let x = x0; x <= x1; x += step) p += (p ? "L" : "M") + x.toFixed(1) + " " + fn(x).toFixed(1) + " ";
  el.setAttribute("d", p);
}

export const axis = (x1: number, y1: number, x2: number, y2: number, c = C_GREY): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1"/>`;

const isRange = (c: Ctl): c is RangeCtl => !("sel" in c);

export function renderAnim(a: Anim | undefined): string {
  if (!a) {
    return `<p class="empty">Modulul acesta nu are animație — teoria lui e normativă, nu fenomenologică. Treci la teorie sau la test.</p>`;
  }
  const ctl = (a.controls ?? []).map((c) =>
    isRange(c)
      ? `<div class="ac"><label>${c.l} <b data-out="${c.k}">${c.v}${c.u ?? ""}</b></label>
           <input class="ac-input" type="range" data-k="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.v}"></div>`
      : `<div class="ac"><label>${c.l}</label><select class="ac-input" data-k="${c.k}">${
          (c as SelectCtl).sel.map(([v, tx]) => `<option value="${v}" ${String(c.v) === String(v) ? "selected" : ""}>${tx}</option>`).join("")
        }</select></div>`,
  ).join("");

  return `<div class="anim">
    <div class="anim-hd"><b>${a.title}</b><button class="playbtn" data-e="play">${RM ? "pornește" : "pauză"}</button></div>
    <div class="anim-stage">${a.svg}</div>
    ${ctl ? `<div class="anim-ctl">${ctl}</div>` : ""}
    <div class="anim-read" data-e="read"></div>
    <p class="anim-cap">${a.caption}</p>
  </div>`;
}

export interface AnimHandle { stop(): void }

/** Start the frame loop for `a` inside `root`. Caller must call `stop()` before re-rendering. */
export function mountAnim(a: Anim | undefined, root: HTMLElement): AnimHandle | null {
  if (!a) return null;
  const host = root.querySelector<HTMLElement>(".anim");
  if (!host) return null;

  const E: Els = {};
  host.querySelectorAll<HTMLElement>("[data-e]").forEach((n) => { E[n.dataset.e!] = n; });

  const C: CtlValues = {};
  for (const c of a.controls ?? []) C[c.k] = isRange(c) ? c.v : String(c.v);

  a.init?.(E);

  let running = !RM, t = 0, last = performance.now(), raf = 0;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running) t += dt;
    a.draw(t, C, E);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  host.querySelectorAll<HTMLInputElement>(".ac-input").forEach((inp) => {
    const upd = (): void => {
      const spec = (a.controls ?? []).find((x) => x.k === inp.dataset.k);
      C[inp.dataset.k!] = spec && !isRange(spec) ? inp.value : parseFloat(inp.value);
      const o = host.querySelector(`[data-out="${inp.dataset.k}"]`);
      if (o) o.textContent = inp.value + (spec && isRange(spec) ? (spec.u ?? "") : "");
    };
    inp.addEventListener("input", upd);
    inp.addEventListener("change", upd);
  });

  E.play.onclick = (): void => {
    running = !running;
    E.play.textContent = running ? "pauză" : "pornește";
  };

  return { stop: () => cancelAnimationFrame(raf) };
}
