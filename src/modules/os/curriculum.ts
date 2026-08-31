import type { Level } from "../../types.js";
import { F, W } from "../../helpers.js";

/**
 * Operating systems curriculum. English, like `dsys` and `crypto`, and for the
 * same reason: the vocabulary is the manual pages' and the kernel's, and a
 * reader who learns it in translation cannot then read strace output, a
 * perf profile, or the fsync man page that tells them their durability
 * assumption is wrong.
 *
 * The through-line is that an operating system is a set of illusions
 * maintained on hardware that offers none of them, and that every expensive
 * bug in this subject is somewhere the illusion leaks. Each module ends at
 * the leak rather than at the abstraction.
 */
export const levels: Level[] = [

{ name:"Level 0 · The boundary", mods:[

{id:"o1", t:"Kernel mode, user mode, and the trap", calc:null,
 blurb:"An operating system sells three illusions: one CPU that looks like many, scattered physical memory that looks like a private contiguous address space, and a block device that looks like a tree of named files. Everything else follows from how those are enforced.",
 body:`
<h3>The three illusions</h3>
<p>A computer offers a processor that executes one instruction stream, a physical memory that is a flat array of bytes shared by everything, and a disk that is a numbered array of blocks. It offers no processes, no address spaces and no files. Those are all inventions, maintained in software, and the operating system is the software that maintains them.</p>
${F(`hardware offers              the OS presents

one instruction stream       many processes, each believing it
                             has the machine to itself

one physical memory          one private, contiguous address
                             space per process

an array of numbered blocks  a tree of named files with
                             permissions and sizes`)}
<p>Stating it this way is not a pedantic flourish. It predicts where the difficult bugs are, because an illusion has to be enforced, enforcement costs something, and the cost is visible from the other side. A process that believes it has the CPU to itself still loses its cache contents at every context switch (o2). A process with a private contiguous address space still takes a page fault when the illusion has to be constructed (o5). A file that looks like a byte array still lands on hardware with erase blocks (o12). The rest of this subject is those leaks, one at a time.</p>

<h3>Two modes, and why the hardware has to help</h3>
<p>Software cannot restrain software. If the operating system were merely another program, a process could jump into its code, rewrite its tables, or simply refuse to give the CPU back. So the enforcement lives in the processor, which has at minimum two modes:</p>
<ul>
<li><span class="term-def">Kernel mode</span> (ring 0 on x86) — every instruction is permitted. Change the page tables, mask interrupts, touch device registers, halt the machine.</li>
<li><span class="term-def">User mode</span> (ring 3) — the privileged instructions fault instead of executing, and memory access goes through the page tables the kernel installed.</li>
</ul>
<p>x86 defines four rings and mainstream systems use two, because two is what the model needs and the intermediate rings do not map onto anything an operating system wants to express. Hardware virtualization later added a mode <em>beneath</em> ring 0 for hypervisors, which is module o13.</p>
<p>The consequence to hold onto: <strong>the mode bit is the security boundary.</strong> Everything else — file permissions, process isolation, containers — is a policy the kernel implements, and every one of those policies is void if a user-mode process can get the processor into kernel mode. That is what "privilege escalation" names, and why a kernel bug outranks any application bug.</p>

<h3>The trap</h3>
<p>A user process that needs privileged work done cannot call the kernel. A call is a jump, and a jump into kernel code while still in user mode either faults or, if it did not, would defeat the entire arrangement. So the transition is not a call but a <span class="term-def">trap</span>: an instruction that simultaneously raises the privilege level and transfers control to an address the process does not choose.</p>
${F(`user process              hardware                   kernel

syscall number in a
register, arguments
in registers
     │
  SYSCALL  ─────────▶  switch to ring 0
                       load the kernel stack
                       jump to the address in
                       the syscall MSR
                                                   ─▶  dispatch on the
                                                       syscall number
                                                       validate arguments
                                                       do the work
                       switch back to ring 3   ◀──     return value in a
     ◀───────────────  restore the user stack          register`)}
<p>The address is the point. At boot, the kernel installs the trap handler's address in a register the hardware consults and user mode cannot write. The process supplies a <em>number</em> selecting which service it wants — and a number is data, checked against a table, not a destination. That is the whole safety argument for the interface: the caller says what it wants, never where to go.</p>
<p>Three consequences worth carrying forward:</p>
<ul>
<li>Arguments must be <span class="term-def">copied</span> across the boundary, not shared. A pointer from user space is an untrusted integer: it may point into the kernel, may be unmapped, and may be changed by another thread between the check and the use. Kernels use dedicated accessors for this, and forgetting one is a classic vulnerability.</li>
<li>A system call is <span class="term-def">not a function call</span>, even though the C library wraps it in one. <code>getpid()</code> looks like <code>abs()</code> and costs orders of magnitude more.</li>
<li>The same mechanism handles interrupts and faults. A timer interrupt, a page fault and a <code>write()</code> all enter the kernel the same way; they differ in what caused the entry, not in the machinery. That is how the kernel regains control from a process that never calls it (o2).</li>
</ul>

<h3>What crossing costs</h3>
<p>The direct cost of a syscall on a modern x86 machine is on the order of a hundred nanoseconds to a microsecond — hundreds to thousands of cycles — against roughly one nanosecond for a function call. The exact figure is not the point and moves with every kernel version; the ratio is the point.</p>
<p>Two things make it worse than a simple mode switch:</p>
<ul>
<li><span class="term-def">Indirect cost.</span> The kernel runs with its own working set, so the return to user mode finds a colder cache, colder branch predictors and, if the page tables were switched, a colder TLB. That cost is paid after the syscall returns and does not show up in a measurement bracketing the call itself.</li>
<li><span class="term-def">Speculative-execution mitigations.</span> The 2018 Meltdown and Spectre disclosures forced kernel page-table isolation and various barriers on the entry and exit paths, which raised syscall cost substantially — in some workloads by a factor that mattered more than any application change made that year.</li>
</ul>
<p>Which is why the interface has spent thirty years learning to cross less often. <span class="term-def">Buffered I/O</span> in the C library exists so that a thousand <code>printf</code> calls become one <code>write</code>. The <span class="term-def">vDSO</span> maps a small kernel-provided page into every process so that <code>clock_gettime</code> can read a timestamp without trapping at all. <span class="term-def">io_uring</span> replaces per-operation syscalls with shared memory ring buffers that batch submissions and completions (o12). Every one of these is the same optimisation: amortise the boundary.</p>
${W(`"Is this a system call?" is the first question to ask of any hot loop, and the profiler will not always tell you — a library call that traps looks like a library call in the source. <code>strace -c</code> counting syscalls, or <code>perf</code> separating user from kernel time, answers it directly, and the answer is regularly that the program is spending most of its life crossing a boundary it did not know it was crossing.`)}

<h3>How much belongs inside</h3>
<p>Given that the boundary is expensive and that code inside it runs unrestrained, how much should be in there? This is the oldest structural argument in the field and it has not been settled so much as compromised.</p>
${F(`monolithic   drivers, filesystems, network stack, scheduler —
             all in kernel mode, all one address space.
             Fast: a filesystem calling a driver is a function
             call. Fragile: any bug is a kernel bug.
             Linux, BSD, Windows in practice.

microkernel  the kernel does address spaces, threads and IPC,
             and little else. Drivers and filesystems are
             ordinary user processes. Robust: a driver crash
             restarts a process. Slower: that same call is now
             an IPC round trip.
             seL4, QNX, MINIX 3.`)}
<p>The microkernel argument was never wrong about isolation — it is right, and a verified microkernel is the only kind of kernel anyone has managed to formally verify. It lost on performance in the 1980s and 1990s, and the field settled on monolithic kernels with escape hatches: loadable modules, filesystems in user space via FUSE, drivers in user space via UIO and VFIO, and — most consequentially — moving the isolation boundary <em>outward</em> to the virtual machine (o13) rather than inward to the microkernel.</p>
<p>The other durable idea from this argument is worth naming on its own. <span class="term-def">Separate mechanism from policy</span>: the kernel should provide the means to do something and leave the decision of what to do to a replaceable layer. The kernel provides context switching; which process runs next is the scheduler's policy, and Linux has replaced that policy wholesale several times without changing the mechanism (o3). Where the two are entangled, every change to the decision means changing privileged code.</p>`,
 facts:[
 "An OS sells three illusions — many CPUs, a private contiguous address space, and a tree of named files — on hardware that offers one instruction stream, one flat memory and an array of numbered blocks.",
 "Software cannot restrain software, so the enforcement is in the processor: kernel mode may execute anything, user mode faults on privileged instructions.",
 "The mode bit is the security boundary. Every other isolation guarantee is a kernel policy and is void if a process reaches kernel mode.",
 "A syscall is a trap, not a call: the caller supplies a number selecting a service, never an address to jump to, and the kernel installed the handler's address at boot.",
 "User pointers are untrusted integers that may be unmapped, may point into the kernel, and may change between the check and the use — arguments are copied, never shared.",
 "A syscall costs hundreds of nanoseconds against about one for a function call, plus an indirect cost in cold caches and TLB that is paid after it returns.",
 "Buffered I/O, the vDSO and io_uring are all the same optimisation: cross the boundary less often.",
 "Monolithic kernels make a filesystem-to-driver call a function call and any bug a kernel bug; microkernels make it an IPC round trip and a driver crash a restartable process.",
 "Separate mechanism from policy: the kernel switches contexts, the scheduler decides who runs, and Linux has replaced the second several times without touching the first."
 ]}

]},

{ name:"Level 1 · Virtualizing the CPU", mods:[

{id:"o2", t:"Processes, threads and context switches", calc:null,
 blurb:"The illusion is that each program has the machine to itself. It is maintained by saving one program's state, loading another's, and doing it fast enough that nobody notices — and the part nobody budgets for is what the switch does to the caches.",
 body:`
<h3>What a process is</h3>
<p>A <span class="term-def">process</span> is a program in execution, together with everything the kernel must remember to stop it and resume it as though nothing happened. The list is short and worth knowing exactly, because it is also the list of what a context switch costs:</p>
${F(`registers, including the program counter and stack pointer
the address space — the page tables (o4)
open file descriptors (o10)
credentials: user and group ids
signal handlers and the pending signal mask
the current working directory, the umask
accounting: cpu time used, scheduling priority`)}
<p>The kernel keeps this in a <span class="term-def">process control block</span> — <code>task_struct</code> on Linux — and the set of them is what <code>ps</code> reads. A process moves between a small number of states, and the distinction between two of them is where most operational confusion lives:</p>
${F(`RUNNING    on a CPU right now
READY      able to run, waiting for a CPU
BLOCKED    waiting for something that is not a CPU — I/O,
           a lock, a child, a signal
ZOMBIE     exited, but its parent has not collected the
           exit status yet`)}
<p><span class="term-def">Ready</span> and <span class="term-def">blocked</span> are the pair that matters. A machine at 100% CPU with everything ready is short of CPU; a machine at 5% CPU with everything blocked is short of something else, and adding cores will do nothing at all. Load average on Linux famously counts both — it includes uninterruptible-sleep tasks waiting on disk — which is why a high load average on an idle-looking machine usually means storage, not compute.</p>
<p><span class="term-def">Zombies</span> are the state people meet first and misunderstand. A zombie occupies no memory and no CPU; it is a few hundred bytes holding an exit status that nobody has read. Thousands of them are not a resource leak so much as a symptom: the parent is not calling <code>wait()</code>. In a container, this is what happens when a process that was never designed to be PID 1 becomes PID 1 and does not reap the children it inherits (o13).</p>

<h3>fork and exec, and why they are two things</h3>
<p>Unix creates a process by cloning the caller and then, usually, replacing its image:</p>
${F(`fork()   duplicate the calling process. Returns 0 in the
         child and the child's pid in the parent — one call,
         two returns.
exec()   replace this process's memory image with a program
         from disk. Same pid, same fds, everything else gone.`)}
<p>Splitting it in two looks wasteful and is the design's best feature: between the fork and the exec, the child is running with the parent's privileges and can adjust anything it likes before the new program appears. Redirecting stdout to a file, closing descriptors, changing directory, dropping privileges — all of it happens in that window, with ordinary code rather than a hundred flags on a spawn call. A shell pipeline is exactly this.</p>
<p>Duplicating an address space to throw it away would be ruinous, so it is not duplicated. <span class="term-def">Copy-on-write</span> maps the parent's pages into the child read-only and duplicates a page only when one of them writes to it. A fork is therefore roughly the cost of copying the page tables, and if the child execs immediately, almost no page is ever copied.</p>
${W(`Copy-on-write has a memory-accounting consequence that bites in production: a large process that forks appears to double its memory in some tools, because both processes map the pages, while the machine's actual usage barely moves. It has a worse one too — a forking process whose child is long-lived will pay for a copy the first time <em>either</em> side writes to a page, so a garbage collector that touches every object, or a reference count in an object header, can un-share an entire heap that was supposed to stay shared.`)}
<p>And <code>fork()</code> in a threaded program is a trap. Only the calling thread exists in the child; every other thread is gone, and any lock they held is still held, by nobody. If one of those was the allocator's lock, the child deadlocks the first time it calls <code>malloc</code>. Between fork and exec in a threaded process, only async-signal-safe functions are legal. This is why <code>posix_spawn</code> exists, and why modern code should reach for it.</p>

<h3>Threads</h3>
<p>A <span class="term-def">thread</span> is a separate register set and stack sharing one address space. Everything that made processes safe — separate page tables, separate descriptors — is exactly what threads give up, and the trade is stated in one line:</p>
${F(`processes   isolated by the hardware. Communication is
            explicit: pipes, sockets, shared memory
            segments. A crash kills one.

threads     share everything by default. Communication is
            free — a pointer. A crash kills all of them,
            and every shared write is a potential race (o7).`)}
<p>On Linux the distinction is thinner than the vocabulary suggests: both are created by <code>clone()</code>, and what differs is which resources are flagged as shared. A thread is a task that shares its address space and descriptor table; a process is one that does not. The scheduler does not care which it is looking at.</p>

<h3>The context switch, and the part that is not on the invoice</h3>
<p>To switch, the kernel saves the outgoing task's registers into its control block, loads the incoming task's, and — if the two are in different processes — switches page tables. The direct cost is small and well-defined: on the order of one to a few microseconds.</p>
<p>The indirect cost is larger and arrives later.</p>
<ul>
<li><span class="term-def">Cache pollution.</span> The incoming task evicts the outgoing task's data from L1, L2 and often L3. When the first task runs again, its working set has to be fetched from memory at roughly a hundred nanoseconds per line. For a task with a megabyte of live working set, this dominates the switch itself by an order of magnitude.</li>
<li><span class="term-def">TLB flush.</span> Switching address spaces invalidates cached address translations (o4). Hardware address-space identifiers — PCID on x86 — avoid the full flush, which is why they were added; without them every switch also throws away the translations.</li>
<li><span class="term-def">Branch predictor state</span> is shared and gets trained by whoever ran last.</li>
</ul>
<p>So the honest model is that a context switch costs a few microseconds of kernel time <em>plus</em> a cache reload that is charged to the next timeslice and is invisible in any measurement of the switch. This is the whole argument for the designs that avoid switching: thread pools sized to the core count rather than to the request count, event loops, <code>SO_REUSEPORT</code> with per-core accept queues, and pinning threads to cores so their caches survive.</p>
<p>It is also the argument against the reflex of adding threads. Ten thousand threads on eight cores do not run ten thousand things at once; they run eight things at once and spend a great deal of the machine deciding which eight, with every switch discarding the cache state the previous one had just built.</p>

<h3>Voluntary and involuntary</h3>
<p>A switch happens for one of two reasons, and separating them is the most useful diagnostic in this module.</p>
${F(`voluntary     the task blocked — it asked for I/O, waited
              on a lock, slept. It gave up the CPU.

involuntary   the timer interrupt fired and the scheduler
              preempted it. It wanted to keep running.`)}
<p>Linux reports both per task in <code>/proc/&lt;pid&gt;/status</code> and per process in <code>getrusage</code>. A high voluntary count means the program is waiting on something — find out what. A high involuntary count means it is CPU-bound and contending with other runnable work — the machine is oversubscribed. The two call for opposite responses, and the aggregate figure that most monitoring reports cannot distinguish them.</p>`,
 facts:[
 "A process is a program plus everything the kernel must restore to resume it: registers, address space, descriptors, credentials, signal state and accounting.",
 "Ready and blocked are the states that matter operationally — ready means short of CPU, blocked means short of something else, and adding cores only helps the first.",
 "Linux load average counts uninterruptible-sleep tasks too, so a high load average on an idle-looking machine usually means storage rather than compute.",
 "fork and exec are separate so that the child can adjust redirections, descriptors and privileges in between, with ordinary code rather than spawn flags.",
 "Copy-on-write makes fork cheap, but the first write to a shared page pays for it — a GC or a refcount in an object header can un-share an entire heap.",
 "fork in a threaded program leaves locks held by threads that no longer exist; only async-signal-safe calls are legal before exec, which is why posix_spawn exists.",
 "A thread shares the address space and descriptors; on Linux both come from clone() and differ only in what is flagged shared.",
 "A context switch costs a few microseconds directly, plus a cache and TLB reload charged to the next timeslice and invisible to any measurement of the switch.",
 "Voluntary switches mean the task blocked; involuntary means it was preempted. The two have opposite remedies and most monitoring reports only the sum."
 ]},

{id:"o3", t:"Scheduling", calc:"sched",
 blurb:"Given more runnable work than cores, something has to choose. Every policy optimises a metric, every metric trades against another, and the ones that look obviously correct fail in a way that has a name.",
 body:`
<h3>The two metrics, and why they fight</h3>
<p>Scheduling is not one problem, because there is no single definition of a good outcome. Two measures cover most of it and they pull in opposite directions:</p>
${F(`turnaround = completion − arrival     how long a job took
                                      overall

response   = first run − arrival      how long before it
                                      reacted at all`)}
<p>A batch compile cares only about turnaround. A text editor cares only about response — nobody measures how long a keystroke takes to "complete", they notice the twenty milliseconds before the character appears. A policy that runs each job to completion in the best possible order has excellent turnaround and appalling response; a policy that switches constantly has excellent response and pays context-switch overhead (o2) out of turnaround. Every scheduler in existence sits somewhere on that line, and the interesting ones move along it depending on what they think a task is.</p>

<h3>The simple policies, and how each fails</h3>
<ul>
<li><span class="term-def">FIFO</span> — run to completion in arrival order. Optimal for nothing, trivial to reason about, and subject to the <span class="term-def">convoy effect</span>: one long job at the head makes every short job behind it wait. Ten one-second jobs behind one hundred-second job average 105 seconds turnaround, against 10 if the long one went last.</li>
<li><span class="term-def">SJF</span> — shortest job first. Provably optimal for average turnaround when all jobs arrive together. Requires knowing job lengths, which nobody does, and starves long jobs when short ones keep arriving.</li>
<li><span class="term-def">STCF</span> — shortest time-to-completion first, the preemptive version. Optimal for average turnaround in general. Same two problems, and it now preempts, so it pays switching cost too.</li>
<li><span class="term-def">Round robin</span> — each runnable task gets a fixed quantum, then goes to the back of the queue. Excellent response, and deliberately <em>bad</em> turnaround: it finishes everything at roughly the same late moment rather than finishing anything early. The quantum is the whole tuning knob — short means responsive and switch-heavy, long means efficient and sluggish.</li>
</ul>
<p>The animation runs the same four jobs under each of these so the convoy and the response/turnaround trade are visible rather than asserted.</p>

<h3>MLFQ: learning the job's type by watching it</h3>
<p>SJF needs to know how long a job will run. The multi-level feedback queue's insight is that you can <em>infer</em> it, because past behaviour predicts future behaviour: a task that used its whole quantum is probably CPU-bound, and one that blocked after two hundred microseconds is probably interactive.</p>
${F(`several queues, highest priority first

1  higher priority runs first
2  equal priority runs round robin
3  a new job starts at the TOP  (optimistically assumed short)
4  a job that uses its whole quantum drops one level
5  every S seconds, move everything back to the top`)}
<p>Rules 3 and 4 do the inference: interactive jobs block before their quantum expires and stay high, CPU-bound jobs sink to the bottom and get long quanta there, which is what they want anyway. The scheduler has approximated shortest-job-first without being told anything.</p>
<p>Rule 5 exists because of two failures the first four have. <span class="term-def">Starvation</span>: enough interactive load and the bottom queue never runs. And <span class="term-def">gaming</span>: a task that issues a pointless I/O just before its quantum expires never uses a full quantum, so it never drops, and it keeps top priority forever. The periodic boost fixes starvation directly; gaming is fixed by accounting for CPU time used <em>across</em> quanta rather than resetting per quantum, so the total is what demotes you.</p>

<h3>Fair-share, which is what you are actually running</h3>
<p>Linux's <span class="term-def">CFS</span> — the Completely Fair Scheduler, from 2007 — took a different framing: rather than priority levels, track how much CPU time each task has received and always run the one that has had the least. Tracked as <em>virtual runtime</em>, which advances more slowly for high-priority tasks, so a "nice" level becomes a weight on the rate at which a task accrues debt rather than a queue to sit in. There is no timeslice as such; a task runs until it is no longer the most-starved.</p>
<p>Linux 6.6 replaced it with <span class="term-def">EEVDF</span> (Earliest Eligible Virtual Deadline First), which keeps the fair-share accounting and adds an explicit deadline so latency-sensitive tasks can be served promptly without being given more total CPU. The direction of travel is worth noting: both are policies, replaced without changing the context-switch mechanism underneath — o1's separation, working as intended.</p>
<p>The practical handles on it are <code>nice</code> for a weight, <code>sched_setaffinity</code> to pin a task to particular cores so its cache survives (o2), and cgroup CPU controls, which is how a container gets a CPU limit (o13).</p>

<h3>Real-time, and priority inversion</h3>
<p>Some work has a deadline that is part of correctness rather than a preference. Real-time policies — <code>SCHED_FIFO</code> and <code>SCHED_RR</code> on Linux — run strictly ahead of every normal task, and a <code>SCHED_FIFO</code> task that never blocks will hold its CPU indefinitely, which is exactly what was asked for and is also how a machine is made unresponsive by one line of code.</p>
<p>The famous failure here is subtler and does not need real-time priorities to appear:</p>
${F(`LOW  holds a lock that HIGH needs
MED  is runnable and does not touch the lock

HIGH blocks on the lock
MED  preempts LOW, because MED outranks LOW
LOW  never runs, so it never releases the lock
HIGH never runs

⇒ a medium-priority task has blocked a high-priority one
  indefinitely, through a lock it never touched`)}
<p>This is <span class="term-def">priority inversion</span>, and it is not hypothetical: it is what repeatedly reset the Mars Pathfinder lander in 1997, days into the mission, and was diagnosed and fixed remotely by enabling priority inheritance in the VxWorks mutex. The fixes are:</p>
<ul>
<li><span class="term-def">Priority inheritance</span> — a task holding a lock temporarily inherits the priority of the highest-priority task waiting for it, so LOW outranks MED until it releases.</li>
<li><span class="term-def">Priority ceiling</span> — a lock carries the highest priority of any task that may take it, and a holder is raised to that immediately.</li>
</ul>
${W(`Priority inversion needs only three tasks, a shared lock and any priority difference — including the ordinary <code>nice</code> differences and the implicit ones a container's CPU quota creates. It presents as a high-priority task mysteriously stalling with the machine not busy, and it is invisible in a CPU profile because the stalled task is not running.`)}

<h3>Multicore, which changes the question</h3>
<p>With more than one CPU the scheduler is no longer choosing a task; it is choosing a task <em>and a core</em>, and the second choice matters as much as the first. A task resumed on the core it last ran on finds its data still in that core's cache — <span class="term-def">cache affinity</span> — and a task migrated to an idle core on another socket finds nothing, and pays a memory round trip for its entire working set, plus <span class="term-def">NUMA</span> penalties if its memory is attached to the socket it left (o14).</p>
<p>So a multicore scheduler balances two things that conflict: keeping every core busy, and not moving anything. Linux's load balancer therefore migrates reluctantly, in a hierarchy that reflects the machine's topology — cheap between hyperthreads on a core, more expensive across a socket. Which means an idle core next to a queued task is not necessarily a bug; it may be the scheduler correctly declining to destroy a working set for one timeslice of work.</p>`,
 facts:[
 "Turnaround and response are different metrics that trade against each other: batch work wants the first, interactive work wants the second, and no policy maximises both.",
 "FIFO suffers the convoy effect — one long job at the head delays every short job behind it, and the average turnaround difference is an order of magnitude.",
 "SJF and STCF are optimal for average turnaround and unimplementable as stated, because they require knowing job lengths and they starve long jobs.",
 "Round robin buys response and deliberately sacrifices turnaround; the quantum is the entire tuning knob and trades responsiveness against switch overhead.",
 "MLFQ infers job type from behaviour: start at the top, drop a level for using a full quantum, and boost everything periodically to prevent starvation.",
 "Accounting CPU time across quanta rather than per quantum is what stops a task gaming MLFQ by issuing a pointless I/O before each quantum expires.",
 "CFS runs whichever task has received least CPU, with nice as a weight on virtual runtime; Linux 6.6 replaced it with EEVDF, which adds a deadline for latency-sensitive tasks.",
 "Priority inversion needs three tasks and one lock: a medium task preempts the low task holding the lock a high task needs. Priority inheritance is the fix, and it is what was patched remotely on Mars Pathfinder.",
 "On multicore the scheduler picks a core as well as a task, and migrating destroys cache affinity — so an idle core beside a queued task can be correct behaviour."
 ]}

]},

{ name:"Level 2 · Virtualizing memory", mods:[

{id:"o4", t:"Address spaces and paging", calc:"xlate",
 blurb:"Every address your program uses is a lie the hardware maintains. The translation is a tree walk on every single memory access, which would be ruinous — so there is a cache for it, and that cache is one of the most consequential objects in the machine.",
 body:`
<h3>Why not just use physical addresses</h3>
<p>Early machines did, and three problems made it untenable. Programs had to be linked for the address they would occupy, so nothing could be relocated. Any program could read and write any other's memory, so there was no protection. And memory had to be allocated contiguously, so it fragmented into unusable gaps.</p>
<p>The fix is a level of indirection: the program emits <span class="term-def">virtual addresses</span>, and hardware translates each one to a <span class="term-def">physical address</span> using tables the kernel controls. Every one of the three problems dissolves at once. Every program can be linked for the same addresses. A translation that does not exist is a fault, so isolation is automatic. And contiguity is only required in the virtual space, which is free.</p>

<h3>Pages</h3>
<p>Translating individual bytes would need a table entry per byte. So memory is divided into fixed-size <span class="term-def">pages</span> — 4 KiB on x86-64, the same on most architectures — and only the page number is translated. The offset within the page passes through unchanged.</p>
${F(`48-bit virtual address, 4 KiB pages, x86-64:

  47            39 38          30 29          21 20        12 11         0
 ┌───────────────┬──────────────┬──────────────┬─────────────┬───────────┐
 │  PML4 index   │  PDPT index  │   PD index   │   PT index  │  offset   │
 │    9 bits     │    9 bits    │    9 bits    │    9 bits   │  12 bits  │
 └───────────────┴──────────────┴──────────────┴─────────────┴───────────┘

  4 KiB page  = 2¹² bytes  ⇒ 12 offset bits
  512 entries per level = 2⁹  ⇒ 9 index bits each`)}
<p>Note where those numbers come from, because it is the arithmetic the calculator does. A page table is itself one page, 4 KiB; an entry is 8 bytes; so a table holds 512 entries, and 512 is 2⁹, giving nine index bits per level. Four levels of nine bits plus twelve offset bits is 48, which is exactly the virtual address width x86-64 shipped with. Nothing here is arbitrary — the geometry falls out of the page size. Five-level paging, adding a fifth index, extends this to 57 bits for machines with enough memory to need it.</p>

<h3>Why the table is a tree</h3>
<p>A single flat table for a 48-bit space at 4 KiB pages would need 2³⁶ entries — 512 GiB of table, per process, to describe an address space that is almost entirely empty. The tree exists to avoid storing the empty parts: a null entry at the top level elides the entire 512 GiB subtree beneath it. A process using a few megabytes needs a handful of table pages.</p>
<p>Each entry holds a physical frame number and flags that do most of the interesting work in this subject:</p>
${F(`present     is it mapped at all?  0 ⇒ page fault (o5)
writable    a store to a read-only page faults — which is
            how copy-on-write is implemented (o2)
user        may ring 3 touch it? Clearing this on kernel
            pages is what stops a process reading the kernel
accessed    set by hardware on any access — the input to
            page replacement (o5)
dirty       set by hardware on a write — decides whether
            eviction must write the page back
NX          no-execute: a store to a data page cannot then
            be jumped to`)}
<p>Two of these deserve emphasis. <span class="term-def">Accessed and dirty</span> are set by the hardware and cleared by the kernel, and that one bit of hardware cooperation is what makes practical page replacement possible at all. And the <span class="term-def">writable</span> bit is not just protection — deliberately marking a page read-only so that writing it traps is a general technique: copy-on-write, dirty-page tracking for live migration and for garbage collectors, and memory watchpoints all work this way.</p>

<h3>The TLB, which is the whole performance story</h3>
<p>Translation as described costs four memory accesses before the access you wanted — a five-fold slowdown on every load and store. It is saved by a cache: the <span class="term-def">translation lookaside buffer</span>, a small fully-associative cache of recent translations, consulted before the walk.</p>
${F(`TLB hit    translation in ~1 cycle, then the access
TLB miss   walk the tree — up to 4 memory accesses, though
           upper levels are usually cached — then the access

typical size: tens of L1 entries, ~1000–2000 across L2
coverage:     1500 entries × 4 KiB ≈ 6 MB of memory`)}
<p>That last line is the one with consequences. A working set larger than the TLB's coverage misses on translations no matter how well it fits in the data caches, and the misses are invisible to any tool reporting cache hit rates. A program walking a 100 MB hash table at random can be TLB-bound rather than memory-bound, and the symptom is a program that is slow with excellent-looking cache statistics.</p>
<p>Which is what <span class="term-def">huge pages</span> address. A 2 MiB page uses one entry where 512 would be needed, so the same TLB covers 512 times as much memory — the same 1500 entries now cover 3 GiB. The cost is internal fragmentation and a coarser granularity for everything the flags do. Linux offers explicit hugetlbfs and a <span class="term-def">transparent huge pages</span> mechanism that promotes 4 KiB pages automatically; the latter is convenient and has a long history of latency spikes, because compacting memory to produce a 2 MiB contiguous region can stall the faulting process. Databases routinely disable it for exactly that reason.</p>
${W(`The TLB is not coherent across cores. When the kernel changes a mapping, every other core that might have cached the old translation must be told to discard it — a <span class="term-def">TLB shootdown</span>, delivered as an inter-processor interrupt, which the initiating core then waits for. It costs microseconds and scales with the core count, which is why <code>munmap</code> and <code>mprotect</code> in a heavily threaded process on a large machine are far more expensive than their descriptions suggest.`)}

<h3>What an address space actually contains</h3>
<p>The mappings are not one region but many, each with its own flags and backing:</p>
${F(`high  ┌────────────────┐
      │ kernel         │  mapped, but user bit clear
      ├────────────────┤
      │ stack          │  grows down, guard page below
      │      ↓         │
      │                │
      │      ↑         │
      │ mmap region    │  shared libraries, file mappings,
      │                │  large mallocs
      │      ↑         │
      │ heap (brk)     │  grows up
      ├────────────────┤
      │ bss            │  zero-initialised
      │ data           │  initialised globals
      │ text           │  the code — read-only, executable
low   └────────────────┘  page 0 unmapped, so *NULL faults`)}
<p>Several familiar behaviours are visible directly in that picture. A null pointer dereference is a segmentation fault because page zero is deliberately left unmapped. A stack overflow is a fault on the guard page below the stack. The kernel is mapped into every process — so that a syscall does not need a page-table switch — and kept inaccessible by the user bit alone, which is precisely the arrangement Meltdown broke, forcing kernel page-table isolation and the syscall cost of o1.</p>
<p>The whole layout is randomised per execution — <span class="term-def">ASLR</span> — so that an attacker who can corrupt memory cannot predict what to point at.</p>

<h3>Sharing, which falls out for free</h3>
<p>Two page table entries in different processes may hold the same physical frame. That single fact provides:</p>
<ul>
<li><span class="term-def">Shared libraries.</span> One physical copy of libc, mapped into every process. Its read-only text is shared; its writable data is copy-on-write.</li>
<li><span class="term-def">Copy-on-write fork</span> (o2), which is the same mechanism plus the writable bit.</li>
<li><span class="term-def">Shared memory</span> and <code>mmap(MAP_SHARED)</code> — the fastest IPC there is, because after setup there is no kernel involvement at all.</li>
<li><span class="term-def">The page cache</span> (o10): a file's pages exist once in memory and are mapped into every process that mapped the file, which is why <code>mmap</code> of a file read by many processes costs one copy.</li>
</ul>`,
 facts:[
 "Virtual addressing solves relocation, protection and fragmentation at once, by putting a kernel-controlled translation between the program's addresses and the hardware's.",
 "The paging geometry falls out of the page size: a 4 KiB table of 8-byte entries holds 512 = 2⁹ entries, so nine index bits per level, four levels plus twelve offset bits = 48.",
 "The page table is a tree so the empty parts cost nothing — a flat 48-bit table would need 512 GiB per process.",
 "Hardware sets the accessed and dirty bits, and that cooperation is what makes practical page replacement possible.",
 "Marking a page read-only so writes trap is a general technique: copy-on-write, dirty tracking for live migration, GC write barriers and watchpoints are all the same trick.",
 "Without a TLB every access would cost four extra memory references. With one, a hit is about a cycle.",
 "TLB coverage is roughly 1500 entries × 4 KiB ≈ 6 MB, so a larger working set is TLB-bound regardless of cache hit rate — and cache statistics will not show it.",
 "Huge pages multiply TLB coverage by 512, at the cost of fragmentation; transparent huge pages can stall a faulting process while compacting, which is why databases disable them.",
 "The TLB is not coherent across cores, so changing a mapping needs a shootdown IPI that scales with core count — munmap and mprotect are expensive on big threaded machines.",
 "Page zero is left unmapped on purpose, which is the entire reason a null dereference is a clean fault rather than a corrupted read."
 ]},

{id:"o5", t:"Demand paging and replacement", calc:"amat",
 blurb:"The address space can be larger than the memory behind it, because a mapping need not have anything behind it until it is touched. That trick pays for itself constantly and fails catastrophically at one specific point.",
 body:`
<h3>The fault as a mechanism, not an error</h3>
<p>A page table entry with the present bit clear causes a <span class="term-def">page fault</span> on access. The word suggests a failure; it is a control transfer. The kernel gets a chance to construct whatever should have been there, install the mapping, and restart the faulting instruction, which then succeeds with the program none the wiser.</p>
<p>That mechanism is doing more work than almost anything else in a running system:</p>
${F(`launching a program   map the executable, load NOTHING.
                      Pages arrive as the code runs, so
                      startup touches only what it uses.

malloc of 1 GiB       return a mapping immediately. Physical
                      memory is attached page by page, on
                      first touch. This is why allocation
                      can succeed and the touch cannot (o6).

mmap of a file        no read() at all; the file's pages
                      arrive on access, from the page cache.

fork                  copy-on-write faults on the first write
                      to each shared page (o2).

stack growth          a fault below the stack extends it.`)}
<p>The critical distinction for anyone reading a monitoring dashboard:</p>
${F(`minor fault   resolved without touching a disk — the page
              was already in memory. A copy-on-write copy,
              a first touch of an anonymous page, a hit in
              the page cache. Cost: microseconds.

major fault   requires reading from storage. Cost: tens of
              microseconds on NVMe, milliseconds on a disk —
              four to five orders of magnitude worse.`)}
<p>Minor faults in the millions are routine and mean nothing is wrong. Major faults are the number to watch, and a rising major fault rate is the single clearest signal that a machine is short of memory — long before any allocation actually fails.</p>

<h3>Replacement, and the policies</h3>
<p>When memory is full and a page is needed, one has to go. If it is clean — unmodified, and identical to what is on disk — it can simply be dropped. If it is dirty it must be written out first, which is why the dirty bit of o4 exists and why eviction cost is not uniform.</p>
<p>Which page to evict is the classic question:</p>
<ul>
<li><span class="term-def">OPT</span> — evict the page that will be used furthest in the future. Provably optimal, requires knowing the future, and exists only as a yardstick: measuring a real policy against OPT on a captured trace tells you how much is left on the table.</li>
<li><span class="term-def">FIFO</span> — evict the oldest. Simple, ignores usage entirely, and evicts the page every process touches constantly if it happened to be loaded first.</li>
<li><span class="term-def">LRU</span> — evict the least recently used. A good approximation of OPT in practice, and unimplementable exactly, because it would need a timestamp update on every single memory access.</li>
<li><span class="term-def">CLOCK</span> — the practical approximation. Pages sit in a ring with a hand sweeping it; hardware sets each page's accessed bit on use. The hand skips and clears any page whose bit is set, and evicts the first page it finds with the bit already clear. That is "not recently used", it costs one bit and no per-access work, and it is what real kernels run, in elaborated forms.</li>
</ul>
<p>Linux runs a two-list variant: pages start on an inactive list and are promoted to an active list on a second reference, so a single sequential scan of a large file cannot evict the working set. That specific defence exists because the naive version has an obvious failure — one <code>grep</code> over a large directory should not empty a database's cache.</p>

<h3>Bélády's anomaly</h3>
<p>More memory should mean fewer faults. For FIFO, it need not:</p>
${F(`reference string   1 2 3 4 1 2 5 1 2 3 4 5

FIFO, 3 frames  →   9 faults
FIFO, 4 frames  →  10 faults      ← more memory, MORE faults`)}
<p>Bélády, Nelson and Shedler found this in 1969. It is not a curiosity about FIFO alone but a statement about a class: policies where the set of pages held with <em>n</em> frames is not guaranteed to be a subset of the set held with <em>n</em>+1 frames can behave this way. LRU and OPT are <span class="term-def">stack algorithms</span> — they do have that containment property — and provably cannot exhibit the anomaly. The animation runs this exact reference string, so the anomaly can be produced rather than taken on faith.</p>

<h3>Working sets and thrashing</h3>
<p>Denning's <span class="term-def">working set</span> is the set of pages a process has touched in the last <em>T</em> of its own execution time — an operational stand-in for "what it needs right now". Programs have working sets because they have locality: loops touch the same code, data structures are traversed repeatedly, and the set is usually far smaller than the total allocation.</p>
<p>Which sets up the failure mode. If the sum of the working sets exceeds physical memory, every process's pages are evicted by other processes before they are reused, so every process faults constantly, and each fault waits on storage.</p>
${F(`working sets fit      →  faults are rare, CPU is the limit
sum slightly exceeds  →  fault rate climbs steeply
sum well exceeds      →  THRASHING: the machine is busy,
                         throughput approaches zero,
                         and CPU utilisation looks LOW`)}
<p>Thrashing is not gradual. Because a major fault is four orders of magnitude slower than a memory access, the transition from "fits" to "does not fit" moves a system from working to unusable across a very small change in load. And the signature is deceptive: CPU utilisation <em>falls</em>, because every process is blocked on storage, so a dashboard watching CPU shows an idle machine while nothing completes. The number that shows it is the major fault rate, or on Linux the pressure-stall information in <code>/proc/pressure/memory</code>, which exists precisely because utilisation does not reveal this.</p>
<p>The only real remedy is to reduce the demand — run less concurrently, or add memory. Swapping harder is not a fix; it is the symptom.</p>

<h3>Swap, and the argument about it</h3>
<p>Swap is disk space used to hold anonymous pages — the ones with no file behind them — so they can be evicted like any other. It is regularly disabled on the theory that swapping is slow, and that reasoning is backwards in a specific way worth understanding.</p>
<p>Without swap, the kernel can still evict <em>file-backed</em> pages, because those can be re-read from the file. So a machine under memory pressure with no swap evicts the page cache and the executables' text pages, and starts taking major faults on <em>code</em> — which is why a swapless machine under pressure often performs worse than one with swap, not better. It cannot evict a cold anonymous page that has not been touched in a day, so it evicts a hot file page instead.</p>
<p>What swap genuinely does not do is rescue a machine whose working set exceeds memory; that is thrashing, and it thrashes either way. The honest position is that a modest amount of swap improves behaviour under mild pressure by widening the kernel's choices, and that no amount of swap fixes real overcommitment.</p>

<h3>Overcommit and the OOM killer</h3>
<p>Because pages are attached on first touch, Linux by default lets the total of all mappings exceed memory plus swap — <span class="term-def">overcommit</span>. It is what makes copy-on-write fork of a large process cheap and what lets a program mmap far more than it will touch. It also means <code>malloc</code> returning non-null is not a promise, and the failure surfaces later at a <em>write to memory that already succeeded</em>.</p>
<p>When that promise cannot be kept, the kernel cannot return an error to anyone — nobody called anything — so it picks a process and kills it. The <span class="term-def">OOM killer</span> scores candidates by memory footprint, adjustable via <code>oom_score_adj</code>.</p>
${W(`The OOM killer selects on footprint, so it usually kills the largest process — which is usually the important one. The database is killed, not the log-rotation script that pushed the machine over. A container hitting its cgroup memory limit gets the same treatment inside that cgroup, which is why a container "just restarting" with no application error in the log is so often an OOM kill; the evidence is in <code>dmesg</code> and the exit code (137), not in the application's own output.`)}`,
 facts:[
 "A page fault is a control transfer, not an error: the kernel constructs the mapping and restarts the instruction, and the program never knows.",
 "Demand paging is what makes program start-up, large mallocs, mmap, copy-on-write fork and stack growth all cheap — nothing is attached until it is touched.",
 "Minor faults are resolved in memory and cost microseconds; major faults reach storage and cost four to five orders of magnitude more. Only the second is a warning sign.",
 "OPT is optimal and needs the future; LRU approximates it and would need work on every access; CLOCK approximates LRU with one hardware-set bit and no per-access cost.",
 "Linux promotes pages to an active list only on a second reference, so one sequential scan of a big file cannot evict the working set.",
 "Bélády's anomaly: FIFO can take more faults with more frames. LRU and OPT are stack algorithms and provably cannot.",
 "Thrashing is not gradual, and its signature is deceptive — CPU utilisation falls because everything is blocked on storage, so the machine looks idle while nothing completes.",
 "Without swap the kernel can still evict file-backed pages, so a swapless machine under pressure takes major faults on executable code instead of on cold anonymous data.",
 "Overcommit means a successful malloc is not a promise; the failure arrives later as an OOM kill on a write, with no error return anywhere.",
 "The OOM killer scores on footprint, so it usually kills the largest process rather than the one responsible — exit code 137 and dmesg are where the evidence is."
 ]},

{id:"o6", t:"Allocators and fragmentation", calc:null,
 blurb:"The kernel hands out pages; programs want seventeen bytes. Everything between those two statements is the allocator, and its two failure modes are opposite and both called fragmentation.",
 body:`
<h3>Two allocators, and which one you are looking at</h3>
<p>There are two layers here and confusing them makes the memory numbers unreadable.</p>
${F(`kernel allocator    hands out PHYSICAL page frames, and
                    within the kernel, objects.
                    buddy system + slab.

user allocator      a library in your process. Gets large
                    regions from the kernel with mmap/brk
                    and carves them into malloc-sized pieces.
                    glibc malloc, jemalloc, tcmalloc, mimalloc.`)}
<p>The user allocator is ordinary library code — it holds no privilege and is replaceable by an environment variable. When a program's memory use is being investigated, the first question is which layer the number came from: <code>RSS</code> is what the kernel has attached, and the allocator's own accounting is what the program asked for. They differ, permanently, and the difference is this module.</p>

<h3>The two fragmentations</h3>
<p>They have similar names and opposite causes, and the distinction is the load-bearing idea here.</p>
${F(`internal   the allocator gave you MORE than you asked for
           and the surplus is unusable.
           ask for 17 bytes, get a 32-byte size class:
           15 bytes wasted, inside your allocation.

external   there IS enough free memory, but no single free
           run is large enough.
           free: 8 | used: 8 | free: 8 | used: 8 | free: 8
           24 bytes free, and a 16-byte request fails.`)}
<p>Every design trades one against the other. Rounding to size classes creates internal fragmentation and eliminates most external fragmentation, because same-sized holes are interchangeable. Allocating exactly what was asked for eliminates internal fragmentation and produces external fragmentation, because the holes are all different and none fits.</p>
<p>Paging (o4) makes external fragmentation of <em>physical</em> memory largely irrelevant, because pages need not be contiguous. It does not help the user-space allocator, whose region is contiguous virtual memory, nor the kernel when it needs physically contiguous memory for DMA — which is why large contiguous kernel allocations can fail on a machine with plenty of free memory.</p>

<h3>The classic strategies</h3>
<ul>
<li><span class="term-def">Free list with first fit</span> — walk until something fits. Fast to allocate, leaves a trail of small holes near the head.</li>
<li><span class="term-def">Best fit</span> — take the smallest adequate hole. Wastes less per allocation and produces many unusably small remainders. Slower: it has to search.</li>
<li><span class="term-def">Segregated lists / size classes</span> — a separate list per size class, so allocation is an index rather than a search. Constant time, some internal fragmentation, and it is what every modern allocator does.</li>
<li><span class="term-def">Buddy system</span> — split memory in halves recursively; each block has a buddy it can be coalesced with by flipping one bit of its address. Coalescing is O(1) and finding neighbours needs no search, which is why Linux allocates physical page frames this way. Internal fragmentation is up to 2× in the worst case, since everything rounds to a power of two.</li>
<li><span class="term-def">Slab</span> — caches of pre-initialised, fixed-size objects for things the kernel allocates constantly (inodes, dentries, task structs). Allocation is a pop from a list, and the object does not need reinitialising. Visible in <code>slabtop</code>, and a large dentry cache is not a leak.</li>
</ul>
<p>Coalescing is the part that is easy to forget and does the real work: without merging adjacent free blocks, any allocator degrades into external fragmentation no matter how it chooses.</p>

<h3>Why free() does not return memory</h3>
<p>The behaviour that generates the most confused bug reports:</p>
${F(`p = malloc(100 MB)     RSS climbs by 100 MB as it is touched
free(p)                RSS does not move`)}
<p>This is correct behaviour, for good reasons. The allocator obtained a region from the kernel and keeps it, because returning it means a syscall (o1), and re-obtaining it means both a syscall and a page fault per page (o5). A program that allocates and frees in a loop would spend its life crossing the boundary. So freed memory returns to the allocator's free lists and is reused for the next request, which is exactly what you want.</p>
<p>Memory does go back sometimes: glibc returns the top of the heap when a large contiguous run is free at the end, and allocations large enough to have been served by their own <code>mmap</code> are unmapped on free. Which produces the frustrating pattern where freeing a large buffer returns memory and freeing a million small ones does not — the small ones are interleaved with live data, so the run is not contiguous.</p>
${W(`A process whose RSS grows and never falls is not necessarily leaking. Distinguish three things before concluding: a leak (the allocator's own accounting also grows), fragmentation (the program's live bytes are stable while RSS is not), and retention by design (the allocator holding freed memory for reuse). <code>malloc_info</code>, jemalloc's statistics or a heap profiler separate them; RSS alone cannot.`)}

<h3>Multithreaded allocation</h3>
<p>A single global free list with a lock around it serialises every allocation in the program, which on a machine with many cores is a hard scaling ceiling (o8). Every modern allocator therefore gives each thread a private cache and takes a lock only when refilling from the shared pool. That is the main reason jemalloc and tcmalloc exist and why swapping the allocator can produce a large speedup with no code change.</p>
<p>The technique has a cost: per-thread caches hold freed memory that other threads cannot use, so memory in flight rises with the thread count — the trade being made deliberately, and one of the reasons the same program's footprint differs between allocators.</p>
<p>The pathological case is a block allocated on one thread and freed on another, repeatedly: the memory has to cross caches every time. Producer–consumer designs hit this by construction, and it is worth knowing before concluding that an allocator is simply slow.</p>

<h3>Arenas, which sidestep the whole problem</h3>
<p>Where a program's allocation lifetimes are known, the general-purpose allocator can be avoided. An <span class="term-def">arena</span> (or region, or bump allocator) allocates by advancing a pointer and frees everything at once by resetting it.</p>
${F(`allocate   p = cursor; cursor += size;      a few cycles
free        — nothing —
reset      cursor = start;                   frees everything`)}
<p>No free lists, no coalescing, no fragmentation within the arena, no per-object bookkeeping, and perfect locality since consecutive allocations are adjacent. The constraint is that individual objects cannot be freed, which fits any workload with a natural boundary: a request handler, a compiler pass, a game frame, a parser. Where it fits, it removes an entire class of problem rather than optimising it.</p>`,
 facts:[
 "The kernel allocator hands out physical frames and kernel objects; the user allocator is unprivileged library code carving up regions it got with mmap or brk.",
 "Internal fragmentation is surplus inside an allocation; external fragmentation is enough total free memory with no single run large enough. Every design trades one for the other.",
 "Paging makes external fragmentation of physical memory mostly irrelevant, but not for the user allocator's contiguous region nor for physically contiguous DMA buffers.",
 "The buddy system coalesces in O(1) because a block's buddy is one address bit away — which is why Linux allocates page frames with it, at up to 2× internal fragmentation.",
 "Slab caches keep pre-initialised fixed-size kernel objects, so allocation is a list pop and no reinitialisation is needed. A large dentry cache is not a leak.",
 "Without coalescing of adjacent free blocks, every allocator degrades into external fragmentation regardless of its fit strategy.",
 "free() usually does not return memory to the kernel, and that is correct: doing so would cost a syscall to release and a fault per page to get back.",
 "Growing RSS is not proof of a leak — distinguish a leak, fragmentation and deliberate retention with allocator statistics, because RSS alone cannot.",
 "Modern allocators give each thread a private cache to avoid a global lock, trading memory in flight for scalability; allocating on one thread and freeing on another defeats it.",
 "An arena allocates by bumping a pointer and frees everything at once, removing fragmentation and bookkeeping entirely wherever lifetimes share a natural boundary."
 ]}

]},

{ name:"Level 3 · Concurrency", mods:[

{id:"o7", t:"Races and the memory model", calc:null,
 blurb:"Threads share an address space, which is the whole point and the whole problem. The hard part is not that operations interleave — it is that neither the compiler nor the processor executes the program you wrote.",
 body:`
<h3>The canonical failure</h3>
<p>Two threads incrementing a shared counter a million times each. The result is not two million, and the reason is that the increment is not one operation:</p>
${F(`counter = counter + 1     compiles to three:

  load   r ← counter
  add    r ← r + 1
  store  counter ← r

thread A  load  (0)
thread B  load  (0)
thread A  add, store (1)
thread B  add, store (1)     ← two increments, one counted`)}
<p>The window is three instructions wide, so the failure is rare — and rare is the problem. It passes every test, survives review, and appears in production at a rate proportional to load, which is exactly when it is hardest to reproduce.</p>
<p>The general shape: a <span class="term-def">critical section</span> is code touching shared state that must not be interleaved, and what is needed is <span class="term-def">mutual exclusion</span> — at most one thread inside at a time. What is wanted underneath is <span class="term-def">atomicity</span>: the operation happens entirely or not at all, with no observable intermediate state.</p>

<h3>Two different things called a race</h3>
<p>These are used interchangeably and are not the same, which matters because the tools differ:</p>
<ul>
<li>A <span class="term-def">data race</span> is precise and mechanical: two threads access the same location, at least one writes, and there is no synchronisation ordering them. In C, C++ and Go this is <em>undefined behaviour</em> — not "you get one value or the other", but no constraint at all on what the program does. Detectable by tools: ThreadSanitizer, Go's race detector, Helgrind.</li>
<li>A <span class="term-def">race condition</span> is about outcomes depending on timing. Check that a file does not exist, then create it; both threads may check first. Every access here can be individually synchronised and the bug remains, because the <em>pair</em> was not atomic. No tool finds these in general — it is a design property.</li>
</ul>
<p>The check-then-act shape is the one to recognise, since it also produces the TOCTOU security bugs of o1 and o10: <code>if (!exists(path)) create(path)</code> is wrong in a way that no amount of locking around each half repairs.</p>

<h3>Nobody runs the program you wrote</h3>
<p>Here is the part that makes intuition fail. Two layers reorder your memory operations, and both are allowed to:</p>
<ul>
<li>The <span class="term-def">compiler</span> reorders, hoists loads out of loops, keeps values in registers and deletes stores it believes redundant. It optimises under the assumption that the code is single-threaded unless told otherwise. A loop spinning on a plain <code>flag</code> variable can be compiled into a load before the loop and an infinite loop after it — a correct transformation, given the assumption.</li>
<li>The <span class="term-def">processor</span> reorders too. Store buffers let a write sit before becoming visible to other cores, so a later load can be observed ahead of an earlier store.</li>
</ul>
${F(`x = y = 0

thread A          thread B
  x = 1             y = 1
  r1 = y            r2 = x

r1 = r2 = 0 is IMPOSSIBLE under any interleaving,
and DOES happen on real x86 hardware.`)}
<p>Every sequential-consistency reading of that program says at least one thread must see the other's store. x86's store buffers permit both to miss, because each store is still buffered when the other's load executes. x86 is one of the <em>stronger</em> models; ARM, POWER and RISC-V reorder considerably more, which is why code that "worked" for a decade breaks on a different architecture.</p>
${W(`This is the reason "I looked at the assembly and it is a single instruction, so it is atomic" is not an argument. Atomicity and ordering are different properties: an aligned single-instruction store is atomic — no other thread sees half of it — and says nothing about <em>when</em> other threads see it, or in what order relative to your other stores.`)}

<h3>What the memory model actually gives you</h3>
<p>Modern languages define this rather than leaving it to the hardware. The contract in C11, C++11, Java and Go is the same shape: <strong>a program free of data races behaves as if sequentially consistent.</strong> Synchronise properly and you may reason with interleavings; race, and you get nothing.</p>
<p>The tools that establish the ordering:</p>
${F(`atomics             operations that are indivisible and
                    carry an ordering constraint
acquire / release   a release store publishes everything
                    written before it; an acquire load that
                    reads it sees all of that
seq_cst             a single total order over all such
                    operations. The default, and the one to
                    use unless you can prove otherwise.
volatile            NOT this. It stops the compiler caching
                    the value and constrains the CPU not at
                    all — useless for cross-thread code in
                    C and C++, and different in Java.`)}
<p>The <code>volatile</code> line is worth stating flatly because the mistake is so common in C and C++: it was designed for memory-mapped device registers, not for threads. In Java, <code>volatile</code> genuinely does carry acquire-release semantics — the same keyword, a different meaning, which is precisely why the confusion persists.</p>

<h3>Compare-and-swap, and the atomicity the hardware gives</h3>
<p>Underneath every lock and every lock-free structure is one hardware primitive:</p>
${F(`CAS(address, expected, new):
    atomically, if *address == expected:
        *address = new;  return true
    else
        return false

typical use:
    do { old = *p; new = f(old); } while (!CAS(p, old, new));`)}
<p>It is expensive relative to a plain access — it must obtain exclusive ownership of the cache line — but far cheaper than a syscall, which is what makes uncontended locking fast (o8). The retry loop is what "lock-free" means: no thread holds anything that could block another, and the system as a whole always makes progress even if an individual thread retries.</p>
<p>The subtlety it hides is the <span class="term-def">ABA problem</span>: a value read as A, changed to B and back to A, passes the comparison while the world it described has changed underneath. Pointer-based lock-free structures deal with this using tagged pointers, hazard pointers or epoch reclamation, and it is the main reason writing lock-free data structures is not the reasonable first choice it appears to be.</p>

<h3>Why concurrency bugs behave the way they do</h3>
<p>The properties that make these expensive are worth naming explicitly, because they dictate the strategy:</p>
<ul>
<li><span class="term-def">Non-deterministic.</span> The same input gives different results depending on timing, so a passing test proves nothing about the next run.</li>
<li><span class="term-def">Heisenberg-like.</span> Adding logging, running under a debugger or building with optimisations off changes the timing and usually hides the bug.</li>
<li><span class="term-def">Load-dependent.</span> They appear under production load and not under test load, because the window is a few instructions wide and only contention makes hitting it likely.</li>
<li><span class="term-def">Silently corrupting.</span> A lost increment does not crash. The damage is discovered much later, in data, with no path back to the cause.</li>
</ul>
<p>Which sets the practical strategy: run ThreadSanitizer in CI, because it finds data races that have not yet manifested; prefer designs that do not share mutable state at all — message passing, immutability, per-thread data merged at the end; and where state must be shared, use the plainest lock that works before reaching for anything clever (o8).</p>`,
 facts:[
 "A shared increment is load, add, store — three instructions wide, so the failure is rare, passes tests, and appears under production load.",
 "A data race is two unsynchronised accesses with at least one write, and is undefined behaviour in C, C++ and Go — not merely an unpredictable value.",
 "A race condition is an outcome depending on timing; check-then-act stays broken however carefully each half is locked, and no tool finds these in general.",
 "The compiler reorders, hoists and caches values in registers because it assumes single-threaded execution unless told otherwise.",
 "The processor reorders too: on real x86, both threads in the store-buffer example can miss each other's write, which no interleaving allows.",
 "Atomicity and ordering are different properties — a single-instruction aligned store is atomic and still says nothing about when others see it.",
 "The language contract is that a data-race-free program behaves as if sequentially consistent. Race, and you get no guarantee at all.",
 "volatile in C and C++ was designed for device registers: it stops the compiler caching a value and constrains the processor not at all. Java's volatile is a different thing with the same name.",
 "Compare-and-swap is the primitive under every lock and lock-free structure, and hides the ABA problem, which is why hand-rolled lock-free code is rarely the right first move.",
 "Concurrency bugs are non-deterministic, load-dependent, hidden by instrumentation and silently corrupting — so the strategy is ThreadSanitizer in CI and designs that do not share mutable state."
 ]},

{id:"o8", t:"Locks, contention and deadlock", calc:"amdahl",
 blurb:"A lock is the standard answer, and it converts a correctness problem into a scaling problem. Both the ceiling it imposes and the way it fails outright are predictable from arithmetic you can do before writing the code.",
 body:`
<h3>What a lock costs when nobody wants it</h3>
<p>The uncontended path is fast, and knowing why explains everything about the contended one. A modern mutex is a <span class="term-def">futex</span> — fast userspace mutex — and its acquisition is a compare-and-swap on a word in user memory. No syscall, tens of cycles.</p>
${F(`uncontended    CAS succeeds. ~20 ns, entirely in user space.

contended      CAS fails ⇒ syscall into the kernel, the
               thread is put on a wait queue and blocks.
               The holder's unlock must then syscall to
               wake a waiter.
               ~1–10 µs, plus a context switch (o2).`)}
<p>Two orders of magnitude between the two paths. So the cost of a lock is not a property of the lock; it is a property of how often two threads want it at once. "Locks are slow" is a statement about contention, not about locks.</p>
<p>Which is why the <span class="term-def">spinlock</span> exists: rather than blocking, spin and retry. Spinning is right when the expected wait is shorter than a context switch and there is another core to make progress — so it is correct in kernels holding a lock for a few instructions, and wrong in user space where the holder can be descheduled while you burn a whole timeslice waiting for a thread that is not running. Adaptive mutexes spin briefly and then block, which is the right default and what most runtimes do.</p>

<h3>The scaling ceiling</h3>
<p>Any serialised section imposes a hard limit on speedup, and it is worth calculating before the parallelism is written.</p>
${F(`Amdahl:   S(N) = 1 / ((1 − p) + p/N)

p = parallel fraction, N = processors

p = 0.95, N = ∞   ⇒  speedup 20×
p = 0.95, N = 32  ⇒  speedup 12.5×
p = 0.99, N = ∞   ⇒  speedup 100×`)}
<p>A 5% serial section caps the whole program at 20×, no matter how many cores are bought. That is the optimistic model, because it assumes coordination is free.</p>
<p>It is not, and the <span class="term-def">Universal Scalability Law</span> adds the term that makes the graph match reality:</p>
${F(`C(N) = N / (1 + α(N−1) + βN(N−1))

α  contention   — serialisation, the Amdahl term
β  coherence    — the cost of keeping N caches agreeing,
                  which grows as N²`)}
<p>The β term is why measured throughput does not merely flatten but <em>turns over</em>: past some core count, adding cores makes the system slower. Anyone who has watched a benchmark peak at twenty threads and decline at forty has measured β. The cause is physical — every core that writes a shared line invalidates it in every other core's cache, and the traffic grows with the square of the participants. The calculator plots both curves so the retrograde region is visible.</p>

<h3>Granularity, and the trap in it</h3>
<p>The standard response to contention is finer-grained locking: one lock per bucket instead of one per table, one per row instead of one per page. It works, up to the point where it does not:</p>
<ul>
<li>More locks mean more acquisitions per operation, and each has a cost even uncontended.</li>
<li>More locks mean more lock <em>ordering</em> to get right, which is the next section.</li>
<li>Each lock occupies space in a cache line, and locks that share one contend invisibly — <span class="term-def">false sharing</span>, o14.</li>
</ul>
<p>Before making locks finer, the better questions are whether the state needs to be shared at all (per-thread data merged at the end has no lock), whether the critical section can be shortened (do the expensive computation outside it, take the lock only to publish), and whether the access pattern is read-mostly, which has better answers than a mutex.</p>
<p>For read-mostly data the options are a <span class="term-def">reader-writer lock</span> — several readers or one writer, which helps when reads dominate and whose own bookkeeping is a shared write, so it does not eliminate coherence traffic — and <span class="term-def">RCU</span>, read-copy-update, where readers take no lock at all and a writer publishes a new version, reclaiming the old one once every pre-existing reader has finished. RCU makes reads nearly free at the cost of complexity and deferred reclamation, and it is used heavily inside Linux for exactly the structures that are read constantly and written rarely.</p>

<h3>Deadlock</h3>
<p>Four conditions must <em>all</em> hold. Break any one and deadlock is impossible — which is the useful framing, because it turns prevention into a choice of which condition to attack:</p>
${F(`1  mutual exclusion   the resource cannot be shared
2  hold and wait        a thread holds one and waits for another
3  no preemption        a resource cannot be taken away
4  circular wait        a cycle exists in the waits-for graph`)}
<p>In practice condition 4 is the one to attack, and the technique is unglamorous and effective: <span class="term-def">define a global lock order</span> and always acquire in it. Order by address, by a documented rank, by anything total. A cycle cannot form in a strictly increasing sequence.</p>
<p>The alternatives, and what each costs:</p>
<ul>
<li><span class="term-def">Attack hold-and-wait</span>: acquire everything at once, or nothing. Requires knowing the full set in advance and reduces concurrency.</li>
<li><span class="term-def">Attack no-preemption</span>: use <code>trylock</code>, and on failure release everything and retry. Introduces livelock — two threads politely backing off forever — unless there is randomised backoff.</li>
<li><span class="term-def">Detect and recover</span>: build the waits-for graph, find cycles, abort a victim. What databases do, because aborting a transaction is a defined operation. Not available to a program with no rollback.</li>
</ul>
${W(`Most real deadlocks do not look like two threads and two mutexes. They involve a lock and something else that waits — a lock plus a bounded queue that is full, a lock held across a network call, a lock held while allocating memory that triggers reclaim. The rule that prevents the whole family is simpler than any ordering scheme: <strong>never block on anything unbounded while holding a lock.</strong>`)}
<p>Adjacent and worth distinguishing: <span class="term-def">livelock</span> is threads actively doing work and making no progress, and <span class="term-def">starvation</span> is one thread never getting the lock because others keep taking it, which is what fair queueing in a mutex prevents at some throughput cost.</p>

<h3>Convoying and the thundering herd</h3>
<p>Two contention pathologies that appear at scale and are not deadlocks:</p>
<p><span class="term-def">Convoying</span>: a thread holding a lock is descheduled — its timeslice expired, or it took a page fault (o5). Every other thread now blocks on a lock whose holder is not running, and they cannot proceed until it is rescheduled. The queue behind the lock then moves in lockstep, and throughput collapses well below what the critical section's length predicts. This is the specific reason to avoid holding a lock across anything that can block: I/O, an allocation that may fault, a syscall.</p>
<p><span class="term-def">Thundering herd</span>: a resource becomes available and every waiter is woken, all of them race for it, one wins, and the rest go back to sleep having accomplished nothing but a context switch each. The fix is to wake one — <code>signal</code> rather than <code>broadcast</code> (o9), <code>EPOLLEXCLUSIVE</code> for accept queues — and it is a real effect: the accept-queue version of this was a well-known way to waste most of a machine's capacity.</p>`,
 facts:[
 "An uncontended futex acquisition is a compare-and-swap in user space at tens of nanoseconds; a contended one costs a syscall, a block and a wake — two orders of magnitude more.",
 "The cost of a lock is a property of contention, not of the lock. Spinning is right only when the expected wait is shorter than a context switch and the holder is actually running.",
 "Amdahl: a 5% serial section caps speedup at 20× regardless of core count, and that model optimistically assumes coordination is free.",
 "The Universal Scalability Law adds a coherence term growing as N², which is why measured throughput turns over and adding cores can make a system slower.",
 "Finer-grained locking adds acquisitions, ordering obligations and false sharing — ask first whether the state must be shared, and whether the critical section can be shortened.",
 "RCU makes reads nearly free by having writers publish a new version and reclaim the old once all pre-existing readers finish; reader-writer locks still write shared bookkeeping.",
 "Deadlock needs all four of mutual exclusion, hold-and-wait, no preemption and circular wait — so breaking any one prevents it, and a global lock order is the practical choice.",
 "Most real deadlocks involve a lock and something else that waits, so the rule that covers the family is: never block on anything unbounded while holding a lock.",
 "Convoying is a lock whose holder was descheduled, which collapses throughput far below what the critical section length predicts.",
 "A thundering herd wakes every waiter so one can win; wake one instead, with signal rather than broadcast or EPOLLEXCLUSIVE on an accept queue."
 ]},

{id:"o9", t:"Condition variables and coordination", calc:null,
 blurb:"Mutual exclusion is only half of concurrency. The other half is waiting for something to become true, and the obvious way to write that has a race in it that the API's shape exists to close.",
 body:`
<h3>Waiting is a different problem from excluding</h3>
<p>A lock answers "only one at a time". It does not answer "not yet" — a consumer with nothing to consume, a worker waiting for a job, a thread waiting for initialisation. Holding the lock and checking in a loop is the naive answer and is wrong twice over: it burns a core, and if the check needs the lock, no other thread can ever make the condition true.</p>
<p>Releasing the lock and polling fixes the deadlock and keeps the waste, and adds a latency floor equal to the poll interval. What is needed is a thread that sleeps consuming nothing and is woken when the state it cares about changes.</p>

<h3>The condition variable, and its one hard requirement</h3>
<p>A <span class="term-def">condition variable</span> is a wait queue attached to a condition, always used with a mutex. Its central operation does three things indivisibly:</p>
${F(`wait(cv, mutex):
    atomically:  release the mutex AND enqueue this thread
    ... sleep ...
    on wake:     reacquire the mutex before returning

signal(cv)     wake one waiter
broadcast(cv)  wake all waiters`)}
<p>The atomicity in the first line is the entire reason the API has this shape. If releasing and enqueueing were separable, another thread could acquire the mutex in the gap, change the state, and signal a condition variable that this thread has not yet joined. The signal wakes nobody, this thread then sleeps waiting for an event that has already happened, and both sides wait forever. That is the <span class="term-def">lost wakeup</span>, and it is why you cannot build a correct condition variable from a mutex and a sleep.</p>

<h3>Always loop on the predicate</h3>
<p>The rule every codebase eventually learns:</p>
${F(`WRONG                          RIGHT

lock(m)                        lock(m)
if (!ready)                    while (!ready)
    wait(cv, m)                    wait(cv, m)
use()                          use()
unlock(m)                      unlock(m)`)}
<p>Three independent reasons, and any one of them is sufficient:</p>
<ul>
<li><span class="term-def">Mesa semantics.</span> Every real implementation signals as a <em>hint</em>: the waiter becomes runnable but must reacquire the mutex, and by the time it does, another thread may have consumed the thing. (The alternative — Hoare semantics, where the signaller hands the lock and the condition directly to the waiter — is cleaner to reason about and essentially unimplemented, because it requires an immediate context switch on every signal.)</li>
<li><span class="term-def">Spurious wakeups.</span> POSIX explicitly permits <code>pthread_cond_wait</code> to return without any signal. This is not a defect but a deliberate allowance that makes implementations simpler and faster, and it means a return from wait carries no information at all.</li>
<li><span class="term-def">Broadcast.</span> If several waiters are woken for one available item, all but one must go back to sleep.</li>
</ul>
<p>The reliable formulation of the whole rule: <strong>a return from <code>wait</code> tells you nothing except that you hold the mutex again.</strong> The predicate is the truth; the condition variable is only a way of not spinning while it is false.</p>

<h3>Signal or broadcast</h3>
<p>Use <code>signal</code> when any one waiter can handle the event and they are interchangeable — one item produced, one consumer needed. Use <code>broadcast</code> when the state change may satisfy several waiters, or when waiters are waiting for <em>different</em> predicates on the same variable, since the one you happen to wake may not be the one that can proceed.</p>
<p>That last case is a real bug source: a single condition variable serving "not empty" and "not full" can, under <code>signal</code>, wake a thread that cannot make progress while the one that could stays asleep — the system stalls with work available. The fixes are one condition variable per predicate, which is the better design, or <code>broadcast</code>, which is correct and pays the thundering herd of o8.</p>

<h3>Semaphores</h3>
<p>A <span class="term-def">semaphore</span> is an integer with two atomic operations: <code>wait</code> (decrement, blocking while the value is zero) and <code>post</code> (increment, waking a waiter). It is both a lock and a coordination primitive depending on its initial value:</p>
${F(`initialised to 1   a mutex
initialised to 0   a signalling latch — one thread waits,
                   another posts when the event happens
initialised to N   a counting semaphore: at most N holders,
                   which is a connection pool or a rate limit`)}
<p>The counting case is the one a mutex cannot express, and it is the reason semaphores remain worth knowing. The bounded buffer is the classic assembly: one semaphore counting empty slots, one counting full slots, and a mutex protecting the buffer itself — with the ordering rule that the counting semaphore is always acquired <em>before</em> the mutex, because reversing them is a textbook deadlock (o8).</p>
<p>A semaphore differs from a mutex in a way that matters for correctness: it has no owner. Any thread may post one another thread waits on, which is what makes it a signalling device, and also means it cannot support priority inheritance (o3) and gives no help detecting a thread unlocking something it never locked.</p>

<h3>Higher-level coordination</h3>
<p>Almost nothing in application code should be using raw condition variables, and the reason is that the patterns above have all been packaged:</p>
<ul>
<li>A <span class="term-def">latch</span> or <span class="term-def">barrier</span> — wait until N things have happened, or until all N participants arrive.</li>
<li>A <span class="term-def">blocking queue</span> — the bounded buffer, already assembled and already correct. Most producer–consumer code should be this and nothing else.</li>
<li>A <span class="term-def">future</span> or <span class="term-def">promise</span> — wait for one value that will be produced once.</li>
<li><span class="term-def">Channels</span> — coordination by transferring ownership rather than sharing, which removes the shared mutable state instead of guarding it.</li>
</ul>
${W(`Hand-written condition variable code is where the subtle bugs concentrate — a missed loop, the wrong signal, a predicate checked without the mutex, a stall under load that reproduces nowhere. The primitives are worth understanding precisely so that you can read a stall and know what to look for, and worth avoiding in favour of a blocking queue or a channel whenever the shape fits.`)}`,
 facts:[
 "A lock provides exclusion, not waiting; polling for a condition burns a core and, if the check needs the lock, prevents anyone from making the condition true.",
 "wait() must release the mutex and enqueue the thread atomically — if those were separable, a signal could land in the gap and be lost forever.",
 "Always loop on the predicate. A return from wait tells you nothing except that you hold the mutex again.",
 "Mesa semantics make a signal a hint: the waiter must reacquire the mutex, and the state may have changed by then. Hoare semantics are cleaner and essentially unimplemented.",
 "POSIX explicitly permits spurious wakeups, so a wait can return with no signal at all — by design, not as a defect.",
 "One condition variable serving two different predicates can wake a thread that cannot proceed while the one that could stays asleep. Use one per predicate.",
 "A semaphore initialised to 1 is a mutex, to 0 a signalling latch, and to N a bound on concurrent holders — the last is what a mutex cannot express.",
 "A semaphore has no owner: any thread can post it, which makes it a signalling device and also rules out priority inheritance and misuse detection.",
 "In a bounded buffer the counting semaphore must be acquired before the mutex; reversing them is a textbook deadlock.",
 "Application code should mostly use blocking queues, latches, futures and channels — the raw primitives are for reading stalls, not for writing coordination."
 ]}

]},

{ name:"Level 4 · Persistence", mods:[

{id:"o10", t:"Files, descriptors and the page cache", calc:null,
 blurb:"A file is a name, an inode and a stream of bytes, and none of those three is the same object. Most surprising filesystem behaviour follows from which one an operation actually acts on.",
 body:`
<h3>Three things, routinely conflated</h3>
${F(`name        a directory entry: a string and an inode number.
            Lives in a directory, which is just a file whose
            contents are these pairs.

inode       the file itself: type, permissions, owner, size,
            timestamps, link count, and the block pointers.
            Has NO name.

descriptor  a process's open handle: a small integer indexing
            into a table, pointing at an open file description
            that holds the offset and the flags.`)}
<p>Separating them explains behaviour that is otherwise arbitrary. A <span class="term-def">hard link</span> is a second name for one inode — both are equally real, neither is the original, and the inode disappears when its link count reaches zero <em>and</em> no descriptor still refers to it. Which is why deleting an open file frees no space until the last holder closes it, and why the disk-full mystery is so often a deleted log that a process still has open. <code>lsof +L1</code> lists exactly these.</p>
<p>It also explains why <code>rename()</code> is cheap however large the file: it edits directory entries and touches no data. And why a <span class="term-def">symlink</span> is a different thing entirely — a small file containing a path, resolved at use, which can dangle, can cross filesystems, and introduces the TOCTOU hazard that a path checked and a path opened may not be the same object.</p>

<h3>Descriptors, and what fork and dup share</h3>
<p>There are two levels of indirection, and the difference is exactly what people get wrong about redirection:</p>
${F(`fd table (per process)  →  open file description  →  inode
   0, 1, 2, 3 …              offset, flags            the file

open() twice          two descriptions, INDEPENDENT offsets
dup() / fork()        one description, SHARED offset`)}
<p>So two processes that inherited a descriptor across a fork share a file offset, and writes from both advance the same cursor — which is why shell redirection of two commands to one file behaves the way it does, and why <code>O_APPEND</code> exists: it makes the seek-and-write atomic at the kernel, which is the only way concurrent appenders do not overwrite each other.</p>
<p>Descriptors are also the reason Unix's I/O interface is uniform: files, pipes, sockets, devices, terminals and event objects are all descriptors, so <code>read</code>, <code>write</code>, <code>poll</code> and <code>close</code> work on all of them. That uniformity is the design's best idea, and it is why <code>epoll</code> can wait on a mixture of sockets, timers and signals in one call.</p>

<h3>The page cache</h3>
<p>Every read and write goes through a cache of file pages in memory, and it is not a small optimisation — it is the reason filesystems appear fast at all.</p>
${F(`read()   found in the page cache?  memcpy, ~100 ns
         not found?                major fault path (o5),
                                   read from storage, cache it

write()  copy into the page cache, mark the page DIRTY,
         return SUCCESS.
         Nothing has reached the device.`)}
<p>That last line is the whole of module o11. <code>write()</code> returning zero does not mean the data is durable; it means the kernel has taken responsibility for it. A writeback thread flushes dirty pages later — driven by <code>dirty_ratio</code>, <code>dirty_expire_centisecs</code> and memory pressure — and if the machine loses power in between, the data is gone with a successful return already delivered to the caller.</p>
<p>The cache is also why <span class="term-def">free memory is a meaningless metric on Linux</span>. The kernel uses all otherwise-idle memory for the page cache, because unused memory is wasted memory, and reclaims it instantly when a process needs it. A machine reporting almost no free memory and a large cache is a machine working correctly; the number to read is <em>available</em>, which accounts for what can be reclaimed.</p>

<h3>Buffered, direct and mapped</h3>
<ul>
<li><span class="term-def">Buffered</span> — the default. One copy device→cache and one cache→user buffer, with readahead detecting sequential access and fetching before you ask. Right for almost everything.</li>
<li><span class="term-def">Direct</span> (<code>O_DIRECT</code>) — bypass the cache entirely, DMA straight to the user buffer. Alignment constraints on the buffer, the offset and the length, and no readahead. Correct only where the application maintains a better cache than the kernel can, which in practice means databases and nothing else.</li>
<li><span class="term-def">Mapped</span> (<code>mmap</code>) — map the file's pages into the address space and access them as memory. No syscall per access and no copy at all, since the page cache pages <em>are</em> your pages. Costs a page fault per new page, makes I/O errors arrive as <code>SIGBUS</code> rather than an error return, and is awkward for files that change size.</li>
</ul>
<p>The zero-copy point is worth being precise about, because it is the main reason to map: a buffered read copies cache→user, and a mapping does not copy at all. For a large file read by many processes that is one physical copy in memory instead of one per process (o4).</p>

<h3>What the filesystem stores</h3>
<p>The on-disk shape has been essentially stable for decades: a superblock with the geometry, a bitmap of free inodes and blocks, an inode table, and data blocks. An inode addresses its data through a small number of direct pointers, then indirect, doubly indirect and triply indirect blocks — which is why small files are fast (their blocks are named in the inode itself) and why very large files historically cost extra indirections. Modern filesystems use <span class="term-def">extents</span>, recording a start and a length rather than a pointer per block, which shrinks the metadata for large contiguous files enormously.</p>
<p>The consequence that surfaces in operations: <strong>inodes are a finite resource allocated at format time</strong> on ext-family filesystems. A partition can report free space and refuse to create a file, because it is out of inodes — the classic outcome of a directory full of millions of tiny files. <code>df -i</code> is the check, and it is not the check anyone thinks to run first.</p>

<h3>Where the abstraction leaks</h3>
<p>Two long-standing gaps between what the API suggests and what it does:</p>
<ul>
<li><span class="term-def">Path lookup is not atomic.</span> Between resolving a path and acting on it, the path can be replaced — the check-then-act race of o7, with security consequences. The mitigations are the <code>*at</code> family (<code>openat</code>, <code>unlinkat</code>) operating relative to a directory descriptor, <code>O_NOFOLLOW</code>, and acting on descriptors rather than on paths wherever possible.</li>
<li><span class="term-def">Case, normalisation and encoding.</span> A filename is a byte string with no encoding on Linux, is case-insensitive on the default macOS and Windows filesystems, and may be Unicode-normalised on some. Code that assumes a name round-trips unchanged is portable until it is not.</li>
</ul>
${W(`The single most important thing in this module is one sentence: a successful <code>write()</code> means the kernel has the data, not that the device does. Every durability claim an application makes rests on what happens after that return, and that is o11.`)}`,
 facts:[
 "A name, an inode and a descriptor are three different objects; most surprising filesystem behaviour is about which one an operation acts on.",
 "A hard link is a second equally-real name for one inode, and the data survives until the link count is zero and no descriptor still refers to it.",
 "Deleting an open file frees no space until the last holder closes it, which is the usual cause of a disk-full mystery — lsof +L1 finds it.",
 "open() twice gives independent offsets; dup() and fork() share one offset, which is why O_APPEND exists to make seek-and-write atomic for concurrent appenders.",
 "Every file, pipe, socket, device and terminal is a descriptor, which is why read, write, poll and close work uniformly and epoll can mix them in one call.",
 "write() copies into the page cache, marks it dirty and returns success. Nothing has reached the device at that point.",
 "Free memory is a meaningless metric on Linux because the kernel uses idle memory for the page cache and reclaims it on demand — read available instead.",
 "mmap is genuinely zero-copy: the page cache pages are your pages, so a shared file costs one physical copy rather than one per process. Errors arrive as SIGBUS.",
 "Inodes are allocated at format time on ext filesystems, so a partition can have free space and still refuse to create a file. df -i is the check.",
 "Path lookup is not atomic, so a checked path and an opened path may differ — use the *at family and act on descriptors rather than names."
 ]},

{id:"o11", t:"Durability and crash consistency", calc:null,
 blurb:"Every storage system that claims not to lose data is making a claim about what survives a power cut mid-write. The guarantees are narrower than the API suggests, and the gap has produced data loss in software that was extremely careful.",
 body:`
<h3>The gap</h3>
<p>Module o10 ended on it: <code>write()</code> returns when the kernel has the bytes, not when the device does. Between those two moments the data exists only in volatile memory, and a power cut loses it with a success already returned. Closing the file does not help — <code>close()</code> flushes nothing.</p>
<p>Making the data durable requires saying so:</p>
${F(`fsync(fd)       flush this file's data AND metadata to
                stable storage. Returns when the device
                says it is durable.
fdatasync(fd)   flush the data, and only the metadata
                actually needed to read it back — skips a
                timestamp update, so it can save an entire
                extra write.
sync()          schedule everything, and on some systems
                do not wait. Not a durability primitive.`)}
<p>The cost is what makes this a design decision rather than a habit: an <code>fsync</code> is hundreds of microseconds on NVMe and several milliseconds on a spinning disk, against roughly a microsecond for the buffered write. A system that fsyncs per operation has an upper bound on operations per second set by the device, which is why every database batches commits into a group.</p>

<h3>Crash consistency: the real problem is ordering</h3>
<p>Losing the last few writes is usually survivable — the client can retry. The severe failure is a crash that leaves the <em>structure</em> inconsistent, because a single logical operation is several physical writes and a crash can land between them.</p>
${F(`appending one block to a file needs three writes:

  1  the data block itself
  2  the inode, updated with the new size and pointer
  3  the free-space bitmap, marking the block used

crash after 1 only     the write is lost. Survivable.
crash after 2 only     the inode points at a block the
                       bitmap still calls free. It will be
                       handed to another file.
                       ⇒ TWO files sharing one block.
crash after 3 only     the block is marked used and no file
                       owns it. A leak, harmless.`)}
<p>The second case is corruption rather than loss, and it does not announce itself. This is the problem that journaling exists to solve, and it is why "the filesystem checks itself at boot" (<code>fsck</code>) was replaced — a full scan is proportional to the filesystem's size, which stopped being acceptable a long time ago.</p>

<h3>Journaling</h3>
<p>Write down what you are about to do, in one place, before doing it. After a crash, replay the intentions that were fully recorded and discard the rest.</p>
${F(`1  write the intended changes to the journal
2  write a COMMIT record          ← the atomic moment
3  flush
4  apply the changes in place ("checkpoint")
5  free the journal entry

crash before 2   the journal entry is incomplete: discard.
                 The filesystem is as it was.
crash after 2    replay the journal. The operation completes.`)}
<p>Step 2 is the whole design. The commit record is small enough to be written atomically by the device, so it is a single point at which the operation goes from "not happening" to "will happen", with no state in between that a crash can expose.</p>
<p>The cost is that data is written twice. Which is why ext4 offers modes, and why the default is the compromise rather than the safe extreme:</p>
${F(`data=journal    everything through the journal. Safest,
                and every byte is written twice.
data=ordered    metadata journalled; data written BEFORE
                the metadata that references it. The
                default. Stops the dangling-pointer case.
data=writeback  metadata journalled, data unordered. Fast,
                and a crash can leave a file's metadata
                pointing at whatever those blocks held
                before — including another file's data.`)}
<p>The alternatives to journaling are worth naming because they solve it differently rather than better: <span class="term-def">copy-on-write</span> filesystems (btrfs, ZFS) never overwrite live data, writing new blocks and switching a root pointer atomically, which gives crash consistency and snapshots from the same mechanism. <span class="term-def">Log-structured</span> designs write everything sequentially and clean up behind, which fits flash's erase-block behaviour (o12) particularly well.</p>

<h3>What fsync does not promise</h3>
<p>Four gaps that have each caused real incidents:</p>
<ul>
<li><span class="term-def">The directory is a separate file.</span> Creating a file and fsyncing it does not make the <em>name</em> durable — the directory entry is metadata in the parent directory, which needs its own fsync. A crash can leave a file with durable contents and no name.</li>
<li><span class="term-def">Device write caches.</span> Drives have volatile caches and may acknowledge before the medium is written. A correct <code>fsync</code> issues a cache flush; consumer drives that lied about this were a well-documented source of corruption, and a virtualised or network-attached device adds more layers that must each honour it.</li>
<li><span class="term-def">Errors are not sticky the way you would assume.</span> Linux historically reported a writeback error once and then cleared it, marking the failed pages clean. A process that called <code>fsync</code>, got <code>EIO</code>, and retried would see the second call <em>succeed</em> while the data was gone. PostgreSQL found this in 2018 — "fsyncgate" — and the kernel was changed to report the error to every descriptor open at the time. The general lesson stands: <strong>an <code>fsync</code> error is unrecoverable at the application level, and the only safe response is to stop, not to retry.</strong></li>
<li><span class="term-def">Nothing orders your writes for you.</span> fsync makes one file durable at one moment; it establishes no relationship with any other file unless you sequence the calls yourself.</li>
</ul>

<h3>The atomic-replace idiom</h3>
<p>The one pattern worth memorising, because it is how a file is updated without a window in which it is half-written:</p>
${F(`1  write the new contents to a temporary file
2  fsync(tmp)                   contents are durable
3  rename(tmp, target)          ATOMIC: readers see either
                                the old file or the new one,
                                never a partial one
4  fsync(the directory)         the RENAME is durable`)}
<p><code>rename()</code> is atomic with respect to observers by specification: a concurrent reader opening the path gets one version or the other. Step 2 matters because without it the rename can be durable while the contents are not, leaving a correctly-named empty or truncated file — which is the failure mode a generation of applications hit when their editors lost files on power loss. Step 4 matters because the rename is metadata in the directory, per the first gap above.</p>
${W(`Do not build durability yourself if a database will do. The steps above are the easy part; the hard parts are group commit for throughput, checksums to detect a torn or misdirected write, and the recovery path — which is the least-tested code in any storage system and the only code that matters when it runs. A power-loss test harness that kills the machine at random points and verifies invariants finds these; nothing else does.`)}
<p>Two footnotes that matter at the device level. A <span class="term-def">torn write</span> is a write larger than the device's atomic unit interrupted midway, leaving a block half old and half new — which is why databases checksum pages and why PostgreSQL writes full pages to its WAL after a checkpoint. And on flash, the drive's translation layer is doing its own remapping underneath (o12), so "the same block" is not the same physical location from one write to the next.</p>`,
 facts:[
 "write() returning success means the kernel has the data; close() flushes nothing. Durability requires fsync or fdatasync.",
 "fdatasync skips metadata not needed to read the data back, which can save an entire extra write — the usual choice for a database's data files.",
 "An fsync costs hundreds of microseconds to milliseconds against about one for a buffered write, which is why every database batches commits.",
 "The severe crash failure is not lost writes but inconsistent structure: an inode pointing at a block the bitmap still calls free gives two files one block.",
 "Journaling records the intention, then a commit record that is atomic at the device — the single point where an operation goes from not-happening to will-happen.",
 "ext4's data=ordered writes data before the metadata referencing it; data=writeback can leave metadata pointing at whatever those blocks previously held.",
 "Copy-on-write filesystems get crash consistency and snapshots from the same mechanism: never overwrite live data, switch a root pointer atomically.",
 "fsync on a file does not make its name durable — the directory entry needs its own fsync, or a crash leaves durable contents with no name.",
 "An fsync error is unrecoverable at application level: Linux once reported it only once and marked the pages clean, so a retry succeeded with the data gone. Stop, do not retry.",
 "The atomic replace idiom is write-temp, fsync temp, rename, fsync directory — and omitting the second step is what left a generation of editors with truncated files after power loss."
 ]},

{id:"o12", t:"Devices, interrupts and the storage hierarchy", calc:"latency",
 blurb:"Every number in computing spans eleven orders of magnitude, and almost every performance decision is a consequence of which two of them are involved. The hierarchy is worth knowing by heart.",
 body:`
<h3>The numbers</h3>
<p>Order of magnitude is what matters; the exact figures move with each hardware generation and the ratios do not.</p>
${F(`L1 cache reference                       ~1 ns
branch mispredict                        ~3 ns
L2 cache reference                       ~4 ns
mutex lock/unlock, uncontended          ~20 ns
main memory reference                  ~100 ns
context switch                    ~1–10 µs
NVMe SSD random read              ~10–100 µs
SATA SSD random read                  ~100 µs
round trip within a datacentre        ~500 µs
HDD seek                              ~5–10 ms
round trip, continent to continent    ~150 ms`)}
<p>Two comparisons carry most of the practical weight. Memory is a hundred times slower than L1, which is why cache-friendly data layout beats algorithmic cleverness so often at small scales. And an SSD is a thousand times slower than memory while a disk seek is fifty thousand times slower, which is why the page cache (o10) exists and why the difference between a hit and a miss dwarfs everything else in a storage system.</p>
<p>The scaled version is the one that sticks: if L1 were one second, memory would be about two minutes, an SSD read about half a day, a disk seek about three months, and a transatlantic round trip about five years.</p>

<h3>Getting data in and out</h3>
<p>Three mechanisms, in the order they were invented, each fixing the previous one's waste:</p>
<ul>
<li><span class="term-def">Polling.</span> Ask the device repeatedly whether it is ready. Burns a CPU for the entire wait, and has the lowest possible latency once the wait is short — which is why it came back for NVMe, where the device may respond faster than an interrupt can be delivered.</li>
<li><span class="term-def">Interrupts.</span> The device raises a line, the CPU stops what it is doing and runs a handler. The CPU can do other work while waiting, at the cost of a delivery latency of a few microseconds and a context switch. A device that interrupts too often is worse than one that is polled — a network card at line rate can livelock a machine entirely in interrupt handling, which is why NAPI and interrupt coalescing exist.</li>
<li><span class="term-def">DMA.</span> The device writes into memory itself and interrupts once at the end. The CPU is not involved in the transfer at all, which is the only way modern bandwidth is achievable.</li>
</ul>
<p>Interrupt handlers are split for a reason worth knowing: the <span class="term-def">top half</span> runs immediately with interrupts disabled and does the minimum — acknowledge the device, note what happened — and the <span class="term-def">bottom half</span> (softirq, tasklet, workqueue) does the real work later with interrupts enabled. Long-running work in the top half delays every other interrupt on the machine, and appears as system-wide latency jitter with no process to blame.</p>

<h3>Flash is not a fast disk</h3>
<p>Treating an SSD as a quick HDD misses the constraint that governs its behaviour:</p>
${F(`read       a page (~4–16 KB), fast, uniform
write      a page — but ONLY into an already-erased page
erase      an entire BLOCK (~hundreds of pages, megabytes),
           slow, and each block tolerates a limited number
           of erase cycles`)}
<p>Writes and erases operate on different units, so overwriting a page in place is impossible. The <span class="term-def">flash translation layer</span> inside the drive therefore writes the new version elsewhere, remaps the logical address to it, and marks the old copy stale — then, in the background, collects blocks that are mostly stale, relocates whatever is still live, and erases them.</p>
<p>Three consequences follow directly, and all three are visible from outside:</p>
<ul>
<li><span class="term-def">Write amplification.</span> Writing 4 KB can cause far more than 4 KB of physical writing, because garbage collection must relocate live data to free a block. Random small writes amplify most; large sequential writes amplify least. This is a real reason log-structured designs and LSM trees suit flash.</li>
<li><span class="term-def">Latency spikes.</span> Background garbage collection competes with your I/O, so a drive that is nearly full or has been written heavily shows tail latencies far above its average. p99 on an SSD is a different quantity from its mean, and the gap widens as it fills.</li>
<li><span class="term-def">TRIM matters.</span> The drive cannot tell a deleted file from live data unless told, so without TRIM it faithfully relocates blocks nobody wants, and performance degrades as the drive ages.</li>
</ul>
<p>Wear levelling spreads erases so no block is exhausted early, and over-provisioning — hidden capacity — gives the collector room to work, which is why enterprise drives with the same flash sustain far better write performance than consumer ones.</p>

<h3>Why queue depth changes the answer</h3>
<p>A disk had one arm, so requests were inherently serial and the scheduler's job was to minimise seeking — elevator algorithms, sorting by position. An NVMe drive has many independent channels and thousands of queue entries, so it is fast <em>only</em> when many requests are in flight at once.</p>
${F(`one request at a time    latency ≈ device latency,
                         throughput ≈ 1/latency  ← low

many in flight           latency ≈ device latency,
                         throughput ≈ parallelism × that`)}
<p>This is Little's Law doing the work: concurrency = throughput × latency. A benchmark issuing one synchronous read at a time measures the device's latency and a small fraction of its throughput, and concluding "the disk is slow" from it is the most common storage-benchmarking error. Getting depth requires asynchronous I/O — <code>io_uring</code>, or threads — and Linux's default I/O scheduler for NVMe is <code>none</code> precisely because reordering to avoid seeks is pointless on a device with no arm.</p>
${W(`The corollary for tail latency: queue depth converts latency into throughput and also creates queueing delay. A deep queue in front of a device means each individual request waits behind the others, so throughput-optimised settings make p99 worse. Which one you want is an application decision, and the default is rarely the right answer for both.`)}

<h3>What this means for design</h3>
<ul>
<li>Sequential access beats random by orders of magnitude on every storage device, for different reasons at each layer — prefetching in the cache, readahead in the page cache, no seeking on a disk, less amplification on flash.</li>
<li>Batch small writes. Every layer from the allocator down rewards it.</li>
<li>Measure p99, not the mean. Garbage collection, interrupt coalescing and queueing all produce distributions whose mean says nothing about the experience.</li>
<li>Know which two levels of the hierarchy a change moves work between. That single question usually predicts the outcome before any code is written.</li>
</ul>`,
 facts:[
 "Memory is ~100× slower than L1, an SSD read ~1000× slower than memory, and a disk seek ~50,000× slower — the ratios drive nearly every storage decision.",
 "Polling burns a CPU and has the lowest latency, which is why it returned for NVMe devices that answer faster than an interrupt can be delivered.",
 "A device interrupting at line rate can livelock a machine entirely in interrupt handling, which is what NAPI and interrupt coalescing exist to prevent.",
 "Interrupt handlers are split so the top half does the minimum with interrupts disabled; long work there appears as system-wide latency jitter with no process to blame.",
 "Flash writes pages but erases whole blocks, so in-place overwrite is impossible and the translation layer remaps and collects garbage underneath.",
 "Write amplification means writing 4 KB can cause much more physical writing; random small writes amplify most, which is why LSM and log-structured designs suit flash.",
 "SSD tail latency diverges from the mean as the drive fills, because background garbage collection competes with foreground I/O.",
 "Without TRIM the drive relocates blocks belonging to deleted files, so performance degrades as it ages.",
 "NVMe is fast only at depth: Little's Law means a one-request-at-a-time benchmark measures latency and a fraction of throughput.",
 "Queue depth converts latency into throughput and adds queueing delay, so throughput-optimised settings make p99 worse — the tradeoff is an application decision."
 ]}

]},

{ name:"Level 5 · Isolation, and where it leaks", mods:[

{id:"o13", t:"Virtual machines and containers", calc:null,
 blurb:"Two ways to run someone else's code on your machine, differing in where the boundary sits. One virtualizes the hardware, the other partitions a kernel — and that single difference explains every practical distinction between them.",
 body:`
<h3>Virtualizing the machine</h3>
<p>A <span class="term-def">hypervisor</span> presents a virtual machine: virtual CPUs, virtual memory, virtual devices. The guest runs an unmodified operating system that believes it owns hardware.</p>
${F(`type 1 (bare metal)   the hypervisor IS the OS on the
                      hardware. Xen, ESXi, Hyper-V.

type 2 (hosted)       runs on a host OS. VirtualBox,
                      VMware Workstation.

KVM                   turns Linux itself into a type 1
                      hypervisor — the boundary is blurrier
                      than the taxonomy suggests.`)}
<p>The classical difficulty was that x86 had privileged instructions which, executed in user mode, failed silently rather than trapping — so a guest kernel's privileged operation neither worked nor could be intercepted. Two answers: <span class="term-def">binary translation</span>, rewriting the offending instructions on the fly, and <span class="term-def">paravirtualization</span>, modifying the guest to call the hypervisor deliberately. Both were obsoleted by <span class="term-def">hardware virtualization</span> — Intel VT-x and AMD-V — which added a mode beneath ring 0, so a guest kernel runs at its own ring 0 and traps to the hypervisor on the operations that matter.</p>
<p>Memory needs two translations: guest-virtual to guest-physical, and guest-physical to host-physical. Doing that in software (shadow page tables) was the largest cost in early virtualization; <span class="term-def">nested paging</span> — EPT, NPT — put the second translation in hardware, at the price of a longer walk on a TLB miss (o4). Devices went the same way: emulated devices are slow, <span class="term-def">virtio</span> paravirtualized drivers are fast, and <span class="term-def">SR-IOV</span> gives a guest direct hardware access with near-native performance.</p>

<h3>Containers are not small virtual machines</h3>
<p>A container is a process. There is no guest kernel, no virtual hardware, no boot. What makes it a container is that the host kernel has been told to give it a restricted view of itself:</p>
${F(`namespaces   restrict WHAT a process can SEE
  pid      its own process tree; its init is PID 1
  net      its own interfaces, routes, ports
  mnt      its own filesystem tree
  uts      its own hostname
  ipc      its own shared memory and semaphores
  user     uid mapping — root inside, unprivileged outside
  cgroup, time  …

cgroups      restrict HOW MUCH it can USE
  cpu, memory, io, pids — with limits and accounting

plus         capabilities, seccomp filters, LSMs
             (AppArmor, SELinux) to restrict WHAT IT CAN DO`)}
<p>Which is why a container starts in milliseconds — it is a <code>clone()</code> with extra flags — and why its image contains no kernel. "Containers are lightweight VMs" gets the mechanism exactly backwards, and every difference that matters follows from it.</p>

<h3>The consequence: a shared kernel</h3>
<p>Every container on a host calls the same kernel. That single fact produces the whole list of practical differences:</p>
<ul>
<li><span class="term-def">Isolation strength.</span> A VM's boundary is the hypervisor, whose interface to the guest is small. A container's boundary is the entire system call interface — hundreds of calls, a large attack surface, and a kernel privilege escalation escapes every container on the host at once. This is why untrusted multi-tenant workloads still run in VMs, and why gVisor (a user-space kernel) and Kata Containers (a VM per container) exist to narrow it.</li>
<li><span class="term-def">The kernel is shared, so kernel state is shared.</span> Containers cannot have different kernel versions or modules, and a sysctl is host-wide unless it is one of the namespaced ones.</li>
<li><span class="term-def">Resource views leak.</span> This is the one that produces bugs. Historically <code>/proc/meminfo</code> and <code>/proc/cpuinfo</code> reported the <em>host's</em> figures inside a container, so a runtime sizing its thread pool from the CPU count or its heap from total memory read the host's numbers and ignored its own limits — the JVM's long history of being OOM-killed in containers is exactly this. Runtimes are now container-aware and libraries such as lxcfs paper over it, but any code reading system totals to size itself should be checked.</li>
</ul>
${W(`A container hitting its cgroup memory limit is OOM-killed inside that cgroup (o5). The application sees no error, writes nothing to its log, and the orchestrator restarts it — so the symptom is a pod restarting with a clean log. The evidence is exit code 137 and the host's <code>dmesg</code>, and looking in the application's own output for it wastes a great deal of time.`)}
<p>Two more container-specific behaviours worth knowing. PID 1 in a namespace has special semantics: it receives no default signal handlers, so a process not written for it ignores <code>SIGTERM</code> and gets killed after the grace period — the reason for <code>tini</code> and <code>--init</code>. And it inherits orphans, so a PID 1 that does not reap accumulates zombies (o2).</p>

<h3>Choosing between them</h3>
${F(`                    VM              container
boundary            hypervisor      the syscall interface
start time          seconds         milliseconds
overhead            an OS per guest a process
kernel              its own         the host's
density             tens            thousands
untrusted code      yes             not on its own`)}
<p>The honest summary is that containers are a packaging and resource-management technology that provides real but incomplete isolation, and VMs are an isolation technology that is heavier. The common production answer uses both — containers for packaging and density, inside VMs for the tenancy boundary — which is not indecision but the correct reading of where each boundary is strong.</p>`,
 facts:[
 "A hypervisor presents virtual hardware and runs an unmodified guest OS; hardware virtualization added a mode beneath ring 0 so guest kernels trap rather than fail silently.",
 "Nested paging put guest-physical to host-physical translation in hardware, at the cost of a longer page walk on a TLB miss.",
 "A container is a process with a restricted view of the host kernel — namespaces limit what it sees, cgroups how much it uses, capabilities and seccomp what it can do.",
 "Containers start in milliseconds and ship no kernel because there is no guest OS to boot. \"Lightweight VM\" gets the mechanism backwards.",
 "A container's security boundary is the entire syscall interface, so one kernel privilege escalation escapes every container on the host.",
 "Kernel state is shared: containers cannot run different kernel versions, and a sysctl is host-wide unless namespaced.",
 "Host resource totals historically leaked into containers, so runtimes sizing heaps and thread pools from /proc read the host's figures and ignored their own limits.",
 "A container OOM-killed at its cgroup limit shows a clean application log and exit code 137 — the evidence is in the host's dmesg.",
 "PID 1 in a namespace gets no default signal handlers and inherits orphans, which is why a process not written for it ignores SIGTERM and accumulates zombies.",
 "Containers inside VMs is the common production answer, and it is the correct reading of where each boundary is strong rather than indecision."
 ]},

{id:"o14", t:"Where the abstractions leak", calc:null,
 blurb:"The capstone. Every illusion from module o1 has a place where it stops holding, and this is the list — set against the module that built each one, because the diagnosis is almost always the abstraction, not the code.",
 body:`
<h3>The rule</h3>
<p>Joel Spolsky's formulation is that all non-trivial abstractions leak. The operating-system version is sharper, because the leaks are enumerable: an OS maintains a small number of illusions, each has a specific cost, and performance problems that resist explanation are usually a cost becoming visible rather than a bug in the code being read.</p>
<p>The diagnostic habit worth building: when something is slow or erratic and the code looks right, ask <em>which illusion is failing here</em>.</p>

<h3>The CPU is not yours</h3>
<ul>
<li><span class="term-def">Cache line sharing.</span> Coherence works on 64-byte lines, not variables. Two threads updating adjacent counters in one line invalidate each other's cache on every write — <span class="term-def">false sharing</span>, and it can cost an order of magnitude with no lock, no shared variable and nothing wrong in the source. The fix is padding to a line boundary, and the symptom is parallel code that gets slower with more threads (o8's β term, made concrete).</li>
<li><span class="term-def">NUMA.</span> On a multi-socket machine, memory attached to another socket costs perhaps twice as much to reach. Linux allocates on first touch, so the thread that first writes a page decides where it lives — which means initialising a large array in one thread and processing it in many puts all of it on one socket. <code>numactl</code> and first-touch-in-parallel are the fixes.</li>
<li><span class="term-def">Frequency and thermals.</span> A core's clock depends on how many neighbours are busy and how hot the package is. Wide vector instructions can reduce the clock for the whole core. Benchmarks are not reproducible across a machine's thermal state, and a "regression" is sometimes a warmer datacentre.</li>
<li><span class="term-def">Preemption and jitter.</span> A timeslice ends whenever it ends (o3), so any single measurement includes whatever else the machine did. This is why tail latency is a distribution and why a mean hides the effect entirely.</li>
</ul>

<h3>Memory is not flat</h3>
<ul>
<li><span class="term-def">TLB reach.</span> A working set beyond about 6 MB misses on translations regardless of cache behaviour (o4), and no cache-hit-rate metric shows it. Random access over a large structure is often TLB-bound, and huge pages are the lever.</li>
<li><span class="term-def">Page faults on the critical path.</span> The first touch of allocated memory faults (o5). A latency-sensitive service that allocates during a request pays for it in the tail, which is why pre-faulting, pre-allocation and <code>mlock</code> are standard in low-latency work.</li>
<li><span class="term-def">TLB shootdowns.</span> Changing a mapping interrupts every core that might hold a stale translation (o4), so <code>munmap</code> and <code>mprotect</code> scale badly with core count in a threaded process.</li>
<li><span class="term-def">Transparent huge pages.</span> Compacting memory to form a 2 MiB region can stall the faulting thread for milliseconds — a latency spike with no cause visible in the application.</li>
<li><span class="term-def">Overcommit.</span> A successful allocation is not a promise, and the failure arrives later as a kill with no error return (o5).</li>
</ul>

<h3>Storage is not a byte array</h3>
<ul>
<li><span class="term-def">Success is not durability.</span> The most consequential leak in the subject: <code>write()</code> returns before anything reaches the device (o10, o11).</li>
<li><span class="term-def">The page cache is someone else's cache.</span> Benchmarks read from memory on the second run and measure nothing about the device. A database maintaining its own cache is fighting the kernel's for the same memory — the reason <code>O_DIRECT</code> exists.</li>
<li><span class="term-def">Sequential and random differ by orders of magnitude</span> at every layer (o12), so an access pattern change routinely beats an algorithmic one.</li>
<li><span class="term-def">The device is doing its own remapping.</span> Flash's translation layer means the same logical block is not the same physical location twice, and background garbage collection produces tail latency unrelated to your load (o12).</li>
</ul>

<h3>Isolation is partial</h3>
<ul>
<li><span class="term-def">The noisy neighbour.</span> cgroups limit CPU and memory well and share the last-level cache, memory bandwidth and device queues poorly. A co-tenant can degrade a container that is well within every limit it has been given.</li>
<li><span class="term-def">Limits are not what the process sees.</span> Runtimes that size themselves from host totals ignore their own limits (o13).</li>
<li><span class="term-def">CPU quota is not CPU speed.</span> A cgroup quota is enforced by throttling within a period, so a container at its limit is stopped for the rest of each period rather than run slower — which produces periodic latency spikes rather than uniform slowdown, and is invisible in average CPU usage.</li>
<li><span class="term-def">The kernel is shared</span>, so the security boundary is the whole syscall interface (o13).</li>
</ul>

<h3>A diagnostic order</h3>
<p>Given "it is slow and the code looks right", the question is which resource, and the tools answer in this order:</p>
${F(`1  is it running or waiting?
   top, vmstat: %us vs %sy vs %wa; run queue length
   voluntary vs involuntary context switches (o2)

2  waiting on WHAT?
   iostat for storage, ss for network, /proc/pressure/*
   for memory, cpu and io stall time

3  memory pressure?
   major faults, not minor (o5). available, not free (o10)

4  spending time in the kernel?
   strace -c for syscall counts, perf for the split (o1)

5  contended?
   lock profiling, and the shape of the throughput curve
   against thread count — flat is Amdahl, DECLINING is
   coherence (o8)

6  hardware level?
   perf stat: cache misses, TLB misses, IPC, stalls (o4)`)}
<p>The order matters: each step is cheaper than the next and rules out more. Most investigations that go straight to step 6 are answered at step 1.</p>
${W(`The recurring shape across this entire subject is that the abstraction is not lying — it is charging. The address space is real and costs a fault; the file is real and costs an fsync; the thread is real and costs a switch and a cache reload; the container is real and costs a shared kernel. Reading a system's behaviour means knowing what each illusion costs and recognising the bill when it arrives.`)}`,
 facts:[
 "The leaks are enumerable: each illusion has a specific cost, and unexplained performance problems are usually a cost becoming visible rather than a bug in the code.",
 "Coherence works on 64-byte lines, so two threads writing adjacent counters invalidate each other with no shared variable — false sharing, fixed by padding.",
 "Linux allocates memory on first touch, so initialising a large array single-threaded puts it all on one NUMA node regardless of who processes it.",
 "A working set beyond about 6 MB is TLB-bound whatever the cache hit rate says, and no cache metric will reveal it.",
 "First touch of allocated memory faults, so a service allocating during a request pays for it in the tail — hence pre-faulting and mlock in low-latency work.",
 "The page cache means a benchmark's second run measures memory, not the device.",
 "A cgroup CPU quota throttles for the remainder of each period rather than slowing the process, producing periodic latency spikes invisible in average CPU usage.",
 "cgroups share last-level cache, memory bandwidth and device queues poorly, so a noisy neighbour degrades a container that is within every limit it was given.",
 "Diagnose in cost order — running or waiting, waiting on what, memory pressure, kernel time, contention, then hardware counters. Most investigations that start at the end are answered at the beginning.",
 "A flat throughput curve against thread count is Amdahl's serial fraction; a declining one is coherence cost, and they call for different fixes.",
 "The abstraction is not lying, it is charging: the address space costs a fault, the file an fsync, the thread a switch and a cache reload, the container a shared kernel."
 ]}

]}

];
