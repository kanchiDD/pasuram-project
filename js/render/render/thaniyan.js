import { state } from "../state.js";

export function renderThaniyan(data, prosodyMap) {

console.log("🔥 NEW THAN IYAN FILE LOADED");

  // 🔥 CONTROL THAN IYAN (SAFE PLACE)
if (!data) return "";

  if (!Array.isArray(data)) {
    data = data?.thaniyan || [];
  }

  let html = `<div class="thaniyan-container">`;

     
  data.forEach(section => {

    let currentGroup = null;

    section.lines.forEach(line => {

      const role = line.line_role;
      const text = line.line_text;
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

  html += `</div>`;

  return html;
}