import type { Subject } from "../../types.js";
import { levels } from "./curriculum.js";
import { questions } from "./questions.js";
import { anims } from "./anims.js";
import { calcs } from "./calcs.js";

export const arch: Subject = {
  id: "arch",
  name: "Computer architecture",
  tagline: "what the processor actually does",
  levels,
  questions,
  anims,
  calcs,
  disclaimer: [
    "This subject sits beneath the operating-systems one rather than beside it. Where that describes what software does about the hardware — page tables, the language memory model, false sharing as a symptom — this describes the mechanism underneath, and cross-references rather than repeats. Reading them together is the intended order.",
    "Every figure here is typical of a contemporary high-performance core and not a measurement of your machine: pipeline depths, misprediction penalties, cache sizes and latencies, instruction throughputs and vector behaviour all vary by generation and by vendor, and some of them vary between two parts with the same model name. The ratios are what the reasoning rests on. Where a specific number matters to a decision, measure it — with the frequency pinned, the inputs varied the way production varies them, and the whole program timed rather than the loop.",
  ],
};
