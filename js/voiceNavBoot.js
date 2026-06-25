/**
 * voiceNavBoot.js
 * Runs on tree.html startup — reads sessionStorage voiceNav,
 * executes the confirmed voice intent directly.
 *
 * Intent finality rule: radio selection = confirmed.
 * Never shows intermediate modals for confirmed intents.
 */

import { state, pushState } from "./state.js";
import { render }           from "./render/layout.js";
import {
  fetchThaniyan, fetchPasuram,
  fetchMadal, fetchKootrirukkai
} from "./api.js";
import { openStandaloneSelector } from "./render/standaloneSelector.js";

const API_VOICE = "https://cdnaalayiram-api.kanchitrust.workers.dev/voice";

// ── Boot ──────────────────────────────────────────────
const raw = sessionStorage.getItem("voiceNav");
if (raw) {
  sessionStorage.removeItem("voiceNav");
  let nav = null;
  try { nav = JSON.parse(raw); } catch(e) {}
  if (nav?.fn) {
    // Set flag IMMEDIATELY — before requestAnimationFrame
    // tree.html checks this at 50ms to skip startTree()
    window._voiceNavActive = true;
    // Clear isFullRender — layout.js blocks render() when this is true
    state.isFullRender = false;
    requestAnimationFrame(() => executeVoiceNav(nav));
  }
}

// ── Executor ──────────────────────────────────────────
function executeVoiceNav(nav) {
  pushState();
  const { fn, args } = nav;

  // Internal section navigators
  if (fn === "_selectSection") {
    const [sectionId, sectionName] = args;
    voiceSelectSection(sectionId, sectionName);
    return;
  }
  if (fn === "_selectSectionStandalone") {
    const [sectionId, sectionName, pathuNum] = args;
    voiceSelectStandalone(sectionId, sectionName, pathuNum);
    return;
  }
  if (fn === "_selectSectionWithPathu") {
    const [sectionId, sectionName, pathuNum] = args;
    voiceSelectWithPathu(sectionId, sectionName, pathuNum);
    return;
  }
  if (fn === "_selectSectionWithThirumozhi") {
    const [sectionId, sectionName, pathuNum, heading] = args;
    voiceSelectWithThirumozhi(sectionId, sectionName, pathuNum, heading);
    return;
  }
  if (fn === "_openDivyadesamById") {
    const [desamId, desamName, mode] = args;
    voiceOpenDivyadesamById(desamId, desamName, mode);
    return;
  }
  if (fn === "_openGlobalPasuram") {
    voiceOpenGlobalPasuram(args[0]);
    return;
  }
  if (fn === "_openNeeratam") {
    voiceOpenNeeratam();
    return;
  }
  if (fn === "_openPoochoottal") {
    voiceSelectWithThirumozhi(2, "பெரியாழ்வார் திருமொழி", 2, "ஆனிரை");
    return;
  }
  if (fn === "_openKappidal") {
    voiceSelectWithThirumozhi(2, "பெரியாழ்வார் திருமொழி", 2, "இந்திரனோடு");
    return;
  }
  if (fn === "_openParipaalanamTVM") {
    voiceOpenParipaalanamTVM();
    return;
  }
  if (fn === "_openParipaalanamViruttham") {
    voiceSelectSection(18, "திருவிருத்தம்");
    return;
  }
  if (fn === "_openThousandSections") {
    voiceOpenThousandSections(args[0]);
    return;
  }
  if (fn === "_openSpecialGroup") {
    voiceOpenSpecialGroup(args[0]);
    return;
  }

  // All window.* functions from options.js (openDivyadesam, openAzhwars etc.)
  setTimeout(() => {
    if (typeof window[fn] === "function") {
      window[fn](...(args || []));
    } else {
      console.warn("voiceNavBoot: fn not found →", fn);
    }
  }, 50);
}

// ═══════════════════════════════════════════════════════
// PATHU ORDINALS (mirror of voiceSearch.js)
// ═══════════════════════════════════════════════════════

const PATHU_ORDINALS = [
  { num:1,  keys:["first","1st","முதல்","முதற்","ondraam","ondram","ஒன்றாம்"] },
  { num:2,  keys:["second","2nd","irandaam","இரண்டாம்"] },
  { num:3,  keys:["third","3rd","moondraam","மூன்றாம்"] },
  { num:4,  keys:["fourth","4th","naangaam","நான்காம்"] },
  { num:5,  keys:["fifth","5th","aintham","ஐந்தாம்"] },
  { num:6,  keys:["sixth","6th","aaram","ஆறாம்"] },
  { num:7,  keys:["seventh","7th","ezhaam","ஏழாம்"] },
  { num:8,  keys:["eighth","8th","ettaam","எட்டாம்"] },
  { num:9,  keys:["ninth","9th","onbatham","ஒன்பதாம்","onbadham"] },
  { num:10, keys:["tenth","10th","pattham","பத்தாம்"] },
  { num:11, keys:["eleventh","11th","pathinondram","பதினொன்றாம்"] }
];

