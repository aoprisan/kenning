import type { Calc } from "../../types.js";

/**
 * Calculators for the cryptography subject, keyed by `Module.calc`.
 *
 * Everything here works in logarithms wherever it can. Security arithmetic
 * runs off the end of a float almost immediately — 2^1024 is Infinity and
 * 2^128 squared is Infinity too — and an overflow that silently becomes NaN
 * is the one failure `tests/smoke.mjs` is looking for. Keeping the exponent
 * and formatting it at the end also happens to be how these numbers should
 * be read: nobody wants 340282366920938463463374607431768211456.
 */

const LOG10_2 = Math.log10(2);

/** English thousands separators. The subject is English; `num` is ro-RO. */
const n = (v: number, d = 0): string =>
  isFinite(v)
    ? v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻",
};
const sup = (v: number): string =>
  String(Math.round(v)).split("").map((c) => SUP[c] ?? c).join("");

/** A value given by its base-10 logarithm, printed as digits or as a power. */
function fromLog10(l: number): string {
  if (!isFinite(l)) return "—";
  if (l < 0) {
    if (l > -3) return (10 ** l).toPrecision(3);
    const e = Math.floor(l);
    return (10 ** (l - e)).toFixed(2) + " × 10" + sup(e);
  }
  if (l < 12) return n(Math.round(10 ** l));
  const e = Math.floor(l);
  const m = 10 ** (l - e);
  return m.toFixed(2) + " × 10" + sup(e);
}

/** Base-2 counterpart, kept in bits because that is how key sizes are quoted. */
const pow2 = (bits: number): string =>
  "2" + sup(bits) + " ≈ " + fromLog10(bits * LOG10_2);

const YEAR = Math.log10(365.25 * 24 * 3600);        // log10 seconds in a year
const UNIVERSE = Math.log10(4.35e17);               // ~13.8 billion years

/** A duration given by log10(seconds), in whatever unit reads best. */
function duration(l: number): string {
  if (!isFinite(l)) return "—";
  if (l < -6) return "less than a microsecond";
  const s = l < 300 ? 10 ** l : Infinity;
  if (s < 1e-3) return (s * 1e6).toPrecision(3) + " µs";
  if (s < 1) return (s * 1e3).toPrecision(3) + " ms";
  if (s < 120) return s.toPrecision(3) + " s";
  if (s < 7200) return (s / 60).toPrecision(3) + " minutes";
  if (s < 172800) return (s / 3600).toPrecision(3) + " hours";
  if (s < 5.184e6) return (s / 86400).toPrecision(3) + " days";
  const years = l - YEAR;
  // Only worth the comparison once it is actually longer than the universe.
  if (l < UNIVERSE) return fromLog10(years) + " years";
  return fromLog10(years) + " years (" + fromLog10(l - UNIVERSE) + " × the age of the universe)";
}

