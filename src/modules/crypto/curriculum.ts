import type { Level } from "../../types.js";
import { F, W } from "../../helpers.js";

/**
 * Cryptography curriculum. English, like `dsys` and for the same reason: the
 * vocabulary here is the literature's and the standards', and a reader who
 * learns it in translation cannot then read RFC 8446, FIPS 203, or the
 * advisory that tells them their library is broken.
 *
 * The through-line is that primitives are rarely what fails. Every module
 * ends where the deployed system does — at a misuse, a composition error, or
 * a channel the security proof did not model.
 */
export const levels: Level[] = [

{ name:"Level 0 · Ground rules", mods:[

{id:"k1", t:"What \"secure\" means", calc:"work",
 blurb:"A cipher is not secure or insecure on its own. It is secure against a stated adversary, doing stated things, for a stated goal — and almost every argument about cryptography is really an argument about which of those three was left unstated.",
 body:`
<h3>Kerckhoffs's principle</h3>
<p>Auguste Kerckhoffs, writing about military telegraphy in 1883, set down six requirements for a field cipher. Only the second is still quoted: the system must not require secrecy, and it must be able to fall into the enemy's hands without inconvenience. Shannon restated it more bluntly in 1949 — <em>the enemy knows the system</em>.</p>
<p>This is not a moral position about open source. It is a statement about what can be replaced. An algorithm is compiled into every client, printed in every standard, and recoverable from any device an attacker can buy. A key is a short string you can generate afresh in a second. Putting your security in the thing you cannot change, rather than the thing you can, means that the first disclosure is permanent.</p>
<p><span class="term-def">Security through obscurity</span> is therefore not merely weak, it is unrecoverable. When a secret algorithm leaks — and proprietary ciphers have a long history of being reverse-engineered out of firmware: A5/1 in GSM, Crypto1 in the MIFARE Classic, the Hitag2 immobiliser — there is no rotation procedure. Every deployed device is broken at once and stays broken.</p>
<p>The corollary is the one people resist: a cipher nobody has attacked is not a cipher nobody can break. It is a cipher nobody has tried to break. Public scrutiny is the only evidence of strength anyone has ever had, and it is why AES and SHA-3 were chosen by open competition rather than by committee.</p>

<h3>The threat model comes before the algorithm</h3>
<p>A <span class="term-def">threat model</span> answers three questions, and until it does, "is this secure?" has no truth value:</p>
${F(`<b>Who</b>    what the adversary can do — read the wire, modify it,
       submit chosen inputs, run code on the same machine,
       hold the device in their hand, compel a subpoena

<b>What</b>   what must not leak — the message, the fact of the
       message, its length, who sent it, that it is the same
       message as yesterday's

<b>How long</b> how long it must hold — until the meeting ends,
       or for the thirty years a medical record is retained`)}
<p>The third line is the one that gets skipped and the one that changes the answer most. A session token needs to resist attack for an hour. A diagnosis needs to resist attack for a lifetime, against an adversary who can record the ciphertext today and decrypt it whenever the ability arrives — which is the whole argument of the post-quantum module, k13.</p>
<p>Notice also what the second line does <em>not</em> include by default. Encryption hides content. It does not hide length, timing, frequency, or the identities of the endpoints. If your threat model says that the fact that a user contacted a particular clinic must not leak, then no choice of cipher addresses it and you need a different mechanism entirely.</p>

<h3>The ladder of attacker capability</h3>
<p>Cryptographic definitions grade adversaries by what they are allowed to ask for. The ladder is cumulative, and every rung is a real deployment:</p>
${F(`<b>ciphertext-only</b>    the adversary sees ciphertexts and nothing else
<b>known-plaintext</b>    they also know some matching plaintexts
<b>chosen-plaintext</b>   they can get plaintexts of their choosing
                    encrypted (CPA)
<b>chosen-ciphertext</b>  they can also submit ciphertexts and learn
                    something about the result (CCA)`)}
<p>Chosen-plaintext sounds like a laboratory contrivance until you notice that any system which encrypts attacker-influenced data grants it for free: a web session cookie encrypted alongside a URL path the attacker controls, a log line, a search query, a filename. <span class="term-def">Chosen-ciphertext</span> sounds even more contrived, and is even more common — because the adversary does not need a decryption service, only a system that <em>behaves differently</em> depending on what a decryption produced. An error message, an HTTP status code, a timing difference, a log entry. Module k5 turns exactly that into a full plaintext recovery.</p>
<p>The modern default is therefore to demand CCA security of everything, on the grounds that you will not successfully predict which of your error paths becomes an oracle.</p>

<h3>Indistinguishability, and why encryption must be randomised</h3>
<p>The standard definition of confidentiality is a game. The adversary picks two messages of equal length, hands them over, receives the encryption of one of them, and tries to say which. The scheme is <span class="term-def">IND-CPA</span> secure if no efficient adversary does better than guessing by more than a negligible margin.</p>
<p>One consequence falls straight out and rules out an enormous amount of naive code: <strong>a deterministic encryption scheme cannot be IND-CPA secure.</strong> If encrypting the same plaintext always gives the same ciphertext, the adversary asks for an encryption of one of their two candidates first, compares, and wins with certainty. Every secure scheme therefore takes something fresh per message — a random IV, a nonce, a counter — and the requirements on that value are the subject of k2.</p>
<p>The same reasoning kills "encrypt the database column so we can still index on it": if equal plaintexts give equal ciphertexts, then the ciphertext column leaks the entire equality structure of the plaintext column. For a column of diagnoses or salaries, that plus a public frequency distribution is usually the whole secret.</p>
${W(`"We encrypt everything at rest with AES-256" is a claim about a primitive, not about a system. It does not say which mode, whether anything is authenticated, where the key lives relative to the data, or who can ask the service to decrypt on their behalf. In practice the last question is the one that matters, and it is answered by access control, not by cryptography.`)}

<h3>Measuring strength in bits</h3>
<p>A scheme has <span class="term-def">n-bit security</span> when the best known attack costs about 2ⁿ operations. This is a statement about the best <em>known</em> attack, so it is a moving ceiling, and it is not the same as the key length: RSA has a 2048-bit key and roughly 112-bit security, because factoring is far cheaper than searching the key space.</p>
${F(`AES-128                      128-bit security
AES-256                      256-bit security
SHA-256, collisions          128-bit  (half the output, see k6)
SHA-256, preimages           256-bit
RSA-2048                     ≈ 112-bit
RSA-3072                     ≈ 128-bit
P-256 / Curve25519           ≈ 128-bit`)}
<p>The jump from 2⁸⁰ to 2¹²⁸ is worth internalising, because intuition about large numbers fails exactly here. 2⁸⁰ is expensive but has been reached. 2¹²⁸ is not "more expensive"; it is a different category. A machine performing a billion billion (10¹⁸) operations per second, running since the formation of the Earth, would be about one ten-thousandth of the way through 2¹²⁸. Brute force is not the threat to a 128-bit key, and no amount of hardware progress makes it the threat. The threat is that the key was not really 128 bits of entropy, or that it leaked by another route.</p>
<p>Which is the practical form of the <span class="term-def">weakest-link</span> rule: the security of a system is the smallest number in the chain, not the largest. AES-256 protecting a key derived from a six-digit PIN gives you twenty bits. The advertised number is almost never the real one, and finding the real one means looking at key generation, key storage, and the recovery flow — not at the cipher.</p>

<h3>What actually breaks</h3>
<p>Primitives are hardly ever the failure. AES has stood since 2001 and SHA-256 since 2002 with no practical break. Deployed systems fail anyway, and they fail in a short list of ways that this subject follows one at a time:</p>
<ul>
<li><span class="term-def">Bad randomness</span> — a key or nonce that was never as unpredictable as assumed (k2).</li>
<li><span class="term-def">Reuse</span> — a keystream, an IV, or a signature nonce used twice (k3, k7, k10).</li>
<li><span class="term-def">Missing authentication</span> — confidentiality without integrity, which is almost never what the application wanted (k4, k7).</li>
<li><span class="term-def">Distinguishable failures</span> — an error path that tells the attacker what a decryption produced (k5).</li>
<li><span class="term-def">Composition</span> — two individually sound pieces bolted together in an order that voids both proofs (k7, k12).</li>
<li><span class="term-def">Side channels</span> — the implementation leaking through time, cache, or power what the algorithm does not leak (k12).</li>
<li><span class="term-def">Key management</span> — the key sitting in the repository, the backup, or the same table as the ciphertext.</li>
</ul>
<p>None of these is fixed by choosing a stronger algorithm, and this is why "use a bigger key" is so rarely the answer to anything.</p>`,
 facts:[
 "Kerckhoffs's principle: everything except the key is assumed public, because the key is the only part you can rotate after a disclosure.",
 "\"Secure\" is meaningless without a threat model — who the adversary is, what must not leak, and for how long. The third is skipped most often and changes the answer most.",
 "A deterministic encryption scheme cannot be IND-CPA secure: the adversary encrypts a candidate and compares. Every secure scheme takes a fresh IV, nonce or counter per message.",
 "Chosen-ciphertext capability does not require a decryption service, only a system that behaves observably differently depending on what a decryption produced.",
 "n-bit security means the best known attack costs about 2ⁿ operations, and is not the key length: RSA-2048 offers roughly 112 bits.",
 "Security is the weakest link, not the strongest: AES-256 over a key derived from a six-digit PIN is a twenty-bit system.",
 "Primitives are almost never what breaks. Randomness, reuse, missing authentication, distinguishable errors, composition, side channels and key management are."
 ]},

{id:"k2", t:"Randomness", calc:"birthday",
 blurb:"Every key, nonce and salt in this subject rests on the assumption that the adversary cannot guess a number you generated. That assumption fails more often than any cipher, and it fails quietly.",
 body:`
<h3>Entropy is a property of the distribution, not of the string</h3>
<p>Ask how much entropy the value <code>a7f3c19b</code> has and the question has no answer. Entropy belongs to the process that produced it, not to the bytes. If it came from a fair coin flipped 32 times, it has 32 bits. If it was picked from a list of a thousand device serial numbers, it has just under ten bits, no matter how random it looks.</p>
<p>The measure that matters to an attacker is <span class="term-def">min-entropy</span>: the negative log of the probability of the <em>most likely</em> outcome. Average-case entropy flatters a distribution with one dominant value; the attacker guesses that one first. A key generator whose output is uniform over 2²⁵⁶ values except that one in a thousand devices produces the same key has 256 bits of average entropy and about ten bits of min-entropy against a fleet-wide attack.</p>
<p>So the whole of this module reduces to one question about any secret in your system: <em>how many possibilities did the adversary have to consider?</em> Not how long the value is.</p>

<h3>Two kinds of random number generator</h3>
<p>Programming languages ship a generator designed to produce statistically well-distributed numbers quickly. It is not the one you want.</p>
${F(`statistical PRNG        uniform, fast, reproducible from a seed;
                        internal state recoverable from output
                        e.g. Mersenne Twister, xorshift, rand(),
                        Math.random()

CSPRNG                  additionally: given any amount of output,
                        the next bit cannot be predicted, and the
                        previous state cannot be recovered
                        e.g. getrandom(2), /dev/urandom,
                        BCryptGenRandom, ChaCha20-based DRBGs`)}
<p>The Mersenne Twister passes every statistical test thrown at it and is completely predictable: observe 624 consecutive 32-bit outputs, invert the tempering, and you have the entire internal state and every future output. Passing a randomness test suite says the output has no obvious bias. It says nothing about whether the next value can be predicted, and prediction is the only property that matters for a key.</p>
<p>The practical rule is short: <strong>use the operating system's generator</strong>. Not a language-level shuffle, not a hash of the current time, not a UUID library unless you have checked which version it uses — UUIDv4 from a CSPRNG is 122 bits of entropy and fine; a time-based UUIDv1 is a timestamp and a MAC address and is a public value.</p>
<p>The old advice to prefer <code>/dev/random</code> over <code>/dev/urandom</code> for "real" entropy is obsolete and was always wrong on Linux: after the pool is initialised, the two are cryptographically identical and the blocking one merely stalls. The real hazard is different — it is entropy <em>before</em> initialisation.</p>

<h3>How entropy failures actually happen</h3>
<p>Two cases dominate, and neither looks like a cryptographic mistake at the point where it is made.</p>
<p><span class="term-def">Boot-time starvation.</span> A headless embedded device generating its host key on first boot has no mouse, no keyboard, no disk seek timings, and a network interface that has not yet seen traffic. The 2012 survey <em>Mining Your Ps and Qs</em> scanned the public internet, collected TLS and SSH keys, and found that a substantial fraction of hosts shared prime factors — enough to compute private keys for tens of thousands of devices by taking pairwise GCDs, using nothing but arithmetic on public data. The cause was not a weak algorithm. It was RSA key generation running before the entropy pool had anything in it.</p>
<p><span class="term-def">A well-meaning code change.</span> In 2006 a Debian maintainer removed a line from OpenSSL that a memory-checking tool had flagged as reading uninitialised memory. The tool was right about the read and wrong about the consequence: the line was feeding the entropy pool. For two years the only variable input left to key generation was the process id, so every key produced on an affected system came from a space of 32,768 possibilities. All of them were enumerated and published. The bug was invisible to every test, because the output still looked random.</p>
<p>To these, virtualisation adds a third: a virtual machine restored from a snapshot, or a container image cloned across a fleet, resumes with the entropy pool state it had when the image was taken. Two instances then produce the same "random" values. Modern kernels detect VM generation-id changes and reseed, but any process holding its own userspace pool across the fork does not.</p>
${W(`An entropy failure produces output that passes every statistical test, every code review, and every integration test. The system works. It is broken only against an adversary who reconstructs the same small search space — which means it can persist for years, as the Debian bug did, and every key generated during that window stays compromised after the fix.`)}

<h3>Key, nonce, salt, IV — four jobs, different rules</h3>
<p>These are constantly used as synonyms for "some random bytes", and they have genuinely different requirements. Getting the table below wrong is the origin of a large share of the breaks in this subject.</p>
${F(`                secret?   unique?        unpredictable?
key             yes       —              yes (full entropy)
nonce / IV      no        REQUIRED       depends on the mode
salt            no        per record     no
`)}
<ul>
<li>A <span class="term-def">nonce</span> is a number used once. It is not secret and is usually transmitted in the clear next to the ciphertext. Its one requirement is that it never repeats under the same key — and for CTR-mode and GCM, a repeat is a total break, not a degradation (k3, k7).</li>
<li>An <span class="term-def">IV</span> for CBC has a stronger requirement than uniqueness: it must also be <em>unpredictable</em> to the attacker before the message is encrypted. TLS 1.0 chained the IV from the previous record's last ciphertext block, which made it predictable, which is the BEAST attack. Same construction, one adjective different, fully broken.</li>
<li>A <span class="term-def">salt</span> only has to be unique per record. It defeats precomputation and stops identical passwords from producing identical hashes; it need not be unpredictable, and it is stored in the clear (k11).</li>
</ul>
<p>The safest way to satisfy "never repeats" is usually a counter, not a random value — a counter cannot collide by accident. Random nonces are chosen when there is no state to hold a counter across restarts, and that choice has a bound, which is the next section.</p>

<h3>The birthday bound</h3>
<p>Draw values uniformly at random from a space of size <em>N</em>. The chance that all of them are distinct falls much faster than intuition suggests, because the number of <em>pairs</em> grows quadratically:</p>
${F(`P(at least one collision after n draws)  ≈  1 − e^(−n² / 2N)

50% probability at   n ≈ 1.177 √N
first collision expected around  n ≈ 1.25 √N`)}
<p>The consequence for a <em>b</em>-bit random value is that collisions arrive around 2^(b/2) draws, not 2^b. A random 64-bit IV starts colliding after about four billion messages under one key — reachable by a busy server. A random 96-bit GCM nonce is safe to roughly 2³² messages per key, which is why the standards phrase the limit in messages rather than in bytes, and why a deterministic counter is preferred wherever one can be kept.</p>
<p>This same bound is the reason a hash function's collision resistance is half its output length (k6), and the reason 64-bit block ciphers became unusable for bulk traffic (k4). It is one piece of arithmetic that shows up in three unrelated-looking places, so it is worth being able to reproduce rather than recall.</p>
<p>The animation sweeps the number of draws against the space size; the calculator does the same arithmetic for a size you type in.</p>`,
 facts:[
 "Entropy is a property of the generating distribution, not of the bytes. The number that matters is min-entropy: how many possibilities the adversary had to consider.",
 "Passing statistical randomness tests says nothing about predictability. The Mersenne Twister is uniform and fully predictable from 624 outputs.",
 "Use the OS generator. On Linux /dev/urandom and /dev/random are cryptographically identical once initialised; the real hazard is generating keys before initialisation.",
 "Entropy failures are silent — the Debian OpenSSL bug left 32,768 possible keys for two years and broke no test.",
 "A nonce must be unique, an IV for CBC must additionally be unpredictable, and a salt only has to be unique per record. Confusing the three is a common source of breaks.",
 "A counter cannot collide by accident; a random value can. Prefer a counter wherever state can be kept across restarts.",
 "Birthday bound: random b-bit values start colliding around 2^(b/2) draws, which caps random 96-bit nonces at roughly 2³² messages per key."
 ]}

]},

{ name:"Level 1 · Symmetric encryption", mods:[

{id:"k3", t:"XOR, the one-time pad, and stream ciphers", calc:null,
 blurb:"The only cipher that is provably unbreakable, why nobody can use it, and what happens the moment you use its key twice. The last part is not a historical curiosity — it is still shipping.",
 body:`
<h3>The operation everything is built on</h3>
<p>Exclusive-or has four properties, and between them they explain most of symmetric cryptography's behaviour, good and bad:</p>
${F(`a ⊕ a = 0                  self-inverse
a ⊕ 0 = a                  identity
a ⊕ b = b ⊕ a              commutative
(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)   associative`)}
<p>Self-inverse is why encryption and decryption are the same operation. Commutativity and associativity are why the key cancels when you combine two ciphertexts — which is the whole of the two-time-pad break below.</p>

<h3>The one-time pad and perfect secrecy</h3>
<p>Take a key <em>k</em> that is uniformly random, exactly as long as the message, and never used again. Encrypt with <em>c = m ⊕ k</em>, decrypt with <em>m = c ⊕ k</em>. Shannon proved in 1949 that this achieves <span class="term-def">perfect secrecy</span>: the ciphertext distribution is independent of the plaintext, so an adversary with unbounded computation learns nothing beyond the length.</p>
<p>The strength is easiest to see from the decryption side. For any ciphertext of <em>n</em> bits and any candidate plaintext of <em>n</em> bits, there exists a key that maps one to the other, and all such keys are equally likely. A ciphertext of the right length decrypts to <code>ATTACK AT DAWN</code> under one key and <code>RETREAT BY SEA</code> under another, and nothing in the ciphertext favours either. There is no work factor to increase and no future computer that helps.</p>
<p>Shannon proved the price along with the result: perfect secrecy requires the key space to be at least as large as the message space. You cannot have unconditional security with a short key. So the pad's key is as long as everything you will ever send, must be delivered in advance over a channel you already trust, and must be destroyed after one use. If you have such a channel, you could have sent the message over it. This is why the one-time pad is used for the very small number of cases where couriered key material is genuinely cheaper than the alternative — diplomatic channels, the Moscow–Washington hotline — and nowhere else.</p>

<h3>Stream ciphers: the trade everyone actually makes</h3>
<p>A <span class="term-def">stream cipher</span> keeps the pad's structure and replaces its impossible key. A pseudorandom generator takes a short key and a nonce and stretches them into a keystream as long as the message; you XOR that. The security drops from information-theoretic to computational — an adversary with unbounded time can now break it — and in exchange the key becomes 32 bytes instead of a gigabyte.</p>
<p>That trade is the one every practical cipher makes, and stated this way it makes the requirement on the nonce obvious. The keystream is a function of (key, nonce). Same key, same nonce, same keystream. The pad's "never reuse" rule did not go away; it moved onto the nonce.</p>
<p>The modern choice is <span class="term-def">ChaCha20</span> — a 256-bit key, a 96-bit nonce, and a 32-bit block counter, built from additions, rotations and XORs, so it is fast and naturally constant-time in software without special instructions. RC4, its predecessor, had statistical biases in the first keystream bytes that were known for years and eventually made practical against TLS and against WEP; it is prohibited in TLS since RFC 7465. Do not implement a stream cipher from an LFSR you found in a textbook; the ones in GSM and Bluetooth built that way have all fallen.</p>

<h3>The two-time pad</h3>
<p>Encrypt two messages with the same keystream and watch the key disappear:</p>
${F(`c₁ = m₁ ⊕ k
c₂ = m₂ ⊕ k

c₁ ⊕ c₂ = (m₁ ⊕ k) ⊕ (m₂ ⊕ k) = m₁ ⊕ m₂`)}
<p>The attacker now holds the XOR of two plaintexts, with no key involved. That looks like noise, and it is not: English text is redundant, and ASCII is structurally biased. Every lowercase letter has bit 5 set and every space does not, so <em>m₁ ⊕ m₂</em> reveals, byte by byte, where one message has a space and the other a letter. From there, <span class="term-def">crib dragging</span> finishes it: guess a common word, XOR it in at each offset, and read off what the other message would have to say. Wherever the result is plausible English you have recovered both messages at that position, and each recovery extends the crib.</p>
<p>The break needs no computer worth the name. With two English messages of a few hundred characters it is a pencil exercise, and with a wordlist it is instant. This is a decryption of both plaintexts, not a statistical hint.</p>
<p>The history is long and is not over:</p>
<ul>
<li><span class="term-def">VENONA</span> — Soviet one-time pad pages were duplicated under wartime production pressure. US cryptanalysts exploited the reuse from 1943 into the 1980s, reading thousands of messages that were, page by page, individually unbreakable.</li>
<li><span class="term-def">WEP</span> — a 24-bit IV prepended to a fixed key. By the birthday bound of k2, collisions appear after a few thousand frames, which a busy access point emits in minutes.</li>
<li><span class="term-def">MS-PPTP</span> — used the same RC4 key in both directions, so XORing the two streams cancelled it.</li>
<li>And routinely today, wherever a developer stores an IV as a constant because the API demanded one and a fixed value made the tests deterministic.</li>
</ul>

<h3>Malleability: the half nobody remembers</h3>
<p>The XOR structure has a second consequence, independent of reuse. An attacker who knows or guesses part of the plaintext can change it to anything they like:</p>
${F(`c' = c ⊕ (m_guess ⊕ m_desired)

decrypts to  m ⊕ m_guess ⊕ m_desired  =  m_desired
             (when the guess was right)`)}
<p>Flip a bit of the ciphertext, flip the same bit of the plaintext. No key required, and the change is undetectable, because there is nothing in the scheme to detect it with. If a token encrypts <code>role=user</code> at a known offset, an attacker with no key at all can turn it into <code>role=root</code>.</p>
${W(`A stream cipher provides confidentiality and exactly zero integrity. Encrypted is not the same as tamper-proof, and the plaintext an attacker cannot read is still one they can change to a value of their choosing. Every stream cipher needs a MAC over the ciphertext (k7), which is why the primitive you should actually reach for is ChaCha20-Poly1305 rather than ChaCha20.`)}
<p>The animation runs both cases side by side: the same plaintexts under a reused nonce, where the XOR of the ciphertexts is the XOR of the plaintexts and the structure is plainly visible, and under distinct nonces, where it is noise.</p>`,
 facts:[
 "The one-time pad is perfectly secret: every plaintext of the right length is equally consistent with the ciphertext, so unbounded computation does not help.",
 "Shannon also proved the price — perfect secrecy requires a key at least as long as the message, which is why the pad is unusable in general.",
 "A stream cipher replaces the pad's key with a keystream derived from (key, nonce). The never-reuse requirement did not disappear; it moved onto the nonce.",
 "Reusing a keystream cancels the key: c₁ ⊕ c₂ = m₁ ⊕ m₂, and plaintext redundancy recovers both messages by crib dragging.",
 "The reuse break is not theoretical — VENONA, WEP's 24-bit IV, and MS-PPTP's shared key in both directions are all the same mistake.",
 "Stream ciphers are malleable: flipping a ciphertext bit flips the plaintext bit, undetectably. Confidentiality is not integrity.",
 "ChaCha20 is the modern choice, and ChaCha20-Poly1305 — with the MAC — is the one to actually deploy."
 ]},

{id:"k4", t:"Block ciphers and modes", calc:null,
 blurb:"AES encrypts sixteen bytes. Everything about how you encrypt the seventeenth is the mode, and essentially every symmetric failure in deployed systems is a mode failure rather than a cipher failure.",
 body:`
<h3>What a block cipher is, and is not</h3>
<p>A <span class="term-def">block cipher</span> is a keyed permutation on a fixed-width block: for each key it is a bijection from <em>b</em>-bit blocks to <em>b</em>-bit blocks, and it is invertible because the key holder must be able to get back. AES has a 128-bit block; the key may be 128, 192 or 256 bits, giving 10, 12 or 14 rounds. It was selected in 2001 by open competition, as Rijndael, and after a quarter-century of attention the best attacks on the full cipher remain marginally better than brute force and entirely impractical.</p>
<p>That is the whole primitive. It encrypts exactly one block, and by itself it is not an encryption scheme — it has no way to handle a message that is not exactly sixteen bytes, and being a deterministic function it cannot be IND-CPA secure (k1). The <span class="term-def">mode of operation</span> is what turns the permutation into a scheme, and it is where the design decisions and the failures live.</p>

<h3>ECB — the one that is always wrong</h3>
<p>Electronic Codebook splits the plaintext into blocks and encrypts each independently.</p>
${F(`cᵢ = E(k, mᵢ)`)}
<p>Equal plaintext blocks give equal ciphertext blocks. That single property is fatal twice over: it is deterministic, so it cannot be IND-CPA secure, and it preserves the plaintext's entire block-level equality structure. The canonical demonstration is an image encrypted block by block, where the outlines remain perfectly legible in the ciphertext; the cipher is not weakened at all, and the picture is still there because the <em>pattern</em> was never encrypted.</p>
<p>It reorders and replays, too: without chaining, an attacker can cut, splice and duplicate whole blocks and produce a ciphertext that decrypts cleanly to a rearranged plaintext. There is no message length and no data type for which ECB is the right answer. Its persistence in code is almost always because it is the mode a library picks when the caller passes no mode at all.</p>

<h3>CBC — chaining, and the two things it needs</h3>
<p>Cipher Block Chaining XORs each plaintext block with the previous ciphertext block before encrypting, starting from an IV.</p>
${F(`cᵢ = E(k, mᵢ ⊕ cᵢ₋₁)        c₀ = IV
mᵢ = D(k, cᵢ) ⊕ cᵢ₋₁`)}
<p>Identical plaintext blocks now encrypt differently, because each is masked by a different preceding ciphertext. Encryption is inherently sequential; decryption is parallel, because every input it needs is already in hand.</p>
<p>Two requirements come with it, and both have been violated in shipped protocols. The IV must be <em>unpredictable</em>, not merely unique — TLS 1.0 reused the previous record's final ciphertext block as the next record's IV, letting an attacker who can inject chosen plaintext predict it and confirm guesses about adjacent secret bytes, which is BEAST (2011). And the message must be padded to a whole number of blocks, which brings its own attack surface, the subject of k5.</p>
<p>CBC is also malleable in a specific, exploitable shape: flipping a bit in <em>cᵢ₋₁</em> flips the same bit in <em>mᵢ</em> and turns <em>mᵢ₋₁</em> into garbage. An attacker willing to sacrifice one block can make surgical edits to the next.</p>

<h3>CTR — a block cipher pretending to be a stream cipher</h3>
<p>Counter mode never decrypts anything. It encrypts a nonce concatenated with a counter to produce a keystream, and XORs.</p>
${F(`keystream block i = E(k, nonce ‖ i)
cᵢ = mᵢ ⊕ keystream block i`)}
<p>The consequences are all pleasant except one. No padding is needed, so the ciphertext is exactly the plaintext's length. Both directions are fully parallel, and any block can be decrypted in isolation, which is what makes it the mode for disk and object storage. Only the forward direction of the cipher is used, so an implementation needs no inverse.</p>
<p>The exception is that everything k3 said about stream ciphers now applies without amendment. Repeat a (key, nonce) pair and you have a two-time pad: the two ciphertexts XOR to the two plaintexts. AES itself is untouched, and the message is recovered anyway.</p>

<h3>What none of them do</h3>
<p>ECB, CBC and CTR provide confidentiality alone. All three are malleable, none detects modification, and a decryptor handed a corrupted or attacker-crafted ciphertext will return <em>something</em> rather than an error. The application then acts on it.</p>
${W(`This is the single most common design error in applied cryptography, and it does not look like an error at the call site: the code encrypts, the code decrypts, the tests pass. It fails only against an adversary who modifies ciphertext, which is exactly the adversary the encryption was for. Unless you are implementing a mode for study, do not choose from this list — choose an AEAD (k7), which does both jobs under one key and one call.`)}

<h3>Block size and the birthday bound again</h3>
<p>Modes leak once ciphertext blocks start to collide, and by k2's arithmetic that happens around 2^(b/2) blocks. With AES's 128-bit block that is 2⁶⁴ blocks — unreachable. With the 64-bit block of 3DES or Blowfish it is 2³², which is 32 GB of traffic under a single key, and a long-lived HTTPS or VPN connection reaches it. That is <span class="term-def">Sweet32</span> (2016), and it is the practical reason 64-bit block ciphers were retired: no weakness was found in 3DES itself, the block was simply too narrow for the amount of data being pushed through it.</p>
<p>The animation encrypts a small image under each mode. Change the IV and watch what happens to the ciphertext — under CBC and CTR everything changes, and under ECB nothing does, because ECB has nowhere to put it.</p>`,
 facts:[
 "A block cipher is a keyed permutation on one fixed-width block, not an encryption scheme. AES: 128-bit block, 128/192/256-bit keys, 10/12/14 rounds.",
 "ECB encrypts each block independently, so equal plaintext blocks give equal ciphertext blocks — deterministic, structure-preserving, and splice-able. There is no correct use of it.",
 "CBC needs an IV that is unpredictable, not merely unique; a predictable one is the BEAST attack against TLS 1.0.",
 "CTR turns a block cipher into a stream cipher: no padding, fully parallel, random access — and a repeated (key, nonce) is a two-time pad.",
 "ECB, CBC and CTR all provide confidentiality only. Every one of them is malleable and none detects modification.",
 "Ciphertext collisions start around 2^(b/2) blocks, so a 64-bit block leaks after ~32 GB under one key. That is Sweet32, and it retired 3DES.",
 "The mode is where symmetric systems fail, not the cipher. The right answer at the call site is an AEAD, not a choice from this list."
 ]},

{id:"k5", t:"Padding oracles", calc:null,
 blurb:"A complete plaintext recovery built out of nothing but a server that distinguishes two kinds of failure. No key is guessed and no cipher is weakened; the attack is against the error message.",
 body:`
<h3>Why padding exists</h3>
<p>CBC encrypts whole blocks, and messages are not whole blocks. <span class="term-def">PKCS#7</span> padding fills the gap: append <em>N</em> bytes each of value <em>N</em>, where <em>N</em> is whatever it takes to reach a block boundary.</p>
${F(`... 41 42 43 | 0D 0D 0D 0D 0D 0D 0D 0D 0D 0D 0D 0D 0D
                (thirteen bytes of 0x0D)

a message already block-aligned gets a WHOLE extra block:
... 41 42 43 | 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10`)}
<p>The full extra block is not waste — it is what makes unpadding unambiguous. Without it, a message legitimately ending in the byte 0x01 could not be told from a message with one byte of padding.</p>
<p>Which means the receiver must <em>check</em>: read the last byte <em>N</em>, verify it is between 1 and 16, verify the final <em>N</em> bytes all equal <em>N</em>, and strip them. That check has two outcomes, and the attack is built entirely out of the receiver telling the attacker which one occurred.</p>

<h3>The oracle</h3>
<p>Anything that distinguishes "the padding was malformed" from "the padding was fine but something later failed" is a <span class="term-def">padding oracle</span>. It does not have to be a message saying so. In practice it has been:</p>
<ul>
<li>distinct error strings, or distinct HTTP status codes (500 versus 403);</li>
<li>the same status code with a different response length;</li>
<li>no visible difference at all, but a measurable timing gap — a bad pad returns immediately, a good pad goes on to compute a MAC over the message;</li>
<li>a log line written in one case and not the other, read back through some other channel.</li>
</ul>
<p>This is the chosen-ciphertext setting from k1 arriving in production. The attacker never needs a decryption service, only one bit of feedback per query.</p>

<h3>The attack, in full</h3>
<p>Vaudenay published it in 2002. Take a ciphertext block <em>c</em> whose plaintext you want, and let <em>D(c)</em> be its raw block-cipher decryption — the value that CBC then XORs with the previous ciphertext block to get the plaintext. Send the server a forged two-block ciphertext <em>(r, c)</em> where <em>r</em> is yours to choose.</p>
<p>The server computes <em>D(c) ⊕ r</em> and checks its padding. Vary the last byte of <em>r</em> through all 256 values. Exactly one (barring a rare double hit on longer padding, which a second probe distinguishes) makes the last byte of the result equal 0x01 — valid single-byte padding.</p>
${F(`when the oracle accepts:
    D(c)[15] ⊕ r[15]  =  0x01
    D(c)[15]          =  r[15] ⊕ 0x01

and the real plaintext byte, under the real previous block c_prev:
    m[15]             =  D(c)[15] ⊕ c_prev[15]`)}
<p>One plaintext byte, from at most 256 queries, with no key involved. Now target two-byte padding: set <em>r[15] = D(c)[15] ⊕ 0x02</em> so the last byte lands on 0x02 by construction, and vary <em>r[14]</em> until the oracle accepts, giving <em>D(c)[14]</em>. Walk left to the start of the block, then move to the next block — every block of the message is a target, and the previous ciphertext block you need is already in the ciphertext you captured.</p>
${F(`cost:  ≤ 256 queries per byte, ~128 average
       16 bytes per block
       ⇒ a few thousand queries per block

recovered: the entire plaintext
guessed:   nothing about the key`)}
<p>The corresponding <em>encryption</em> oracle exists too. The same primitive lets an attacker construct a ciphertext that decrypts to a plaintext of their choosing, which is how the 2010 ASP.NET vulnerability (MS10-070) went from reading files to forging authentication tickets.</p>

<h3>It kept happening</h3>
<ul>
<li><span class="term-def">MS10-070</span> (2010) — ASP.NET's ViewState and the padding oracle in its error handling; the encryption direction gave arbitrary file download and ticket forgery.</li>
<li><span class="term-def">Lucky Thirteen</span> (2013) — TLS implementations had been carefully equalised to return the same error either way, but the MAC computation ran over a different number of bytes depending on how much padding was stripped. The remaining timing difference was a few microseconds, and it was enough.</li>
<li><span class="term-def">POODLE</span> (2014) — SSL 3.0's padding bytes, unlike PKCS#7's, had unspecified content and so were not covered by the MAC at all. The oracle was built into the protocol.</li>
<li>And the same shape in JSF ViewState, Ruby on Rails cookies, Steam's protocol, and many others.</li>
</ul>

<h3>The fix is structural</h3>
<p>Uniform error messages and constant-time comparison are worth doing, and they are not the fix. Lucky Thirteen exists precisely because uniform errors were tried; the timing survived. As long as the receiver decrypts before it authenticates, the decryption's behaviour is observable in <em>something</em>, and every such observable is a candidate oracle.</p>
<p>The structural fix is to make the receiver refuse to decrypt attacker-modified data at all:</p>
<ul>
<li><span class="term-def">Encrypt-then-MAC.</span> Compute the tag over the IV and ciphertext. On receipt, verify the tag first, in constant time, and if it fails, stop — before any decryption and before any padding is examined. A forged ciphertext never reaches the padding check, so the padding check cannot leak.</li>
<li><span class="term-def">Use an AEAD.</span> AES-GCM or ChaCha20-Poly1305 do this by construction, under one key and one call, with no order for you to get wrong (k7).</li>
<li><span class="term-def">Prefer a mode without padding.</span> CTR and its AEAD descendants have no padding, so the entire class of attack has nowhere to live.</li>
</ul>
${W(`Generalise past the padding. The lesson is that any decryption failure the attacker can distinguish — by message, status, length, timing, or downstream behaviour — is a decryption oracle, and a decryption oracle is usually enough to recover the plaintext. This is why "authenticate before you decrypt" is a rule rather than a preference.`)}`,
 facts:[
 "PKCS#7 pads with N bytes of value N, and a block-aligned message gets a whole extra block, so unpadding is unambiguous.",
 "A padding oracle is any distinguishable difference between \"bad padding\" and \"bad something else\" — message, status code, response length, or timing.",
 "The attack recovers D(c)[15] = r[15] ⊕ 0x01 from the accepted forgery, then the plaintext byte as D(c)[15] ⊕ c_prev[15]. No key is ever guessed.",
 "Cost is at most 256 queries per byte, so a few thousand per block, and it recovers the entire message.",
 "Lucky Thirteen shows that equalising error messages is not enough: the MAC ran over a different number of bytes and the microsecond gap was exploitable.",
 "The structural fix is encrypt-then-MAC with the tag verified in constant time before any decryption — or an AEAD, or a mode with no padding at all.",
 "Any distinguishable decryption failure is a decryption oracle. Authenticate before you decrypt."
 ]}

]},

{ name:"Level 2 · Integrity and authenticity", mods:[

{id:"k6", t:"Hash functions", calc:"hash",
 blurb:"Three security properties that are routinely confused, an output length that means half what people think it does, and a construction whose internal state is published with every digest.",
 body:`
<h3>Three properties, not one</h3>
<p>A cryptographic hash maps arbitrary-length input to a fixed-length digest, deterministically. "Secure" means three separate things, and a function can lose them one at a time:</p>
${F(`preimage resistance         given h, find any m with H(m) = h
                            cost: 2ⁿ

second-preimage resistance  given m₁, find m₂ ≠ m₁ with the
                            same digest
                            cost: 2ⁿ

collision resistance        find ANY m₁ ≠ m₂ that collide
                            cost: 2^(n/2)  — birthday bound`)}
<p>The last line is the one that surprises people. Collisions are cheaper because the attacker chooses both messages and only needs <em>some</em> pair to match, so the birthday arithmetic of k2 applies: about 2^(n/2) evaluations. <strong>SHA-256 offers 128-bit collision resistance, not 256-bit.</strong> If a design's security rests on collisions being hard, its security level is half the digest length, and this is why 256 bits is the modern floor rather than an indulgence.</p>
<p>Which property you need depends on whether the attacker controls the input. Verifying a download against a published digest needs second-preimage resistance — the file existed before the attacker did. A certificate authority signing a CSR needs <em>collision</em> resistance, because the attacker chose what to submit and could have prepared a colliding pair in advance.</p>

<h3>Merkle–Damgård, and the state you publish</h3>
<p>MD5, SHA-1 and the SHA-2 family are all built the same way: pad the message (length included), split it into blocks, and iterate a compression function that mixes each block into a running chaining value. The final chaining value is the digest.</p>
${F(`h₀ = IV
hᵢ = f(hᵢ₋₁, blockᵢ)
H(m) = h_last`)}
<p>The construction has a proof attached — Merkle and Damgård showed that if the compression function is collision-resistant, so is the whole hash. It also has a property the proof does not mention: <strong>the digest is the entire internal state.</strong> Anyone holding <em>H(m)</em> can load it as a chaining value and keep hashing.</p>
<p>That is the <span class="term-def">length-extension attack</span>. Given <em>H(m)</em> and the length of <em>m</em> — not <em>m</em> itself — an attacker can compute <em>H(m ‖ padding ‖ m')</em> for any suffix <em>m'</em> they choose. It breaks the intuitive homemade MAC immediately:</p>
${F(`tag = H(secret ‖ message)          BROKEN

the attacker who has (message, tag) can produce a valid
tag for  message ‖ padding ‖ anything  without the secret`)}
<p>Flickr's API signed requests this way and was broken in 2009 by exactly this. So did several others. The fix is not to swap the order — <em>H(message ‖ secret)</em> avoids extension but makes a hash collision into a MAC forgery — but to use a construction built for the job (k7).</p>
<p>Not every hash has the problem. SHA-3 is a sponge: it keeps a capacity portion of the state that is never output, so the digest is not the state. BLAKE2 and BLAKE3 use finalisation flags. SHA-512/256 truncates a wider state, so the unpublished half protects it. And HMAC's nesting defeats extension regardless of the underlying hash.</p>

<h3>What is broken, and what that means</h3>
<ul>
<li><span class="term-def">MD5</span> — collisions since 2004, now found in seconds on a laptop. Worse, <em>chosen-prefix</em> collisions are practical: the attacker picks two meaningful prefixes and computes suffixes that make the digests match. The Flame malware (2012) used one to forge a Microsoft code-signing certificate and distribute itself through Windows Update.</li>
<li><span class="term-def">SHA-1</span> — theoretically broken in 2005, demonstrated in 2017 by SHAttered with two colliding PDFs at about 2⁶³ work, and given a practical chosen-prefix collision in 2020. Deprecated for signatures everywhere.</li>
<li><span class="term-def">SHA-2</span> (SHA-256, SHA-512) — no practical break. Length-extendable, which is a property to design around, not a weakness in the hash.</li>
<li><span class="term-def">SHA-3</span> (Keccak) — different construction on purpose, so a structural break of SHA-2 would not take it with it.</li>
<li><span class="term-def">BLAKE2 / BLAKE3</span> — modern, fast, not standardised by NIST but widely reviewed and deployed.</li>
</ul>
<p>Read the breaks precisely: MD5 and SHA-1 collision resistance is gone; their <em>preimage</em> resistance is not. That is why a leaked MD5 password database is still attacked by guessing candidate passwords and hashing them, not by inverting the digest — and why "MD5 is broken" does not by itself explain why MD5 is a bad password hash. The reason for that is speed (k11).</p>

<h3>What hashes are for, and what they are not</h3>
<p>Legitimate uses lean on determinism and on the difficulty of finding a second input:</p>
<ul>
<li><span class="term-def">Integrity checks</span> against a digest delivered over a trusted channel.</li>
<li><span class="term-def">Content addressing and deduplication</span> — git, object stores, package lockfiles.</li>
<li><span class="term-def">Merkle trees</span> — hash the leaves, hash pairs upward, and a single root commits to the whole set while a logarithmic path proves any member. Certificate Transparency, backup systems, distributed ledgers.</li>
<li><span class="term-def">Commitments</span> — publish <em>H(value ‖ random)</em> now, reveal later; binding because collisions are hard, hiding because of the randomness. Omit the randomness and a small value space is simply enumerated.</li>
</ul>
<p>And three things a bare hash is not:</p>
<ul>
<li>Not a <span class="term-def">MAC</span>. It is unkeyed — anyone who can change the message can recompute the digest (k7).</li>
<li>Not a <span class="term-def">password hash</span>. Speed is the design goal of a hash and the opposite of what password storage needs (k11).</li>
<li>Not <span class="term-def">encryption</span>. It is one-way and lossy; there is nothing to decrypt. "The password is hashed so it is encrypted" is two errors in one sentence.</li>
</ul>
${W(`A hash of a low-entropy value is not hidden. Digests of every possible national identity number, phone number, email address or six-digit code are computable in bulk, so publishing "anonymised" hashed identifiers deanonymises them completely. Hiding a low-entropy input requires a secret key or a slow, salted KDF — not a hash.`)}`,
 facts:[
 "Preimage and second-preimage resistance cost 2ⁿ; collision resistance costs only 2^(n/2), so SHA-256 gives 128-bit collision resistance.",
 "Which property you need depends on who chose the input: verifying a download needs second-preimage resistance, signing an attacker-supplied CSR needs collision resistance.",
 "In Merkle–Damgård hashes the digest is the whole internal state, so H(m) and len(m) let anyone compute H(m ‖ pad ‖ m') — the length-extension attack.",
 "H(secret ‖ message) is therefore a broken MAC. SHA-3, BLAKE2/3, SHA-512/256 and HMAC are all immune.",
 "MD5 and SHA-1 have lost collision resistance — chosen-prefix collisions are practical, and Flame forged a Microsoft signing certificate with one — but not preimage resistance.",
 "A hash is not a MAC, not a password hash, and not encryption.",
 "Hashing a low-entropy value hides nothing: the whole input space can be enumerated and matched."
 ]},

{id:"k7", t:"MACs and authenticated encryption", calc:null,
 blurb:"Encryption without authentication is the default failure mode of hand-rolled cryptography. This is the module that fixes it, and the one where composition order decides whether the fix works.",
 body:`
<h3>What a MAC is</h3>
<p>A <span class="term-def">message authentication code</span> is a keyed tag: <em>t = MAC(k, m)</em>. The verifier recomputes it and compares. The security requirement is <span class="term-def">existential unforgeability under chosen-message attack</span> — even after seeing tags for as many messages as they like, an adversary without the key cannot produce a valid tag for any new message.</p>
<p>Two comparisons place it:</p>
<ul>
<li>Not a <span class="term-def">hash</span>. A hash is unkeyed, so anyone who alters the message can recompute the digest. The key is the entire point.</li>
<li>Not a <span class="term-def">signature</span>. A MAC is symmetric — the verifier holds the same key and can therefore produce tags too. So a MAC gives integrity and authenticity between two parties who already trust each other, and gives no <span class="term-def">non-repudiation</span>: neither party can prove to a third which of them made a tag. If you need that, you need k10.</li>
</ul>

<h3>HMAC, and why it is nested</h3>
<p>Given k6's length-extension result, <em>H(k ‖ m)</em> is out. HMAC's answer is to hash twice:</p>
${F(`HMAC(k, m) = H( (k ⊕ opad) ‖ H( (k ⊕ ipad) ‖ m ) )

ipad = 0x36 repeated, opad = 0x5C repeated`)}
<p>The outer hash consumes the inner digest as a short, fixed-length input, so an attacker who holds the tag holds an output of the outer hash and cannot extend the inner one. HMAC also comes with a security proof from assumptions weaker than collision resistance, which has a striking practical consequence: <strong>HMAC-SHA1 is not broken even though SHA-1 collisions are practical.</strong> It should still be migrated, but not urgently, and knowing why is the difference between reasoned and cargo-cult deprecation.</p>
<p>The other family is the polynomial MACs — <span class="term-def">Poly1305</span> and <span class="term-def">GMAC</span>, which evaluate the message as coefficients of a polynomial over a finite field. They are much faster, and they carry a hard condition: the per-message key must never repeat. Reuse does not degrade a polynomial MAC, it solves for the key.</p>

<h3>Verification must be constant-time</h3>
<p>Comparing tags with a byte-by-byte loop that returns on the first mismatch leaks, through timing, how many leading bytes were right. The attacker then forges one byte at a time:</p>
${F(`naive memcmp   →  256 × 16 ≈ 4 096 attempts for a 16-byte tag
constant-time  →  2¹²⁸ attempts`)}
<p>The fix is one line — accumulate the differences and compare once at the end — and is the same discipline as k12:</p>
${F(`diff = 0
for i in 0..n-1:  diff |= a[i] ^ b[i]
return diff == 0`)}

<h3>Composing encryption with a MAC</h3>
<p>Given a cipher and a MAC, there are three orders, and they are not equivalent. This is the classic result of Bellare and Namprempre.</p>
<ul>
<li><span class="term-def">Encrypt-and-MAC</span> — tag the plaintext, send ciphertext and tag separately. Used by SSH. The tag is a deterministic function of the plaintext, so identical plaintexts produce identical tags and the construction leaks plaintext equality regardless of how good the cipher is.</li>
<li><span class="term-def">MAC-then-Encrypt</span> — tag the plaintext, then encrypt message and tag together. Used by TLS's CBC cipher suites through 1.2. The receiver <em>must decrypt before it can verify</em>, so every decryption of attacker-supplied data happens before authentication — which is exactly the precondition for k5. Lucky Thirteen and POODLE are both consequences of this order.</li>
<li><span class="term-def">Encrypt-then-MAC</span> — encrypt, then tag the IV and the ciphertext. Generically secure: any IND-CPA cipher plus any unforgeable MAC gives an IND-CCA scheme. A forged ciphertext fails the tag check and is discarded before the cipher ever touches it.</li>
</ul>
<p>If you are assembling these by hand, encrypt-then-MAC is the only defensible choice, and the tag must cover the IV as well as the ciphertext — an unauthenticated IV lets an attacker rewrite the first plaintext block of a CBC message.</p>

<h3>Do not assemble them by hand</h3>
<p><span class="term-def">AEAD</span> — authenticated encryption with associated data — packages the whole thing behind one call, one key, and no order to get wrong. Encryption takes (key, nonce, plaintext, associated data) and returns ciphertext and tag; decryption returns the plaintext or an error, and never a partially trusted result.</p>
${F(`AES-GCM                 CTR mode + GMAC; very fast with AES-NI
ChaCha20-Poly1305       fast and constant-time without hardware
AES-GCM-SIV             nonce-misuse resistant
XChaCha20-Poly1305      192-bit nonce; random nonces are safe`)}
<p>The <span class="term-def">associated data</span> is authenticated but not encrypted, and it is more useful than it first looks. It is where you bind the ciphertext to its context: the record sequence number, the protocol version, the message type, the recipient identifier, the row's primary key. Without that binding, a ciphertext that is valid in one context stays valid when replayed into another — an encrypted database cell moved to a different row decrypts perfectly, because nothing in it says which row it belonged to.</p>

<h3>The nonce condition, and how badly it fails</h3>
<p>GCM's requirement is the same as CTR's — a (key, nonce) pair must never repeat — and the penalty is worse.</p>
<ul>
<li>Two messages under the same key and nonce share a keystream, so their XOR is the XOR of the plaintexts. That is k3's two-time pad.</li>
<li>Worse, GMAC is a polynomial MAC evaluated at a secret point derived from the key. Two messages under one nonce give the attacker two equations in that unknown; solving them recovers the <span class="term-def">authentication subkey</span>. From then on the attacker can forge valid tags for arbitrary messages under that key — not just read, but write.</li>
</ul>
${W(`Nonce reuse in GCM is a total loss of both confidentiality and authenticity for that key, and the forgery capability persists for every future message under it. This is the "forbidden attack", and it has been found live on internet-facing TLS servers whose implementations generated nonces randomly with too few bits, or reset a counter on reconnect.`)}
<p>Practical guidance follows from k2: a 96-bit random GCM nonce is safe to roughly 2³² messages per key, so a counter is preferable wherever state survives restarts. Where it does not — many independent senders, stateless workers — use XChaCha20-Poly1305, whose 192-bit nonce makes random generation genuinely safe, or AES-GCM-SIV, which is built so that a repeat leaks only that the two messages were identical.</p>`,
 facts:[
 "A MAC is a keyed tag with existential unforgeability. It is not a hash (unkeyed) and not a signature (symmetric, so no non-repudiation).",
 "HMAC's nesting defeats length extension and rests on weaker assumptions than collision resistance — which is why HMAC-SHA1 is not broken despite SHA-1 collisions being practical.",
 "Tag comparison must be constant-time: an early-return memcmp turns 2¹²⁸ forgery attempts into about 4,096.",
 "Of the three compositions only encrypt-then-MAC is generically secure, and its tag must cover the IV as well as the ciphertext.",
 "MAC-then-encrypt forces decryption before verification, which is the precondition for every padding oracle — Lucky Thirteen and POODLE both follow from it.",
 "Associated data binds a ciphertext to its context. Without it, a valid ciphertext replayed into another context stays valid.",
 "GCM nonce reuse recovers the authentication subkey, so the attacker gains forgery for every future message under that key, not just the two plaintexts."
 ]}

]},

{ name:"Level 3 · Public-key cryptography", mods:[

{id:"k8", t:"Diffie–Hellman key agreement", calc:null,
 blurb:"Two parties who have never met agree on a shared secret over a wire the adversary is reading. It works, it is the foundation of every modern session, and on its own it is completely defeated by an adversary who can also write.",
 body:`
<h3>The problem it solves</h3>
<p>Everything up to here needed a shared key already in place. Diffie and Hellman's 1976 paper asked whether two parties with no prior contact could establish one over a channel an eavesdropper reads in full. The answer was yes, and it is the moment public-key cryptography starts.</p>

<h3>The exchange</h3>
<p>Fix a cyclic group with a generator <em>g</em> — publicly known, hardcoded in the protocol, shared by everyone.</p>
${F(`Alice                                          Bob
picks secret a                                 picks secret b
                    ── g^a ──▶
                    ◀── g^b ──
computes (g^b)^a                               computes (g^a)^b

both hold  g^(ab)`)}
<p>It works because exponentiation commutes: <em>(g^b)^a = g^(ab) = (g^a)^b</em>. The eavesdropper has <em>g</em>, <em>g^a</em> and <em>g^b</em>, and to get <em>g^(ab)</em> must solve something believed hard.</p>
<p>Two assumptions, and the distinction matters:</p>
<ul>
<li>The <span class="term-def">discrete logarithm problem</span>: recover <em>a</em> from <em>g^a</em>. Hard in a well-chosen group.</li>
<li>The <span class="term-def">computational Diffie–Hellman</span> assumption: compute <em>g^(ab)</em> from <em>g^a</em> and <em>g^b</em> without either exponent. This is what the exchange actually needs; it is implied by discrete log being hard but not known to be equivalent.</li>
</ul>
<p>A third — <span class="term-def">decisional</span> Diffie–Hellman, that <em>g^(ab)</em> is indistinguishable from a random group element — is what would be needed to use the shared value directly as a key. It does not hold in every group where CDH does, and the raw value is not uniform bytes in any case. So the shared secret is <strong>never used as a key directly</strong>: it goes through a KDF, HKDF in practice, along with a transcript or context string (k11).</p>

<h3>Choosing the group</h3>
<p><span class="term-def">Finite-field DH</span> works in the integers modulo a large prime. It needs to be large: index calculus attacks make finite-field discrete log far easier than generic square-root methods, so 2048 bits gives roughly 112-bit security and 3072 bits about 128. Small subgroup confinement is a real hazard, so use a safe prime and validate received values.</p>
<p><span class="term-def">Logjam</span> (2015) showed how this fails in practice. TLS still supported 512-bit "export" groups; a downgrade forced them, and they were breakable in real time. The deeper finding was structural: index calculus splits into an expensive precomputation that depends only on the prime, and a cheap per-log step. Because almost everyone used the same handful of standard primes, one precomputation against a common 1024-bit group — plausible for a well-funded adversary — would break every session using it.</p>
<p><span class="term-def">Elliptic-curve DH</span> uses a curve group instead, where no index calculus method is known, so only generic square-root attacks apply and the group order can be about twice the security level. A 256-bit curve gives ~128-bit security against a 3072-bit prime for the same. <span class="term-def">X25519</span> is the default choice: fast, no parameter negotiation, designed so that the validation mistakes below are hard to make.</p>

<h3>What it does not give you</h3>
<p>Diffie–Hellman authenticates nothing. Against a passive eavesdropper it is excellent; against an active attacker who can modify traffic it fails completely and silently.</p>
${F(`Alice            Mallory              Bob
  ── g^a ──▶   intercepts
               ── g^m ──▶
                        ◀── g^b ──
  ◀── g^m ──

Alice holds g^(am)      Bob holds g^(bm)
Mallory holds both. Neither side sees anything wrong.`)}
<p>Both sides complete the handshake, both derive a key, both encrypt happily, and Mallory decrypts and re-encrypts in the middle. Nothing in the mathematics detects it, because there was never anything in the exchange tying <em>g^a</em> to Alice.</p>
<p>So every deployed protocol binds the exchange to an identity, and this is the actual job of the rest of a handshake:</p>
<ul>
<li>a <span class="term-def">signature over the transcript</span> with a certified long-term key — TLS 1.3;</li>
<li>a <span class="term-def">pre-shared key</span> mixed into the derivation, so an attacker without it derives a different key;</li>
<li>a <span class="term-def">fingerprint</span> two humans compare out of band — the safety number in a messenger;</li>
<li><span class="term-def">trust on first use</span>, which accepts the risk once and detects any later substitution.</li>
</ul>

<h3>Ephemeral keys and forward secrecy</h3>
<p>Generate <em>a</em> and <em>b</em> fresh for each session and delete them when it ends — the "E" in DHE and ECDHE — and you get <span class="term-def">forward secrecy</span>: an adversary who records all the traffic today and later compromises the server's long-term private key still cannot decrypt those sessions, because the key that encrypted them was derived from exponents that no longer exist anywhere.</p>
<p>Static RSA key transport had no such property. The client encrypted a premaster secret to the server's long-term public key, so that one key decrypted every recorded session, retroactively, forever. TLS 1.3 removed it for exactly this reason and made ephemeral key agreement mandatory. Forward secrecy is also the direct answer to "harvest now, decrypt later" — with one gap, which is that it assumes the underlying group stays hard, and k13 is about the case where it does not.</p>
${W(`Validate everything you receive. Sending a peer a point of small order, or a point that is not on the intended curve at all, can make their shared secret take one of very few values and leak their private key over a few handshakes — the small-subgroup and invalid-curve attacks. Check that a received value is in the correct group, or use X25519, whose design makes the check unnecessary. And never reuse an "ephemeral" exponent across sessions: several TLS stacks did, which converts every one of these attacks from a one-session nuisance into long-term key recovery.`)}
<p>The animation runs a small-modulus exchange with the man in the middle switchable, so you can watch both sides succeed and disagree at the same time.</p>`,
 facts:[
 "Diffie–Hellman gives two parties a shared secret over a channel an eavesdropper reads in full, because (g^b)^a = (g^a)^b.",
 "The exchange rests on the computational Diffie–Hellman assumption, which is implied by hard discrete log but not known to be equivalent to it.",
 "The raw shared secret is never used as a key — it is not uniform, and DDH may not hold. Run it through a KDF with a context string.",
 "Finite-field DH is weakened by index calculus, so it needs 3072 bits for 128-bit security; a 256-bit elliptic curve gives the same, which is why X25519 is the default.",
 "Logjam's real lesson was shared parameters: precomputation depends only on the prime, so one effort breaks every session using that common group.",
 "Unauthenticated DH is perfectly secure against a passive attacker and totally broken against an active one. Both sides complete a MITM handshake without any anomaly.",
 "Ephemeral exponents give forward secrecy: recorded traffic stays safe when the long-term key is later compromised. TLS 1.3 removed static RSA key transport for this reason."
 ]},

{id:"k9", t:"RSA", calc:"rsa",
 blurb:"The first practical public-key scheme, still holding up the certificate ecosystem, and the one with the most ways to hold it wrong. Textbook RSA is broken in four independent ways before you have sent a message.",
 body:`
<h3>Key generation and the operations</h3>
${F(`pick large primes p, q          n = p·q
φ(n) = (p−1)(q−1)              choose e coprime to φ(n)
d = e⁻¹ mod φ(n)

public key  (n, e)             private key  (n, d), plus p and q
encrypt     c = m^e mod n      decrypt      m = c^d mod n
sign        s = m^d mod n      verify       m = s^e mod n`)}
<p>The exponents undo each other because <em>ed ≡ 1 (mod φ(n))</em>, so <em>m^(ed) ≡ m (mod n)</em> by Euler's theorem. <em>e</em> is almost always 65537 — prime, and with only two set bits it makes verification cheap. Implementations use the Chinese Remainder Theorem to decrypt modulo <em>p</em> and <em>q</em> separately, roughly four times faster, which matters again in k12.</p>
<p>Security rests on factoring <em>n</em>: with <em>p</em> and <em>q</em> you have <em>φ(n)</em> and therefore <em>d</em>. Strictly, breaking RSA means computing <em>e</em>-th roots modulo <em>n</em>, which is not <em>known</em> to be as hard as factoring, though no better approach is known either.</p>

<h3>Textbook RSA is broken, four times over</h3>
<p>Take the equations above and use them literally, and every one of the following applies:</p>
<ul>
<li><span class="term-def">It is deterministic.</span> The same message always gives the same ciphertext, so it cannot be IND-CPA secure (k1). Anyone can encrypt candidate plaintexts under the public key and compare. For a small message space — a vote, a bid, a yes/no, a card's last four digits, a session identifier — that is the entire break with no cryptanalysis at all.</li>
<li><span class="term-def">It is malleable.</span> Multiply a ciphertext by <em>r^e</em> and the plaintext is multiplied by <em>r</em>: <em>(m·r)^e = m^e · r^e</em>. An attacker can transform ciphertexts blindly, and can use it against signing — get the victim to sign a blinded value and unblind the result into a signature they were never given.</li>
<li><span class="term-def">Small exponent, small message.</span> With <em>e = 3</em>, if <em>m³ &lt; n</em> then reduction mod <em>n</em> never happens and the "ciphertext" is just an integer cube. Take the integer cube root and read the plaintext. Håstad's attack generalises this to the same message sent to <em>e</em> different recipients.</li>
<li><span class="term-def">Structure survives.</span> <em>0</em> and <em>1</em> encrypt to themselves, and multiplicative relationships between plaintexts are visible in the ciphertexts.</li>
</ul>
<p>Padding is not a formatting detail here; it is the part that makes the scheme a scheme. <span class="term-def">OAEP</span> for encryption and <span class="term-def">PSS</span> for signatures both mix in randomness and a hash-based structure, giving a scheme with a security proof rather than a bare modular exponentiation.</p>

<h3>Bleichenbacher, and nineteen years of the same bug</h3>
<p>The older <span class="term-def">PKCS#1 v1.5</span> encryption padding has fixed structure: a leading <code>00 02</code>, random non-zero bytes, a zero separator, then the message. If a server reveals whether a decryption produced valid padding, that is an oracle — the CCA setting again, and the padding oracle of k5 in a public-key costume.</p>
<p>Bleichenbacher's 1998 attack uses RSA's malleability to turn that single bit into full recovery. Multiply the target ciphertext by <em>s^e</em> for chosen <em>s</em>; a "valid padding" answer says the plaintext times <em>s</em> lies in a narrow interval, which halves the range of possible plaintexts. Repeat, and the interval closes on the message. A few hundred thousand queries then recover it, or forge a signature — hence the "million message attack".</p>
<p>Nineteen years later, <span class="term-def">ROBOT</span> (2017) found it still exploitable in TLS implementations from several major vendors. The countermeasures had been so delicate — return an indistinguishable random premaster secret and continue as if nothing happened — that implementations kept leaking a distinguisher somewhere else: a timing difference, an alert type, a connection reset. The durable lesson is that a construction requiring perfectly indistinguishable error handling to be safe will eventually be implemented by someone who misses a path.</p>

<h3>Signatures are not encryption backwards</h3>
<p>"A signature is encryption with the private key" is a common gloss and it is wrong. It happens to describe the raw exponentiation in RSA, and it describes nothing about PSS, nothing about ECDSA or Ed25519, and it leads directly to bad designs — reusing one key pair for both jobs, so that a decryption oracle becomes a signing oracle.</p>
<p>What a signature actually is: hash the message, encode the hash with a padding scheme, apply the private operation. The hash is not an optimisation for long messages — it is what binds the signature to the full content and, with PSS's randomisation, what the proof relies on. Use separate key pairs for signing and encryption.</p>

<h3>When the primes are not random</h3>
<p>Two large failures came from key generation rather than from the algorithm, and both are k2 arriving in public-key form:</p>
<ul>
<li><span class="term-def">Mining Your Ps and Qs</span> (2012) — internet-wide collection of TLS and SSH keys, then a pairwise GCD over the moduli. Where two devices had generated keys with a starved entropy pool, they shared a prime, and the GCD factored both instantly. Hundreds of thousands of hosts, broken by arithmetic on public data.</li>
<li><span class="term-def">ROCA</span> (2017) — a widely deployed Infineon library generated primes of a special form to speed up key generation. The structure allowed factoring of 1024- and 2048-bit keys at feasible cost, affecting smartcards, TPMs, and national identity cards. The keys were the right length and utterly weak.</li>
</ul>

<h3>Sizes, and where RSA still fits</h3>
${F(`RSA-1024     deprecated; within reach
RSA-2048     ≈ 112-bit security — the common floor
RSA-3072     ≈ 128-bit security
RSA-4096     slower, modest gain over 3072

factoring records: RSA-768 (232 digits) in 2009
                   RSA-250 (829 bits)  in 2020`)}
<p>Note the asymmetry in cost: verification with <em>e = 65537</em> is very cheap and signing is expensive, the opposite balance to ECDSA. That is why RSA persists where one signature is verified by millions of clients. For anything new, elliptic curves give the same security in a fraction of the size with fewer ways to go wrong — and k13's Shor breaks both equally, so neither is a long-term answer.</p>
${W(`Never implement RSA yourself. Not the padding, not the CRT recombination, not the primality testing. Every one of the failures above is in an implementation detail rather than in the mathematics, and the mathematics is the easy part.`)}
<p>The calculator runs the whole thing on small primes so the arithmetic is visible, including the determinism that makes textbook RSA unusable.</p>`,
 facts:[
 "RSA: n = pq, d = e⁻¹ mod φ(n), encrypt m^e mod n, decrypt c^d mod n. Security rests on factoring n; e is almost always 65537.",
 "Textbook RSA is deterministic, so it is not IND-CPA secure — a small message space is broken by encrypting the candidates and comparing.",
 "It is also malleable: (m·r)^e = m^e·r^e, which enables blinding attacks on signing as well as ciphertext manipulation.",
 "OAEP for encryption and PSS for signatures are what make RSA a scheme rather than a bare exponentiation.",
 "Bleichenbacher's attack turns one bit of PKCS#1 v1.5 padding feedback into full plaintext recovery, and ROBOT found it still live in major TLS stacks nineteen years later.",
 "A signature is not encryption with the private key. Hash, encode, then apply the private operation — and use separate keys for signing and encryption.",
 "Shared primes from starved entropy pools and ROCA's structured primes both broke correctly-sized keys through generation, not through the algorithm.",
 "RSA-2048 gives about 112-bit security and RSA-3072 about 128. Verification is cheap and signing expensive, the reverse of ECDSA."
 ]},

{id:"k10", t:"Elliptic curves and signatures", calc:null,
 blurb:"Smaller keys for the same security, and a signature scheme whose most famous failure is a single line of arithmetic that recovers the private key from two signatures.",
 body:`
<h3>The group</h3>
<p>Take the points satisfying <em>y² = x³ + ax + b</em> over a finite field, plus a point at infinity as the identity, and define addition geometrically: the line through two points meets the curve at a third, and the sum is its reflection. The result is an abelian group. Repeated addition gives <span class="term-def">scalar multiplication</span>, <em>kP</em>, computable in about log <em>k</em> steps by double-and-add.</p>
<p>The one-way function is scalar multiplication, and the hard problem is <span class="term-def">ECDLP</span>: given <em>P</em> and <em>kP</em>, recover <em>k</em>. It is the same shape as the discrete log of k8, in a different group.</p>
<p>Why the group matters so much: no index-calculus attack is known for elliptic curves, so the best method is generic — Pollard rho, at about √n. The group order can therefore be roughly twice the security level, where a finite field needs twelve times it.</p>
${F(`128-bit security needs:
    a 256-bit elliptic curve group
    a 3072-bit finite field / RSA modulus`)}
<p>Smaller keys, smaller signatures, faster operations, and less to transmit in a handshake — which is why every new protocol uses curves and why k13's kilobyte-sized post-quantum keys are felt as a regression.</p>

<h3>Which curve</h3>
<ul>
<li><span class="term-def">NIST P-256</span> (secp256r1) — the most widely deployed and the most widely required by compliance regimes. Its constants have no published derivation, which has attracted suspicion, and its formulas have exceptional cases that make constant-time implementation fiddly.</li>
<li><span class="term-def">Curve25519 / X25519</span> — Bernstein, 2005, designed so that the implementation is hard to get wrong: every 32-byte string is a valid public key, the scalar is clamped to avoid small-subgroup problems, the Montgomery ladder is naturally constant-time, and the curve is twist-secure so point validation is unnecessary.</li>
<li><span class="term-def">Ed25519</span> — the signature scheme on the same curve in Edwards form, with complete addition formulas: one code path, no exceptional cases.</li>
<li><span class="term-def">secp256k1</span> — Bitcoin's curve, chosen for a specific efficiency property, otherwise unremarkable.</li>
</ul>

<h3>ECDSA, and the nonce that must not repeat</h3>
${F(`sign with per-signature secret k:
    R = kG          r = x-coordinate of R  (mod n)
    s = k⁻¹ (H(m) + r·d)  mod n
    signature = (r, s),  private key d`)}
<p>The <em>k</em> here is a nonce, and the rule from k2 applies with an unusually direct penalty. Sign two different messages with the same <em>k</em>, and the same <em>r</em> appears in both — which is how an attacker spots it in the first place, by scanning published signatures for a repeated <em>r</em>. Then:</p>
${F(`s₁ − s₂ = k⁻¹ (H(m₁) − H(m₂))

     k = (H(m₁) − H(m₂)) / (s₁ − s₂)   mod n
     d = (s₁·k − H(m₁)) / r            mod n`)}
<p>That is the whole attack. Two subtractions, two divisions, and the private key. It is not cryptanalysis and it is not expensive — it is microseconds of modular arithmetic on public data.</p>
<ul>
<li><span class="term-def">Sony PlayStation 3</span> (2010) — the firmware signing implementation used a <em>constant</em> for <em>k</em>. The master signing key was extracted and arbitrary code could be signed as Sony.</li>
<li><span class="term-def">Android Bitcoin wallets</span> (2013) — a flawed SecureRandom produced repeated nonces; attackers scanned the public blockchain for duplicate <em>r</em> values and emptied the corresponding wallets.</li>
<li>And it recurs, because every implementation that must generate a fresh secret per signature has the same failure mode available to it.</li>
</ul>
<p>Worse, the nonce does not have to repeat. If it is merely <em>biased</em> — a few bits predictable, or one bit short — each signature is a noisy linear equation in the private key, and lattice reduction solves the resulting hidden number problem from a few hundred signatures. Minerva and TPM-FAIL (2019) both recovered keys this way from timing leaks that revealed only the nonce's bit length.</p>
<p>The fix is to remove the randomness. <span class="term-def">RFC 6979</span> derives <em>k</em> deterministically as an HMAC of the private key and the message hash — reproducible, unpredictable to anyone without the key, and immune to a bad RNG. Ed25519 does the same by construction.</p>

<h3>Ed25519</h3>
<p>EdDSA was designed with the above list in front of it. The nonce is a hash of a secret half of the key and the message, so it is deterministic and cannot repeat across different messages. The addition formulas are complete, so there is no special case to branch on. There is no secret-dependent branching or table indexing anywhere in a reference implementation. Keys are 32 bytes and signatures 64.</p>
<p>Determinism has one cost worth knowing: it makes the scheme vulnerable to fault injection, since two signatures over the same message should be identical and a glitched one reveals information (k12). Hedged variants mix in randomness to address this.</p>

<h3>What a signature is for, and what it covers</h3>
<p>A signature gives what a MAC cannot: <span class="term-def">public verifiability</span> — anyone with the public key can check it — and <span class="term-def">non-repudiation</span>, since only the private key holder could have produced it.</p>
<p>And it covers exactly the bytes that were hashed, nothing more. That is a recurring source of bugs:</p>
<ul>
<li>Sign the <em>canonical serialisation</em>, not a parsed structure, or two parsers will disagree about what was signed.</li>
<li>Include a <span class="term-def">domain separator</span>, so a signature over a payment authorisation cannot be replayed as a login challenge.</li>
<li>Bind the context — recipient, expiry, chain identifier, protocol version — into the signed bytes. Anything outside them is unprotected.</li>
</ul>
${W(`ECDSA signatures are malleable: if (r, s) is valid then so is (r, −s mod n), for the same message and the same key. Any system that identifies an object by the hash of its signature — Bitcoin transaction IDs before SegWit, most visibly — can have that identifier changed by a third party who cannot forge anything. The fix is to normalise to the low-s form and reject the other, which is now standard.`)}`,
 facts:[
 "The hard problem is ECDLP — recover k from kP. With no index calculus available, the best attack is generic at √n, so a 256-bit curve gives about 128-bit security.",
 "Matching 128-bit security needs a 256-bit curve or a 3072-bit RSA modulus, which is why new protocols use curves.",
 "Curve25519 and Ed25519 were designed so implementations are hard to get wrong: clamped scalars, twist security, complete formulas, no secret-dependent branches.",
 "ECDSA nonce reuse recovers the private key by arithmetic: k = (H(m₁) − H(m₂))/(s₁ − s₂), then d = (s₁k − H(m₁))/r.",
 "A repeated nonce is visible from the outside, because it produces a repeated r — which is how Bitcoin wallets were emptied in 2013.",
 "A biased nonce is enough: lattice attacks on the hidden number problem recover the key from a few hundred signatures with a few leaked bits.",
 "RFC 6979 derives the nonce deterministically from the key and message hash, removing the RNG from the failure path. Ed25519 does this by construction.",
 "A signature covers exactly the bytes hashed. Sign a canonical serialisation with a domain separator and the context bound in.",
 "ECDSA is malleable — (r, −s) is also valid — so systems that identify objects by signature hash must normalise to low-s."
 ]}

]},

{ name:"Level 4 · Making it hold in practice", mods:[

{id:"k11", t:"Passwords, KDFs and key hierarchies", calc:"pw",
 blurb:"A password has perhaps thirty bits of entropy and a key needs a hundred and twenty-eight. Everything in this module is about making that gap survivable, and about two jobs called \"KDF\" that have opposite requirements.",
 body:`
<h3>The gap</h3>
<p>Human-chosen passwords cluster hard. Large breach corpora put the median somewhere around 20 to 30 bits of entropy, and the top thousand passwords cover a large fraction of any real user base. Against that, a modern GPU computes billions of fast hashes per second. Nothing in this module closes the gap; the whole discipline is about making crossing it expensive enough that it is not worth doing.</p>
<p>Two rules come before any algorithm. <strong>Do not store passwords.</strong> And <strong>do not encrypt them</strong> — encryption is reversible, so the key must exist somewhere, and it is almost always somewhere the attacker who reached the database can also reach. Store a verifier: a value that lets you check a password without recovering it.</p>

<h3>Why a plain hash is not the verifier</h3>
<p>SHA-256 is designed to be fast, and that is precisely the wrong property. Two separate failures follow:</p>
<ul>
<li><span class="term-def">Speed.</span> A commodity GPU evaluates SHA-256 at the order of billions per second. A thirty-bit password space is exhausted in under a second; a wordlist with common mutations covers most real passwords in minutes.</li>
<li><span class="term-def">Determinism.</span> Unsalted, identical passwords produce identical digests. That is directly visible in a leaked table — the most repeated hash is the most common password — and it makes the whole table a single precomputation target. Rainbow tables are a time–memory trade-off against exactly this.</li>
</ul>

<h3>Salt, work factor, memory hardness</h3>
<p><span class="term-def">Salt</span>: a unique random value per record, stored in the clear alongside the hash. It is not secret and it does not slow anything down. What it does is make every record its own problem — no precomputation is reusable, and cracking a million records costs a million times cracking one. It also hides the fact that two users chose the same password. Sixteen bytes from a CSPRNG, per record, never reused.</p>
<p><span class="term-def">Work factor</span>: the deliberate slowness. A password hash is a hash run with a tunable cost so that one verification takes a time you are willing to pay — a few hundred milliseconds on your server — and the attacker pays it for every one of their billions of guesses. The parameter is raised as hardware improves, which is why the cost is stored with the hash.</p>
<p><span class="term-def">Memory hardness</span>: the defence against the attacker's actual hardware. GPUs and ASICs win by having thousands of parallel cores, but each core has very little fast memory. A function that requires, say, 64 MB of working memory per evaluation cannot be run in thousands of parallel instances on such a device, so the attacker's advantage collapses from a factor of thousands to something much smaller.</p>
${F(`Argon2id    time, memory and parallelism parameters
            winner of the Password Hashing Competition, 2015
            the default choice for new systems

scrypt      memory-hard, older, well analysed

bcrypt      cost factor, moderately memory-hard by accident
            of its 4 KB S-box working set; still acceptable

PBKDF2      iteration count only — no memory hardness, so the
            weakest of the four against GPUs, but often the
            only option a compliance regime permits`)}
<p>Two implementation notes that bite. bcrypt truncates input at 72 bytes and mishandles embedded NUL bytes, so pre-hashing long passwords is common — and the pre-hash must be base64-encoded, or a binary digest containing a zero byte truncates the password to whatever preceded it. And every one of these must be verified with a constant-time comparison, like any other tag (k7).</p>

<h3>Pepper</h3>
<p>A <span class="term-def">pepper</span> is a secret value mixed into the hash and stored outside the database — in the application configuration, or better in an HSM or KMS that performs the operation without releasing the key. Against a database-only compromise, which is the common shape of a breach, it makes the stolen hashes uncrackable.</p>
<p>It is defence in depth and not a substitute for anything: it does not help when the attacker gets code execution on the application server, and it complicates rotation, since changing it invalidates every stored verifier unless the design anticipated that.</p>

<h3>Two jobs called KDF</h3>
<p>This confusion causes real bugs, and the two are not interchangeable in either direction.</p>
${F(`password-based KDF          input: low entropy (a password)
Argon2id, scrypt,           goal:  be SLOW and memory-hard
bcrypt, PBKDF2              output: one key

key-derivation function     input: high entropy (a DH shared
HKDF                               secret, a master key)
                            goal:  be FAST, extract and expand
                            output: many context-separated keys`)}
<p>Running HKDF over a password gives no protection at all — it is fast by design, so the attacker's guessing rate is unchanged. Running Argon2 to expand an already-random master key into subkeys wastes hundreds of milliseconds per derivation for no security benefit at all.</p>
<p>HKDF's structure is worth knowing because it is what the shared secret of k8 goes through. <span class="term-def">Extract</span> takes a non-uniform input — a curve point's x-coordinate is not uniform bytes — and concentrates it into a uniform pseudorandom key. <span class="term-def">Expand</span> stretches that into as much keying material as needed, each piece labelled with an <em>info</em> string.</p>
<p>That info string is <span class="term-def">domain separation</span>, and it is the mechanism behind key hierarchies: one master secret derives a distinct key per purpose and per direction, so client-to-server traffic, server-to-client traffic, and any token signing key are cryptographically unrelated. Reusing one key for two purposes is how a decryption oracle in one protocol becomes a signing oracle in another, and how an attacker reflects a message back at its sender.</p>
${W(`The login endpoint is a side channel too. If a missing user returns in one millisecond and a wrong password in three hundred, the endpoint enumerates accounts regardless of how good the hash is. Run the KDF against a dummy verifier on the missing-user path so both branches cost the same, and return the same message either way.`)}
<p>The calculator turns a password policy into bits and then into a cracking time, with and without a work factor, which is usually more persuasive than an argument about it.</p>`,
 facts:[
 "Do not store passwords and do not encrypt them — encryption is reversible and the key is reachable from wherever the database was.",
 "A plain hash fails twice: it is fast, so a GPU tries billions of guesses per second, and it is unsalted, so precomputation and cross-user correlation both work.",
 "A salt is unique per record, stored in the clear, and adds no cost — it makes every record a separate problem and defeats rainbow tables.",
 "The work factor is the deliberate slowness, stored alongside the hash so it can be raised as hardware improves.",
 "Memory hardness is what defeats GPUs and ASICs specifically: thousands of cores, very little memory each. Argon2id is the default; PBKDF2 has no memory hardness.",
 "bcrypt truncates at 72 bytes and mishandles NUL, so any pre-hash must be base64-encoded before it is passed in.",
 "Password KDFs must be slow (Argon2, scrypt, bcrypt, PBKDF2); key-derivation KDFs on high-entropy input must be fast (HKDF). Swapping them either wastes time or provides no protection.",
 "HKDF's info string is domain separation: one master secret becomes a distinct key per purpose and direction, so no key ever serves two roles.",
 "A login endpoint that answers faster for a missing user is an account enumeration oracle no matter how strong the hash is."
 ]},

{id:"k12", t:"Side channels and constant time", calc:null,
 blurb:"Every proof so far assumed the adversary sees inputs and outputs. Real hardware also emits time, cache state, power and electromagnetic radiation, and none of it is in the model.",
 body:`
<h3>The gap between the algorithm and the machine</h3>
<p>A security proof reasons about a function: inputs in, outputs out, and an adversary who sees only those. A running implementation is a physical process, and it emits far more than its output — how long it took, which cache lines it touched, how much current it drew, what it radiated, and which error path it followed.</p>
<p>None of that is in the model, so none of it is covered by the proof. AES is not broken; an AES implementation that indexes a lookup table with a secret byte can leak the key anyway. This is the most reliable way to break correctly-chosen cryptography, and it is why "we use a standard algorithm" is not the end of the analysis.</p>

<h3>The rule</h3>
${F(`No branch and no memory address may depend on secret data.`)}
<p>That is the entire discipline of <span class="term-def">constant-time</span> programming, and every technique below is an instance of it. "Constant time" is a slight misnomer: the requirement is not that the code always takes the same number of nanoseconds, but that its execution time and memory access pattern are independent of the secret. Time is simply the channel through which a violation is most easily read.</p>

<h3>Timing</h3>
<p>The canonical case is tag comparison, from k7. A loop that returns on the first differing byte takes a time proportional to the matching prefix, so the attacker submits forgeries, watches the clock, keeps whichever first byte took longest, and moves on. A 16-byte tag falls in about 4,096 attempts instead of 2¹²⁸.</p>
${F(`WRONG                          RIGHT
for i in 0..n-1:               diff = 0
  if a[i] != b[i]:             for i in 0..n-1:
    return false                 diff |= a[i] ^ b[i]
return true                    return diff == 0`)}
<p>The right-hand version touches every byte, branches on nothing secret, and is what every library's <code>constant_time_compare</code> does. Use theirs.</p>
<p>The same shape appears everywhere a secret decides control flow: an early return when a decryption fails, a check that short-circuits on the first invalid field, a database lookup that is skipped when a user does not exist. Lucky Thirteen (k5) is this attack with a few microseconds of signal, exploited across a network.</p>

<h3>Cache</h3>
<p>Memory access patterns leak even when the timing of the code itself is uniform, because the cache is shared. An attacker running on the same machine — another tenant on the same host, another process, JavaScript in another tab — can evict cache lines and measure which ones were refilled, learning which table indices the victim touched.</p>
<p>The classic victim is table-driven AES. Software implementations use S-box lookups indexed by <em>plaintext ⊕ key</em> bytes; the index is secret, and the cache line it lands in is observable. Practical key recovery was demonstrated from a co-resident process, then across virtual machines. The responses are to use hardware instructions (AES-NI, which performs a round in fixed time with no table), or a bitsliced implementation that computes the S-box arithmetically with no memory indexing at all.</p>
<p>The general form: <strong>never index memory with a secret.</strong> Not a table, not an array of precomputed points, not a branch target.</p>

<h3>Branches on secret bits</h3>
<p>Modular exponentiation by square-and-multiply examines each exponent bit and multiplies only when the bit is set. The exponent is the private key. A per-bit timing or power difference reads it directly.</p>
<p>The countermeasures are structural: a Montgomery ladder performs the same operations for either bit value, or the implementation always multiplies and discards the unwanted result. <span class="term-def">Blinding</span> attacks the correlation instead — randomise the base or the exponent for each operation (RSA blinds with <em>r^e</em> before decrypting and removes <em>r</em> afterwards), so that whatever leaks is not correlated with the key across measurements.</p>

<h3>Power, radiation, sound, and faults</h3>
<ul>
<li><span class="term-def">Differential power analysis</span> (Kocher, 1998) — statistically correlate a device's current draw across many operations with a hypothesis about a key byte. It broke a generation of smartcards and is why secure elements are designed with masking and randomised execution.</li>
<li><span class="term-def">Electromagnetic</span> — the same signal captured by a nearby probe, without touching the device.</li>
<li><span class="term-def">Acoustic</span> — Genkin, Shamir and Tromer extracted RSA keys in 2014 from the high-frequency sound of a laptop's voltage regulator, using a phone in the same room.</li>
<li><span class="term-def">Fault injection</span> — glitch the clock or voltage during an operation and use the wrong answer. A single faulty RSA-CRT signature factors the modulus outright (Boneh–DeMillo–Lipton, 1997), which is why implementations verify a signature before releasing it.</li>
<li><span class="term-def">Microarchitectural</span> — Spectre and Meltdown (2018) made speculative execution itself a channel, reading memory across boundaries the architecture said were safe. Hertzbleed (2022) turned CPU frequency scaling into a timing channel that leaked through code which was constant-time as written.</li>
</ul>

<h3>What this means for how you write code</h3>
<ul>
<li>Use vetted primitive implementations. libsodium, BoringSSL, ring, and the platform's own libraries have had this analysis done; your version has not.</li>
<li>Compare secrets only with a constant-time comparison, and make error paths take the same work as success paths.</li>
<li>Assume co-residency. Cloud tenancy, browser tabs, and sandboxed extensions all put an attacker's code on your hardware.</li>
<li>Remember that the compiler is not on your side: it can turn a branchless expression back into a branch, and a memory scrub into nothing at all. This is why constant-time code lives in assembly or in carefully-tested library routines.</li>
</ul>
${W(`"We benchmarked it and the timing looked flat" is not evidence of constant time. Constant time is a property of control flow and memory access, established by reading the code — or with a tool such as dudect or ctgrind — not by averaging measurements that your own noise is hiding. And a flat measurement on your machine says nothing about the attacker's, who may share your cache.`)}
<p>The animation is the tag comparison, with the early-return and constant-time versions side by side and the leak visible as a bar.</p>`,
 facts:[
 "A security proof covers inputs and outputs. Timing, cache state, power, EM, sound and error paths are outside the model and are where correct algorithms fail.",
 "The rule is one line: no branch and no memory address may depend on secret data.",
 "An early-return tag comparison reduces forgery from 2¹²⁸ attempts to about 4,096; the fix accumulates differences with OR and compares once.",
 "Table-driven AES indexes an S-box with a secret byte, so a co-resident attacker reads the index through cache timing. AES-NI or a bitsliced implementation removes the lookup.",
 "Square-and-multiply branches on exponent bits, which is the private key. Use a Montgomery ladder, or blind the operation so the leak is uncorrelated across measurements.",
 "A single faulty RSA-CRT signature factors the modulus, which is why implementations verify before releasing a signature.",
 "Compilers can reintroduce branches and remove memory scrubs, so constant-time code lives in vetted libraries and assembly rather than in your source.",
 "Flat benchmarks are not evidence of constant time — it is a property of control flow and memory access, established by reading the code."
 ]},

{id:"k13", t:"Post-quantum cryptography", calc:"pq",
 blurb:"One quantum algorithm halves symmetric security and another destroys public-key cryptography entirely. The asymmetry is the whole story, and it decides what has to migrate and how urgently.",
 body:`
<h3>Two algorithms, two very different consequences</h3>
<p><span class="term-def">Shor's algorithm</span> (1994) factors integers and computes discrete logarithms in polynomial time on a sufficiently large quantum computer. Applied to what is deployed now, that is not a weakening:</p>
${F(`RSA                       broken
finite-field Diffie–Hellman  broken
DSA                       broken
ECDH, ECDSA, Ed25519      broken`)}
<p>Every public-key primitive in current use rests on factoring or discrete log, and Shor solves both. Larger keys do not help — the cost grows polynomially, so doubling the modulus is a rounding error to a quantum attacker.</p>
<p><span class="term-def">Grover's algorithm</span> (1996) searches an unstructured space of size <em>N</em> in about √<em>N</em> steps. Nominally that halves a symmetric security level: AES-128's 2¹²⁸ becomes 2⁶⁴ queries. But Grover is inherently sequential — it parallelises only as the square root of the number of machines, so a thousand quantum computers give a speedup of about thirty-two, not a thousand — and each of those 2⁶⁴ steps is a coherent quantum evaluation of AES, not a cheap classical one. The consensus reflected in NIST's guidance is that AES-128 remains acceptable and AES-256 provides a comfortable margin. Hash collision resistance is essentially unaffected, since the best quantum collision search offers no useful advantage over classical birthday search once memory costs are counted.</p>
<p>So the summary is short: <strong>symmetric cryptography survives, possibly with larger parameters. Public-key cryptography does not survive at all.</strong></p>

<h3>Harvest now, decrypt later</h3>
<p>A cryptographically relevant quantum computer does not exist today, and the timeline is genuinely uncertain. That does not make the problem future work, because of an adversary behaviour that costs nothing now: record the encrypted traffic today, store it, and decrypt it when the machine arrives.</p>
<p>The urgency of any given system therefore follows from k1's third threat-model question — how long must this stay secret?</p>
<ul>
<li><span class="term-def">Confidentiality with a long horizon</span> — medical records, legal files, state secrets, source code, anything whose disclosure in fifteen years still hurts — is urgent <em>now</em>, because the ciphertext being recorded is the one that will be broken.</li>
<li><span class="term-def">Signatures</span> are less urgent in one specific sense: a forgery produced in 2040 does not retroactively forge a 2026 signature, and by then the key can have been rotated. But the infrastructure that verifies them — firmware signing keys burned into silicon, root certificates in devices with ten-year lifetimes — has a lead time measured in the same decades, so migration cannot wait for the machine either.</li>
<li><span class="term-def">Ephemeral session keys with forward secrecy</span> are still recorded, and the key agreement that produced them is what Shor breaks. Forward secrecy protects against a compromised long-term key, not against the group itself becoming easy.</li>
</ul>

<h3>The standards</h3>
<p>NIST ran an open competition from 2016 and published the first standards in August 2024:</p>
${F(`FIPS 203  ML-KEM    key encapsulation, from CRYSTALS-Kyber
                    lattice-based; the general-purpose choice

FIPS 204  ML-DSA    signatures, from CRYSTALS-Dilithium
                    lattice-based; the general-purpose choice

FIPS 205  SLH-DSA   signatures, from SPHINCS+
                    hash-based, conservative, large and slow`)}
<p>SLH-DSA earns its place by resting only on the security of a hash function — the assumption in this entire subject with the longest track record — so it is the fallback if lattice assumptions turn out to be weaker than believed. Its signatures are kilobytes, so it is used where signing is rare and confidence must be highest, such as firmware and root keys. FN-DSA, from Falcon, followed for cases needing smaller signatures.</p>

<h3>KEM, not key exchange</h3>
<p>The interface changed, and code has to change with it. Diffie–Hellman is symmetric: both sides contribute a secret exponent and combine. ML-KEM is a <span class="term-def">key encapsulation mechanism</span>, which is one-directional:</p>
${F(`encapsulate(their public key)  →  (ciphertext, shared secret)
decapsulate(ciphertext, my private key)  →  shared secret`)}
<p>There is no post-quantum analogue of "both parties raise the other's value to their own exponent". Protocols built around the DH shape — including several non-interactive key agreement designs — need restructuring rather than a primitive swap.</p>

<h3>Hybrids</h3>
<p>Deployed post-quantum key agreement is almost always <span class="term-def">hybrid</span>: run X25519 and ML-KEM, concatenate both shared secrets, and derive the session key from the pair. The result is secure if <em>either</em> component holds.</p>
<p>This is not excessive caution. Lattice assumptions are young by cryptographic standards, and the competition itself supplied the cautionary example: <span class="term-def">SIKE</span>, an isogeny-based finalist, was broken in 2022 by a classical attack running in about an hour on one core, after years of public analysis. Hybrid means such a result is a bad afternoon rather than a catastrophe. TLS deploys this as X25519MLKEM768; Signal's PQXDH does the same for its key agreement.</p>

<h3>What the migration actually costs</h3>
<ul>
<li><span class="term-def">Size.</span> ML-KEM-768 public keys and ciphertexts are around a kilobyte, against 32 bytes for X25519. ML-DSA signatures are a few kilobytes against 64. Handshakes grow past the TCP initial congestion window, and certificate chains — which carry several signatures and public keys — are where it hurts most.</li>
<li><span class="term-def">Speed.</span> The lattice operations themselves are fast, often faster than the elliptic-curve ones they replace. Bandwidth, not computation, is the constraint.</li>
<li><span class="term-def">Inventory.</span> The hardest part is not swapping an algorithm but finding every place a public key is used — pinned certificates, signed firmware, hardware roots of trust, protocols with fixed-size fields, embedded devices that cannot be updated. Systems with hardcoded key sizes cannot accept a kilobyte key at all.</li>
</ul>
${W(`Do not deploy a bare post-quantum algorithm for confidentiality, and do not write your own lattice implementation. Use a hybrid, from a maintained library, and note that these implementations have their own side-channel history — several early Kyber implementations leaked through timing in the decapsulation failure path, which is k12 arriving in a new primitive with no accumulated folklore about how to hold it.`)}`,
 facts:[
 "Shor breaks RSA, finite-field DH, DSA, ECDH and ECDSA outright. Larger keys do not help, because the cost grows polynomially.",
 "Grover nominally halves symmetric security, but parallelises only as a square root, so AES-128 remains acceptable and AES-256 is a comfortable margin.",
 "Symmetric cryptography and hashes survive; public-key cryptography does not. That asymmetry decides the whole migration.",
 "Harvest now, decrypt later makes long-horizon confidentiality urgent today: the ciphertext being recorded now is the one that gets decrypted later.",
 "Forward secrecy does not help against Shor — it protects against a compromised long-term key, not against the group becoming easy.",
 "NIST standardised ML-KEM (FIPS 203), ML-DSA (FIPS 204) and the hash-based SLH-DSA (FIPS 205) in August 2024.",
 "ML-KEM is a KEM, not a key exchange: encapsulate to a public key, decapsulate with the private one. Protocols shaped around DH need restructuring.",
 "Hybrids combine X25519 with ML-KEM so the result holds if either does. SIKE's classical break in 2022, after years of analysis, is the argument for that.",
 "The cost is size, not speed: kilobyte keys and signatures push handshakes past the initial congestion window and strain certificate chains."
 ]},

{id:"k14", t:"Protocols, keys, and what is left over", calc:null,
 blurb:"Correct primitives, composed carelessly, produce broken systems. This is where the subject's separate failures reappear as one list, in the place they actually occur.",
 body:`
<h3>The gap between a primitive and a system</h3>
<p>Every module so far ended at the same place: the primitive was fine and the deployment was not. A protocol is where the pieces meet, and it must answer questions no primitive addresses — who the peer is, which message this is, whether it has been seen before, what happens when negotiation fails, and where the keys came from.</p>

<h3>TLS 1.3 as a worked example</h3>
<p>TLS 1.3 (RFC 8446, 2018) is worth studying because it was designed by removing everything that had gone wrong in the previous twenty years, and each removal maps onto a module here.</p>
${F(`removed: static RSA key transport   → forward secrecy always (k8)
removed: CBC and RC4 suites         → AEAD only (k4, k7)
removed: MAC-then-encrypt           → no padding oracles (k5, k7)
removed: renegotiation, compression → whole attack classes gone
added:   signature over the whole transcript (k8, k10)
added:   1-RTT handshake, encrypted from the server's
         first flight onward`)}
<p>The shape of the handshake is exactly k8 with the missing piece filled in. The client sends a key share; the server replies with its own, and signs the <em>entire transcript so far</em> with the private key belonging to its certificate. That signature is what defeats the man in the middle: an attacker who substitutes their own key share changes the transcript, and cannot produce a signature over the changed version without the server's key.</p>
<p>Every derived secret comes from HKDF over that transcript, with a distinct label per key and per direction — k11's domain separation, applied so that no key ever serves two purposes.</p>
<p>The one deliberate weakness is worth knowing because it is a design trade rather than a mistake: <span class="term-def">0-RTT</span> early data lets a client send application data in its first flight using a key derived from a previous session. There is nothing in that flight to make it fresh, so it is replayable, and TLS 1.3 says so explicitly — 0-RTT is for idempotent requests only.</p>

<h3>Downgrade and negotiation</h3>
<p>A protocol that negotiates an algorithm has, by construction, given the attacker a choice to influence. Historically that has been the reliable way in:</p>
<ul>
<li><span class="term-def">FREAK</span> and <span class="term-def">Logjam</span> (2015) — forcing the export-grade RSA and DH parameters that were still supported, then breaking them in real time.</li>
<li><span class="term-def">POODLE</span> (2014) — forcing a downgrade to SSL 3.0, whose padding was not covered by the MAC (k5).</li>
<li><span class="term-def">DROWN</span> (2016) — a server still speaking SSLv2 <em>anywhere</em> with the same key was enough to attack its TLS sessions.</li>
</ul>
<p>Two rules follow. Authenticate the negotiation itself — TLS 1.3's transcript signature covers everything each side offered, so a tampered list is detected. And <strong>remove</strong> the weak option rather than deprioritising it: an algorithm that is still supported is still reachable, and DROWN shows that "we only enable it on the old port" is not a mitigation.</p>

<h3>Replay, freshness and binding</h3>
<p>Authentication proves who produced a message. It does not prove <em>when</em>, or that you have not already acted on it. A valid signed request captured and sent again is still valid, and the attacker forged nothing.</p>
<p>Freshness has to be constructed, and the mechanisms are few:</p>
<ul>
<li>a <span class="term-def">nonce or challenge</span> from the verifier, echoed in the response;</li>
<li>a <span class="term-def">sequence number</span> covered by the MAC, with the receiver refusing anything not strictly ahead;</li>
<li>a <span class="term-def">timestamp</span> with a bounded window — cheap, and only as good as the clock synchronisation, which puts an upper bound on how tight the window can be;</li>
<li>a <span class="term-def">one-time token</span> the verifier records and refuses on second sight.</li>
</ul>
<p>And <span class="term-def">binding</span>: a message must say where it belongs. Bind the recipient, the purpose, the protocol version, the session, and any identifier the receiver will use it against. This is the associated data of k7 and the domain separator of k10, and its absence produces reflection attacks, cross-protocol attacks, and the encrypted database cell that decrypts perfectly in the wrong row.</p>

<h3>Key management is the part that fails</h3>
<p>Everything in this subject assumed a key existed, was secret, and belonged to the right party. In practice:</p>
<ul>
<li>Keys end up committed to repositories, baked into container images, printed in logs, and copied into support tickets. Secret scanning exists because this is the common case, not the rare one.</li>
<li>A key stored beside the data it protects, decryptable by the same process that reads the data, protects against physical theft of a disk and against nothing else.</li>
<li>Rotation must be designed in from the start — a key identifier travelling with every ciphertext, and a decryption path that accepts the previous key — or it never happens.</li>
<li>The recovery flow is part of the threat model. An encrypted account with a support-desk reset is protected by the support desk's procedure, not by the cipher.</li>
</ul>

<h3>The list, in one place</h3>
<p>Set against the modules that produced them:</p>
${F(`rolling your own primitive or protocol         k1
a key or nonce from a non-cryptographic RNG   k2
a reused keystream, IV or signature nonce     k3, k7, k10
ECB, or any unauthenticated mode              k4
decrypting before authenticating              k5, k7
a bare hash used as a MAC or password store   k6, k11
a distinguishable error path                  k5, k9, k12
unauthenticated key agreement                 k8
textbook RSA, or PKCS#1 v1.5 encryption       k9
a non-constant-time comparison                k7, k12
one key serving two purposes                  k11
no replay protection, no context binding      k14
no plan for the recorded-traffic adversary    k13`)}
${W(`The recurring shape of every item is that the code works. It encrypts, it decrypts, it verifies, the tests pass, and the failure appears only against an adversary who is actively looking — which is why cryptographic bugs survive review and reach production far more reliably than ordinary ones. Reading a cryptographic design means asking what the attacker is allowed to do, not whether the happy path is correct.`)}`,
 facts:[
 "A protocol answers what primitives do not: who the peer is, whether the message is fresh, what context it belongs to, and where the keys came from.",
 "TLS 1.3 is a list of removals — static RSA, CBC, RC4, MAC-then-encrypt, renegotiation, compression — each corresponding to a break in this subject.",
 "The transcript signature is what defeats a man in the middle: a substituted key share changes the transcript, and the attacker cannot sign the changed version.",
 "0-RTT early data is replayable by design, because nothing in the first flight makes it fresh. It is for idempotent requests only.",
 "Negotiation is an attack surface: FREAK, Logjam, POODLE and DROWN were all downgrades. Authenticate the negotiation and remove weak options rather than deprioritising them.",
 "Authentication says who, not when. Freshness needs a challenge, a sequence number, a bounded timestamp window, or a recorded one-time token.",
 "Bind every message to its context — recipient, purpose, version, session — or a valid message stays valid somewhere it should not be.",
 "Key management is where systems actually fail: keys in repositories, keys beside the data they protect, rotation that was never designed in, and a recovery flow outside the threat model."
 ]}

]}

];
