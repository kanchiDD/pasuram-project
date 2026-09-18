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
// hold, so every Tamil character has a seat.
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
};

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
const VALID = ["te", "kn", "ml", "deva", "iast"];

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
  if (script === "iast") return toIast(src);

  const off = OFFSET[script];
  if (off === undefined) return src;

  let out = "";
  for (const ch of src) {
    const cp = ch.codePointAt(0);
    out += (cp >= TA_START && cp <= TA_END) ? String.fromCodePoint(cp + off) : ch;
  }
  return out;
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