function norm(s) {
  return (s || "").toLowerCase().trim()
    .replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, " ")
    .replace(/்/g, "")
    .replace(/\s+/g, " ");
}

function hasValidPathu(data) {
  return data?.some(p => p.pathu_name && String(p.pathu_name).trim());
}

// ═══════════════════════════════════════════════════════
// SECTION NAVIGATORS
// ═══════════════════════════════════════════════════════

function voiceSelectSection(sectionId, sectionName) {
  state.selectedSectionId   = sectionId;
  state.selectedSectionName = sectionName;
  state.pasuramData = state.thaniyanData = state.madalData =
  state.kootrirukkaiData = state.selectedPathu = state.filteredPasuram = null;

  const id = Number(sectionId);
  state.isSpecialSection = [21,22,23,2672,2673,2674].includes(id);

  if ([21,2672].includes(id)) {
    state.level = "PASURAM";
    Promise.all([fetchThaniyan(), fetchKootrirukkai()]).then(() => render());
    return;
  }
  if ([22,23,2673,2674].includes(id)) {
    state.level = "PASURAM";
    Promise.all([fetchThaniyan(), fetchMadal()]).then(() => render());
    return;
  }

  fetchThaniyan();
  fetchPasuram().then(() => {
    if (hasValidPathu(state.pasuramData)) {
      // No specific pathu in intent — show pathu selector
      state.isPathuSelectionActive = true;
      import("./render/pathuSelector.js").then(m => m.openPathuSelector());
    } else {
      state.filteredPasuram = state.pasuramData;
      state.level = "PASURAM";
      render();
    }
  });
}

function voiceSelectStandalone(sectionId, sectionName, pathuNum) {
  state.selectedSectionId     = sectionId;
  state.selectedSectionName   = sectionName;
  state.pasuramData           = null;
  state.filteredPasuram       = null;
  state.isStandaloneSelection = true;

  fetchThaniyan();
  fetchPasuram().then(() => {
    if (pathuNum && state.pasuramData) {
      const ordinal  = PATHU_ORDINALS.find(o => o.num === pathuNum);
      const filtered = state.pasuramData.filter(p =>
        ordinal?.keys.some(k => norm(p.thirumozhi_heading || "").includes(norm(k)))
      );
      if (filtered.length) {
        state.pasuramData = state.filteredPasuram = filtered;
        state.level = "PASURAM";
        render();
        return;
      }
    }
    openStandaloneSelector(sectionId, sectionName, state.pasuramData);
  });
}

// KEY RULE: _selectSectionWithPathu NEVER calls openPathuSelector
// Intent was confirmed by radio → go directly to content
function voiceSelectWithPathu(sectionId, sectionName, pathuNum) {
  state.selectedSectionId      = sectionId;
  state.selectedSectionName    = sectionName;
  state.pasuramData            = null;
  state.filteredPasuram        = null;
  state.isPathuSelectionActive = false;

  fetchThaniyan();
  fetchPasuram().then(() => {
    if (!state.pasuramData) return;

    if (pathuNum) {
      const ordinal  = PATHU_ORDINALS.find(o => o.num === pathuNum);
      const filtered = state.pasuramData.filter(p =>
        ordinal?.keys.some(k => norm(p.pathu_name || "").includes(norm(k)))
      );
      if (filtered.length) {
        // ✅ Direct to content — no modal
        state.pasuramData            = filtered;
        state.filteredPasuram        = filtered;
        state.isPathuSelectionActive = false;
        state.level                  = "PASURAM";
        render();
        return;
      }
    }

    // Fallback: pathu extraction failed entirely
    state.filteredPasuram = state.pasuramData;
    state.level = "PASURAM";
    render();
  });
}

