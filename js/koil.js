import { state } from "./state.js";
import { fetchThaniyan, fetchPasuram, fetchEntitySearch } from "./api.js";
import { render } from "./render/layout.js";
// ADD this import (alongside existing api.js imports)
import { renderPasuramSplit } from "./render/pasuram_full.js";

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
  await fetchEntitySearch();

  const pasurams = state.pasuramData || [];
  const entity = state.entitySearchData || [];

  // 🔥 FILTER
  const koilPathuSet = new Set(
    entity
      .filter(e =>
        e.meta_key === "tag" &&
        e.meta_value &&
        e.meta_value.trim() === state.koilTitle.trim() &&
        e.entity_type === "pathu"
      )
      .map(e => Number(e.entity_id))
  );

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

document.getElementById("app").innerHTML = `
  <div class="section-heading">${state.koilTitle}</div>

  <div class="thaniyan-block">
    ${thaniyanHtml}
  </div>

  <div class="pasuram-block">
    ${bodyHtml}
  </div>

  <div class="section-close">${closing}</div>

  ${renderFloatingNav("KOIL")}
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

    ${renderFloatingNav("KOIL")}
  `;
}

/* =========================
   🔥 FLOATING NAV
========================= */

function renderFloatingNav(mode = "FULL") {

  const showIndex = mode !== "KOIL";

  return `
    <div id="floating-nav" style="
      position:fixed;
      bottom:20px;
      right:20px;
      display:flex;
      flex-direction:column;
      gap:10px;
      z-index:999;
    ">

      <button onclick="goHome()">🏠<br><small>Home</small></button>

      ${
        showIndex
          ? `<button onclick="goIndex()">📑<br><small>Index</small></button>`
          : ""
      }

      <button onclick="goPrevPage()">◀️<br><small>Up</small></button>
      <button onclick="goNextPage()">▶️<br><small>Down</small></button>

      <button onclick="increaseFont()">A+<br><small>Zoom In</small></button>
      <button onclick="decreaseFont()">A-<br><small>Zoom Out</small></button>

    </div>
  `;
}