// =============================================================
// translitLive.js  →  js/utils/translitLive.js
//
// Live Tamil → chosen-script transliteration for text that has no
// row in text_script: what the microphone just heard, what someone
// typed into a search box. Everything that DOES have a row keeps
// using the converted DB text — this is only for free text.
//
// Why this can be a lookup table rather than a library:
// the Indic Unicode blocks are laid out in parallel, position for
// position, so Tamil → Telugu / Kannada / Malayalam / Devanagari is
// a fixed codepoint offset. Tamil is a subset of what those blocks
// hold, so almost every Tamil character has a seat. The few that do
// not — and Gujarati and Bengali, where many do not — are listed in
// EXC below.
//
//   Tamil க U+0B95 → Telugu క U+0C15 → Kannada ಕ U+0C95
//                  → Malayalam ക U+0D15 → Devanagari क U+0915
//
// IAST is not an Indic block, so it gets a real syllable assembler
// below.
//
// The limitation, stated plainly: Tamil writes one letter where the
// other scripts write four (க covers ka/kha/ga/gha), so the output
// is the unvoiced, unaspirated reading — ka, not ga. That is exactly
// what aksharamukha produces for the pasuram text in text_script, so
// the echo matches the verses on screen rather than disagreeing with
// them. It is a readable approximation, not a scholarly romanisation.
// =============================================================

const TA_START = 0x0b80, TA_END = 0x0bff;

// Offset from the Tamil block to each target block.
const OFFSET = {
  deva: -0x280,   // U+0900
  te:   +0x080,   // U+0C00
  kn:   +0x100,   // U+0C80
  ml:   +0x180,   // U+0D00
  gu:   -0x100,   // U+0A80
  bn:   -0x200,   // U+0980
};

// ── Gujarati and Bengali: where the parallel breaks ─────────
// Tamil is NOT a subset of these two blocks. Shifted by the offset,
// these letters land on codepoints Unicode never assigned and render
// as empty boxes. Each entry is what aksharamukha writes for that
// letter, checked letter by letter against its output, so the live
// echo matches the converted verses in text_script.
//
//   short e / o   neither script has them; written long, as aksharamukha does
//   ன ற ழ (ள)     the nearest letter plus the nukta dot
//   Bengali வ     Bengali writes va as ব
//   Bengali ௐ     Bengali has no om sign; spelt ওঁ
//
// The same check over Telugu, Kannada and Malayalam finds a handful
// more: Telugu and Kannada have no seat for ன (Kannada none for ழ
// either), and none of the three has an om sign. Devanagari has a
// seat for everything.
const EXC = {
  te: {
    "\u0ba9": "\u0c28",                       // ன -> న
    "\u0bd0": "\u0c13\u0c02",                 // ௐ -> ఓం
    "\u0bd7": "\u0c4c",                       // a stray ௗ -> ౌ
  },
  kn: {
    "\u0ba9": "\u0ca8\u0cbc",                 // ன -> ನ಼
    "\u0bb4": "\u0cde",                       // ழ -> ೞ
    "\u0bd0": "\u0c93\u0c82",                 // ௐ -> ಓಂ
    "\u0bd7": "\u0ccc",                       // a stray ௗ -> ೌ
  },
  ml: {
    "\u0bd0": "\u0d13\u0d02",                 // ௐ -> ഓം
  },
  gu: {
    "\u0b8e": "\u0a8f", "\u0b92": "\u0a93",   // எ ஒ -> એ ઓ
    "\u0bc6": "\u0ac7", "\u0bca": "\u0acb",   // ெ ொ -> ે ો
    "\u0ba9": "\u0aa8\u0abc",                 // ன -> ન઼
    "\u0bb1": "\u0ab0\u0abc",                 // ற -> ર઼
    "\u0bb4": "\u0ab3\u0abc",                 // ழ -> ળ઼
    "\u0bd7": "\u0acc",                       // a stray ௗ -> ૌ
  },
  bn: {
    "\u0b8e": "\u098f", "\u0b92": "\u0993",   // எ ஒ -> এ ও
    "\u0bc6": "\u09c7", "\u0bca": "\u09cb",   // ெ ொ -> ে ো
    "\u0ba9": "\u09a8\u09bc",                 // ன -> ন়
    "\u0bb1": "\u09b0\u09bc",                 // ற -> র়
    "\u0bb3": "\u09b2\u09bc",                 // ள -> ল়
    "\u0bb4": "\u09b7\u09bc",                 // ழ -> ষ়
    "\u0bb5": "\u09ac",                       // வ -> ব
    "\u0bd0": "\u0993\u0981",                 // ௐ -> ওঁ
  },
};

