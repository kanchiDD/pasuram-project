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
    backPlain:        "Back",
    backToList:       "◀ Back to List",
    backTo:           "◀ Back to {name}",
    previous:         "◀ Previous",
    next:             "Next ▶",
    pageOf:           "Page {cur} of {total}",
    playAll:          "▶ Play All",
    playAllPlain:     "Play All",
    playPlain:        "Play",
    playFull:         "Play full",
    stop:             "Stop",
    pausePlain:       "Pause",
    resume:           "Resume",
    nowPlaying:       "Playing…",
    tapToResume:      "— ▶ Resume",
    showMyTree:       "Show My Naalayiram Tree",
    mute:             "Mute",
    index:            "Index",
    pageUp:           "Page up",
    pageDown:         "Page down",

    // ── munnadi pinnadi ───────────────────────────────────────
    munnadiTitle:     "Munnadi Pinnadi",
    munnadiRotate:    "Please rotate to landscape to view Munnadi Pinnadi",
    home:             "Home",
    top:              "Top",
    bottom:           "Bottom",
    up:               "Up",
    down:             "Down",
    contentLoading:   "Content Loading...",
    begin:            "Begin",
    start:            "Start",
    play:             "▶ Play",
    pause:            "⏸ Pause",
    goTo:             "🔢 Go To",

    // ── archanai ──────────────────────────────────────────────
    archLoading:      "Loading Archanai...",
    archTitle:        "108 Divyadesa Archanai",
    archSubtitle:     "108 Divyadesams — Namavalli",
    archNoData:       "Archanai data not available.",
    archGoToPrompt:   "Desam number (1-108):",

    // ── other view titles ─────────────────────────────────────
    azhwarThirunatchathraTitle: "Azhwar Thirunatchathra Recital",
    adiyenContentLoading: "Adiyen Content Loading...",
    contentsLoading:      "Contents Loading...",

    // ── star pasuram ──────────────────────────────────────────
    starSelectPrompt:  "— Select the Star —",
    starSubtitle:      "Star-wise Pasuram Recital",
    starPleaseSelect:  "🌟 Please Select the Star",

    // ── sattrumurai ───────────────────────────────────────────
    preparingSattrumurai: "Preparing Sattrumurai...",
    addMySattrumurai:     "Add my Sattrumurai",
    globalPasuramNo:      "Global Pasuram No (1-4000)",
    add:                  "Add",
    reorderSattrumurai:   "Re-order my sattrumurai ⇅",
    sattrumuraiOrderNote: "The sattrumurai will follow this order 🙏",
    resetOrder:           "Reset order",
    continueLabel:        "Continue 🙏",
    sattrumuraiAdded:     "Sattrumurai added 🙏",
    errorPrefix:          "Error: ",
    pleaseTryAgain:       "Please try again",
    // {name} keeps the Tamil work name inline — the sentence is interface
    // text, the name is content and must not be translated.
    churnikaiConfirm:     "Adiyen, {name} is usually recited only on Thirumangai Azhwar Varusha Thirunatchathram. Do you still wish to add it?",
    ahobilaConfirm:       "Adiyen 🙏 These Arulicheyals are recited by Sri Ahobilamadam followers, and selecting them will change the sattrumurai order. Do you wish to continue?",

    // ── ghoshti setup ─────────────────────────────────────────
    backArrow:        "← Back",
    selectPasurams:   "Select Pasurams",
    recitalOrder:     "Recital order",
    yourSelection:    "Your Selection",
    nothingSelected:  "Nothing selected yet",
    egPasuramNo:      "e.g. 474",
    selectPrabandham: "Select Prabandham",
    adiyen:           "🙏 Adiyen",
    cancel:           "Cancel",
    orSelectSpecific: "— OR select specific —",
    dualRecitalTitle:           "Rettai / Dual Recital Pasurams",
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