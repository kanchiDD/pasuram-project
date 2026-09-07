// =============================================================
// uiStrings.js  →  js/utils/uiStrings.js
//
// Single dictionary for INTERFACE text only — buttons, labels,
// navigation, status and error messages.
//
// NOT for content: pasuram/thaniyan text, section, pathu, azhwar
// and divyadesam names, prosody names and closing lines stay in
// Tamil, because they are the works themselves.
//
// Usage:
//   import { t } from "../utils/uiStrings.js";
//   t("playAll")                  → "Play All"
//   t("filterBy", { label: "State" }) → "Filter by State"
//
// Adding a UI language later = add a locale block below and set
// window._uiLang; no changes needed in any render file.
// =============================================================

const STRINGS = {
  en: {
    // ── generic ───────────────────────────────────────────────
    loading:          "Loading...",
    back:             "◀ Back",
    backToList:       "◀ Back to List",
    backTo:           "◀ Back to {name}",
    previous:         "◀ Previous",
    next:             "Next ▶",
    pageOf:           "Page {cur} of {total}",
    playAll:          "▶ Play All",
    home:             "Home",
    top:              "Top",
    bottom:           "Bottom",
    up:               "Up",
    down:             "Down",
    contentLoading:   "Content Loading...",
    fontBigger:       "Font +",
    fontSmaller:      "Font −",

    // ── divyadesam: menu ──────────────────────────────────────
    ddSubtitle:       "Divya Desam Pasurams",
    ddByDesam:        "By Divyadesam",
    ddByAzhwar:       "By Azhwar",
    ddByMandalam:     "By Mandalam",
    ddByState:        "By State",
    ddByDistrict:     "By District",
    ddSpecialGroups:  "Special Groups",
    ddSelectAzhwar:   "Select an Azhwar",
    ddRegionFilter:   "Region filter",
    ddStateFilter:    "State filter",
    ddDistrictFilter: "District filter",
    ddSpecialSub:     "Thirunangur · Nava Thiruppathi · Irattai",
    ddDesamCount:     "{n} Desams",
    ddAllCount:       "All 108 · {n} Pasurams",

    // ── divyadesam: filters ───────────────────────────────────
    mandalam:         "Mandalam",
    state:            "State",
    district:         "District",
    filterBy:         "Filter by {label}",
    selectA:          "— Select a {label} —",
    desamsFor:        "{value} — {n} Desam{s}",

    // ── divyadesam: special groups ────────────────────────────
    ddSpecialHeading:     "Special Divya Desam Groups",
    ddBackToSpecial:      "◀ Back to Special Groups",
    ddSpecialThirunangur: "Thirunangur Divya Desams (11)",
    ddSpecialNava:        "Nava Thiruppathi Divya Desams (9)",
    ddSpecialIrattai:     "Irattai Thiruppathi (2 Twin-Temple Desams)",
    ddSubThirunangur:     "11 Desams",
    ddSubNava:            "9 Thiruppathis",
    ddSubIrattai:         "2 Irattai Thiruppathis",
    ddGroupCount:         "{label} ({n})",

    // ── empty / error states ──────────────────────────────────
    noDivyadesams:    "No Divyadesams found",
    noDesams:         "No Desams found",
    noPasurams:       "No pasurams found",
    unknownGroup:     "Unknown group",
  }
};

// Interface language. Content script is a SEPARATE setting — a reader
// using Telugu script still gets the English interface by default.
function currentLang() {
  return (typeof window !== "undefined" && window._uiLang) || "en";
}

export function t(key, vars) {
  const lang  = currentLang();
  const table = STRINGS[lang] || STRINGS.en;
  let s = table[key];
  if (s == null) s = STRINGS.en[key];
  if (s == null) return key;               // visible, never blank
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.split("{" + k + "}").join(String(vars[k]));
    }
  }
  return s;
}

export function availableUiLanguages() {
  return Object.keys(STRINGS);
}