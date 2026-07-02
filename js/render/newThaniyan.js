// =============================================================
// newThaniyan.js  →  js/render/newThaniyan.js
// Used ONLY by newPasuram.js — section-wise content view.
// All other files (fullAzhwars, fullDualRecital, fullThaniyans,
// special.js, test_f.js) continue using original thaniyan.js.
// =============================================================

import { state } from "../state.js";

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

    section.lines.forEach(line => {

      const role  = line.line_role;
      const text  = line.line_text;
      const group = line.line_group;

      if (role === "title") {
        html += `<div class="thaniyan-title">${text}</div>`;
        currentGroup = null;
      }

      else if (role === "subhead") {
        html += `<div class="thaniyan-subhead">${text}</div>`;
        currentGroup = null;
      }

      else if (role === "line") {

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

  html += extraHtml;
  html += `</div></div>`;

  return html;
}