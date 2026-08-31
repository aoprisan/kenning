import { F, W } from "../../helpers.js";
/**
 * Distributed systems curriculum. Content is English on purpose: the
 * terminology is the literature's and translating it would cut the reader off
 * from every paper and manual they will go on to read.
 */
export const levels = [
    { name: "Level 0 · What can go wrong", mods: [
            { id: "d1", t: "Failure models", calc: null,
                blurb: "Before an algorithm can be correct, you have to say what it is allowed to survive. That statement is the failure model, and most arguments about distributed systems are really arguments about it.",
                body: `
<h3>Why the model comes first</h3>
<p>A distributed system is a set of processes that can learn about each other only by exchanging messages. Everything difficult about it follows from a single fact: a process cannot tell a peer that has died from a peer that is merely slow, and it cannot tell either of those from a network that has quietly stopped delivering. All three produce the same evidence — nothing arrives.</p>
<p>So "this system tolerates failures" is not a claim until you say <em>which</em> failures. A <span class="term-def">failure model</span> is that statement: the set of behaviours a faulty component is permitted to exhibit. An algorithm proved correct under one model tells you nothing under a wider one. Most of the disagreement you will encounter in design reviews is not about the algorithm; it is about which model the two people have silently assumed.</p>

<h3>The taxonomy of process failures</h3>
${F(`<b>crash-stop</b>        a process halts and never comes back
<b>crash-recovery</b>    a process halts, then restarts — possibly with amnesia
<b>omission</b>          a process keeps running but drops messages it
                  should have sent or should have received
<b>Byzantine</b>         a process may do anything at all, including
                  lying, and lying differently to different peers`)}
<p>The list is a hierarchy, widening downwards. Every crash-stop failure is expressible as an omission failure — a process that omits everything from the moment it dies — and every omission failure is a special case of Byzantine behaviour. Tolerating a wider model is therefore strictly harder and strictly more expensive, which is why nobody pays for Byzantine tolerance unless the peers are genuinely outside their trust boundary.</p>
<p><span class="term-def">Crash-recovery</span> deserves a second look, because intuition gets it backwards. A process that comes back seems friendlier than one that stays dead, but it is harder to reason about: it may have forgotten what it promised. If it acknowledged a write, then lost the write because the acknowledgement outran the disk, it now contradicts its own past. This is why algorithms in the crash-recovery model are so specific about what must reach stable storage before a message goes out.</p>
<p><span class="term-def">Omission</span> failures split into send omission and receive omission, and the split matters: a process suffering receive omission is invisible to itself. It is alive, its logs look healthy, its metrics are green, and it is silently missing half the cluster's traffic. Failure detectors built on "am I healthy?" self-reporting cannot see this at all.</p>
${W(`A crashed peer, a slow peer and a severed link are indistinguishable from the outside. No timeout separates them — a timeout only converts an unknown into a decision to act. Every failure detector in production is therefore producing a <em>suspicion</em>, not a fact, and any algorithm that treats it as a fact is unsafe the first time the suspicion is wrong.`)}

<h3>The timing spectrum</h3>
<p>The failure model says what a process may do. A second, independent axis says what <em>time</em> may do — and it is this axis that decides whether a problem is solvable at all.</p>
${F(`<b>synchronous</b>            known upper bound on message delay and on the
                       time a process takes to execute a step
<b>partially synchronous</b>   bounds exist but are unknown, or are known but
                       hold only after some unknown time (GST)
<b>asynchronous</b>           no bound on message delay or on process speed;
                       only causal order is guaranteed`)}
<p>In the <span class="term-def">synchronous</span> model, a timeout is a proof: if the bound is <em>d</em> and nothing arrived in <em>d</em>, the sender has failed. That gives you a perfect failure detector, and with it, distributed problems become almost easy. It is also an assumption no shared network gives you. Garbage collection pauses, live migration, a saturated link, a hypervisor descheduling a VM — each can stall a healthy process for longer than any bound you would have been willing to write down.</p>
<p>The <span class="term-def">asynchronous</span> model makes no timing assumption whatsoever. It is the honest model, and it is where the impossibility results live: an algorithm that is correct here is correct on any network, because the model already permits the worst schedule an adversary could arrange.</p>
<p><span class="term-def">Partial synchrony</span> is the compromise real systems are built on, and it is worth stating precisely. It says the network eventually behaves — after some unknown point in time, called the global stabilisation time, delays stay within some bound. You are never told when GST arrives, so you can never rely on having passed it. This buys exactly the right thing: algorithms are designed so that <em>safety</em> (nothing wrong is ever decided) holds in all executions, including the ugly ones before GST, while <em>liveness</em> (something is eventually decided) is only promised afterwards. Raft's randomised election timeouts and Paxos's leader election are engineering expressions of exactly this split.</p>

<h3>"The network is reliable"</h3>
<p>The eight fallacies of distributed computing were collected at Sun Microsystems, mostly by Peter Deutsch in 1994, with the last added by James Gosling. They are the assumptions a programmer carries over from single-machine code without noticing.</p>
${F(`1. The network is reliable.        5. Topology doesn't change.
2. Latency is zero.                6. There is one administrator.
3. Bandwidth is infinite.          7. Transport cost is zero.
4. The network is secure.          8. The network is homogeneous.`)}
<p>The first is first for a reason: it is the one that turns a correct program into an incorrect one rather than merely a slow one. A local function call either runs or does not, and either way you find out. A remote call has a third outcome, and it is the common one: <span class="term-def">no answer</span>. The request may have been lost on the way out, the work may have completed and the reply lost on the way back, or the work may still be running and about to complete after you have given up.</p>

<h3>What it costs</h3>
<p>Once you accept that no answer is a possible outcome, a chain of consequences follows, and it is the same chain in every system:</p>
<ul>
<li>You must <span class="term-def">retry</span>, because otherwise a lost request is a lost operation.</li>
<li>Retrying creates <span class="term-def">duplicates</span>, because the original may have been delivered after all.</li>
<li>So delivery guarantees collapse to two honest options: <span class="term-def">at-most-once</span> (never retry; sometimes lose) and <span class="term-def">at-least-once</span> (always retry; sometimes duplicate).</li>
<li>"Exactly once" is not a third delivery guarantee. It is an <em>end-to-end</em> property you construct on top of at-least-once, with idempotent operations or with deduplication keyed on a request identifier the client generates and reuses across retries.</li>
</ul>
<p>The same reasoning explains <span class="term-def">partial failure</span>, the property that separates a distributed system from a program. A multi-step operation across three services can leave two of them changed and one untouched, with no component in a position to know that this happened. Single-machine intuition offers nothing here: there is no stack to unwind, and the failure is not an exception you can catch.</p>
${W(`The dangerous retry is the one that is not idempotent and not deduplicated: "charge this card", "append this row", "send this email". If the operation has an external effect, at-least-once delivery means at-least-once <em>effect</em>. Deciding this per endpoint, at design time, is cheaper than discovering it from a customer's duplicated invoice.`)}
<p>Everything in the modules that follow is a response to this module. Ordering (d2) exists because "no answer" makes wall-clock reasoning unsafe. Consensus (d3) exists because processes must agree despite silence they cannot interpret. Replication (d4) exists because the only defence against a component failing is another component holding the same data — which immediately raises the question of what the two of them do when they disagree.</p>`,
                facts: [
                    "Silence carries no information: a crashed peer, a slow peer and a severed link look identical from outside. A timeout is a policy decision, not a measurement.",
                    "The failure models nest — crash-stop ⊂ crash-recovery ⊂ omission ⊂ Byzantine — so an algorithm proved under one says nothing under a wider one.",
                    "Partial synchrony is the model real systems target: safety must hold in every execution, liveness only after the unknown global stabilisation time.",
                    "There are two delivery guarantees, at-most-once and at-least-once. Exactly-once is an end-to-end property built from at-least-once plus idempotence or deduplication.",
                    "A remote call has three outcomes, not two: success, failure, and no answer — and no answer does not tell you whether the work happened."
                ] }
        ] }
];
//# sourceMappingURL=curriculum.js.map