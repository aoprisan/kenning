# Start prompt for Claude Code

Paste this as the first message in a fresh session at the repo root.

---

Read `CLAUDE.md` first, then `src/types.ts`, then `src/modules/electro/index.ts`
and one of its content files to see the house style. Do not read the whole of
`curriculum.ts` or `questions.ts` — they are large and you will not need most
of it.

Before you change anything, run `just check && just test` and confirm the
baseline is green. Report the numbers you get.

Then do exactly this and nothing more:

**Task.** Add a new subject `dsys` — distributed systems, content in English —
following the `electro` structure exactly. Four modules for now:

1. `d1` Failure models — crash-stop, crash-recovery, omission, Byzantine;
   the asynchronous/partially-synchronous/synchronous spectrum; why "the
   network is reliable" is the first fallacy and what it costs.
2. `d2` Time and ordering — physical clocks and skew, happens-before, Lamport
   clocks, vector clocks, why wall-clock timestamps lose events.
3. `d3` Consensus — the FLP result stated precisely and what it does and does
   not forbid; quorums; Paxos and Raft at the level of what problem each phase
   solves; leader leases.
4. `d4` Replication — single-leader, multi-leader, leaderless; read-repair and
   anti-entropy; CAP stated correctly, then discarded in favour of the latency
   argument (PACELC).

Each module needs: `blurb`, `body` prose using the `F` and `W` helpers, at
least three `facts`, and at least four questions in the
`[moduleId, text, options, correctIndex, explanation]` shape.

**Animations.** Build two, no more, in this pass:

- `d2` — a lattice of three processes exchanging messages, with a slider for
  clock skew and a toggle between wall-clock ordering and Lamport ordering.
  The point the animation must make: at nonzero skew, wall-clock ordering
  produces an effect before its cause; Lamport ordering never does.
- `d3` — a five-node cluster with a slider for how many nodes are reachable.
  Show the quorum threshold as a line. Below it, writes must visibly stall
  rather than proceed.

Follow the animation contract in `CLAUDE.md` precisely: `data-e` attributes,
`draw` pure in `(t, c)`, scratch state on `E._` keys only, an annotated control
type per animation, and no `NaN` attributes at any control extreme.

**Constraints.**
- Do not touch `src/modules/electro/` at all.
- Do not touch `styles.css`. If you believe you need a new class, stop and ask.
- Do not add a dependency, a bundler, or a build step.
- Register `dsys` in `src/modules/index.ts` but leave `electro` as the active
  subject. I will switch it myself once I have reviewed the content.

**Definition of done.** `just check && just test` both pass, `tests/render.mjs`
reports the new modules mounting, and you tell me the delta in numbers
(modules, animations, questions) versus the baseline you measured at the start.

Work module by module and let me see `d1` before you write `d2`. Do not
generate all four in one pass.
