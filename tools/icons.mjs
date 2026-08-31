/**
 * Generates the PWA icon set from code — no image editor, no dependency.
 *
 * The mark is the busbar from the module rail: a copper bar with three
 * stubs running off it to square terminals. Colours are lifted from the
 * `:root` tokens in styles.css and must be changed together with them.
 *
 * Shapes are sampled at 4x and box-filtered down, which is all the
 * antialiasing a flat geometric mark needs. PNG is written by hand:
 * an 8-bit RGBA IHDR, one zlib-deflated IDAT with filter byte 0 on
 * every scanline, and IEND.
 *
 * Run with `just icons`. The output is committed; it only needs
 * regenerating when the mark or the palette changes.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

/* ---------- palette (mirrors :root in styles.css) ---------- */
const PANEL = [0xDD, 0xE0, 0xDC];
const INK = [0x18, 0x1B, 0x18];
const COPPER = [0xB8, 0x73, 0x33];
const COPPER_LIGHT = [0xD8, 0x9A, 0x5E];
const COPPER_DARK = [0x8A, 0x53, 0x24];

/* ---------- PNG ---------- */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** `rgba` is a Uint8Array of size*size*4. */
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- drawing ----------
   Everything is expressed in a 0..1 square. `inset` is the fraction of the
   icon the mark is allowed to occupy: 1 for full bleed, 0.8 for the round
   safe zone a maskable icon must survive. */

/** Coverage of an axis-aligned rounded rectangle at point (x, y). */
const inRect = (x, y, X, Y, W, H, r = 0) => {
  if (x < X || y < Y || x > X + W || y > Y + H) return false;
  if (r <= 0) return true;
  const cx = Math.min(Math.max(x, X + r), X + W - r);
  const cy = Math.min(Math.max(y, Y + r), Y + H - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

/**
 * Colour at (x, y) in unit space, or null for transparent.
 * `inset` shrinks the mark toward the centre; `bleed` fills the whole
 * square with panel instead of a rounded plate.
 */
function shade(x, y, { inset, bleed }) {
  // Background plate.
  if (bleed) {
    if (!inRect(x, y, 0, 0, 1, 1)) return null;
  } else if (!inRect(x, y, 0, 0, 1, 1, 0.22)) return null;

  // Map the mark into the safe area.
  const o = (1 - inset) / 2;
  const u = (x - o) / inset;
  const v = (y - o) / inset;
  if (u < 0 || u > 1 || v < 0 || v > 1) return PANEL;

  // The busbar: a vertical copper bar with a lit centre.
  const barX = 0.27, barW = 0.13;
  if (inRect(u, v, barX, 0.12, barW, 0.76, 0.02)) {
    const f = (u - barX) / barW;                       // 0..1 across the bar
    const lit = 1 - Math.abs(f - 0.42) * 2;            // brightest just left of centre
    return lit > 0.45 ? COPPER_LIGHT : lit > 0 ? COPPER : COPPER_DARK;
  }

  // Three stubs running to their terminals.
  const rows = [0.26, 0.5, 0.74];
  for (const r of rows) {
    if (inRect(u, v, barX + barW, r - 0.022, 0.16, 0.044)) return COPPER_DARK;
    if (inRect(u, v, barX + barW + 0.16, r - 0.085, 0.17, 0.17, 0.02)) return INK;
  }
  return PANEL;
}

/** Renders one icon at `size` with 4x supersampling. */
function render(size, opts) {
  const SS = 4;
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, opts);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      // Premultiplied average, un-premultiplied back out for the PNG.
      out[i] = a ? Math.round(r / (a / 255)) : 0;
      out[i + 1] = a ? Math.round(g / (a / 255)) : 0;
      out[i + 2] = a ? Math.round(b / (a / 255)) : 0;
      out[i + 3] = Math.round(a / n);
    }
  }
  return out;
}

/* ---------- output ---------- */
mkdirSync("icons", { recursive: true });

const files = [
  ["icons/icon-192.png", 192, { inset: 0.86, bleed: false }],
  ["icons/icon-512.png", 512, { inset: 0.86, bleed: false }],
  ["icons/icon-maskable-512.png", 512, { inset: 0.62, bleed: true }],
  ["icons/apple-touch-icon.png", 180, { inset: 0.78, bleed: true }],
];

for (const [path, size, opts] of files) {
  writeFileSync(path, png(size, render(size, opts)));
  console.log(`  ${path}  ${size}x${size}`);
}
