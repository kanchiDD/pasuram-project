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
import { playUrls, PASURAM_URL, thaniyanFileUrl, THANIYAN_SEC_URL, globalThaniyanUrls } from "./render/globalAudio.js";

const API_VOICE = "https://cdnaalayiram-api.kanchitrust.workers.dev/voice";
const API_DD    = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

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

  // ── Voice PLAY ("play …" / "… சாதித்தருளாய்") ──
  if (fn === "_playSection") {
    const [sectionId, sectionName] = args;
    voicePlaySection(sectionId, sectionName);
    return;
  }
  if (fn === "_playPasuram") {
    const [globalNo] = args;
    voicePlayPasuram(globalNo);
    return;
  }

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
    // Text/voice search that resolved to the SECTION itself means the
    // user wants the whole section — go straight to full content, no
    // pathu-selector modal. (The pathu chooser is only for when a
    // specific pathu was requested, handled by voiceSelectWithPathu.)
    state.isPathuSelectionActive = false;
    state.filteredPasuram = state.pasuramData;
    state.level = "PASURAM";
    render();
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
    // No specific thirumozhi matched → a plain section search means the
    // user wants the whole section. Render full content directly instead
    // of the standalone-selector modal (matches 2/11/26 behaviour).
    state.isStandaloneSelection = false;
    state.filteredPasuram = state.pasuramData;
    state.level = "PASURAM";
    render();
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

// Open a specific Divyadesam directly: cover the screen with a loader so the
// user never sees the 108-index (whose lotus spinner sits below the fold and
// looks like "nothing happened"), then swap straight to the desam detail.
function voiceOpenDivyadesamById(desamId, desamName, mode) {
  const ov = document.createElement("div");
  ov.id = "voice-dd-loader";
  ov.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;"
    + "align-items:center;justify-content:center;background:#fff8ec;color:#7a4d00;"
    + "font-family:inherit;gap:16px";
  ov.innerHTML = `
    <div style="font-size:15px;font-weight:700">${desamName ? "Opening " + desamName + " \u2026" : "Opening \u2026"}</div>
    <div style="font-size:34px;animation:vdd-spin 1.4s linear infinite">\uD83E\uDEB7</div>
    <style>@keyframes vdd-spin{to{transform:rotate(360deg)}}</style>`;
  document.body.appendChild(ov);

  state.divyadesamThousandId = null;
  state.level = "FULL_DIVYADESAM";
  render();

  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    const ready = typeof window.ddOpenDesam === "function"
                  && document.getElementById("fdd-content");
    if (ready) {
      clearInterval(poll);
      // Open the desam detail; ddOpenDesam returns renderDesamDetail's promise,
      // so we wait for the detail to actually paint before revealing it.
      Promise.resolve(window.ddOpenDesam(desamId)).then(() => {
        // Hide the 108-index chrome so ONLY the desam detail shows (same page,
        // spinner → detail — no index bar at the top).
        document.querySelectorAll(".dd-page-title, .dd-page-sub, .dd-divider, .dd-menu-grid")
          .forEach(el => { el.style.display = "none"; });
        window.scrollTo({ top: 0, behavior: "auto" });
        setTimeout(() => document.getElementById("voice-dd-loader")?.remove(), 60);
      }).catch(() => {
        document.getElementById("voice-dd-loader")?.remove();
      });
    } else if (attempts >= 60) { // 6s max
      clearInterval(poll);
      document.getElementById("voice-dd-loader")?.remove();
      console.warn("voiceNavBoot: ddOpenDesam/#fdd-content not ready for desam", desamId);
    }
  }, 100);
}

