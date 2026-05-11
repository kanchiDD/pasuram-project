// =====================================================
// newSpecial.js  →  js/render/newSpecial.js
// Used ONLY by newPasuram.js (sections 21/22/23).
// Original special.js untouched — all other callers safe.
// =====================================================

import { state } from "../state.js";
import { renderThaniyan } from "./newThaniyan.js";

/* ================= HEADER MAP ================= */

const sectionHeaderMap = {
  "திருவெழுகூற்றிருக்கை": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருவெழுகூற்றிருக்கை",
  "சிறியதிருமடல்": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த சிறியதிருமடல்",
  "பெரியதிருமடல்": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரியதிருமடல்"
};

const globalNoMap = {
  "திருவெழுகூற்றிருக்கை": 2672,
  "சிறியதிருமடல்": 2673,
  "பெரியதிருமடல்": 2674
};

/* ================= HEADER ================= */

function renderHeader() {

  let html = "";

  /* Thaniyan — separate bordered box per type */
  if (state.thaniyanData && !state.isFullRender) {
    const allRows =
      state.thaniyanData?.data ||
      state.thaniyanData?.rows ||
      state.thaniyanData;

    if (Array.isArray(allRows) && allRows.length > 0) {
      const globalRows  = allRows.filter(r => r.type === "global" || r.type === "thousand");
      const sectionRows = allRows.filter(r => r.type === "section");
      if (globalRows.length  > 0) html += renderThaniyan(globalRows,  state.prosodyMap);
      if (sectionRows.length > 0) html += renderThaniyan(sectionRows, state.prosodyMap);
      if (globalRows.length === 0 && sectionRows.length === 0) {
        html += renderThaniyan(allRows, state.prosodyMap);
      }
    }
  }

  /* Recital button — section title/display/prosody go inside content-box */
  html += `<div class="recital-float" onclick="openRecital()" title="Recital Mode">🎤</div>`;

  return html;
}

/* ================= MADAL ================= */

export function renderMadal(data) {

  if (!data?.units) return "";

  let html = renderHeader();

  const sectionName = state.selectedSectionName || "";
  const globalNo = globalNoMap[sectionName];

  /* CONTENT BOX — heading + display + prosody inside */
  const madalTitle = sectionHeaderMap[sectionName] || sectionName;
  html += `<div class="content-box">`;
  if (madalTitle) html += `<div class="content-heading">${madalTitle}</div>`;

  if (state.displayMap?.section) {
    state.displayMap.section.forEach(d => {
      if (d?.text && !d.text.includes("அடிவரவு"))
        html += `<div class="display-item">${d.text}</div>`;
    });
  }
  if (state.prosodyScope?.length > 0 && state.prosodyMaster) {
    const first = state.prosodyScope[0];
    if (first && state.prosodyMaster[first.prosody_id])
      html += `<div class="prosody">${state.prosodyMaster[first.prosody_id].canonical_name_tamil}</div>`;
  }

  if (globalNo) html += `<div style="font-weight:600;margin-bottom:6px;">${globalNo}</div>`;

  const rules = data.rules || [];

  function getBlockRule(c, l) {
    return rules.find(r =>
      r.rule_type === "block_repeat" &&
      (
        (c > r.start_couplet ||
          (c === r.start_couplet && l >= r.start_line)) &&
        (c < r.end_couplet ||
          (c === r.end_couplet && l <= r.end_line))
      )
    );
  }

  function isLineDual(c, l) {
    return rules.some(r =>
      r.rule_type === "line_repeat" &&
      r.start_couplet == c &&
      r.line_no == l
    );
  }

  const grouped = {};

  data.units.forEach(u => {
    const c = u.couplet_no;
    if (!grouped[c]) grouped[c] = [];

    for (let i = 1; i <= 8; i++) {
      if (u[`line_${i}`]) {
        grouped[c].push({
          text: u[`line_${i}`],
          line_no: i
        });
      }
    }
  });

  const couplets = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const maxCouplet = sectionName === "பெரியதிருமடல்" ? 148 : 77;

  let prevBlockRule = null;

  couplets.forEach(c => {

    const lines = grouped[c];

    html += `<div class="couplet">`;

    lines.forEach((l, idx) => {

      const isLast = idx === lines.length - 1;

      const blockRule = getBlockRule(c, l.line_no);
      const lineDual = isLineDual(c, l.line_no);

      const isBlockStart = blockRule && blockRule !== prevBlockRule;
      const isInsideBlock = !!blockRule;

      let text = l.text;

      if (isBlockStart) text = "** " + text;
      if (lineDual && !isInsideBlock) text = "** " + text;

      const cls = isInsideBlock
        ? "dual-block"
        : lineDual
        ? "dual-line"
        : "";

      if (isLast && c <= maxCouplet) {
        html += `
          <div class="line-with-no ${cls}">
            <span>${text}</span>
            <span class="couplet-no">${c}</span>
          </div>
        `;
      } else {
        html += `<div class="line ${cls}">${text}</div>`;
      }

      prevBlockRule = blockRule || prevBlockRule;

    });

    html += `</div>`;
  });

  /* ✅ SECTION CLOSING */
const closingText = state.sectionClosing?.[0]?.closing_text;
if (closingText) {
  html += `<div class="section-close">${closingText}</div>`;
}

html += `</div>`; // CLOSE CONTENT BOX

  return `<div class="madal-container">${html}</div>`;
}

/* ================= KOOTRIRUKKAI ================= */

export function renderKootrirukkai(data) {

  if (!data?.lines) return "";

  let html = renderHeader();

  const sectionName = state.selectedSectionName || "";
  const globalNo = globalNoMap[sectionName];

  /* CONTENT BOX — heading + display + prosody inside */
  const kootriTitle = sectionHeaderMap[sectionName] || sectionName;
  html += `<div class="content-box">`;
  if (kootriTitle) html += `<div class="content-heading">${kootriTitle}</div>`;

  if (state.displayMap?.section) {
    state.displayMap.section.forEach(d => {
      if (d?.text && !d.text.includes("அடிவரவு"))
        html += `<div class="display-item">${d.text}</div>`;
    });
  }
  if (state.prosodyScope?.length > 0 && state.prosodyMaster) {
    const first = state.prosodyScope[0];
    if (first && state.prosodyMaster[first.prosody_id])
      html += `<div class="prosody">${state.prosodyMaster[first.prosody_id].canonical_name_tamil}</div>`;
  }

  if (globalNo) html += `<div style="font-weight:600;margin-bottom:6px;">${globalNo}</div>`;

  data.lines.forEach(l => {

    const isDual = l.line_no == 41;

    html += `
      <div class="line ${isDual ? "dual-line" : ""}">
        ${isDual ? "** " : ""}${l.line_text}
      </div>
    `;
  });

  /* ✅ SECTION CLOSING */
const closingText = state.sectionClosing?.[0]?.closing_text;
if (closingText) {
  html += `<div class="section-close">${closingText}</div>`;
}

html += `</div>`;

  return `<div class="kootrirukkai-container">${html}</div>`;
}

/* ================= RECITAL ================= */

function openRecital() {
  const sectionId = window.state?.selectedSectionId || "";
  window.open(`recital.html?section=${sectionId}`, "_blank");
}