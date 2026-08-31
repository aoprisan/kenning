import type { Anim, Els } from "../../types.js";
import { rd } from "../../helpers.js";
import { NS, C_L1, C_L2, C_L3, C_N, C_PE, C_CU, C_RED, C_GREY } from "../../anim/runtime.js";

/**
 * Cryptography animations, keyed by module id; a module without an entry has
 * no visual tab. See the animation contract in CLAUDE.md — `draw` is a pure
 * function of `(t, c)` and must never set an attribute to NaN at any control
 * extreme.
 *
 * Every "random" byte here comes from `mix` below rather than from
 * `Math.random`, because `draw` has to be reproducible: the same `(t, c)`
 * must always produce the same frame, and the smoke test replays fixed
 * timestamps expecting exactly that. It is a bit-mixer, not a cipher, and
 * nothing outside these pictures should read it as one.
 */

/** Deterministic 32-bit mixer (the finaliser from MurmurHash3). */
function mix(x: number): number {
  let h = (x ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
/** A pseudorandom 32-bit word from any number of inputs. */
const word = (...xs: number[]): number =>
  mix(xs.reduce((a, v) => mix((a ^ (v + 0x165667b1)) >>> 0), 0x5bf03635));
/** The low byte of it, which is what the pictures colour by. */
const byteOf = (...xs: number[]): number => word(...xs) & 255;

/** Fill a group with `n` rects and return them, replacing any previous pool. */
function mkRects(g: any, n: number, w: number, h: number, fill: string): any[] {
  while (g.firstChild) g.removeChild(g.firstChild);
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("width", String(w));
    r.setAttribute("height", String(h));
    r.setAttribute("fill", fill);
    g.appendChild(r);
    out.push(r);
  }
  return out;
}

/** Fill a group with `n` circles and return them, replacing any previous pool. */
function mkBits(g: any, n: number, r: number): any[] {
  while (g.firstChild) g.removeChild(g.firstChild);
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("r", String(r));
    c.setAttribute("stroke-width", "1.2");
    g.appendChild(c);
    out.push(c);
  }
  return out;
}

/* ---------- k3 · the two messages, as bits ---------- */
const K3_BITS = 32;
/** Four ASCII characters each, so the XOR's top three bits are always zero. */
const k3Msg = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    const ch = s.charCodeAt(i);
    for (let b = 7; b >= 0; b--) out.push((ch >> b) & 1);
  }
  return out;
};
const K3_M1 = k3Msg("MEET"), K3_M2 = k3Msg("MOVE");
const k3x = (i: number): number => 62 + i * (332 - 62) / (K3_BITS - 1);

/* ---------- k4 · the plaintext image, as a padlock ---------- */
const K4_W = 20, K4_H = 12;
const K4_PLAIN: number[] = (() => {
  const out: number[] = [];
  for (let r = 0; r < K4_H; r++) for (let c = 0; c < K4_W; c++) {
    const body = r >= 6 && r <= 10 && c >= 6 && c <= 13;
    const d = Math.hypot(c - 9.5, (r - 6) * 1.35);
    const shackle = r < 6 && d >= 2.4 && d <= 4.1;
    out.push(body || shackle ? 1 : 0);
  }
  return out;
})();

/* ---------- k8 · a group small enough to print ---------- */
const K8_P = 23, K8_G = 5;
const k8pow = (e: number): number => {
  let r = 1;
  for (let i = 0; i < e; i++) r = (r * K8_G) % K8_P;
  return r;
};
const k8powBase = (base: number, e: number): number => {
  let r = 1;
  for (let i = 0; i < e; i++) r = (r * base) % K8_P;
  return r;
};

