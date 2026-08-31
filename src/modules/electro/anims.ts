import type { Anim, Els } from "../../types.js";
import { rd } from "../../helpers.js";
import {
  mkDots, along, wave, axis,
  C_L1, C_L2, C_L3, C_N, C_PE, C_CU, C_RED, C_GREY,
} from "../../anim/runtime.js";

export const anims: Record<string, Anim<any>> = {


/* ---------- m1 · circuitul ---------- */
m1:{
 title:"Curentul care circulă",
 caption:"Punctele sunt sarcina electrică. Tensiunea le împinge, rezistența le încetinește, iar puterea disipată încălzește rezistorul — mărește tensiunea și privește ce se întâmplă.",
 controls:[{k:"U",l:"Tensiune",min:12,max:400,step:1,v:230,u:" V"},
           {k:"R",l:"Rezistență",min:10,max:2000,step:10,v:460,u:" Ω"}],
 svg:`<svg viewBox="0 0 340 175">
  <path data-e="loop" d="M70 45 H270 V130 H70 Z" fill="none" stroke="${C_CU}" stroke-width="3" stroke-linejoin="round"/>
  <g data-e="dots"></g>
  <rect x="52" y="70" width="36" height="35" fill="#FDFDFC" stroke="${C_L2}" stroke-width="2"/>
  <line x1="60" y1="79" x2="60" y2="96" stroke="${C_L2}" stroke-width="3"/>
  <line x1="70" y1="83" x2="70" y2="92" stroke="${C_L2}" stroke-width="3"/>
  <line x1="80" y1="79" x2="80" y2="96" stroke="${C_L2}" stroke-width="3"/>
  <rect data-e="res" x="252" y="68" width="36" height="40" fill="#FDFDFC" stroke="${C_L2}" stroke-width="2"/>
  <path d="M258 88 l6 -9 l6 18 l6 -18 l6 9" fill="none" stroke="${C_L2}" stroke-width="2"/>
  <text x="70" y="122" font-size="10" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">sursă</text>
  <text x="270" y="124" font-size="10" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">R</text>
  <text data-e="heat" x="270" y="58" font-size="10" fill="${C_RED}" text-anchor="middle" font-family="IBM Plex Mono" opacity="0">căldură</text>
  <text x="170" y="36" font-size="11" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">sensul curentului →</text>
 </svg>`,
 init(E: Els){ E._d = mkDots(E.dots,26,3.2,C_CU); },
 draw(t: number, c: { U: number; R: number }, E: Els){
  const I=c.U/c.R, P=c.U*I, L=E.loop.getTotalLength();
  along(E.loop,E._d,-t*(18+70*Math.log10(1+I*8)),L/26);
  const h=Math.min(1,P/1200);
  E.res.setAttribute("fill",`rgb(${253-(253-179)*h},${253-(253-38)*h},${252-(252-30)*h})`);
  E.heat.setAttribute("opacity",h>0.25?h:0);
  E.read.innerHTML=rd([["Curent I",I.toFixed(2)+" A"],["Putere P",P.toFixed(0)+" W"],
    ["Energie în 24 h",(P*24/1000).toFixed(2)+" kWh"]]);
 }},

/* ---------- m2 · fazor și sinusoidă ---------- */
m2:{
 title:"Fazorul care desenează sinusoida",
 caption:"Vectorul din stânga se rotește cu 50 de ture pe secundă în realitate — aici e încetinit. Proiecția lui pe verticală este exact unda din dreapta. Mută defazajul și vezi cum curentul rămâne în urmă la sarcină inductivă.",
 controls:[{k:"v",l:"Încetinire",min:0.1,max:2,step:0.1,v:0.6,u:"×"},
           {k:"phi",l:"Defazaj curent",min:-90,max:90,step:5,v:-40,u:"°"}],
 svg:`<svg viewBox="0 0 340 200">
  <circle cx="62" cy="100" r="46" fill="none" stroke="${C_GREY}" stroke-width="1"/>
  ${axis(16,100,108,100)}${axis(62,54,62,146)}
  <line data-e="vu" x1="62" y1="100" x2="108" y2="100" stroke="${C_L2}" stroke-width="2.5"/>
  <line data-e="vi" x1="62" y1="100" x2="108" y2="100" stroke="${C_CU}" stroke-width="2.5"/>
  <circle data-e="pu" cx="108" cy="100" r="4" fill="${C_L2}"/>
  <circle data-e="pi" cx="108" cy="100" r="4" fill="${C_CU}"/>
  ${axis(124,100,334,100)}
  <line x1="124" y1="54" x2="334" y2="54" stroke="${C_GREY}" stroke-width="1" stroke-dasharray="3 3"/>
  <line x1="124" y1="67.5" x2="334" y2="67.5" stroke="${C_N}" stroke-width="1" stroke-dasharray="2 4"/>
  <text x="336" y="57" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono" text-anchor="end">325 V vârf</text>
  <text x="336" y="78" font-size="8.5" fill="${C_N}" font-family="IBM Plex Mono" text-anchor="end">230 V efectiv</text>
  <path data-e="wu" fill="none" stroke="${C_L2}" stroke-width="2"/>
  <path data-e="wi" fill="none" stroke="${C_CU}" stroke-width="2"/>
  <text x="128" y="192" font-size="10" fill="${C_L2}" font-family="IBM Plex Mono">tensiune</text>
  <text x="190" y="192" font-size="10" fill="${C_CU}" font-family="IBM Plex Mono">curent</text>
 </svg>`,
 draw(t: number, c: { v: number; phi: number }, E: Els){
  const w=t*c.v*3.2, ph=c.phi*Math.PI/180;
  E.vu.setAttribute("x2",62+46*Math.cos(w)); E.vu.setAttribute("y2",100-46*Math.sin(w));
  E.pu.setAttribute("cx",62+46*Math.cos(w)); E.pu.setAttribute("cy",100-46*Math.sin(w));
  E.vi.setAttribute("x2",62+34*Math.cos(w+ph)); E.vi.setAttribute("y2",100-34*Math.sin(w+ph));
  E.pi.setAttribute("cx",62+34*Math.cos(w+ph)); E.pi.setAttribute("cy",100-34*Math.sin(w+ph));
  wave(E.wu,x=>100-46*Math.sin(w-(x-124)*0.032),124,332,3);
  wave(E.wi,x=>100-34*Math.sin(w+ph-(x-124)*0.032),124,332,3);
  E.read.innerHTML=rd([["Valoare instantanee",(325*Math.sin(w)).toFixed(0)+" V"],
    ["Defazaj",c.phi+"° "+(c.phi<0?"(inductiv, curentul rămâne în urmă)":c.phi>0?"(capacitiv)":"(rezistiv pur)")],
    ["cos φ",Math.cos(ph).toFixed(3)]]);
 }},

/* ---------- m3 · triunghiul puterilor ---------- */
m3:{
 title:"Triunghiul puterilor și compensarea",
 caption:"Latura orizontală este puterea utilă, cea verticală energia care doar oscilează. Ipotenuza — ce dimensionează cablul — se scurtează pe măsură ce compensezi. Triunghiul punctat este ținta de 0,95.",
 controls:[{k:"cos",l:"cos φ actual",min:0.5,max:1,step:0.01,v:0.72,u:""},
           {k:"P",l:"Putere activă",min:20,max:250,step:5,v:100,u:" kW"}],
 svg:`<svg viewBox="0 0 340 200">
  ${axis(36,168,320,168)}${axis(36,168,36,22)}
  <path data-e="tgt" fill="none" stroke="${C_PE}" stroke-width="1.5" stroke-dasharray="4 3"/>
  <path data-e="tri" fill="rgba(184,115,51,.13)" stroke="none"/>
  <line data-e="lp" stroke="${C_L2}" stroke-width="3"/>
  <line data-e="lq" stroke="${C_N}" stroke-width="3"/>
  <line data-e="ls" stroke="${C_CU}" stroke-width="3"/>
  <line data-e="lc" stroke="${C_PE}" stroke-width="3" stroke-dasharray="5 3"/>
  <text data-e="tp" font-size="10" fill="${C_L2}" font-family="IBM Plex Mono" text-anchor="middle">P</text>
  <text data-e="tq" font-size="10" fill="${C_N}" font-family="IBM Plex Mono">Q</text>
  <text data-e="ts" font-size="10" fill="${C_CU}" font-family="IBM Plex Mono">S</text>
  <text data-e="tc" font-size="9.5" fill="${C_PE}" font-family="IBM Plex Mono" opacity="0">Q compensat</text>
 </svg>`,
 draw(t: number, c: { cos: number; P: number }, E: Els){
  const sc=1.05, P=c.P, Q=P*Math.tan(Math.acos(c.cos)), S=P/c.cos;
  const Q2=P*Math.tan(Math.acos(0.95)), S2=P/0.95;
  const x0=36,y0=168, px=x0+P*sc, py=y0;
  const qy=y0-Math.min(Q*sc,140), q2y=y0-Math.min(Q2*sc,140);
  const puls=0.55+0.45*Math.abs(Math.sin(t*2));
  E.tri.setAttribute("d",`M${x0} ${y0} H${px} V${qy} Z`);
  E.tgt.setAttribute("d",`M${x0} ${y0} H${px} V${q2y} Z`);
  E.lp.setAttribute("x1",x0);E.lp.setAttribute("y1",y0);E.lp.setAttribute("x2",px);E.lp.setAttribute("y2",y0);
  E.lq.setAttribute("x1",px);E.lq.setAttribute("y1",y0);E.lq.setAttribute("x2",px);E.lq.setAttribute("y2",qy);
  E.ls.setAttribute("x1",x0);E.ls.setAttribute("y1",y0);E.ls.setAttribute("x2",px);E.ls.setAttribute("y2",qy);
  E.lc.setAttribute("x1",px+9);E.lc.setAttribute("y1",qy);E.lc.setAttribute("x2",px+9);E.lc.setAttribute("y2",q2y);
  E.lc.setAttribute("opacity",Q>Q2?puls:0);
  E.tc.setAttribute("opacity",Q>Q2?puls:0);
  E.tc.setAttribute("x",px+14); E.tc.setAttribute("y",(qy+q2y)/2);
  E.tp.setAttribute("x",(x0+px)/2); E.tp.setAttribute("y",y0+14);
  E.tq.setAttribute("x",px+4); E.tq.setAttribute("y",(y0+qy)/2);
  E.ts.setAttribute("x",(x0+px)/2-14); E.ts.setAttribute("y",(y0+qy)/2-4);
  E.read.innerHTML=rd([["Putere activă P",P.toFixed(0)+" kW"],["Putere reactivă Q",Q.toFixed(1)+" kvar"],
    ["Putere aparentă S",S.toFixed(1)+" kVA"],
    ["După compensare la 0,95",S2.toFixed(1)+" kVA · baterie "+(Q-Q2).toFixed(1)+" kvar"]]);
 }},

/* ---------- m4 · trifazat și neutrul ---------- */
m4:{
 title:"De ce neutrul e gol când sarcina e echilibrată",
 caption:"Cei trei fazori se rotesc împreună. Vectorul albastru este suma lor cu semn schimbat — curentul prin neutru. Ține cele trei sarcini egale și el dispare; dezechilibrează una și apare instantaneu.",
 controls:[{k:"a",l:"Sarcină L1",min:0,max:100,step:5,v:60,u:" %"},
           {k:"b",l:"Sarcină L2",min:0,max:100,step:5,v:60,u:" %"},
           {k:"c",l:"Sarcină L3",min:0,max:100,step:5,v:60,u:" %"}],
 svg:`<svg viewBox="0 0 340 210">
  <circle cx="76" cy="105" r="56" fill="none" stroke="${C_GREY}" stroke-width="1"/>
  ${axis(16,105,136,105)}${axis(76,45,76,165)}
  <line data-e="v1" stroke="${C_L1}" stroke-width="2.5"/>
  <line data-e="v2" stroke="${C_L2}" stroke-width="2.5"/>
  <line data-e="v3" stroke="${C_L3}" stroke-width="2.5"/>
  <line data-e="vn" stroke="${C_N}" stroke-width="3.5"/>
  <circle data-e="pn" r="4.5" fill="${C_N}"/>
  ${axis(158,105,334,105)}
  <path data-e="w1" fill="none" stroke="${C_L1}" stroke-width="1.8"/>
  <path data-e="w2" fill="none" stroke="${C_L2}" stroke-width="1.8"/>
  <path data-e="w3" fill="none" stroke="${C_L3}" stroke-width="1.8"/>
  <path data-e="wn" fill="none" stroke="${C_N}" stroke-width="2.6"/>
  <text x="160" y="199" font-size="9.5" fill="${C_L1}" font-family="IBM Plex Mono">L1</text>
  <text x="182" y="199" font-size="9.5" fill="${C_L2}" font-family="IBM Plex Mono">L2</text>
  <text x="204" y="199" font-size="9.5" fill="${C_L3}" font-family="IBM Plex Mono">L3</text>
  <text x="226" y="199" font-size="9.5" fill="${C_N}" font-family="IBM Plex Mono">neutru</text>
 </svg>`,
 draw(t: number, c: { a: number; b: number; c: number }, E: Els){
  const w=t*1.9, A=[c.a,c.b,c.c].map(v=>v/100);
  const ang=(k: number)=>w-k*2*Math.PI/3;
  let nx=0,ny=0;
  [0,1,2].forEach(k=>{
    const r=52*A[k], x=76+r*Math.cos(ang(k)), y=105-r*Math.sin(ang(k));
    const L=E["v"+(k+1)]; L.setAttribute("x1",76);L.setAttribute("y1",105);L.setAttribute("x2",x);L.setAttribute("y2",y);
    nx+=r*Math.cos(ang(k)); ny+=r*Math.sin(ang(k));
    wave(E["w"+(k+1)],x2=>105-46*A[k]*Math.sin(w-(x2-158)*0.036-k*2*Math.PI/3),158,332,3);
  });
  E.vn.setAttribute("x1",76);E.vn.setAttribute("y1",105);
  E.vn.setAttribute("x2",76-nx);E.vn.setAttribute("y2",105+ny);
  E.pn.setAttribute("cx",76-nx);E.pn.setAttribute("cy",105+ny);
  wave(E.wn,x2=>{const p=(x2-158)*0.036;let s=0;
    [0,1,2].forEach(k=>s+=A[k]*Math.sin(w-p-k*2*Math.PI/3));return 105+46*s;},158,332,3);
  const mag=Math.hypot(nx,ny)/52*100, mx=Math.max(c.a,c.b,c.c)||1;
  E.read.innerHTML=rd([["Curent prin neutru",mag.toFixed(1)+" % din sarcina unei faze"],
    ["Dezechilibru",(Math.max(c.a,c.b,c.c)-Math.min(c.a,c.b,c.c)).toFixed(0)+" puncte"],
    ["Stare",mag<2?"echilibrat — neutrul nu e parcurs":mag<40?"dezechilibru moderat":"dezechilibru sever, neutrul e încărcat"]]);
 }},

/* ---------- m6 · curba de declanșare ---------- */
m6:{
 title:"Curba de declanșare, în timp real",
 caption:"Bara arată cât mai are protecția până declanșează la suprasarcina aleasă. Sub 1,13 × In nu declanșează niciodată; peste pragul magnetic al curbei, în zece milisecunde.",
 controls:[{k:"curba",l:"Curbă",v:"10",sel:[["5","B — 5 × In"],["10","C — 10 × In"],["20","D — 20 × In"]]},
           {k:"m",l:"Suprasarcină",min:1,max:26,step:0.5,v:3,u:" × In"}],
 svg:`<svg viewBox="0 0 340 200">
  ${axis(40,166,326,166)}${axis(40,18,40,166)}
  <text x="326" y="182" font-size="9" fill="#8C918C" font-family="IBM Plex Mono" text-anchor="end">× I nominal</text>
  <text x="42" y="15" font-size="9" fill="#8C918C" font-family="IBM Plex Mono">timp</text>
  <text x="14" y="34" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono">1h</text>
  <text x="14" y="100" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono">1s</text>
  <text x="8" y="163" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono">10ms</text>
  <path data-e="cv" fill="none" stroke="${C_CU}" stroke-width="2.5"/>
  <line data-e="vl" stroke="${C_GREY}" stroke-width="1" stroke-dasharray="3 3" y1="18" y2="166"/>
  <circle data-e="pt" r="5.5" fill="${C_RED}"/>
  <rect x="40" y="186" width="286" height="9" fill="#DDE0DC"/>
  <rect data-e="bar" x="40" y="186" width="0" height="9" fill="${C_CU}"/>
  <text data-e="lbl" x="183" y="182" font-size="10" fill="${C_L2}" font-family="IBM Plex Mono" text-anchor="middle"></text>
 </svg>`,
 init(E: Els){ E._acc=0; E._last=0; },
 draw(t: number, c: { curba: string; m: number }, E: Els){
  const k=+c.curba;
  const X=(m: number)=>40+286*Math.log10(m)/Math.log10(30);
  const Y=(s: number)=>166-148*Math.log10(s/0.01)/Math.log10(3600/0.01);
  const trip=(m: number)=>m<1.13?Infinity:(m>=k?0.01:Math.max(0.02,3600*Math.pow(m/1.45,-9.7)));
  let d=`M${X(1.13)} ${Y(3600)}`;
  for(let m=1.2;m<k;m*=1.06) d+=`L${X(m)} ${Y(Math.min(3600,trip(m)))}`;
  d+=`L${X(k)} ${Y(Math.min(3600,trip(k*0.999)))}L${X(k)} ${Y(0.01)}L${X(30)} ${Y(0.01)}`;
  E.cv.setAttribute("d",d);
  const T=trip(c.m);
  E.vl.setAttribute("x1",X(c.m)); E.vl.setAttribute("x2",X(c.m));
  E.pt.setAttribute("cx",X(c.m)); E.pt.setAttribute("cy",Y(Math.min(3600,isFinite(T)?T:3600)));
  E.pt.setAttribute("opacity",isFinite(T)?1:0.25);
  const dt=Math.min(0.05,t-E._last); E._last=t;
  if(isFinite(T)){ E._acc+=dt; if(E._acc>Math.min(T,6)+0.9) E._acc=0; } else E._acc=0;
  const frac=isFinite(T)?Math.min(1,E._acc/Math.min(T,6)):0;
  E.bar.setAttribute("width",286*frac);
  E.bar.setAttribute("fill",frac>=1?C_RED:C_CU);
  E.lbl.textContent = !isFinite(T)?"nu declanșează niciodată":frac>=1?"DECLANȘAT":"se încarcă termic…";
  E.read.innerHTML=rd([["Curent",c.m+" × In"],
    ["Timp de declanșare",!isFinite(T)?"—":T<=0.011?"~10 ms (magnetic)":T.toFixed(T<10?2:0)+" s (termic)"],
    ["Mecanism",!isFinite(T)?"sub pragul termic":c.m>=k?"declanșator magnetic":"lamelă bimetalică"]]);
 }},

/* ---------- m7 · DDR ---------- */
m7:{
 title:"Cum vede un DDR un defect",
 caption:"Torul însumează ce intră pe fază și ce se întoarce pe neutru. Cât timp sunt egale, nu se întâmplă nimic. Ridică defectul spre 30 mA și urmărește momentul deschiderii.",
 controls:[{k:"f",l:"Curent de defect",min:0,max:60,step:1,v:0,u:" mA"},
           {k:"tip",l:"Tip DDR",v:"30",sel:[["30","30 mA — persoane"],["300","300 mA — incendiu"]]}],
 svg:`<svg viewBox="0 0 340 200">
  <path data-e="pf" d="M20 72 H300" fill="none" stroke="${C_L1}" stroke-width="2"/>
  <path data-e="pn" d="M300 104 H20" fill="none" stroke="${C_N}" stroke-width="2"/>
  <path data-e="pg" d="M292 104 V168 H150" fill="none" stroke="${C_RED}" stroke-width="2" stroke-dasharray="4 3" opacity="0"/>
  <g data-e="df"></g><g data-e="dn"></g><g data-e="dg"></g>
  <circle cx="96" cy="88" r="30" fill="none" stroke="${C_L2}" stroke-width="2"/>
  <circle cx="96" cy="88" r="19" fill="none" stroke="${C_L2}" stroke-width="2"/>
  <text x="96" y="140" font-size="9.5" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">tor de însumare</text>
  <line data-e="sw" x1="186" y1="72" x2="212" y2="72" stroke="${C_L2}" stroke-width="3"/>
  <circle cx="186" cy="72" r="3" fill="${C_L2}"/><circle cx="212" cy="72" r="3" fill="${C_L2}"/>
  <rect x="272" y="60" width="46" height="56" fill="#FDFDFC" stroke="${C_L2}" stroke-width="2"/>
  <text x="295" y="93" font-size="9.5" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">sarcină</text>
  <path d="M138 168 h24 M142 173 h16 M146 178 h8" stroke="${C_PE}" stroke-width="2" fill="none"/>
  <text data-e="trip" x="199" y="42" font-size="12" fill="${C_RED}" text-anchor="middle" font-family="IBM Plex Mono" opacity="0">DECLANȘAT</text>
 </svg>`,
 init(E: Els){ E._f=mkDots(E.df,16,3,C_L1); E._n=mkDots(E.dn,16,3,C_N); E._g=mkDots(E.dg,7,3,C_RED); },
 draw(t: number, c: { f: number; tip: string }, E: Els){
  const lim=+c.tip, tripped=c.f>=lim;
  E.pg.setAttribute("opacity",c.f>0?1:0);
  E.sw.setAttribute("transform",tripped?"rotate(-26 186 72)":"");
  E.trip.setAttribute("opacity",tripped?(0.5+0.5*Math.abs(Math.sin(t*5))):0);
  const s=tripped?0:t*46;
  along(E.pf,E._f,s,E.pf.getTotalLength()/16);
  along(E.pn,E._n,s,E.pn.getTotalLength()/16);
  along(E.pg,E._g,s*0.7,E.pg.getTotalLength()/7,tripped||c.f===0);
  E.read.innerHTML=rd([["Curent pe fază",(10+c.f/1000).toFixed(3)+" A"],
    ["Curent pe neutru","10,000 A"],["Diferența ΔI",c.f+" mA"],
    ["Stare",tripped?"deschis — ΔI ≥ I_Δn":"închis — ΔI sub pragul de "+lim+" mA"]]);
 }},

/* ---------- m8 · scheme de legare la pământ ---------- */
m8:{
 title:"Unde se întoarce curentul de defect",
 caption:"Aceeași instalație, patru scheme. Traseul roșu este calea pe care o ia curentul la un defect de izolație pe carcasă — de la el depinde ce protecție îl poate opri.",
 controls:[{k:"s",l:"Schemă",v:"TN-S",sel:[["TN-S","TN-S"],["TN-C-S","TN-C-S"],["TT","TT"],["IT","IT"]]}],
 svg:`<svg viewBox="0 0 340 210">
  <circle cx="46" cy="60" r="13" fill="none" stroke="${C_L2}" stroke-width="2"/>
  <circle cx="46" cy="78" r="13" fill="none" stroke="${C_L2}" stroke-width="2"/>
  <text x="46" y="34" font-size="9.5" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">sursă</text>
  <line x1="46" y1="91" x2="46" y2="150" stroke="${C_L2}" stroke-width="2"/>
  <line x1="59" y1="60" x2="252" y2="60" stroke="${C_L1}" stroke-width="2"/>
  <path data-e="pe" d="M46 150 H252" fill="none" stroke="${C_PE}" stroke-width="2"/>
  <path data-e="pen" d="M46 150 H160" fill="none" stroke="${C_PE}" stroke-width="4" opacity="0"/>
  <g data-e="srcE"><path d="M34 158 h24 M38 163 h16 M42 168 h8" stroke="${C_PE}" stroke-width="2" fill="none"/></g>
  <g data-e="loadE" opacity="0"><line x1="296" y1="120" x2="296" y2="168" stroke="${C_PE}" stroke-width="2"/>
    <path d="M284 170 h24 M288 175 h16 M292 180 h8" stroke="${C_PE}" stroke-width="2" fill="none"/></g>
  <rect x="252" y="42" width="66" height="78" fill="#FDFDFC" stroke="${C_L2}" stroke-width="2"/>
  <text x="285" y="76" font-size="9.5" fill="#5A605A" text-anchor="middle" font-family="IBM Plex Mono">receptor</text>
  <text x="285" y="90" font-size="9" fill="${C_RED}" text-anchor="middle" font-family="IBM Plex Mono">defect</text>
  <path data-e="fp" fill="none" stroke="${C_RED}" stroke-width="2" stroke-dasharray="5 4"/>
  <g data-e="fd"></g>
  <text data-e="sep" x="160" y="166" font-size="8.5" fill="${C_PE}" text-anchor="middle" font-family="IBM Plex Mono" opacity="0">separare PEN</text>
 </svg>`,
 init(E: Els){ E._d=mkDots(E.fd,9,3.4,C_RED); },
 draw(t: number, c: { s: "TN-S" | "TN-C-S" | "TT" | "IT" }, E: Els){
  const S=c.s;
  const P={ "TN-S":"M285 62 V150 H46 V91", "TN-C-S":"M285 62 V150 H46 V91",
            "TT":"M285 62 V120 H296 V168 H46 V91", "IT":"M285 62 V120 H296 V160" }[S];
  E.fp.setAttribute("d",P);
  E.pen.setAttribute("opacity",S==="TN-C-S"?1:0);
  E.sep.setAttribute("opacity",S==="TN-C-S"?1:0);
  E.loadE.setAttribute("opacity",(S==="TT"||S==="IT")?1:0);
  E.pe.setAttribute("opacity",(S==="TT"||S==="IT")?0.25:1);
  const spd={"TN-S":150,"TN-C-S":150,"TT":26,"IT":0}[S];
  along(E.fp,E._d,t*spd,E.fp.getTotalLength()/9,S==="IT");
  const info={
   "TN-S":[["Cale de întoarcere","conductor PE dedicat"],["Curent de defect","≈ 1200 A"],["Ce oprește defectul","protecția de supracurent, în 0,4 s"]],
   "TN-C-S":[["Cale de întoarcere","PEN până la punctul de separare, apoi PE"],["Curent de defect","≈ 1200 A"],["Atenție","în aval de separare, N și PE nu se mai reunesc niciodată"]],
   "TT":[["Cale de întoarcere","prin sol, între cele două prize de pământ"],["Curent de defect","≈ 1,4 A — prea mic pentru disjunctor"],["Ce oprește defectul","exclusiv protecția diferențială"]],
   "IT":[["Cale de întoarcere","nu există — sursa e izolată"],["Curent de defect","câțiva miliamperi"],["Ce se întâmplă","instalația funcționează, controlerul de izolație semnalează"]]
  }[S];
  E.read.innerHTML=rd(info as [string,string][]);
 }},

/* ---------- m15 · Voc la temperatură ---------- */
m15:{
 title:"Stringul care crește iarna",
 caption:"Temperatura urcă și coboară ca într-o zi reală. Urmărește linia roșie: la −20 °C într-o dimineață senină, un string dimensionat la 25 °C poate trece peste limita invertorului.",
 controls:[{k:"ns",l:"Module în serie",min:10,max:26,step:1,v:20,u:" buc"},
           {k:"voc",l:"V_oc modul la STC",min:35,max:52,step:0.5,v:41.5,u:" V"},
           {k:"vmax",l:"Limită invertor",v:"1000",sel:[["1000","1000 V"],["1100","1100 V"],["1500","1500 V"]]}],
 svg:`<svg viewBox="0 0 340 200">
  ${axis(42,168,326,168)}${axis(42,16,42,168)}
  <text x="42" y="184" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono">−25 °C</text>
  <text x="326" y="184" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono" text-anchor="end">+60 °C</text>
  <line data-e="lim" x1="42" x2="326" stroke="${C_RED}" stroke-width="1.5" stroke-dasharray="5 4"/>
  <text data-e="limT" x="326" font-size="8.5" fill="${C_RED}" font-family="IBM Plex Mono" text-anchor="end">limită invertor</text>
  <path data-e="cv" fill="none" stroke="${C_CU}" stroke-width="2.5"/>
  <circle data-e="pt" r="6" fill="${C_L2}"/>
  <text data-e="tt" font-size="10" fill="${C_L2}" font-family="IBM Plex Mono" text-anchor="middle"></text>
 </svg>`,
 draw(t: number, c: { ns: number; voc: number; vmax: string }, E: Els){
  const beta=-0.29, VM=+c.vmax;
  const V=(T: number)=>c.ns*c.voc*(1+beta/100*(T-25));
  const lo=Math.min(V(60),VM)*0.86, hi=Math.max(V(-25),VM)*1.04;
  const X=(T: number)=>42+284*(T+25)/85, Y=(v: number)=>168-152*(v-lo)/(hi-lo);
  let d=""; for(let T=-25;T<=60;T+=2.5) d+=(d?"L":"M")+X(T)+" "+Y(V(T));
  E.cv.setAttribute("d",d);
  E.lim.setAttribute("y1",Y(VM)); E.lim.setAttribute("y2",Y(VM)); E.limT.setAttribute("y",Y(VM)-5);
  const T=17.5-42.5*Math.cos(t*0.55), v=V(T);
  E.pt.setAttribute("cx",X(T)); E.pt.setAttribute("cy",Y(v));
  E.pt.setAttribute("fill",v>VM?C_RED:C_L2);
  E.tt.setAttribute("x",Math.min(300,Math.max(60,X(T)))); E.tt.setAttribute("y",Y(v)-13);
  E.tt.textContent=T.toFixed(0)+" °C";
  const nmax=Math.floor(VM/(c.voc*(1+beta/100*(-20-25))));
  E.read.innerHTML=rd([["V_oc la 25 °C",(c.ns*c.voc).toFixed(0)+" V"],
    ["V_oc la −20 °C",V(-20).toFixed(0)+" V"],
    ["Module maxime în serie",nmax+" buc"],
    ["Verdict",V(-20)<VM?"sub limită, cu marjă de "+(VM-V(-20)).toFixed(0)+" V":"depășește limita — redu stringul la "+nmax+" module"]]);
 }},

/* ---------- m16 · pilotul de control ---------- */
m16:{
 title:"Cum îi spune stația mașinii cât poate trage",
 caption:"Lățimea impulsului este mesajul. Factorul de umplere codifică direct curentul maxim disponibil, iar mașina se conformează — de aici funcționează gestionarea dinamică a sarcinii.",
 controls:[{k:"d",l:"Factor de umplere",min:8,max:90,step:1,v:53,u:" %"}],
 svg:`<svg viewBox="0 0 340 190">
  ${axis(20,110,300,110)}
  <line x1="20" y1="52" x2="300" y2="52" stroke="${C_GREY}" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="304" y="55" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono">+12 V</text>
  <text x="304" y="113" font-size="8.5" fill="#8C918C" font-family="IBM Plex Mono">−12 V</text>
  <path data-e="pw" fill="none" stroke="${C_CU}" stroke-width="2.5"/>
  <text x="20" y="34" font-size="10" fill="#5A605A" font-family="IBM Plex Mono">semnal pe pilotul de control (CP)</text>
  <rect x="20" y="146" width="280" height="14" fill="#DDE0DC"/>
  <rect data-e="bar" x="20" y="146" width="0" height="14" fill="${C_PE}"/>
  <text data-e="amp" x="160" y="178" font-size="11" fill="${C_L2}" text-anchor="middle" font-family="IBM Plex Mono"></text>
 </svg>`,
 draw(t: number, c: { d: number }, E: Els){
  const per=42, duty=c.d/100, off=(t*58)%per;
  let d="";
  for(let x=20;x<=300;x+=1.5){
    const ph=((x-20+off)%per)/per;
    d+=(d?"L":"M")+x+" "+(ph<duty?52:110);
  }
  E.pw.setAttribute("d",d);
  const I=c.d<8?0:c.d<=85?c.d*0.6:c.d<=96?(c.d-64)*2.5:0;
  E.bar.setAttribute("width",280*Math.min(1,I/80));
  E.bar.setAttribute("fill",I>=32?C_CU:C_PE);
  E.amp.textContent = I? I.toFixed(0)+" A disponibili pentru vehicul" : "încărcare nepermisă";
  E.read.innerHTML=rd([["Factor de umplere",c.d+" %"],["Curent maxim comunicat",I?I.toFixed(0)+" A":"—"],
    ["Putere echivalentă, trifazat",I?(Math.sqrt(3)*400*I/1000).toFixed(1)+" kW":"—"],
    ["Regulă",c.d<8?"sub 8 % vehiculul nu are voie să încarce":"I = factor de umplere × 0,6 A, până la 85 %"]]);
 }},

/* ---------- m17 · armonici ---------- */
m17:{
 title:"Cum se strâmbă unda",
 caption:"Fundamentala plus armonicele dă forma reală a curentului absorbit de o sursă în comutație. Urcă rangul 3 și privește vârfurile ascuțite — exact forma care încălzește neutrul.",
 controls:[{k:"h3",l:"Armonica de rang 3",min:0,max:45,step:1,v:22,u:" %"},
           {k:"h5",l:"Armonica de rang 5",min:0,max:35,step:1,v:12,u:" %"}],
 svg:`<svg viewBox="0 0 340 195">
  ${axis(14,98,330,98)}
  <path data-e="f1" fill="none" stroke="${C_GREY}" stroke-width="1.6"/>
  <path data-e="f3" fill="none" stroke="${C_N}" stroke-width="1.2" stroke-dasharray="4 3"/>
  <path data-e="f5" fill="none" stroke="${C_PE}" stroke-width="1.2" stroke-dasharray="4 3"/>
  <path data-e="sum" fill="none" stroke="${C_CU}" stroke-width="2.8"/>
  <text x="16" y="186" font-size="9.5" fill="#8C918C" font-family="IBM Plex Mono">fundamentala</text>
  <text x="92" y="186" font-size="9.5" fill="${C_N}" font-family="IBM Plex Mono">rang 3</text>
  <text x="140" y="186" font-size="9.5" fill="${C_PE}" font-family="IBM Plex Mono">rang 5</text>
  <text x="188" y="186" font-size="9.5" fill="${C_CU}" font-family="IBM Plex Mono">curentul real</text>
 </svg>`,
 draw(t: number, c: { h3: number; h5: number }, E: Els){
  const w=t*1.6, a3=c.h3/100, a5=c.h5/100, k=0.045;
  wave(E.f1,x=>98-52*Math.sin(w-(x-14)*k),14,328,2.5);
  wave(E.f3,x=>98-52*a3*Math.sin(3*(w-(x-14)*k)),14,328,2.5);
  wave(E.f5,x=>98-52*a5*Math.sin(5*(w-(x-14)*k)),14,328,2.5);
  wave(E.sum,x=>{const p=w-(x-14)*k;
    return 98-52*(Math.sin(p)+a3*Math.sin(3*p)+a5*Math.sin(5*p))/(1+a3*0.5+a5*0.4);},14,328,2)
  const thd=Math.sqrt(a3*a3+a5*a5)*100;
  E.read.innerHTML=rd([["THD de curent",thd.toFixed(1)+" %"],
    ["Rangul 3 pe neutru","se însumează aritmetic pe cele trei faze"],
    ["Verdict",thd<8?"în limite uzuale":thd<20?"ridicat — verifică încărcarea neutrului":"sever — neutrul poate depăși curentul de fază"]]);
 }}
};
