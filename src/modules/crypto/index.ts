import type { Subject } from "../../types.js";
import { levels } from "./curriculum.js";
import { questions } from "./questions.js";
import { anims } from "./anims.js";
import { calcs } from "./calcs.js";

export const crypto: Subject = {
  id: "crypto",
  name: "Cryptography",
  tagline: "cryptography, and how it is broken",
  levels,
  questions,
  anims,
  calcs,
  disclaimer: [
    "This material teaches how the primitives work and how deployed systems fail, not how to build either. Where a construction is named as broken — textbook RSA, ECB, MAC-then-encrypt, PKCS#1 v1.5 encryption — that is a settled judgement with published attacks behind it; where a parameter is quoted, it is the figure the relevant standard or the literature gives, and standards move.",
    "Nothing here is an instruction to implement anything. Every module that describes an attack describes it because the defence is only legible once you can see what it defends against, and every one of them ends at the same advice: use a maintained library, at the highest level of abstraction that does the job. The failures in this subject are overwhelmingly in code written by people who understood the mathematics and implemented it themselves.",
  ],
};