export const anims: Record<string, Anim<any>> = {

/* ---------- k2 · the birthday bound ---------- */
k2:{
 title:"Where collisions start",
 caption:"The probability that some pair among n random values matches, against the number drawn. The dashed line sits at the square root of the space, and the curve turns over almost exactly there — which is the whole content of the birthday bound. Widen the value to 128 bits and the curve does not become flatter, it moves right: collision resistance is half the width, always. Drag the draws slider up to the dashed line and watch the probability go from negligible to certain across a factor of four in traffic.",
 controls:[{k:"bits",l:"Value width",min:16,max:128,step:8,v:64,u:" bits"},
           {k:"lg",l:"Values drawn",min:0,max:64,step:1,v:30,u:" (as 2^n)"}],
 svg:`<svg viewBox="0 0 340 210">
  <line x1="48" y1="164" x2="326" y2="164" stroke="${C_GREY}" stroke-width="1"/>
  <line x1="48" y1="26" x2="48" y2="164" stroke="${C_GREY}" stroke-width="1"/>
  <text x="42" y="30" font-size="8" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono">1</text>
  <text x="42" y="167" font-size="8" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono">0</text>
  <text x="14" y="100" font-size="8" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono">P</text>
  <line data-e="half" x1="187" y1="26" x2="187" y2="164" stroke="${C_L2}" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text data-e="halflab" x="187" y="20" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <path data-e="fill" fill="${C_CU}" opacity="0.25" stroke="none"/>
  <path data-e="curve" fill="none" stroke="${C_CU}" stroke-width="2" stroke-linejoin="round"/>
  <line data-e="mk" x1="48" y1="26" x2="48" y2="164" stroke="${C_N}" stroke-width="1.2"/>
  <circle data-e="dot" cx="48" cy="164" r="4.5" fill="${C_N}"/>
  <text data-e="pv" x="48" y="182" font-size="9" fill="${C_N}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text x="48" y="200" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">values drawn, 2⁰</text>
  <text data-e="xmax" x="326" y="200" font-size="8" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono"></text>
 </svg>`,
 draw(t: number, c: { bits: number; lg: number }, E: Els){
  const bits = Math.max(8, Math.round(c.bits));
  const X = (k: number): number => 48 + 278 * Math.min(1, Math.max(0, k / bits));
  // p ≈ 1 − e^(−n²/2N), with the exponent kept in log2 so n² cannot overflow.
  const P = (k: number): number => {
    const lg2x = 2 * k - 1 - bits;
    return lg2x > 40 ? 1 : lg2x < -60 ? 0 : -Math.expm1(-(2 ** lg2x));
  };
  const Y = (p: number): number => 164 - 138 * p;

  // The shaded area sweeps out under the curve on a four-second cycle, so the
  // eye is dragged across the turn rather than presented with it.
  const sweep = Math.min(1, ((t % 4.4) / 4.4) * 1.25);
  const kEnd = bits * sweep;

  let curve = "", fill = "M48 164";
  for (let i = 0; i <= 120; i++) {
    const k = bits * i / 120, x = X(k), y = Y(P(k));
    curve += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
    if (k <= kEnd) fill += "L" + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  fill += "L" + X(kEnd).toFixed(1) + " 164 Z";
  E.curve.setAttribute("d", curve);
  E.fill.setAttribute("d", fill);

  const xh = X(bits / 2);
  E.half.setAttribute("x1", xh.toFixed(1));
  E.half.setAttribute("x2", xh.toFixed(1));
  E.halflab.setAttribute("x", xh.toFixed(1));
  E.halflab.textContent = "√N = 2" + String(Math.round(bits / 2)).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]).join("");

  const lg = Math.min(bits, Math.max(0, Math.round(c.lg)));
  const p = P(lg), xm = X(lg), ym = Y(p);
  E.mk.setAttribute("x1", xm.toFixed(1));
  E.mk.setAttribute("x2", xm.toFixed(1));
  E.dot.setAttribute("cx", xm.toFixed(1));
  E.dot.setAttribute("cy", ym.toFixed(1));
  E.dot.setAttribute("fill", p > 0.5 ? C_RED : p > 1e-6 ? C_CU : C_PE);
  E.pv.setAttribute("x", Math.min(300, Math.max(56, xm)).toFixed(1));
  E.pv.setAttribute("fill", p > 0.5 ? C_RED : C_N);
  E.pv.textContent = p >= 0.9995 ? "P ≈ 1" : "P = " + (p * 100).toPrecision(3) + "%";
  E.xmax.textContent = "2" + String(bits).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]).join("");

  E.read.innerHTML = rd([
    ["Space size", "2^" + bits],
    ["Values drawn", "2^" + lg],
    ["Collision probability", p >= 0.9995 ? "effectively 1" : p < 1e-9 ? "below 10⁻⁹" : (p * 100).toPrecision(3) + " %"],
    ["50 % reached at", "≈ 2^" + (bits / 2).toFixed(1) + " values"],
    ["Collision resistance", Math.round(bits / 2) + " bits, not " + bits],
  ]);
 }},

