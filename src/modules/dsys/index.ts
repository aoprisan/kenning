import type { Subject } from "../../types.js";
import { levels } from "./curriculum.js";
import { questions } from "./questions.js";
import { anims } from "./anims.js";
import { calcs } from "./calcs.js";

export const dsys: Subject = {
  id: "dsys",
  name: "Distributed systems",
  tagline: "distributed systems theory",
  levels,
  questions,
  anims,
  calcs,
  disclaimer: [
    "This material teaches the models and the reasoning, not any particular product. Where a result is stated as a theorem — FLP, the quorum intersection bound — it is exact; where a system is described, it is described at the level of what problem each mechanism solves, and the implementation you are running may differ in the details that matter to you.",
    "Before relying on a guarantee, check what your database, queue or coordination service actually documents. Marketing language and the consistency model in the manual are frequently not the same claim.",
  ],
};
