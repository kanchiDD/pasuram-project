// =============================================================
//  voicePlay.js  →  js/render/voicePlay.js
//  Single source of truth for VOICE "play" audio playback.
//
//  Both callers import from here so the sect-aware queue logic
//  (and the special-section 21/22/23 routing) lives in ONE place:
//    - voice.js       → plays on the voice-search screen (no navigation)
//    - voiceNavBoot.js → plays after a tree.html handoff (legacy path)
//
//  Queue rules (per section SOP):
//    • Every SECTION gets the sect-aware pothu thaniyan FIRST
//      (T→t, V→v, Madam→k,v via globalThaniyanUrls) — user sentiment.
//    • Special sections (21/22/23) use their dedicated thaniyan+work
//      pair (specialSectionUrls), still preceded by the pothu thaniyan.
//    • A missing audio file is skipped by the player (onerror→next),
//      so partially-recorded content still plays what exists.
// =============================================================

import {
  playUrls, PASURAM_URL, thaniyanFileUrl,
  globalThaniyanUrls, specialSectionUrls
} from "./globalAudio.js";

const API_VOICE = "https://cdnaalayiram-api.kanchitrust.workers.dev/voice";
const API_DD    = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

// ── Sect helper (reads the registered user's sect once) ──
function userSect() {
  return {
    sect:    localStorage.getItem("sect")    || "T",
    subsect: localStorage.getItem("subsect") || ""
  };
}

// ═══════════════════════════════════════════════════════════════
//  ANADHYAYANA KALAM — voice PLAY gating (pasuram/section audio only).
//  Thaniyan playback is NOT in this file, so it stays free year-round.
//  Non-margazhi → only Ithara Prabandham (thousand-99) of the user's sect.
//  Margazhi     → also Thiruppavai (3) & Thiruppalliyezhuchi (8).
//  Post-Anadhyayana → everything. Date = today.
// ═══════════════════════════════════════════════════════════════
const RECITAL_WORKER = "https://recitalworker.kanchitrust.workers.dev";
const ANA_THOUSAND_99 = new Set([25,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53]);
const ANA_SECTION_SECT = {25:"T",27:"T",28:"T",29:"T",30:"T",31:"T",32:"V",33:"V",34:"V",35:"V",36:"V",37:"V",38:"V",39:"V",40:"V",41:"V",42:"V",43:"V",44:"V",45:"V",46:"V",47:"V",48:"V",49:"V",50:"V",51:"V",52:"V",53:"V"};
let _voiceAna = null;
async function fetchVoiceAna() {
  if (_voiceAna) return _voiceAna;
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  try {
    const r = await fetch(`${RECITAL_WORKER}/recital/panchangam?date=${date}`);
    _voiceAna = r.ok
      ? (p => ({ active: p?.is_anadhyayana === 1, margazhi: p?.is_margazhi === 1 }))(await r.json())
      : { active: false, margazhi: false };
  } catch (e) { _voiceAna = { active: false, margazhi: false }; }
  return _voiceAna;
}
function voiceSectionAllowed(sectionId, ana) {
  if (!ana || !ana.active) return true;
  const id = Number(sectionId);
  if (ana.margazhi && (id === 3 || id === 8)) return true;   // Margazhi: Thiruppavai / Thiruppalliyezhuchi
  if (!ANA_THOUSAND_99.has(id)) return false;
  const uSect = (localStorage.getItem("sect") || "T").toUpperCase();
  const madam = (localStorage.getItem("subsect") || "").toLowerCase() === "madam";
  const s = ANA_SECTION_SECT[id] || "B";
  return uSect === "V"
    ? (s !== "T" && !((id === 52 || id === 53) && !madam))    // V / VM
    : (s !== "V");                                            // T
}
function voiceAnaNotice(margazhi) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99999;"
    + "max-width:88%;background:#fff6e0;color:#7a4d00;border:1px solid #e0c070;border-radius:12px;"
    + "padding:12px 16px;font-family:inherit;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,0.18);text-align:center";
  ov.innerHTML = margazhi
    ? "\uD83D\uDE4F Adiyen, during Anadhyayana Kalam we can play Ithara Prabandham, and in Margazhi, Thiruppavai and Thiruppalliyezhuchi."
    : "\uD83D\uDE4F Adiyen, during Anadhyayana Kalam we can play only Ithara Prabandham.";
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 4600);
}

