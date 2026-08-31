import type { Anim, Els } from "../../types.js";
import { rd } from "../../helpers.js";
import { NS, C_L1, C_L2, C_L3, C_N, C_PE, C_CU, C_RED, C_GREY } from "../../anim/runtime.js";

/**
 * Computer-architecture animations, keyed by module id; a module without an
 * entry has no visual tab. See the animation contract in CLAUDE.md — `draw`
 * is a pure function of `(t, c)` and must never set an attribute to NaN at
 * any control extreme.
 *
 * The pipeline, predictor and cache simulations are re-run from scratch on
 * every frame. They are a few dozen steps each, which is nothing against the
 * frame budget, and it is the only way `draw` can stay a pure function of
 * `(t, c)` as the contract requires.
 */

function mkRects(g: any, n: number, w: number, h: number, fill: string): any[] {
  while (g.firstChild) g.removeChild(g.firstChild);
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("width", String(w));
    r.setAttribute("height", String(h));
    r.setAttribute("fill", fill);
    out.push(r); g.appendChild(r);
  }
  return out;
}

function mkTexts(g: any, n: number, size: number, fill: string): any[] {
  while (g.firstChild) g.removeChild(g.firstChild);
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const e = document.createElementNS(NS, "text");
    e.setAttribute("font-size", String(size));
    e.setAttribute("fill", fill);
    e.setAttribute("text-anchor", "middle");
    e.setAttribute("font-family", "IBM Plex Mono");
    out.push(e); g.appendChild(e);
  }
  return out;
}

