// =====================================================
// newSpecial.js  →  js/render/newSpecial.js
// Used ONLY by newPasuram.js (sections 21/22/23).
// Original special.js untouched — all other callers safe.
// =====================================================

import { state } from "../state.js";
import { renderThaniyan } from "./newThaniyan.js";
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

// Only sections listed here have actual split/recorded audio files.
// Sections NOT in this map get NO audio controls at all — this
// prevents the wrong section's audio being wired in by mistake.
const SECTION_AUDIO_MAP = {
  "திருவெழுகூற்றிருக்கை": {
    thaniyanSrc: "https://audio.arulicheyal.org/thiruvezhukkootrirukkai_thaniyan_1.mp3",
    pasuramSrc:  "https://audio.arulicheyal.org/thiruvezhukkootrirukkai_pasuram_2672.mp3"
  },
  "சிறியதிருமடல்":{
    thaniyanSrc: "https://audio.arulicheyal.org/siriyathirumadal_thaniyan_1.mp3",
    pasuramSrc:  "https://audio.arulicheyal.org/siriyathirumadal_pasuram_2673_v2.mp3"
  }
   
  // சிறியதிருமடல் (2673) and பெரியதிருமடல் (2674) — no split audio
  // yet. Add entries here once those are recorded, split, and
  // uploaded to R2 (same audio.arulicheyal.org pattern).
};

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
        <button type="button" title="Play"
          onclick="document.getElementById('${audioId}').play()"
          style="${btnStyle}background:#3cb043;">▶</button>
        <span style="${labelStyle}">Play</span>
      </div>
      <div style="${groupStyle}">
        <button type="button" title="Stop"
          onclick="var a=document.getElementById('${audioId}');a.pause();a.currentTime=0;"
          style="${btnStyle}background:#555;">■</button>
        <span style="${labelStyle}">Stop</span>
      </div>
      <div style="${groupStyle}">
        <button type="button" title="Mute"
          onclick="var a=document.getElementById('${audioId}');a.muted=!a.muted;this.textContent=a.muted?'🔇':'🔊';"
          style="${btnStyle}background:#777;">🔊</button>
        <span style="${labelStyle}">Mute</span>
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
      const sectionAudio = SECTION_AUDIO_MAP[state.selectedSectionName];

      if (sectionRows.length > 0) {
        const thaniyanControls = sectionAudio
          ? buildMiniAudioControls("thaniyanAudio_" + globalNoMap[state.selectedSectionName], sectionAudio.thaniyanSrc)
          : "";
        html += renderThaniyan(sectionRows, state.prosodyMap, thaniyanControls);
      }

      if (globalRows.length === 0 && sectionRows.length === 0) {
        const fallbackControls = sectionAudio
          ? buildMiniAudioControls("thaniyanAudio_" + globalNoMap[state.selectedSectionName], sectionAudio.thaniyanSrc)
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
  const madalSectionAudio = SECTION_AUDIO_MAP[sectionName];
  if (madalSectionAudio) {
    html += buildMiniAudioControls("pasuramAudio_" + globalNo, madalSectionAudio.pasuramSrc);
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
  const kootriSectionAudio = SECTION_AUDIO_MAP[sectionName];
  if (kootriSectionAudio) {
    html += buildMiniAudioControls("pasuramAudio_" + globalNo, kootriSectionAudio.pasuramSrc);
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