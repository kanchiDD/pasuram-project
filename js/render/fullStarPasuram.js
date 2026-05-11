// =============================================================
// fullStarPasuram.js  →  js/render/fullStarPasuram.js
// Star-wise (நட்சத்திர) Pasuram Recital — Full 4000 only
//
// Data from entity_master has TWO types per star:
//
//  section → entire section included (e.g. கேட்டை → sections 7,8)
//  pathu   → only those pathus from their section
//            (e.g. ஸ்வாதி → pathus 30-43 from section 11)
//
// When a section appears in BOTH types, section tag wins
// (full section, no pathu filter).
//
// Render pipeline mirrors testFullThousand.js exactly:
//   fetchThaniyan() → fetchPasuram() → renderPasuram()
// Global thaniyan shown once, section thaniyan once per section.
// =============================================================

import { state }                       from "../state.js";
import { fetchThaniyan, fetchPasuram } from "../api.js";
import { renderPasuram }               from "./pasuram_full.js";
import { getThaniyanHTML }             from "../thaniyanController.js";
import { renderMadal, renderKootrirukkai } from "./special.js";

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

// ── 27 Stars in traditional order ────────────────────────────
export const STARS = [
  "அஸ்வினி","பரணி","கார்த்திகை","ரோகினி","மிருகசீர்ஷம்",
  "திருவாதிரை","புனர்பூசம்","புனர்வஸு","பூசம்","ஆயில்யம்",
  "மகம்","பூரம்","உத்திரம்","ஹஸ்தம்","சித்திரை",
  "ஸ்வாதி","விசாகம்","அனுஷம்","கேட்டை","மூலம்",
  "பூராடம்","உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்",
  "பூரட்டாதி","உத்திரட்டாதி","ரேவதி"
];

const SKIP_THANIYAN = [2, 12, 13];

// ── CSS ───────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("fstar-style")) return;
  const s = document.createElement("style");
  s.id = "fstar-style";
  s.textContent = `
    .fstar-page {
      background:#fff;max-width:700px;margin:0 auto;
      padding:20px 14px 100px;
      font-family:"Noto Sans Tamil","Latha","Bamini",serif;
      font-size:var(--base-font,18px);
    }
    .fstar-title {
      text-align:center;font-size:22px;font-weight:900;
      color:#4a2c00;margin-bottom:4px;
    }
    .fstar-subtitle {
      text-align:center;font-size:14px;color:#8a6a30;
      margin-bottom:8px;
    }
    .fstar-divider {
      width:120px;height:2px;background:#b38b2e;
      margin:8px auto 20px;
    }
    .fstar-select-wrap {
      display:flex;justify-content:center;margin-bottom:24px;
    }
    .fstar-select {
      font-family:"Noto Sans Tamil","Latha","Bamini",serif;
      font-size:15px;padding:8px 14px;border-radius:8px;
      border:2px solid #b38b2e;background:#fffdf5;
      color:#4a2c00;cursor:pointer;min-width:220px;
    }
    .fstar-empty {
      text-align:center;padding:40px;color:#aaa;font-size:15px;
    }
    .fstar-spinner {
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;min-height:50vh;
    }
    .fstar-lotus {
      font-size:48px;animation:fstar-spin 1.6s linear infinite;
    }
    @keyframes fstar-spin {
      0%  {transform:rotate(0deg)   scale(1);}
      50% {transform:rotate(180deg) scale(1.1);}
      100%{transform:rotate(360deg) scale(1);}
    }
    .fstar-loading-text {
      margin-top:14px;font-size:15px;color:#7a5a20;
    }
    .fstar-float-nav {
      position:fixed;bottom:20px;right:12px;
      display:flex;flex-direction:column;gap:8px;z-index:999;
    }
    .fstar-float-nav button {
      width:44px;height:44px;border-radius:50%;
      border:2px solid #b38b2e;background:#fff;
      color:#4a2c00;font-size:18px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.15);
    }
  `;
  document.head.appendChild(s);
}

export function starSpinner() {
  return `<div class="fstar-spinner">
    <div class="fstar-lotus">🪷</div>
    <div class="fstar-loading-text">Contents Loading...</div>
  </div>`;
}

function floatNav() {
  return `<div class="fstar-float-nav">
    <button onclick="window.location.href='tree.html'">🏠</button>
    <button onclick="window.scrollTo({top:0,behavior:'smooth'})">⬆</button>
    <button onclick="window.scrollBy({top:-window.innerHeight*.85,behavior:'smooth'})">◀</button>
    <button onclick="window.scrollBy({top:window.innerHeight*.85,behavior:'smooth'})">▶</button>
    <button onclick="window._fstarFont(2)">A+</button>
    <button onclick="window._fstarFont(-2)">A-</button>
  </div>`;
}

