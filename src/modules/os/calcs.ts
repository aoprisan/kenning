import type { Calc } from "../../types.js";

/**
 * Calculators for the operating-systems subject, keyed by `Module.calc`.
 *
 * Address arithmetic here deliberately avoids the bitwise operators: they
 * coerce to 32 bits, and a 48-bit virtual address silently loses its top
 * seventeen bits if you shift it. Everything is done with division and
 * modulo on doubles, which are exact well past 2^48.
 */

/** English thousands separators. `num` in helpers.ts is ro-RO. */
const n = (v: number, d = 0): string =>
  isFinite(v)
    ? v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

/** A duration in nanoseconds, in whatever unit reads best. */
function ns(v: number): string {
  if (!isFinite(v)) return "—";
  if (v < 1000) return v.toPrecision(3) + " ns";
  if (v < 1e6) return (v / 1e3).toPrecision(3) + " µs";
  if (v < 1e9) return (v / 1e6).toPrecision(3) + " ms";
  if (v < 6e10) return (v / 1e9).toPrecision(3) + " s";
  if (v < 3.6e12) return (v / 6e10).toPrecision(3) + " minutes";
  if (v < 8.64e13) return (v / 3.6e12).toPrecision(3) + " hours";
  if (v < 3.15e16) return (v / 8.64e13).toPrecision(3) + " days";
  return (v / 3.15e16).toPrecision(3) + " years";
}

/** Bytes, in whatever unit reads best. */
function bytes(v: number): string {
  const U = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = 0, x = v;
  while (x >= 1024 && i < U.length - 1) { x /= 1024; i++; }
  return (i === 0 ? String(Math.round(x)) : x.toPrecision(3)) + " " + U[i];
}

