import type { Subject } from "../../types.js";
import { levels } from "./curriculum.js";
import { questions } from "./questions.js";
import { anims } from "./anims.js";
import { calcs } from "./calcs.js";

export const electro: Subject = {
  id: "electro",
  name: "Instalații electrice",
  tagline: "teorie instalații electrice",
  levels,
  questions,
  anims,
  calcs,
  disclaimer: [
    "Materialul acoperă teoria de bază și practica curentă a instalațiilor electrice de joasă tensiune. Nu înlocuiește tematica și bibliografia oficială publicate de ANRE pentru sesiunea de examen la care te înscrii — acelea se actualizează și sunt singurele care contează la examen.",
    "Verifică întotdeauna valorile normate în ediția în vigoare a normativului aplicabil înainte de a le folosi într-un proiect.",
  ],
};
