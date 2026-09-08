import { state } from "./state.js";
import { t as uiText } from "./utils/uiStrings.js";
import { getKoilThirumozhi, getKoilThiruvaimozhi } from "./utils/sectUtils.js";
import { fetchThaniyan, fetchPasuram } from "./api.js";
import { render } from "./render/layout.js";
// ADD this import (alongside existing api.js imports)
import { renderPasuramSplit } from "./render/pasuram_full.js";
import { playUrls, sectionAudioUrls, globalThaniyanUrls } from "./render/globalAudio.js";

let koilRendered = false; // 🔒 prevents loop

export async function renderKoil(type) {

  koilRendered = false;

  // 🔁 RESET
  window._lastPathu = null;
  window._lastThiru = null;
  window._sectionClosingDone = {};

  state.pasuramData = null;
  state.thaniyanData = null;

  // ✅ SECTION
  const sectionId = type === "THIRUMOZHI" ? 11 : 26;
  state.selectedSectionId = sectionId;

  // ✅ TITLE
  state.koilTitle =
    sectionId === 11
      ? "கோயில் திருமொழி"
      : "கோயில் திருவாய்மொழி";

  state.isKoilMode = true;
  // 🔥 LOAD DATA
  await fetchThaniyan();
  await fetchPasuram();
  const pasurams = state.pasuramData || [];

  // 🔥 FILTER — shared DB source of truth (entity_master koil tags),
  // same tags recitalworker / azhwar-recital / NNC resolve from.
  // sectUtils hardcoded lists remain ONLY as a fallback if the fetch
  // fails (offline / worker down) — behavior then identical to before.
  const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";
  let koilPathuSet;
  try {
    const sect = localStorage.getItem("sect") || "T";
    const res  = await fetch(
      `${API}/koil-pathus?sub=${type === "THIRUMOZHI" ? "THIRUMOZHI" : "THIRUVAIMOZHI"}&sect=${sect}`
    ).then(r => r.json());
    koilPathuSet = new Set(res.pathu_ids || []);
    if (!koilPathuSet.size) throw new Error("empty koil tag result");
  } catch (e) {
    console.warn("koil-pathus fetch failed — using sectUtils fallback", e);
    const koilList = type === "THIRUMOZHI"
      ? getKoilThirumozhi()
      : getKoilThiruvaimozhi();
    koilPathuSet = new Set(koilList.map(k => k.pathuId));
  }

  state.pasuramData = pasurams.filter(p =>
    koilPathuSet.has(p.pathu_id)
  );

  // ✅ NORMAL RENDER
  // AFTER
state.level = "PASURAM";

const { thaniyanHtml, bodyHtml } = renderPasuramSplit();

const closing =
  state.selectedSectionId === 11
    ? "கோயில் திருமொழி முற்றிற்று"
    : "கோயில் திருவாய்மொழி முற்றிற்று";

// Show site floating nav (from css.js)
document.body.classList.add("show-nav");

// ── Play All (koil is Play-All only — no per-pasuram buttons) ──
// Queue = pothu thaniyan (sect/madam aware) + this section's thaniyan
// and the koil-filtered pasurams, in render order. Files not yet
// uploaded are skipped by the player's onerror, so newly added audio
// works with no code change.
const _sect    = localStorage.getItem("sect") || "T";
const _subsect = localStorage.getItem("subsect") || "";
const _koilBody = sectionAudioUrls(sectionId, state.thaniyanData, state.pasuramData);
const _koilQueue = _koilBody.length
  ? [...globalThaniyanUrls(_sect, _subsect), ..._koilBody]
  : [];
window._koilPlayAll = () => { if (_koilQueue.length) playUrls(_koilQueue, state.koilTitle); };

const _koilPlayBtn = _koilQueue.length ? `
  <div style="text-align:center;margin:4px 0 14px;">
    <button onclick="window._koilPlayAll && window._koilPlayAll()"
      style="background:linear-gradient(135deg,#2f7d32,#1b5e20);color:#fff;border:none;
             border-radius:20px;padding:9px 20px;font-size:13px;font-weight:700;
             cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.2)">${uiText("playAll")}</button>
  </div>` : "";

document.getElementById("app").innerHTML = `
  <style>
    /* Koil view is Play-All only — hide the per-pasuram / per-thaniyan
       play BUTTONS that pasuram_full.js renders, scoped to #koil-view so
       every other view keeps its individual buttons.
       NOTE: .ga-numline must stay visible — it wraps the pasuram NUMBER
       (the play button sits inside it), so hiding it would blank out the
       global_no of every pasuram. */
    #koil-view .ga-btn,
    #koil-view .ga-center { display:none !important; }
  </style>

  <div id="koil-view">
    <div class="section-heading">${state.koilTitle}</div>

    <div id="koil-play-wrap">${_koilPlayBtn}</div>

    <div class="thaniyan-block">
      ${thaniyanHtml}
    </div>

    <div class="pasuram-block">
      ${bodyHtml}
    </div>

    <div class="section-close">${closing}</div>
  </div>
`;

// applyKoilUI() is now retired for koil path — no DOM surgery needed
}


/* =========================
   🔥 SAFE UI APPLY
========================= */

function applyKoilUI() {

  if (koilRendered) return;
  koilRendered = true;

  const root = document.getElementById("app");
  if (!root) return;

  // 🔥 STEP 1: FIND THAN IYAN IN REAL DOM
  const thaniyan = root.querySelector(".thaniyan-container");

  let thaniyanHTML = "";

  if (thaniyan) {
    thaniyanHTML = thaniyan.outerHTML;

    // 🔥 MOVE IT OUT (not just remove)
    thaniyan.parentNode.removeChild(thaniyan);
  }

  // 🔥 STEP 2: NOW CONTENT IS CLEAN
  const contentHTML = root.innerHTML;

  const closing =
    state.selectedSectionId === 11
      ? "கோயில் திருமொழி முற்றிற்று"
      : "கோயில் திருவாய்மொழி முற்றிற்று";

  // 🔥 STEP 3: REBUILD CLEAN STRUCTURE
  root.innerHTML = `
    
    <div class="section-heading">
      ${state.koilTitle}
    </div>

    ${thaniyanHTML ? `
      <div class="thaniyan-border">
        ${thaniyanHTML}
      </div>
    ` : ""}

    <div class="content-border">
      ${contentHTML}
    </div>

    <div class="section-close">
      ${closing}
    </div>

  `;
}

// Floating nav handled by css.js (site-wide)