export const calcs: Record<string, Calc> = {

/* ---------- k1 · what a security level costs an attacker ---------- */
work:{
  title:"What a security level actually costs",
  hint:"brute force against n-bit security",
  fields:[
    {k:"bits",l:"Security level",u:"bits",v:128},
    {k:"rate",l:"Operations per second, per machine",u:"op/s",v:1e10},
    {k:"mach",l:"Machines in parallel",u:"",v:1e6},
    {k:"watt",l:"Power per machine",u:"W",v:300}
  ],
  run({bits,rate,mach,watt}){
    if(!(bits>0)||!(rate>0)||!(mach>0)) return {lines:[["Fill in the fields","—"]]};
    if(bits>4096) return {lines:[["Security level","above 4096 bits is not a meaningful input"]],
      bad:"Pick a level that corresponds to something real — 80, 112, 128 or 256."};

    // Everything in log10 so 2^256 does not become Infinity.
    const lWork  = (bits - 1) * LOG10_2;                 // expected: half the space
    const lRate  = Math.log10(rate) + Math.log10(mach);
    const lTime  = lWork - lRate;
    const lYears = lTime - YEAR;
    // 1 J ≈ 1 W·s, so log10(joules) = log10(watts) + log10(seconds).
    const lJoule = watt > 0 ? Math.log10(watt) + Math.log10(mach) + lTime : NaN;

    const lines: [string,string][] = [
      ["Search space", pow2(bits)],
      ["Expected operations", "2" + sup(bits - 1) + " ≈ " + fromLog10(lWork)],
      ["Combined rate", fromLog10(lRate) + " op/s"],
      ["Time", duration(lTime)],
    ];
    if(isFinite(lJoule)){
      // World electricity production is on the order of 1e20 J per year.
      lines.push(["Energy", fromLog10(lJoule) + " J ≈ " + fromLog10(lJoule - 20) + " × world annual electricity"]);
    }

    if(lYears < -0.5) return {lines, bad:"Broken. This is not a security level, it is a delay."};
    if(lYears < 2)    return {lines, bad:"Within reach of a determined attacker with rented hardware."};
    if(lYears < 6)    return {lines, ok:"Expensive today. Not a margin to design a long-lived system around."};
    return {lines, ok:"Out of reach of brute force by any margin that matters. If this breaks, it will not be by searching the key space — it will be entropy, reuse, or a side channel."};
  }},

/* ---------- k2, k6 · the birthday bound ---------- */
birthday:{
  title:"Collision probability",
  hint:"random values, or hash outputs",
  fields:[
    {k:"bits",l:"Value size",u:"bits",v:64},
    {k:"n",l:"Values drawn",u:"",v:1e9}
  ],
  run({bits,n:cnt}){
    if(!(bits>0)||!(cnt>0)) return {lines:[["Fill in the fields","—"]]};
    if(bits>4096) return {lines:[["Value size","above 4096 bits is not a meaningful input"]],
      bad:"No deployed value is that wide."};

    const half = bits / 2;
    // p ≈ 1 − e^(−n²/2N). Compute the exponent in log2 so n² cannot overflow.
    const lg2x = 2 * Math.log2(cnt) - 1 - bits;
    const p = lg2x > 40 ? 1 : lg2x < -60 ? 0 : -Math.expm1(-(2 ** lg2x));

    // n for 50%: 1.177·√N. In log2, that is 0.2352 + bits/2.
    const lg2Half = Math.log2(1.1774) + half;
    const lg2First = Math.log2(1.2533) + half;

    const pct = p >= 1 ? "> 99.999 %"
      : p < 1e-12 ? "< 10⁻¹² (about " + (p * 100).toPrecision(2) + " %)"
      : (p * 100).toPrecision(3) + " %";

    const lines: [string,string][] = [
      ["Space size", pow2(bits)],
      ["Values drawn", fromLog10(Math.log10(cnt))],
      ["Collision probability", pct],
      ["50 % reached at", fromLog10(lg2Half * LOG10_2) + " values (≈ 2" + sup(half) + ")"],
      ["First collision expected near", fromLog10(lg2First * LOG10_2) + " values"],
      ["Effective strength against collisions", Math.round(half) + " bits, not " + Math.round(bits)],
    ];

    if(p > 0.5) return {lines, bad:"A collision is more likely than not. For a nonce that is a keystream reuse; for a hash it is a forged pair."};
    if(p > 1e-6) return {lines, bad:"Too likely to ignore. Use a counter instead of a random value, or widen it."};
    return {lines, ok:"Negligible at this volume — but the bound is quadratic, so a hundredfold traffic increase raises this ten-thousandfold."};
  }},

/* ---------- k6 · what it costs to break a hash ---------- */
hash:{
  title:"Attacking a hash function",
  hint:"preimage against collision",
  fields:[
    {k:"alg",l:"Function",u:"",v:"256",sel:[
      ["128","MD5 (128-bit)"],
      ["160","SHA-1 (160-bit)"],
      ["224","SHA-224 (224-bit)"],
      ["256","SHA-256 / SHA3-256 (256-bit)"],
      ["384","SHA-384 (384-bit)"],
      ["512","SHA-512 (512-bit)"]]},
    {k:"rate",l:"Hashes per second, all machines",u:"h/s",v:1e18}
  ],
  run({alg,rate}){
    const bits = parseFloat(String(alg));
    if(!(bits>0)||!(rate>0)) return {lines:[["Fill in the fields","—"]]};

    const lPre  = (bits - 1) * LOG10_2 - Math.log10(rate);      // 2^(n−1) expected
    const lColl = (bits / 2) * LOG10_2 - Math.log10(rate);      // birthday: 2^(n/2)

    // Structural status is a property of the function, not of the arithmetic.
    const broken = bits <= 160;
    const md = bits === 128;

    const lines: [string,string][] = [
      ["Digest size", Math.round(bits) + " bits"],
      ["Preimage resistance", Math.round(bits) + " bits — " + pow2(bits)],
      ["Collision resistance", Math.round(bits / 2) + " bits — " + pow2(bits / 2)],
      ["Generic preimage search", duration(lPre)],
      ["Generic collision search", duration(lColl)],
      ["Collisions are cheaper by", "2" + sup(bits / 2) + " — a factor of " + fromLog10((bits / 2) * LOG10_2)],
      ["Length-extendable", bits === 384 || bits === 512 || bits <= 256 ? "yes for the SHA-2 and SHA-1 line; no for SHA-3, BLAKE2/3 or HMAC" : "—"],
    ];

    if(md) return {lines, bad:"MD5's collision resistance is gone entirely — chosen-prefix collisions run in minutes, far below the generic figure above. Its preimage resistance is not broken, which is why leaked MD5 password hashes are still attacked by guessing."};
    if(broken) return {lines, bad:"SHA-1 collisions are practical: SHAttered found one at about 2⁶³ in 2017, and chosen-prefix collisions followed in 2020. The generic figure above no longer applies. Preimage resistance is intact."};
    if(bits < 256) return {lines, ok:"No practical break, but the collision margin is thinner than the modern floor. Prefer 256 bits or more for anything an attacker gets to choose the input of."};
    return {lines, ok:"No practical break. Note that the security level for anything resting on collisions is the second line, not the first — half the digest size."};
  }},

/* ---------- k9 · textbook RSA, small enough to watch ---------- */
rsa:{
  title:"RSA on small primes",
  hint:"the real operations, at a readable size",
  fields:[
    {k:"p",l:"Prime p",u:"",v:61},
    {k:"q",l:"Prime q",u:"",v:53},
    {k:"e",l:"Public exponent e",u:"",v:17},
    {k:"m",l:"Message m",u:"",v:65}
  ],
  run({p,q,e,m}){
    const isPrime = (v: number): boolean => {
      if(!Number.isInteger(v) || v < 2) return false;
      for(let i = 2; i * i <= v; i++) if(v % i === 0) return false;
      return true;
    };
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    // n stays under 2^26, so every intermediate product stays exact in a double.
    const modpow = (b: number, ex: number, mod: number): number => {
      let r = 1; b %= mod;
      for(let k = ex; k > 0; k >>= 1){
        if(k & 1) r = (r * b) % mod;
        b = (b * b) % mod;
      }
      return r;
    };

    if(!isPrime(p) || !isPrime(q)) return {lines:[["p and q must both be prime","—"]],
      bad:"Try 61 and 53, or any two primes below 5000."};
    if(p === q) return {lines:[["p and q must be different","—"]],
      bad:"With p = q the modulus is a square and φ(n) is not (p−1)(q−1)."};
    if(p > 5000 || q > 5000) return {lines:[["Keep p and q below 5000","—"]],
      bad:"Above that the modular arithmetic loses exactness in a float."};

    const N = p * q, phi = (p - 1) * (q - 1);
    if(!Number.isInteger(e) || e < 3 || e >= phi) return {lines:[["Public exponent","must satisfy 3 ≤ e < φ(n) = " + n(phi)]],
      bad:"Real keys use 65537; here it has to fit inside φ(n)."};
    if(gcd(e, phi) !== 1) return {lines:[["e and φ(n) share a factor of " + gcd(e, phi), "—"]],
      bad:"e must be coprime to φ(n), or it has no inverse and there is no private key."};

    // d = e⁻¹ mod φ, by extended Euclid.
    let [oldR, r] = [e, phi], [oldS, s] = [1, 0];
    while(r !== 0){ const qq = Math.floor(oldR / r);
      [oldR, r] = [r, oldR - qq * r]; [oldS, s] = [s, oldS - qq * s]; }
    const d = ((oldS % phi) + phi) % phi;

    const M = Number.isInteger(m) && m >= 0 ? m % N : 0;
    const c = modpow(M, e, N);
    const back = modpow(c, d, N);
    const sig = modpow(M, d, N);
    const ver = modpow(sig, e, N);
    // Malleability: encrypting 2m gives a ciphertext that is c · 2^e mod n.
    const twice = modpow((M * 2) % N, e, N);
    const forged = (c * modpow(2, e, N)) % N;

    return {lines:[
      ["Modulus n = p·q", n(N)],
      ["φ(n) = (p−1)(q−1)", n(phi)],
      ["Private exponent d = e⁻¹ mod φ(n)", n(d)],
      ["Check e·d mod φ(n)", n((e * d) % phi) + " (must be 1)"],
      ["Encrypt c = m^e mod n", n(M) + " → " + n(c)],
      ["Decrypt c^d mod n", n(c) + " → " + n(back)],
      ["Sign s = m^d mod n", n(sig)],
      ["Verify s^e mod n", n(ver)],
      ["Ciphertext of 2m", n(twice)],
      ["c × 2^e mod n, computed without the key", n(forged)],
      ["Largest message this key can carry", n(N - 1)],
    ], bad: back === M
      ? "Textbook RSA, and note the last two lines: they agree, so anyone holding c can produce the encryption of 2m without the private key. That is the malleability of k9, and it is why OAEP exists. The scheme is also deterministic — the same m always gives the same c — so a small message space is broken by encrypting the candidates."
      : "Decryption did not return the message; check that m is below n."};
  }},

/* ---------- k11 · what a password policy is worth ---------- */
pw:{
  title:"Password strength against a cracker",
  hint:"entropy, then the work factor",
  fields:[
    {k:"set",l:"Composition",u:"",v:"62",sel:[
      ["10","digits only (0–9)"],
      ["26","lowercase letters"],
      ["62","letters and digits"],
      ["95","all printable ASCII"],
      ["7776","Diceware words (length = word count)"]]},
    {k:"len",l:"Length",u:"characters / words",v:10},
    {k:"rate",l:"Guesses per second (fast hash)",u:"",v:1e11},
    {k:"cost",l:"KDF slowdown factor",u:"×",v:1e5}
  ],
  run({set,len,rate,cost}){
    const alpha = parseFloat(set);
    if(!(len > 0) || !(rate > 0) || !(alpha > 1)) return {lines:[["Fill in the fields","—"]]};
    if(len > 512) return {lines:[["Length","keep it under 512"]], bad:"Beyond that the answer is the same: astronomically large."};

    const bits = len * Math.log2(alpha);
    const lWork = Math.log10(0.5) + bits * LOG10_2;      // half the space, on average
    const lFast = lWork - Math.log10(rate);
    const slow = cost > 1 ? cost : 1;
    const lSlow = lFast + Math.log10(slow);

    const lines: [string,string][] = [
      ["Alphabet", n(alpha) + (alpha === 7776 ? " words" : " symbols")],
      ["Entropy", bits.toFixed(1) + " bits"],
      ["Search space", fromLog10(bits * LOG10_2)],
      ["Cracked, unsalted fast hash", duration(lFast)],
      ["Cracked, with a " + fromLog10(Math.log10(slow)) + "× work factor", duration(lSlow)],
      ["Work factor is worth", Math.log2(slow).toFixed(1) + " bits of extra entropy"],
    ];

    if(bits < 40) return {lines, bad:"Falls to a wordlist regardless of the hash. A work factor buys time here, not safety — the whole space is small enough to enumerate."};
    if(lSlow - YEAR < 1) return {lines, bad:"Under a year of targeted cracking. Raise the length, not the character classes: length is worth more per keystroke."};
    return {lines, ok:"Survives targeted cracking at this rate — provided the password is not on a breach list, which no entropy calculation can tell you."};
  }},

/* ---------- k13 · what a quantum adversary changes ---------- */
pq:{
  title:"Classical and quantum security levels",
  hint:"which primitives survive",
  fields:[
    {k:"alg",l:"Primitive",u:"",v:"aes128",sel:[
      ["aes128","AES-128"],
      ["aes256","AES-256"],
      ["sha256","SHA-256 (collisions)"],
      ["rsa2048","RSA-2048"],
      ["rsa3072","RSA-3072"],
      ["p256","P-256 / X25519"],
      ["mlkem768","ML-KEM-768"]]}
  ],
  run({alg}){
    type Row = { name: string; classical: number; kind: "sym" | "shor" | "pq"; note: string };
    const T: Record<string, Row> = {
      aes128:{name:"AES-128",classical:128,kind:"sym",
        note:"Grover nominally halves this to 2⁶⁴ queries, but it parallelises only as a square root and each step is a coherent AES evaluation. Considered acceptable."},
      aes256:{name:"AES-256",classical:256,kind:"sym",
        note:"The comfortable margin. Doubling the symmetric key size is the whole of the symmetric migration."},
      sha256:{name:"SHA-256, collisions",classical:128,kind:"sym",
        note:"Collision resistance is already half the 256-bit output (k6). Quantum collision search gives no useful advantage once memory cost is counted, so this number barely moves."},
      rsa2048:{name:"RSA-2048",classical:112,kind:"shor",
        note:"Shor factors n in polynomial time. Going to RSA-4096 changes nothing — the cost grows polynomially in the key size."},
      rsa3072:{name:"RSA-3072",classical:128,kind:"shor",
        note:"Classically the 128-bit-equivalent RSA size, and no more resistant to Shor than RSA-2048."},
      p256:{name:"P-256 / X25519",classical:128,kind:"shor",
        note:"Shor solves elliptic-curve discrete log too, and a curve needs fewer logical qubits than an RSA modulus of equivalent classical strength — so curves fall earlier, not later."},
      mlkem768:{name:"ML-KEM-768",classical:192,kind:"pq",
        note:"NIST category 3, roughly AES-192 equivalent, and believed secure against both. Deploy it in a hybrid with X25519 (k13) while the assumption is young."},
    };
    const r = T[String(alg)] ?? T.aes128;

    const grover = Math.floor(r.classical / 2);
    const lines: [string,string][] = [
      ["Primitive", r.name],
      ["Classical security", r.classical + " bits"],
      ["Quantum algorithm that applies", r.kind === "shor" ? "Shor — polynomial time" : r.kind === "sym" ? "Grover — square-root speedup" : "none known better than classical"],
      ["Nominal quantum security", r.kind === "shor" ? "broken" : r.kind === "sym" ? grover + " bits (Grover's floor, not a practical cost)" : r.classical + " bits"],
      ["Harvest now, decrypt later", r.kind === "shor" ? "yes — traffic recorded today is at risk" : "no"],
      ["Migration", r.kind === "shor" ? "required: ML-KEM for key agreement, ML-DSA or SLH-DSA for signatures" : r.kind === "sym" ? "size increase at most" : "this is the migration target"],
    ];
    return r.kind === "shor"
      ? {lines, bad: r.note}
      : {lines, ok: r.note};
  }},

};
