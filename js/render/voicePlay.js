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