/* ---------- k3 · the same keystream, twice ---------- */
k3:{
 title:"Two messages, one keystream",
 caption:"Two four-letter messages, their ciphertexts, and at the bottom the XOR of the two ciphertexts — which is what any eavesdropper can compute for free. With a fresh nonce per message that row is noise. Switch to the reused nonce and the keystream cancels: the bottom row becomes the XOR of the plaintexts, and because ASCII letters share their top three bits, every byte shows three guaranteed zeros. That regularity is the crack a crib-dragging attack opens.",
 controls:[{k:"mode",l:"Nonce",v:"same",sel:[["same","reused for both messages"],["diff","fresh for each message"]]}],
 svg:`<svg viewBox="0 0 340 200">
  <text x="4" y="28" font-size="9" fill="${C_L1}" font-family="IBM Plex Mono">m₁ MEET</text>
  <text x="4" y="48" font-size="9" fill="${C_L1}" font-family="IBM Plex Mono">m₂ MOVE</text>
  <text x="4" y="80" font-size="9" fill="${C_N}" font-family="IBM Plex Mono">c₁</text>
  <text x="4" y="100" font-size="9" fill="${C_N}" font-family="IBM Plex Mono">c₂</text>
  <text x="4" y="138" font-size="9" fill="${C_L2}" font-family="IBM Plex Mono">c₁⊕c₂</text>
  <line x1="56" y1="60" x2="336" y2="60" stroke="${C_GREY}" stroke-width="0.8"/>
  <line x1="56" y1="114" x2="336" y2="114" stroke="${C_GREY}" stroke-width="0.8"/>
  <g data-e="r0"></g><g data-e="r1"></g><g data-e="r2"></g><g data-e="r3"></g><g data-e="r4"></g>
  <line data-e="b1" x1="128" y1="18" x2="128" y2="144" stroke="${C_GREY}" stroke-width="0.7"/>
  <line data-e="b2" x1="197" y1="18" x2="197" y2="144" stroke="${C_GREY}" stroke-width="0.7"/>
  <line data-e="b3" x1="266" y1="18" x2="266" y2="144" stroke="${C_GREY}" stroke-width="0.7"/>
  <text data-e="verdict" x="170" y="168" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="186" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 init(E: Els){
  E._rows = [0, 1, 2, 3, 4].map((i) => mkBits(E["r" + i], K3_BITS, 3.1));
 },
 draw(t: number, c: { mode: string }, E: Els){
  const same = c.mode === "same";
  const Y = [24, 44, 76, 96, 134];
  const k1 = (i: number): number => byteOf(7, i) & 1;
  const k2 = (i: number): number => same ? k1(i) : byteOf(19, i) & 1;

  // The bottom row is revealed left to right, so the byte structure appears
  // in the order an analyst would read it.
  const reveal = Math.min(1, ((t % 6) / 6) * 1.6);

  let zerosTop = 0, ones = 0;
  for (let i = 0; i < K3_BITS; i++) {
    const m1 = K3_M1[i], m2 = K3_M2[i];
    const c1 = m1 ^ k1(i), c2 = m2 ^ k2(i);
    const x = c1 ^ c2;
    const vals = [m1, m2, c1, c2, x];
    if (i % 8 < 3 && x === 0) zerosTop++;
    if (x === 1) ones++;

    for (let r = 0; r < 5; r++) {
      const el = E._rows[r][i];
      const on = vals[r] === 1;
      const shown = r < 4 || i / K3_BITS <= reveal;
      const base = r < 2 ? C_L1 : r < 4 ? C_N : same ? C_RED : C_L3;
      el.setAttribute("cx", k3x(i).toFixed(1));
      el.setAttribute("cy", String(Y[r]));
      el.setAttribute("fill", on ? base : "none");
      el.setAttribute("stroke", base);
      el.setAttribute("opacity", shown ? (on ? "1" : "0.45") : "0.08");
    }
  }

  E.verdict.textContent = same
    ? "c₁ ⊕ c₂ = m₁ ⊕ m₂ — the key is gone"
    : "c₁ ⊕ c₂ = m₁ ⊕ m₂ ⊕ k₁ ⊕ k₂ — noise";
  E.verdict.setAttribute("fill", same ? C_RED : C_PE);
  E.sub.textContent = same
    ? "top three bits of every byte are zero: both plaintexts are letters"
    : "no structure survives; nothing to drag a crib against";

  E.read.innerHTML = rd([
    ["Nonce", same ? "reused — one keystream for both" : "fresh per message"],
    ["What the eavesdropper computes", "c₁ ⊕ c₂, with no key"],
    ["Result", same ? "m₁ ⊕ m₂ — the plaintexts, superimposed" : "uniform noise"],
    ["Zero bits in the top 3 of each byte", zerosTop + " of 12"],
    ["Ones in the row", ones + " of " + K3_BITS],
    ["Recoverable", same ? "both messages, by crib dragging" : "nothing"],
  ]);
 }},

/* ---------- k4 · modes of operation on one picture ---------- */
k4:{
 title:"The same image, four ways",
 caption:"A 20×12 image where each cell is one block. Encryption sweeps across it, so you can watch ECB replace each block independently while CBC carries the previous block forward. ECB maps equal plaintext blocks to equal ciphertext blocks, so the padlock is still there — the cipher is not weakened at all, the pattern was simply never encrypted. Now move the IV slider: under CBC and CTR every block changes, and under ECB nothing moves, because ECB has nowhere to put an IV.",
 controls:[{k:"mode",l:"Mode",v:"ecb",sel:[["plain","plaintext (no encryption)"],["ecb","ECB"],["cbc","CBC"],["ctr","CTR"]]},
           {k:"iv",l:"IV / nonce",min:0,max:255,step:1,v:97,u:""}],
 svg:`<svg viewBox="0 0 340 216">
  <g data-e="grid"></g>
  <rect x="43" y="17" width="254" height="158" fill="none" stroke="${C_GREY}" stroke-width="1"/>
  <text data-e="lab" x="170" y="192" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="208" font-size="9" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <line data-e="scan" x1="44" y1="17" x2="44" y2="175" stroke="${C_CU}" stroke-width="1.4"/>
 </svg>`,
 init(E: Els){
  E._cells = mkRects(E.grid, K4_W * K4_H, 11.6, 12.4, C_L2);
 },
 draw(t: number, c: { mode: string; iv: number }, E: Els){
  const mode = String(c.mode), iv = Math.round(c.iv), N = K4_W * K4_H;
  const plain = mode === "plain";
  const sweep = plain ? 1 : Math.min(1, ((t % 5) / 5) * 1.3);
  const done = Math.round(sweep * N);

  // One pass, in block order, so CBC's chaining value is available when the
  // block that needs it is reached.
  const ct: number[] = new Array(N);
  let prev = word(0, iv);
  for (let i = 0; i < N; i++) {
    const p = K4_PLAIN[i];
    if (mode === "ecb") ct[i] = byteOf(1, p);
    // The chaining value is kept at full width and only its low byte is shown.
    // Chaining a byte into a byte would cycle after about 16 blocks, which is
    // an artefact of the toy size rather than anything CBC does.
    else if (mode === "cbc") { prev = word(2, p, prev); ct[i] = prev & 255; }
    else if (mode === "ctr") ct[i] = byteOf(3, iv, i) ^ (p ? 0xff : 0);
    else ct[i] = p ? 235 : 30;
  }

  const seen = new Set<number>();
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / K4_W), col = i % K4_W;
    const shown = plain || i < done;
    const v = shown ? ct[i] : (K4_PLAIN[i] ? 235 : 30);
    if (shown && !plain) seen.add(ct[i]);
    const el = E._cells[i];
    el.setAttribute("x", (44 + col * 12.7).toFixed(1));
    el.setAttribute("y", (18 + r * 13).toFixed(1));
    el.setAttribute("fill", shown && !plain ? C_L2 : C_L1);
    el.setAttribute("fill-opacity", (0.07 + 0.88 * (v / 255)).toFixed(3));
  }

  const x = 44 + 253 * sweep;
  E.scan.setAttribute("x1", x.toFixed(1));
  E.scan.setAttribute("x2", x.toFixed(1));
  E.scan.setAttribute("opacity", plain || sweep >= 1 ? "0" : "1");

  const leaks = mode === "ecb";
  E.lab.textContent = plain ? "plaintext — 2 distinct block values"
    : mode === "ecb" ? "cᵢ = E(k, mᵢ)"
    : mode === "cbc" ? "cᵢ = E(k, mᵢ ⊕ cᵢ₋₁),  c₀ = IV"
    : "cᵢ = mᵢ ⊕ E(k, nonce ‖ i)";
  E.verdict.textContent = plain ? "before encryption"
    : leaks ? "the picture survives — equal blocks, equal ciphertext"
    : "no structure left, and the IV changes every block";
  E.verdict.setAttribute("fill", plain ? C_L3 : leaks ? C_RED : C_PE);

  E.read.innerHTML = rd([
    ["Mode", plain ? "none" : mode.toUpperCase()],
    ["IV / nonce", plain || mode === "ecb" ? "not used by this mode" : String(iv)],
    ["Distinct ciphertext values", plain ? "2" : String(seen.size)],
    ["Equal blocks give equal ciphertext", plain ? "—" : leaks ? "yes — the whole leak" : "no"],
    ["Encryption order", plain ? "—" : mode === "cbc" ? "sequential; each block needs the last" : "parallel; every block independent"],
    ["Authenticated", plain ? "—" : "no — all three are malleable"],
  ]);
 }},

/* ---------- k8 · key agreement, with and without an active attacker ---------- */
k8:{
 title:"Diffie–Hellman, and the man in the middle",
 caption:"A real exchange in a group small enough to print: g = 5, p = 23. With Mallory passive, Alice and Bob compute the same secret from values an eavesdropper cannot combine. Switch her on and she runs two exchanges, one with each side. Both handshakes succeed, both parties derive a key, and the two keys are different — but neither side has anything to compare against, so neither sees a problem. Nothing in the mathematics detects this; only an identity bound to the exchange does.",
 controls:[{k:"a",l:"Alice's secret a",min:1,max:22,step:1,v:6,u:""},
           {k:"b",l:"Bob's secret b",min:1,max:22,step:1,v:15,u:""},
           {k:"m",l:"Mallory's secret m",min:1,max:22,step:1,v:9,u:""},
           {k:"mitm",l:"Active attacker",v:"off",sel:[["off","passive eavesdropper"],["on","man in the middle"]]}],
 svg:`<svg viewBox="0 0 340 214">
  <line data-e="wl" x1="66" y1="72" x2="274" y2="72" stroke="${C_GREY}" stroke-width="1.4"/>
  <line data-e="wr" x1="66" y1="108" x2="274" y2="108" stroke="${C_GREY}" stroke-width="1.4"/>
  <circle cx="46" cy="90" r="19" fill="${C_PE}" stroke="${C_L2}" stroke-width="1.6"/>
  <text x="46" y="94" font-size="10" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono">A</text>
  <circle cx="294" cy="90" r="19" fill="${C_PE}" stroke="${C_L2}" stroke-width="1.6"/>
  <text x="294" y="94" font-size="10" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono">B</text>
  <circle data-e="mal" cx="170" cy="90" r="16" fill="${C_RED}" stroke="${C_L2}" stroke-width="1.6" opacity="0"/>
  <text data-e="mall" x="170" y="94" font-size="10" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono" opacity="0">M</text>
  <circle data-e="p1" cx="66" cy="72" r="4" fill="${C_CU}"/>
  <circle data-e="p2" cx="274" cy="108" r="4" fill="${C_CU}"/>
  <text data-e="t1" x="120" y="64" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t2" x="222" y="64" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t3" x="120" y="126" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t4" x="222" y="126" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text x="170" y="22" font-size="9" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono">g = 5, p = 23, both public</text>
  <text data-e="ka" x="46" y="140" font-size="9" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="kb" x="294" y="140" font-size="9" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="km" x="170" y="140" font-size="9" fill="${C_RED}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="176" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="196" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 draw(t: number, c: { a: number; b: number; m: number; mitm: string }, E: Els){
  const a = Math.round(c.a), b = Math.round(c.b), m = Math.round(c.m);
  const on = c.mitm === "on";
  const A = k8pow(a), B = k8pow(b), M = k8pow(m);

  // What each side actually receives, and therefore what each side derives.
  const aGets = on ? M : B, bGets = on ? M : A;
  const kA = k8powBase(aGets, a), kB = k8powBase(bGets, b);
  const agree = kA === kB;

  const u = (t % 3) / 3;                       // packets crossing the wire
  const mid = 170;
  const x1 = on ? 66 + (mid - 66) * u : 66 + 208 * u;
  const x2 = on ? 274 - (274 - mid) * u : 274 - 208 * u;
  E.p1.setAttribute("cx", x1.toFixed(1));
  E.p2.setAttribute("cx", x2.toFixed(1));
  E.p1.setAttribute("fill", on ? C_RED : C_CU);
  E.p2.setAttribute("fill", on ? C_RED : C_CU);

  E.mal.setAttribute("opacity", on ? "1" : "0");
  E.mall.setAttribute("opacity", on ? "1" : "0");
  E.wl.setAttribute("stroke", on ? C_RED : C_GREY);
  E.wr.setAttribute("stroke", on ? C_RED : C_GREY);

  E.t1.textContent = "g^a = " + A;
  E.t2.textContent = on ? "g^m = " + M : "g^a = " + A;
  E.t3.textContent = on ? "g^m = " + M : "g^b = " + B;
  E.t4.textContent = "g^b = " + B;

  E.ka.textContent = "key " + kA;
  E.kb.textContent = "key " + kB;
  E.ka.setAttribute("fill", agree ? C_PE : C_RED);
  E.kb.setAttribute("fill", agree ? C_PE : C_RED);
  E.km.textContent = on ? "holds " + kA + " and " + kB : "";

  E.verdict.textContent = agree
    ? "both sides derived " + kA + " — and only they can"
    : "Alice has " + kA + ", Bob has " + kB + " — and both think they succeeded";
  E.verdict.setAttribute("fill", agree ? C_PE : C_RED);
  E.sub.textContent = agree
    ? "the eavesdropper sees g, g^a and g^b, and cannot combine them"
    : "Mallory decrypts with one key and re-encrypts with the other";

  E.read.innerHTML = rd([
    ["Alice sends g^a mod p", String(A)],
    ["Bob sends g^b mod p", String(B)],
    ["Alice receives", (on ? "g^m = " + M + " — not Bob's" : "g^b = " + B)],
    ["Bob receives", (on ? "g^m = " + M + " — not Alice's" : "g^a = " + A)],
    ["Alice's shared secret", String(kA)],
    ["Bob's shared secret", String(kB)],
    ["Agreement", agree ? "yes" : "no — and nothing in the exchange says so"],
    ["What is missing", agree ? "nothing here; an active attacker is another matter" : "an identity bound to the key share"],
  ]);
 }},

