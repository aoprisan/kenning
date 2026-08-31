import { F, W } from "../../helpers.js";
/**
 * Electro curriculum. Content is Romanian on purpose: the terminology is what
 * gets examined. Do NOT invent normative values — see CLAUDE.md.
 */
export const levels = [
    { name: "Nivelul 0 · Fundamente", mods: [
            { id: "m1", t: "Mărimi și legi de bază", calc: "ohm",
                blurb: "Ce curge, ce împinge, ce se opune. Fără asta, tot restul e memorare pe dinafară.",
                body: `
<h3>Cele patru mărimi</h3>
<p><span class="term-def">Curentul</span> <em>I</em> este debitul de sarcină electrică printr-o secțiune, măsurat în amperi (1 A = 1 C/s). <span class="term-def">Tensiunea</span> <em>U</em> este diferența de potențial care împinge sarcina, în volți. <span class="term-def">Rezistența</span> <em>R</em> este opoziția conductorului, în ohmi. <span class="term-def">Puterea</span> <em>P</em> este ritmul de transfer al energiei, în wați.</p>
${F(`<b>Legea lui Ohm</b>   U = I · R      I = U / R      R = U / I
<b>Puterea</b>         P = U · I      P = I² · R      P = U² / R
<b>Energia</b>         W = P · t      [kWh] = [kW] · [h]`)}

<h3>Rezistivitatea conductorului</h3>
<p>Rezistența unui conductor nu e o proprietate abstractă — rezultă din material, lungime și secțiune. Este relația pe care o vei folosi la fiecare calcul de cădere de tensiune.</p>
${F(`R = ρ · L / S

ρ_Cu = 0,0175 Ω·mm²/m      ρ_Al = 0,0282 Ω·mm²/m
L = lungimea conductorului [m]     S = secțiunea [mm²]`)}
<p>Aluminiul are rezistivitatea cu circa 61 % mai mare decât cuprul, deci pentru aceeași pierdere are nevoie de o secțiune mai mare — de regulă cu un pas sau două pe scara standardizată.</p>

<h3>Legile lui Kirchhoff</h3>
<ul>
<li><span class="term-def">Legea curenților (nodul):</span> suma curenților care intră într-un nod este egală cu suma celor care ies. Nimic nu se acumulează într-un punct de conexiune.</li>
<li><span class="term-def">Legea tensiunilor (ochiul):</span> pe orice buclă închisă, suma algebrică a tensiunilor este zero. Ce urcă pe sursă coboară pe consumatori.</li>
</ul>

<h3>Serie și paralel</h3>
${F(`Serie:    R = R₁ + R₂ + …        acelaşi curent, tensiunile se împart
Paralel:  1/R = 1/R₁ + 1/R₂ + …   aceeaşi tensiune, curenţii se însumează`)}
<p>Instalația unei clădiri e, în esență, o structură paralelă: fiecare circuit vede aceeași tensiune de fază, iar curenții lor se adună în tabloul din amonte. De aici vine și noțiunea de coeficient de simultaneitate — nu toate circuitele cer maximul în același moment.</p>`,
                facts: [
                    "1 kWh = 3,6 MJ. Un radiator de 2 kW pornit 3 ore consumă 6 kWh.",
                    "Secțiunile standardizate uzuale: 1,5 · 2,5 · 4 · 6 · 10 · 16 · 25 · 35 · 50 mm².",
                    "Rezistivitatea crește cu temperatura: la 70 °C, cuprul are cu ~18 % mai multă rezistență decât la 20 °C."
                ] },
            { id: "m2", t: "Curentul alternativ", calc: null,
                blurb: "De ce 230 V nu înseamnă 230 V, și de ce bobinele și condensatoarele schimbă regulile.",
                body: `
<h3>Sinusoida și valoarea efectivă</h3>
<p>Rețeaua din România livrează o tensiune sinusoidală cu frecvența de 50 Hz, adică 50 de cicluri complete pe secundă, deci o perioadă de 20 ms. Valoarea de 230 V nu este vârful undei, ci <span class="term-def">valoarea efectivă</span> (RMS) — tensiunea continuă care ar produce aceeași putere disipată pe o rezistență.</p>
${F(`U_ef = U_max / √2  ≈  U_max · 0,707
U_max = 230 · √2 ≈ 325 V      (vârful real al rețelei)
T = 1/f = 1/50 = 20 ms`)}
<p>Consecință practică: izolația și componentele trebuie să suporte 325 V, nu 230 V. Pe rețeaua trifazată, între faze vârful ajunge la circa 565 V.</p>

<h3>Reactanță și impedanță</h3>
<p>Rezistorul se opune curentului la fel indiferent de frecvență. Bobina și condensatorul nu — opoziția lor depinde de frecvență și, mai important, decalează curentul față de tensiune.</p>
${F(`Bobina:        X_L = 2π · f · L        curentul rămâne în urmă cu 90°
Condensator:   X_C = 1 / (2π · f · C)  curentul o ia înainte cu 90°
Impedanţa:     Z = √(R² + (X_L − X_C)²)
Defazajul:     tan φ = (X_L − X_C) / R`)}

<h3>De ce contează defazajul</h3>
<p>Motoarele, transformatoarele și balasturile sunt sarcini predominant inductive: curentul rămâne în urma tensiunii. Curentul suplimentar circulă prin conductoare, le încălzește și le încarcă, dar nu produce lucru mecanic. Acesta este miezul problemei factorului de putere, tratată în modulul următor.</p>

<h3>Armonici — prima întâlnire</h3>
<p>Sarcinile neliniare (surse în comutație, invertoare, LED-uri, variatoare de turație) nu absorb un curent sinusoidal. Curentul deformat se descompune matematic în armonici: multipli ai frecvenței fundamentale. Armonica de ordinul 3 și multiplii ei se însumează pe conductorul neutru în loc să se anuleze — motivul pentru care neutrul unui tablou cu multe surse în comutație se poate încălzi mai tare decât fazele.</p>`,
                facts: [
                    "230 V efectiv înseamnă 325 V vârf; 400 V între faze înseamnă 565 V vârf.",
                    "La 50 Hz, o bobină de 100 mH are X_L ≈ 31,4 Ω.",
                    "Toleranța admisă a tensiunii de rețea în regim normal este ±10 % din valoarea nominală."
                ] },
            { id: "m3", t: "Puteri și factor de putere", calc: "cosfi",
                blurb: "Activă, reactivă, aparentă — și de ce facturile industriale au o rubrică pentru energie care nu face nimic.",
                body: `
<h3>Triunghiul puterilor</h3>
<p><span class="term-def">Puterea activă</span> P [W] este cea care se transformă în lucru mecanic, căldură sau lumină. <span class="term-def">Puterea reactivă</span> Q [var] oscilează între sursă și câmpurile magnetice sau electrice ale sarcinii, fără consum net. <span class="term-def">Puterea aparentă</span> S [VA] este produsul brut tensiune × curent și este mărimea care dimensionează cablurile, transformatorul și aparatajul.</p>
${F(`S = √(P² + Q²)
P = S · cos φ        Q = S · sin φ
cos φ = P / S        (factorul de putere)

Monofazat:  S = U · I
Trifazat:   S = √3 · U_linie · I     P = √3 · U_l · I · cos φ`)}

<h3>De ce se penalizează un cos φ scăzut</h3>
<p>Un consumator de 100 kW cu cos φ = 0,70 solicită rețelei 143 kVA. Același consumator la cos φ = 0,95 solicită 105 kVA. Diferența de 38 kVA se traduce direct în secțiune de cablu, în încărcarea transformatorului și în pierderi pe linie — costuri suportate de operatorul de rețea, care le recuperează prin tarifarea energiei reactive.</p>

<h3>Compensarea</h3>
<p>Sarcina inductivă cere reactivă; condensatorul o produce. Montând baterii de condensatoare în paralel cu sarcina, reactiva circulă local între condensator și motor, iar rețeaua vede doar diferența.</p>
${F(`Q_c = P · (tan φ₁ − tan φ₂)

φ₁ = defazajul actual        φ₂ = defazajul ţintă (uzual cos φ = 0,92…0,95)
Condensator în triunghi:  C = Q_c / (3 · 2π · f · U_l²)`)}
${W(`<b>Atenție:</b> supracompensarea (cos φ capacitiv) e la fel de penalizată ca subcompensarea și poate produce supratensiuni la mersul în gol. Bateriile automate cu trepte și regulator sunt soluția standard, nu condensatorul fix.`)}`,
                facts: [
                    "Un motor asincron în gol are cos φ ≈ 0,2; la sarcină nominală ajunge la 0,85–0,90.",
                    "Pragul contractual uzual pentru penalizare este cos φ = 0,92 (tan φ = 0,4258).",
                    "Condensatoarele nu reduc puterea activă consumată — reduc doar curentul absorbit din rețea."
                ] },
            { id: "m4", t: "Rețeaua trifazată", calc: "trifazat",
                blurb: "Stea, triunghi, √3, și motivul pentru care neutrul nu e opțional.",
                body: `
<h3>De ce trei faze</h3>
<p>Trei tensiuni sinusoidale de aceeași amplitudine, decalate cu 120° una față de alta, transportă putere constantă în timp — spre deosebire de monofazat, unde puterea instantanee pulsează cu dublul frecvenței. Rezultatul: motoare cu cuplu uniform, care pornesc singure, și un transport de energie cu mai puțin cupru pe kilowatt.</p>

<h3>Stea și triunghi</h3>
${F(`Conexiune stea (Y):   U_linie = √3 · U_fază     I_linie = I_fază
Conexiune triunghi (Δ): U_linie = U_fază         I_linie = √3 · I_fază

Reţeaua de joasă tensiune din România: 230 / 400 V
230 · √3 = 398,4 ≈ 400 V`)}
<p>Rețeaua publică de joasă tensiune este în stea cu neutrul accesibil: între fază și neutru se obțin 230 V pentru consumatorii casnici, între două faze 400 V pentru motoare și receptoare de putere.</p>

<h3>Neutrul și dezechilibrul</h3>
<p>Dacă cele trei faze sunt încărcate identic, curenții lor se anulează vectorial și prin neutru nu circulă nimic. În practică sarcinile monofazate nu sunt niciodată perfect repartizate, iar neutrul preia diferența. De aici două reguli de proiectare:</p>
<ul>
<li>Circuitele monofazate se repartizează cât mai uniform pe cele trei faze, la stabilirea schemei tabloului.</li>
<li>Neutrul nu se protejează cu siguranță și nu se întrerupe niciodată separat de faze. Un neutru întrerupt într-o rețea dezechilibrată produce supratensiune pe faza cu sarcină mică — cauza clasică a arderii simultane a mai multor aparate dintr-un imobil.</li>
</ul>
${W(`<b>Succesiunea fazelor</b> contează pentru orice receptor rotativ. Inversarea a două faze inversează sensul de rotație al motorului — o pompă care merge invers poate distruge instalația în minute.`)}`,
                facts: [
                    "√3 ≈ 1,732. Aproape toate formulele trifazate îl conțin — memorează-l.",
                    "Un cablu trifazat transportă aceeași putere ca trei circuite monofazate, cu aproximativ jumătate din cupru.",
                    "Un motor de 400 V în triunghi conectat greșit în stea primește 58 % din tensiune și dezvoltă o treime din putere."
                ] }
        ] },
    { name: "Nivelul 1 · Instalația", mods: [
            { id: "m5", t: "Conductoare și dimensionare", calc: "cadere",
                blurb: "Trei criterii, toate obligatorii: curent admisibil, cădere de tensiune, rezistență la scurtcircuit.",
                body: `
<h3>Cele trei criterii de dimensionare</h3>
<p>O secțiune de conductor se alege verificând trei condiții independente. Secțiunea finală este cea mai mare dintre valorile rezultate; nicio condiție nu o poate anula pe alta.</p>
<ul>
<li><span class="term-def">Curentul maxim admisibil</span> — conductorul nu trebuie să depășească temperatura maximă a izolației în regim permanent.</li>
<li><span class="term-def">Căderea de tensiune</span> — receptorul de la capăt trebuie să primească tensiune în limitele admise.</li>
<li><span class="term-def">Stabilitatea termică la scurtcircuit</span> — conductorul trebuie să suporte energia lăsată să treacă de protecție până la deconectare.</li>
</ul>

<h3>Curentul admisibil și factorii de corecție</h3>
<p>Valoarea din tabel este pentru condiții de referință. Realitatea le degradează aproape întotdeauna:</p>
${F(`I_z = I_tabel · k_temperatură · k_grupare · k_izolaţie termică

Exemple de corecţii tipice:
  6 circuite grupate în acelaşi tub      k ≈ 0,57
  temperatura ambiantă 40 °C (PVC)       k ≈ 0,87
  cablu în vată minerală pe o faţă       k ≈ 0,77`)}
<p>Condiția de coordonare cu protecția, care leagă cele două lumi:</p>
${F(`I_B  ≤  I_n  ≤  I_z

I_B = curentul de utilizare al circuitului
I_n = curentul nominal al aparatului de protecţie
I_z = curentul admisibil corectat al conductorului`)}

<h3>Căderea de tensiune</h3>
${F(`Monofazat:  ΔU = 2 · ρ · L · I · cos φ / S
Trifazat:   ΔU = √3 · ρ · L · I · cos φ / S

ΔU% = ΔU / U_nominal · 100

Limite uzuale, măsurate de la punctul de racord:
  circuite de iluminat     3 %
  celelalte circuite       5 %`)}
<p>Factorul 2 la monofazat vine din faptul că se contorizează dus-întors: curentul parcurge și faza, și neutrul. La trifazat echilibrat, prin neutru nu circulă curent, de unde √3 în loc de 2.</p>

<h3>Secțiuni minime impuse</h3>
<ul>
<li>Circuite de iluminat: 1,5 mm² cupru.</li>
<li>Circuite de prize: 2,5 mm² cupru.</li>
<li>Coloane și circuite de forță: rezultă din calcul, niciodată sub 2,5 mm².</li>
<li>Conductorul de protecție PE: egal cu faza până la 16 mm²; 16 mm² pentru faze între 16 și 35 mm²; jumătate din secțiunea fazei peste 35 mm².</li>
</ul>`,
                facts: [
                    "Aluminiul nu se admite în instalațiile interioare ale clădirilor civile; secțiunea minimă în general este 16 mm² pentru Al.",
                    "Un circuit de prize pe 2,5 mm² se protejează la 16 A, nu la 20 A sau 25 A.",
                    "Culorile obligatorii: verde-galben exclusiv pentru PE, albastru deschis pentru neutru."
                ] },
            { id: "m6", t: "Aparate de protecție", calc: "scc",
                blurb: "Curbe B, C, D; capacitate de rupere; selectivitate. Protecția la suprasarcină și la scurtcircuit sunt două funcții diferite.",
                body: `
<h3>Două funcții, un singur aparat</h3>
<p>Un disjunctor modular conține două declanșatoare distincte. <span class="term-def">Declanșatorul termic</span> — o lamelă bimetalică — reacționează lent la suprasarcini moderate și prelungite. <span class="term-def">Declanșatorul magnetic</span> — o bobină — reacționează în milisecunde la curenți mari, tipici scurtcircuitului. Curba de declanșare este graficul celor două puse cap la cap.</p>

<h3>Curbele de declanșare</h3>
${F(`Curba B:  declanşare magnetică la 3…5 × I_n
Curba C:  declanşare magnetică la 5…10 × I_n
Curba D:  declanşare magnetică la 10…20 × I_n`)}
<ul>
<li><span class="term-def">B</span> — circuite rezistive, iluminat, prize, instalații lungi cu impedanță de buclă mare unde un C nu ar declanșa magnetic la defect.</li>
<li><span class="term-def">C</span> — uzul general, sarcini cu vârf moderat de pornire.</li>
<li><span class="term-def">D</span> — transformatoare, motoare mari, sarcini cu vârf de magnetizare pronunțat.</li>
</ul>

<h3>Capacitatea de rupere</h3>
<p>Curentul nominal spune ce transportă aparatul. <span class="term-def">Capacitatea de rupere</span> (Icn, marcată în dreptunghi pe carcasă: 4500, 6000, 10000) spune ce scurtcircuit poate întrerupe fără să se distrugă. Trebuie să depășească curentul de scurtcircuit prezumat în punctul de montaj — mai mare aproape de transformator, mai mic la capătul unei linii lungi.</p>

<h3>Selectivitatea</h3>
<p>La un defect trebuie să declanșeze numai protecția imediat din amonte de el, nu întregul tablou. Se obține prin trei mecanisme:</p>
<ul>
<li><span class="term-def">Amperometrică</span> — raport de cel puțin 1:1,6 între curenții nominali în cascadă.</li>
<li><span class="term-def">Cronometrică</span> — temporizare intenționată pe aparatul din amonte.</li>
<li><span class="term-def">Logică</span> — comunicație între protecții, la instalațiile mari.</li>
</ul>
${W(`<b>Greșeala frecventă:</b> înlocuirea unui disjunctor declanșat cu unul de curent mai mare. Aparatul nu e defect — semnalează o suprasarcină reală sau un defect de izolație. Mărirea protecției transferă solicitarea pe conductor, care nu are cine să-l apere.`)}`,
                facts: [
                    "Un MCB C16 lasă să treacă 16 A la nesfârșit și declanșează termic la ~1,45 × I_n în mai puțin de o oră.",
                    "Siguranța fuzibilă are capacitate de rupere mult mai mare decât un MCB modular și rămâne soluția la branșamente.",
                    "Marcajul din dreptunghi (ex. 6000) este capacitatea de rupere în amperi, nu curentul nominal."
                ] },
            { id: "m7", t: "Protecția diferențială", calc: null,
                blurb: "DDR-ul nu protejează instalația. Protejează omul — și numai dacă e de tipul potrivit.",
                body: `
<h3>Principiul</h3>
<p>Un dispozitiv de protecție la curent diferențial rezidual (DDR, în literatura internațională RCD) însumează vectorial curenții prin toate conductoarele active. În funcționare normală suma este zero: tot ce intră prin fază se întoarce prin neutru. Dacă o parte din curent pleacă spre pământ — prin izolația defectă sau prin corpul unui om — suma nu mai este zero, iar dispozitivul deschide circuitul.</p>
${F(`Δ I = |I_fază − I_neutru|  →  declanşare când Δ I ≥ I_Δn

I_Δn = 30 mA   protecţia persoanelor
I_Δn = 300 mA  protecţia la incendiu
I_Δn = 10 mA   medii speciale, spaţii medicale`)}

<h3>Tipurile — partea care se greșește cel mai des</h3>
<ul>
<li><span class="term-def">Tip AC</span> — detectează numai curent alternativ sinusoidal. Insuficient pentru instalații moderne.</li>
<li><span class="term-def">Tip A</span> — alternativ plus curent pulsatoriu continuu. Standardul de facto pentru circuitele casnice cu electronică.</li>
<li><span class="term-def">Tip F</span> — tip A plus frecvențe compuse; pentru circuite alimentate prin convertizoare de frecvență, ex. mașini de spălat moderne.</li>
<li><span class="term-def">Tip B</span> — detectează inclusiv curent continuu neted. Obligatoriu la stații de încărcare EV și la invertoare fotovoltaice fără separare galvanică.</li>
</ul>
${W(`<b>Un DDR tip AC pus în amonte de o stație de încărcare EV poate fi „orbit” de o componentă continuă de defect și să nu mai declanșeze deloc, inclusiv la un defect alternativ ulterior.</b> Este un mod de cedare tăcut: aparatul pare montat, dar nu mai protejează.`)}

<h3>Declanșări nedorite</h3>
<p>Curenții de fugă normali se însumează. Fiecare filtru EMC din sursele de alimentare pierde câțiva miliamperi spre PE; douăzeci de calculatoare pe același DDR de 30 mA îl pot ține permanent la limită. Soluția este împărțirea pe mai multe DDR-uri, nu creșterea pragului.</p>

<h3>Testarea</h3>
<p>Butonul de test verifică mecanismul, nu pragul real de declanșare și nici timpul. Verificarea corectă se face cu aparat de măsură, la I_Δn și la 5 × I_Δn, cu înregistrarea timpilor.</p>`,
                facts: [
                    "Pragul de fibrilație ventriculară e în jur de 30 mA la 50 Hz — de aici valoarea standard.",
                    "Timpul maxim de declanșare pentru un DDR general la I_Δn este 300 ms; la 5 × I_Δn, 40 ms.",
                    "Butonul de test trebuie acționat periodic; un DDR nemanevrat ani de zile se poate gripa."
                ] },
            { id: "m8", t: "Scheme de legare la pământ", calc: "tt",
                blurb: "TN-C, TN-S, TN-C-S, TT, IT. Două litere care decid cum se comportă instalația la primul defect.",
                body: `
<h3>Cum se citesc literele</h3>
<p><span class="term-def">Prima literă</span> descrie legătura sursei la pământ: <em>T</em> = neutrul sursei legat direct la pământ, <em>I</em> = izolat sau legat prin impedanță mare. <span class="term-def">A doua literă</span> descrie legătura maselor: <em>T</em> = masele legate la o priză proprie, <em>N</em> = masele legate la neutrul sursei. Literele suplimentare arată dacă funcțiile de neutru și protecție sunt separate: <em>S</em> = separate, <em>C</em> = combinate.</p>

<h3>Schemele</h3>
<ul>
<li><span class="term-def">TN-C</span> — neutrul și protecția pe același conductor, PEN. Un defect de izolație produce un scurtcircuit franc, deconectat de protecția de supracurent. Ieftină, dar o întrerupere a PEN pune tensiune pe carcase. Interzisă în aval de un DDR și pentru secțiuni mici.</li>
<li><span class="term-def">TN-S</span> — N și PE separate pe tot traseul. Schema recomandată pentru instalații noi.</li>
<li><span class="term-def">TN-C-S</span> — PEN de la transformator până la un punct de separare, apoi N și PE distincte. Cea mai răspândită situație reală în România. Punctul de separare nu se mai poate reuni niciodată în aval.</li>
<li><span class="term-def">TT</span> — masele au priză proprie, independentă de cea a sursei. Curentul de defect e limitat de suma rezistențelor de pământ și e adesea prea mic pentru protecția de supracurent, deci <em>DDR-ul devine obligatoriu</em>.</li>
<li><span class="term-def">IT</span> — sursa izolată de pământ. Primul defect nu produce curent semnificativ și instalația continuă să funcționeze, semnalizată de un controler permanent de izolație. Se folosește unde întreruperea e inacceptabilă: săli de operație, procese continue.</li>
</ul>

<h3>Condițiile de deconectare automată</h3>
${F(`În TN:   Z_s · I_a  ≤  U₀
   Z_s = impedanţa buclei de defect
   I_a = curentul care asigură declanşarea în timpul impus
   U₀ = tensiunea faţă de pământ (230 V)

În TT:   R_a · I_Δn  ≤  50 V
   R_a = rezistenţa prizei de pământ a maselor
   I_Δn = curentul diferenţial nominal al DDR`)}
<p>Timpii maximi de deconectare pentru circuitele terminale de până la 32 A, la 230 V: 0,4 s în TN și 0,2 s în TT. Pentru circuitele de distribuție: 5 s în TN, 1 s în TT.</p>`,
                facts: [
                    "Într-o schemă TT cu DDR de 30 mA, condiția R_a · I_Δn ≤ 50 V se satisface până la o priză de 1666 Ω — practic mereu.",
                    "Conductorul PEN se marchează verde-galben cu manșoane albastre la capete.",
                    "Odată separate N și PE într-o schemă TN-C-S, orice reunire în aval anulează protecția diferențială."
                ] },
            { id: "m9", t: "Priza de pământ și echipotențializarea", calc: null,
                blurb: "Rezistența de dispersie, centura interioară, legăturile echipotențiale — și de ce „am bătut un țăruș” nu e o priză de pământ.",
                body: `
<h3>Ce face de fapt priza de pământ</h3>
<p>Rolul ei nu este să „absoarbă” curentul de defect, ci să mențină potențialul maselor apropiat de cel al solului, astfel încât o persoană care atinge simultan o carcasă și pământul să nu fie supusă unei tensiuni periculoase. Într-o schemă TN, calea de întoarcere a curentului de defect e conductorul PE, nu solul.</p>

<h3>Rezistența de dispersie</h3>
${F(`Valori uzuale impuse:

  priză de pământ pentru instalaţia electrică         R ≤ 4 Ω
  priză comună cu instalaţia de paratrăsnet           R ≤ 1 Ω
  verificare: metoda celor trei electrozi (căderea de potenţial)`)}
<p>Rezistența depinde de rezistivitatea solului, de suprafața de contact a electrozilor și de umiditate — deci variază sezonier. Măsurarea se face în perioada cea mai defavorabilă, de regulă vara pe secetă sau iarna pe îngheț.</p>

<h3>Alcătuirea</h3>
<ul>
<li><span class="term-def">Priza naturală</span> — armătura fundației, folosită prin sudarea unei platbande la armătură. Cea mai eficientă și cea mai ieftină, dacă se prevede din proiect.</li>
<li><span class="term-def">Priza artificială</span> — electrozi verticali (țăruși) sau orizontali (platbandă OL-Zn 40×4), îngropați sub adâncimea de îngheț.</li>
<li><span class="term-def">Piesa de separație</span> — obligatorie, permite deconectarea prizei pentru măsurare.</li>
</ul>

<h3>Legăturile echipotențiale</h3>
<p>Aici se produce siguranța reală. <span class="term-def">Legătura echipotențială principală</span> unește la bara PE a tabloului general: priza de pământ, conductele metalice de apă, gaz, încălzire, armătura structurii, ecranele cablurilor de telecomunicații. Dacă toate masele conductoare din clădire sunt la același potențial, nu există diferență de potențial de atins, indiferent de ce se întâmplă în rețea.</p>
<p><span class="term-def">Legătura echipotențială suplimentară</span> se prevede în încăperile cu risc: băi, dușuri, piscine, spații medicale. Ea unește local țevile, corpurile metalice ale căzii și PE-ul prizelor din zonă.</p>
${W(`<b>Un țăruș bătut în curte, fără măsurare, fără piesă de separație și fără legătură echipotențială principală, nu constituie priză de pământ.</b> Nu este verificabil, nu este documentabil și nu protejează pe nimeni.`)}`,
                facts: [
                    "Sol argilos umed: ~30 Ω·m. Nisip uscat sau stâncă: peste 1000 Ω·m — un singur electrod nu ajunge niciodată.",
                    "Platbanda uzuală pentru priza artificială este OL-Zn 40×4 mm.",
                    "Băile se împart în volume (0, 1, 2), cu grade IP și tipuri de echipamente admise diferite pentru fiecare."
                ] }
        ] },
    { name: "Nivelul 2 · Verificări", mods: [
            { id: "m10", t: "Măsurări în instalații", calc: null,
                blurb: "Ordinea măsurătorilor nu e arbitrară — fiecare o presupune pe cea dinainte.",
                body: `
<h3>Succesiunea corectă</h3>
<p>Verificările se execută într-o ordine impusă de logica siguranței: mai întâi cu instalația scoasă de sub tensiune, apoi sub tensiune. Inversarea ordinii poate distruge aparate sau răni operatorul.</p>
<ul>
<li>Examinare vizuală: marcaje, secțiuni, culori, grade de protecție, accesibilitate.</li>
<li>Continuitatea conductoarelor de protecție și a legăturilor echipotențiale.</li>
<li>Rezistența de izolație.</li>
<li>Separarea circuitelor, acolo unde se aplică (SELV, PELV, separare de protecție).</li>
<li>Rezistența pardoselilor și pereților, în cazuri speciale.</li>
<li>Sub tensiune: impedanța buclei de defect, verificarea DDR, verificarea succesiunii fazelor, verificarea funcțională.</li>
</ul>

<h3>Continuitatea PE</h3>
<p>Se măsoară cu un curent de cel puțin 200 mA la o tensiune de 4–24 V în gol. Valoarea trebuie să fie mică și, mai important, coerentă cu lungimea și secțiunea traseului: o valoare mare arată o îmbinare slabă, nu un conductor „mai lung”.</p>

<h3>Rezistența de izolație</h3>
${F(`Tensiune nominală ≤ 50 V (SELV/PELV):
    tensiune de încercare 250 V c.c.   →   R_izo ≥ 0,5 MΩ

Tensiune nominală ≤ 500 V:
    tensiune de încercare 500 V c.c.   →   R_izo ≥ 1,0 MΩ

Tensiune nominală > 500 V:
    tensiune de încercare 1000 V c.c.  →   R_izo ≥ 1,0 MΩ`)}
${W(`Înainte de măsurare se deconectează receptoarele electronice și dispozitivele de protecție la supratensiuni. 500 V continuu aplicați pe o sursă în comutație o distrug.`)}

<h3>Impedanța buclei de defect</h3>
<p>Se măsoară între fază și PE, la punctul cel mai depărtat al circuitului. Din ea se calculează curentul prezumat de defect și se verifică dacă protecția declanșează în timpul impus.</p>
${F(`I_defect = U₀ / Z_s
Condiţia:  I_defect ≥ I_a al protecţiei (curba × I_n)

Exemplu: MCB C16 → I_a = 10 × 16 = 160 A
         Z_s max = 230 / 160 = 1,44 Ω`)}

<h3>Verificarea DDR</h3>
<p>Se verifică declanșarea la I_Δn (timp maxim 300 ms pentru tip general) și la 5 × I_Δn (maxim 40 ms), pe ambele semialternanțe. Se notează valorile, nu doar verdictul.</p>`,
                facts: [
                    "Butonul de test al DDR nu înlocuiește măsurarea: verifică mecanica, nu pragul și nici timpul.",
                    "Impedanța buclei se măsoară la capătul cel mai depărtat, unde condiția e cea mai severă.",
                    "Aparatele multifuncționale moderne fac toate probele, dar buletinul cere valori măsurate, nu doar bife."
                ] },
            { id: "m11", t: "Verificări periodice și documentație", calc: null,
                blurb: "Ce se semnează, cine răspunde, ce rămâne în dosar după ce pleci de pe șantier.",
                body: `
<h3>Verificarea inițială și cea periodică</h3>
<p><span class="term-def">Verificarea inițială</span> se face la punerea în funcțiune a unei instalații noi sau după o modificare majoră, și se finalizează cu un raport care conține toate valorile măsurate. <span class="term-def">Verificarea periodică</span> confirmă că instalația s-a menținut în parametri; intervalul depinde de destinația clădirii și de mediu, fiind mai scurt la spații cu aglomerări de persoane, medii umede sau cu pericol de explozie.</p>

<h3>Măsurările PRAM</h3>
<p>Prescurtarea acoperă verificările de protecții, relee, automatizări și măsurări — în practica curentă se referă la buletinele de verificare a prizei de pământ, a continuității legăturilor de protecție și a rezistenței de izolație. Se execută de personal autorizat, cu aparate verificate metrologic în termen, iar buletinul poartă seria aparatului și data etalonării.</p>

<h3>Dosarul instalației</h3>
<ul>
<li>Proiectul, verificat de un verificator atestat pentru cerința esențială de securitate.</li>
<li>Schema monofilară a tablourilor, actualizată la situația reală de pe teren.</li>
<li>Certificate de conformitate și declarații pentru echipamentele montate.</li>
<li>Procese-verbale de lucrări ascunse — trasee îngropate, prize de pământ, legături sudate.</li>
<li>Buletine de măsurători.</li>
<li>Procesul-verbal de recepție și punere sub tensiune.</li>
</ul>
${W(`<b>Regula de aur a documentației:</b> ce nu e consemnat nu s-a întâmplat. Într-o anchetă după un incident, absența buletinului de măsurare are aceleași consecințe ca absența măsurării.`)}

<h3>Cine semnează</h3>
<p>Proiectul e semnat de proiectant și verificat de un verificator de proiecte atestat. Execuția e făcută de un operator economic cu atestat valabil pentru tipul lucrării, sub coordonarea unui electrician autorizat de grad corespunzător. Recepția implică beneficiarul, executantul și, la racordare, operatorul de rețea.</p>`,
                facts: [
                    "Aparatul de măsură fără buletin de etalonare în termen invalidează întregul set de măsurători.",
                    "Schema monofilară „ca proiectată” nu ține loc de schemă „as-built”.",
                    "Procesele-verbale de lucrări ascunse se întocmesc înainte de acoperire, nu retroactiv."
                ] }
        ] },
    { name: "Nivelul 3 · Reglementare", mods: [
            { id: "m12", t: "Cadrul de reglementare și autorizarea", calc: null,
                blurb: "Ce lege spune ce, și ce îți dă dreptul să proiectezi sau să execuți.",
                body: `
<h3>Ierarhia actelor</h3>
<ul>
<li><span class="term-def">Legea 123/2012</span> a energiei electrice și a gazelor naturale — cadrul primar al sectorului.</li>
<li><span class="term-def">Normativul I7</span> — proiectarea, execuția și exploatarea instalațiilor electrice aferente clădirilor. Documentul de referință zilnic.</li>
<li><span class="term-def">Seria SR HD 60364</span> — standardul european armonizat pentru instalații electrice de joasă tensiune, sursa tehnică din spatele normativului.</li>
<li><span class="term-def">Ordinul ANRE 66/2023</span> — regulamentul de autorizare a electricienilor, a verificatorilor de proiecte și a experților tehnici în domeniul instalațiilor electrice tehnologice.</li>
<li><span class="term-def">Legea 121/2014</span> a eficienței energetice — baza pentru managerii energetici și auditorii energetici pentru industrie.</li>
</ul>

<h3>Gradele de autorizare ANRE</h3>
${F(`Gradul I    executare instalaţii electrice interioare
            ≤ 10 kW, sub 1 kV. Fără tip.

Gradul II   joasă tensiune, sub 1 kV, orice putere.
            Tip A, B sau A+B.

Gradul III  medie tensiune, până la 20 kV, orice putere.
            Tip A, B sau A+B.

Gradul IV   înaltă tensiune. Tip A, B sau A+B.

Tip A = proiectare        Tip B = executare`)}
<p>Calitatea de electrician autorizat este definitivă, dar legitimația se vizează la fiecare cinci ani, condiționat de absolvirea unui curs de pregătire teoretică în ultimele douăsprezece luni. Trecerea la un grad superior sau la un alt tip se face numai prin promovarea unui nou examen.</p>

<h3>Persoană fizică și persoană juridică</h3>
<p>Autorizarea personală nu dă dreptul de a factura lucrări. Pentru a executa instalații racordate la rețeaua publică, operatorul economic trebuie să dețină <span class="term-def">atestat ANRE</span> corespunzător tipului de lucrare, ceea ce presupune personal autorizat angajat, dotare tehnică și asigurare de răspundere civilă. Cele două se condiționează reciproc: autorizația fără atestat nu produce venit, atestatul fără personal autorizat nu se poate obține.</p>

<h3>Condiția de experiență</h3>
<p>Experiența profesională recunoscută la examen — în proiectare, executare sau operare — se socotește numai după absolvirea studiilor din calificările acceptate și numai în funcții corespunzătoare acelor studii, dovedită prin adeverințe de la angajatori atestați sau titulari de licență. Este, în practică, filtrul cel mai selectiv al procedurii.</p>`,
                facts: [
                    "Autorizarea se obține prin examen organizat de ANRE, cu înscriere prin portalul propriu sau prin PCUe, în sesiuni.",
                    "Pentru primul examen, cursul de pregătire teoretică este facultativ; pentru vizarea periodică devine obligatoriu.",
                    "ANRE poate accepta calificări echivalente cu denumiri diferite, pe baza foii matricole și a adeverințelor de la instituția de învățământ."
                ] },
            { id: "m13", t: "Racordarea la rețea", calc: null,
                blurb: "De la cererea de racordare la punerea sub tensiune, plus regimul de prosumator.",
                body: `
<h3>Traseul unei racordări</h3>
<ul>
<li><span class="term-def">Cererea de racordare</span> depusă la operatorul de distribuție, cu datele tehnice ale locului de consum și puterea solicitată.</li>
<li><span class="term-def">Fișa de soluție sau studiul de soluție</span>, în funcție de complexitate și de nivelul de tensiune.</li>
<li><span class="term-def">Avizul tehnic de racordare (ATR)</span> — documentul care stabilește puterea aprobată, punctul de delimitare și condițiile tehnice. Are termen de valabilitate.</li>
<li><span class="term-def">Contractul de racordare</span>, proiectarea și execuția instalației de racordare de către operatori atestați.</li>
<li><span class="term-def">Certificatul de racordare</span> și punerea sub tensiune, urmate de contractul de furnizare.</li>
</ul>

<h3>Punctul de delimitare</h3>
<p>Este granița de proprietate și de responsabilitate între rețeaua operatorului și instalația utilizatorului. Tot ce e în amonte se întreține de operator; tot ce e în aval, inclusiv tabloul general și protecțiile, e răspunderea beneficiarului. Poziția lui se stabilește prin ATR și nu se negociază ulterior.</p>

<h3>Prosumatorul</h3>
<p>Un utilizator care produce energie din surse regenerabile pentru consum propriu și livrează surplusul în rețea. Elementele care îl definesc tehnic:</p>
<ul>
<li>Contor bidirecțional, care înregistrează separat energia consumată și cea livrată.</li>
<li>Protecție de interfață care deconectează sursa la dispariția rețelei — funcția <span class="term-def">anti-islanding</span>, obligatorie pentru siguranța echipelor de intervenție.</li>
<li>Instalația executată de un operator economic cu atestat ANRE valabil pentru tipul de lucrare; fără el, racordarea nu se validează.</li>
<li>Limitarea puterii injectate la valoarea aprobată prin ATR.</li>
</ul>
${W(`<b>Un sistem fotovoltaic montat fără ATR și fără executant atestat nu poate fi racordat legal la rețea</b>, indiferent cât de corect e montat tehnic. Rămâne insulă, cu tot ce implică asta pentru rentabilitate.`)}`,
                facts: [
                    "ATR-ul are termen de valabilitate; expirarea lui reia procedura de la capăt.",
                    "Puterea aprobată prin ATR, nu puterea instalată, e cea care contează contractual.",
                    "Funcția anti-islanding protejează electricianul care lucrează pe o linie pe care o crede scoasă de sub tensiune."
                ] },
            { id: "m14", t: "Securitatea muncii", calc: null,
                blurb: "Cele cinci reguli de aur. Se aplică în ordine, integral, de fiecare dată.",
                body: `
<h3>Cele cinci reguli de aur</h3>
<p>Ordinea nu e o convenție redacțională — fiecare pas îl face posibil pe următorul în siguranță.</p>
<ul>
<li><span class="term-def">1. Separarea vizibilă</span> — deconectarea completă a instalației de la toate sursele de alimentare, cu întrerupere vizibilă sau semnalizare sigură a poziției.</li>
<li><span class="term-def">2. Blocarea și marcarea</span> — blocarea mecanică a aparatelor de comutație în poziția deschis și afișarea indicatoarelor de interdicție. Nimeni nu trebuie să poată reanclanșa în timp ce lucrezi.</li>
<li><span class="term-def">3. Verificarea lipsei tensiunii</span> — cu detector adecvat nivelului de tensiune, verificat înainte și după utilizare pe o sursă cunoscută. Se verifică toate conductoarele, inclusiv neutrul.</li>
<li><span class="term-def">4. Legarea la pământ și în scurtcircuit</span> — pe toate fazele, în zona de lucru, vizibil de la locul de muncă. Protejează împotriva reanclanșării accidentale și a tensiunilor induse.</li>
<li><span class="term-def">5. Delimitarea și marcarea zonei de lucru</span> — separarea fizică față de părțile rămase sub tensiune și semnalizarea clară a zonei admise.</li>
</ul>

<h3>Riscul real: arcul electric</h3>
<p>Electrocutarea nu e singurul pericol, nici măcar cel mai frecvent la joasă tensiune industrială. Un scurtcircuit într-un tablou produce un arc cu temperatură de mii de grade și o undă de presiune. Consecințele sunt arsuri și traumatisme, nu fibrilație. De aici cerințele de echipament individual de protecție rezistent la arc, vizieră și haine fără fibre sintetice.</p>

<h3>Efectele curentului asupra corpului</h3>
${F(`prag de percepţie                   ~0,5 mA
contracţie musculară, „nu dau drumul”  ~10 mA
fibrilaţie ventriculară probabilă      >30 mA, la 50 Hz
tensiune limită convenţională          50 V c.a. / 120 V c.c.`)}
<p>Gravitatea depinde de intensitate, durată și traseul prin corp. Traseul mână-mână sau mână-picior, care traversează toracele, este cel mai periculos.</p>

<h3>Organizarea lucrărilor</h3>
<p>Lucrările se execută pe bază de autorizație de lucru sau instrucțiuni tehnice specifice, cu personal având autorizare electrică internă corespunzătoare grupei de lucrări. Un singur executant nu execută niciodată singur lucrări la instalații de medie sau înaltă tensiune.</p>`,
                facts: [
                    "Verificatorul de tensiune se testează pe o sursă cunoscută înainte și după fiecare utilizare.",
                    "Scurtcircuitorul mobil se montează întâi la pământ, apoi pe faze; se demontează în ordine inversă.",
                    "Hainele din materiale sintetice se topesc pe piele la arc electric și agravează arsurile."
                ] }
        ] },
    { name: "Nivelul 4 · Instalații moderne", mods: [
            { id: "m15", t: "Fotovoltaic și prosumatori", calc: "pv",
                blurb: "Partea de curent continuu are reguli proprii, iar cea mai des încălcată e tensiunea de gol la temperatură scăzută.",
                body: `
<h3>Arhitectura unui sistem racordat la rețea</h3>
<p>Module conectate în serie formează un <span class="term-def">string</span>, care produce o tensiune continuă. Mai multe stringuri intră în invertor, care le urmărește punctul de putere maximă prin funcția <span class="term-def">MPPT</span> și transformă energia în curent alternativ sincronizat cu rețeaua. Contorul bidirecțional măsoară ambele sensuri.</p>

<h3>Capcana tensiunii de gol</h3>
<p>Tensiunea de gol a unui modul fotovoltaic <em>crește</em> pe măsură ce temperatura scade. Dimensionarea la 25 °C, temperatura de test standard, e o greșeală care se plătește iarna: la −10 °C într-o dimineață senină, stringul poate depăși tensiunea maximă admisă de invertor și îl distruge.</p>
${F(`V_oc(T) = N_s · V_oc,STC · [1 + β/100 · (T − 25)]

β ≈ −0,25 … −0,35 %/°C   (coeficient de temperatură, valoare negativă)
T = temperatura minimă de proiectare a amplasamentului
Condiţia:  V_oc(T_min) < V_max_invertor`)}
<p>Verificarea complementară se face la celălalt capăt: la temperatura maximă de funcționare, tensiunea în punctul de putere maximă trebuie să rămână deasupra pragului minim al ferestrei MPPT, altfel invertorul se oprește la caniculă.</p>

<h3>Protecțiile pe partea de continuu</h3>
<ul>
<li>Separator de sarcină pe c.c., accesibil, pentru intervenții. Panourile nu se pot „opri” — produc tensiune atât timp cât e lumină.</li>
<li>Descărcătoare la supratensiuni pe ambele părți, c.c. și c.a.</li>
<li>Siguranțe pe string, când numărul de stringuri paralele o impune.</li>
<li>Legarea la pământ a structurii de susținere și integrarea în legătura echipotențială a clădirii.</li>
</ul>

<h3>Interfața cu rețeaua</h3>
<p>Invertorul trebuie să realizeze <span class="term-def">anti-islanding</span>: la dispariția tensiunii de rețea, oprirea injecției în maximum câteva sute de milisecunde. Fără această funcție, un panou ar putea menține sub tensiune un tronson pe care o echipă îl consideră deconectat.</p>
${W(`Un invertor fără separare galvanică poate injecta o componentă de curent continuu în instalație. În acest caz, protecția diferențială din amonte trebuie să fie <b>tip B</b>, nu tip A.`)}`,
                facts: [
                    "La −10 °C, un string dimensionat fix la 25 °C poate depăși cu 10–12 % tensiunea calculată.",
                    "Cablurile solare sunt marcate H1Z2Z2-K: rezistente la UV, ozon și temperaturi extreme.",
                    "Umbrirea parțială a unui singur modul afectează întregul string dacă lipsesc diodele de bypass."
                ] },
            { id: "m16", t: "Stații de încărcare pentru vehicule electrice", calc: "ev",
                blurb: "Moduri 1–4, Type 2, sarcină continuă, și de ce protecția diferențială e altfel aici.",
                body: `
<h3>Cele patru moduri de încărcare</h3>
<ul>
<li><span class="term-def">Modul 1</span> — priză casnică obișnuită, fără nicio protecție dedicată și fără comunicație. Practic interzis pentru autovehicule.</li>
<li><span class="term-def">Modul 2</span> — cablu cu cutie de control integrată. Soluție de avarie, limitată în curent, nu instalație permanentă.</li>
<li><span class="term-def">Modul 3</span> — stație fixă cu circuit dedicat și comunicație prin pilotul de control. Standardul pentru încărcarea în curent alternativ, cu conector Type 2.</li>
<li><span class="term-def">Modul 4</span> — încărcare în curent continuu, cu redresorul în stație. Puterile mari, conector CCS.</li>
</ul>

<h3>Pilotul de control</h3>
<p>În modul 3, stația și vehiculul comunică printr-un semnal modulat în lățime de impuls pe conductorul <span class="term-def">CP</span>. Factorul de umplere al semnalului comunică vehiculului curentul maxim disponibil, iar vehiculul confirmă starea. Acest canal e cel care permite gestionarea dinamică a sarcinii: reducerea curentului de încărcare atunci când restul clădirii consumă mult.</p>

<h3>De ce circuitul e diferit</h3>
<p>O stație de încărcare este o <span class="term-def">sarcină continuă</span>: absoarbe curentul nominal ore în șir, spre deosebire de aproape orice alt receptor casnic. Consecințele: circuit dedicat, fără alte receptoare pe el, și dimensionare fără să te bazezi pe coeficienți de simultaneitate.</p>
${F(`Curentul absorbit:
  monofazat:  I = P / (U · cos φ)      cos φ ≈ 1 la încărcătoare moderne
  trifazat:   I = P / (√3 · U_l · cos φ)

7,4 kW monofazat  →  32 A
11 kW trifazat    →  16 A
22 kW trifazat    →  32 A`)}

<h3>Protecția diferențială</h3>
<p>Electronica de putere din vehicul poate genera curenți de defect cu componentă continuă netedă, invizibili pentru un DDR tip A. Cerința: <span class="term-def">DDR tip B</span>, sau DDR tip A combinat cu un dispozitiv de detecție a curentului continuu de defect de 6 mA integrat în stație. A doua variantă e cea uzuală comercial, dar trebuie să fie declarată explicit de producător.</p>
${W(`<b>Nu se montează două stații pe același DDR</b> și nu se pune stația pe DDR-ul general al locuinței: o declanșare la mașină ar lăsa fără tensiune întreaga casă, iar curenții de fugă cumulați ar produce declanșări intempestive.`)}

<h3>Gestionarea sarcinii</h3>
<p>Când puterea aprobată a locului de consum nu acoperă simultan casa și mașina, se prevede <span class="term-def">load management</span>: un contor de referință măsoară consumul total și comandă stația să-și reducă curentul. Este alternativa ieftină la o cerere de majorare a puterii aprobate.</p>`,
                facts: [
                    "Conectorul Type 2 (Mennekes) e standardul european pentru c.a.; CCS Combo 2 pentru c.c.",
                    "Un circuit de 32 A pentru stație se execută uzual pe 6 mm² cupru, în funcție de lungime și mod de pozare.",
                    "Curentul se declară în stație la punerea în funcțiune; setarea greșită supraîncarcă un cablu corect dimensionat pentru altă valoare."
                ] },
            { id: "m17", t: "Stocare, calitatea energiei, flexibilitate", calc: null,
                blurb: "Unde se întâlnesc instalația electrică și piața de energie. Zona în care experiența ta din software chiar contează.",
                body: `
<h3>Stocarea în baterii</h3>
<p>Un sistem de stocare racordat la rețea are trei componente care se dimensionează separat: capacitatea utilă în kWh, puterea invertorului în kW și adâncimea de descărcare admisă. Un sistem de 10 kWh cu invertor de 5 kW se golește în două ore la putere maximă — capacitatea și puterea nu sunt același lucru și nu se substituie.</p>
<ul>
<li><span class="term-def">Cuplare pe c.c.</span> — bateria comunică direct cu stringurile fotovoltaice prin același invertor hibrid. Randament mai bun, flexibilitate mai mică.</li>
<li><span class="term-def">Cuplare pe c.a.</span> — bateria are invertorul ei. Se poate adăuga peste o instalație existentă.</li>
<li><span class="term-def">Funcția de rezervă</span> — pentru alimentare la cădere de rețea e nevoie de un tablou separat de sarcini esențiale și de comutare automată; nu se obține implicit doar prin montarea unei baterii.</li>
</ul>

<h3>Calitatea energiei</h3>
${F(`Distorsiunea armonică totală:

THD_I = √(Σ I_h²) / I₁ · 100 [%]

Armonicele de rang 3, 9, 15 (multiplii de trei) se însumează
aritmetic pe conductorul neutru în loc să se anuleze.`)}
<p>Alte fenomene urmărite: <span class="term-def">flickerul</span>, fluctuațiile rapide de tensiune care produc pâlpâirea vizibilă a iluminatului; <span class="term-def">golurile de tensiune</span>, scăderile scurte care opresc procese industriale; <span class="term-def">dezechilibrul</span> între faze. Fiecare are indicatori normați și limite contractuale.</p>

<h3>Flexibilitatea și serviciile de sistem</h3>
<p>Un consumator sau un producător care își poate modifica puterea la comandă are valoare pentru operatorul de sistem, care trebuie să mențină echilibrul producție-consum în timp real. Mecanismele prin care se valorifică: rezerva de reglaj, participarea la piața de echilibrare, agregarea mai multor instalații mici într-o <span class="term-def">centrală electrică virtuală</span>.</p>
<p>Aici se schimbă natura muncii: nu mai e vorba de conductoare și protecții, ci de măsurare la rezoluție fină, telecomandă sigură, protocoale de comunicație și verificarea îndeplinirii comenzii. Este punctul în care competența de instalații și cea de sisteme se suprapun.</p>`,
                facts: [
                    "Capacitatea în kWh spune cât timp; puterea în kW spune cât de repede. Se dimensionează separat.",
                    "Un THD de curent peste 8 % pe o coloană indică o problemă reală de calitate, nu o curiozitate de laborator.",
                    "Agregarea permite unui portofoliu de instalații mici să ofere servicii pe care niciuna nu le-ar putea oferi singură."
                ] }
        ] }
];
//# sourceMappingURL=curriculum.js.map