// Global pasuram number — fetch section from voice API then navigate
async function voiceOpenGlobalPasuram(globalNo) {
  const wantNo = Number(globalNo);
  try {
    const row = await fetch(`${API_VOICE}/by-global?no=${wantNo}`).then(r => r.json());
    if (row?.section_id) {
      state.selectedSectionId   = row.section_id;
      state.selectedSectionName = row.section_name || `Section ${row.section_id}`;
      state.pasuramData = state.filteredPasuram = null;

      fetchThaniyan();
      fetchPasuram().then(() => {
        if (!state.pasuramData) return;
        // Numeric-coerce both sides — global_no can arrive as a string, which
        // broke the strict === match and fell back to the whole section.
        const match = state.pasuramData.filter(p => Number(p.global_no) === wantNo);
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

  // Poll for the special handlers AND the target DOM before firing
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    const ready = typeof window.ddView === "function"
                  && typeof window.ddOpenSpecial === "function"
                  && document.getElementById("fdd-content");
    if (ready) {
      clearInterval(poll);
      window.ddView("special");
      // Wait for special menu to render, then open the group
      setTimeout(() => window.ddOpenSpecial(groupKey), 400);
    } else if (attempts >= 60) {
      clearInterval(poll);
      console.warn("voiceNavBoot: ddOpenSpecial not found for group", groupKey);
    }
  }, 100);
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
// ── Voice PLAY handlers ─────────────────────────────────────────────────────
// Reverent "play" (English "play" / "சாதித்தருளாய்"). Uses the DB has_audio
// flag (via existing endpoints) to decide; the shared headless player handles
// playback and skips any file that fails.

function voiceNotAvailable(name) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99999;"
    + "max-width:88%;background:#fff6e0;color:#7a4d00;border:1px solid #e0c070;border-radius:12px;"
    + "padding:12px 16px;font-family:inherit;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,0.18);text-align:center";
  ov.innerHTML = `\uD83D\uDE4F Adiyen, the contents${name ? " for <b>" + name + "</b>" : ""} are currently not available. Please check later.`;
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 4200);
}

async function voicePlaySection(sectionId, sectionName) {
  try {
    const [disp, than] = await Promise.all([
      fetch(`${API_DD}/pasuram?section_id=${sectionId}`).then(r => r.json()).catch(() => []),
      fetch(`${API_DD}/thaniyan?section_id=${sectionId}`).then(r => r.json()).catch(() => [])
    ]);

    // Then every pasuram that has audio, in order
    const pasUrls = (Array.isArray(disp) ? disp : [])
      .filter(p => p.has_audio)
      .map(p => PASURAM_URL(p.global_no));

    if (!pasUrls.length) { voiceNotAvailable(sectionName); return; }

    const queue = [];

    // 1) Global pothu thaniyan for the user's sect (T→t, V→v, Madam→k then v).
    //    A missing file is skipped by the player, so this is safe.
    const sect    = localStorage.getItem("sect") || "T";
    const subsect = localStorage.getItem("subsect") || "";
    queue.push(...globalThaniyanUrls(sect, subsect));

    // 2) Section thaniyan (if it has audio)
    const thanRows = Array.isArray(than) ? than : (than.thaniyan || []);
    const secThan = thanRows.find(t =>
      (t.type === "section" || Number(t.section_id) === Number(sectionId)) && t.has_audio);
    if (secThan) queue.push(thaniyanFileUrl(secThan.section_id || sectionId, secThan.thaniyan_id));

    // 3) The pasurams
    queue.push(...pasUrls);

    playUrls(queue);
  } catch (e) {
    voiceNotAvailable(sectionName);
  }
}

async function voicePlayPasuram(globalNo) {
  try {
    const g = await fetch(`${API_VOICE}/by-global?no=${Number(globalNo)}`).then(r => r.json());
    if (!g || !g.section_id) { voiceNotAvailable("Pasuram " + globalNo); return; }
    const disp = await fetch(`${API_DD}/pasuram?section_id=${g.section_id}`).then(r => r.json());
    const found = (Array.isArray(disp) ? disp : []).find(p => Number(p.global_no) === Number(globalNo));
    if (found && found.has_audio) playUrls([PASURAM_URL(Number(globalNo))]);
    else voiceNotAvailable("Pasuram " + globalNo);
  } catch (e) {
    voiceNotAvailable("Pasuram " + globalNo);
  }
}