/* ---------- k12 · what an early return tells the attacker ---------- */
k12:{
 title:"Comparing a tag, two ways",
 caption:"Sixteen bytes of a submitted tag against the real one. The early-return comparison stops at the first mismatch, so the time it takes measures how many leading bytes the attacker already has right — drag the slider and watch the bar grow one byte at a time. That is a readout of the secret. The constant-time version touches all sixteen bytes whatever happens, the bar never moves, and the attacker is back to guessing the whole tag at once.",
 controls:[{k:"got",l:"Leading bytes guessed right",min:0,max:16,step:1,v:5,u:" of 16"},
           {k:"mode",l:"Comparison",v:"early",sel:[["early","early return on first mismatch"],["ct","constant time"]]}],
 svg:`<svg viewBox="0 0 340 216">
  <text x="6" y="32" font-size="9" fill="${C_L3}" font-family="IBM Plex Mono">real</text>
  <text x="6" y="60" font-size="9" fill="${C_L3}" font-family="IBM Plex Mono">sent</text>
  <g data-e="rowA"></g>
  <g data-e="rowB"></g>
  <line data-e="scan" x1="44" y1="18" x2="44" y2="70" stroke="${C_CU}" stroke-width="1.6"/>
  <text x="6" y="112" font-size="9" fill="${C_L3}" font-family="IBM Plex Mono">time</text>
  <rect x="44" y="100" width="290" height="16" fill="none" stroke="${C_GREY}" stroke-width="1"/>
  <rect data-e="bar" x="44" y="100" width="0" height="16" fill="${C_CU}"/>
  <text data-e="tl" x="336" y="132" font-size="8.5" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="164" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="182" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="cost" x="170" y="204" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 init(E: Els){
  E._a = mkRects(E.rowA, 16, 15, 15, C_L2);
  E._b = mkRects(E.rowB, 16, 15, 15, C_L2);
 },
 draw(t: number, c: { got: number; mode: string }, E: Els){
  const got = Math.min(16, Math.max(0, Math.round(c.got)));
  const early = c.mode === "early";
  // Bytes actually read before the routine returns.
  const read = early ? Math.min(16, got + 1) : 16;
  // The scan re-runs every 2.6 s, walking only as far as the routine gets.
  const walk = Math.min(read, ((t % 2.6) / 2.6) * (read + 0.6));

  for (let i = 0; i < 16; i++) {
    const x = 44 + i * 18.2;
    const matched = i < got;
    const touched = i < walk;
    const A = E._a[i], B = E._b[i];
    A.setAttribute("x", x.toFixed(1)); A.setAttribute("y", "18");
    B.setAttribute("x", x.toFixed(1)); B.setAttribute("y", "46");
    A.setAttribute("fill", C_L2);
    A.setAttribute("fill-opacity", touched ? "0.85" : "0.2");
    B.setAttribute("fill", matched ? C_PE : i === got ? C_RED : C_L3);
    B.setAttribute("fill-opacity", touched ? "0.9" : "0.18");
  }

  const x = 44 + Math.min(16, walk) * 18.2;
  E.scan.setAttribute("x1", x.toFixed(1));
  E.scan.setAttribute("x2", x.toFixed(1));
  E.scan.setAttribute("opacity", walk >= read ? "0.25" : "1");

  E.bar.setAttribute("width", (290 * read / 16).toFixed(1));
  E.bar.setAttribute("fill", early ? C_RED : C_PE);
  E.tl.textContent = read + " of 16 bytes read before returning";

  E.verdict.textContent = early
    ? "the timing counts the bytes the attacker got right"
    : "the same work every time, whatever matched";
  E.verdict.setAttribute("fill", early ? C_RED : C_PE);
  E.sub.textContent = early
    ? "so each byte can be found on its own, then the next"
    : "diff |= a[i] ^ b[i] over all sixteen, compared once";

  E.cost.textContent = early
    ? "forgery cost: 256 × 16 = " + (256 * 16) + " attempts"
    : "forgery cost: 2¹²⁸ attempts";

  E.read.innerHTML = rd([
    ["Comparison", early ? "early return" : "constant time"],
    ["Bytes matching", got + " of 16"],
    ["Bytes read before returning", read + " of 16"],
    ["Time leaks", early ? "yes — proportional to the matching prefix" : "no"],
    ["Attempts to forge the tag", early ? "≈ 4,096" : "2¹²⁸"],
    ["Fix", early ? "accumulate with OR, compare once at the end" : "already applied"],
  ]);
 }},
};
