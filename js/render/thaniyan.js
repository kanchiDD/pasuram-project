import { state } from "../state.js";
import { centerPlayBtn, THANIYAN_URL, thaniyanFileUrl } from "./globalAudio.js";

export function renderThaniyan(data, prosodyMap) {

  // 🔥 CONTROL THAN IYAN (SAFE PLACE)
if (!data) return "";

  if (!Array.isArray(data)) {
    data = data?.thaniyan || [];
  }

  let html = `<div class="thaniyan-container">`;

     
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