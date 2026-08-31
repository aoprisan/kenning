import { rd } from "../../helpers.js";
import { NS, C_L1, C_L2, C_L3, C_N, C_PE, C_CU, C_RED, C_GREY } from "../../anim/runtime.js";
/**
 * Operating-systems animations, keyed by module id; a module without an entry
 * has no visual tab. See the animation contract in CLAUDE.md — `draw` is a
 * pure function of `(t, c)` and must never set an attribute to NaN at any
 * control extreme.
 *
 * Several of these simulate a policy from scratch on every frame rather than
 * carrying state across frames. That is deliberate and required: `draw` has to
 * be reproducible from `(t, c)` alone, and the simulations here are a few
 * dozen steps, which is nothing next to the frame budget.
 */
/** Fill a group with `n` rects and return them, replacing any previous pool. */
function mkRects(g, n, w, h, fill) {
    while (g.firstChild)
        g.removeChild(g.firstChild);
    const out = [];
    for (let i = 0; i < n; i++) {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("width", String(w));
        r.setAttribute("height", String(h));
        r.setAttribute("fill", fill);
        out.push(r);
        g.appendChild(r);
    }
    return out;
}
/* ---------- o3 · four jobs, one long ---------- */
const O3_JOBS = [
    { name: "A", len: 24, col: C_L1 },
    { name: "B", len: 8, col: C_N },
    { name: "C", len: 8, col: C_PE },
    { name: "D", len: 8, col: C_CU },
];
const O3_TOTAL = 48;
const O3_SEGS = 64; // enough for quantum 1 over 48 units
/* ---------- o5 · the reference string that produces Bélády's anomaly ---------- */
const O5_REF = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
/* ---------- o11 · five writes, and when each becomes durable ---------- */
const O11_ISSUE = [0.08, 0.20, 0.32, 0.44, 0.56];
export const anims = {
    /* ---------- o3 · the same four jobs under three policies ---------- */
    o3: {
        title: "Four jobs, three policies",
        caption: "One long job and three short ones, all arriving at once. FIFO runs them in order and every short job waits behind the long one — the convoy effect, and the average turnaround shows it. Shortest-job-first reverses the order and cuts the average dramatically, which is why it is optimal and why it needs to know job lengths it cannot have. Round robin interleaves: the response time collapses, the turnaround gets worse than either, and the switch count is the price. Move the quantum and watch both move together.",
        controls: [{ k: "policy", l: "Policy", v: "fifo", sel: [["fifo", "FIFO — run to completion in order"], ["sjf", "SJF — shortest first"], ["rr", "Round robin"]] },
            { k: "q", l: "Round-robin quantum", min: 1, max: 12, step: 1, v: 3, u: "" }],
        svg: `<svg viewBox="0 0 340 210">
  <text x="6" y="30" font-size="9" fill="${C_L3}" font-family="IBM Plex Mono">CPU</text>
  <g data-e="bars"></g>
  <rect x="40" y="20" width="284" height="26" fill="none" stroke="${C_GREY}" stroke-width="1"/>
  <line data-e="now" x1="40" y1="14" x2="40" y2="52" stroke="${C_L2}" stroke-width="1.4"/>
  <text x="40" y="62" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">0</text>
  <text x="324" y="62" font-size="8" fill="${C_L3}" text-anchor="end" font-family="IBM Plex Mono">48 ms</text>
  <text x="6" y="86" font-size="8.5" fill="${C_L1}" font-family="IBM Plex Mono">A 24</text>
  <text x="6" y="104" font-size="8.5" fill="${C_N}" font-family="IBM Plex Mono">B 8</text>
  <text x="6" y="122" font-size="8.5" fill="${C_PE}" font-family="IBM Plex Mono">C 8</text>
  <text x="6" y="140" font-size="8.5" fill="${C_CU}" font-family="IBM Plex Mono">D 8</text>
  <line data-e="tr0" y1="82" y2="82" stroke="${C_L1}" stroke-width="3" stroke-linecap="round"/>
  <line data-e="tr1" y1="100" y2="100" stroke="${C_N}" stroke-width="3" stroke-linecap="round"/>
  <line data-e="tr2" y1="118" y2="118" stroke="${C_PE}" stroke-width="3" stroke-linecap="round"/>
  <line data-e="tr3" y1="136" y2="136" stroke="${C_CU}" stroke-width="3" stroke-linecap="round"/>
  <text data-e="lb0" font-size="8" fill="${C_L1}" font-family="IBM Plex Mono"></text>
  <text data-e="lb1" font-size="8" fill="${C_N}" font-family="IBM Plex Mono"></text>
  <text data-e="lb2" font-size="8" fill="${C_PE}" font-family="IBM Plex Mono"></text>
  <text data-e="lb3" font-size="8" fill="${C_CU}" font-family="IBM Plex Mono"></text>
  <text x="6" y="160" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">bar = arrival to completion</text>
  <text data-e="verdict" x="170" y="184" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="202" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
        init(E) {
            E._bars = mkRects(E.bars, O3_SEGS, 4, 26, C_GREY);
        },
        draw(t, c, E) {
            const pol = String(c.policy), q = Math.max(1, Math.round(c.q));
            const segs = [];
            if (pol === "rr") {
                const left = O3_JOBS.map((j) => j.len);
                let now = 0, remaining = O3_JOBS.length, guard = 0;
                while (remaining > 0 && guard++ < 500) {
                    for (let i = 0; i < left.length; i++) {
                        if (left[i] <= 0)
                            continue;
                        const slice = Math.min(q, left[i]);
                        segs.push({ j: i, s: now, e: now + slice });
                        now += slice;
                        left[i] -= slice;
                        if (left[i] <= 0)
                            remaining--;
                    }
                }
            }
            else {
                const order = O3_JOBS.map((_, i) => i);
                if (pol === "sjf")
                    order.sort((x, y) => O3_JOBS[x].len - O3_JOBS[y].len);
                let now = 0;
                for (const i of order) {
                    segs.push({ j: i, s: now, e: now + O3_JOBS[i].len });
                    now += O3_JOBS[i].len;
                }
            }
            // All jobs arrive at 0, so turnaround is completion and response is first run.
            const firstRun = [NaN, NaN, NaN, NaN];
            const done = [0, 0, 0, 0];
            for (const s of segs) {
                if (!isFinite(firstRun[s.j]))
                    firstRun[s.j] = s.s;
                done[s.j] = s.e;
            }
            const avgTurn = done.reduce((a, b) => a + b, 0) / 4;
            const avgResp = firstRun.reduce((a, b) => a + (isFinite(b) ? b : 0), 0) / 4;
            const X = (u) => 40 + 284 * u / O3_TOTAL;
            const nowU = (t % 7) / 7 * O3_TOTAL;
            for (let i = 0; i < O3_SEGS; i++) {
                const el = E._bars[i], s = segs[i];
                if (!s) {
                    el.setAttribute("opacity", "0");
                    continue;
                }
                const w = Math.max(0.8, X(s.e) - X(s.s));
                el.setAttribute("opacity", s.s <= nowU ? "1" : "0.18");
                el.setAttribute("x", X(s.s).toFixed(1));
                el.setAttribute("y", "20");
                el.setAttribute("width", w.toFixed(1));
                el.setAttribute("height", "26");
                el.setAttribute("fill", O3_JOBS[s.j].col);
            }
            E.now.setAttribute("x1", X(nowU).toFixed(1));
            E.now.setAttribute("x2", X(nowU).toFixed(1));
            for (let j = 0; j < 4; j++) {
                E["tr" + j].setAttribute("x1", X(0).toFixed(1));
                E["tr" + j].setAttribute("x2", X(done[j]).toFixed(1));
                E["tr" + j].setAttribute("opacity", nowU >= done[j] ? "1" : "0.35");
                const lb = E["lb" + j];
                lb.setAttribute("x", Math.min(300, X(done[j]) + 4).toFixed(1));
                lb.setAttribute("y", String(85 + j * 18));
                lb.textContent = String(Math.round(done[j]));
            }
            const convoy = pol === "fifo";
            E.verdict.textContent = pol === "fifo"
                ? "turnaround " + avgTurn.toFixed(1) + " ms — three short jobs behind one long one"
                : pol === "sjf"
                    ? "turnaround " + avgTurn.toFixed(1) + " ms — the same work, reordered"
                    : "response " + avgResp.toFixed(1) + " ms, turnaround " + avgTurn.toFixed(1) + " ms";
            E.verdict.setAttribute("fill", convoy ? C_RED : C_PE);
            E.sub.textContent = pol === "fifo"
                ? "the convoy effect: nothing is wrong except the order"
                : pol === "sjf"
                    ? "optimal for average turnaround — and it must know the lengths"
                    : "best response, worst turnaround, and " + Math.max(0, segs.length - 1) + " context switches";
            E.read.innerHTML = rd([
                ["Policy", pol === "fifo" ? "FIFO" : pol === "sjf" ? "Shortest job first" : "Round robin, q = " + q],
                ["Average turnaround", avgTurn.toFixed(1) + " ms"],
                ["Average response", avgResp.toFixed(1) + " ms"],
                ["Job A completes at", Math.round(done[0]) + " ms"],
                ["Last job completes at", Math.round(Math.max(...done)) + " ms"],
                ["Context switches", String(Math.max(0, segs.length - 1))],
            ]);
        }
    },
    /* ---------- o4 · the walk, and the cache that avoids it ---------- */
    o4: {
        title: "Translating one address",
        caption: "Every load and store goes through this. On a TLB hit the translation is already cached and the access costs one memory reference. On a miss the hardware walks the page table — four levels at 4 KiB pages, each level a memory reference of its own — before the access it was asked for can even begin. Switch to 2 MiB pages and a level disappears, because the walk stops early and those bits become offset instead; the TLB then covers five hundred times as much memory with the same number of entries.",
        controls: [{ k: "tlb", l: "TLB", v: "miss", sel: [["hit", "hit — translation cached"], ["miss", "miss — walk the table"]] },
            { k: "psize", l: "Page size", v: "12", sel: [["12", "4 KiB"], ["21", "2 MiB (huge)"]] }],
        svg: `<svg viewBox="0 0 340 216">
  <text x="6" y="18" font-size="8.5" fill="${C_L3}" font-family="IBM Plex Mono">virtual address</text>
  <rect data-e="f0" x="18" y="24" width="52" height="20" fill="none" stroke="${C_L2}" stroke-width="1.2"/>
  <rect data-e="f1" x="74" y="24" width="52" height="20" fill="none" stroke="${C_L2}" stroke-width="1.2"/>
  <rect data-e="f2" x="130" y="24" width="52" height="20" fill="none" stroke="${C_L2}" stroke-width="1.2"/>
  <rect data-e="f3" x="186" y="24" width="52" height="20" fill="none" stroke="${C_L2}" stroke-width="1.2"/>
  <rect data-e="f4" x="242" y="24" width="80" height="20" fill="none" stroke="${C_L2}" stroke-width="1.2"/>
  <text data-e="t0" x="44" y="38" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t1" x="100" y="38" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t2" x="156" y="38" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t3" x="212" y="38" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="t4" x="282" y="38" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <rect data-e="tlbbox" x="18" y="62" width="72" height="26" fill="none" stroke="${C_CU}" stroke-width="1.6" rx="2"/>
  <text x="54" y="78" font-size="9" fill="${C_CU}" text-anchor="middle" font-family="IBM Plex Mono">TLB</text>
  <rect data-e="lv0" x="18" y="108" width="60" height="30" fill="none" stroke="${C_GREY}" stroke-width="1.4"/>
  <rect data-e="lv1" x="86" y="108" width="60" height="30" fill="none" stroke="${C_GREY}" stroke-width="1.4"/>
  <rect data-e="lv2" x="154" y="108" width="60" height="30" fill="none" stroke="${C_GREY}" stroke-width="1.4"/>
  <rect data-e="lv3" x="222" y="108" width="60" height="30" fill="none" stroke="${C_GREY}" stroke-width="1.4"/>
  <text data-e="ln0" x="48" y="127" font-size="8" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="ln1" x="116" y="127" font-size="8" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="ln2" x="184" y="127" font-size="8" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="ln3" x="252" y="127" font-size="8" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <rect data-e="frame" x="290" y="108" width="34" height="30" fill="${C_GREY}" stroke="${C_L2}" stroke-width="1.4"/>
  <text x="307" y="127" font-size="8" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono">RAM</text>
  <circle data-e="tok" r="5" fill="${C_CU}" cx="54" cy="78"/>
  <text data-e="cost" x="170" y="164" font-size="9" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="186" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="204" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
        draw(t, c, E) {
            const hit = c.tlb === "hit";
            const offBits = parseInt(String(c.psize), 10);
            const levels = Math.round((48 - offBits) / 9);
            const huge = offBits === 21;
            // A fixed address, split for display. Indices are the real arithmetic.
            const VA = 20015998348988;
            const vpn = Math.floor(VA / 2 ** offBits);
            const names = ["PML4", "PDPT", "PD", "PT"];
            const idx = [];
            for (let i = levels - 1; i >= 0; i--)
                idx.push(Math.floor(vpn / 512 ** i) % 512);
            for (let i = 0; i < 4; i++) {
                const shown = i < levels;
                E["f" + i].setAttribute("opacity", shown ? "1" : "0.15");
                E["t" + i].textContent = shown ? names[i] + " " + idx[i] : "—";
                E["t" + i].setAttribute("opacity", shown ? "1" : "0.25");
                E["lv" + i].setAttribute("opacity", shown ? "1" : "0.12");
                E["ln" + i].setAttribute("opacity", shown ? "1" : "0.12");
                E["ln" + i].textContent = shown ? names[i] : "";
            }
            E.t4.textContent = "offset " + (VA % 2 ** offBits);
            E.f4.setAttribute("width", huge ? "80" : "80");
            // The token: straight to RAM on a hit, through each level on a miss.
            const stops = hit
                ? [[54, 78], [307, 123]]
                : [[54, 78], ...idx.map((_, i) => [48 + i * 68, 123]), [307, 123]];
            const period = hit ? 1.8 : 3.6;
            const u = (t % period) / period;
            const legs = stops.length - 1;
            const k = Math.min(legs - 1, Math.floor(u * legs));
            const f = u * legs - k;
            const [x0, y0] = stops[k], [x1, y1] = stops[k + 1];
            E.tok.setAttribute("cx", (x0 + (x1 - x0) * f).toFixed(1));
            E.tok.setAttribute("cy", (y0 + (y1 - y0) * f).toFixed(1));
            E.tok.setAttribute("fill", hit ? C_PE : C_RED);
            E.tlbbox.setAttribute("stroke", hit ? C_PE : C_L3);
            for (let i = 0; i < 4; i++) {
                const active = !hit && i < levels && k >= 1 && i <= k - 1;
                E["lv" + i].setAttribute("stroke", active ? C_CU : C_GREY);
                E["lv" + i].setAttribute("stroke-width", active ? "2" : "1.4");
            }
            const accesses = hit ? 1 : levels + 1;
            E.cost.textContent = accesses + " memory access" + (accesses > 1 ? "es" : "") + " ≈ " + (accesses * 100) + " ns";
            E.verdict.textContent = hit
                ? "TLB hit — the walk does not happen"
                : levels + "-level walk, then the access you asked for";
            E.verdict.setAttribute("fill", hit ? C_PE : C_RED);
            E.sub.textContent = huge
                ? "2 MiB pages: one level fewer, and 512× the TLB reach"
                : "4 KiB pages: 1500 TLB entries cover about 6 MB";
            E.read.innerHTML = rd([
                ["Page size", huge ? "2 MiB" : "4 KiB"],
                ["Levels in the walk", String(levels)],
                ["TLB", hit ? "hit" : "miss"],
                ["Memory accesses for this load", String(accesses)],
                ["Cost at 100 ns each", (accesses * 100) + " ns"],
                ["TLB reach, 1500 entries", huge ? "about 3 GiB" : "about 6 MB"],
                ["Slowdown against a hit", hit ? "—" : accesses + "×"],
            ]);
        }
    },
    /* ---------- o5 · replacement, and Bélády's anomaly ---------- */
    o5: {
        title: "Page replacement, and more memory making it worse",
        caption: "A fixed reference string against a fixed number of frames. LRU and OPT are stack algorithms: give them another frame and the fault count can only improve. FIFO is not, and this string is the counterexample — set FIFO to three frames, count the faults, then set it to four. The number goes up. That is Bélády's anomaly, and it is the reason a replacement policy has to be chosen on more than intuition.",
        controls: [{ k: "policy", l: "Policy", v: "fifo", sel: [["fifo", "FIFO — evict the oldest"], ["lru", "LRU — evict least recently used"], ["opt", "OPT — evict what is needed furthest away"]] },
            { k: "frames", l: "Frames", min: 3, max: 5, step: 1, v: 3, u: "" }],
        svg: `<svg viewBox="0 0 340 210">
  <text x="6" y="26" font-size="8.5" fill="${C_L3}" font-family="IBM Plex Mono">refs</text>
  <g data-e="refs"></g>
  <g data-e="marks"></g>
  <text x="6" y="70" font-size="8.5" fill="${C_L3}" font-family="IBM Plex Mono">frames</text>
  <g data-e="slots"></g>
  <text data-e="count" x="170" y="152" font-size="11" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="176" font-size="9.5" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="196" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
        init(E) {
            E._refs = mkRects(E.refs, O5_REF.length, 20, 20, C_GREY);
            E._marks = mkRects(E.marks, O5_REF.length, 20, 3, C_RED);
            E._slots = mkRects(E.slots, 5, 20, 20, C_GREY);
        },
        draw(t, c, E) {
            const pol = String(c.policy), F = Math.min(5, Math.max(3, Math.round(c.frames)));
            const steps = Math.floor(((t % 9) / 9) * (O5_REF.length + 2));
            // Replay the whole string every frame — twelve steps, and `draw` must be
            // a pure function of (t, c), so nothing may be carried between frames.
            const mem = [];
            const loadedAt = []; // FIFO age
            const usedAt = []; // LRU recency
            const faultAt = [];
            let faults = 0;
            for (let i = 0; i < O5_REF.length; i++) {
                const page = O5_REF[i];
                const at = mem.indexOf(page);
                if (at >= 0) {
                    usedAt[at] = i;
                    faultAt[i] = false;
                    continue;
                }
                faults++;
                faultAt[i] = true;
                if (mem.length < F) {
                    mem.push(page);
                    loadedAt.push(i);
                    usedAt.push(i);
                    continue;
                }
                let victim = 0;
                if (pol === "fifo") {
                    for (let k = 1; k < mem.length; k++)
                        if (loadedAt[k] < loadedAt[victim])
                            victim = k;
                }
                else if (pol === "lru") {
                    for (let k = 1; k < mem.length; k++)
                        if (usedAt[k] < usedAt[victim])
                            victim = k;
                }
                else {
                    // OPT: evict whichever resident page is next needed furthest ahead.
                    let best = -1;
                    for (let k = 0; k < mem.length; k++) {
                        let next = Infinity;
                        for (let j = i + 1; j < O5_REF.length; j++)
                            if (O5_REF[j] === mem[k]) {
                                next = j;
                                break;
                            }
                        if (next > best) {
                            best = next;
                            victim = k;
                        }
                    }
                }
                mem[victim] = page;
                loadedAt[victim] = i;
                usedAt[victim] = i;
                if (i >= steps)
                    break;
            }
            // Contents as of `steps`, replayed again so the display matches the cursor.
            const shown = [];
            const sLoaded = [], sUsed = [];
            let shownFaults = 0;
            for (let i = 0; i < Math.min(steps, O5_REF.length); i++) {
                const page = O5_REF[i], at = shown.indexOf(page);
                if (at >= 0) {
                    sUsed[at] = i;
                    continue;
                }
                shownFaults++;
                if (shown.length < F) {
                    shown.push(page);
                    sLoaded.push(i);
                    sUsed.push(i);
                    continue;
                }
                let victim = 0;
                if (pol === "fifo") {
                    for (let k = 1; k < shown.length; k++)
                        if (sLoaded[k] < sLoaded[victim])
                            victim = k;
                }
                else if (pol === "lru") {
                    for (let k = 1; k < shown.length; k++)
                        if (sUsed[k] < sUsed[victim])
                            victim = k;
                }
                else {
                    let best = -1;
                    for (let k = 0; k < shown.length; k++) {
                        let next = Infinity;
                        for (let j = i + 1; j < O5_REF.length; j++)
                            if (O5_REF[j] === shown[k]) {
                                next = j;
                                break;
                            }
                        if (next > best) {
                            best = next;
                            victim = k;
                        }
                    }
                }
                shown[victim] = page;
                sLoaded[victim] = i;
                sUsed[victim] = i;
            }
            for (let i = 0; i < O5_REF.length; i++) {
                const x = 44 + i * 23, past = i < steps;
                const r = E._refs[i];
                r.setAttribute("x", String(x));
                r.setAttribute("y", "12");
                r.setAttribute("fill", past ? (faultAt[i] ? C_RED : C_PE) : C_GREY);
                r.setAttribute("fill-opacity", past ? "0.9" : "0.3");
                const m = E._marks[i];
                m.setAttribute("x", String(x));
                m.setAttribute("y", "36");
                m.setAttribute("opacity", past && faultAt[i] ? "1" : "0");
            }
            for (let k = 0; k < 5; k++) {
                const s = E._slots[k];
                s.setAttribute("x", "44");
                s.setAttribute("y", String(56 + k * 24));
                s.setAttribute("opacity", k < F ? "1" : "0.12");
                s.setAttribute("fill", k < shown.length ? C_N : C_GREY);
                s.setAttribute("fill-opacity", k < shown.length ? "0.85" : "0.25");
                s.setAttribute("width", "20");
            }
            E.count.textContent = shownFaults + " faults so far · " + faults + " total";
            const anomaly = pol === "fifo";
            E.verdict.textContent = pol === "opt"
                ? faults + " faults — the optimum for this string"
                : pol === "lru"
                    ? faults + " faults with " + F + " frames"
                    : faults + " faults with " + F + " frames";
            E.verdict.setAttribute("fill", pol === "opt" ? C_PE : anomaly ? C_CU : C_N);
            E.sub.textContent = anomaly
                ? "try 3 frames, then 4 — FIFO gets WORSE with more memory"
                : pol === "lru"
                    ? "a stack algorithm: more frames can never mean more faults"
                    : "requires the future, so it exists only as a yardstick";
            E.read.innerHTML = rd([
                ["Policy", pol.toUpperCase()],
                ["Frames", String(F)],
                ["Reference string", O5_REF.join(" ")],
                ["Total faults", String(faults)],
                ["Fault rate", (100 * faults / O5_REF.length).toFixed(0) + " %"],
                ["Stack algorithm", pol === "fifo" ? "no — Bélády's anomaly is possible" : "yes — more frames never hurts"],
            ]);
        }
    },
    /* ---------- o7 · the lost update, three instructions wide ---------- */
    o7: {
        title: "Two threads, one counter",
        caption: "Each thread runs load, add, store on a shared counter, and each expects the result to be two. Slide the offset to move thread B later relative to thread A. At an offset of three or more the sequences do not overlap and the answer is right. At anything less, B loads the value before A has stored its result, both compute one, and one increment is gone — with no crash and no error. That window is three instructions wide, which is why this passes every test and appears under load.",
        controls: [{ k: "shift", l: "Thread B offset", min: 0, max: 4, step: 1, v: 1, u: " steps" },
            { k: "lock", l: "Protection", v: "none", sel: [["none", "no lock"], ["mutex", "mutex around the section"]] }],
        svg: `<svg viewBox="0 0 340 208">
  <text x="6" y="42" font-size="9" fill="${C_L1}" font-family="IBM Plex Mono">A</text>
  <text x="6" y="82" font-size="9" fill="${C_N}" font-family="IBM Plex Mono">B</text>
  <line x1="22" y1="52" x2="330" y2="52" stroke="${C_GREY}" stroke-width="0.8"/>
  <line x1="22" y1="92" x2="330" y2="92" stroke="${C_GREY}" stroke-width="0.8"/>
  <g data-e="ops"></g>
  <text data-e="oa0" font-size="7.5" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="oa1" font-size="7.5" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="oa2" font-size="7.5" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="ob0" font-size="7.5" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="ob1" font-size="7.5" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="ob2" font-size="7.5" fill="${C_GREY}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <line data-e="now" x1="22" y1="18" x2="22" y2="128" stroke="${C_L2}" stroke-width="1.2" stroke-dasharray="3 3"/>
  <text x="6" y="122" font-size="8.5" fill="${C_L2}" font-family="IBM Plex Mono">ctr</text>
  <text data-e="ctr" x="170" y="122" font-size="10" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="verdict" x="170" y="158" font-size="10" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="178" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="expl" x="170" y="198" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
        init(E) {
            E._ops = mkRects(E.ops, 6, 26, 20, C_GREY);
        },
        draw(t, c, E) {
            const locked = c.lock === "mutex";
            // A mutex serialises the sections whatever the offset would have been.
            const shift = locked ? 3 : Math.min(4, Math.max(0, Math.round(c.shift)));
            const SLOTS = 8;
            const aAt = [0, 1, 2], bAt = [shift, shift + 1, shift + 2];
            // Simulate the interleaving: at each slot, run whichever ops land there.
            let counter = 0, regA = 0, regB = 0;
            const trace = [];
            for (let s = 0; s < SLOTS; s++) {
                // B is evaluated first within a slot, so a load landing in the same slot
                // as A's store reads the pre-store value. Two operations sharing a slot
                // are concurrent, and this is the ordering that makes "overlapping means
                // unsafe" true rather than true-most-of-the-time.
                if (s === bAt[0])
                    regB = counter;
                if (s === bAt[1])
                    regB = regB + 1;
                if (s === bAt[2])
                    counter = regB;
                if (s === aAt[0])
                    regA = counter;
                if (s === aAt[1])
                    regA = regA + 1;
                if (s === aAt[2])
                    counter = regA;
                trace[s] = counter;
            }
            const lost = counter < 2;
            const X = (s) => 26 + s * 37;
            const nowS = ((t % 5) / 5) * SLOTS;
            const labels = ["load", "add", "store"];
            for (let i = 0; i < 6; i++) {
                const isA = i < 3, k = i % 3;
                const slot = isA ? aAt[k] : bAt[k];
                const el = E._ops[i];
                const done = nowS >= slot + 1;
                el.setAttribute("x", X(slot).toFixed(1));
                el.setAttribute("y", isA ? "26" : "66");
                el.setAttribute("fill", isA ? C_L1 : C_N);
                el.setAttribute("fill-opacity", done ? "0.9" : nowS >= slot ? "0.5" : "0.18");
                const lab = E[(isA ? "oa" : "ob") + k];
                lab.setAttribute("x", (X(slot) + 13).toFixed(1));
                lab.setAttribute("y", isA ? "39" : "79");
                lab.textContent = labels[k];
                lab.setAttribute("opacity", nowS >= slot ? "1" : "0.3");
            }
            E.now.setAttribute("x1", X(nowS).toFixed(1));
            E.now.setAttribute("x2", X(nowS).toFixed(1));
            E.ctr.textContent = "counter = " + trace[Math.min(SLOTS - 1, Math.floor(nowS))];
            E.verdict.textContent = lost ? "final counter = " + counter + ", expected 2" : "final counter = 2";
            E.verdict.setAttribute("fill", lost ? C_RED : C_PE);
            E.sub.textContent = locked
                ? "the mutex serialises the sections whatever the timing would have been"
                : lost
                    ? "B loaded before A stored, so both wrote 1"
                    : "the sequences do not overlap, so nothing is lost";
            E.expl.textContent = locked
                ? "correct at every offset — that is what the lock buys"
                : lost ? "one increment is gone, with no crash and no error"
                    : "correct by luck: nothing prevents the other ordering";
            E.read.innerHTML = rd([
                ["Protection", locked ? "mutex" : "none"],
                ["Thread B offset", locked ? "irrelevant — serialised" : shift + " steps"],
                ["Sequences overlap", shift < 3 ? "yes" : "no"],
                ["Expected", "2"],
                ["Actual", String(counter)],
                ["Lost updates", lost ? String(2 - counter) : "0"],
                ["Window width", "3 instructions — load, add, store"],
            ]);
        }
    },
    /* ---------- o11 · what a crash leaves behind ---------- */
    o11: {
        title: "Five writes, and a power cut",
        caption: "Each track is one write() that has already returned success to the application. The left marker is that return; the right marker is when the data actually reaches the device. Drag the crash line: everything whose right marker is still ahead of it is lost, and the application was told all five succeeded. With buffered writes the whole set becomes durable at one late writeback, so almost any crash loses all of it. Adding an fsync per write moves each right marker up against its left one, and costs a device round trip every time.",
        controls: [{ k: "mode", l: "Durability", v: "buffered", sel: [["buffered", "buffered — writeback when the kernel decides"], ["batch", "group commit — one fsync for the batch"], ["each", "fsync after every write"]] },
            { k: "crash", l: "Crash at", min: 0, max: 100, step: 1, v: 40, u: " %" }],
        svg: `<svg viewBox="0 0 340 214">
  <text x="6" y="16" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">write() returns ●───────● durable on device</text>
  <g data-e="tracks"></g>
  <circle data-e="a0" r="4" fill="${C_CU}"/><circle data-e="d0" r="4" fill="${C_PE}"/>
  <circle data-e="a1" r="4" fill="${C_CU}"/><circle data-e="d1" r="4" fill="${C_PE}"/>
  <circle data-e="a2" r="4" fill="${C_CU}"/><circle data-e="d2" r="4" fill="${C_PE}"/>
  <circle data-e="a3" r="4" fill="${C_CU}"/><circle data-e="d3" r="4" fill="${C_PE}"/>
  <circle data-e="a4" r="4" fill="${C_CU}"/><circle data-e="d4" r="4" fill="${C_PE}"/>
  <text data-e="w0" x="6" y="35" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">w1</text>
  <text data-e="w1" x="6" y="55" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">w2</text>
  <text data-e="w2" x="6" y="75" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">w3</text>
  <text data-e="w3" x="6" y="95" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">w4</text>
  <text data-e="w4" x="6" y="115" font-size="8" fill="${C_L3}" font-family="IBM Plex Mono">w5</text>
  <line data-e="crash" x1="150" y1="22" x2="150" y2="126" stroke="${C_RED}" stroke-width="2"/>
  <text data-e="clab" x="150" y="140" font-size="8" fill="${C_RED}" text-anchor="middle" font-family="IBM Plex Mono">crash</text>
  <text data-e="verdict" x="170" y="166" font-size="10" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="sub" x="170" y="186" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
  <text data-e="cost" x="170" y="204" font-size="8.5" fill="${C_L3}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
        init(E) {
            E._tracks = mkRects(E.tracks, 5, 10, 3, C_GREY);
        },
        draw(t, c, E) {
            const mode = String(c.mode);
            const crash = Math.min(1, Math.max(0, c.crash / 100));
            const X = (u) => 26 + 300 * u;
            const durable = O11_ISSUE.map((iss) => mode === "each" ? Math.min(0.97, iss + 0.05)
                : mode === "batch" ? 0.66
                    : 0.88);
            // A gentle pulse so a paused-looking picture still reads as live.
            const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.8));
            let survived = 0;
            for (let i = 0; i < 5; i++) {
                const y = 32 + i * 20;
                const x0 = X(O11_ISSUE[i]), x1 = X(durable[i]);
                const ok = durable[i] <= crash;
                const acked = O11_ISSUE[i] <= crash;
                if (ok)
                    survived++;
                const tr = E._tracks[i];
                tr.setAttribute("x", x0.toFixed(1));
                tr.setAttribute("y", String(y - 1));
                tr.setAttribute("width", Math.max(1, x1 - x0).toFixed(1));
                tr.setAttribute("height", "3");
                tr.setAttribute("fill", ok ? C_PE : acked ? C_RED : C_GREY);
                tr.setAttribute("opacity", acked ? "1" : "0.3");
                E["a" + i].setAttribute("cx", x0.toFixed(1));
                E["a" + i].setAttribute("cy", String(y));
                E["a" + i].setAttribute("fill", acked ? C_CU : C_GREY);
                E["d" + i].setAttribute("cx", x1.toFixed(1));
                E["d" + i].setAttribute("cy", String(y));
                E["d" + i].setAttribute("fill", ok ? C_PE : C_GREY);
                E["d" + i].setAttribute("opacity", ok ? "1" : "0.35");
                E["w" + i].setAttribute("fill", acked ? (ok ? C_PE : C_RED) : C_L3);
            }
            const acked = O11_ISSUE.filter((u) => u <= crash).length;
            const lost = acked - survived;
            const cx = X(crash);
            E.crash.setAttribute("x1", cx.toFixed(1));
            E.crash.setAttribute("x2", cx.toFixed(1));
            E.crash.setAttribute("opacity", lost > 0 ? "1" : pulse.toFixed(2));
            E.clab.setAttribute("x", Math.min(316, Math.max(24, cx)).toFixed(1));
            E.verdict.textContent = lost > 0
                ? lost + " of " + acked + " acknowledged writes lost"
                : acked === 0 ? "nothing written yet" : "all " + acked + " acknowledged writes survived";
            E.verdict.setAttribute("fill", lost > 0 ? C_RED : C_PE);
            E.sub.textContent = mode === "buffered"
                ? "write() returned success, and nothing had reached the device"
                : mode === "batch"
                    ? "one fsync for the batch: durable together, or lost together"
                    : "each write is durable almost immediately";
            E.cost.textContent = mode === "each"
                ? "cost: one device round trip per write — the throughput ceiling"
                : mode === "batch"
                    ? "cost: one round trip per batch — what every database does"
                    : "cost: nothing, which is exactly the problem";
            E.read.innerHTML = rd([
                ["Durability mode", mode === "each" ? "fsync per write" : mode === "batch" ? "group commit" : "buffered, no fsync"],
                ["Writes acknowledged", String(acked) + " of 5"],
                ["Durable at the crash", String(survived)],
                ["Lost after returning success", String(lost)],
                ["Application was told", acked + " succeeded"],
                ["Verdict", lost > 0 ? "silent data loss" : acked ? "consistent" : "—"],
            ]);
        }
    },
};
//# sourceMappingURL=anims.js.map