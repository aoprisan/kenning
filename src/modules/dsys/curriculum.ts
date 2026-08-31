import type { Level } from "../../types.js";
import { F, W } from "../../helpers.js";

/**
 * Distributed systems curriculum. Content is English on purpose: the
 * terminology is the literature's and translating it would cut the reader off
 * from every paper and manual they will go on to read.
 */
export const levels: Level[] = [

{ name:"Level 0 · What can go wrong", mods:[

{id:"d1", t:"Failure models", calc:null,
 blurb:"Before an algorithm can be correct, you have to say what it is allowed to survive. That statement is the failure model, and most arguments about distributed systems are really arguments about it.",
 body:`
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
 facts:[
 "Silence carries no information: a crashed peer, a slow peer and a severed link look identical from outside. A timeout is a policy decision, not a measurement.",
 "The failure models nest — crash-stop ⊂ crash-recovery ⊂ omission ⊂ Byzantine — so an algorithm proved under one says nothing under a wider one.",
 "Partial synchrony is the model real systems target: safety must hold in every execution, liveness only after the unknown global stabilisation time.",
 "There are two delivery guarantees, at-most-once and at-least-once. Exactly-once is an end-to-end property built from at-least-once plus idempotence or deduplication.",
 "A remote call has three outcomes, not two: success, failure, and no answer — and no answer does not tell you whether the work happened."
 ]},

{id:"d2", t:"Time and ordering", calc:null,
 blurb:"Two machines cannot agree on what time it is, and it does not matter. What they need is agreement on what happened before what — a different question, with a better answer.",
 body:`
<h3>Physical clocks and why they disagree</h3>
<p>Every machine keeps time with a crystal oscillator that is close to its nominal frequency and never exactly on it. The error accumulates, and it accumulates at a rate that varies with temperature and with the individual part, so two machines that agreed a minute ago do not agree now. This gap is <span class="term-def">clock skew</span>; the rate at which it opens is <span class="term-def">drift</span>.</p>
<p>Time synchronisation narrows the gap without closing it. A daemon speaking NTP, or a datacentre using PTP, estimates the offset to a reference and corrects for it — but the estimate is made over a network whose delay is exactly the quantity in question, and the correction is a best effort with no bound you are entitled to rely on for correctness. The useful mental model is that synchronisation makes clocks <em>close</em>, and gives you no way to know how close right now.</p>
<p>Two further hazards follow from the correction itself, and both bite in production:</p>
<ul>
<li>A wall-clock can move <span class="term-def">backwards</span>. If the daemon decides the machine is ahead, it may step the clock back, and a timestamp taken after another one can be numerically smaller. Measuring an interval by subtracting two wall-clock readings can therefore yield a negative duration.</li>
<li>This is why every platform offers a second clock — a <span class="term-def">monotonic</span> one, which only ever advances and is not comparable across machines. Durations come from the monotonic clock; the wall clock is for displaying a date to a human, and for very little else.</li>
</ul>
${W(`If a piece of logic subtracts two wall-clock timestamps, or compares timestamps taken on two different machines, and something important depends on the result, that logic has a bug waiting for the next clock correction. The bug is not rare — it is simply timed by an external event you do not control.`)}

<h3>happens-before: the relation that survives</h3>
<p>Lamport's move in 1978 was to stop asking when an event occurred and ask instead which events could possibly have influenced it. The result is the <span class="term-def">happens-before</span> relation, written <em>→</em>, and it is defined without reference to any clock.</p>
${F(`a → b   when one of the following holds:

  1. a and b happen on the same process, and a comes first
  2. a is the sending of a message and b is the receipt of that
     same message
  3. transitivity: a → c and c → b

a ∥ b   (a and b are concurrent) when neither a → b nor b → a`)}
<p>Only three rules, and between them they capture every path by which information could have travelled from one event to another. If <em>a → b</em>, then <em>a</em> could have caused <em>b</em>. If <em>a ∥ b</em>, then neither could have influenced the other, and nothing in the system has any basis for ordering them.</p>
<p>Note what this is: a <span class="term-def">partial order</span>, not a total one. Concurrency is not an unfortunate gap to be papered over with a tiebreak — it is real information, and it is exactly the information a conflict-detecting system needs. A system that forces a total order too early throws it away.</p>

<h3>Lamport clocks</h3>
<p>The relation is defined; now it needs a mechanical implementation. A Lamport clock is a single integer per process, and the whole algorithm is three lines.</p>
${F(`each process keeps a counter L, initially 0

  local event      L := L + 1
  send             L := L + 1, and attach L to the message
  receive(m)       L := max(L, m.L) + 1

then:   a → b   ⟹   L(a) < L(b)`)}
<p>The <code>max</code> on receive is the entire trick. It drags the receiver's counter past anything the sender knew, so a message can never be stamped earlier than the send that produced it — no matter how far apart the two machines' physical clocks have wandered.</p>
<p>The implication runs one way only, and mistaking it for an equivalence is the classic error:</p>
${F(`a → b        ⟹      L(a) < L(b)        holds always
L(a) < L(b)  ⟹      a → b              DOES NOT hold`)}
<p>Two concurrent events on different processes get whatever counter values their local histories happened to produce, and one of them will be smaller. So a smaller Lamport value proves nothing about causality; a larger one on an event you know is caused proves consistency. Contrapositively — and this is the useful direction — if <em>L(a) ≥ L(b)</em>, then <em>a</em> definitely did not happen before <em>b</em>.</p>
<p>Because ties are possible, a Lamport clock is often extended to a <span class="term-def">total order</span> by breaking ties on process id: <em>(L, pid)</em> compared lexicographically. That total order is consistent with causality — it never contradicts <em>→</em> — but it is an arbitrary choice among concurrent events, and it should be treated as such rather than as a discovery about what really happened first.</p>

<h3>Vector clocks</h3>
<p>To recover the converse, each process must track not one counter but what it knows of everybody's counter. That is a <span class="term-def">vector clock</span>: an array with one entry per process.</p>
${F(`each process i keeps a vector V of length n, initially all zeros

  local event or send    V[i] := V[i] + 1  (attach V to the message)
  receive(m)             V[k] := max(V[k], m.V[k])  for every k
                         V[i] := V[i] + 1

  V(a) ≤ V(b)   when V(a)[k] ≤ V(b)[k] for every k
  V(a) < V(b)   when V(a) ≤ V(b) and V(a) ≠ V(b)

then:   a → b   ⟺   V(a) < V(b)
        a ∥ b   ⟺   neither V(a) < V(b) nor V(b) < V(a)`)}
<p>Now the relation is detectable rather than merely respected. Given two versions of a value carrying vector clocks, a replica can tell three cases apart: this one supersedes that one, that one supersedes this one, or the two are genuinely concurrent and a conflict must be resolved — by merging, by application logic, or by handing both to the client. Leaderless stores in the Dynamo lineage use exactly this, and the "sibling" a client receives is a pair of concurrent versions that the store refuses to silently discard.</p>
<p>The cost is the vector: n entries, carried on every message and stored with every version, in a system where n changes as nodes join and leave. That is a real engineering burden, and it is why the variants — version vectors keyed by replica rather than by client, dotted version vectors, pruning schemes — exist at all.</p>

<h3>Why wall-clock timestamps lose events</h3>
<p>Take the most common shortcut in distributed storage: <span class="term-def">last-write-wins</span>, where a conflict is settled by keeping the version with the larger wall-clock timestamp. Now put it on machines whose clocks differ by more than the time it takes a write to travel.</p>
<p>A client writes <em>x = 1</em> on a node whose clock runs ahead. A second client reads that value, and — <em>because</em> of what it read — writes <em>x = 2</em> on a node whose clock runs behind. The second write causally depends on the first: <em>write₁ → read → write₂</em>. But its timestamp is smaller. Last-write-wins compares the two numbers, keeps the first, and discards the second. No error is raised anywhere; the update is simply gone, and the client that made it was told it succeeded.</p>
${W(`This is not a race that better code avoids. It is the ordering rule itself failing: the system ordered an effect before its cause because it asked a clock a question the clock cannot answer. Lamport and vector clocks cannot lose this write, because the <code>max</code> on receive forces the second write's logical timestamp above the first's.`)}
<p>Which leaves the obvious question: if logical clocks are correct and physical ones are not, why does anyone still use wall time? Because logical clocks say nothing about <em>real</em> time — they cannot express "expires in 30 seconds", and they cannot order events between processes that never exchanged a message. Production systems therefore either accept an explicit bound on skew and wait it out (Spanner's TrueTime commits by waiting out the uncertainty interval), or combine the two into a <span class="term-def">hybrid logical clock</span>, which tracks physical time closely enough to be readable while carrying a logical component that preserves causality. The clock in the animation is the honest version of the choice: pick an ordering key, and see what it does to a message whose cause you already know.</p>`,
 facts:[
 "Synchronisation makes clocks close, not equal, and never tells you how close they are right now. Skew is a variable, not a constant.",
 "Wall clocks can step backwards after a correction; durations must come from the monotonic clock, which never goes back but cannot be compared across machines.",
 "happens-before is a partial order. Concurrency is information — two events that never influenced each other genuinely have no order, and inventing one discards a real signal.",
 "a → b implies L(a) < L(b), but not the converse. The useful reading is contrapositive: L(a) ≥ L(b) proves a did not happen before b.",
 "Vector clocks make causality detectable rather than merely respected — at the cost of one entry per process on every message and every stored version.",
 "Last-write-wins on wall-clock timestamps can discard a write that causally depends on the one it loses to, silently, with a success returned to the client."
 ]}

]},

{ name:"Level 1 · Agreement", mods:[

{id:"d3", t:"Consensus", calc:null,
 blurb:"One impossibility result, one counting argument, and two algorithms that are the same algorithm. Most of what looks like folklore here is provable, and most of what is quoted as FLP is not what FLP says.",
 body:`
<h3>What consensus has to deliver</h3>
<p>A set of processes each start with a proposed value and must decide on one. The problem is only interesting because of what "decide" is required to mean:</p>
${F(`<b>agreement</b>     no two correct processes decide differently
<b>validity</b>      the decided value was proposed by some process
                (it cannot be invented by the algorithm)
<b>termination</b>   every correct process eventually decides`)}
<p>Drop any one and the problem becomes trivial. Drop agreement and everyone decides their own value; drop validity and everyone decides 0; drop termination and everyone waits forever. The first two are <span class="term-def">safety</span> properties — they say nothing bad happens — and the third is a <span class="term-def">liveness</span> property, saying something good eventually does. Keep that split in view, because the central result is about exactly where the line falls.</p>

<h3>FLP, stated precisely</h3>
<p>Fischer, Lynch and Paterson proved in 1985 that in an <em>asynchronous</em> message-passing system, where messages are eventually delivered but with no bound on delay and no bound on relative process speed, <em>no deterministic algorithm solves consensus in every execution if even one process may fail by crashing</em>.</p>
<p>The proof turns on <span class="term-def">bivalence</span>. A configuration is bivalent if both decisions are still reachable from it. FLP show that some initial configuration is bivalent, and that from any bivalent configuration an adversarial scheduler can always deliver messages in an order that reaches another bivalent configuration. It never has to crash anyone: the mere <em>possibility</em> of one crash is what stops the algorithm from ever safely committing to a decision. The result is an infinite execution in which no process ever decides.</p>
<p>Now the part that is routinely misquoted. FLP does <em>not</em> say:</p>
<ul>
<li><span class="term-def">that consensus is impossible in practice.</span> It exhibits one adversarial execution. Real schedulers are not that adversary, and real systems reach agreement constantly.</li>
<li><span class="term-def">that safety must be given up.</span> Agreement and validity are achievable unconditionally. The casualty is guaranteed termination — which is why every production consensus system is designed to be always safe and eventually live, never the other way round.</li>
<li><span class="term-def">that no algorithm helps.</span> Three escapes are known, and each weakens exactly one hypothesis. <em>Randomisation</em> (Ben-Or) drops determinism and terminates with probability 1. <em>Partial synchrony</em> (Dwork, Lynch and Stockmeyer, 1988) drops full asynchrony and gives termination after the stabilisation time from module d1. <em>Failure detectors</em> (Chandra and Toueg) add an oracle: the eventually weak detector ◇S is the weakest one with which consensus is solvable, given a majority of correct processes.</li>
</ul>
${W(`"FLP says you cannot have consensus" is wrong in a way that matters, because it invites the conclusion that the guarantees are negotiable. The correct reading is narrower and more useful: you cannot bound the time to decide, so do not build anything whose <em>correctness</em> depends on a decision arriving by a deadline. A timeout in a consensus protocol may trigger a new election; it may never conclude a decision.`)}

<h3>Quorums: the counting argument</h3>
<p>Every algorithm below rests on one property, and it is arithmetic rather than protocol design.</p>
${F(`if |A| + |B| > n  then  A ∩ B ≠ ∅

majority quorum:   q = ⌊n/2⌋ + 1
crash tolerance:   n = 2f + 1  tolerates f crashed nodes
Byzantine:         n = 3f + 1, quorum 2f + 1`)}
<p>Two majorities of the same set must share at least one member. That shared member is the entire mechanism: it is the node that was present for the earlier decision and is therefore able to tell the later proposer about it. Without intersection, two disjoint groups could each decide, and agreement would be lost — which is precisely what a split-brain is.</p>
<p>The Byzantine numbers are larger for two compounding reasons: <em>f</em> replies may be lies, and <em>f</em> more may be missing because those nodes are unreachable, so a quorum must be large enough that the honest, present majority still dominates. That is where 3f + 1 comes from, and it is why Byzantine tolerance costs more than a bigger cluster of the same kind.</p>
<p>Note what a quorum does <em>not</em> require: it does not need to be a majority, only to intersect the quorums it must intersect. That observation is what read and write quorums in module d4 exploit.</p>

<h3>Paxos, by what each phase solves</h3>
<p>Paxos is usually taught as a sequence of messages, which makes it hard to remember. Taught as two problems it becomes almost obvious. A proposer picks a <span class="term-def">ballot number</span>, unique to it and increasing.</p>
${F(`Phase 1  prepare(b) → a quorum
         promise(b, highest accepted proposal) ← quorum

Phase 2  accept(b, v) → a quorum,  where v is the value of the
         highest-numbered proposal any promise reported,
         or the proposer's own value if none reported any
         accepted(b, v) ← quorum   ⇒   v is chosen`)}
<p><span class="term-def">Phase 1 solves discovery.</span> Before proposing anything, the proposer must find out whether a value may already have been chosen — because if one was, agreement forbids choosing a different one. The promise does two jobs at once: it reports what the acceptor has accepted, and it binds the acceptor to refuse everything below <em>b</em> from now on, which shuts out older proposers that are still in flight.</p>
<p><span class="term-def">Phase 2 solves commitment</span> — but under a constraint that is the whole safety argument. The proposer is <em>not</em> free to propose its own value if any promise reported an accepted one; it must re-propose the highest-numbered of those. So a proposer that arrives late cannot overwrite a decision it did not witness; the quorum intersection guarantees it heard about it, and the rule forces it to carry that value forward.</p>
<p>One round of that per decision is two round trips, which is why nobody runs it as stated. <span class="term-def">Multi-Paxos</span> observes that phase 1 is per-<em>ballot</em>, not per-value: elect a stable leader once, and every subsequent command needs only phase 2 — one round trip. The leader is a performance optimisation, not a safety requirement. Paxos is safe with any number of duelling proposers; it merely fails to terminate while they duel, exactly as FLP predicts.</p>

<h3>Raft, by what each phase solves</h3>
<p>Raft makes the leader structural rather than optional, and names the pieces after what an operator sees. A <span class="term-def">term</span> is a ballot number; at most one leader is elected per term.</p>
<ul>
<li><span class="term-def">Election.</span> A follower that hears nothing becomes a candidate and asks for votes; a majority elects it. Randomised election timeouts solve a liveness problem, not a safety one: without them, symmetric candidates split the vote and re-split it, and the cluster livelocks. This is the randomisation escape from FLP, applied at exactly the point that needs it.</li>
<li><span class="term-def">The election restriction.</span> A voter refuses a candidate whose log is not at least as up to date as its own — compare the last entry's term first, then its index. This is Raft's substitute for Paxos's phase 1: rather than have the new leader collect and re-propose what might have been chosen, Raft simply refuses to elect anyone who is missing it. Quorum intersection is what makes that check sufficient.</li>
<li><span class="term-def">Log replication.</span> The leader appends a command and replicates it; the consistency check on <em>AppendEntries</em> — the previous entry's index and term must match — forces follower logs to agree with the leader's prefix, and the leader backs up until they do.</li>
<li><span class="term-def">Commitment.</span> An entry is committed once it is stored on a majority <em>and</em> the leader has committed at least one entry from its own term. That second clause looks arbitrary and is not: without it, a later leader can overwrite an entry that was replicated on a majority under an earlier term but never committed, and agreement breaks.</li>
</ul>
<p>Paxos and Raft make the same guarantees and pay the same round trips. They differ in where the complexity sits: Paxos permits any proposer and pushes the difficulty into reconstructing state per decision, Raft forbids all but one and pushes it into the election rules.</p>

<h3>Leader leases, and the clock creeping back in</h3>
<p>Consensus makes writes safe. Reads are where systems quietly cheat. A read served from the leader's local state is only linearizable if that node is <em>still</em> the leader at the moment it answers — and a leader that has been partitioned away has no way to know it has been replaced.</p>
<p>The correct fix costs a round trip: confirm leadership with a quorum before answering (the <em>ReadIndex</em> approach). The fast fix is a <span class="term-def">leader lease</span>: followers promise not to elect anyone else before time <em>T</em>, so until <em>T</em> the leader may answer locally. That trades a message round for a clock assumption, and module d2 already said what such an assumption is worth.</p>
${W(`A lease is only as good as the bound on clock error and on process pauses. A leader that is descheduled — garbage collection, live migration, a saturated host — can wake past its lease still believing it holds it, and serve a stale read while a new leader is already committing writes. Mitigations are to size the lease well inside the election timeout, to re-check a monotonic clock immediately before answering, and to prefer quorum reads wherever the latency can be afforded.`)}`,
 facts:[
 "FLP forbids a deterministic algorithm that terminates in every asynchronous execution with one possible crash. It does not forbid safety, and it does not forbid consensus in practice.",
 "Safety first is not a slogan but a design rule: agreement and validity hold unconditionally, termination is what you concede — so nothing's correctness may depend on a decision arriving by a deadline.",
 "Two quorums must intersect, and the shared member is the whole mechanism: it is what tells a later proposer about an earlier decision.",
 "n = 2f + 1 tolerates f crashes; Byzantine agreement needs n = 3f + 1 with quorums of 2f + 1, because f replies may be lies and f more may be absent.",
 "Paxos phase 1 discovers what may already have been chosen and locks out older ballots; phase 2 commits, but is forced to re-propose the highest accepted value it heard about.",
 "Raft's election restriction replaces Paxos phase 1: refusing to elect a candidate whose log is behind is equivalent to making the new leader recover what might have been chosen.",
 "A leader lease converts a round trip into a clock assumption, so a process pause longer than the lease can produce a stale read from a leader that has already been replaced."
 ]}

]}

];
