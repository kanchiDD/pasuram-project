// =============================================================
// displayTags.js  →  js/utils/displayTags.js
//
// Display rows from entity_master carry a meta_key tag
// (adivaravu / thalam_pun / song_reference / carnatic …).
// Renderers historically identified adivaravu by searching the
// TEXT for the Tamil word "அடிவரவு". That works only in Tamil:
// once the text is transliterated the check can never match, so
// adivaravu leaks into the places that hide it AND disappears
// from the place that prints it.
//
// The worker sends meta_key on the ?script= path. Use the tag
// when it is there and fall back to the old text test when it
// is not, so Tamil behaviour is unchanged either way.
// =============================================================

export function isAdivaravu(d) {
  if (!d) return false;
  if (d.meta_key) return d.meta_key === "adivaravu";
  return typeof d.text === "string" && d.text.includes("அடிவரவு");
}