import type { Calc } from "../../types.js";

/**
 * Calculators for the computer-architecture subject, keyed by `Module.calc`.
 *
 * The float decomposition reads the actual bits with a DataView rather than
 * reconstructing them arithmetically, because the point of the exercise is to
 * show what the machine really stored — and a JavaScript number IS an IEEE 754
 * binary64, so for that format the calculator is inspecting itself.
 */

/** English thousands separators. `num` in helpers.ts is ro-RO. */
const n = (v: number, d = 0): string =>
  isFinite(v)
    ? v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

const isPow2 = (v: number): boolean => v >= 1 && Number.isInteger(v) && (v & (v - 1)) === 0;

/** Zero-padded binary, for showing a field as the hardware holds it. */
const bin = (v: number, width: number): string =>
  v.toString(2).padStart(width, "0");

export const calcs: Record<string, Calc> = {

/* ---------- a2 · what the machine actually stored ---------- */
float:{
  title:"IEEE 754, taken apart",
  hint:"what the bits really hold",
  fields:[
    {k:"v",l:"Value",u:"",v:0.1},
    {k:"fmt",l:"Format",u:"",v:"64",sel:[["64","binary64 (double)"],["32","binary32 (float)"]]}
  ],
  run({v,fmt}){
    if(v === null || v === undefined || Number.isNaN(v))
      return {lines:[["Enter a number","—"]]};
    const wide = String(fmt) === "64";
    const EBITS = wide ? 11 : 8, FBITS = wide ? 52 : 23, BIAS = wide ? 1023 : 127;

    const buf = new DataView(new ArrayBuffer(8));
    let sign: number, exp: number, fracStr: string, stored: number;
    if(wide){
      buf.setFloat64(0, v);
      const hi = buf.getUint32(0), lo = buf.getUint32(4);
      sign = hi >>> 31;
      exp = (hi >>> 20) & 0x7ff;
      fracStr = bin(hi & 0xfffff, 20) + bin(lo, 32);
      stored = v;
    } else {
      buf.setFloat32(0, v);
      const b = buf.getUint32(0);
      sign = b >>> 31;
      exp = (b >>> 23) & 0xff;
      fracStr = bin(b & 0x7fffff, 23);
      stored = buf.getFloat32(0);
    }

    const allOnes = exp === (1 << EBITS) - 1;
    const kind = allOnes
      ? (/1/.test(fracStr) ? "NaN" : "infinity")
      : exp === 0
        ? (/1/.test(fracStr) ? "subnormal" : "zero")
        : "normal";

    const lines: [string,string][] = [
      ["Format", wide ? "binary64 — 1 + 11 + 52 bits" : "binary32 — 1 + 8 + 23 bits"],
      ["Classification", kind],
      ["Sign bit", String(sign) + (sign ? " (negative)" : " (positive)")],
      ["Exponent field", bin(exp, EBITS) + " = " + exp],
    ];
    if(kind === "normal") lines.push(["Unbiased exponent", String(exp - BIAS)]);
    else if(kind === "subnormal") lines.push(["Unbiased exponent", String(1 - BIAS) + " (subnormal: no implicit 1)"]);
    lines.push(["Fraction field", fracStr.slice(0, 26) + (fracStr.length > 26 ? "…" : "")]);

    if(kind === "normal" || kind === "subnormal"){
      // 25 significant digits is enough to expose the gap for any double.
      const exact = Math.abs(stored) > 0 ? stored.toPrecision(25) : "0";
      lines.push(["As written", String(v)], ["Actually stored", exact]);
      const ulp = 2 ** ((kind === "normal" ? exp - BIAS : 1 - BIAS) - FBITS);
      lines.push(["Gap to the next representable value", ulp.toPrecision(3)]);
      if(!wide){
        const err = stored - v;
        lines.push(["Rounding error from binary64", err === 0 ? "0 — exactly representable in both" : err.toPrecision(3)]);
      }
    }

    if(kind === "NaN") return {lines,
      bad:"NaN is unordered with respect to everything, including itself: NaN == NaN is false. That breaks sort comparators, min/max reductions and hash lookups unless it is handled deliberately."};
    if(kind === "infinity") return {lines,
      bad:"Infinity propagates, and ∞ − ∞ is NaN. Overflow to infinity is silent — no flag is checked by default."};
    if(kind === "subnormal") return {lines,
      bad:"Subnormal: the exponent field is all zeros, so there is no implicit leading 1 and precision is reduced. Many processors handle these on a slow path, which is why numerical code sometimes enables flush-to-zero."};
    if(stored !== v) return {lines,
      bad:"The stored value is not the value you typed — this format cannot represent it, so it was rounded to the nearest one it can. Compare with a relative tolerance, never with ==."};
    if(String(v) !== stored.toPrecision(17).replace(/0+$/, "").replace(/\.$/, "") && Math.abs(v) > 0 && v !== Math.round(v))
      return {lines,
        bad:"Look at \"actually stored\" against \"as written\": the short decimal is a convenient printing of a value that is not exactly what you typed. This is why 0.1 + 0.2 is not 0.3, and why money must not be held in binary floating point."};
    return {lines,
      ok:"Exactly representable — the value has a denominator that is a power of two, so no rounding occurred. Integers up to 2^" + (FBITS + 1) + " and dyadic fractions are the values with this property."};
  }},

/* ---------- a3 · what pipelining actually buys ---------- */
pipe:{
  title:"Pipeline speedup",
  hint:"stages, stalls and the fill cost",
  fields:[
    {k:"stages",l:"Pipeline stages",u:"",v:5},
    {k:"instr",l:"Instructions",u:"",v:1000000},
    {k:"stall",l:"Stall cycles per instruction",u:"",v:0.4},
    {k:"base",l:"Unpipelined instruction time",u:"ns",v:5},
    {k:"oh",l:"Pipeline register overhead per stage",u:"%",v:5}
  ],
  run({stages,instr,stall,base,oh}){
    if(!(stages >= 1) || !(instr >= 1) || !(base > 0)) return {lines:[["Fill in the fields","—"]]};
    if(stall < 0 || oh < 0) return {lines:[["Stalls and overhead cannot be negative","—"]]};
    if(stages > 100) return {lines:[["Keep the stage count under 100","—"]],
      bad:"Real pipelines run from about 5 to 20 stages; past that the misprediction penalty dominates everything."};

    // A pipelined stage is the unpipelined time divided by the depth, plus the
    // latch delay — which is why depth does not buy its full factor.
    const cycle = (base / stages) * (1 + oh / 100);
    const cpi = 1 + stall;
    const cyclesPipe = instr * cpi + (stages - 1);       // + fill
    const tPipe = cyclesPipe * cycle;
    const tUnpipe = instr * base;
    const speedup = tUnpipe / tPipe;

    const lines: [string,string][] = [
      ["Cycle time", cycle.toPrecision(3) + " ns (" + (1000 / cycle).toPrecision(3) + " MHz)"],
      ["CPI", cpi.toFixed(2)],
      ["IPC", (1 / cpi).toFixed(2)],
      ["Ideal speedup (depth)", stages + "×"],
      ["Actual speedup", speedup.toFixed(2) + "×"],
      ["Efficiency against ideal", (100 * speedup / stages).toFixed(1) + " %"],
      ["Unpipelined time", tUnpipe.toPrecision(4) + " ns"],
      ["Pipelined time", tPipe.toPrecision(4) + " ns"],
      ["Cycles lost to fill", String(stages - 1) + " (negligible at " + n(instr) + " instructions)"],
    ];

    const lostToStalls = 100 * (1 - 1 / cpi);
    const lostToOh = 100 * (1 - 1 / (1 + oh / 100));
    if(stall > 1) return {lines,
      bad:"Stalls dominate: " + lostToStalls.toFixed(0) + "% of the ideal throughput is lost before the pipeline depth is even considered. Forwarding, better scheduling and branch prediction all attack this term, and adding stages does not."};
    if(oh > 20) return {lines,
      bad:"The latch overhead is " + lostToOh.toFixed(0) + "% per stage, which is the reason depth stops paying. Each extra stage adds a fixed delay that does not shrink with the work it separates."};
    return {lines,
      ok:"Note where the ideal speedup goes: stalls cost " + lostToStalls.toFixed(0) + "% and the per-stage latch overhead costs " + lostToOh.toFixed(0) + "%. Depth alone never delivers its nominal factor, and raising it raises the misprediction penalty too."};
  }},

/* ---------- a4 · what a mispredict actually costs ---------- */
branch:{
  title:"The cost of a mispredicted branch",
  hint:"accuracy against penalty",
  fields:[
    {k:"acc",l:"Predictor accuracy",u:"%",v:99},
    {k:"penalty",l:"Misprediction penalty",u:"cycles",v:18},
    {k:"freq",l:"Branches per 100 instructions",u:"",v:20},
    {k:"ipc",l:"IPC when not stalled",u:"",v:3}
  ],
  run({acc,penalty,freq,ipc}){
    if(acc < 0 || acc > 100) return {lines:[["Accuracy must be between 0 and 100","—"]]};
    if(!(penalty >= 0) || !(freq >= 0) || !(ipc > 0)) return {lines:[["Fill in the fields","—"]]};
    if(freq > 100) return {lines:[["At most 100 branches per 100 instructions","—"]]};

    const miss = (100 - acc) / 100;
    const missesPer100 = freq * miss;
    const wasted = missesPer100 * penalty;
    const baseline = 100 / ipc;                 // cycles for 100 instructions
    const total = baseline + wasted;
    const overhead = 100 * wasted / baseline;
    const effIpc = 100 / total;
    const discarded = penalty * ipc;

    const lines: [string,string][] = [
      ["Misprediction rate", (miss * 100).toFixed(2) + " %"],
      ["Mispredicts per 100 instructions", missesPer100.toFixed(2)],
      ["Cycles for 100 instructions, no stalls", baseline.toFixed(1)],
      ["Cycles wasted on mispredicts", wasted.toFixed(1)],
      ["Overhead", overhead.toFixed(1) + " %"],
      ["Effective IPC", effIpc.toFixed(2) + " (from " + ipc.toFixed(2) + ")"],
      ["Work discarded per mispredict", "about " + Math.round(discarded) + " instructions"],
      ["Branch every", (100 / Math.max(freq, 0.01)).toFixed(1) + " instructions"],
    ];

    if(overhead > 50) return {lines,
      bad:"The machine is spending more time refilling than working. At this accuracy the branch is effectively unpredictable, and the remedy is to remove it — a conditional move or a mask has a fixed cost of one or two cycles, which beats " + penalty + " whenever prediction fails this often."};
    if(overhead > 10) return {lines,
      bad:"Over a tenth of the cycles are discarded work. Worth attacking: sort the data so the branch becomes predictable, hoist the branch out of the loop, or go branchless. Note that a profiler will show these cycles as retiring nothing rather than as time in the branch."};
    return {lines,
      ok:"Prediction is carrying the design. Note how sharply this degrades — at " + (acc - 4).toFixed(0) + "% accuracy the overhead would be " + (100 * freq * ((100 - acc + 4) / 100) * penalty / baseline).toFixed(0) + "%, which is why predictors are built to 99% and not to 95%."};
  }},

/* ---------- a6 · the address split, and the stride pathology ---------- */
cache:{
  title:"Cache geometry and conflict misses",
  hint:"where a line can go, and what a stride does",
  fields:[
    {k:"size",l:"Cache size",u:"KiB",v:32},
    {k:"line",l:"Line size",u:"bytes",v:64},
    {k:"ways",l:"Associativity",u:"ways",v:8},
    {k:"abits",l:"Physical address width",u:"bits",v:48},
    {k:"stride",l:"Access stride",u:"bytes",v:64}
  ],
  run({size,line,ways,abits,stride}){
    if(!isPow2(line)) return {lines:[["Line size must be a power of two","—"]],
      bad:"The offset field is log2(line size), so a non-power-of-two line has no bit field."};
    if(!(size > 0) || !(ways >= 1)) return {lines:[["Fill in the fields","—"]]};
    const bytes = size * 1024;
    const sets = bytes / (line * ways);
    if(!isPow2(sets)) return {lines:[["Size ÷ (line × ways) must be a power of two","—"]],
      bad:"That combination gives " + (sets).toFixed(2) + " sets, and the index field must be a whole number of bits."};
    if(abits < 12 || abits > 64) return {lines:[["Address width must be between 12 and 64","—"]]};

    const offBits = Math.log2(line), idxBits = Math.log2(sets);
    const tagBits = abits - offBits - idxBits;
    if(tagBits < 0) return {lines:[["The cache is larger than the address space","—"]]};

    // How many distinct sets a constant-stride walk actually reaches.
    // Enough probes to reach every set even when several accesses share a
    // line: a stride below the line size needs line/stride accesses per line.
    const perLine = Math.max(1, Math.ceil(line / Math.max(stride, 1)));
    const seen = new Set<number>();
    const probes = Math.min(65536, sets * perLine * 2);
    for(let i = 0; i < probes; i++) seen.add(Math.floor((i * stride) / line) % sets);
    const reached = seen.size;
    const effective = reached * ways * line;

    const lines: [string,string][] = [
      ["Sets", n(sets) + " (" + idxBits + " index bits)"],
      ["Lines total", n(sets * ways)],
      ["Address split", tagBits + " tag │ " + idxBits + " index │ " + offBits + " offset"],
      ["Tag storage overhead", n(Math.ceil(tagBits / 8) * sets * ways) + " bytes of tag for " + n(bytes) + " of data"],
      ["Sets reached at this stride", n(reached) + " of " + n(sets)],
      ["Effective capacity at this stride", n(effective) + " bytes"],
      ["Usable fraction of the cache", (100 * effective / bytes).toFixed(1) + " %"],
      ["Lines held before self-eviction", reached === 0 ? "—" : n(reached * ways)],
    ];

    if(reached < sets / 4) return {lines,
      bad:"This stride maps onto only " + n(reached) + " of " + n(sets) + " sets, so a cache of " + n(bytes) + " bytes behaves like one of " + n(effective) + ". That is a conflict-miss pathology, and it happens because the stride shares large power-of-two factors with the set count. Padding the array dimension by one element usually removes it entirely."};
    if(stride >= line) return {lines,
      ok:"The stride spreads across the sets, so conflict misses are not the limiting factor. Note that at " + n(stride) + " bytes every access still touches a fresh line, so each " + line + "-byte fetch serves one element — poor spatial locality, which is a separate cost from conflicts and needs a different fix."};
    return {lines,
      ok:"Stride is smaller than the line, so consecutive accesses share lines and spatial locality is being used well. Conflict misses are not a concern at this stride."};
  }},

/* ---------- a12 · compute bound or memory bound ---------- */
roofline:{
  title:"Roofline",
  hint:"which resource is the limit",
  fields:[
    {k:"peak",l:"Peak compute",u:"GFLOP/s",v:500},
    {k:"bw",l:"Peak memory bandwidth",u:"GB/s",v:100},
    {k:"ai",l:"Arithmetic intensity",u:"FLOP/byte",v:0.25},
    {k:"got",l:"Measured performance (0 to skip)",u:"GFLOP/s",v:0}
  ],
  run({peak,bw,ai,got}){
    if(!(peak > 0) || !(bw > 0)) return {lines:[["Peak compute and bandwidth must be positive","—"]]};
    if(!(ai > 0)) return {lines:[["Arithmetic intensity must be positive","—"]],
      bad:"A kernel that moves bytes and performs no arithmetic has intensity zero and is bandwidth bound by definition."};

    const ridge = peak / bw;
    const memRoof = ai * bw;
    const attainable = Math.min(peak, memRoof);
    const bound = memRoof < peak ? "memory" : "compute";

    const lines: [string,string][] = [
      ["Ridge point", ridge.toPrecision(3) + " FLOP/byte"],
      ["This kernel's intensity", ai.toPrecision(3) + " FLOP/byte"],
      ["Bandwidth roof at this intensity", memRoof.toPrecision(4) + " GFLOP/s"],
      ["Compute roof", peak.toPrecision(4) + " GFLOP/s"],
      ["Attainable", attainable.toPrecision(4) + " GFLOP/s"],
      ["Bound by", bound],
      ["Fraction of peak compute reachable", (100 * attainable / peak).toFixed(1) + " %"],
      ["Bandwidth needed to hit peak compute", (peak / ai).toPrecision(4) + " GB/s"],
    ];

    if(got > 0){
      lines.push(["Measured", got.toPrecision(4) + " GFLOP/s"],
                 ["Fraction of the roofline achieved", (100 * got / attainable).toFixed(1) + " %"]);
      if(got < attainable * 0.5) return {lines,
        bad:"Well below both roofs, so neither compute nor bandwidth is saturated — the limit is something else, and it is usually latency: a dependency chain, or too few outstanding misses to cover DRAM latency. Widening vectors or adding cores will not help until that is fixed."};
    }

    if(bound === "memory") return {lines,
      bad:"Memory bound at " + (100 * attainable / peak).toFixed(1) + "% of peak compute. Wider vectors, more cores and cheaper arithmetic all buy nothing here. What helps is moving fewer bytes — blocking to raise intensity, packing the data, struct-of-arrays, and avoiding the write-allocate fetch on buffers that are never read."};
    return {lines,
      ok:"Compute bound: the kernel is past the ridge, so bandwidth is not the constraint and vectorisation, more cores and shorter dependency chains are the levers that pay. Check the measured figure against the compute roof before assuming the arithmetic is the limit — a point far below both roofs means neither is saturated."};
  }},

};
