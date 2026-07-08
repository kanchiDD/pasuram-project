// =====================================================
// newSpecial.js  →  js/render/newSpecial.js
// Used ONLY by newPasuram.js (sections 21/22/23).
// Original special.js untouched — all other callers safe.
// =====================================================

import { state } from "../state.js";
import { renderThaniyan } from "./newThaniyan.js";
import { PASURAM_URL, THANIYAN_URL, sectionListenBtn, sectionQueueBtn } from "./globalAudio.js";
import { buildMadalCoupletsHTML, buildKootrirukkaiLinesHTML } from "./madalKootrirukkaiCore.js";

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

// Audio now handled by globalAudio.js (PASURAM_URL, THANIYAN_URL, sectionListenBtn, sectionQueueBtn)

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

      // Global/common thaniyan is shared across many sections — plain,
      // no audio controls (not part of this section's recording).
      if (globalRows.length > 0) html += renderThaniyan(globalRows, state.prosodyMap);

      // Section-specific thaniyan — only attach audio controls if THIS
      // section actually has recorded/split audio. Otherwise render
      // plain, with no controls, to avoid wiring the wrong audio in.
      if (sectionRows.length > 0) {
        const sRow = sectionRows[0];
        const thControls = sRow.has_audio
          ? sectionListenBtn("ga-th-" + sRow.thaniyan_id, THANIYAN_URL(sRow.thaniyan_id))
          : "";
        html += renderThaniyan(sectionRows, state.prosodyMap, thControls);
      }
      if (globalRows.length === 0 && sectionRows.length === 0) {
        html += renderThaniyan(allRows, state.prosodyMap, "");
      }
    }
  }

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

  // Minimal play/stop/mute controls — only if this section actually
  // has recorded/split audio (see SECTION_AUDIO_MAP above).
  if (data.has_audio) {
    // Build queue: thaniyan (if flagged) + full pasuram
    const thRow = (state.thaniyanData || []).find(t => t.type === "section" && t.has_audio);
    const queue = [];
    if (thRow) queue.push(THANIYAN_URL(thRow.thaniyan_id));
    queue.push(PASURAM_URL(globalNo));
    html += sectionQueueBtn("ga-sec-" + globalNo, queue);
  }

  const maxCouplet = sectionName === "பெரியதிருமடல்" ? 148 : 77;
  const madalHtml = buildMadalCoupletsHTML(data, "sp", maxCouplet);
  html += `<div class="sp-madal-body">${madalHtml}</div>`;

  /* ✅ SECTION CLOSING */
const closingText = state.sectionClosing?.[0]?.closing_text;
if (closingText) {
  html += `<div class="section-close">${closingText}</div>`;
}

html += `</div>`; // CLOSE CONTENT BOX

  // data-recital-* attributes let recitalSync.js highlight this whole
  // madal block in sync with audio playback.
  return `<div class="madal-container" data-recital-type="pasuram" data-recital-id="${globalNo}">${html}</div>`;
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

  // Minimal play/stop/mute controls — only if this section actually
  // has recorded/split audio (see SECTION_AUDIO_MAP above).
  if (data.has_audio) {
    const thRow = (state.thaniyanData || []).find(t => t.type === "section" && t.has_audio);
    const queue = [];
    if (thRow) queue.push(THANIYAN_URL(thRow.thaniyan_id));
    queue.push(PASURAM_URL(globalNo));
    html += sectionQueueBtn("ga-sec-" + globalNo, queue);
  }

  const kootriHtml = buildKootrirukkaiLinesHTML(data, "sp", 41);
  html += `<div class="sp-madal-body">${kootriHtml}</div>`;

  /* ✅ SECTION CLOSING */
const closingText = state.sectionClosing?.[0]?.closing_text;
if (closingText) {
  html += `<div class="section-close">${closingText}</div>`;
}

html += `</div>`;

  // data-recital-* attributes let recitalSync.js highlight this whole
  // pasuram block in sync with audio playback (recorded as a single
  // continuous pasuram segment, not per-line).
  return `<div class="kootrirukkai-container" data-recital-type="pasuram" data-recital-id="${globalNo}">${html}</div>`;
}

/* ================= RECITAL ================= */

function openRecital() {
  const sectionId = window.state?.selectedSectionId || "";
  window.open(`recital.html?section=${sectionId}`, "_blank");
}