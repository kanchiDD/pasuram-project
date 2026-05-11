// =============================================================
// ddFilter.js — Mandalam / State / District (full 4000 only)
// Uses native dropdown <select> for mobile-friendly UX
// =============================================================

import {
  API_DD, DESAM_TOTAL, AZHWARS, SECTION_TO_THOUSAND,
  friendlyLabel, ddSpinner
} from "./ddCore.js";

// ── Render filter with native dropdown ────────────────────────────────────────
export async function renderFilterList(filterType, thousandId, page) {
  const content = document.getElementById("fdd-content");
  if (!content) return;

  const res = await fetch(`${API_DD}?sub=filters`).then(r => r.json());
  const rawItems = filterType === "mandalam" ? res.regions
                 : filterType === "state"    ? res.states
                 : res.districts;

  const labels = { mandalam:"Mandalam", state:"State", district:"District" };
  const label  = labels[filterType] || filterType;

  const options = rawItems.map(v =>
    `<option value="${v}">${friendlyLabel(v) || v}</option>`
  ).join("");

  content.innerHTML = `
    <div class="dd-list-box">
      <div class="dd-list-heading">Filter by ${label}</div>
      <div style="padding:8px 0;">
        <select id="dd-filter-select"
          style="width:100%;padding:10px 12px;font-size:15px;font-family:'Latha','Bamini',serif;
                 border:2px solid #b38b2e;border-radius:8px;background:#fff;color:#2a1a00;
                 -webkit-appearance:none;appearance:none;cursor:pointer;"
          onchange="ddPickFilter('${filterType}', this.value)">
          <option value="">— Select a ${label} —</option>
          ${options}
        </select>
      </div>
    </div>`;
}

// ── Render desam list for a chosen filter value ───────────────────────────────
export async function renderFilterResult(filterType, value, thousandId) {
  if (!value) return;
  const content = document.getElementById("fdd-content");
  if (content) content.innerHTML = ddSpinner();

  const subMap   = { mandalam:"by-region", state:"by-state", district:"by-district" };
  const paramMap = { mandalam:"region",    state:"state",     district:"district"    };

  const res = await fetch(
    `${API_DD}?sub=${subMap[filterType]}&${paramMap[filterType]}=${encodeURIComponent(value)}`
  ).then(r => r.json());

  const back = `<div class="dd-back" onclick="ddView('${filterType}')">◀ Back to ${value}</div>`;
  const desams = Array.isArray(res) ? res : [];

  if (!desams.length) {
    if (content) content.innerHTML = back +
      `<div style="text-align:center;padding:20px;color:#aaa;">No Divyadesams found</div>`;
    return;
  }

  const listHtml = desams.map(d => {
    const count = DESAM_TOTAL[d.divyadesam_id] || 0;
    const deity = [d.perumal_name, d.thayar_name].filter(Boolean).join(" | ");
    return `
      <div class="dd-list-item" onclick="ddOpenDesam(${d.divyadesam_id})">
        <div style="text-align:left;">
          <span class="dd-list-name" style="font-size:14px;">${d.canonical_name}</span>
          <span class="dd-list-count" style="font-size:11px;">(${count})</span>
        </div>
        ${deity ? `<div class="dd-list-sub" style="font-size:11px;text-align:left;">${deity}</div>` : ""}
      </div>`;
  }).join("");

  const displayVal = friendlyLabel(value) || value;
  if (content) content.innerHTML = back + `
    <div class="dd-list-box">
      <div class="dd-list-heading" style="text-align:left;font-size:13px;">${displayVal} — ${desams.length} Desam${desams.length>1?"s":""}</div>
      ${listHtml}
    </div>`;
}
