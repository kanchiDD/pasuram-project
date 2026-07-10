import { state } from "../state.js";
import { centerPlayBtn, THANIYAN_URL } from "./globalAudio.js";

export function renderThaniyan(data, prosodyMap) {

  // 🔥 CONTROL THAN IYAN (SAFE PLACE)
if (!data) return "";

  if (!Array.isArray(data)) {
    data = data?.thaniyan || [];
  }

  let html = `<div class="thaniyan-container">`;

     
  data.forEach(section => {

    let currentGroup = null;

    // Section thaniyan with audio → small green ▶ just below its heading.
    // section_id can be dropped by the worker for some rows, so fall back
    // to the section currently being rendered.
    const secId  = section.section_id || state.selectedSectionId;
    const btnHtml = (section.type === "section" && section.has_audio && secId)
      ? centerPlayBtn("ga-th-" + secId + "-" + (section.thaniyan_id || "x"), THANIYAN_URL(secId))
      : "";
    let btnPlaced = false;

    section.lines.forEach(line => {

      const role = line.line_role;
      const text = line.line_text;
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

  html += `</div>`;

  return html;
}