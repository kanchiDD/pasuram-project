// =====================================================
// newSpecial.js  →  js/render/newSpecial.js
// Used ONLY by newPasuram.js (sections 21/22/23).
// Original special.js untouched — all other callers safe.
// =====================================================

import { state } from "../state.js";
import { t as uiText } from "../utils/uiStrings.js";
import { renderThaniyan } from "./newThaniyan.js";
import { buildMadalCoupletsHTML, buildKootrirukkaiLinesHTML } from "./madalKootrirukkaiCore.js";
import { isAdivaravu } from "../utils/displayTags.js";
import { sectionTitle as ceremonialTitle } from "../utils/contentStrings.js";

/* ================= SECTION META ================= */
// Keyed by section_id, NOT by section name. The name now arrives already
// transliterated whenever a script is active, so every name-keyed lookup
// missed silently and took the audio controls, the global number, the full
// heading and the Periya couplet cap with it. section_id never changes.
//
// Only sections listed here have actual split/recorded audio files.
// Sections NOT listed get NO audio controls at all — this prevents the
// wrong section's audio being wired in by mistake.
const SECTION_META = {
  21: {
    globalNo:    2672,
    maxCouplet:  77,
    thaniyanSrc: "https://audio.arulicheyal.org/thaniyans/thaniyan_22.mp3",
    pasuramSrc:  "https://audio.arulicheyal.org/pasurams/pasuram_2672.mp3"
  },
  22: {
    globalNo:    2673,
    maxCouplet:  77,
    thaniyanSrc: "https://audio.arulicheyal.org/thaniyans/thaniyan_23.mp3",
    pasuramSrc:  "https://audio.arulicheyal.org/pasurams/pasuram_2673.mp3"
  },
  23: {
    globalNo:    2674,
    maxCouplet:  148,
    thaniyanSrc: "https://audio.arulicheyal.org/thaniyans/thaniyan_24.mp3",
    pasuramSrc:  "https://audio.arulicheyal.org/pasurams/pasuram_2674.mp3"
  }
};
// The Full-4000 path addresses the same three works by global number.
SECTION_META[2672] = SECTION_META[21];
SECTION_META[2673] = SECTION_META[22];
SECTION_META[2674] = SECTION_META[23];

// Kept only as a safety net for any caller that sets the section name but
// not the id. Tamil names only — a transliterated name simply misses here
// and the id lookup above is what actually does the work.
const NAME_TO_SECTION = {
  "திருவெழுகூற்றிருக்கை": 21,
  "சிறியதிருமடல்": 22,
  "பெரியதிருமடல்": 23
};

function sectionMeta() {
  return SECTION_META[state.selectedSectionId]
      || SECTION_META[NAME_TO_SECTION[state.selectedSectionName]]
      || null;
}


// The ceremonial heading now lives in ui_text_master, keyed by section_id,
// so it transliterates with everything else instead of being a JS literal.
function sectionTitle(meta) {
  return ceremonialTitle(state.selectedSectionId, state.selectedSectionName || "");
}

/* ================= MINIMAL AUDIO CONTROLS ================= */
// Horizontal row, centered: play / stop / mute, each with a small
// label underneath. No native timeline/seek bar. audioId must be
// unique per element on the page.
function buildMiniAudioControls(audioId, src) {
  const btnStyle = "background:#3cb043;color:#fff;border:none;border-radius:50%;width:26px;height:26px;font-size:11px;cursor:pointer;";
  const labelStyle = "font-size:10px;color:#666;margin-top:2px;";
  const groupStyle = "display:flex;flex-direction:column;align-items:center;";

  return `
    <audio id="${audioId}" src="${src}" style="display:none;"></audio>
    <div style="display:flex;gap:22px;justify-content:center;align-items:flex-start;margin:8px 0;">
      <div style="${groupStyle}">
        <button type="button" title="${uiText("playPlain")}"
          onclick="document.getElementById('${audioId}').play()"
          style="${btnStyle}background:#3cb043;">▶</button>
        <span style="${labelStyle}">${uiText("playPlain")}</span>
      </div>
      <div style="${groupStyle}">
        <button type="button" title="${uiText("stop")}"
          onclick="var a=document.getElementById('${audioId}');a.pause();a.currentTime=0;"
          style="${btnStyle}background:#555;">■</button>
        <span style="${labelStyle}">${uiText("stop")}</span>
      </div>
      <div style="${groupStyle}">
        <button type="button" title="${uiText("mute")}"
          onclick="var a=document.getElementById('${audioId}');a.muted=!a.muted;this.textContent=a.muted?'🔇':'🔊';"
          style="${btnStyle}background:#777;">🔊</button>
        <span style="${labelStyle}">${uiText("mute")}</span>
      </div>
    </div>
  `;
}

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
      const meta = sectionMeta();

      if (sectionRows.length > 0) {
        const thaniyanControls = meta
          ? buildMiniAudioControls("thaniyanAudio_" + meta.globalNo, meta.thaniyanSrc)
          : "";
        html += renderThaniyan(sectionRows, state.prosodyMap, thaniyanControls);
      }

      if (globalRows.length === 0 && sectionRows.length === 0) {
        const fallbackControls = meta
          ? buildMiniAudioControls("thaniyanAudio_" + meta.globalNo, meta.thaniyanSrc)
          : "";
        html += renderThaniyan(allRows, state.prosodyMap, fallbackControls);
      }
    }
  }

  return html;
}

/* ================= MADAL ================= */

export function renderMadal(data) {

  if (!data?.units) return "";

  let html = renderHeader();

  const meta = sectionMeta();
  const globalNo = meta?.globalNo;

  /* CONTENT BOX — heading + display + prosody inside */
  const madalTitle = sectionTitle(meta);
  html += `<div class="content-box">`;
  if (madalTitle) html += `<div class="content-heading">${madalTitle}</div>`;

  if (state.displayMap?.section) {
    state.displayMap.section.forEach(d => {
      if (d?.text && !isAdivaravu(d))
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
  // has recorded/split audio (see SECTION_META above).
  if (meta) {
    html += buildMiniAudioControls("pasuramAudio_" + globalNo, meta.pasuramSrc);
  }

  const maxCouplet = meta?.maxCouplet ?? 77;
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
  return `<div class="madal-container" data-recital-type="pasuram" data-recital-id="${globalNo}" data-global-no="${globalNo}">${html}</div>`;
}

/* ================= KOOTRIRUKKAI ================= */

export function renderKootrirukkai(data) {

  if (!data?.lines) return "";

  let html = renderHeader();

  const meta = sectionMeta();
  const globalNo = meta?.globalNo;

  /* CONTENT BOX — heading + display + prosody inside */
  const kootriTitle = sectionTitle(meta);
  html += `<div class="content-box">`;
  if (kootriTitle) html += `<div class="content-heading">${kootriTitle}</div>`;

  if (state.displayMap?.section) {
    state.displayMap.section.forEach(d => {
      if (d?.text && !isAdivaravu(d))
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
  // has recorded/split audio (see SECTION_META above).
  if (meta) {
    html += buildMiniAudioControls("pasuramAudio_" + globalNo, meta.pasuramSrc);
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
  return `<div class="kootrirukkai-container" data-recital-type="pasuram" data-recital-id="${globalNo}" data-global-no="${globalNo}">${html}</div>`;
}

/* ================= RECITAL ================= */

function openRecital() {
  const sectionId = window.state?.selectedSectionId || "";
  window.open(`recital.html?section=${sectionId}`, "_blank");
}