window._fstarFont = function(delta) {
  const root = document.documentElement;
  const cur  = parseFloat(root.style.getPropertyValue('--base-font')) || 18;
  const next = cur + delta;
  if (next < 12) return;
  root.style.setProperty('--base-font', next + 'px');

  const selector = [
    '.fstar-page .pasuram-line',
    '.fstar-page .display-item',
    '.fstar-page .prabandham-header',
    '.fstar-page .line1',
    '.fstar-page .line2',
    '.fstar-page .line3-bold',
    '.fstar-page .prosody',
    '.fstar-page .section-close',
    '.fstar-page .section-final-ending',
    '.fstar-page .thaniyan-border *'
  ].join(',');

  document.querySelectorAll(selector).forEach(el => {
    const cur = parseFloat(el.style.getPropertyValue('font-size')) ||
                parseFloat(window.getComputedStyle(el).fontSize) || 15;
    el.style.setProperty('font-size', (cur + delta) + 'px', 'important');
  });
};

function selectorHtml(selected) {
  const opts = STARS.map(s =>
    `<option value="${s}" ${s === selected ? "selected" : ""}>${s}</option>`
  ).join("");
  return `<div class="fstar-select-wrap">
    <select class="fstar-select" onchange="window._fstarSwitch(this.value)">
      <option value="">— Select the Star —</option>
      ${opts}
    </select>
  </div>`;
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export async function renderFullStarPasuram(starName) {
  injectCSS();

  window._fstarSwitch = function(star) {
    if (!star) return;
    const app = document.getElementById("app");
    if (app) app.innerHTML = starSpinner();
    renderFullStarPasuram(star).then(html => {
      if (app) app.innerHTML = html;
    });
  };

  if (!starName) {
    return `<div class="fstar-page">
      <div class="fstar-title">நட்சத்திர பாசுரங்கள்</div>
      <div class="fstar-subtitle">Star-wise Pasuram Recital</div>
      <div class="fstar-divider"></div>
      ${selectorHtml(null)}
      <div class="fstar-empty">🌟 Please Select the Star</div>
    </div>${floatNav()}`;
  }

  // ── Fetch all entity types for this star ─────────────────────
  let data = { pathus:[], sections:[], thirumozhi:[], pasurams:[] };
  try {
    data = await fetch(
      `${API}/star-pasuram?star=${encodeURIComponent(starName)}`
    ).then(r => r.json());
  } catch(e) {}

  const hasAny = data.pathus.length || data.sections.length ||
                 data.thirumozhi.length || data.pasurams.length;

  if (!hasAny) {
    return `<div class="fstar-page">
      <div class="fstar-title">நட்சத்திர பாசுரங்கள்</div>
      <div class="fstar-divider"></div>
      ${selectorHtml(starName)}
      <div class="fstar-empty">${starName} NO- Star Pasurams</div>
    </div>${floatNav()}`;
  }

  // ── Build section plan ────────────────────────────────────────
  const plan = new Map();

  function ensureSec(section_id, section_name) {
    if (!plan.has(section_id)) {
      plan.set(section_id, {
        name: section_name || "",
        fullSection: false,
        pathuIds:  new Set(),
        thiruIds:  new Set(),
        globalNos: new Set()
      });
    }
    return plan.get(section_id);
  }

  // Full sections — highest priority
  for (const r of data.sections)   { ensureSec(r.section_id, r.section_name).fullSection = true; }
  // Pathu — only if section not full
  for (const r of data.pathus)     { const s = ensureSec(r.section_id, r.section_name); if (!s.fullSection) s.pathuIds.add(r.id); }
  // Thirumozhi — only if section not full
  for (const r of data.thirumozhi) { const s = ensureSec(r.section_id, r.section_name); if (!s.fullSection) s.thiruIds.add(r.thirumozhi_id); }
  // Individual pasurams — only if section not full
  for (const r of data.pasurams)   { const s = ensureSec(r.section_id, r.section_name); if (!s.fullSection) s.globalNos.add(r.global_no); }

  const sectionIds = [...plan.keys()].sort((a, b) => a - b);

  // ── Render loop ───────────────────────────────────────────────
  let html = "";
  let globalThaniyanShown = false;
  const context = { thousandId: null, globalTracker: {} };

  for (const secId of sectionIds) {
    const secPlan = plan.get(secId);
    state.selectedSectionId   = secId;
    state.selectedSectionName = secPlan.name;

    if (!SKIP_THANIYAN.includes(secId)) await fetchThaniyan();

    
    await fetchPasuram();

    if (
  !state.pasuramData?.length &&
  ![21,22,23].includes(Number(secId))
) continue;

    // Filter pasurams
    let filtered = state.pasuramData;
    if (!secPlan.fullSection) {
      if (secPlan.pathuIds.size)  filtered = filtered.filter(p => secPlan.pathuIds.has(p.pathu_id));
      if (secPlan.thiruIds.size)  filtered = filtered.filter(p => secPlan.thiruIds.has(p.thirumozhi_id));
      if (secPlan.globalNos.size) {
        const indiv = state.pasuramData.filter(p => secPlan.globalNos.has(p.global_no));
        const seen  = new Set(filtered.map(p => p.global_no));
        filtered = [...filtered, ...indiv.filter(p => !seen.has(p.global_no))].sort((a,b) => a.global_no - b.global_no);
      }
    }
    if (
  !filtered.length &&
  ![21,22,23].includes(Number(secId))
) continue;

   

    const origData     = state.pasuramData;
    const origFiltered = state.filteredPasuram;
    state.pasuramData     = filtered;
    state.filteredPasuram = filtered;

    // ── Global thaniyan ONCE ──────────────────────────────────
    if (!globalThaniyanShown && !SKIP_THANIYAN.includes(secId)) {
      const all        = state.thaniyanData?.data || state.thaniyanData?.rows || state.thaniyanData || [];
      const globalOnly = all.filter(t => t.type === "global");
      if (globalOnly.length) {
        const saved = state.thaniyanData;
        state.thaniyanData = globalOnly;
        html += `<div class="thaniyan-border">${getThaniyanHTML({ id: secId }, state, context)}</div>`;
        state.thaniyanData = saved;
      }
      globalThaniyanShown = true;
    }

    // ── Section thaniyan once per section ─────────────────────
    if (!SKIP_THANIYAN.includes(secId)) {
      const all     = state.thaniyanData?.data || state.thaniyanData?.rows || state.thaniyanData || [];
      const secOnly = all.filter(t => t.type === "section");
      if (secOnly.length) {
        const saved = state.thaniyanData;
        state.thaniyanData = secOnly;
        html += `<div class="thaniyan-border">${getThaniyanHTML({ id: secId }, state, context)}</div>`;
        state.thaniyanData = saved;
      }
    }


if ([22, 23].includes(Number(secId))) {

  try {

    state.specialData ??= {};
    state.specialData[secId] = await fetch(
      `${API}/madal?section_id=${secId}`
    ).then(r => r.json());

    console.log("MADAL DATA", state.specialData);

  } catch (e) {

    console.error(e);

  }

}
else if (Number(secId) === 21) {

  try {

    state.specialData ??= {};
    state.specialData[secId] = await fetch(
      `${API}/kootrirukkai?section_id=21`
    ).then(r => r.json());

    console.log("KOOTRIRUKKAI DATA", state.specialData);

  } catch (e) {

    console.error(e);

  }

}

const savedThaniyan = state.thaniyanData;
state.thaniyanData = [];

if (Number(secId) === 21) {

  const saved = state.thaniyanData;
  state.thaniyanData = [];

  html += `<div class="content-border">
    ${renderKootrirukkai(state.specialData[secId])}
  </div>`;

  state.thaniyanData = saved;

} else if ([22,23].includes(Number(secId))) {

  const saved = state.thaniyanData;
  state.thaniyanData = [];

  html += `<div class="content-border">
    ${renderMadal(state.specialData[secId])}
  </div>`;

  state.thaniyanData = saved;

} else {
  state.isPartialStarRender = !secPlan.fullSection;
  html += `<div class="content-border">
    ${renderPasuram()}
  </div>`;
  state.isPartialStarRender = false;
}

state.thaniyanData = savedThaniyan;


    state.pasuramData     = origData;
    state.filteredPasuram = origFiltered;
  }


  if (!html) {
    return `<div class="fstar-page">
      <div class="fstar-title">நட்சத்திர பாசுரங்கள்</div>
      <div class="fstar-divider"></div>
      ${selectorHtml(starName)}
      <div class="fstar-empty">${starName} — No Pasuram's found</div>
    </div>${floatNav()}`;
  }

  return `<div class="fstar-page">
    <div class="fstar-title">நட்சத்திர பாசுரங்கள்</div>
    <div class="fstar-subtitle">${starName} நட்சத்திரம்</div>
    <div class="fstar-divider"></div>
    ${selectorHtml(starName)}
    ${html}
    <div style="text-align:center;color:#b38b2e;font-size:18px;letter-spacing:5px;margin:30px 0 16px;">❖ ❖ ❖ ❖ ❖</div>
  </div>${floatNav()}`;
}
