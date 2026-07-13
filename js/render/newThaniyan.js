// =============================================================
// newThaniyan.js  →  js/render/newThaniyan.js
// Used ONLY by newPasuram.js — section-wise content view.
// All other files (fullAzhwars, fullDualRecital, fullThaniyans,
// special.js, test_f.js) continue using original thaniyan.js.
// =============================================================

import { state } from "../state.js";
import { centerPlayBtn, THANIYAN_URL, thaniyanFileUrl } from "./globalAudio.js";

export function renderThaniyan(data, prosodyMap, extraHtml = "") {

  // 🔥 CONTROL (SAFE — identical to original)
  if (!data) return "";

  if (!Array.isArray(data)) {
    data = data?.thaniyan || [];
  }

  if (data.length === 0) return "";

  // Auto-detect label from type field
  // global/thousand rows → "பொது தனியன்"
  // section rows         → "தனியன்"
  const isGlobal = data.some(s => s.type === "global" || s.type === "thousand");
  const label = isGlobal ? "பொது தனியன்" : "தனியன்";

  // Bordered box wraps the existing container
  let html = `<div class="thaniyan-outer">
    <div class="thaniyan-label">${label}</div>
    <div class="thaniyan-container">`;

  // Rendering loop — 100% identical to original thaniyan.js
  data.forEach(section => {

    let currentGroup = null;

    // Section thaniyan → thaniyan_{section_id}.mp3.
    // Global pothu thaniyan → id 1 = Thenkalai (thaniyan_t.mp3),
    //                         id 33 = Vadakalai (thaniyan_v.mp3).
    const secId  = section.section_id || state.selectedSectionId;
    let _audioUrl = "";
    if (section.type === "section" && section.has_audio && secId) {
      _audioUrl = thaniyanFileUrl(secId, section.thaniyan_id);
    } else if (section.type === "global" || section.type === "thousand") {
      const tid = Number(section.thaniyan_id);
      if (tid === 1)       _audioUrl = THANIYAN_URL("t");
      else if (tid === 33) _audioUrl = THANIYAN_URL("v");
    }
    const btnHtml = _audioUrl
      ? centerPlayBtn("ga-th-" + (secId || "g") + "-" + (section.thaniyan_id || "x"), _audioUrl)
      : "";
    let btnPlaced = false;

    section.lines.forEach(line => {

      const role  = line.line_role;
      const text  = line.line_text;
      const group = line.line_group;

      if (role === "title") {
        html += `<div class="thaniyan-title">${text}</div>`;
        if (btnHtml && !btnPlaced) { html += btnHtml; btnPlaced = true; }
        currentGroup = null;
      }

      else if (role === "subhead") {
        if (btnHtml && !btnPlaced) { html += btnHtml; btnPlaced = true; }
        html += `<div class="thaniyan-subhead">${text}</div>`;
        currentGroup = null;
      }

      else if (role === "line") {
        if (btnHtml && !btnPlaced) { html += btnHtml; btnPlaced = true; }

        if (currentGroup !== group) {
          html += `<div class="thaniyan-group"></div>`;
          currentGroup = group;
        }

        const pid = String(line.prosody_id || "");

        let prosody = "";
        if (pid && prosodyMap && prosodyMap[pid]) {
          prosody = `<div class="thaniyan-prosody">(${prosodyMap[pid]})</div>`;
        }

        html += `
          <div class="thaniyan-line">
            ${prosody}
            ${text}
          </div>
        `;
      }

    });

  });

  // (button now rendered below the heading, above; extraHtml kept for
  //  signature compatibility but no longer appended at the bottom)
  html += `</div></div>`;

  return html;
}