// Direct to specific thirumozhi by heading — zero modals
function voiceSelectWithThirumozhi(sectionId, sectionName, pathuNum, heading) {
  state.selectedSectionId      = sectionId;
  state.selectedSectionName    = sectionName;
  state.pasuramData            = null;
  state.filteredPasuram        = null;
  state.isPathuSelectionActive = false;

  fetchThaniyan();
  fetchPasuram().then(() => {
    if (!state.pasuramData) return;

    let filtered = state.pasuramData;

    // Narrow to pathu first
    if (pathuNum) {
      const ordinal = PATHU_ORDINALS.find(o => o.num === pathuNum);
      const byPathu = filtered.filter(p =>
        ordinal?.keys.some(k => norm(p.pathu_name || "").includes(norm(k)))
      );
      if (byPathu.length) filtered = byPathu;
    }

    // Narrow to thirumozhi heading
    if (heading) {
      const h = norm(heading);
      const byHead = filtered.filter(p => {
        const th = norm(p.thirumozhi_heading || "");
        return th.includes(h) || h.includes(th);
      });
      if (byHead.length) filtered = byHead;
    }

    state.pasuramData = state.filteredPasuram = filtered;
    state.level = "PASURAM";
    render();
  });
}

// Open Divyadesam index then auto-open specific desam via polling
function voiceOpenDivyadesamById(desamId, desamName, mode) {
  state.divyadesamThousandId = null;
  state.level = "FULL_DIVYADESAM";
  render();

  // Poll for ddOpenDesam — registered after async renderDivyadesamIndex() completes
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (typeof window.ddOpenDesam === "function") {
      clearInterval(poll);
      window.ddOpenDesam(desamId);
    } else if (attempts >= 40) { // 40 × 150ms = 6 seconds max
      clearInterval(poll);
      console.warn("voiceNavBoot: ddOpenDesam not registered for desam", desamId);
    }
  }, 150);
}

// Global pasuram number — fetch section from voice API then navigate
async function voiceOpenGlobalPasuram(globalNo) {
  try {
    const row = await fetch(`${API_VOICE}/by-global?no=${globalNo}`).then(r => r.json());
    if (row?.section_id) {
      state.selectedSectionId   = row.section_id;
      state.selectedSectionName = row.section_name || `Section ${row.section_id}`;
      state.pasuramData = state.filteredPasuram = null;

      fetchThaniyan();
      fetchPasuram().then(() => {
        if (!state.pasuramData) return;
        const match = state.pasuramData.filter(p => p.global_no === globalNo);
        state.pasuramData = state.filteredPasuram =
          match.length ? match : state.pasuramData;
        state.level = "PASURAM";
        render();
      });
    }
  } catch(e) {
    console.warn("voiceNavBoot: global pasuram lookup failed", e);
  }
}

// Open per-thousand sections list
function voiceOpenThousandSections(thousandId) {
  state.selectedThousandId = thousandId;
  state.level = "SECTIONS";
  import("./navigation.js").then(m => m.loadSections());
}

// Open special divyadesam group (Thirunangur, Nava, Irattai)
// Opens Divyadesam index then triggers ddView('special') → ddOpenSpecial(key)
function voiceOpenSpecialGroup(groupKey) {
  state.divyadesamThousandId = null;
  state.level = "FULL_DIVYADESAM";
  render();

  // Poll for ddView which is registered in ddIndex.js
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (typeof window.ddView === "function" && typeof window.ddOpenSpecial === "function") {
      clearInterval(poll);
      window.ddView("special");
      // Wait for special menu to render, then open the group
      setTimeout(() => window.ddOpenSpecial(groupKey), 400);
    } else if (attempts >= 40) {
      clearInterval(poll);
      console.warn("voiceNavBoot: ddOpenSpecial not found for group", groupKey);
    }
  }, 150);
}

