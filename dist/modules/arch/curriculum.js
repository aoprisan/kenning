import { F, W } from "../../helpers.js";
/**
 * Computer architecture curriculum. English, like the other technical
 * subjects, and for the same reason: the vocabulary is the manuals' and the
 * profilers'.
 *
 * The through-line is that a processor does not execute your program. It
 * executes a decoded, reordered, speculated, pipelined approximation of it,
 * and is required only to produce the answer your program would have. Speed
 * comes from exploiting that machinery; the surprises come from where the
 * pretence stops holding.
 *
 * Deliberately sited BENEATH the `os` subject rather than beside it. Where
 * `os` describes what software does about the hardware — page tables, the
 * language memory model, false sharing as a symptom — this describes the
 * mechanism underneath, and cross-references rather than repeats.
 */
export const levels = [
    { name: "Level 0 · The contract", mods: [
            { id: "a1", t: "The instruction set as an interface", calc: null,
                blurb: "An instruction set is a promise about results, not about how they are produced. Every technique in this subject exists in the gap between the two, and the gap is now enormous.",
                body: `
<h3>What the ISA actually promises</h3>
<p>An <span class="term-def">instruction set architecture</span> is the contract between whoever writes the bits and whoever builds the silicon. It specifies what the programmer can see: the registers, the instructions and their effects, the addressing modes, the memory model, how exceptions behave. It specifies nothing about how any of it is achieved.</p>
${F(`the ISA specifies          the implementation chooses

registers and their width  how many physical registers exist
what each instruction does how many cycles it takes
the memory ordering model  caches, buffers, prefetchers
exception behaviour        pipelines, speculation, reordering`)}
<p>That separation is the single most consequential idea in the field, because it lets the two sides move independently. Code compiled in 1995 for x86 runs on a processor built in 2025 whose internal organisation shares essentially nothing with the machine it was compiled for. Nothing else in computing has that property to the same degree.</p>
<p>It also sets up the rest of this subject. If the implementation may do anything that produces the specified results, then it will: it will decode one instruction into several, execute them out of order, run them before it knows whether they should run, and keep a hundred of them in flight. The programmer's model stays sequential. The machine has not been sequential for thirty years.</p>

<h3>RISC, CISC, and why the argument ended</h3>
<p>The 1980s argument was about how much each instruction should do.</p>
${F(`CISC   many instructions, variable length, operands in
       memory, some doing a great deal.
       Rationale: memory was expensive and compilers were
       poor, so density mattered and humans wrote assembly.

RISC   few instructions, fixed length, load/store only —
       arithmetic touches registers, never memory.
       Rationale: simple instructions pipeline cleanly, and
       compilers can be trusted to build the complex ones.`)}
<p>RISC won the technical argument and x86 won the market, and the resolution is that both happened. Since the mid-1990s an x86 processor <span class="term-def">decodes</span> its variable-length instructions into fixed-length internal operations — <span class="term-def">micro-operations</span> — and the machine behind the decoder is a RISC-style out-of-order core. The CISC instruction set survives as an encoding; the execution engine is not built along its lines.</p>
<p>So the distinction has largely dissolved, and what remains of it is real but narrow: x86's variable-length encoding makes decoding genuinely harder and costs power and silicon, which is why it keeps a µop cache to skip the decoder on hot loops. ARM and RISC-V decode more cheaply. That is a difference in the front end, not a difference in philosophy.</p>
<p>The one durable lesson is about where to spend complexity. RISC's claim was that simple, regular, exposed operations let the <em>compiler</em> and the <em>out-of-order engine</em> do the optimising, and that has been borne out — the parts of x86 that do a great deal in one instruction are mostly the parts nobody's compiler emits.</p>

<h3>What the machine actually holds</h3>
<p>Three things distinguish the ISA's visible state, and the distinction matters for the next several modules:</p>
<ul>
<li><span class="term-def">Architectural registers</span> — the ones the ISA names. x86-64 has 16 general-purpose; AArch64 has 31. This is a property of the encoding: more names need more bits in every instruction.</li>
<li><span class="term-def">Physical registers</span> — what the hardware actually has, which is far more: hundreds. Register renaming (a5) maps the small named set onto the large real one, and that mapping is where a great deal of the performance comes from.</li>
<li><span class="term-def">Architectural state</span> — the registers plus memory as the ISA says they are at any instruction boundary. The machine must be able to produce this on demand, which is precisely what makes speculation safe and what makes precise exceptions possible.</li>
</ul>
<p>The number of architectural registers is one of the few places the ISA choice still shows up in performance. Sixteen names is tight; a compiler running out of them must <span class="term-def">spill</span> values to the stack, and while the store and reload usually hit L1, they consume issue slots and add latency to dependency chains. AArch64's 31 is one reason the same code often needs fewer instructions there.</p>

<h3>Encoding, and why it is not a detail</h3>
<p>Instructions are bits, and how they are packed has consequences that reach all the way to the cache:</p>
${F(`fixed length     ARM64, RISC-V: every instruction 4 bytes.
                 Decode several in parallel trivially — the
                 boundaries are known before you look.

variable length  x86: 1 to 15 bytes. You cannot know where
                 the second instruction starts until you
                 have decoded the first, so parallel decode
                 needs guesswork and correction.`)}
<p>Denser code fits in the instruction cache, and instruction cache misses are a real cost in large programs — one reason RISC-V has a compressed 16-bit extension and ARM had Thumb. This is the same tension as everywhere else in the subject: density against decode simplicity, with the right answer depending on whether you are more often short of cache or short of decode bandwidth.</p>

<h3>The programmer's model is a fiction, and a useful one</h3>
<p>Everything above amounts to one claim worth stating plainly, because the rest of this subject is its consequences:</p>
${W(`Your program specifies a sequence of instructions executed one at a time, each finishing before the next begins. The processor does not do this. It fetches ahead, predicts branches it has not resolved, executes instructions whose inputs are ready regardless of program order, performs work it may have to discard, and commits results in order only at the very end. It is required to produce the answer the sequential model would have produced — and, as module a13 shows, that requirement covers the <em>results</em> and not the <em>side effects</em>, which is where a decade of security research lives.`)}
<p>Two practical corollaries follow immediately, and they explain most surprising measurements:</p>
<ul>
<li><span class="term-def">Instruction count is a poor predictor of time.</span> Two sequences with the same number of instructions can differ by an order of magnitude depending on their dependencies, their branches and their memory access pattern. "Fewer instructions" is not an optimisation argument on its own.</li>
<li><span class="term-def">The relevant unit is the cycle, and the relevant ratio is IPC</span> — instructions per cycle. A modern core can retire several per cycle when everything goes well and a small fraction of one when it does not, and finding out which is happening is the whole of module a12.</li>
</ul>`,
                facts: [
                    "An ISA specifies visible results — registers, instruction effects, memory ordering, exceptions — and specifies nothing about how they are produced.",
                    "That separation is what lets code compiled in 1995 run on a processor from 2025 whose internal organisation shares nothing with the original machine.",
                    "The RISC/CISC argument dissolved: x86 decodes variable-length instructions into fixed-length micro-operations and runs a RISC-style out-of-order core behind them.",
                    "What remains of the distinction is a front-end cost — variable-length decode is harder and hungrier, which is why x86 keeps a µop cache for hot loops.",
                    "Architectural registers are the names the ISA gives (16 on x86-64, 31 on AArch64); physical registers number in the hundreds, and renaming maps one onto the other.",
                    "Too few architectural names forces spilling to the stack, which usually hits L1 but still consumes issue slots and lengthens dependency chains.",
                    "Fixed-length encoding makes parallel decode trivial; variable-length gives denser code and so fewer instruction-cache misses. Both are real, and which wins depends on the workload.",
                    "The sequential programmer's model is a fiction the hardware maintains for results only — not for timing, and not for side effects.",
                    "Instruction count is a poor predictor of time. The unit is the cycle and the ratio is IPC, which can vary by an order of magnitude for the same instruction count."
                ] },
            { id: "a2", t: "How the machine represents numbers", calc: "float",
                blurb: "Integers wrap, floats round, and both do it in ways that are fully specified and routinely surprising. Almost every numerical bug in production is one of a small number of consequences of these two facts.",
                body: `
<h3>Two's complement</h3>
<p>Signed integers are stored so that the same adder works for both signs: negate by inverting the bits and adding one.</p>
${F(`8-bit two's complement

  0000 0000 =    0
  0111 1111 =  127   ← largest positive
  1000 0000 = −128   ← most negative
  1111 1111 =   −1

range: −2ⁿ⁻¹ … 2ⁿ⁻¹ − 1     asymmetric by one`)}
<p>The asymmetry is the source of a whole family of bugs. There are as many negative values as positive ones plus zero, so <em>the most negative value has no positive counterpart</em>. Negating <code>INT_MIN</code> overflows. So does taking its absolute value. So does dividing it by −1, which on x86 raises a hardware exception and crashes the process — a division that traps without a zero divisor anywhere in sight.</p>

<h3>Overflow, and the difference between wrapping and undefined</h3>
<p>This distinction gets people who believe they have already understood it:</p>
${F(`unsigned overflow    DEFINED: wraps modulo 2ⁿ.
                     0u − 1u == UINT_MAX, reliably.

signed overflow      UNDEFINED BEHAVIOUR in C and C++.
                     Not "it wraps" — the compiler is
                     entitled to assume it cannot happen.`)}
<p>The compiler acts on that assumption, which is what makes it more than pedantry. Given <code>if (x + 1 &lt; x)</code> with signed <code>x</code>, the compiler may reason that signed overflow does not occur, therefore <code>x + 1</code> is always greater than <code>x</code>, therefore the condition is false, therefore the check can be deleted. The overflow check is removed <em>because</em> it checks for overflow. This has produced real vulnerabilities, and it is why the correct way to check is to test the operands before the operation, or to use the compiler's checked-arithmetic builtins.</p>
<p>Two more integer hazards worth carrying:</p>
<ul>
<li><span class="term-def">Implicit conversion.</span> Comparing a signed and an unsigned value of the same rank converts the signed one to unsigned, so <code>-1 &lt; 1u</code> is false. This is why comparing a signed loop counter against an unsigned <code>size()</code> is a persistent source of bugs.</li>
<li><span class="term-def">Shifts.</span> Shifting by an amount greater than or equal to the width is undefined, and hardware genuinely differs — x86 masks the count to 5 or 6 bits, so <code>x &lt;&lt; 32</code> may compile to <code>x &lt;&lt; 0</code> and leave the value unchanged.</li>
</ul>

<h3>IEEE 754</h3>
<p>Floating point stores a sign, a biased exponent and a fraction, giving a value of roughly <em>±1.f × 2^(e−bias)</em>.</p>
${F(`binary32 (float)     1 sign │  8 exponent │ 23 fraction
                     bias 127,  ~7 decimal digits

binary64 (double)    1 sign │ 11 exponent │ 52 fraction
                     bias 1023, ~15–17 decimal digits

special encodings
  exponent all zeros   zero, and subnormals
  exponent all ones    infinity (fraction 0), NaN (otherwise)`)}
<p>The leading 1 is implicit and not stored, which buys one extra bit of precision for free — and that is why the all-zero exponent has to be special-cased for values near zero. Those are the <span class="term-def">subnormals</span>, which extend the range downward gradually rather than dropping straight to zero, and which on many processors are handled by a slow path that can cost dramatically more than a normal operation. Numerical code sometimes sets flush-to-zero for exactly this reason.</p>

<h3>Why 0.1 + 0.2 is not 0.3</h3>
<p>This is not a hardware defect and not a rounding-error-in-the-abstract; it is a base conversion.</p>
<p>A binary fraction can represent exactly those values whose denominator is a power of two. One tenth is not one of them, so <code>0.1</code> in binary is a repeating expansion, truncated to 53 significant bits. The stored value is very slightly more than a tenth. The same happens to <code>0.2</code>. Their sum rounds to a value that is not the nearest double to <code>0.3</code>, and the comparison fails.</p>
${F(`0.1  stored as  0.1000000000000000055511151231257827…
0.2  stored as  0.2000000000000000111022302462515654…
sum             0.3000000000000000444089209850062616…
0.3  stored as  0.2999999999999999888977697537484346…`)}
<p>The consequences are practical rather than philosophical. Never compare floats with <code>==</code>; compare against a tolerance appropriate to the magnitudes involved, which usually means a relative tolerance rather than a fixed epsilon. And <strong>never use floating point for money.</strong> Use integer minor units, or a decimal type. A currency amount is exact by definition, and binary floating point cannot represent most exact decimal amounts at all.</p>

<h3>The property that blocks the compiler</h3>
<p>Floating-point addition is commutative and <strong>not associative</strong>, because each intermediate result is rounded:</p>
${F(`(1e20 + −1e20) + 1.0  =  0.0 + 1.0  =  1.0
1e20 + (−1e20 + 1.0)  =  1e20 + −1e20 =  0.0`)}
<p>This is the mechanism behind <span class="term-def">catastrophic cancellation</span> — subtracting two nearly equal quantities annihilates the leading digits and promotes rounding error into the significant ones — and it is why summing a large array in a different order gives a different answer, with the pairwise or compensated (Kahan) summation being genuinely more accurate rather than merely different.</p>
<p>It also has a consequence that reaches into module a9. Vectorising a reduction means reassociating it: four partial sums combined at the end is not the same expression as one sequential sum. So a compiler <em>may not</em> auto-vectorise a floating-point reduction under the standard rules, and this is one of the most common reasons a loop that looks obviously vectorisable is not. <code>-ffast-math</code> grants permission to reassociate, along with permission to assume no NaNs and no infinities — which is a real correctness change and not a free speed switch.</p>

<h3>NaN, and why it is not like other values</h3>
<p>Not-a-number is produced by 0/0, ∞−∞, the square root of a negative, and propagates through everything it touches. Its defining property breaks the assumptions of a great deal of ordinary code:</p>
${F(`NaN == NaN     is FALSE
NaN != NaN     is TRUE   ← the standard idiom for testing
NaN < x, NaN > x, NaN == x   all FALSE for any x`)}
<p>So NaN is unordered with respect to everything, including itself. A sort comparator that receives one violates the strict weak ordering the sort requires and can read out of bounds; a min/max reduction can silently return the wrong element depending on the argument order; a hash set can contain a value it cannot find. The propagation is the useful part — a NaN in the output tells you something went wrong upstream — and the comparison behaviour is what has to be handled deliberately.</p>
<p>The calculator takes a decimal value apart into its sign, exponent and fraction, and shows the exact stored value against what was typed.</p>`,
                facts: [
                    "Two's complement is asymmetric by one, so the most negative value has no positive counterpart — negating, abs-ing or dividing INT_MIN by −1 all overflow, and the last traps on x86.",
                    "Unsigned overflow is defined and wraps; signed overflow is undefined behaviour, and the compiler deletes overflow checks precisely because it may assume they cannot fire.",
                    "Comparing signed with unsigned converts the signed operand, so −1 < 1u is false — the classic loop-counter-against-size() bug.",
                    "IEEE 754 stores a sign, a biased exponent and a fraction with an implicit leading 1; all-zero and all-ones exponents encode zero/subnormals and infinity/NaN.",
                    "Subnormals extend range gradually near zero and are handled by a slow path on many processors, which is why numerical code sometimes enables flush-to-zero.",
                    "0.1 is not representable in binary, so 0.1 + 0.2 is not 0.3. Compare with a relative tolerance, and never use floating point for money.",
                    "Floating-point addition is not associative, which is why summation order changes the answer and why compensated summation is genuinely more accurate.",
                    "Non-associativity is what blocks auto-vectorisation of floating-point reductions: -ffast-math grants permission to reassociate and is a correctness change, not a free switch.",
                    "NaN is unordered with respect to everything including itself, which breaks sort comparators, min/max reductions and hash lookups unless handled deliberately."
                ] }
        ] },
    { name: "Level 1 · Making one instruction stream fast", mods: [
            { id: "a3", t: "Pipelining", calc: "pipe",
                blurb: "The first and most durable trick: overlap the stages of consecutive instructions so one finishes every cycle, even though each still takes several. Everything that makes it hard has a name, and the names are worth knowing.",
                body: `
<h3>Throughput, not latency</h3>
<p>Executing an instruction takes several distinct steps, and in an unpipelined machine the next instruction waits for all of them.</p>
${F(`the classic five stages

IF   fetch the instruction from memory
ID   decode it and read its register operands
EX   execute — the arithmetic, or an address calculation
MEM  access memory, for loads and stores
WB   write the result back to a register`)}
<p>Each stage uses different hardware, so all five can be busy at once on five different instructions. The individual instruction still takes five cycles from start to finish; one <em>completes</em> every cycle.</p>
${F(`unpipelined      pipelined
 A A A A A         A A A A A
           B B B B B  B B B B B
                     C C C C C
                       D D D D D

5 cycles each,   5 cycles latency each,
5 apart          1 per cycle throughput`)}
<p>This is the distinction that governs the rest of the subject: <span class="term-def">latency</span> is how long one operation takes, <span class="term-def">throughput</span> is how many complete per unit time, and pipelining improves the second while slightly worsening the first — the pipeline registers between stages add real delay. It is a laundry argument: one load still takes wash-dry-fold, and you finish a load every dryer-cycle instead of every three.</p>
<p>Because the clock must accommodate the slowest stage, deeper pipelines allow higher clocks. That was the logic that took pipelines from five stages to twenty and pushed frequencies up through the 1990s, and it is also what set the trap that module a11 describes: the deeper the pipeline, the more work is thrown away by a mispredicted branch.</p>

<h3>The three hazards</h3>
<p>Overlapping only works when the overlapped instructions do not need each other. Three ways that fails, and they are exhaustive:</p>
<p><span class="term-def">Structural hazard</span> — two instructions want the same hardware in the same cycle. Historically a single memory port serving both fetch and load; solved by duplicating the resource, which is why instruction and data caches are separate (a6).</p>
<p><span class="term-def">Data hazard</span> — an instruction needs a result that is not ready.</p>
${F(`RAW  read after write   a genuine dependency.
                        add r1, r2, r3
                        sub r4, r1, r5    ← needs r1

WAR  write after read   a NAME conflict, not a real one
WAW  write after write   — same, removed by renaming (a5)`)}
<p>Only RAW is a true dependency: information genuinely has to flow. WAR and WAW exist because the ISA has few register names (a1) and two unrelated computations were assigned the same one — which is exactly what register renaming eliminates.</p>
<p><span class="term-def">Control hazard</span> — a branch is fetched, and the next instruction's address is not known until it resolves. The pipeline either stalls or guesses, and guessing is module a4.</p>

<h3>Forwarding, and the one stall it cannot remove</h3>
<p>The naive fix for RAW is to stall until the result is written back. The better fix is to notice that the result exists in the EX stage's output long before it reaches the register file, and to route it directly to where it is needed:</p>
${F(`without forwarding          with forwarding

add  IF ID EX ME WB         add  IF ID EX ME WB
sub     IF ID -- -- EX          sub     IF ID EX ME WB
           two stalls                    ↑ EX output fed
                                           straight to EX`)}
<p><span class="term-def">Forwarding</span> (or bypassing) removes almost every arithmetic RAW stall. One case survives it, and it is the one worth knowing by name: the <span class="term-def">load-use hazard</span>. A load produces its value in MEM, not EX, so an instruction immediately consuming a loaded value is one cycle too early no matter how the wires are arranged. Classically the compiler fills that slot with an unrelated instruction; on an out-of-order machine (a5) the scheduler does it dynamically.</p>

<h3>What it costs when the guess is wrong</h3>
<p>A pipeline holds partially executed instructions. When a branch resolves the wrong way, every instruction fetched after it must be discarded — a <span class="term-def">pipeline flush</span> — and the pipeline refills from the correct address.</p>
${F(`flush cost ≈ pipeline depth

5-stage classic RISC       ~3 cycles
modern deep OoO core       ~15–20 cycles`)}
<p>That number is why module a4 exists at all. At fifteen to twenty cycles, and a core capable of retiring several instructions per cycle, a single mispredict discards the equivalent of dozens of instructions' worth of work — which is why branch prediction accuracy above 99% is not a luxury but a requirement for the design to make sense.</p>
<p>It is also the trap in deep pipelines. A deeper pipeline permits a higher clock <em>and</em> raises the misprediction penalty in cycles, so the two effects fight. The Pentium 4's NetBurst architecture pushed to around thirty stages chasing clock frequency and was beaten in real work by shorter-pipeline designs at lower clocks — one of the clearest cases in the field of a single metric being optimised past the point where it predicts performance.</p>

<h3>CPI, and the arithmetic of the whole thing</h3>
<p>The standard accounting is worth being able to reproduce, because it is what a profiler is implicitly reporting:</p>
${F(`time = instructions × CPI × cycle time

CPI = cycles per instruction
      ideal pipelined CPI is 1
      superscalar (a5) can go BELOW 1
      IPC = 1 / CPI, and is what tools report

CPI_actual = CPI_ideal + stalls per instruction`)}
<p>Three terms, three independent levers, and they interact: a compiler that reduces instruction count by emitting harder-to-predict code can raise CPI enough to lose. A deeper pipeline reduces cycle time and raises CPI. This is why single-metric optimisation — fewer instructions, higher clock — so reliably misleads, and why the calculator here takes all three.</p>`,
                facts: [
                    "Pipelining improves throughput, not latency: an instruction still takes all its stages, but one completes per cycle.",
                    "The pipeline registers between stages add real delay, so a pipelined instruction is slightly slower end-to-end than an unpipelined one.",
                    "The three hazards are exhaustive: structural (same hardware), data (a needed result is not ready) and control (the next address is unknown).",
                    "Only RAW is a true dependency. WAR and WAW are name conflicts caused by having few architectural registers, and renaming removes them entirely.",
                    "Forwarding routes a result from where it is produced to where it is needed, eliminating almost every arithmetic RAW stall.",
                    "The load-use hazard survives forwarding, because a load produces its value one stage later than arithmetic does.",
                    "A mispredicted branch flushes the pipeline, costing roughly its depth — about 15–20 cycles on a modern core, which is dozens of instructions' worth of work.",
                    "Deeper pipelines allow higher clocks and raise the misprediction penalty, and NetBurst is the standing example of pushing that trade too far.",
                    "time = instructions × CPI × cycle time. Three independent levers that interact, which is why optimising any one alone misleads."
                ] },
            { id: "a4", t: "Branches and speculation", calc: "branch",
                blurb: "Roughly one instruction in five is a branch, and the machine must decide what to fetch before it knows the answer. So it guesses — extremely well — and the cost of the rare wrong guess shapes how fast code runs.",
                body: `
<h3>Why guessing is compulsory</h3>
<p>A branch's outcome is known when it executes, and the fetch stage needs the next address immediately. On a deep pipeline that is a gap of a dozen cycles or more. Waiting means a bubble on every branch, and with a branch every five or six instructions the machine would spend most of its life empty.</p>
<p>So the front end predicts, fetches down the predicted path, and executes speculatively. If the prediction was right, nothing was lost. If it was wrong, the speculative work is discarded and the pipeline refills. The whole design rests on being right almost always, and the arithmetic is brutal:</p>
${F(`penalty 18 cycles, branch every 5 instructions,
overhead shown against an ideal of ONE instruction/cycle

99% accurate   0.01 × 18 = 0.18 cycles per branch
               ≈ 3.6% overhead
95% accurate   0.05 × 18 = 0.90 cycles per branch
               ≈ 18% overhead
50% accurate   0.50 × 18 = 9.0 cycles per branch
               the machine is mostly refilling`)}
<p>That is why "97% accurate" is a bad predictor rather than a good one, and why predictor design absorbs a serious fraction of a core's transistor budget.</p>
<p>And the figures above are the optimistic reading, because they charge the waste against one instruction per cycle. On a core that retires three or four, the same wasted cycles displace three or four times as much work, so the relative cost is <em>larger</em> on a wider machine — which is the calculator's default and the reason a mispredict hurts more on a fast core than on a slow one.</p>

<h3>How predictors got good</h3>
<p>The progression is worth following, because each step fixes a specific failure of the last:</p>
<ul>
<li><span class="term-def">Static.</span> Always predict taken, or use the direction — backward taken, forward not taken — which encodes the observation that backward branches are usually loops. Roughly 60–70% accurate, and requires no state.</li>
<li><span class="term-def">Bimodal.</span> A table of two-bit saturating counters indexed by branch address. Two bits rather than one so that a single anomalous outcome does not flip the prediction — a loop's final exit does not mispredict the next entry. Around 90%.</li>
<li><span class="term-def">Two-level / gshare.</span> Index the table with the branch address combined with a <span class="term-def">global history register</span> of recent outcomes. This is the key idea: branches correlate. <code>if (x &gt; 0)</code> followed by <code>if (x &gt; 10)</code> are not independent, and history captures that. Mid-90s.</li>
<li><span class="term-def">TAGE and neural predictors.</span> Several tables indexed with different history lengths, tagged so the longest matching history wins, plus perceptron-style predictors that learn weights over history bits. This is what modern cores run, and it reaches well above 99% on ordinary code.</li>
</ul>
<p>Direction is only half the problem. A taken branch also needs a <em>target</em>, supplied by the <span class="term-def">branch target buffer</span> — and an indirect branch, whose target is computed, is far harder: a virtual call site with many receiver types, or a bytecode interpreter's dispatch, can miss constantly. That is why devirtualisation, and interpreter techniques that give each opcode its own dispatch site, produce large speedups that have nothing to do with instruction count.</p>
<p>Returns get their own mechanism, a <span class="term-def">return address stack</span>, which predicts near-perfectly because calls and returns nest — and which is corrupted by anything that breaks the pairing, such as a hand-written stack switch or a setjmp.</p>

<h3>What predictors cannot do</h3>
<p>The one thing to internalise: <strong>predictors learn patterns, and data-dependent branches on unpredictable data have no pattern to learn.</strong> A comparison against random values is a coin flip at any history length.</p>
<p>Which produces the famous result that sorting an array first makes a subsequent filtering loop several times faster, with the same instruction count and the same memory traffic. Sorted data makes the branch predictable — a long run of taken, then a long run of not-taken — and the mispredictions disappear. Nothing about the arithmetic changed.</p>
${W(`This is also why microbenchmarks mislead so reliably. A benchmark loop with fixed inputs trains the predictor perfectly, and reports a number the same code will not achieve on varied production data. If the branch depends on input, the benchmark must vary the input the way production does, or it is measuring the predictor rather than the code.`)}

<h3>Branchless code</h3>
<p>Where a branch cannot be predicted, it can sometimes be removed. A <span class="term-def">conditional move</span> computes both sides and selects, so there is no control flow to mispredict:</p>
${F(`branchy      if (a > b) m = a; else m = b;
             unpredictable ⇒ ~18 cycles when wrong

branchless   m = (a > b) ? a : b;   → cmov
             always ~1–2 cycles, and always pays for
             both sides`)}
<p>The trade is explicit: branchless has a fixed cost, branchy has a low cost when predicted and a high one when not. So a branch predicted at 99% should stay a branch, and one at 50% should not. Compilers make this choice with heuristics and frequently get it wrong in both directions, which is why profile-guided optimisation helps here more than almost anywhere else.</p>
<p>Two adjacent techniques worth naming. <span class="term-def">Predication</span> generalises conditional move: ARM's traditional conditional execution and AVX-512's masks let whole operations be nullified rather than jumped over, which is what makes vectorising a loop with an <code>if</code> possible at all (a9). And in cryptography, branchless is not a performance technique but a correctness one — a branch on secret data leaks it through timing, which is why constant-time code is written this way regardless of speed.</p>

<h3>Speculation is not free of consequences</h3>
<p>Discarded work leaves no architectural trace: registers and memory are as if it never happened, which is what makes speculation safe by the a1 contract. It does leave a <em>microarchitectural</em> trace — a line pulled into the cache by a load that was later squashed stays in the cache.</p>
<p>For thirty years that was considered a performance detail. Module a13 is what happened when someone noticed it was a channel.</p>`,
                facts: [
                    "Roughly one instruction in five is a branch, and the fetch stage needs the next address a dozen cycles before the branch resolves — so prediction is compulsory, not an optimisation.",
                    "At an 18-cycle penalty and a branch every 5 instructions, 95% accuracy costs about 18% overhead. This is why 99% is the working requirement.",
                    "Bimodal predictors use two-bit saturating counters so one anomalous outcome does not flip the prediction — a loop's final exit does not mispredict the next entry.",
                    "The key idea in modern prediction is that branches correlate, so the table is indexed by address combined with a global history of recent outcomes.",
                    "Indirect branches need a predicted target, not just a direction, which is why polymorphic call sites and interpreter dispatch mispredict heavily and why devirtualisation pays.",
                    "Returns are predicted by a return address stack that is near-perfect because calls nest — and is corrupted by anything breaking the pairing.",
                    "Predictors learn patterns, so a branch on unpredictable data cannot be predicted at any history length. Sorting an array first can multiply the speed of a filtering loop with identical instruction count.",
                    "Microbenchmarks with fixed inputs train the predictor perfectly and report numbers production will not see.",
                    "Branchless code has a fixed cost and always computes both sides, so it wins only where prediction fails — and in cryptography it is a correctness requirement rather than an optimisation.",
                    "Squashed speculative work leaves no architectural trace but does leave microarchitectural state, such as a cache line, which is the basis of module a13."
                ] },
            { id: "a5", t: "Out-of-order and superscalar execution", calc: null,
                blurb: "The machine issues several instructions per cycle, executes them in whatever order their inputs become ready, and commits them in program order so that nobody can tell. Understanding which order matters is most of performance analysis.",
                body: `
<h3>Two independent multipliers</h3>
<p>Pipelining gets one instruction per cycle. Going faster needs two further ideas, and they are separable:</p>
${F(`superscalar    fetch, decode and issue SEVERAL
               instructions per cycle. Needs multiple
               execution units. Modern cores are roughly
               4–6 wide at the front end.

out-of-order   execute an instruction as soon as ITS
               operands are ready, regardless of program
               order. Needs a window of pending work to
               choose from — over a hundred instructions
               on a current core.`)}
<p>Either alone is limited. A wide in-order machine stalls the moment the oldest instruction stalls, taking the whole width down with it. An out-of-order machine one instruction wide can reorder but not overlap. Together they let a core sustain several instructions per cycle across a stall that would otherwise halt everything — which is precisely what happens on every cache miss (a6).</p>

<h3>Register renaming</h3>
<p>The obstacle is the one a3 named: WAR and WAW hazards are not real dependencies, they are name collisions caused by an ISA with sixteen register names.</p>
${F(`   mul  r1, r2, r3      ← long latency
   add  r4, r1, r5       RAW on r1 — genuine
   mov  r1, 0            WAW on r1 — a NAME collision
   sub  r6, r1, r7       RAW on the NEW r1

renamed onto physical registers:

   mul  p10, p2, p3
   add  p11, p10, p5     still waits — genuine
   mov  p12, 0           independent, runs NOW
   sub  p13, p12, p7     independent, runs NOW`)}
<p>Renaming maps each architectural name to a fresh physical register on every write, so the only dependencies left are the true ones. This is why the physical register file has hundreds of entries against sixteen names, and it is what makes a large out-of-order window useful — without it, the window would fill with false conflicts.</p>

<h3>The reorder buffer, and why the illusion holds</h3>
<p>Instructions may execute in any order; they may not <em>commit</em> in any order. The <span class="term-def">reorder buffer</span> holds every in-flight instruction in program order, and results become architecturally visible only when an instruction retires from its head, after everything older has retired.</p>
<p>That single rule buys three things at once:</p>
<ul>
<li><span class="term-def">Precise exceptions.</span> A fault is recorded in the ROB entry and raised at retirement, so the architectural state is exactly as if execution had stopped there. Without it, a page fault (see the <code>os</code> subject) would be unrecoverable, because dozens of later instructions would already have modified state.</li>
<li><span class="term-def">Speculation recovery.</span> A mispredicted branch discards the ROB entries behind it, and no wrong-path instruction ever retires.</li>
<li><span class="term-def">The a1 contract.</span> The sequential model is maintained at retirement, and only at retirement.</li>
</ul>
<p>The ROB is also a hard resource. If the oldest instruction cannot retire — waiting on a cache miss to DRAM, several hundred cycles — every younger completed instruction must wait too, and once the ROB fills the front end stalls entirely. This is why a single long-latency miss can stop a core that has plenty of independent work available: not because the work cannot execute, but because it cannot <em>retire</em>.</p>

<h3>Latency, throughput, and dependency chains</h3>
<p>Each execution unit has two numbers, and confusing them is the most common error in reading an instruction table:</p>
${F(`                    latency   throughput (per cycle)
integer add            1            3–4
integer multiply       3            1
FP add / multiply      4            2
FP divide            ~14           ~1 per 4 cycles
L1 load                4–5          2`)}
<p><span class="term-def">Latency</span> matters when the next operation needs this result. <span class="term-def">Throughput</span> matters when it does not. So the same instruction costs four cycles or a quarter of one depending entirely on the surrounding code:</p>
${F(`chain    x = ((((a*b)*c)*d)*e)     each waits for the last
         5 multiplies × 4 cycles ≈ 20 cycles

split    x = (a*b)*(c*d) … e        independent pairs
         same 5 multiplies ≈ 8 cycles`)}
<p>Which is the single most useful optimisation idea in this level: <strong>the limit is usually the longest dependency chain, not the instruction count.</strong> Breaking a reduction into four independent accumulators and combining at the end is the standard technique, and it is why that transformation speeds up a sum by nearly four times while doing slightly more work. (For floating point it also changes the answer, per a2 — which is exactly why the compiler will not do it for you unaided.)</p>

<h3>Reading a stall</h3>
<p>A core is limited by one of a small number of things, and they call for different responses:</p>
${F(`front-end bound    cannot fetch or decode fast enough —
                   i-cache misses, branch mispredicts,
                   poor code layout

back-end bound     execution cannot keep up —
                   core bound: a unit or a dependency chain
                   memory bound: waiting on cache/DRAM (a6)

bad speculation    work done and discarded (a4)

retiring           actually making progress`)}
<p>This is the <span class="term-def">top-down</span> methodology, and it is implemented directly in the performance counters of current processors. It matters because the responses are opposite: memory-bound code wants a better access pattern (a7), core-bound code wants shorter dependency chains or wider SIMD (a9), front-end-bound code wants smaller hot loops and better layout, and bad speculation wants the branch work of a4. Guessing which one you have, rather than measuring it, is how optimisation effort gets spent in the wrong place.</p>`,
                facts: [
                    "Superscalar issue and out-of-order execution are separable ideas, and each is limited alone: a wide in-order machine stalls entirely on its oldest instruction.",
                    "Register renaming maps every architectural write to a fresh physical register, so WAR and WAW disappear and only true dependencies remain.",
                    "That is why there are hundreds of physical registers behind sixteen names — without renaming, a large instruction window would fill with false conflicts.",
                    "The reorder buffer retires in program order, which is what gives precise exceptions, speculation recovery and the sequential contract, all from one rule.",
                    "A long-latency miss at the head of the ROB stops retirement, so the buffer fills and the front end stalls even though independent work is available and executing.",
                    "Every instruction has both a latency and a throughput, and which one applies depends entirely on whether the next operation needs the result.",
                    "The limit is usually the longest dependency chain, not the instruction count — splitting a reduction into independent accumulators can nearly quadruple its speed while doing more work.",
                    "The compiler will not split a floating-point reduction for you, because reassociation changes the answer.",
                    "Top-down analysis separates front-end bound, back-end bound, bad speculation and retiring — and the four have opposite remedies, so measuring beats guessing."
                ] }
        ] },
    { name: "Level 2 · Feeding it", mods: [
            { id: "a6", t: "Caches", calc: "cache",
                blurb: "A processor can execute several instructions per cycle and DRAM answers in a couple of hundred. Caches close that gap, and how they are organised decides which access patterns are fast and which are catastrophic.",
                body: `
<h3>The gap, and why a cache can close it</h3>
<p>Processor speed and memory latency diverged for decades: cores got dramatically faster while DRAM latency barely moved. A main-memory access is on the order of 200–300 cycles, and a core that can retire four instructions per cycle has roughly a thousand instruction slots to fill while it waits.</p>
<p>A cache works only because programs are not random. Two forms of <span class="term-def">locality</span> do all the work:</p>
${F(`temporal   a location used now is likely to be used again
           soon — loop counters, hot objects, the stack top

spatial    a location near one just used is likely to be
           used soon — array traversal, struct fields,
           sequential code`)}
<p>Temporal locality justifies keeping recent data. Spatial locality justifies fetching in <span class="term-def">cache lines</span> — 64 bytes on essentially every current x86 and ARM machine — rather than in words. That granularity is not a detail: it means touching one byte costs the same as touching all 64, which is why an array of structs and a struct of arrays can differ by a factor of ten on the same algorithm.</p>

<h3>Where a line can go</h3>
<p>The organisation is a single decision — how many places may hold a given address — and everything else follows from it.</p>
${F(`direct mapped     exactly one possible slot per address.
                  Cheap and fast; two hot addresses that map
                  to the same slot evict each other forever.

fully associative any line anywhere. No conflicts, and a
                  comparison against every entry. Only
                  practical for tiny structures like a TLB.

N-way set assoc.  the address selects a SET; the line may go
                  in any of N ways within it. The compromise
                  everything actually uses: 8-way L1 is
                  typical.`)}
<p>The address is split accordingly, and being able to do this split is what the calculator is for:</p>
${F(` ┌──────── tag ────────┬── index ──┬── offset ──┐

offset  which byte within the line   log2(line size)
index   which set                    log2(number of sets)
tag     the rest — stored, and compared on lookup

sets = cache size / (line size × associativity)`)}
<p>Note what is <em>not</em> stored: the index bits. They are implied by which set the line sits in, which is why a cache stores less tag than address.</p>

<h3>The three Cs</h3>
<p>Hill's classification, and the reason it is useful is that each C has a different fix:</p>
<ul>
<li><span class="term-def">Compulsory</span> — the first reference to a line. Unavoidable by caching; reduced only by prefetching (a7) or by touching less data.</li>
<li><span class="term-def">Capacity</span> — the working set exceeds the cache. Fixed by making the working set smaller: blocking, tiling, smaller data types, better packing.</li>
<li><span class="term-def">Conflict</span> — the line was evicted by another line mapping to the same set, while other sets sat idle. Fixed by associativity, or by changing the addresses.</li>
</ul>
<p>A fourth is usually added for multicore: <span class="term-def">coherence</span> misses, where a line was invalidated by another core's write (a8).</p>
<p>Conflict misses produce the sharpest pathology in this module, because the trigger is a power of two. Walking an array with a stride that is a large power of two makes every access land in the same few sets, so a multi-megabyte cache behaves like an eight-entry one:</p>
${F(`float A[1024][1024];
for (i…) sum += A[i][0];        stride 4096 bytes

with 64-byte lines and 64 sets, every one of these
addresses has the same index ⇒ all 1024 accesses
compete for ONE set of 8 ways`)}
<p>This is why matrix code so often pads a dimension by one element — <code>[1024][1025]</code> — which looks like a mistake and breaks the alignment that was causing the conflicts. It is also why "round the buffer size up to a power of two" is such a reliable way to make a program slower.</p>

<h3>Writes</h3>
<p>Two independent choices, and the answers are near-universal in one direction:</p>
${F(`write-through   write to cache AND the next level.
                simple, and generates constant traffic.
write-back      write only to the cache; mark the line
                dirty; write it out on eviction. What
                every modern data cache does.

write-allocate      a write miss fetches the line first
no-write-allocate   a write miss goes straight through`)}
<p>Write-back plus write-allocate is standard, and write-allocate is the one with a surprising consequence: <strong>writing to memory you never read still reads it.</strong> Filling a large buffer pulls every line in from DRAM only to overwrite it entirely, doubling the memory traffic for no benefit. That is what non-temporal stores exist to avoid, and it is one of the few places a specialised instruction is worth reaching for (a7).</p>

<h3>The hierarchy</h3>
${F(`         typical size   latency    shared?
L1d        32–48 KB       ~4–5 cyc   per core
L1i        32–64 KB       ~4–5 cyc   per core
L2        0.5–2 MB      ~12–20 cyc   per core
L3          8–64 MB      ~40–60 cyc  across cores
DRAM             —      ~200–300 cyc  all`)}
<p>Each level is bigger and slower, and the ratios are what matter rather than the figures. Two structural points that show up in measurements:</p>
<ul>
<li>L1 is split into instruction and data caches — a structural hazard fix from a3 — while lower levels are unified.</li>
<li>The L3 is shared, which makes it the place where cores interfere with each other. A co-tenant evicting your working set from L3 is the mechanism behind the noisy-neighbour effect that the <code>os</code> subject describes from the other side.</li>
</ul>
<p>L1 is small for a specific reason worth knowing: its latency is on the critical path of every load, and a bigger cache is a slower one. The hierarchy exists because you cannot have one memory that is both large and fast, and every level is a different point on that trade.</p>

<h3>What follows for how you write code</h3>
<p>Almost all cache-aware optimisation is one of four things:</p>
<ul>
<li><span class="term-def">Traverse in memory order.</span> Row-major in C means the last index varies fastest; getting the loop nesting backwards multiplies the miss count by the line size divided by the element size.</li>
<li><span class="term-def">Make the working set fit.</span> Blocking or tiling restructures an algorithm so each phase works within a cache level — the standard example being matrix multiplication, where it is worth several times.</li>
<li><span class="term-def">Pack what is used together.</span> Struct-of-arrays beats array-of-structs when a pass touches one field, because the unused fields are no longer occupying the lines you fetched.</li>
<li><span class="term-def">Avoid pathological strides.</span> Powers of two align accesses onto the same sets.</li>
</ul>
${W(`None of this appears in a complexity analysis. Two algorithms with identical asymptotic behaviour and identical instruction counts routinely differ by an order of magnitude because one respects the line size and the other does not — and at the sizes most real programs work at, the constant factor from memory behaviour dominates the asymptotics completely.`)}`,
                facts: [
                    "Main memory is 200–300 cycles away and a core can retire several instructions per cycle, so a miss to DRAM leaves roughly a thousand instruction slots to fill.",
                    "Caches work only because of temporal and spatial locality; spatial locality is why data moves in 64-byte lines rather than words.",
                    "Line granularity means touching one byte costs the same as touching all 64, which is why array-of-structs and struct-of-arrays can differ by a factor of ten.",
                    "Associativity is the single organising decision: direct-mapped has one slot per address, fully associative has none fixed, and N-way set associative is what everything uses.",
                    "The index bits are not stored in the tag — they are implied by which set holds the line.",
                    "The three Cs have different fixes: compulsory needs prefetching or less data, capacity needs a smaller working set, conflict needs associativity or different addresses.",
                    "Power-of-two strides map every access onto the same few sets, which is why matrix code pads a dimension by one and why rounding a buffer up to a power of two can slow a program down.",
                    "Write-allocate means writing memory you never read still reads it, doubling traffic when filling a large buffer — which is what non-temporal stores avoid.",
                    "L1 is small because its latency is on the critical path of every load; a bigger cache is a slower one, and the hierarchy is a series of points on that trade.",
                    "The shared L3 is where cores interfere with each other, and is the mechanism behind the noisy-neighbour effect."
                ] },
            { id: "a7", t: "Access patterns, prefetching and memory parallelism", calc: null,
                blurb: "The same number of bytes read from the same array can differ tenfold depending on the order. Latency is not the reason — the reason is how many misses the machine can have outstanding at once.",
                body: `
<h3>The measurement that starts everything</h3>
<p>Read every element of an array far larger than the last-level cache, in three orders. The instruction count is identical, and so is the number of bytes:</p>
${F(`sequential   ~1 element per few cycles, near peak
                                          bandwidth
strided by    slower in proportion to lines touched
64 bytes      per element used
pointer       ~200–300 cycles per element, roughly
chasing       one DRAM latency each`)}
<p>Two separate effects produce that spread, and they are worth separating because the fixes differ.</p>
<p>The first is <span class="term-def">line utilisation</span>. Every miss fetches 64 bytes. Sequential access uses all of them; a stride of 64 bytes uses four out of sixty-four in an array of floats. The bandwidth consumed is the same and the useful fraction is not.</p>
<p>The second is the one people miss, and it matters more.</p>

<h3>Memory-level parallelism</h3>
<p>A core does not process one miss at a time. It has a set of buffers — line fill buffers, or miss status holding registers — that track outstanding misses, typically ten to sixteen of them. With many misses in flight their latencies overlap, and the effective cost per miss is the DRAM latency divided by how many are outstanding.</p>
${F(`Little's Law again:  concurrency = bandwidth × latency

1 outstanding miss    64 B / 250 cyc  ≈ low bandwidth
12 outstanding misses 12 × that       ≈ near peak

so a core's achievable single-thread bandwidth is
capped by its miss buffers, NOT by DRAM`)}
<p>Which explains pointer chasing exactly. Following a linked list, the address of the next node is not known until the current one arrives, so there can only ever be <em>one</em> miss outstanding. The chain serialises the latencies, and a hundred nodes cost a hundred full DRAM round trips. An array of the same hundred elements issues all the misses at once and costs roughly one.</p>
<p>This is the real reason linked lists lose to arrays, and it is not the reason usually given. It is not principally about locality or allocator behaviour; it is that a dependent load cannot be overlapped with the load it depends on. The same argument condemns a hash table with long pointer-chased chains, a tree with one node per cache line, and any traversal where the next address is computed from the current value.</p>

<h3>Prefetching</h3>
<p>Hardware watches the miss stream and fetches ahead. Modern cores run several prefetchers at once, and knowing what they can recognise is knowing what patterns are fast:</p>
${F(`next-line       fetch line n+1 on a miss for line n
stride          detect a constant stride and run ahead
                — including negative and multi-line strides
adjacent-line   fetch the paired line, exploiting 128-byte
                alignment

what they CANNOT do
  follow a pointer
  predict an indirect index  A[B[i]]
  cross a page boundary — a prefetcher will not risk a
  translation it has no reason to believe in`)}
<p>The page-boundary limit is the one that surprises people: a prefetcher stops at 4 KiB, so a sequential scan takes a fresh compulsory miss at every page — which is one of several reasons huge pages help streaming workloads, as the <code>os</code> subject notes from the paging side.</p>
<p>Software prefetch instructions exist and are usually a mistake. They must be issued far enough ahead to cover the latency and not so far that the line is evicted before use, they consume issue slots and buffers, and they compete with the hardware prefetcher, which is generally better informed. The exception is exactly the case hardware cannot see: an indirect or pointer-based traversal where the future addresses <em>are</em> computable ahead of time — prefetching <code>A[B[i+16]]</code> while processing <code>A[B[i]]</code>, which is a standard technique in hash joins and graph traversal.</p>

<h3>Making the pattern better instead</h3>
<p>Almost every fix in this module changes the layout rather than the code that reads it:</p>
<ul>
<li><span class="term-def">Struct of arrays.</span> A pass that reads one field of a million objects reads one field per line in AoS and sixteen in SoA. This is the single highest-leverage data-layout change in performance work, and it is what "data-oriented design" mostly means.</li>
<li><span class="term-def">Flatten the pointers.</span> Store a tree or graph in an array with integer indices rather than pointers. Same asymptotics, and the traversal can now be prefetched and often vectorised.</li>
<li><span class="term-def">Widen the nodes.</span> A B-tree with cache-line-sized nodes does fewer dependent loads than a binary tree with the same element count, which is why B-trees beat binary trees in memory as well as on disk.</li>
<li><span class="term-def">Blocking.</span> Restructure so each phase's working set fits a cache level.</li>
<li><span class="term-def">Batch the independent work.</span> Processing several independent lookups in an interleaved loop gives the machine several concurrent misses where a simple loop would give one at a time. This is the direct application of the MLP argument, and it can multiply hash table throughput.</li>
</ul>

<h3>Non-temporal stores</h3>
<p>For the write-allocate problem from a6 — filling a buffer you will not read — a <span class="term-def">non-temporal</span> store writes straight toward memory without fetching the line and without polluting the cache. It halves the traffic for large fills and it is easy to misuse: on data that <em>is</em> read again soon, it is a straightforward loss, and the stores must cover whole lines to avoid a read-modify-write anyway.</p>
${W(`Every technique here is measurable and none is a rule. Struct-of-arrays is wrong when a pass touches every field; batching costs code complexity and register pressure; flattening pointers makes insertion harder. The reliable part is the diagnosis — line utilisation and outstanding misses — not any particular remedy.`)}`,
                facts: [
                    "The same bytes read in a different order can differ tenfold, from two separate effects: how much of each 64-byte line is used, and how many misses are outstanding at once.",
                    "A core tracks ten to sixteen outstanding misses, so single-thread bandwidth is capped by those buffers rather than by DRAM.",
                    "Pointer chasing serialises latencies because the next address is unknown until the current load returns — only one miss can be in flight.",
                    "That, not locality, is the principal reason linked lists lose to arrays, and it condemns any traversal where the next address comes from the current value.",
                    "Hardware prefetchers recognise next-line and constant strides, and cannot follow pointers, predict A[B[i]], or cross a page boundary.",
                    "The 4 KiB prefetch limit means a sequential scan takes a fresh compulsory miss every page, which is one reason huge pages help streaming workloads.",
                    "Software prefetch is usually a mistake — the hardware is better informed — except for indirect traversals whose future addresses are computable ahead of time.",
                    "Struct-of-arrays is the highest-leverage layout change when a pass touches one field of many objects, and wrong when it touches every field.",
                    "Interleaving several independent lookups gives the machine concurrent misses where a simple loop gives one at a time, which can multiply hash-table throughput.",
                    "Non-temporal stores avoid the write-allocate fetch for buffers that will not be read, and are a loss on data that is read again soon."
                ] },
            { id: "a8", t: "Coherence, consistency and atomics", calc: null,
                blurb: "Every core has its own cache, and they must agree. The protocol that makes them agree is the reason sharing a variable between threads costs what it does — and the reason the language memory model in the os subject had to exist.",
                body: `
<h3>Two different problems with similar names</h3>
<p>They are constantly conflated, and separating them makes everything below tractable:</p>
${F(`coherence     about ONE location. All cores must
              eventually agree on the value of X, and see
              writes to X in a single order.
              Solved in hardware, invisibly.

consistency   about the ORDER of operations on DIFFERENT
              locations. If I write X then Y, may another
              core see the new Y and the old X?
              Specified by the ISA, and visible.`)}
<p>Coherence is not optional and not something you can turn off; the hardware does it. Consistency is a documented property of the architecture, differs between architectures, and is what fences and atomics exist to control.</p>

<h3>MESI</h3>
<p>Coherence is maintained by a protocol over cache lines. Each line in each cache is in one of four states:</p>
${F(`M  Modified   this cache has the only copy, and it is
               dirty. Memory is stale.
E  Exclusive   only copy, and clean. May be written
               without telling anyone.
S  Shared      other caches may hold this line too, all
               clean. Read freely; a write must invalidate
               the others first.
I  Invalid     no usable copy here.`)}
<p>The rule that produces every performance consequence: <strong>to write a line, a core must first hold it in M or E, which means invalidating every other copy.</strong> Reading is cheap and shareable; writing is exclusive and requires a conversation.</p>
<p>So the cost of shared data is not about the data at all — it is about the transitions:</p>
<ul>
<li><span class="term-def">Read-only sharing is free.</span> Any number of cores may hold a line in S and read it at full speed. A shared immutable lookup table costs nothing.</li>
<li><span class="term-def">A written line is exclusive.</span> Two cores alternately writing one line pass it back and forth — <span class="term-def">cache line ping-pong</span> — at tens to hundreds of cycles per transfer, far more than an L1 hit.</li>
<li><span class="term-def">The line is the unit, not the variable.</span> Two cores writing to different variables in one line ping-pong exactly as if they shared a variable. That is <span class="term-def">false sharing</span>, which the <code>os</code> subject names as a symptom and this protocol is the cause of. Padding to 64 bytes separates them.</li>
</ul>
<p>This is also the mechanical origin of the coherence term in the scalability law: the invalidation traffic grows with the number of participants, so the cost of a shared counter rises faster than linearly in the core count.</p>

<h3>Atomics, at the hardware level</h3>
<p>An atomic read-modify-write needs the line in M for the duration, so that nobody else can observe or alter it in between. Two implementation families:</p>
${F(`x86       LOCK-prefixed instructions, and cmpxchg.
          The core holds the line exclusively across the
          operation. ~20–50 cycles uncontended, and far
          more when the line is being fought over.

ARM,      load-linked / store-conditional. The load marks
RISC-V    the address; the store succeeds only if nothing
          intervened, otherwise you retry. Compose freely,
          and can livelock under heavy contention.
          ARMv8.1 added direct atomic instructions.`)}
<p>The important number is not the uncontended cost but the shape of the contended one. An atomic increment on a line no other core wants is tens of cycles. The same increment on a line sixteen cores are hammering costs the invalidation round trip every time, and throughput falls as the count rises. This is why a per-core counter summed on read beats a single shared atomic counter by orders of magnitude, and why that is the standard fix for a hot statistics counter.</p>

<h3>Memory ordering, and why x86 is deceptive</h3>
<p>Coherence says nothing about the order of operations on different addresses. Architectures differ, and they differ in a way that produces portability bugs of the nastiest kind — code that has been correct for a decade on one machine and fails on another.</p>
${F(`x86 (TSO)        loads not reordered with loads
                 stores not reordered with stores
                 stores not reordered with EARLIER loads
                 ⇒ only StoreLoad reordering is visible,
                   from the store buffer

ARM, POWER,      essentially everything may be reordered
RISC-V           unless a barrier says otherwise`)}
<p>The store buffer is where x86's one reordering comes from: a store sits in a per-core buffer before becoming globally visible, so a later load can complete first. That is the mechanism behind the two-thread example in the <code>os</code> subject where both threads miss each other's write — no interleaving permits it, and the hardware does it anyway.</p>
<p>x86's relative strength is a trap for portable code. Code with missing barriers frequently works on x86 by accident and breaks on ARM, where the same omission is exposed. This is why the language-level model is the thing to program against: write to the C++ or Java or Go memory model, and the compiler emits the right barriers for each target. Reasoning directly about x86's guarantees produces code that is correct on one architecture and silently broken on the next.</p>
<p>Fences make the ordering explicit — <code>mfence</code> on x86, <code>dmb</code> on ARM — and a sequentially consistent atomic store compiles to a store plus a fence on x86, or to a store-release on ARM. Acquire and release are cheaper than sequential consistency for exactly this reason: they constrain less, so they emit less.</p>
${W(`The layering is worth stating once. Coherence is hardware and automatic. Consistency is architectural and visible. The language memory model sits above both, and is the only level at which portable reasoning is possible. Programming against what your current processor happens to do is how a class of bug gets shipped that reproduces on nobody else's machine.`)}`,
                facts: [
                    "Coherence is about one location and is solved invisibly in hardware; consistency is about the order of operations on different locations and is architecturally visible.",
                    "In MESI, writing a line requires holding it Modified or Exclusive, which means invalidating every other copy — reading is shareable, writing is a conversation.",
                    "Read-only sharing is free at any core count; a line two cores write alternately ping-pongs at tens to hundreds of cycles per transfer.",
                    "The cache line is the unit of coherence, not the variable, which is the mechanical cause of false sharing.",
                    "Invalidation traffic grows with the number of participants, which is the origin of the coherence term that makes scalability curves turn over.",
                    "An atomic RMW holds the line exclusively: tens of cycles uncontended, and far worse when many cores fight for it — hence per-core counters summed on read.",
                    "x86 is TSO and permits only StoreLoad reordering, from the store buffer; ARM, POWER and RISC-V reorder essentially everything without barriers.",
                    "Code with missing barriers frequently works on x86 by accident and fails on ARM, which is why portable reasoning must happen at the language memory model.",
                    "Acquire and release are cheaper than sequential consistency because they constrain less and therefore emit fewer barriers."
                ] }
        ] },
    { name: "Level 3 · Parallelism on the chip", mods: [
            { id: "a9", t: "SIMD and vectorisation", calc: null,
                blurb: "One instruction operating on sixteen values at once, for the same issue slot. The hardware is free; getting the compiler to use it is the whole difficulty, and the reasons it refuses are specific and fixable.",
                body: `
<h3>The idea, and where the win comes from</h3>
<p>A <span class="term-def">SIMD</span> instruction applies one operation to several values held in a wide register. The win is not that arithmetic is faster — it is that one instruction, one decode slot, one issue slot and one dependency edge cover eight or sixteen elements.</p>
${F(`SSE          128-bit    4 floats or 2 doubles
AVX / AVX2   256-bit    8 floats or 4 doubles
AVX-512      512-bit   16 floats or 8 doubles
NEON         128-bit    4 floats           (ARM)
SVE / SVE2   scalable   width unknown at compile time (ARM)`)}
<p>SVE is the interesting one architecturally: the register width is not in the instruction encoding, so the same binary runs on implementations with different vector widths. That is a direct application of the a1 principle — the ISA states what happens, not how wide the hardware is — and it avoids the recompile-per-width treadmill that x86's succession of extensions created.</p>
<p>The ceiling is real but bounded. Eight-wide float SIMD does not make a program eight times faster; it makes the vectorised arithmetic up to eight times faster, and Amdahl's law applies to the rest. If the loop is memory-bound (a7), widening the arithmetic changes nothing at all, because the bottleneck was never the arithmetic.</p>

<h3>Why the compiler will not vectorise your loop</h3>
<p>Auto-vectorisation is the normal path — hand-written intrinsics are a last resort — and it fails for a short list of specific reasons. Each has a specific remedy, which is what makes this list worth memorising rather than guessing at.</p>
<p><span class="term-def">1. Possible aliasing.</span> Given two pointers, the compiler must assume they may overlap. If <code>a</code> and <code>b</code> alias, processing four elements at once is not equivalent to processing them one at a time, so it emits the scalar loop.</p>
${F(`void add(float *a, float *b, int n) {
    for (int i = 0; i < n; i++) a[i] += b[i];
}
⇒ may not vectorise: a and b might overlap

remedy: restrict (C), __restrict__, or a pragma asserting
        independence — or take the arrays by value/span
        types the compiler can reason about`)}
<p><span class="term-def">2. Floating-point reassociation.</span> A reduction into a vector accumulator sums the elements in a different order, and by a2 that is a different expression with a different answer. The compiler is forbidden from making that change silently. This is the most common reason an obviously-vectorisable sum is not vectorised, and the remedy is either <code>-ffast-math</code> (a real correctness change), a targeted pragma, or writing the multiple accumulators explicitly — which also breaks the dependency chain of a5 and is worth doing anyway.</p>
<p><span class="term-def">3. Data-dependent control flow.</span> A branch inside the loop means different elements take different paths. Modern SIMD handles this by <span class="term-def">masking</span> — compute both sides for all lanes and blend — which works and costs the sum of both branches. If one side is rare and expensive, the masked version is slower than the scalar one.</p>
<p><span class="term-def">4. Non-contiguous access.</span> Vector loads want consecutive elements. Gather and scatter instructions exist for indexed access and are dramatically slower than a contiguous load, because they may touch a different cache line per lane. Array-of-structs forces this; struct-of-arrays (a7) removes it, which is why layout and vectorisation are the same conversation.</p>
<p><span class="term-def">5. Loop-carried dependencies.</span> If iteration <em>i</em> needs the result of <em>i−1</em>, the loop is sequential by construction. Some such loops can be rewritten — a prefix sum has a parallel formulation — and some cannot.</p>
<p><span class="term-def">6. Trip count and alignment.</span> An unknown count needs a scalar remainder loop; unaligned data may need a peeling prologue. These are handled automatically and cost a little, and they are the reason a vectorised loop over four elements can be slower than a scalar one.</p>

<h3>Checking rather than hoping</h3>
<p>Whether a loop vectorised is not something to infer from timings. Compilers report it directly — <code>-fopt-info-vec-missed</code> on GCC, <code>-Rpass-missed=loop-vectorize</code> on Clang — and they name the reason, which usually maps onto one of the six above. Reading the assembly for vector register names is the other check.</p>
${W(`Do not reach for intrinsics first. Hand-written SIMD is architecture-specific, hard to read, hard to test, and frequently beaten by a compiler given a loop it can reason about — and the changes that let it reason (removing aliasing, fixing layout, splitting accumulators) usually improve the scalar version too. Intrinsics are for the cases where the algorithm itself has to change shape: shuffles, saturating arithmetic, table lookups within a vector.`)}

<h3>The costs that are easy to miss</h3>
<ul>
<li><span class="term-def">Frequency.</span> Wide vector execution draws more power, and some processor generations reduce the clock — for the whole core, and for a period afterwards — when heavy 512-bit instructions are used. A modest AVX-512 gain has repeatedly been erased by the frequency drop it caused in surrounding scalar code. This is heavily generation-dependent, and it is a real reason to measure the whole program rather than the loop.</li>
<li><span class="term-def">Portability.</span> An AVX-512 binary does not run on a machine without it. Function multi-versioning and runtime dispatch handle this, at the cost of build complexity.</li>
<li><span class="term-def">Tail handling.</span> Short loops may spend most of their time in prologue and remainder.</li>
</ul>
<p>The order to work in is therefore: fix the memory access pattern first (a7), because a memory-bound loop gains nothing from wider arithmetic; then remove the vectorisation blockers above; then measure; and only then consider intrinsics.</p>`,
                facts: [
                    "SIMD's win is one decode slot, one issue slot and one dependency edge covering many elements — not faster arithmetic per element.",
                    "SVE leaves the vector width out of the encoding, so one binary runs at any implementation width — the a1 principle applied to vectors.",
                    "A memory-bound loop gains nothing from wider arithmetic, so the access pattern has to be fixed first.",
                    "Possible pointer aliasing blocks vectorisation, and restrict or an independence pragma is the remedy.",
                    "Floating-point reassociation is the most common blocker for reductions, because a vector accumulator sums in a different order and so computes a different expression.",
                    "Data-dependent branches are handled by masking, which computes both sides for all lanes — so a rare expensive branch makes the masked version slower than scalar.",
                    "Gather and scatter are far slower than contiguous loads, which is why array-of-structs blocks vectorisation and struct-of-arrays enables it.",
                    "Compilers report why a loop did not vectorise, and the reason almost always maps onto one of the standard blockers — check rather than infer from timings.",
                    "Heavy 512-bit instructions can reduce core frequency for the whole core and a period afterwards, erasing the gain in surrounding scalar code.",
                    "Intrinsics are a last resort: the changes that let a compiler vectorise usually improve the scalar version too."
                ] },
            { id: "a10", t: "Multicore, SMT and heterogeneity", calc: null,
                blurb: "When frequency stopped rising, the transistors went into more cores instead. Every one of the ways they were spent shares something between threads, and what is shared decides when the extra parallelism is real.",
                body: `
<h3>Why there are many cores</h3>
<p>Module a11 gives the physics; the consequence is that from roughly 2005 the available transistors could no longer be spent making one core faster at an acceptable power cost, so they were spent on more cores. That was not a discovery that parallelism is good. It was a concession that the alternative had stopped working, and it moved a hard problem from hardware designers to programmers, where it remains.</p>

<h3>Simultaneous multithreading</h3>
<p><span class="term-def">SMT</span> — hyperthreading, on Intel — runs two (or more) threads on one physical core. The key question is always what is duplicated and what is shared:</p>
${F(`duplicated   architectural registers, program counter,
             the state that makes it a separate thread

shared       execution units, L1 and L2 caches, the TLB,
             branch predictors, the reorder buffer and
             other queues — usually partitioned or
             competitively shared`)}
<p>The reasoning is that one thread rarely saturates a core's execution units: when it stalls on a cache miss (a6) or a mispredict (a4), the units idle. A second thread fills those gaps. So the benefit depends entirely on the workload:</p>
<ul>
<li>Threads that stall often — pointer chasing, branchy code, I/O-heavy work — gain substantially, often 20–30%.</li>
<li>Threads that already saturate the units — dense vectorised numerical code — gain nothing, and can <em>lose</em>, because two threads now share one L1 and each has half the effective cache.</li>
<li>Latency-sensitive work is disturbed: a sibling thread's behaviour affects your tail latency through shared resources, which is why some low-latency deployments disable SMT outright.</li>
</ul>
<p>And two logical cores are not two cores. Capacity planning that counts them as two, and an application sizing its thread pool from the logical count, both routinely overcommit. The <code>os</code> subject's point about runtimes reading system totals applies here with a second twist: the number is real, and it does not mean what it appears to.</p>
<p>Sharing has a security dimension too. Shared branch predictors, caches and execution ports between two threads on one core give a side channel between them, which is why several transient-execution mitigations (a13) involve disabling SMT or refusing to co-schedule threads from different trust domains.</p>

<h3>What multiple cores share</h3>
<p>Going up a level, the same question applies to the chip:</p>
${F(`private per core   L1, L2, execution resources
shared             L3, the memory controllers, the
                   interconnect, the power and thermal
                   budget`)}
<p>Each shared item is a place where cores interfere. L3 capacity is contended, so one core streaming a large array evicts another's working set. Memory bandwidth is finite and shared, so eight cores each achieving good bandwidth alone may each get a fraction of it together — the reason a perfectly parallel benchmark scales to four cores and then flattens. And the power budget is shared, which is why an all-core turbo frequency is lower than a single-core one: running every core at the single-core boost clock would exceed the package's thermal limit.</p>
<p>That last point has a counterintuitive consequence worth stating: <strong>parallelising a program can reduce the clock speed of every core running it.</strong> A four-times parallel speedup at 80% of the frequency is 3.2×, and the missing 0.8 is not a bug in the parallelisation.</p>

<h3>NUMA</h3>
<p>Beyond one socket, memory is attached to particular sockets, and reaching another socket's memory costs perhaps twice as much and consumes interconnect bandwidth. The hardware makes it work transparently, which is the problem: the code is correct and quietly slow. The <code>os</code> subject covers the first-touch allocation policy that decides where pages land; the architectural point is that "main memory" stopped being one uniform thing, and a machine's topology is now part of its performance model.</p>

<h3>Heterogeneity</h3>
<p>The current direction is not more identical cores but different ones:</p>
<ul>
<li><span class="term-def">Performance and efficiency cores.</span> ARM's big.LITTLE and Intel's P/E split put wide out-of-order cores alongside smaller in-order or narrow ones. Throughput per watt improves; the scheduler now has to decide which core a thread belongs on, and getting it wrong is visible as erratic performance. Early P/E-core systems also had to cope with the two core types supporting different instruction sets, which is exactly the kind of ISA-contract violation a1 says must not happen — and it was resolved by disabling the mismatched extension.</li>
<li><span class="term-def">Accelerators.</span> GPUs, neural processing units, video codecs, cryptographic engines. Each is a fixed-function or restricted-programmability unit that does one class of work at far better efficiency than a general core.</li>
</ul>
<p>The GPU comparison is the clearest illustration of the whole design space, because it is the opposite corner from everything in levels 1 and 2:</p>
${F(`CPU core     minimise LATENCY of one thread.
             Deep OoO window, big caches, aggressive
             branch prediction, high clock. Enormous
             machinery per instruction stream.

GPU          maximise THROUGHPUT across thousands of
             threads. Simple cores, little speculation,
             tiny cache per thread — and latency hidden
             by having thousands of other threads ready
             to run the moment one stalls.`)}
<p>Neither is better. They are different answers to the question of what to do while waiting for memory: the CPU predicts and reorders so that one thread keeps going, and the GPU simply switches to one of the thousands of other threads it has. Which is why a workload with enough independent work suits a GPU and one with a long dependency chain and unpredictable branches does not, however arithmetic-heavy it looks.</p>
${W(`"Add threads" is not a performance strategy on its own. The <code>os</code> subject's scalability arithmetic caps the gain, module a8's coherence traffic makes shared state expensive, memory bandwidth is a shared and finite resource, and the frequency drops when every core is busy. Parallelism helps when the work is genuinely independent and each piece is large enough to amortise its coordination — and the honest first question is whether the single-threaded version is using the machine it already has.`)}`,
                facts: [
                    "Many cores are a concession rather than a discovery: frequency scaling stopped working, and the transistors had to go somewhere.",
                    "SMT duplicates architectural state and shares execution units, caches, TLB and predictors — so the gain depends entirely on how often a thread stalls.",
                    "Stall-heavy workloads gain 20–30% from SMT; saturated vectorised code gains nothing and can lose, because each thread now has half the effective L1.",
                    "Two logical cores are not two cores, and thread pools sized from the logical count routinely overcommit.",
                    "Shared predictors and caches between SMT siblings are a side channel, which is why some mitigations involve disabling SMT or restricting co-scheduling.",
                    "L3, memory bandwidth, the interconnect and the power budget are all shared, so a perfectly parallel benchmark can scale to four cores and then flatten on bandwidth.",
                    "All-core turbo is lower than single-core turbo, so parallelising a program reduces the clock of every core running it — a real part of the missing speedup.",
                    "Heterogeneous cores improve throughput per watt and hand the scheduler a placement problem whose errors show up as erratic performance.",
                    "A CPU minimises the latency of one thread with speculation and caches; a GPU maximises throughput by having thousands of threads ready when one stalls.",
                    "Neither is better — they are opposite answers to what to do while waiting for memory, which is why dependency chains and unpredictable branches suit one and not the other."
                ] }
        ] },
    { name: "Level 4 · Limits", mods: [
            { id: "a11", t: "Power, and the end of frequency scaling", calc: null,
                blurb: "Two scaling laws held for thirty years and one of them stopped around 2005. Every structural change in computing since — multicore, accelerators, efficiency cores — is a consequence of which one it was.",
                body: `
<h3>Two laws, usually confused</h3>
${F(`Moore's law       transistor density doubles roughly
                  every two years. An observation about
                  economics and manufacturing.

Dennard scaling   as transistors shrink, voltage and
                  current shrink with them, so POWER
                  DENSITY stays constant. A physical
                  observation, from 1974.`)}
<p>Dennard scaling is the one that mattered day to day, and almost nobody outside the field knew its name. It said you could shrink the transistors, put more of them in, <em>and clock them faster</em>, all within the same power and thermal envelope. That is why processor speed rose from megahertz to gigahertz with no change in cooling requirements, and why a program written in 1990 got faster every year without anyone touching it.</p>

<h3>Why it stopped</h3>
<p>Dynamic power in CMOS is approximately:</p>
${F(`P ≈ C × V² × f        +  leakage

C  capacitance (falls as transistors shrink)
V  supply voltage
f  frequency`)}
<p>The <em>V²</em> is what made Dennard scaling work: reduce voltage along with the dimensions and power falls quadratically, paying for the extra transistors and the higher clock. But voltage cannot fall indefinitely. Below roughly a volt, the threshold voltage of a transistor cannot be reduced proportionally without the device failing to switch cleanly, and <span class="term-def">leakage current</span> — the current a transistor passes when nominally off — rises sharply as the threshold falls. By the mid-2000s leakage was a substantial fraction of total power and voltage scaling had effectively stopped.</p>
<p>With V fixed, the relationship collapses to something ugly: power now rises roughly linearly with frequency at constant voltage, and worse than that in practice, because a higher clock needs a higher voltage to switch reliably — so the real cost of a frequency increase is closer to cubic. That is a wall, not a slope.</p>
${F(`before ~2005   shrink ⇒ more transistors AND higher clock
               at the same power

after          shrink ⇒ more transistors at the same power
               clock frequency plateaus around 3–5 GHz
               where it has stayed for two decades`)}
<p>Moore's law continued for years afterwards — the transistors kept arriving. The question became what to do with them when they could not be used to go faster.</p>

<h3>What the transistors were spent on instead</h3>
<p>In rough order of adoption, and each is a module of this subject:</p>
<ul>
<li><span class="term-def">More cores</span> (a10) — the immediate answer, and the one that moved the difficulty to software.</li>
<li><span class="term-def">Bigger caches</span> (a6) — cache is dense, relatively cool, and helps almost everything.</li>
<li><span class="term-def">Wider vectors</span> (a9) — more work per instruction, with the control overhead amortised.</li>
<li><span class="term-def">Deeper speculation</span> (a4, a5) — larger windows and better predictors, spending transistors to extract parallelism the programmer did not express.</li>
<li><span class="term-def">Specialised units</span> (a10) — a fixed-function video encoder or matrix unit does its job at a small fraction of the energy of a general core doing the same work.</li>
</ul>
<p>The last one is the current direction, for a reason the power equation makes obvious: if power is the binding constraint, the metric to optimise is operations per joule, and specialisation is the largest single lever on it.</p>

<h3>Dark silicon</h3>
<p>Follow it to its conclusion. Transistor density keeps rising and the power budget does not, so a chip eventually contains more transistors than it can power simultaneously. The unpowered fraction is <span class="term-def">dark silicon</span>, and it is not waste — it is a design strategy. Fill the die with specialised units, power the ones the current workload needs, and leave the rest dark. A modern phone processor is largely this: a collection of accelerators of which a minority are active at any moment.</p>
<p>The same budget explains behaviour visible from software:</p>
<ul>
<li><span class="term-def">Turbo and DVFS.</span> Frequency and voltage are adjusted continuously against thermal and current limits. A core runs fast in a short burst and slower sustained, so the first run of a benchmark is not comparable to the tenth.</li>
<li><span class="term-def">All-core clocks are lower</span> than single-core clocks (a10).</li>
<li><span class="term-def">Wide vector instructions can reduce frequency</span> (a9), because they draw more current per cycle.</li>
</ul>
${W(`This is why benchmarking on a laptop is unreliable in a specific and under-appreciated way: the clock is a dependent variable. A change that measures faster may have measured a cooler machine, and a change that measures slower may have run at a lower turbo bin because the previous test heated the package. Pinning the frequency, disabling turbo, and interleaving A and B runs are what make the comparison mean anything.`)}

<h3>Where this leaves the programmer</h3>
<p>The free lunch — the same code getting faster each year — ended around 2005, and the honest statement of the consequence has three parts. Single-thread performance still improves, but at a few percent a year rather than by doubling. Total throughput improves faster, and only for work that can use more cores. And efficiency improves fastest of all, but mainly for work that maps onto specialised units.</p>
<p>Which is why the performance skills that matter now are the ones in this subject rather than in a compiler flag: understanding the memory hierarchy, avoiding the patterns that defeat prediction and prefetching, and structuring work so it can be parallelised or vectorised. Those are the levers that remain.</p>`,
                facts: [
                    "Moore's law is about transistor density; Dennard scaling is about power density staying constant as transistors shrink. It was the second that ended.",
                    "Dynamic power is roughly C × V² × f, and the V² term is what let frequency rise for free while transistors shrank.",
                    "Voltage scaling stopped because threshold voltage cannot fall proportionally without leakage current rising sharply — by the mid-2000s leakage was a large fraction of total power.",
                    "With voltage fixed, a frequency increase costs roughly cubically once the necessary voltage bump is included. That is a wall, not a slope.",
                    "Clock frequency has sat around 3–5 GHz for two decades while transistor counts kept rising, which is the whole reason for multicore.",
                    "The transistors went into cores, caches, vectors, deeper speculation and specialised units — each a module of this subject.",
                    "If power is the binding constraint the metric is operations per joule, and specialisation is the largest lever on it.",
                    "Dark silicon is a strategy rather than waste: fill the die with specialised units and power only the ones the workload needs.",
                    "Clock speed is a dependent variable, so benchmarking must pin the frequency and interleave the runs or it measures the machine's temperature.",
                    "Single-thread performance now improves a few percent a year, throughput improves for parallel work, and efficiency improves fastest for work that maps onto specialised units."
                ] },
            { id: "a12", t: "Roofline, and finding where the time goes", calc: "roofline",
                blurb: "Any loop is limited by arithmetic or by memory, and one number decides which. Knowing it before optimising is the difference between an afternoon well spent and an afternoon spent making the wrong thing faster.",
                body: `
<h3>Arithmetic intensity</h3>
<p>Every kernel has a ratio, and it is the most informative single number you can compute about one:</p>
${F(`arithmetic intensity  =  FLOPs performed
                          ─────────────────
                          bytes moved from DRAM

  units: FLOP per byte`)}
<p>The denominator is traffic to <em>memory</em>, not to cache, which is why the same code can have different intensity at different problem sizes — once the working set fits in cache the bytes stop being fetched and the intensity rises.</p>
${F(`vector sum   a[i] += b[i]
             1 FLOP, 12–16 bytes moved   ⇒ ~0.08 F/B
             hopelessly memory bound

dense matmul restructured with blocking
             O(n³) FLOPs over O(n²) bytes
             ⇒ intensity grows with block size
             the classic compute-bound kernel`)}
<p>The matrix multiply entry is the important one. Naive triple-loop matmul has poor intensity because it re-reads the operands; blocking (a6) raises the intensity by reusing each loaded block, which is why blocking is worth several times rather than a few percent. Blocking does not reduce the arithmetic at all — it moves the kernel to a different place on the graph below.</p>

<h3>The roofline</h3>
<p>Williams, Waterman and Patterson's model, and its whole content is one <code>min</code>:</p>
${F(`attainable FLOP/s = min( peak FLOP/s,
                         intensity × peak bandwidth )

        performance
          ▲
 peak ────┼─────────────────────  ← compute roof
          │        ╱
          │      ╱   ← bandwidth roof: slope = peak GB/s
          │    ╱
          │  ╱
          └─┴──────────────────▶  arithmetic intensity
            ↑ ridge point`)}
<p>Below the <span class="term-def">ridge point</span> a kernel is memory bound and its performance is set entirely by bandwidth: better arithmetic, wider vectors and more cores buy nothing. Above it the kernel is compute bound and bandwidth is irrelevant. The ridge is where the two roofs meet, at intensity = peak FLOP/s ÷ peak bandwidth.</p>
<p>That ratio has been rising for decades — compute has grown far faster than memory bandwidth — so the ridge point has moved right, and more kernels are memory bound than used to be. A machine with a ridge around 10 FLOP/byte makes almost every kernel that streams data memory bound, which is why so much modern optimisation is about data movement rather than arithmetic.</p>
<p>The model also has lower ceilings worth drawing: without vectorisation the compute roof drops by the vector width, and without enough memory-level parallelism (a7) the bandwidth roof drops too. A measured point far below both roofs is the interesting case — it means neither resource is saturated, and something else, usually latency or dependency chains, is the limit.</p>

<h3>Measuring instead of guessing</h3>
<p>The top-down method from a5 is the practical form. Modern processors expose counters that attribute every issue slot to one of four categories:</p>
${F(`retiring          useful work. High is good — unless the
                  work itself is unnecessary.
bad speculation    issued and squashed (a4)
front-end bound    could not fetch/decode — i-cache, branch
                  target misses, poor layout
back-end bound     could not execute
    ├ core bound   units busy, or a dependency chain (a5)
    └ memory bound waiting on cache or DRAM (a6, a7)`)}
<p>Each category has a distinct remedy and they do not overlap. Attacking a memory-bound loop with wider vectors is the standard wasted afternoon, and it is entirely avoidable by looking at the breakdown first.</p>
<p>The supporting counters worth knowing by name:</p>
${F(`IPC                       instructions per cycle. ~1 is
                          mediocre, 3–4 is good on a wide
                          core, <0.5 means stalling hard
cache-misses / LLC-misses where in the hierarchy it stops
branch-misses             per instruction; >1% is expensive
stalled-cycles-*          front-end vs back-end split
page-faults               see the os subject`)}

<h3>Reading a number honestly</h3>
<p>Four failure modes that produce confident wrong conclusions:</p>
<ul>
<li><span class="term-def">A cold cache measured once.</span> The first run pays compulsory misses the second does not. Which one is representative depends on how the code is actually used, and the answer is often the first.</li>
<li><span class="term-def">A trained branch predictor.</span> A loop over fixed data reports a number production will not see (a4).</li>
<li><span class="term-def">Frequency drift.</span> The clock is a dependent variable (a11).</li>
<li><span class="term-def">The wrong unit.</span> A mean hides a distribution. Tail latency is a separate quantity and frequently the one that matters.</li>
</ul>
<p>And the one methodological rule that outranks all of them: <strong>measure before optimising, and measure the whole program.</strong> A loop made four times faster that occupies 5% of runtime buys under 4%, and the arithmetic in the <code>os</code> subject's scaling module is the same arithmetic. Profiling first is not caution, it is the only way to know that the thing being optimised is the thing costing the time.</p>
${W(`A benchmark that improves while the program does not is the normal outcome of optimising without a profile. The most common causes are optimising a loop that is not hot, moving time into a phase the benchmark does not cover, and trading throughput for a tail latency the benchmark does not measure. All three are visible immediately if the whole program is timed as well as the part being changed.`)}`,
                facts: [
                    "Arithmetic intensity is FLOPs divided by bytes moved from DRAM, and it decides whether a kernel is limited by compute or by memory.",
                    "The denominator is traffic to memory rather than to cache, so the same code has higher intensity once its working set fits in cache.",
                    "Blocking raises intensity by reusing loaded data without reducing the arithmetic at all — it moves the kernel along the roofline rather than shortening the work.",
                    "The roofline is one min: attainable performance is the lesser of peak compute and intensity times peak bandwidth.",
                    "Below the ridge point a kernel is memory bound and wider vectors or more cores buy nothing; above it bandwidth is irrelevant.",
                    "The ridge point has moved right for decades because compute grew faster than bandwidth, which is why so much modern optimisation is about data movement.",
                    "A point far below both roofs means neither resource is saturated, and the limit is usually latency or a dependency chain.",
                    "Top-down analysis attributes every issue slot to retiring, bad speculation, front-end bound or back-end bound, and the four have non-overlapping remedies.",
                    "IPC around 1 is mediocre, 3–4 is good on a wide core, and below 0.5 means stalling hard.",
                    "Measure the whole program: a loop made four times faster that is 5% of runtime buys under 4%."
                ] },
            { id: "a13", t: "When speculation became a vulnerability", calc: null,
                blurb: "The capstone. Speculative work leaves no architectural trace, which the ISA contract of module a1 said was sufficient. It was not, and in 2018 twenty years of microarchitecture turned out to have been leaking.",
                body: `
<h3>The assumption</h3>
<p>Module a1 stated the contract: the implementation may do anything provided it produces the results the sequential model specifies. Modules a4 and a5 relied on it — speculate, and if the guess was wrong, discard the work so that no architectural state changes.</p>
<p>The assumption underneath was that <em>discarded work is unobservable</em>. Registers are restored, memory is untouched, exceptions are precise. Nothing the program can read has changed.</p>
<p>But something did change. A speculative load that was later squashed still brought a line into the cache (a6). Timing is not architectural state, so nothing in the contract forbids it — and timing is measurable.</p>

<h3>The mechanism</h3>
<p>Every transient-execution attack has the same three parts, and recognising the shape is more useful than memorising the variants:</p>
${F(`1  get the processor to speculatively execute something
   it should not — a load past a bounds check, a call to
   a mistrained branch target

2  have that transient instruction encode secret data
   into microarchitectural state — typically by using
   the secret as an INDEX into an array, so which line
   is cached depends on the value

3  after the speculation is squashed, recover the secret
   by timing accesses to that array — the one cached
   line is fast, the rest are slow`)}
<p>Step 2 is the elegant and alarming part. The secret is never read architecturally; it is used as an address, and the <em>address</em> is what survives, in the cache. Step 3 is an ordinary cache side channel — Flush+Reload, Prime+Probe — that had been known for years and was regarded as a niche concern about cryptographic implementations.</p>

<h3>The two originals</h3>
<p><span class="term-def">Spectre variant 1</span>, bounds check bypass:</p>
${F(`if (i < array1_size)              ← predicted TAKEN
    y = array2[array1[i] * 4096];  ← runs speculatively
                                     with an out-of-range i

array1[i] reads out of bounds — the permission and bounds
outcome is not resolved yet. Its VALUE selects which line
of array2 is fetched. The branch then resolves wrong and
everything is squashed — except the cached line.`)}
<p>Nothing here crosses a privilege boundary in the architectural sense. The attacker trains the predictor with in-range values so it predicts taken, then supplies an out-of-range index. This is why it affects sandboxes and JIT-compiled code so directly: a JavaScript engine's bounds check is exactly this pattern, and the attacker controls the training.</p>
<p><span class="term-def">Meltdown</span> was different and, briefly, worse. On affected Intel processors the permission check on a load was resolved late — the data was returned to dependent instructions before the fault was raised at retirement. So a user-mode load of a kernel address would eventually fault, and in the meantime the value could be used to index an array. Since the kernel is mapped into every process (see the <code>os</code> subject), that read the entire kernel address space, and through it all of physical memory.</p>
<p>The distinction is worth keeping: Meltdown was a specific implementation error — a permission check that should have gated the data forwarding — and was fixed in hardware. Spectre is not an error in that sense. It is a consequence of speculation working as designed, which is why it has proved so much harder to eliminate.</p>

<h3>The family</h3>
<p>What followed established the pattern as general rather than isolated:</p>
<ul>
<li><span class="term-def">Spectre v2</span>, branch target injection — poison the indirect branch predictor so a victim speculatively jumps to an attacker-chosen gadget.</li>
<li><span class="term-def">Speculative store bypass</span> — a load speculatively bypasses an older store whose address is not yet known, and reads stale data.</li>
<li><span class="term-def">L1TF, MDS, and the microarchitectural buffer family</span> — data forwarded from fill buffers, store buffers and load ports, leaking across threads and across virtual machines.</li>
<li>And a continuing stream since, because the underlying pattern — any microarchitectural resource shared across a trust boundary and observable through timing — describes a large fraction of a modern core.</li>
</ul>

<h3>What it cost to mitigate</h3>
<p>The mitigations are instructive because they map onto the mechanism:</p>
${F(`Meltdown    kernel page-table isolation: stop mapping the
            kernel into user page tables. Every syscall now
            switches page tables — which is why the os
            subject's syscall cost went up in 2018.

Spectre v2  retpoline, or hardware IBRS/eIBRS: prevent the
            indirect predictor being used across domains.

Spectre v1  no general fix. Individual gadgets are patched
            with a speculation barrier or an index mask
            (array_index_nospec), found by audit.

shared      flush buffers on context switch; disable SMT
resources   where siblings cross a trust boundary (a10).`)}
<p>The costs were real — single-digit to double-digit percentages depending on workload, worst for syscall-heavy code — and they arrived as a software update that made existing machines slower. That is an unusual event, and it is the clearest demonstration available that microarchitecture is not an implementation detail.</p>

<h3>What it means for the contract</h3>
<p>The lesson is not that speculation was a mistake. It is that the ISA contract of a1 was <em>incomplete</em>: it specified results and said nothing about timing, and for thirty years nobody needed it to. Once an attacker can time an operation precisely, the microarchitecture is part of the interface whether it was specified or not.</p>
<p>The responses now under way follow from that:</p>
<ul>
<li>Architectures beginning to specify what must <em>not</em> be observable, rather than only what must be computed — speculation barriers and data-independent-timing modes as documented guarantees.</li>
<li>Isolation moved to boundaries the hardware actually enforces: separate processes rather than in-process sandboxes, which is why browsers responded with site isolation rather than only with patched bounds checks.</li>
<li>Removing the timers: reducing timer resolution and adding jitter in browsers, which raises the cost of step 3 without addressing steps 1 and 2.</li>
<li>Constant-time programming, previously a cryptographic discipline, becoming a general one for anything handling secrets.</li>
</ul>
${W(`The through-line of this whole subject closes here. Every technique in it — pipelining, prediction, out-of-order execution, caching, prefetching, coherence, SMT — buys speed by doing something other than what the program literally said, on the assumption that only the results are observable. That assumption held for as long as nobody was measuring. The machine's behaviour was always part of its interface; it simply had not been written down.`)}`,
                facts: [
                    "Speculation was assumed safe because discarded work leaves no architectural trace — but timing is not architectural state, and a squashed load still fills a cache line.",
                    "Every transient-execution attack has three parts: induce wrong speculation, encode a secret into microarchitectural state as an address, then recover it by timing.",
                    "The secret is never read architecturally; it is used as an index, and which cache line was fetched is what survives.",
                    "Spectre v1 bypasses a bounds check after training the predictor, which is why JIT sandboxes are directly exposed — the attacker controls the training.",
                    "Meltdown was a distinct implementation error: the permission check was resolved after the data was forwarded, so a user load of a kernel address leaked its value. It was fixed in hardware.",
                    "Spectre is not an error in that sense — it is speculation working as designed, which is why there is no general fix for variant 1 and gadgets are patched individually.",
                    "Kernel page-table isolation is why syscalls became measurably more expensive in 2018: the kernel is no longer mapped into user page tables.",
                    "The mitigations arrived as a software update that made existing machines slower, which is the clearest demonstration that microarchitecture is not an implementation detail.",
                    "The ISA contract was incomplete rather than wrong: it specified results and said nothing about timing, and nobody needed it to until someone measured.",
                    "The responses are architectural guarantees about observability, isolation at boundaries hardware enforces, coarser timers, and constant-time programming beyond cryptography."
                ] }
        ] }
];
//# sourceMappingURL=curriculum.js.map