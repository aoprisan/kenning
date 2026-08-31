import type { Subject } from "../../types.js";
import { levels } from "./curriculum.js";
import { questions } from "./questions.js";
import { anims } from "./anims.js";
import { calcs } from "./calcs.js";

export const os: Subject = {
  id: "os",
  name: "Operating systems",
  tagline: "operating systems, and where they leak",
  levels,
  questions,
  anims,
  calcs,
  disclaimer: [
    "This material describes how operating systems work in general and uses Linux for the specifics, because that is what most readers will be looking at. Where a figure is given — syscall cost, TLB reach, a latency in the hierarchy — it is an order of magnitude rather than a measurement of your machine, and the ratios are what the reasoning depends on. Where a mechanism is named as a Linux one, another kernel may solve the same problem differently.",
    "Kernel behaviour moves. Scheduler policies, writeback tuning, transparent huge pages, cgroup semantics and the default I/O scheduler have all changed within recent memory, and the fsync error-reporting behaviour described in o11 changed because of the incident described alongside it. Check the manual page and your own kernel version before relying on a specific behaviour, and measure on the machine you actually care about.",
  ],
};