// ── நீராட்டம் — custom set ──────────────────────────────────────────────────
// Section 2 pathu 2 thirumozhi 4 (வெண்ணையலைந்த) + global_nos 2046,2047,2498,246,252
// 2046/2047 from section 12, 2498 from section 18, 246/252 from section 2
async function voiceOpenNeeratam() {
  const EXTRA_GLOBAL_NOS = [2046, 2047, 2498, 246, 252];

  // Step 1: Fetch section 2 for pathu 2 thirumozhi 4
  state.selectedSectionId      = 2;
  state.selectedSectionName    = "பெரியாழ்வார் திருமொழி";
  state.pasuramData            = null;
  state.filteredPasuram        = null;
  state.isPathuSelectionActive = false;

  fetchThaniyan();
  await fetchPasuram();

  if (!state.pasuramData || !state.pasuramData.length) return;

  const sec2Data = state.pasuramData;

  // pathu 2, thirumozhi 4 pasurams
  const byPathu2 = sec2Data.filter(p => {
    const pn = norm(p.pathu_name || "");
    return pn.includes("இரணடாம") || pn.includes("2nd") || pn.includes("irandaam") || pn.includes("second");
  });

  const headings = [];
  const seenH = new Set();
  for (const p of byPathu2) {
    const h = p.thirumozhi_heading || p.pathu_subunit_name || "";
    if (h && !seenH.has(h)) { seenH.add(h); headings.push(h); }
  }
  const heading4 = headings[3];
  const thirumozhi4 = heading4
    ? byPathu2.filter(p => (p.thirumozhi_heading || p.pathu_subunit_name) === heading4)
    : byPathu2.slice(0, 11);

  // Step 2: 246/252 are in section 2 data already
  const p246 = sec2Data.find(p => p.global_no === 246);
  const p252 = sec2Data.find(p => p.global_no === 252);

  // Step 3: Hardcode pasurams 2046/2047/2498 with exact lines from DB
  const p2046 = {
    global_no: 2046, local_no: 1, section_id: 12, section_name: "திருகுறுந்தாண்டகம்",
    pathu_name: "", thirumozhi_heading: "நீராட்டம்",
    lines: [
      {text: "முன்பொலா இராவணன்தன்‌",        group: "A"},
      {text: "முதுமதிள்‌ இலங்கைவேவித்து",    group: "A"},
      {text: "அன்பினால்‌ அனுமன்வந்து",       group: "A"},
      {text: "ஆங்கடியிணை பணியநின்றார்க்கு",     group: "A"},
      {text: "என்பெலாம்‌ உருகியுக்கிட்டு",   group: "B"},
      {text: "என்னுடை நெஞ்சமென்னும்‌",       group: "B"},
      {text: "அன்பினால்‌ ஞானநீர்கொண்டு",    group: "B"},
      {text: "ஆட்டுவன்‌ அடியனேனே",           group: "B"}
    ]
  };
  const p2047 = {
    global_no: 2047, local_no: 2, section_id: 12, section_name: "திருகுறுந்தாண்டகம்",
    pathu_name: "", thirumozhi_heading: "நீராட்டம்",
    lines: [
      {text: "மாயமான்‌ மாயச்செற்று",          group: "A"},
      {text: "மருதிற நடந்து",                     group: "A"},
      {text: "வையம்‌ தாயமா பரவைபொங்கத்‌", group: "A"},
      {text: "தடவரை திரித்து",                    group: "A"},
      {text: "வானோர்க்கு ஈயுமால்‌ எம்பிரானார்க்கு", group: "B"},
      {text: "என்னுடைச்‌ சொற்கள் என்னும்‌",    group: "B"},
      {text: "தூயமா மாலைகொண்டு",                  group: "B"},
      {text: "சூட்டுவன்‌ தொண்டனேனே",          group: "B"}
    ]
  };
  const p2498 = {
    global_no: 2498, local_no: 1, section_id: 18, section_name: "திருவிருத்தம்",
    pathu_name: "", thirumozhi_heading: "நீராட்டம்",
    lines: [
      {text: "சூட்டுநன்மாலைகள்‌",             group: "A"},
      {text: "தூயனவேந்தி",                        group: "A"},
      {text: "விண்ணோர்கள்‌ நன்னீராட்டி",      group: "A"},
      {text: "அந்தூபம்தரா நிற்கவேயங்கு",          group: "B"},
      {text: "ஓர்மாயையினால்‌ ஈட்டியவெண்ணை தொடுவுண்ணப்‌ போந்திமிலேற்றுவன்கூன்‌", group: "B"},
      {text: "கோட்டிடையாடினை கூத்து",             group: "B"},
      {text: "அடலாயர்தம்‌ கொம்பினுக்கே",      group: "B"}
    ]
  };

  // Step 4: Combine in exact order
  const combined = [
    ...thirumozhi4,
    ...(p2046 ? [p2046] : []),
    ...(p2047 ? [p2047] : []),
    ...(p2498 ? [p2498] : []),
    ...(p246  ? [p246]  : []),
    ...(p252  ? [p252]  : []),
  ].filter(Boolean);

  if (!combined.length) {
    voiceSelectWithPathu(2, "பெரியாழ்வார் திருமொழி", 2);
    return;
  }

  state.pasuramData     = combined;
  state.filteredPasuram = combined;
  state.level           = "PASURAM";
  render();
}

// ── பரிபாலனம் — two options ──────────────────────────────────────────────────
// திருவாய்மொழி 10th pathu 9th thiruvaimozhi (சூழ்விசும்பு) OR திருவிருத்தம்
// voiceSearch returns this fn — but we need TWO options shown to user
// We handle by storing both in sessionStorage as choices before navigating
// Actually handled via voice popup radio — so we push TWO results from voiceSearch
// This fn is called when user confirms the first option
function voiceOpenParipaalanamTVM() {
  // திருவாய்மொழி 10th pathu 9th thiruvaimozhi
  voiceSelectWithThirumozhi(26, "திருவாய்மொழி", 10, "சூழ்விசும்பு");
}