/** Deterministic 32-bit mixer, for reproducible "random" patterns. */
function mix(x: number): number {
  let h = (x ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/* ---------- a3 · five instructions, two dependencies ---------- */
const A3_INSTR = [
  { txt: "add r1,r2,r3", src: [] as number[], load: false },
  { txt: "sub r4,r1,r5", src: [0], load: false },      // RAW on r1
  { txt: "or  r6,r7,r8", src: [] as number[], load: false },
  { txt: "lw  r9,(r10)", src: [] as number[], load: true },
  { txt: "add r11,r9,r12", src: [3], load: false },    // load-use on r9
];
const A3_COLS = 13;
const A3_STAGE = ["IF", "ID", "EX", "ME", "WB"];
const A3_COL = [C_L3, C_N, C_PE, C_CU, C_L1];

/* ---------- a4 · outcome patterns for the predictor ---------- */
const A4_N = 24;
function a4Outcome(pattern: string, i: number): boolean {
  if (pattern === "loop") return i % 8 !== 7;          // seven taken, one not
  if (pattern === "alt") return i % 2 === 0;
  return (mix(i * 2654435761) & 1) === 1;              // reproducible coin flip
}

/* ---------- a6 · a 16-set cache walked at a chosen stride ---------- */
const A6_SETS = 16, A6_LINE = 64, A6_ACC = 40;

/* ---------- a7 · 64 elements in 8 lines of 8 ---------- */
const A7_LINES = 8, A7_PER = 8;
/** Every pattern touches the same number of elements — only the order differs,
    which is the entire point of the comparison. */
const A7_TOUCH = 8;

export const anims: Record<string, Anim<any>> = {

/* ---------- a3 · the pipeline, with and without forwarding ---------- */
a3:{
 title:"Five instructions through the pipeline",
 caption:"Each row is an instruction and each column a cycle. Without forwarding, an instruction needing a previous result waits until that result reaches the register file — two dead cycles, in red. Turn forwarding on and the result is routed from where it is produced straight to where it is needed, and the arithmetic stall vanishes entirely. One stall survives: the load-use hazard at the bottom, because a load produces its value a stage later than arithmetic does, and no arrangement of wires can deliver it earlier.",
 controls:[{k:"fwd",l:"Forwarding",v:"on",sel:[["on","on — bypass results to where they are needed"],["off","off — wait for write-back"]]}],
 svg:`<svg viewBox="0 0 340 208">
  <g data-e="cells"></g>
  <g data-e="labels"></g>
  <text data-e="i0" x="4" y="36" font-size="7.5" fill="${C_L2}" font-family="IBM Plex Mono"></text>
  <text data-e="i1" x="4" y="54" font-size="7.5" fill="${C_L2}" font-family="IBM Plex Mono"></text>
  <text data-e="i2" x="4" y="72" font-size="7.5" fill="${C_L2}" font-family="IBM Plex Mono"></text>
  <text data-e="i3" x="4" y="90" font-size="7.5" fill="${C_L2}" font-family="IBM Plex Mono"></text>
  <text data-e="i4" x="4" y="108" font-size="7.5" fill="${C_L2}" font-family="IBM Plex Mono"></text>
  <text x="4" y="22" font-size="7.5" fill="${C_L3}" font-family="IBM Plex Mono">cycle</text>
  <line data-e="now" x1="92" y1="14" x2="92" y2="116" stroke="${C_L2}" stroke-width="1.2" stroke-dasharray="3 3"/>
  <text data-e="verdict" x="170" y="146" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="164" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="leg" x="170" y="192" font-size="8" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono">IF fetch · ID decode · EX execute · ME memory · WB write-back</text>
 </svg>`,
 init(E: Els){
  E._cells = mkRects(E.cells, A3_INSTR.length * A3_COLS, 17, 15, C_GREY);
  E._labels = mkTexts(E.labels, A3_INSTR.length * A3_COLS, 6.5, C_GREY);
 },
 draw(t: number, c: { fwd: string }, E: Els){
  const fwd = c.fwd === "on";
  // Issue in order, delayed by whatever the dependencies require.
  const start: number[] = [];
  for (let i = 0; i < A3_INSTR.length; i++) {
    let s = i === 0 ? 0 : start[i - 1] + 1;           // in-order issue
    for (const p of A3_INSTR[i].src) {
      // Producer stages: IF s, ID s+1, EX s+2, ME s+3, WB s+4.
      const need = fwd
        ? (A3_INSTR[p].load ? start[p] + 2 : start[p] + 1)  // from ME, or from EX
        : start[p] + 3;                                      // wait for write-back
      if (s < need) s = need;
    }
    start[i] = s;
  }
  const stalls = start[start.length - 1] - (A3_INSTR.length - 1);
  const total = start[start.length - 1] + 5;
  const nowC = ((t % 7) / 7) * A3_COLS;

  for (let r = 0; r < A3_INSTR.length; r++) {
    for (let col = 0; col < A3_COLS; col++) {
      const k = r * A3_COLS + col;
      const cell = E._cells[k], lab = E._labels[k];
      const stage = col - start[r];
      const x = 92 + col * 18.5, y = 26 + r * 18;
      cell.setAttribute("x", x.toFixed(1));
      cell.setAttribute("y", String(y));
      cell.setAttribute("width", "17");
      cell.setAttribute("height", "15");
      lab.setAttribute("x", (x + 8.5).toFixed(1));
      lab.setAttribute("y", String(y + 10.5));

      // A stalled slot is one after this instruction could have issued but
      // before it actually did — that is the cost the dependency imposed.
      const earliest = r === 0 ? 0 : start[r - 1] + 1;
      const stalled = col >= earliest && col < start[r];
      const active = stage >= 0 && stage < 5;
      const seen = col < nowC;

      if (active) {
        cell.setAttribute("fill", A3_COL[stage]);
        cell.setAttribute("fill-opacity", seen ? "0.9" : "0.16");
        lab.textContent = A3_STAGE[stage];
        lab.setAttribute("fill", stage === 0 || stage === 1 ? C_L2 : C_GREY);
        lab.setAttribute("opacity", seen ? "1" : "0.2");
      } else if (stalled) {
        cell.setAttribute("fill", C_RED);
        cell.setAttribute("fill-opacity", seen ? "0.55" : "0.12");
        lab.textContent = "--";
        lab.setAttribute("fill", C_GREY);
        lab.setAttribute("opacity", seen ? "1" : "0.2");
      } else {
        cell.setAttribute("fill", C_GREY);
        cell.setAttribute("fill-opacity", "0.08");
        lab.textContent = "";
        lab.setAttribute("opacity", "0");
      }
    }
    E["i" + r].textContent = A3_INSTR[r].txt;
  }

  E.now.setAttribute("x1", (92 + nowC * 18.5).toFixed(1));
  E.now.setAttribute("x2", (92 + nowC * 18.5).toFixed(1));

  E.verdict.textContent = stalls === 0
    ? "no stalls — one instruction completes every cycle"
    : stalls + " stall cycle" + (stalls > 1 ? "s" : "") + ", " + total + " cycles for 5 instructions";
  E.verdict.setAttribute("fill", stalls === 0 ? C_PE : stalls > 2 ? C_RED : C_CU);
  E.sub.textContent = fwd
    ? "the surviving stall is load-use: a load produces its value one stage late"
    : "every dependent instruction waits for the producer's write-back";

  E.read.innerHTML = rd([
    ["Forwarding", fwd ? "on" : "off"],
    ["Instructions", String(A3_INSTR.length)],
    ["Stall cycles", String(stalls)],
    ["Total cycles", String(total)],
    ["CPI", (total / A3_INSTR.length).toFixed(2)],
    ["Hazards present", "RAW on r1, load-use on r9"],
    ["Removed by forwarding", fwd ? "the arithmetic RAW stall" : "nothing — forwarding is off"],
  ]);
 }},

/* ---------- a4 · a predictor learning, or failing to ---------- */
a4:{
 title:"A two-bit predictor meeting three patterns",
 caption:"The top row is what the branch actually did, the bottom what the predictor guessed, and red marks a miss. On a loop the two-bit counter costs one miss per exit where a one-bit counter costs two, because two bits refuse to change their mind on a single surprise. On strict alternation the one-bit predictor is wrong every single time — it always predicts what just happened — while two bits get half. On random data neither can do anything at all, because there is no pattern to learn and none ever will be.",
 controls:[{k:"pattern",l:"Branch behaviour",v:"loop",sel:[["loop","loop: taken 7, not taken 1"],["alt","strict alternation"],["rand","unpredictable data"]]},
           {k:"bits",l:"Predictor",v:"2",sel:[["2","two-bit saturating counter"],["1","one-bit — predict last outcome"]]}],
 svg:`<svg viewBox="0 0 340 210">
  <text x="4" y="34" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">actual</text>
  <text x="4" y="58" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">guess</text>
  <text x="4" y="80" font-size="8" fill="${C_RED}" font-family="IBM Plex Mono">miss</text>
  <g data-e="act"></g>
  <g data-e="pred"></g>
  <g data-e="miss"></g>
  <text x="4" y="112" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">state</text>
  <rect data-e="s0" x="44" y="100" width="46" height="16" fill="${C_GREY}" stroke="${C_L2}" stroke-width="1"/>
  <rect data-e="s1" x="92" y="100" width="46" height="16" fill="${C_GREY}" stroke="${C_L2}" stroke-width="1"/>
  <rect data-e="s2" x="140" y="100" width="46" height="16" fill="${C_GREY}" stroke="${C_L2}" stroke-width="1"/>
  <rect data-e="s3" x="188" y="100" width="46" height="16" fill="${C_GREY}" stroke="${C_L2}" stroke-width="1"/>
  <text x="67" y="111" font-size="6.5" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono">strong N</text>
  <text x="115" y="111" font-size="6.5" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono">weak N</text>
  <text x="163" y="111" font-size="6.5" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono">weak T</text>
  <text x="211" y="111" font-size="6.5" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono">strong T</text>
  <text data-e="acc" x="290" y="112" font-size="10" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="146" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="164" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="cost" x="170" y="188" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 init(E: Els){
  E._act = mkRects(E.act, A4_N, 10, 14, C_GREY);
  E._pred = mkRects(E.pred, A4_N, 10, 14, C_GREY);
  E._miss = mkRects(E.miss, A4_N, 10, 4, C_RED);
 },
 draw(t: number, c: { pattern: string; bits: string }, E: Els){
  const two = c.bits === "2";
  const shown = Math.min(A4_N, Math.floor(((t % 10) / 10) * (A4_N + 3)));

  // Replay the whole sequence; the cursor only decides what is drawn.
  let state = 2;                      // weakly taken
  const act: boolean[] = [], pred: boolean[] = [];
  let misses = 0, missesShown = 0;
  let stateAt = 2;
  for (let i = 0; i < A4_N; i++) {
    const p = two ? state >= 2 : state >= 1;
    const a = a4Outcome(String(c.pattern), i);
    pred[i] = p; act[i] = a;
    if (p !== a) { misses++; if (i < shown) missesShown++; }
    if (i < shown) stateAt = state;
    state = two
      ? Math.max(0, Math.min(3, state + (a ? 1 : -1)))
      : (a ? 3 : 0);                  // one bit: jump straight to the outcome
  }

  for (let i = 0; i < A4_N; i++) {
    const x = 44 + i * 11.6, on = i < shown;
    const A = E._act[i], P = E._pred[i], M = E._miss[i];
    A.setAttribute("x", x.toFixed(1)); A.setAttribute("y", "22");
    P.setAttribute("x", x.toFixed(1)); P.setAttribute("y", "46");
    M.setAttribute("x", x.toFixed(1)); M.setAttribute("y", "70");
    A.setAttribute("fill", act[i] ? C_PE : C_GREY);
    A.setAttribute("fill-opacity", on ? "0.9" : "0.15");
    P.setAttribute("fill", pred[i] ? C_PE : C_GREY);
    P.setAttribute("fill-opacity", on ? "0.9" : "0.15");
    M.setAttribute("opacity", on && pred[i] !== act[i] ? "1" : "0");
  }

  for (let s = 0; s < 4; s++) {
    const el = E["s" + s];
    const live = two ? s === stateAt : (stateAt >= 2 ? s === 3 : s === 0);
    el.setAttribute("fill", live ? (s >= 2 ? C_PE : C_L3) : C_GREY);
    el.setAttribute("fill-opacity", live ? "0.85" : "0.2");
    el.setAttribute("opacity", two || s === 0 || s === 3 ? "1" : "0.25");
  }

  const accPct = 100 * (A4_N - misses) / A4_N;
  E.acc.textContent = accPct.toFixed(0) + "%";
  E.acc.setAttribute("fill", accPct > 90 ? C_PE : accPct > 60 ? C_CU : C_RED);

  const pat = String(c.pattern);
  E.verdict.textContent = misses + " misses in " + A4_N + " branches — " + accPct.toFixed(0) + "% accurate";
  E.verdict.setAttribute("fill", accPct > 90 ? C_PE : accPct > 60 ? C_CU : C_RED);
  E.sub.textContent = pat === "loop"
    ? (two ? "two bits absorb the loop exit: one miss per iteration of the outer pattern"
           : "one bit misses twice per exit — on the way out and on the way back in")
    : pat === "alt"
      ? (two ? "the counter hovers, so it is right on every T and wrong on every N"
             : "always predicts what just happened, so it is wrong every single time")
      : "no pattern exists, so no predictor of any depth can learn one";
  E.cost.textContent = "at an 18-cycle penalty: " + (misses / A4_N * 18).toFixed(1) + " cycles wasted per branch";

  E.read.innerHTML = rd([
    ["Pattern", pat === "loop" ? "loop, 7 taken then 1 not" : pat === "alt" ? "strict alternation" : "unpredictable"],
    ["Predictor", two ? "two-bit saturating counter" : "one-bit"],
    ["Branches", String(A4_N)],
    ["Mispredicts", String(misses)],
    ["Accuracy", accPct.toFixed(1) + " %"],
    ["Wasted cycles per branch", (misses / A4_N * 18).toFixed(2)],
    ["Fixable by a better predictor", pat === "rand" ? "no — remove the branch instead" : "yes — history would capture this"],
  ]);
 }},

/* ---------- a6 · where a stride lands in the sets ---------- */
a6:{
 title:"A stride walking the cache sets",
 caption:"Sixteen sets down the side, the ways across. Each access is placed in the set its address selects, and a set that is full evicts to make room. At a stride of one line the accesses spread over every set and the whole cache is used. Double the stride and half the sets go idle; reach 1024 bytes and every single access lands in the same set, so a cache with a hundred and twenty-eight lines behaves like one with as many lines as it has ways. Nothing about the cache changed — only the arithmetic of which index the addresses produce.",
 controls:[{k:"ways",l:"Associativity",v:"4",sel:[["1","direct mapped"],["2","2-way"],["4","4-way"],["8","8-way"]]},
           {k:"stride",l:"Stride",v:"64",sel:[["64","64 B — one line"],["128","128 B"],["256","256 B"],["1024","1024 B"]]}],
 svg:`<svg viewBox="0 0 340 214">
  <text x="4" y="16" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">set</text>
  <text x="60" y="16" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">ways →</text>
  <g data-e="idx"></g>
  <g data-e="grid"></g>
  <text data-e="verdict" x="170" y="176" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="194" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="cnt" x="170" y="210" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 init(E: Els){
  E._grid = mkRects(E.grid, A6_SETS * 8, 24, 7, C_GREY);
  E._idx = mkTexts(E.idx, A6_SETS, 6, C_L3);
 },
 draw(t: number, c: { ways: string; stride: string }, E: Els){
  const W = parseInt(String(c.ways), 10);
  const stride = parseInt(String(c.stride), 10);
  const upto = Math.min(A6_ACC, Math.floor(((t % 8) / 8) * (A6_ACC + 4)));

  // Replay the access stream into a set-associative cache with LRU ways.
  const contents: number[][] = [];
  for (let s = 0; s < A6_SETS; s++) contents.push([]);
  const touched = new Set<number>();
  let hits = 0, misses = 0;
  for (let i = 0; i < upto; i++) {
    const addr = i * stride;
    const set = Math.floor(addr / A6_LINE) % A6_SETS;
    const tag = Math.floor(addr / (A6_LINE * A6_SETS));
    touched.add(set);
    const at = contents[set].indexOf(tag);
    if (at >= 0) { hits++; contents[set].splice(at, 1); contents[set].push(tag); }
    else {
      misses++;
      contents[set].push(tag);
      if (contents[set].length > W) contents[set].shift();
    }
  }

  for (let s = 0; s < A6_SETS; s++) {
    const lab = E._idx[s];
    lab.setAttribute("x", "22"); lab.setAttribute("y", String(30 + s * 8.6));
    lab.textContent = String(s);
    lab.setAttribute("opacity", touched.has(s) ? "1" : "0.3");
    for (let w = 0; w < 8; w++) {
      const el = E._grid[s * 8 + w];
      const active = w < W;
      el.setAttribute("x", String(36 + w * 26));
      el.setAttribute("y", String(24 + s * 8.6));
      el.setAttribute("width", "24");
      el.setAttribute("height", "7");
      el.setAttribute("opacity", active ? "1" : "0.07");
      const filled = active && w < contents[s].length;
      el.setAttribute("fill", filled ? (touched.has(s) ? C_N : C_GREY) : C_GREY);
      el.setAttribute("fill-opacity", filled ? "0.85" : "0.2");
    }
  }

  const reached = touched.size;
  const effective = reached * W;
  const concentrated = reached <= A6_SETS / 4;
  E.verdict.textContent = reached + " of " + A6_SETS + " sets used — " + effective + " of " + (A6_SETS * 8) + " possible lines live";
  E.verdict.setAttribute("fill", concentrated ? C_RED : reached === A6_SETS ? C_PE : C_CU);
  E.sub.textContent = concentrated
    ? "conflict misses: the addresses share the index bits"
    : reached === A6_SETS ? "the stride spreads evenly over every set" : "half the cache is sitting idle";
  E.cnt.textContent = upto + " accesses · " + hits + " hits · " + misses + " misses";

  E.read.innerHTML = rd([
    ["Associativity", W + "-way"],
    ["Stride", stride + " bytes"],
    ["Sets reached", reached + " of " + A6_SETS],
    ["Usable capacity", (100 * reached / A6_SETS).toFixed(0) + " % of the cache"],
    ["Accesses so far", String(upto)],
    ["Hits / misses", hits + " / " + misses],
    ["Limiting factor", concentrated ? "conflict misses" : "compulsory misses only"],
  ]);
 }},

/* ---------- a7 · the same bytes, three orders ---------- */
a7:{
 title:"Same array, three access orders",
 caption:"Sixty-four elements laid out in eight cache lines. Sequential access uses every byte of each line it fetches and the prefetcher runs ahead, so many misses are in flight at once. A stride that skips a line each time fetches just as many lines and uses one element from each. Pointer chasing fetches the same lines again and, crucially, cannot overlap them — the next address is inside the data that has not arrived yet, so the latencies add up end to end instead of running concurrently.",
 controls:[{k:"pattern",l:"Access order",v:"seq",sel:[["seq","sequential"],["stride","strided — one element per line"],["chase","pointer chasing"]]}],
 svg:`<svg viewBox="0 0 340 214">
  <g data-e="cells"></g>
  <g data-e="marks"></g>
  <text x="4" y="20" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">8 lines × 8 elements</text>
  <text x="4" y="122" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">in flight</text>
  <rect x="70" y="112" width="180" height="12" fill="none" stroke="${C_GREY}" stroke-width="1"/>
  <rect data-e="mlp" x="70" y="112" width="0" height="12" fill="${C_CU}"/>
  <text data-e="mlpn" x="258" y="122" font-size="8" fill="${C_L2}" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="152" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="170" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="cost" x="170" y="196" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 init(E: Els){
  E._cells = mkRects(E.cells, A7_LINES * A7_PER, 8, 8, C_GREY);
  E._marks = mkRects(E.marks, A7_LINES, 66, 2, C_CU);
 },
 draw(t: number, c: { pattern: string }, E: Els){
  const pat = String(c.pattern);
  const N = A7_LINES * A7_PER;
  const order = (i: number): number =>
    pat === "seq" ? i                       // 0…7: one line, every byte used
      : pat === "stride" ? i * A7_PER       // 0,8,16…: one element per line
      : (mix(i * 40503) % N);               // scattered, and dependent
  const upto = Math.min(A7_TOUCH, Math.floor(((t % 6) / 6) * (A7_TOUCH + 2)));

  const visited = new Set<number>();
  const linesFetched = new Set<number>();
  for (let i = 0; i < upto; i++) {
    const e = order(i);
    visited.add(e);
    linesFetched.add(Math.floor(e / A7_PER));
  }

  for (let l = 0; l < A7_LINES; l++) {
    for (let e = 0; e < A7_PER; e++) {
      const k = l * A7_PER + e;
      const el = E._cells[k];
      el.setAttribute("x", String(70 + e * 9));
      el.setAttribute("y", String(26 + l * 10));
      el.setAttribute("width", "8");
      el.setAttribute("height", "8");
      el.setAttribute("fill", visited.has(k) ? C_PE : C_GREY);
      el.setAttribute("fill-opacity", visited.has(k) ? "0.9" : "0.25");
    }
    const m = E._marks[l];
    m.setAttribute("x", "68"); m.setAttribute("y", String(36 + l * 10));
    m.setAttribute("width", "66"); m.setAttribute("height", "2");
    m.setAttribute("opacity", linesFetched.has(l) ? "0.8" : "0.1");
  }

  // Prefetchable patterns keep many misses outstanding; a dependent chain
  // keeps exactly one, which is the whole cost difference.
  const mlp = pat === "chase" ? 1 : pat === "seq" ? 12 : 8;
  const bytesUsed = linesFetched.size
    ? Math.round((visited.size * (A6_LINE / A7_PER)) / linesFetched.size)
    : 0;
  E.mlp.setAttribute("width", String(180 * mlp / 12));
  E.mlp.setAttribute("fill", mlp === 1 ? C_RED : C_CU);
  E.mlpn.textContent = mlp + (mlp === 1 ? " miss" : " misses");

  // Relative time: lines fetched × DRAM latency, divided by the overlap.
  const cost = (linesFetched.size * 250) / mlp;
  E.verdict.textContent = linesFetched.size + " lines fetched · " + bytesUsed + " of 64 bytes used per line";
  E.verdict.setAttribute("fill", pat === "seq" ? C_PE : pat === "stride" ? C_CU : C_RED);
  E.sub.textContent = pat === "seq"
    ? "every byte fetched is used, and the prefetcher runs ahead"
    : pat === "stride"
      ? "same lines fetched, one element used from each — 8× the traffic per element"
      : "the next address is inside the data that has not arrived: no overlap possible";
  E.cost.textContent = "≈ " + Math.round(cost) + " cycles of memory latency" + (mlp === 1 ? ", serialised" : ", overlapped");

  E.read.innerHTML = rd([
    ["Access order", pat === "seq" ? "sequential" : pat === "stride" ? "strided" : "pointer chasing"],
    ["Elements touched", visited.size + " of " + A7_TOUCH + " (array holds " + N + ")"],
    ["Cache lines fetched", linesFetched.size + " of " + A7_LINES],
    ["Bytes used per 64-byte line", String(bytesUsed)],
    ["Misses outstanding", String(mlp)],
    ["Prefetcher can help", pat === "chase" ? "no — it cannot follow a pointer" : "yes — the stride is detectable"],
    ["Relative memory cost", Math.round(cost) + " cycles"],
  ]);
 }},

/* ---------- a12 · which roof you are under ---------- */
a12:{
 title:"The roofline",
 caption:"Both axes are logarithmic. The sloped roof is memory bandwidth and the flat one is peak compute; where they meet is the ridge point. Slide a kernel left of the ridge and it is memory bound — the flat roof is unreachable, so wider vectors and more cores buy nothing at all. Slide it right and bandwidth stops mattering. Lower the bandwidth and watch the ridge move right: that is what has happened to real machines for two decades, and it is why so many kernels that used to be compute bound no longer are.",
 controls:[{k:"ai",l:"Arithmetic intensity",min:-4,max:6,step:0.5,v:-2,u:" (log₂ FLOP/B)"},
           {k:"bw",l:"Peak bandwidth",min:25,max:400,step:25,v:100,u:" GB/s"}],
 svg:`<svg viewBox="0 0 340 210">
  <line x1="44" y1="150" x2="322" y2="150" stroke="${C_GREY}" stroke-width="1"/>
  <line x1="44" y1="20" x2="44" y2="150" stroke="${C_GREY}" stroke-width="1"/>
  <text x="16" y="26" font-size="7.5" fill="${C_L3}" font-family="IBM Plex Mono">GF/s</text>
  <text data-e="ytop" x="40" y="26" font-size="7.5" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono"></text>
  <text data-e="ybot" x="40" y="152" font-size="7.5" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono"></text>
  <path data-e="roof" fill="none" stroke="${C_L2}" stroke-width="2" stroke-linejoin="round"/>
  <line data-e="ridge" x1="150" y1="20" x2="150" y2="150" stroke="${C_L3}" stroke-width="1" stroke-dasharray="3 3"/>
  <text data-e="rlab" x="150" y="16" font-size="7.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono">ridge</text>
  <line data-e="drop" x1="100" y1="150" x2="100" y2="150" stroke="${C_CU}" stroke-width="1" stroke-dasharray="2 2"/>
  <circle data-e="dot" cx="100" cy="100" r="5" fill="${C_CU}"/>
  <text x="180" y="166" font-size="7.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono">arithmetic intensity, FLOP/byte →</text>
  <text data-e="verdict" x="170" y="186" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="204" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 draw(t: number, c: { ai: number; bw: number }, E: Els){
  const PEAK = 500;                            // GFLOP/s, fixed
  const bw = Math.max(1, c.bw);
  const lgAi = c.ai;                           // log2 of intensity
  const ai = 2 ** lgAi;

  // Log-log axes. x is log2 intensity over [-5, 7]; y is log10 GFLOP/s.
  const X = (l: number): number => 44 + 278 * (Math.min(7, Math.max(-5, l)) + 5) / 12;
  const yLo = Math.log10(PEAK) - 3, yHi = Math.log10(PEAK) + 0.15;
  const Y = (g: number): number => {
    const l = Math.log10(Math.max(1e-6, g));
    return 150 - 130 * (Math.min(yHi, Math.max(yLo, l)) - yLo) / (yHi - yLo);
  };

  let d = "";
  for (let i = 0; i <= 60; i++) {
    const l = -5 + 12 * i / 60;
    const perf = Math.min(PEAK, (2 ** l) * bw);
    d += (i ? "L" : "M") + X(l).toFixed(1) + " " + Y(perf).toFixed(1) + " ";
  }
  E.roof.setAttribute("d", d);

  const ridgeAi = PEAK / bw;
  const xr = X(Math.log2(ridgeAi));
  E.ridge.setAttribute("x1", xr.toFixed(1));
  E.ridge.setAttribute("x2", xr.toFixed(1));
  E.rlab.setAttribute("x", Math.min(306, Math.max(56, xr)).toFixed(1));

  const attain = Math.min(PEAK, ai * bw);
  const memBound = ai * bw < PEAK;
  const px = X(lgAi), py = Y(attain);
  // A gentle pulse so the marker reads as live while the sliders are still.
  const pulse = 4.4 + 1.1 * Math.abs(Math.sin(t * 2));
  E.dot.setAttribute("cx", px.toFixed(1));
  E.dot.setAttribute("cy", py.toFixed(1));
  E.dot.setAttribute("r", pulse.toFixed(2));
  E.dot.setAttribute("fill", memBound ? C_RED : C_PE);
  E.drop.setAttribute("x1", px.toFixed(1));
  E.drop.setAttribute("x2", px.toFixed(1));
  E.drop.setAttribute("y1", py.toFixed(1));
  E.drop.setAttribute("y2", "150");

  E.ytop.textContent = String(PEAK);
  E.ybot.textContent = (PEAK / 1000).toFixed(1);

  E.verdict.textContent = memBound
    ? "memory bound — " + attain.toPrecision(3) + " GFLOP/s, " + (100 * attain / PEAK).toFixed(1) + "% of peak"
    : "compute bound — " + attain.toPrecision(3) + " GFLOP/s at the compute roof";
  E.verdict.setAttribute("fill", memBound ? C_RED : C_PE);
  E.sub.textContent = memBound
    ? "wider vectors and more cores change nothing here"
    : "bandwidth is not the constraint; vectorise and shorten dependency chains";

  E.read.innerHTML = rd([
    ["Peak compute", PEAK + " GFLOP/s"],
    ["Peak bandwidth", bw + " GB/s"],
    ["Ridge point", ridgeAi.toPrecision(3) + " FLOP/byte"],
    ["Kernel intensity", ai < 1 ? ai.toPrecision(3) : ai.toPrecision(4) + ""],
    ["Attainable", attain.toPrecision(4) + " GFLOP/s"],
    ["Bound by", memBound ? "memory bandwidth" : "compute"],
    ["Fraction of peak reachable", (100 * attain / PEAK).toFixed(1) + " %"],
  ]);
 }},
};
