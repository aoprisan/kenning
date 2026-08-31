import type { Calc } from "../../types.js";

/** Calculators for the distributed-systems subject, keyed by `Module.calc`. */
export const calcs: Record<string, Calc> = {

/* ---------- d4 · leaderless read and write quorums ---------- */
quorum:{
  title:"Read and write quorums",
  hint:"N replicas, W acknowledgements, R responses",
  fields:[
    {k:"N",l:"Replicas N",u:"",v:3},
    {k:"W",l:"Write quorum W",u:"",v:2},
    {k:"R",l:"Read quorum R",u:"",v:2}
  ],
  run({N,W,R}){
    if(!Number.isInteger(N)||!Number.isInteger(W)||!Number.isInteger(R))
      return {lines:[["Replicas and quorums must be whole numbers","—"]]};
    if(N<1) return {lines:[["N must be at least 1","—"]],bad:"There has to be somewhere to put the data."};
    if(W<1||W>N||R<1||R>N)
      return {lines:[["W and R must each be between 1 and N = "+N,"—"]],
        bad:"A quorum smaller than one acknowledges nothing; one larger than N can never be reached."};

    const overlap = R + W > N;
    // Two write quorums must intersect, or two concurrent writes can each
    // succeed without either seeing the other.
    const writesIntersect = 2 * W > N;
    const wTol = N - W, rTol = N - R;

    const lines: [string,string][] = [
      ["Replicas N", String(N)],
      ["R + W", R + " + " + W + " = " + (R + W) + (overlap ? " > " : " ≤ ") + N],
      ["Read set overlaps every write set", overlap ? "yes" : "no — a read can miss the latest write"],
      ["Two write quorums must intersect", writesIntersect ? "yes (2W > N)" : "no — concurrent writes can both succeed unseen"],
      ["Node failures writes tolerate", wTol + " of " + N],
      ["Node failures reads tolerate", rTol + " of " + N],
      ["Replicas contacted per operation", "write " + W + ", read " + R],
    ];

    // Name the shape, because these corners are the ones people reach for.
    const shape = W === N && R === 1 ? "W = N, R = 1: reads are one hop, and a single unreachable replica blocks every write."
      : R === N && W === 1 ? "W = 1, R = N: writes are one hop, and a single unreachable replica blocks every read."
      : W === N && R === N ? "W = R = N: no failure of any kind is tolerated in either direction."
      : overlap && writesIntersect ? "The usual shape: both quorums are majorities, so reads and writes each survive " + Math.min(wTol, rTol) + " failure" + (Math.min(wTol, rTol) === 1 ? "" : "s") + "."
      : "";
    if(shape) lines.push(["Shape", shape]);

    if(!overlap) return {lines,
      bad:"With R + W ≤ N a read set can be disjoint from the write set, so a read may return a stale value — and usually will not, which is what makes this configuration hard to catch. It is a legitimate choice for lower latency, but only where a stale read is acceptable."};
    if(!writesIntersect) return {lines,
      bad:"Reads overlap writes, but two write quorums need not overlap each other, so two concurrent writes can each be acknowledged without seeing the other. That is a conflict the store must detect and resolve — with version vectors, not timestamps."};
    return {lines,
      ok:"Every read set meets every write set, and every write set meets every other. This still is not linearizability: sloppy quorums, partial writes and replica rebuilds all void the argument, so an operation that truly requires the latest committed value needs consensus, not a quorum parameter."};
  }},

};
