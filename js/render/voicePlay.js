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