// Bengali also spells two letters by their surroundings, as
// aksharamukha does: ய after a vowel is য়, and த் ending a word is ৎ.
function bnContext(s) {
  return s
    .replace(/([\u0985-\u09b9\u09bc-\u09cc\u09d7\u09df])\u09af/g, "$1\u09df")
    .replace(/\u09a4\u09cd(?![\u0980-\u09ff])/g, "\u09ce");
}

// ── IAST ────────────────────────────────────────────────────
const IAST_VOWEL = {
  "அ":"a","ஆ":"ā","இ":"i","ஈ":"ī","உ":"u","ஊ":"ū",
  "எ":"e","ஏ":"ē","ஐ":"ai","ஒ":"o","ஓ":"ō","ஔ":"au",
};
// Vowel SIGNS — what follows a consonant. "" means the inherent a.
const IAST_SIGN = {
  "ா":"ā","ி":"i","ீ":"ī","ு":"u","ூ":"ū",
  "ெ":"e","ே":"ē","ை":"ai","ொ":"o","ோ":"ō","ௌ":"au",
};
const IAST_CONS = {
  "க":"k","ங":"ṅ","ச":"c","ஞ":"ñ","ட":"ṭ","ண":"ṇ",
  "த":"t","ந":"n","ப":"p","ம":"m","ய":"y","ர":"r",
  "ல":"l","வ":"v","ழ":"ḻ","ள":"ḷ","ற":"ṟ","ன":"ṉ",
  "ஜ":"j","ஶ":"ś","ஷ":"ṣ","ஸ":"s","ஹ":"h",
};
const TA_VIRAMA = "்";
const TA_AYTHAM = "ஃ";          // ஃ
const IAST_DIGIT = "௦";         // ௦ .. ௯

function toIast(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (IAST_CONS[ch]) {
      const next = src[i + 1];
      if (next === TA_VIRAMA) { out += IAST_CONS[ch]; i++; }          // bare consonant
      else if (IAST_SIGN[next] !== undefined) { out += IAST_CONS[ch] + IAST_SIGN[next]; i++; }
      else out += IAST_CONS[ch] + "a";                                 // inherent vowel
      continue;
    }
    if (IAST_VOWEL[ch]) { out += IAST_VOWEL[ch]; continue; }
    if (ch === TA_AYTHAM) { out += "ḥ"; continue; }
    const cp = ch.codePointAt(0);
    if (cp >= 0x0BE6 && cp <= 0x0BEF) { out += String(cp - 0x0BE6); continue; }  // Tamil digits
    if (ch === TA_VIRAMA) continue;      // a stray virama adds nothing
    out += ch;                           // spaces, Latin, punctuation pass through
  }
  return out;
}

// ── Public ──────────────────────────────────────────────────
const VALID = ["te", "kn", "ml", "deva", "iast", "gu", "bn"];

// The script the reader has chosen, or "" for Tamil. Same key every
// other screen reads, so the voice UI follows the banner.
export function activeScript() {
  try {
    const s = (localStorage.getItem("script") || "ta").toLowerCase();
    return VALID.includes(s) ? s : "";
  } catch (e) { return ""; }
}

// Returns text unchanged when there is no script, when the script is
// Tamil, or when the input holds no Tamil at all (an English query
// must not be mangled).
export function translitLive(text, script) {
  const src = String(text == null ? "" : text);
  if (!src || !script || script === "ta") return src;
  if (script === "iast") return toIast(src.normalize("NFC"));

  const off = OFFSET[script];
  if (off === undefined) return src;

  // The o- and au-signs are looked up as single characters, so the
  // text is composed first. (Decomposed, ௌ arrived as two signs and
  // came out as two in every script.)
  const exc = EXC[script];
  const s = src.normalize("NFC");

  let out = "";
  for (const ch of s) {
    if (exc && exc[ch]) { out += exc[ch]; continue; }
    const cp = ch.codePointAt(0);
    // ௰ … ௺ are Tamil number and calendar signs. No other script has
    // them at the shifted position, and aksharamukha leaves them as
    // they are, so they are left as they are here too.
    const sign = cp >= 0x0BF0 && cp <= 0x0BFA;
    out += (cp >= TA_START && cp <= TA_END && !sign) ? String.fromCodePoint(cp + off) : ch;
  }
  return script === "bn" ? bnContext(out) : out;
}

// True when the string contains at least one Tamil letter — used to
// decide whether showing the original alongside is worth the space.
export function hasTamil(text) {
  const s = String(text == null ? "" : text);
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp >= TA_START && cp <= TA_END) return true;
  }
  return false;
}