// ── "Not available" toast (shared) ──
export function voiceNotAvailable(name) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:99999;"
    + "max-width:88%;background:#fff6e0;color:#7a4d00;border:1px solid #e0c070;border-radius:12px;"
    + "padding:12px 16px;font-family:inherit;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,0.18);text-align:center";
  ov.innerHTML = `\uD83D\uDE4F Adiyen, the contents${name ? " for <b>" + name + "</b>" : ""} are currently not available. Please check later.`;
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 4200);
}

// ── Play a whole SECTION (with sect-aware pothu thaniyan) ──
export async function playSectionAudio(sectionId, sectionName) {
  try {
    const ana = await fetchVoiceAna();
    if (!voiceSectionAllowed(sectionId, ana)) { voiceAnaNotice(ana.margazhi); return; }
    // Special sections (21/22/23): dedicated thaniyan+work pair, NOT
    // per-pasuram rows. specialSectionUrls() returns [] for any normal
    // section, so those fall through to the standard path below.
    // Still SECTIONS → sect-aware pothu thaniyan is prepended.
    const sp = specialSectionUrls(sectionId);
    if (sp.length) {
      const { sect, subsect } = userSect();
      playUrls([...globalThaniyanUrls(sect, subsect), ...sp]);
      return;
    }

    const [disp, than] = await Promise.all([
      fetch(`${API_DD}/pasuram?section_id=${sectionId}`).then(r => r.json()).catch(() => []),
      fetch(`${API_DD}/thaniyan?section_id=${sectionId}`).then(r => r.json()).catch(() => [])
    ]);

    // Every pasuram that has audio, in order
    const pasUrls = (Array.isArray(disp) ? disp : [])
      .filter(p => p.has_audio)
      .map(p => PASURAM_URL(p.global_no));

    if (!pasUrls.length) { voiceNotAvailable(sectionName); return; }

    const queue = [];

    // 1) Sect-aware global pothu thaniyan (T→t, V→v, Madam→k then v).
    const { sect, subsect } = userSect();
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

// ── Play a SINGLE pasuram (standalone — no thaniyan, per SOP) ──
export async function playPasuramAudio(globalNo) {
  try {
    const g = await fetch(`${API_VOICE}/by-global?no=${Number(globalNo)}`).then(r => r.json());
    if (!g || !g.section_id) { voiceNotAvailable("Pasuram " + globalNo); return; }
    const ana = await fetchVoiceAna();
    if (!voiceSectionAllowed(g.section_id, ana)) { voiceAnaNotice(ana.margazhi); return; }
    const disp = await fetch(`${API_DD}/pasuram?section_id=${g.section_id}`).then(r => r.json());
    const found = (Array.isArray(disp) ? disp : []).find(p => Number(p.global_no) === Number(globalNo));
    if (found && found.has_audio) playUrls([PASURAM_URL(Number(globalNo))]);
    else voiceNotAvailable("Pasuram " + globalNo);
  } catch (e) {
    voiceNotAvailable("Pasuram " + globalNo);
  }
}
// ═══════════════════════════════════════════════════════
// STAGE A — granular audio handlers
//   Ordinal words ("மூன்றாம்"…) live in pathu_name / thirumozhi_name.
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
function _norm(s) {
  return (s || "").toLowerCase().trim()
    .replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, " ")
    .replace(/்/g, "")
    .replace(/\s+/g, " ");
}
function _ordinalKeys(num) {
  const o = PATHU_ORDINALS.find(x => x.num === Number(num));
  return o ? o.keys : [];
}

// Sections 4/5 use the standalone-thirumozhi model — their thirumozhis
// are the primary recital units and carry the SECTION thaniyan. All other
// pathu-model sections (2/11/26): a bare thirumozhi carries NO thaniyan.
const STANDALONE_SECTIONS = [4, 5];

async function _fetchSection(sectionId) {
  const [disp, than] = await Promise.all([
    fetch(`${API_DD}/pasuram?section_id=${sectionId}`).then(r => r.json()).catch(() => []),
    fetch(`${API_DD}/thaniyan?section_id=${sectionId}`).then(r => r.json()).catch(() => [])
  ]);
  const pasuram  = Array.isArray(disp) ? disp : [];
  const thanRows = Array.isArray(than) ? than : (than.thaniyan || than.data || than.rows || []);
  return { pasuram, thanRows };
}

function _sectionThaniyanUrl(sectionId, thanRows) {
  const secThan = (thanRows || []).find(t =>
    (t.type === "section" || Number(t.section_id) === Number(sectionId)) && t.has_audio);
  return secThan ? thaniyanFileUrl(secThan.section_id || sectionId, secThan.thaniyan_id) : null;
}

// ── Play a THIRUMOZHI ──
// Pathu model (2/11/26): thirumozhi's pasurams only, NO thaniyan.
// Standalone model (4/5): SECTION thaniyan + thirumozhi's pasurams.
export async function playThirumozhiAudio(sectionId, sectionName, pathuNum, heading) {
  try {
    const ana = await fetchVoiceAna();
    if (!voiceSectionAllowed(sectionId, ana)) { voiceAnaNotice(ana.margazhi); return; }
    const { pasuram, thanRows } = await _fetchSection(sectionId);
    const keys = _ordinalKeys(pathuNum);
    const h    = _norm(heading || "");

    const filtered = pasuram.filter(p => {
      const nm = _norm(p.thirumozhi_name || "");
      const hd = _norm(p.thirumozhi_heading || "");
      const byOrd  = keys.some(k => nm.includes(_norm(k)));
      const byHead = h && (hd === h || hd.includes(h) || h.includes(hd));
      return byOrd || byHead;
    });

    const pasUrls = filtered.filter(p => p.has_audio).map(p => PASURAM_URL(p.global_no));
    if (!pasUrls.length) { voiceNotAvailable(sectionName); return; }

    const queue = [];
    if (STANDALONE_SECTIONS.includes(Number(sectionId))) {
      const st = _sectionThaniyanUrl(sectionId, thanRows);
      if (st) queue.push(st);
    }
    queue.push(...pasUrls);
    playUrls(queue);
  } catch (e) {
    voiceNotAvailable(sectionName);
  }
}

// ── Play a STANDALONE selection (sections 4/5) ──
// Specific thirumozhi named → that thirumozhi + SECTION thaniyan.
// No specific thirumozhi → whole section (pothu + section thaniyan).
export async function playStandaloneAudio(sectionId, sectionName, pathuNum) {
  if (pathuNum) return playThirumozhiAudio(sectionId, sectionName, pathuNum, "");
  return playSectionAudio(sectionId, sectionName);
}

// ── Play a FULL PATHU (sections 2/11/26) ──
// pothu thaniyan (sect-aware) + SECTION thaniyan + that pathu's pasurams.
export async function playPathuAudio(sectionId, sectionName, pathuNum) {
  try {
    const ana = await fetchVoiceAna();
    if (!voiceSectionAllowed(sectionId, ana)) { voiceAnaNotice(ana.margazhi); return; }
    const { pasuram, thanRows } = await _fetchSection(sectionId);
    const keys = _ordinalKeys(pathuNum);

    const filtered = pasuram.filter(p =>
      keys.some(k => _norm(p.pathu_name || "").includes(_norm(k)))
    );
    const pasUrls = filtered.filter(p => p.has_audio).map(p => PASURAM_URL(p.global_no));
    if (!pasUrls.length) { voiceNotAvailable(sectionName); return; }

    const queue = [];
    const { sect, subsect } = userSect();
    queue.push(...globalThaniyanUrls(sect, subsect));   // 1) pothu
    const st = _sectionThaniyanUrl(sectionId, thanRows);
    if (st) queue.push(st);                             // 2) section thaniyan
    queue.push(...pasUrls);                             // 3) pathu pasurams
    playUrls(queue);
  } catch (e) {
    voiceNotAvailable(sectionName);
  }
}