export const calcs: Record<string, Calc> = {

/* ---------- o3 · what a scheduling policy costs each job ---------- */
sched:{
  title:"Scheduling policies on one workload",
  hint:"four jobs, all arriving at time 0",
  fields:[
    {k:"a",l:"Job A length",u:"ms",v:100},
    {k:"b",l:"Job B length",u:"ms",v:10},
    {k:"c",l:"Job C length",u:"ms",v:10},
    {k:"d",l:"Job D length",u:"ms",v:10},
    {k:"q",l:"Round-robin quantum",u:"ms",v:5}
  ],
  run({a,b,c,d,q}){
    const jobs = [["A",a],["B",b],["C",c],["D",d]] as [string, number][];
    if(jobs.some(([,v]) => !(v > 0))) return {lines:[["Every job needs a positive length","—"]]};
    if(!(q > 0)) return {lines:[["The quantum must be positive","—"]]};
    if(jobs.some(([,v]) => v > 1e6) || q > 1e6) return {lines:[["Keep the numbers under a million ms","—"]],
      bad:"Beyond that the round-robin simulation is counting slices rather than teaching anything."};

    // All jobs arrive at 0, so turnaround is the completion time and
    // response is the time the job first gets a CPU.
    const runToCompletion = (order: [string, number][]) => {
      let t = 0, turn = 0, resp = 0;
      for (const [, len] of order) { resp += t; t += len; turn += t; }
      return { turn: turn / order.length, resp: resp / order.length };
    };
    const fifo = runToCompletion(jobs);
    const sjf = runToCompletion(jobs.slice().sort((x, y) => x[1] - y[1]));

    // Round robin, simulated. `first` is unset until a job first runs.
    let t = 0;
    const left = jobs.map(([, len]) => len);
    const first: (number | null)[] = jobs.map(() => null);
    const done: number[] = jobs.map(() => 0);
    let remaining = jobs.length, guard = 0;
    while (remaining > 0 && guard++ < 200000) {
      for (let i = 0; i < left.length; i++) {
        if (left[i] <= 0) continue;
        if (first[i] === null) first[i] = t;
        const slice = Math.min(q, left[i]);
        t += slice; left[i] -= slice;
        if (left[i] <= 0) { done[i] = t; remaining--; }
      }
    }
    const rr = {
      turn: done.reduce((s, v) => s + v, 0) / jobs.length,
      resp: first.reduce((s: number, v) => s + (v ?? 0), 0) / jobs.length,
    };

    const total = jobs.reduce((s, [, v]) => s + v, 0);
    const switches = Math.max(0, Math.ceil(total / q) - 1);

    const lines: [string,string][] = [
      ["Total work", n(total) + " ms"],
      ["FIFO — average turnaround", n(fifo.turn, 1) + " ms"],
      ["FIFO — average response", n(fifo.resp, 1) + " ms"],
      ["SJF — average turnaround", n(sjf.turn, 1) + " ms"],
      ["SJF — average response", n(sjf.resp, 1) + " ms"],
      ["Round robin — average turnaround", n(rr.turn, 1) + " ms"],
      ["Round robin — average response", n(rr.resp, 1) + " ms"],
      ["Round-robin context switches", "about " + n(switches)],
    ];

    const convoy = fifo.turn / sjf.turn;
    if(convoy > 1.5) return {lines,
      bad:"The convoy effect, quantified: FIFO's average turnaround is " + convoy.toFixed(1) + "× SJF's, purely because a long job sits at the head and every short job waits behind it. Note also that round robin has much the best response and the worst turnaround — it finishes everything late rather than anything early."};
    if(rr.resp < fifo.resp / 2) return {lines,
      ok:"Round robin's response time is far better than FIFO's and its turnaround is worse, which is the trade in its pure form. Every real scheduler moves along that line depending on what it infers a job to be."};
    return {lines,
      ok:"With jobs of similar length the policies converge — the differences between them are produced by variance in job length, not by the policies themselves."};
  }},

/* ---------- o4 · splitting a virtual address ---------- */
xlate:{
  title:"Virtual address translation",
  hint:"how the hardware splits an address",
  fields:[
    {k:"va",l:"Virtual address",u:"decimal",v:20015998348988},
    {k:"psize",l:"Page size",u:"",v:"12",sel:[["12","4 KiB"],["21","2 MiB (huge)"],["30","1 GiB (huge)"]]},
    {k:"vabits",l:"Virtual address width",u:"",v:"48",sel:[["48","48-bit (4-level)"],["57","57-bit (5-level)"]]}
  ],
  run({va,psize,vabits}){
    const offBits = parseInt(String(psize), 10);
    const width = parseInt(String(vabits), 10);
    // A page table is one 4 KiB page of 8-byte entries: 512 = 2^9 entries.
    const IDX = 9, ENTRIES = 512;
    if(!(va >= 0) || !Number.isFinite(va)) return {lines:[["Enter a non-negative address","—"]]};

    const levels = Math.round((width - offBits) / IDX);
    if(levels < 1) return {lines:[["That page size leaves no levels to walk at this address width","—"]],
      bad:"A 1 GiB page in a 48-bit space walks two levels; there is no configuration with fewer."};

    const max = 2 ** width;
    if(va >= max) return {lines:[["Address is outside a " + width + "-bit space","—"]],
      bad:"The largest address here is " + n(max - 1) + "."};

    // Bitwise operators coerce to 32 bits, so this is done with arithmetic.
    const pageSize = 2 ** offBits;
    const offset = va % pageSize;
    const vpn = Math.floor(va / pageSize);

    // A huge page drops levels from the BOTTOM of the walk — the last level
    // reached holds the mapping itself — so the names are taken from the top.
    const full = width === 57
      ? ["PML5", "PML4", "PDPT", "PD", "PT"]
      : ["PML4", "PDPT", "PD", "PT"];
    const topLevels = full.length;
    const names = full.slice(0, levels);
    const idx: [string, number][] = [];
    for (let i = levels - 1; i >= 0; i--) {
      idx.push([names[levels - 1 - i], Math.floor(vpn / ENTRIES ** i) % ENTRIES]);
    }

    // Page tables needed to map 1 GiB contiguously: leaf tables for the pages,
    // then one level up per 512 tables, all the way to the root.
    let tables = 0, atLevel = Math.ceil(2 ** 30 / pageSize);
    for (let i = 0; i < levels; i++) {
      atLevel = Math.ceil(atLevel / ENTRIES);
      tables += atLevel;
    }

    // TLB reach at this page size, for a plausible entry count.
    const TLB = 1500;
    const lines: [string,string][] = [
      ["Page size", bytes(pageSize) + " ⇒ " + offBits + " offset bits"],
      ["Levels walked", String(levels) + " (" + (width - offBits) + " index bits ÷ " + IDX + ")"],
    ];
    for (const [name, v] of idx) lines.push(["  " + name + " index", String(v)]);
    lines.push(
      ["Offset within page", n(offset)],
      ["Virtual page number", n(vpn)],
      ["Memory accesses on a TLB miss", String(levels) + " for the walk, then 1 for the data"],
      ["TLB reach at " + TLB + " entries", bytes(TLB * pageSize)],
      ["Page tables to map 1 GiB", n(tables) + " tables = " + bytes(tables * 4096)],
    );

    if(offBits === 12) return {lines,
      ok:"The standard configuration, and note where the geometry comes from: a 4 KiB table of 8-byte entries holds 512 entries, so 9 index bits per level, and 4 levels × 9 + 12 = 48. Nothing here was chosen arbitrarily."};
    return {lines,
      ok:"A huge page shortens the walk by stopping early — the tables are still 4 KiB with 512 entries, but the last " + (topLevels - levels) + " level" + (topLevels - levels === 1 ? " is" : "s are") + " skipped and those bits become offset instead. TLB reach and page-table memory both improve by the same factor, which is the entire point."};
  }},

/* ---------- o5 · what a memory access actually costs ---------- */
amat:{
  title:"Effective memory access time",
  hint:"TLB misses and page faults, priced",
  fields:[
    {k:"hit",l:"TLB hit rate",u:"%",v:98},
    {k:"levels",l:"Page table levels",u:"",v:4},
    {k:"mem",l:"Memory access",u:"ns",v:100},
    {k:"fault",l:"Major faults per million accesses",u:"",v:1},
    {k:"svc",l:"Fault service time",u:"µs",v:60}
  ],
  run({hit,levels,mem,fault,svc}){
    if(!(mem > 0) || !(levels >= 1)) return {lines:[["Fill in the fields","—"]]};
    if(hit < 0 || hit > 100) return {lines:[["TLB hit rate must be between 0 and 100","—"]],
      bad:"A rate outside that range is not a rate."};
    if(fault < 0 || svc < 0) return {lines:[["Fault rate and service time cannot be negative","—"]]};

    const pHit = hit / 100;
    const pFault = fault / 1e6;
    const walk = (1 - pHit) * levels * mem;      // extra accesses on a TLB miss
    const faults = pFault * svc * 1000;          // µs → ns
    const amat = mem + walk + faults;

    const lines: [string,string][] = [
      ["Ideal access (TLB always hits)", ns(mem)],
      ["Added by TLB misses", ns(walk)],
      ["Added by major faults", ns(faults)],
      ["Effective access time", ns(amat)],
      ["Slowdown against ideal", (amat / mem).toFixed(2) + "×"],
      ["Effective accesses per second", n(1e9 / amat)],
      ["Share of time in page faults", (100 * faults / amat).toFixed(1) + " %"],
    ];

    if(faults > walk * 4 && faults > mem) return {lines,
      bad:"Major faults dominate — the machine is short of memory and is reaching storage on the critical path. One fault per million accesses sounds negligible and is not, because a fault is four to five orders of magnitude slower than the access it replaces. This is the arithmetic behind thrashing."};
    if(walk > mem / 2) return {lines,
      bad:"TLB misses are the largest term. This is what a working set beyond the TLB's reach looks like, and no cache-hit-rate metric will show it — huge pages are the lever."};
    return {lines,
      ok:"Translation and faults are both small against the access itself. At this point memory bandwidth and cache behaviour are the constraint, not the paging machinery."};
  }},

/* ---------- o8 · the ceiling, and the turnover past it ---------- */
amdahl:{
  title:"Speedup: Amdahl and the scalability law",
  hint:"why more cores stop helping, then start hurting",
  fields:[
    {k:"p",l:"Parallel fraction",u:"0–1",v:0.95},
    {k:"N",l:"Processors",u:"",v:32},
    {k:"alpha",l:"Contention α",u:"",v:0.03},
    {k:"beta",l:"Coherence β",u:"",v:0.0002}
  ],
  run({p,N,alpha,beta}){
    if(!(N >= 1)) return {lines:[["Need at least one processor","—"]]};
    if(!(p >= 0) || p > 1) return {lines:[["Parallel fraction must be between 0 and 1","—"]],
      bad:"It is a fraction of the work, not a percentage."};
    if(alpha < 0 || beta < 0) return {lines:[["α and β cannot be negative","—"]]};
    if(N > 1e6) return {lines:[["Keep the processor count under a million","—"]]};

    const amdahl = 1 / ((1 - p) + p / N);
    const ceiling = p >= 1 ? Infinity : 1 / (1 - p);
    const usl = (k: number): number => k / (1 + alpha * (k - 1) + beta * k * (k - 1));
    const c = usl(N);
    // USL peaks at N* = sqrt((1 − α) / β).
    const peakN = beta > 0 ? Math.sqrt(Math.max(0, 1 - alpha) / beta) : Infinity;

    const lines: [string,string][] = [
      ["Amdahl speedup at N = " + n(N), amdahl.toFixed(2) + "×"],
      ["Amdahl ceiling (N → ∞)", isFinite(ceiling) ? ceiling.toFixed(1) + "×" : "unbounded"],
      ["Serial fraction", ((1 - p) * 100).toFixed(1) + " %"],
      ["USL speedup at N = " + n(N), c.toFixed(2) + "×"],
      ["Efficiency at N", (100 * c / N).toFixed(1) + " % of linear"],
    ];
    if(isFinite(peakN)){
      lines.push(["USL peaks at", n(Math.round(peakN)) + " processors"],
                 ["Peak speedup", usl(peakN).toFixed(2) + "×"]);
    } else {
      lines.push(["USL peaks at", "no turnover — β is zero"]);
    }

    if(isFinite(peakN) && N > peakN) return {lines,
      bad:"Past the peak: at " + n(N) + " processors the coherence term dominates and adding more makes the system slower. This is the retrograde region, and it is what a benchmark that peaks and then declines has measured. The fix is to reduce sharing, not to add hardware."};
    if(amdahl / N < 0.5) return {lines,
      bad:"Under half of linear. The serial fraction is already the constraint, so the next core buys less than half a core's worth of work — and the coherence term has not even bitten yet."};
    return {lines,
      ok:"Still in the region where processors pay for themselves. Watch the peak figure: it is the point past which the curve turns over, and it moves with how much state the threads share."};
  }},

/* ---------- o12 · the hierarchy, to scale ---------- */
latency:{
  title:"The storage hierarchy, to scale",
  hint:"orders of magnitude, and what they cost",
  fields:[
    {k:"op",l:"Operation",u:"",v:"100",sel:[
      ["1","L1 cache reference (~1 ns)"],
      ["4","L2 cache reference (~4 ns)"],
      ["20","uncontended mutex (~20 ns)"],
      ["100","main memory reference (~100 ns)"],
      ["5000","context switch (~5 µs)"],
      ["50000","NVMe random read (~50 µs)"],
      ["500000","datacentre round trip (~500 µs)"],
      ["8000000","HDD seek (~8 ms)"],
      ["150000000","intercontinental round trip (~150 ms)"]]},
    {k:"count",l:"How many, sequentially",u:"",v:1000000}
  ],
  run({op,count}){
    const one = parseFloat(String(op));
    if(!(count > 0)) return {lines:[["Enter a positive count","—"]]};
    if(count > 1e15) return {lines:[["Keep the count under 10¹⁵","—"]]};

    const L1 = 1;
    const total = one * count;
    // The scaled comparison: if an L1 reference took one second.
    const scaled = one / L1;

    const lines: [string,string][] = [
      ["One operation", ns(one)],
      ["Against an L1 reference", n(scaled) + "× slower"],
      ["If L1 were 1 second, this is", ns(scaled * 1e9)],
      [n(count) + " of them, sequentially", ns(total)],
      ["How many fit in one second", n(Math.floor(1e9 / one))],
      ["Against main memory (100 ns)", one >= 100 ? (one / 100).toFixed(1) + "× slower" : (100 / one).toFixed(1) + "× faster"],
    ];

    if(one >= 1e6) return {lines,
      bad:"At this level the operation is millions of times slower than a memory access, so the only thing that matters is doing fewer of them — batching, caching, and moving the work rather than the data. No amount of CPU optimisation is visible next to this."};
    if(one >= 1000) return {lines,
      bad:"Microseconds. Worth avoiding on a critical path, and worth issuing many at once rather than one at a time — at this level concurrency converts latency into throughput (Little's Law)."};
    return {lines,
      ok:"Nanoseconds: this is the region where data layout, cache lines and access patterns decide performance, and where the difference between sequential and random access is largest in relative terms."};
  }},

};
