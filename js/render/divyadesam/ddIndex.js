// =============================================================
// ddIndex.js  →  js/render/divyadesam/ddIndex.js
// Main router for all Divyadesam views
// Imported by fullDivyadesam.js only
// =============================================================

import {
  injectDDCSS, injectDisplayCSS, initFontAdjuster,
  ddSpinner, ddFloatNav, THOUSAND_NAMES, AZHWARS,
  SECTION_TO_THOUSAND, DESAM_TOTAL, GRAND_TOTAL,
  API_DD, friendlyLabel
} from "./ddCore.js";

import { renderDesamList, renderDesamDetail } from "./ddByDesam.js";
import { renderAzhwarList, renderAzhwarDetail } from "./ddByAzhwar.js";
import { renderFilterList, renderFilterResult  } from "./ddFilter.js";
import { renderSpecialMenu, renderSpecialGroup  } from "./ddSpecial.js";

// ── Cached list of all desams (fetched once) ──────────────────────────────────
let _allDesams = null;
async function getAllDesams() {
  if (!_allDesams) _allDesams = await fetch(`${API_DD}?sub=list`).then(r => r.json());
  return _allDesams;
}

// ── Register all window handlers ──────────────────────────────────────────────
function registerHandlers(thousandId) {

  // ── main view router ────────────────────────────────────────────────────────
  window.ddView = async function(view, page = 0) {
    const content = document.getElementById("fdd-content");
    if (content) content.innerHTML = ddSpinner();

    if (view === "desam") {
      const all = await getAllDesams();
      if (content) content.innerHTML = renderDesamList(all, thousandId, page, "ddDesamPage");

    } else if (view === "azhwar") {
      if (content) content.innerHTML = renderAzhwarList(thousandId, page);

    } else if (view === "mandalam" || view === "state" || view === "district") {
      // renderFilterList sets content.innerHTML directly
      renderFilterList(view, thousandId, page);

    } else if (view === "special") {
      if (content) content.innerHTML = renderSpecialMenu();
    }

    window.scrollTo({ top: document.getElementById("fdd-content")?.offsetTop || 0, behavior: "smooth" });
  };

  // ── pagination callbacks ─────────────────────────────────────────────────────
  window.ddDesamPage = async (p) => {
    const all = await getAllDesams();
    const content = document.getElementById("fdd-content");
    if (content) content.innerHTML = renderDesamList(all, thousandId, p, "ddDesamPage");
  };

  window.ddAzhwarPage = (p) => {
    const content = document.getElementById("fdd-content");
    if (content) content.innerHTML = renderAzhwarList(thousandId, p);
  };

  window.ddFilterPage_mandalam = (p) => { renderFilterList("mandalam", thousandId, p); };
  window.ddFilterPage_state    = (p) => { renderFilterList("state",    thousandId, p); };
  window.ddFilterPage_district = (p) => { renderFilterList("district", thousandId, p); };

  // ── open one desam detail ────────────────────────────────────────────────────
  window.ddOpenDesam = (desamId) => renderDesamDetail(desamId, thousandId);

  // ── open one azhwar detail ───────────────────────────────────────────────────
  window.ddOpenAzhwar = (authorId) => renderAzhwarDetail(authorId, thousandId);

  // ── filter pick callback ─────────────────────────────────────────────────────
  window.ddPickFilter = (filterType, value) => renderFilterResult(filterType, value, thousandId);

  // ── special group callbacks ──────────────────────────────────────────────────
  window.ddOpenSpecial = (groupKey) => renderSpecialGroup(groupKey, thousandId);
}

// ── Build the dynamic menu based on available data ───────────────────────────
async function buildMenu(thousandId) {
  const all = await getAllDesams();

  // count relevant desams for this thousand
  const relevant = all.filter(d =>
    !thousandId || (d.thousand_ids || []).includes(Number(thousandId))
  );

  const t = Number(thousandId);
  const hasDesams   = relevant.length > 0;
  const hasAzhwars  = AZHWARS.some(a =>
    !thousandId || a.sections.some(s => SECTION_TO_THOUSAND[s] === t)
  );
  const hasSpecial  = !thousandId || t === 2 || t === 4;

  const btn = (icon, label, sub, view) =>
    `<div class="dd-menu-btn" onclick="ddView('${view}')">
      <span class="dd-menu-icon">${icon}</span>${label}
      <div class="dd-menu-sub">${sub}</div>
    </div>`;

  const countLabel = thousandId
    ? `${relevant.length} Desams`
    : `All 108 · ${GRAND_TOTAL} Pasurams`;

  // Mandalam/State/District/Special only in full 4000 (not per-thousand)
  return [
    hasDesams              ? btn("🛕", "By Divyadesam",  countLabel,              "desam")    : "",
    hasAzhwars             ? btn("🙏", "By Azhwar",      "Select an Azhwar",      "azhwar")   : "",
    (!thousandId && hasDesams)  ? btn("🗺️", "By Mandalam",   "Region filter",    "mandalam") : "",
    (!thousandId && hasDesams)  ? btn("📍", "By State",       "State filter",     "state")    : "",
    (!thousandId && hasDesams)  ? btn("🏘️", "By District",   "District filter",  "district") : "",
    (!thousandId && hasSpecial) ? btn("⭐",  "Special Groups", "Thirunangur · Nava...", "special") : ""
  ].filter(Boolean).join("");
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function renderDivyadesamIndex(selectedThousandId = null) {
  injectDDCSS();
  injectDisplayCSS();
  initFontAdjuster();
  registerHandlers(selectedThousandId);

  const thousandName = selectedThousandId
    ? (THOUSAND_NAMES[selectedThousandId] || "")
    : "நாலாயிர திவ்யப்பிரபந்தம்";

  const menuHtml = await buildMenu(selectedThousandId);

  return `
    <div class="dd-page">
      <div class="dd-page-title">${thousandName}</div>
      <div class="dd-page-sub">Divya Desam Pasurams</div>
      <div class="dd-divider"></div>
      <div class="dd-menu-grid">${menuHtml}</div>
      <div id="fdd-content"></div>
    </div>
    ${ddFloatNav()}`;
}
