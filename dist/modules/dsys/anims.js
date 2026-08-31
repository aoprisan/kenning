import { rd } from "../../helpers.js";
import { C_L1, C_L2, C_L3, C_N, C_PE, C_RED, C_GREY } from "../../anim/runtime.js";
/**
 * Distributed-systems animations, keyed by module id; a module without an
 * entry has no visual tab. See the animation contract in CLAUDE.md — `draw`
 * is a pure function of `(t, c)` and must never set an attribute to NaN at
 * any control extreme.
 */
/* ---------- d2 · one fixed run of ten events on three processes ----------
   `p` is the process index, `tt` the true time in seconds at which the event
   happened, and `L` the value the Lamport algorithm produces for it on this
   run. The `L` column is the algorithm's output for this exact interleaving,
   written out rather than recomputed so the draw loop stays trivial. */
const D2_EV = [
    { p: 0, tt: 1.0, L: 1 }, // 0  local event on P1
    { p: 0, tt: 2.0, L: 2 }, // 1  P1 sends to P2
    { p: 1, tt: 3.0, L: 3 }, // 2  P2 receives it
    { p: 1, tt: 4.0, L: 4 }, // 3  P2 sends to P3
    { p: 2, tt: 4.8, L: 5 }, // 4  P3 receives it
    { p: 1, tt: 5.2, L: 5 }, // 5  local event on P2
    { p: 0, tt: 6.0, L: 3 }, // 6  P1 sends to P3
    { p: 2, tt: 6.6, L: 6 }, // 7  P3 receives it
    { p: 2, tt: 8.0, L: 7 }, // 8  P3 sends to P1
    { p: 0, tt: 9.0, L: 8 }, // 9  P1 receives it
];
/** [send event, receive event] for each message on the wire. */
const D2_MSG = [[1, 2], [3, 4], [6, 7], [8, 9]];
const D2_Y = [52, 100, 148];
const D2_COL = [C_L1, C_N, C_PE];
export const anims = {
    /* ---------- d2 · wall-clock order against Lamport order ---------- */
    d2: {
        title: "The same run, ordered two ways",
        caption: "Ten events on three processes, with the four arrows showing messages. Horizontal position is whichever ordering key you pick. Raise the skew and watch an arrow tip over and point backwards: the receive is ordered before the send that caused it, and a system sorting by timestamp will believe it. Switch to Lamport and no arrow can point backwards at any skew — the max on receive makes it impossible, at the price of a counter that is no longer a time.",
        controls: [{ k: "skew", l: "Clock skew", min: 0, max: 1.5, step: 0.05, v: 0.6, u: " s" },
            { k: "mode", l: "Ordering key", v: "wall", sel: [["wall", "wall-clock timestamp"], ["lamport", "Lamport counter"]] }],
        svg: `<svg viewBox="0 0 340 208">
  <line x1="48" y1="52" x2="322" y2="52" stroke="${C_GREY}" stroke-width="1.5"/>
  <line x1="48" y1="100" x2="322" y2="100" stroke="${C_GREY}" stroke-width="1.5"/>
  <line x1="48" y1="148" x2="322" y2="148" stroke="${C_GREY}" stroke-width="1.5"/>
  <text x="6" y="49" font-size="11" fill="${C_L1}" font-family="IBM Plex Mono">P1</text>
  <text data-e="of0" x="6" y="62" font-size="8.5" fill="${C_L3}" font-family="IBM Plex Mono"></text>
  <text x="6" y="97" font-size="11" fill="${C_N}" font-family="IBM Plex Mono">P2</text>
  <text data-e="of1" x="6" y="110" font-size="8.5" fill="${C_L3}" font-family="IBM Plex Mono"></text>
  <text x="6" y="145" font-size="11" fill="${C_PE}" font-family="IBM Plex Mono">P3</text>
  <text data-e="of2" x="6" y="158" font-size="8.5" fill="${C_L3}" font-family="IBM Plex Mono"></text>
  <line data-e="scan" x1="48" y1="34" x2="48" y2="166" stroke="${C_GREY}" stroke-width="1" stroke-dasharray="3 3"/>
  <path data-e="ar0" fill="none" stroke="${C_L2}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path data-e="ar1" fill="none" stroke="${C_L2}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path data-e="ar2" fill="none" stroke="${C_L2}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path data-e="ar3" fill="none" stroke="${C_L2}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle data-e="ev0" cx="48" cy="52" r="3.4" fill="${C_GREY}" stroke="${C_L1}" stroke-width="1.6"/>
  <circle data-e="ev1" cx="48" cy="52" r="3.4" fill="${C_GREY}" stroke="${C_L1}" stroke-width="1.6"/>
  <circle data-e="ev2" cx="48" cy="100" r="3.4" fill="${C_GREY}" stroke="${C_N}" stroke-width="1.6"/>
  <circle data-e="ev3" cx="48" cy="100" r="3.4" fill="${C_GREY}" stroke="${C_N}" stroke-width="1.6"/>
  <circle data-e="ev4" cx="48" cy="148" r="3.4" fill="${C_GREY}" stroke="${C_PE}" stroke-width="1.6"/>
  <circle data-e="ev5" cx="48" cy="100" r="3.4" fill="${C_GREY}" stroke="${C_N}" stroke-width="1.6"/>
  <circle data-e="ev6" cx="48" cy="52" r="3.4" fill="${C_GREY}" stroke="${C_L1}" stroke-width="1.6"/>
  <circle data-e="ev7" cx="48" cy="148" r="3.4" fill="${C_GREY}" stroke="${C_PE}" stroke-width="1.6"/>
  <circle data-e="ev8" cx="48" cy="148" r="3.4" fill="${C_GREY}" stroke="${C_PE}" stroke-width="1.6"/>
  <circle data-e="ev9" cx="48" cy="52" r="3.4" fill="${C_GREY}" stroke="${C_L1}" stroke-width="1.6"/>
  <text data-e="axis" x="170" y="184" font-size="9" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="200" font-size="9.5" fill="${C_PE}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
        draw(t, c, E) {
            const wall = c.mode === "wall";
            const off = [c.skew, 0, -c.skew];
            const kmax = wall ? 11 : 9;
            const key = (i) => wall ? D2_EV[i].tt + off[D2_EV[i].p] : D2_EV[i].L;
            const X = (k) => 48 + 274 * k / kmax;
            const scan = 48 + 274 * ((t % 9) / 9);
            // Events. `seen` is the highest Lamport value the sweep has reached per
            // process — a local tally, recomputed from t each frame, not stored state.
            const seen = [0, 0, 0];
            for (let i = 0; i < D2_EV.length; i++) {
                const e = D2_EV[i], x = X(key(i)), on = x <= scan;
                const el = E["ev" + i];
                el.setAttribute("cx", x.toFixed(1));
                el.setAttribute("cy", String(D2_Y[e.p]));
                el.setAttribute("r", on ? "5" : "3.4");
                el.setAttribute("fill", on ? D2_COL[e.p] : C_GREY);
                if (on && e.L > seen[e.p])
                    seen[e.p] = e.L;
            }
            // Messages. An arrow that points left is a receive ordered before its send.
            let inv = 0;
            for (let j = 0; j < D2_MSG.length; j++) {
                const s = D2_MSG[j][0], r = D2_MSG[j][1];
                const ks = key(s), kr = key(r), bad = kr < ks;
                if (bad)
                    inv++;
                const x1 = X(ks), y1 = D2_Y[D2_EV[s].p], x2 = X(kr), y2 = D2_Y[D2_EV[r].p];
                const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const ax = x1 + ux * 6, ay = y1 + uy * 6, bx = x2 - ux * 6, by = y2 - uy * 6;
                const hx = bx - ux * 8, hy = by - uy * 8;
                const el = E["ar" + j];
                el.setAttribute("d", `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}` +
                    ` M${(hx - uy * 4).toFixed(1)} ${(hy + ux * 4).toFixed(1)}` +
                    ` L${bx.toFixed(1)} ${by.toFixed(1)}` +
                    ` L${(hx + uy * 4).toFixed(1)} ${(hy - ux * 4).toFixed(1)}`);
                el.setAttribute("stroke", bad ? C_RED : C_L2);
                el.setAttribute("stroke-width", bad ? "2.4" : "1.5");
                el.setAttribute("opacity", X(ks) <= scan ? "1" : "0.22");
            }
            for (let p = 0; p < 3; p++) {
                const v = off[p];
                E["of" + p].textContent = wall
                    ? (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + "s"
                    : "L=" + seen[p];
            }
            E.scan.setAttribute("x1", scan.toFixed(1));
            E.scan.setAttribute("x2", scan.toFixed(1));
            E.axis.textContent = wall
                ? "position = each machine's own clock reading"
                : "position = Lamport counter, not a time";
            E.verdict.textContent = wall
                ? (inv ? inv + (inv > 1 ? " receives" : " receive") + " ordered before the send that caused it"
                    : "nothing inverted at this skew — nothing prevents it either")
                : "every arrow points forward, at every skew";
            E.verdict.setAttribute("fill", inv ? C_RED : C_PE);
            E.read.innerHTML = rd([
                ["Ordering key", wall ? "wall-clock timestamp" : "Lamport counter"],
                ["Clock offsets", wall
                        ? "P1 " + (c.skew ? "+" : "") + c.skew.toFixed(2) + " s · P2 0 s · P3 " + (c.skew ? "−" : "") + c.skew.toFixed(2) + " s"
                        : "not used — the counter ignores them"],
                ["Messages ordered backwards", inv + " of " + D2_MSG.length],
                ["Causality", inv ? "broken by the ordering key" : "preserved"],
            ]);
        }
    },
};
//# sourceMappingURL=anims.js.map