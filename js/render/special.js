import { state } from "../state.js";
import { t as uiText } from "../utils/uiStrings.js";
import { renderThaniyan } from "./thaniyan.js";
import { buildMadalCoupletsHTML, buildKootrirukkaiLinesHTML } from "./madalKootrirukkaiCore.js";
import { isAdivaravu } from "../utils/displayTags.js";
import { sectionTitle } from "../utils/contentStrings.js";

/* ================= SECTION META ================= */
// Keyed by section_id, not by the Tamil section name — the name arrives
// transliterated once a script is active, so a name-keyed lookup silently
// missed and took the global number and the couplet cap with it.
const SECTION_META = {
  21: { globalNo: 2672, maxCouplet: 77 },
  22: { globalNo: 2673, maxCouplet: 77 },
  23: { globalNo: 2674, maxCouplet: 148 }
};
SECTION_META[2672] = SECTION_META[21];
SECTION_META[2673] = SECTION_META[22];
SECTION_META[2674] = SECTION_META[23];

function sectionMeta() {
  return SECTION_META[state.selectedSectionId] || null;
}

/* ================= HEADER ================= */

function renderHeader() {

  let html = "";

if (state.thaniyanData && !state.isFullRender) {

  const data =
    state.thaniyanData?.data ||
    state.thaniyanData?.rows ||
    state.thaniyanData;

  let toRender = data;

  if (state.isFullRender === true) {
    toRender = data.filter(t => t.type === "section");
  }

  html += renderThaniyan(toRender);
}

/* Section Title */
  /* Section Title */
const sectionName = state.selectedSectionName || "";

if (sectionName) {
  const title = sectionTitle(state.selectedSectionId, sectionName);

  html += `
    <div style="text-align:center;margin:20px 0 10px 0;font-weight:600;">
      ${title}
    </div>
  `;
}


  /* Carnatic */
  if (state.displayMap && state.displayMap.section) {
    state.displayMap.section.forEach(d => {
      if (d && d.text && !isAdivaravu(d)) {
        html += `<div class="display-item">${d.text}</div>`;
      }
    });
  }

  /* Prosody */
  if (state.prosodyScope && state.prosodyMaster && state.prosodyScope.length > 0) {
    const first = state.prosodyScope[0];
    if (first && state.prosodyMaster[first.prosody_id]) {
      html += `<div class="prosody">${state.prosodyMaster[first.prosody_id].canonical_name_tamil}</div>`;
    }
  }

  /* Floating Recital Button */
  html += `<div class="recital-float" onclick="openRecital()" title="${uiText("recitalMode")}">🎤</div>`;

  return html;
}

/* ================= MADAL ================= */

export function renderMadal(data) {

  if (!data?.units) return "";

  let html = renderHeader();

  const meta = sectionMeta();
  const globalNo = meta?.globalNo;

  /* CONTENT BOX START */
  html += `<div class="content-box"${globalNo ? ` data-global-no="${globalNo}"` : ""}>`;

if (globalNo) {
  html += `
    <div style="font-weight:600; margin-bottom:6px;">
      ${globalNo}
    </div>
  `;
}

  // Couplet rendering delegated to shared core module — single
  // source of truth used by NNC, Azhwar Thirunatchathram, special.js,
  // and recital.html. CSS class prefix "sp" -> .sp-madal-couplet-card etc.
  const maxCouplet = meta?.maxCouplet ?? 77;
  const madalHtml = buildMadalCoupletsHTML(data, "sp", maxCouplet);
  html += `<div class="sp-madal-body">${madalHtml}</div>`;

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

  const meta = sectionMeta();
  const globalNo = meta?.globalNo;

  html += `<div class="content-box"${globalNo ? ` data-global-no="${globalNo}"` : ""}>`;

if (globalNo) {
  html += `
    <div style="font-weight:600; margin-bottom:6px;">
      ${globalNo}
    </div>
  `;
}

  // Line rendering delegated to shared core module — each line now
  // wrapped in its own card (matches madal couplet treatment).
  const kootriHtml = buildKootrirukkaiLinesHTML(data, "sp", 41);
  html += `<div class="sp-madal-body">${kootriHtml}</div>`;

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