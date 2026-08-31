import { num } from "../../helpers.js";
export const calcs = {
    ohm: {
        title: "Legea lui Ohm și puterea", hint: "completează două valori",
        fields: [
            { k: "U", l: "Tensiune U", u: "V", v: 230 },
            { k: "I", l: "Curent I", u: "A", v: 5 },
            { k: "R", l: "Rezistență R", u: "Ω", v: "" }
        ],
        run(f) {
            let { U, I, R } = f;
            const out = [];
            if (U && I) {
                R = U / I;
            }
            else if (U && R) {
                I = U / R;
            }
            else if (I && R) {
                U = I * R;
            }
            else
                return { lines: [["Introdu două valori", "—"]] };
            const P = U * I;
            out.push(["Tensiune U", num(U, 1) + " V"], ["Curent I", num(I, 2) + " A"], ["Rezistență R", num(R, 2) + " Ω"], ["Putere P", num(P, 1) + " W"], ["Energie în 24 h", num(P * 24 / 1000, 2) + " kWh"]);
            return { lines: out };
        }
    },
    cosfi: {
        title: "Compensarea factorului de putere", hint: "baterie de condensatoare",
        fields: [
            { k: "P", l: "Putere activă", u: "kW", v: 100 },
            { k: "c1", l: "cos φ actual", u: "", v: 0.72 },
            { k: "c2", l: "cos φ țintă", u: "", v: 0.95 },
            { k: "U", l: "Tensiune de linie", u: "V", v: 400 }
        ],
        run({ P, c1, c2, U }) {
            if (!P || !c1 || !c2)
                return { lines: [["Completează câmpurile", "—"]] };
            if (c1 > 1 || c2 > 1 || c1 <= 0 || c2 <= 0)
                return { lines: [["cos φ trebuie să fie între 0 și 1", "—"]], bad: "Valoare imposibilă pentru factorul de putere." };
            const t1 = Math.tan(Math.acos(c1)), t2 = Math.tan(Math.acos(c2));
            const Qc = P * (t1 - t2), S1 = P / c1, S2 = P / c2;
            const C = U ? Qc * 1000 / (3 * 2 * Math.PI * 50 * U * U) * 1e6 : NaN;
            return { lines: [
                    ["Putere aparentă înainte", num(S1, 1) + " kVA"],
                    ["Putere aparentă după", num(S2, 1) + " kVA"],
                    ["Reducerea curentului absorbit", num((1 - c1 / c2) * 100, 1) + " %"],
                    ["Baterie necesară Q_c", num(Qc, 1) + " kvar"],
                    ["Capacitate pe fază (triunghi)", num(C, 1) + " µF"]
                ], ok: `Trecerea de la cos φ ${c1} la ${c2} descarcă rețeaua cu ${num(S1 - S2, 1)} kVA.` };
        }
    },
    trifazat: {
        title: "Puteri în rețea trifazată", hint: "sistem echilibrat, 400 V",
        fields: [
            { k: "U", l: "Tensiune de linie", u: "V", v: 400 },
            { k: "I", l: "Curent de linie", u: "A", v: 32 },
            { k: "c", l: "cos φ", u: "", v: 0.85 }
        ],
        run({ U, I, c }) {
            if (!U || !I || !c)
                return { lines: [["Completează câmpurile", "—"]] };
            const S = Math.sqrt(3) * U * I / 1000, P = S * c, Q = S * Math.sin(Math.acos(c));
            return { lines: [
                    ["Tensiune de fază", num(U / Math.sqrt(3), 1) + " V"],
                    ["Putere aparentă S", num(S, 2) + " kVA"],
                    ["Putere activă P", num(P, 2) + " kW"],
                    ["Putere reactivă Q", num(Q, 2) + " kvar"],
                    ["Aceeași putere, monofazat ar cere", num(P * 1000 / (230 * c), 1) + " A"]
                ] };
        }
    },
    cadere: {
        title: "Cădere de tensiune și secțiune", hint: "criteriul 2 din 3",
        fields: [
            { k: "mode", l: "Tip circuit", u: "", v: "3", sel: [["3", "Trifazat"], ["1", "Monofazat"]] },
            { k: "mat", l: "Material", u: "", v: "cu", sel: [["cu", "Cupru"], ["al", "Aluminiu"]] },
            { k: "L", l: "Lungime traseu", u: "m", v: 45 },
            { k: "I", l: "Curent de utilizare", u: "A", v: 25 },
            { k: "S", l: "Secțiune propusă", u: "mm²", v: 6 },
            { k: "c", l: "cos φ", u: "", v: 0.9 },
            { k: "lim", l: "Limită admisă", u: "%", v: 5 }
        ],
        run({ mode, mat, L, I, S, c, lim }) {
            if (!L || !I || !S)
                return { lines: [["Completează câmpurile", "—"]] };
            const rho = mat === "al" ? 0.0282 : 0.0175;
            const tri = mode === "3";
            const k = tri ? Math.sqrt(3) : 2;
            const Un = tri ? 400 : 230;
            const dU = k * rho * L * I * c / S;
            const pct = dU / Un * 100;
            const Smin = k * rho * L * I * c / (lim / 100 * Un);
            const std = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
            const rec = std.find(s => s >= Smin) || ">120";
            const okv = pct <= lim;
            return { lines: [
                    ["Cădere de tensiune", num(dU, 2) + " V"],
                    ["Procentual", num(pct, 2) + " %"],
                    ["Secțiune minimă teoretică", num(Smin, 2) + " mm²"],
                    ["Secțiune standardizată recomandată", rec + " mm²"]
                ], ok: okv ? `Se încadrează în limita de ${lim} %.` : null,
                bad: okv ? null : `Depășește limita de ${lim} %. Treci la ${rec} mm² sau scurtează traseul.` };
        }
    },
    scc: {
        title: "Verificarea deconectării în schema TN", hint: "bucla de defect",
        fields: [
            { k: "U", l: "Tensiune fază-pământ U₀", u: "V", v: 230 },
            { k: "In", l: "Curent nominal protecție", u: "A", v: 16 },
            { k: "curba", l: "Curbă de declanșare", u: "", v: "10", sel: [["5", "B (5 × In)"], ["10", "C (10 × In)"], ["20", "D (20 × In)"]] },
            { k: "Zs", l: "Impedanță buclă măsurată", u: "Ω", v: 0.9 }
        ],
        run({ U, In, curba, Zs }) {
            if (!U || !In || !Zs)
                return { lines: [["Completează câmpurile", "—"]] };
            const Ia = curba * In, Zmax = U / Ia, Ik = U / Zs;
            const okv = Zs <= Zmax;
            return { lines: [
                    ["Curent de declanșare magnetică I_a", num(Ia, 0) + " A"],
                    ["Impedanță maximă admisă Z_s", num(Zmax, 3) + " Ω"],
                    ["Curent prezumat de defect", num(Ik, 0) + " A"],
                    ["Marjă", num((Zmax - Zs) / Zmax * 100, 1) + " %"]
                ], ok: okv ? "Protecția declanșează magnetic în timpul impus." : null,
                bad: okv ? null : "Impedanța buclei e prea mare. Treci pe curbă B, mărește secțiunea PE sau adaugă protecție diferențială." };
        }
    },
    tt: {
        title: "Verificarea schemei TT", hint: "tensiune de atingere",
        fields: [
            { k: "Ra", l: "Rezistența prizei de pământ", u: "Ω", v: 40 },
            { k: "Idn", l: "Curent diferențial nominal", u: "mA", v: 30 }
        ],
        run({ Ra, Idn }) {
            if (!Ra || !Idn)
                return { lines: [["Completează câmpurile", "—"]] };
            const Ut = Ra * Idn / 1000;
            const Ramax = 50 / (Idn / 1000);
            const okv = Ut <= 50;
            return { lines: [
                    ["Tensiune de atingere prezumată", num(Ut, 2) + " V"],
                    ["Limita convențională", "50 V"],
                    ["Rezistență maximă admisă a prizei", num(Ramax, 0) + " Ω"]
                ], ok: okv ? "Condiția R_a · I_Δn ≤ 50 V este îndeplinită." : null,
                bad: okv ? null : "Tensiunea de atingere depășește 50 V. Reduci rezistența prizei sau treci la un DDR mai sensibil." };
        }
    },
    pv: {
        title: "Tensiunea de gol a stringului la rece", hint: "cea mai frecventă eroare de proiectare",
        fields: [
            { k: "Ns", l: "Module în serie", u: "buc", v: 18 },
            { k: "Voc", l: "V_oc al modulului la STC", u: "V", v: 41.5 },
            { k: "beta", l: "Coeficient de temperatură", u: "%/°C", v: -0.28 },
            { k: "Tmin", l: "Temperatură minimă amplasament", u: "°C", v: -20 },
            { k: "Vmax", l: "Tensiune maximă invertor", u: "V", v: 1000 }
        ],
        run({ Ns, Voc, beta, Tmin, Vmax }) {
            if (!Ns || !Voc)
                return { lines: [["Completează câmpurile", "—"]] };
            const Vstc = Ns * Voc;
            const Vcold = Vstc * (1 + beta / 100 * (Tmin - 25));
            const okv = Vcold < Vmax;
            const Nmax = Math.floor(Vmax / (Voc * (1 + beta / 100 * (Tmin - 25))));
            return { lines: [
                    ["V_oc string la 25 °C", num(Vstc, 1) + " V"],
                    [`V_oc string la ${Tmin} °C`, num(Vcold, 1) + " V"],
                    ["Creștere față de STC", num((Vcold / Vstc - 1) * 100, 1) + " %"],
                    ["Module maxime admise în serie", Nmax + " buc"]
                ], ok: okv ? `Rămâne sub limita invertorului, cu o marjă de ${num(Vmax - Vcold, 0)} V.` : null,
                bad: okv ? null : `Depășește limita invertorului. Redu stringul la ${Nmax} module.` };
        }
    },
    ev: {
        title: "Circuitul unei stații de încărcare", hint: "sarcină continuă",
        fields: [
            { k: "P", l: "Putere stație", u: "kW", v: 11 },
            { k: "faze", l: "Alimentare", u: "", v: "3", sel: [["3", "Trifazată 400 V"], ["1", "Monofazată 230 V"]] },
            { k: "L", l: "Lungime circuit", u: "m", v: 25 }
        ],
        run({ P, faze, L }) {
            if (!P)
                return { lines: [["Completează câmpurile", "—"]] };
            const tri = faze === "3";
            const U = tri ? 400 : 230;
            const I = tri ? P * 1000 / (Math.sqrt(3) * U) : P * 1000 / U;
            const std = [16, 20, 25, 32, 40, 63];
            const mcb = std.find(s => s >= I * 1.0) || 63;
            const rho = 0.0175, k = tri ? Math.sqrt(3) : 2, Un = U;
            const secs = [2.5, 4, 6, 10, 16, 25];
            const S = secs.find(s => (k * rho * L * I / s) / Un * 100 <= 3) || 25;
            const dU = k * rho * L * I / S;
            return { lines: [
                    ["Curent absorbit", num(I, 1) + " A"],
                    ["Disjunctor recomandat", mcb + " A, curbă C"],
                    ["Secțiune cupru pentru ΔU ≤ 3 %", S + " mm²"],
                    ["Cădere de tensiune rezultată", num(dU / Un * 100, 2) + " %"],
                    ["Protecție diferențială", "tip B, sau tip A + detecție 6 mA c.c."]
                ], ok: "Circuit dedicat, fără alte receptoare. Fără coeficient de simultaneitate." };
        }
    }
};
//# sourceMappingURL=calcs.js.map