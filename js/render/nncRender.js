// nncRender.js — content renderers using exact fullDualRecital.js patterns
import { renderThaniyan } from "./thaniyan.js";
import { t as uiText } from "../utils/uiStrings.js";
import { c, sectionTitle } from "../utils/contentStrings.js";
import { isAdivaravu } from "../utils/displayTags.js";
import { buildMadalCoupletsHTML } from "./madalKootrirukkaiCore.js";
import {
  fetchDisplayData, fetchThaniyanWithProsody,
  renderSectionDisplayItems, renderSectionProsody, renderAdivaravu,
  buildPasuramDisplayMap, buildThirumozhiDisplayMap, buildPathuDisplayMap
} from "./displayHelper.js";

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

const SKIP_THANIYAN_SECTIONS = new Set([
  1, 3, 7, 8, 9, 10, 12, 13, 24, 25,
  // Desika Prabandham sections (32-51) — each has its own explicit
  // 'thaniyan' sequence row, so renderSection must NOT fetch/render
  // its own thaniyan box again (was causing duplicate thaniyan display)
  32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, 45, 46, 47, 48, 49, 50, 51
]);



// ── Local pathu display parser ────────────────────────────────────────────────
function buildNNCPathuMap(displayData) {
  const map = new Map();
  if (!displayData?.pathu) return map;
  for (const [key, items] of Object.entries(displayData.pathu)) {
    if (!Array.isArray(items) || !items.length) continue;
    const displayHtml = items
      .filter(d => d?.text && !isAdivaravu(d))
      .map(d => `<div class="dh-thirumozhi-display">${d.text}</div>`)
      .join("");
    const adivaravuHtml = items
      .filter(d => d?.text && isAdivaravu(d))
      .map(d => `<div class="dh-adivaravu">${d.text}</div>`)
      .join("");
    map.set(String(key), { displayHtml, adivaravuHtml });
  }
  return map;
}

// ── Fetch pasurams ────────────────────────────────────────────────────────────
export async function fetchPasurams(params) {
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const data = await fetch(`${API}/pasuram?${qs}`).then(r => r.json());
  return Array.isArray(data) ? data : [];
}

// ── Render lines with group gaps ──────────────────────────────────────────────
function renderLinesWithGroups(lines, isDual = false) {
  if (!Array.isArray(lines) || !lines.length) return "";
  let html = "", lastGroup = null, isFirst = true;
  for (const l of lines) {
    const g = l.group ?? 1;
    const text = typeof l === "string" ? l : (l?.text || "");
    if (lastGroup !== null && g !== lastGroup) html += `<div class="nnc-group-gap"></div>`;
    const prefix = (isDual && isFirst) ? "** " : "";
    html += `<div class="nnc-line">${prefix}${text}</div>`;
    lastGroup = g;
    isFirst = false;
  }
  return html;
}

// ── Render pasurams block ─────────────────────────────────────────────────────
export function renderPasuramBlock(pasurams, pasuramDisplayMap) {
  let html = "";
  for (let i = 0; i < pasurams.length; i++) {
    const p = pasurams[i];
    if (i > 0) html += `<div class="nnc-pasuram-sep"></div>`;
    const displayItem = pasuramDisplayMap?.get?.(String(p.global_no)) || "";
    const isDual = p.double_recital === 1;
    html += `
      <div class="nnc-pasuram-block" data-global-no="${p.global_no}">
        ${displayItem}
        <div class="nnc-global-no">${p.global_no}</div>
        <div class="nnc-lines">${renderLinesWithGroups(p.lines, isDual)}</div>
        <div class="nnc-local-no">${p.local_no ?? ""}</div>
      </div>`;
  }
  return html;
}

// ── Thaniyan box ──────────────────────────────────────────────────────────────
export function renderThaniyanBox(rows, prosodyMap, audioRef) {
  if (!rows || !rows.length) return "";
  const audioAttr = audioRef === "__global__"
    ? 'data-thaniyan-global="1"'
    : (audioRef ? `data-thaniyan-sec="${audioRef}"` : "");
  return `
    <div class="nnc-thaniyan-box" ${audioAttr}>
      <div class="nnc-thaniyan-label">${c("common.thaniyan") || "தனியன்"}</div>
      ${renderThaniyan(rows, prosodyMap)}
    </div>`;
}

// ── Build prosody lookup ──────────────────────────────────────────────────────
function buildProsodyLookup(displayData) {
  const scope  = displayData.prosodyScope  || [];
  const master = displayData.prosodyMaster || [];
  const nameMap = {};
  for (const m of master) nameMap[m.prosody_id] = m.canonical_name_tamil;
  return (globalNo) => {
    const entry = scope.find(s => globalNo >= s.start_global_no && globalNo <= s.end_global_no);
    return entry ? (nameMap[entry.prosody_id] || "") : "";
  };
}

// ── Check if section display items already contain prosody info ───────────────
// If any section display item contains ராகம் or தாளம் — prosody is already shown
// via display items, so skip renderSectionProsody to avoid duplication
function sectionHasProsodyInDisplay(displayData) {
  const items = displayData?.section || [];
  return items.some(d => d?.text && (d.text.includes("ராகம்") || d.text.includes("தாளம்")));
}

// ── Build grouped content ─────────────────────────────────────────────────────
export function buildGroupedContent(pasurams, displayData, isKoil = false) {
  const pdMap  = buildPasuramDisplayMap(displayData);
  const tdMap  = buildThirumozhiDisplayMap(displayData);
  const patMap = buildNNCPathuMap(displayData);
  const getProsody = buildProsodyLookup(displayData);

  const pathuMap = new Map();
  for (const p of pasurams) {
    const pk = p.pathu_id != null ? String(p.pathu_id) : "__none__";
    if (!pathuMap.has(pk)) pathuMap.set(pk, { label: p.pathu_name || "", pathuId: p.pathu_id, thiruMap: new Map() });
    const pm = pathuMap.get(pk);
    const tk = p.thirumozhi_id != null ? String(p.thirumozhi_id) : "__none__";
    if (!pm.thiruMap.has(tk)) {
      pm.thiruMap.set(tk, {
        thiruName:    p.thirumozhi_name    || "",
        subunit:      p.pathu_subunit_name || "",
        thiruHeading: p.thirumozhi_heading || "",
        pasurams: []
      });
    }
    pm.thiruMap.get(tk).pasurams.push(p);
  }

  let html = "";
  for (const [pk, pathu] of pathuMap) {
    const pathuAnchor = isKoil && pathu.pathuId != null
      ? `id="koil-thiru-${pathu.pathuId}"` : "";
    if (pathu.label) {
      html += `<div class="nnc-pathu-heading" ${pathuAnchor}>${pathu.label}</div>`;
    }
    const pathuEntry    = pk !== "__none__" ? (patMap.get(pk) || {}) : {};
    const pathuDispHtml = pathuEntry.displayHtml   || "";
    const adivaravuHtml = pathuEntry.adivaravuHtml || "";
    if (pathuDispHtml) html += pathuDispHtml;

    for (const [tk, thiru] of pathu.thiruMap) {
      const line1 = thiru.thiruName || thiru.subunit || "";
      const line2 = thiru.thiruHeading || "";
      const parts = [line1, line2].filter(Boolean);
      const thiruHead = parts.length
        ? `<div class="nnc-thirumozhi-heading">${parts.join(" — ")}</div>` : "";
      const td = tk !== "__none__" ? (tdMap.get(tk) || {}) : {};
      const firstGno = thiru.pasurams[0]?.global_no;
      const prosodyName = firstGno ? getProsody(firstGno) : "";
      const prosodyHtml = prosodyName
        ? `<div class="dh-prosody">(${prosodyName})</div>` : "";
      const boxAnchor = (isKoil && !pathu.label && pathu.pathuId != null)
        ? `id="koil-thiru-${pathu.pathuId}"` : "";
      html += `
        <div class="nnc-thirumozhi-box" ${boxAnchor}>
          ${thiruHead}
          ${td.displayHtml || ""}
          ${prosodyHtml}
          ${renderPasuramBlock(thiru.pasurams, pdMap)}
          ${td.closingHtml || ""}
        </div>`;
    }
    if (adivaravuHtml) html += adivaravuHtml;
  }
  return html;
}

// ── Render full section ───────────────────────────────────────────────────────
export async function renderSection(refValue, label, anchor) {
  const secId = Number(refValue);
  const skipThaniyan = SKIP_THANIYAN_SECTIONS.has(secId);

  const [pasurams, displayData, thaniyanData] = await Promise.all([
    fetchPasurams({ section_id: refValue }),
    fetchDisplayData(secId),
    skipThaniyan
      ? Promise.resolve({ rows: [], prosodyMap: {} })
      : fetchThaniyanWithProsody(secId)
  ]);
  if (!pasurams.length) return "";

  const thRows = (thaniyanData.rows || []).filter(r => !r.type || r.type === "section");
  thRows._prosodyMap = thaniyanData.prosodyMap || {};

  const thHtml   = renderThaniyanBox(thRows, thRows._prosodyMap, secId);
  const secDisp  = renderSectionDisplayItems(displayData);
  const hasPathu = pasurams.some(p => p.pathu_id != null);

  // Never call renderSectionProsody — API returns ALL prosody entries for every section
  // causing wrong prosody to always appear. Prosody shown correctly:
  // - Sections with display items: already in section[] as '(ராகம் - தாளம்)' with brackets
  // - Pathu/thirumozhi sections: shown per-thirumozhi via buildProsodyLookup
  const prosody = "";

  const closing     = (displayData.sectionClosing || [])[0]?.closing_text || "";
  const sectionAdiv = hasPathu ? "" : renderAdivaravu(displayData);
  const grouped     = buildGroupedContent(pasurams, displayData, false);

  // Ceremonial title by section_id — never by Tamil label
  const heading = sectionTitle(secId, label);

  return `
    ${thHtml}
    <div class="nnc-section-box" ${anchor}>
      <div class="nnc-section-heading">${heading}</div>
      <div class="nnc-section-inner">
        ${secDisp}${prosody}${grouped}${sectionAdiv}
        ${closing ? `<div class="nnc-section-closing">${closing}</div>` : ""}
      </div>
    </div>`;
}

// ── Render pathu ──────────────────────────────────────────────────────────────
const PATHU_SECTION_MAP = { 13: 2, 16: 2, 17: 2, 37: 2, 43: 2 };

export async function renderPathu(refValue, label, anchor) {
  const pathuId = Number(refValue);
  const secId   = PATHU_SECTION_MAP[pathuId] || null;
  if (!secId) return "";

  const allPasurams = await fetchPasurams({ section_id: secId });
  const pasurams    = allPasurams.filter(p => p.pathu_id === pathuId);
  if (!pasurams.length) return "";

  const displayData   = await fetchDisplayData(secId);
  const pdMap         = buildPasuramDisplayMap(displayData);
  const tdMap         = buildThirumozhiDisplayMap(displayData);
  const patMap        = buildNNCPathuMap(displayData);

  const thiruMap = new Map();
  for (const p of pasurams) {
    const tk = p.thirumozhi_id != null ? String(p.thirumozhi_id) : "__none__";
    if (!thiruMap.has(tk)) {
      thiruMap.set(tk, {
        thiruName:    p.thirumozhi_name    || "",
        subunit:      p.pathu_subunit_name || "",
        thiruHeading: p.thirumozhi_heading || "",
        pasurams: []
      });
    }
    thiruMap.get(tk).pasurams.push(p);
  }

  // Section name as main heading, pathu+subunit as sub-heading (separate lines)
  const sectionName   = pasurams[0]?.section_name || label;
  const pathuName     = pasurams[0]?.pathu_name || "";
  const pathuSubunit  = pasurams[0]?.pathu_subunit_name || "";
  const heading       = sectionTitle(secId, sectionName);
  const pathuSubParts = [pathuName, pathuSubunit].filter(Boolean);
  const pathuSubHead  = pathuSubParts.length
    ? `<div class="nnc-thirumozhi-subheading">${pathuSubParts.join(" — ")}</div>`
    : "";

  const pathuEntry    = patMap.get(String(refValue)) || {};
  const pathuDispHtml = pathuEntry.displayHtml   || "";
  const adivaravuHtml = pathuEntry.adivaravuHtml || "";

  let groupHtml = pathuDispHtml;
  for (const [tk, thiru] of thiruMap) {
    const line1 = thiru.thiruName || thiru.subunit || "";
    const line2 = thiru.thiruHeading || "";
    const parts = [line1, line2].filter(Boolean);
    const thiruHead = parts.length
      ? `<div class="nnc-thirumozhi-heading">${parts.join(" — ")}</div>` : "";
    const td = tk !== "__none__" ? (tdMap.get(tk) || {}) : {};
    groupHtml += `
      <div class="nnc-thirumozhi-box">
        ${thiruHead}
        ${td.displayHtml || ""}
        ${renderPasuramBlock(thiru.pasurams, pdMap)}
        ${td.closingHtml || ""}
      </div>`;
  }
  if (adivaravuHtml) groupHtml += adivaravuHtml;

  const closing = (displayData.sectionClosing || [])[0]?.closing_text || "";
  return `
    <div class="nnc-section-box" ${anchor}>
      <div class="nnc-section-heading">${heading}</div>
      ${pathuSubHead}
      <div class="nnc-section-inner">
        ${groupHtml}
        ${closing ? `<div class="nnc-section-closing">${closing}</div>` : ""}
      </div>
    </div>`;
}

// ── Render thirumozhi ─────────────────────────────────────────────────────────
export async function renderThirumozhi(refValue, label, anchor) {
  const [secId, thiruPos] = refValue.split(":");
  const [allPasurams, displayData] = await Promise.all([
    fetchPasurams({ section_id: secId }),
    fetchDisplayData(Number(secId))
  ]);
  const thiruGroups = new Map();
  const thiruOrder  = [];
  for (const p of allPasurams) {
    const tk = String(p.thirumozhi_id || "__");
    if (!thiruGroups.has(tk)) { thiruGroups.set(tk, []); thiruOrder.push(tk); }
    thiruGroups.get(tk).push(p);
  }
  const tk = thiruOrder[Number(thiruPos) - 1];
  if (!tk) return "";
  const thPasurams = thiruGroups.get(tk) || [];
  const pdMap = buildPasuramDisplayMap(displayData);
  const tdMap = buildThirumozhiDisplayMap(displayData);
  const firstP = thPasurams[0];
  const sectionName = firstP?.section_name || label;
  const thiruName   = [firstP?.thirumozhi_name || firstP?.pathu_subunit_name, firstP?.thirumozhi_heading].filter(Boolean).join(" — ");
  const heading = sectionTitle(Number(secId), sectionName);
  const subHeading = thiruName ? `<div class="nnc-thirumozhi-subheading">${thiruName}</div>` : "";
  // For standalone thirumozhi (no pathu), adivaravu is inside thirumozhi items[]
  // Split it out manually so it renders AFTER pasurams not before
  const rawThiruItems = displayData?.thirumozhi?.[tk]?.items || [];
  const thiruDisplayHtml = rawThiruItems
    .filter(d => d?.text && !isAdivaravu(d))
    .map(d => `<div class="dh-thirumozhi-display">${d.text}</div>`)
    .join("");
  const thiruAdivaravuHtml = rawThiruItems
    .filter(d => d?.text && isAdivaravu(d))
    .map(d => `<div class="dh-adivaravu">${d.text}</div>`)
    .join("");

  // Section display items, prosody, closing
  const secDisp  = renderSectionDisplayItems(displayData);
  const getProsody = buildProsodyLookup(displayData);
  const firstGno = thPasurams[0]?.global_no;
  const prosodyName = firstGno ? getProsody(firstGno) : "";
  const prosodyHtml = prosodyName ? `<div class="dh-prosody">(${prosodyName})</div>` : "";
  const closing  = (displayData.sectionClosing || [])[0]?.closing_text || "";
  const adivaravu = thiruAdivaravuHtml;
  const td = tdMap.get(tk) || {};

  return `
    <div class="nnc-section-box" ${anchor}>
      <div class="nnc-section-heading">${heading}</div>
      ${subHeading}
      <div class="nnc-section-inner">
        ${secDisp}
        ${thiruDisplayHtml}
        ${prosodyHtml}
        ${renderPasuramBlock(thPasurams, pdMap)}
        ${td.closingHtml || ""}
        ${adivaravu}
        ${closing ? `<div class="nnc-section-closing">${closing}</div>` : ""}
      </div>
    </div>`;
}

// ── Render single pasuram (annex) ─────────────────────────────────────────────
const ANNEX_PASURAM_MAP = {
  2046: { secId: 12, heading: "திருக்குறுந்தாண்டகம்" },
  2047: { secId: 12, heading: "திருக்குறுந்தாண்டகம்" },
  2498: { secId: 18, heading: "திருவிருத்தம்" },
  246:  { secId: 2,  heading: "பெரியாழ்வார் திருமொழி" },
  252:  { secId: 2,  heading: "பெரியாழ்வார் திருமொழி" }
};
const _annexCache = new Map();
async function fetchAnnexSection(secId) {
  if (_annexCache.has(secId)) return _annexCache.get(secId);
  const data = await fetchPasurams({ section_id: secId });
  _annexCache.set(secId, data);
  return data;
}
let _lastAnnexSecId = null;
export async function renderSinglePasuram(refValue, anchor) {
  const gno  = Number(refValue);
  const info = ANNEX_PASURAM_MAP[gno];
  if (!info) return "";
  const all = await fetchAnnexSection(info.secId);
  const p   = all.find(x => x.global_no === gno);
  if (!p) return "";
  const showHeading = info.secId !== _lastAnnexSecId;
  _lastAnnexSecId   = info.secId;
  return `
    <div ${anchor}>
      ${showHeading ? `<div class="nnc-annex-heading">${sectionTitle(info.secId, info.heading)}</div>` : ""}
      ${renderPasuramBlock([p], new Map())}
    </div>`;
}

// ── Render koil ───────────────────────────────────────────────────────────────
export async function renderKoil(refValue, anchor) {
  const sectionId = refValue === "THIRUMOZHI" ? 11 : 26;
  // Two different strings, deliberately. `matchTitle` stays Tamil because it is
  // compared against entity_master.meta_value, which is stored in Tamil — if
  // /api/entity-search is ever script-wired this comparison must be revisited.
  // `title` is what the reader sees, so it follows the chosen script.
  const matchTitle = refValue === "THIRUMOZHI" ? "கோயில் திருமொழி" : "கோயில் திருவாய்மொழி";
  const title = c(refValue === "THIRUMOZHI" ? "nnc.koil.thirumozhi" : "nnc.koil.thiruvaimozhi") || matchTitle;
  const [allPasurams, entityRes, thaniyanData, displayData] = await Promise.all([
    fetchPasurams({ section_id: sectionId }),
    fetch(`${API}/entity-search?section_id=${sectionId}&meta_key=tag`).then(r=>r.json()).catch(()=>[]),
    fetchThaniyanWithProsody(sectionId),
    fetchDisplayData(sectionId)
  ]);
  const koilPathuSet = new Set(
    (Array.isArray(entityRes) ? entityRes : [])
      .filter(e => e.meta_key==="tag" && e.meta_value?.trim()===matchTitle && e.entity_type==="pathu")
      .map(e => Number(e.entity_id))
  );
  const filtered = koilPathuSet.size > 0
    ? allPasurams.filter(p => koilPathuSet.has(p.pathu_id))
    : allPasurams;
  const thRows = (thaniyanData.rows || []).filter(r => !r.type || r.type === "section");
  thRows._prosodyMap = thaniyanData.prosodyMap || {};
  const thHtml  = renderThaniyanBox(thRows, thRows._prosodyMap);
  const closing = (displayData.sectionClosing || [])[0]?.closing_text || "";
  const grouped = buildGroupedContent(filtered, displayData, true);
  // Koil heading: section name (author) on line 1, koil title on line 2
  const koilSectionName = sectionTitle(sectionId, "");

  return `
    ${thHtml}
    <div class="nnc-section-box" ${anchor}>
      <div class="nnc-section-heading">${koilSectionName}</div>
      <div class="nnc-thirumozhi-subheading">${title}</div>
      <div class="nnc-section-inner">
        ${grouped}
        ${closing ? `<div class="nnc-section-closing">${closing}</div>` : ""}
      </div>
    </div>`;
}

// ── Render madal ──────────────────────────────────────────────────────────────
export async function renderMadal(refValue, label, anchor) {
  try {
    const data  = await fetch(`${API}/madal?section_id=${refValue}`).then(r => r.json());
    const units = data.units  || [];
    const rules = data.rules  || [];
    if (!units.length) return "";
    // AFTER (my fix)
const displayData = {
  ...data,
  section: (data.section || []).map(r => ({ text: r.meta_value || r.text, order: r.sequence_no || r.order }))
};
const secDisp  = renderSectionDisplayItems(displayData);
    const prosody = ""; // prosody already in section[] display items
    const closing  = (data.sectionClosing || [])[0]?.closing_text || "";
    const globalNo   = Number(refValue) === 22 || Number(refValue) === 2673 ? 2673 : 2674;
    const maxCouplet = Number(refValue) === 22 || Number(refValue) === 2673 ? 77 : 148;

    // Couplet/line rendering now delegated to the shared core module
    // (madalKootrirukkaiCore.js) — single source of truth used by
    // NNC, Azhwar Thirunatchathram, special.js, and recital.html.
    // Algorithm unchanged from before; adds couplet-container cards.
    const html = buildMadalCoupletsHTML(data, "nnc", maxCouplet);

    return `
      <div class="nnc-section-box" ${anchor} data-global-no="${globalNo}">
        <div class="nnc-section-heading">${sectionTitle(Number(refValue), label)}</div>
        <div class="nnc-section-inner">
          ${secDisp}${prosody}
          <div class="nnc-global-no">${globalNo}</div>
          <div class="nnc-madal-body">${html}</div>
          ${closing ? `<div class="nnc-section-closing">${closing}</div>` : ""}
        </div>
      </div>`;
  } catch(e) {
    console.error("renderMadal error", e);
    return "";
  }
}

// ── Render thaniyan only ──────────────────────────────────────────────────────
export async function renderThaniyanItem(refValue, refType) {
  const sect    = localStorage.getItem("sect") || "T";
  const subsect = localStorage.getItem("subsect") || "";
  const sub     = subsect ? `&subsect=${subsect}` : "";
  const url = refType === "thaniyan_global"
    ? `${API}/thaniyan?type=global&sect=${sect}${sub}`
    : `${API}/thaniyan?section_id=${refValue}&sect=${sect}${sub}`;
  const data = await fetch(url).then(r=>r.json());
  const rows = Array.isArray(data) ? data : (data.thaniyan || []);
  const prosodyMap = data.prosodyMap || {};
  const filtered = refType === "thaniyan_global" ? rows : rows.filter(r => !r.type || r.type === "section");
  return renderThaniyanBox(filtered, prosodyMap, refType === "thaniyan_global" ? "__global__" : refValue);
}

// ── Render fixed text ─────────────────────────────────────────────────────────
export async function renderFixed(refValue, label, anchor) {
  try {
    const data = await fetch(`${API}/nithyanusandhanam?sub=fixed&id=${refValue}`).then(r=>r.json());
    const lines = data.lines || [];

    // ── Group lines into śloka containers ────────────────────────
    // Rule: lines ending ।  (single bar) open a group; the line ending
    // ॥ (double bar) closes it. Each group renders in its own small
    // card so the couplet structure is visually clear.
    // Author subheadings, closing lines, and blank lines stay outside.
    const _endsHalf   = t => /।$|[|]$/.test(t.trimEnd());
    const _endsFull   = t => /॥$|\|\|$/.test(t.trimEnd());
    const _isBracket  = t => t.startsWith("(") && t.endsWith(")");
    // Test the converted forms too — a Tamil-literal test can never match once
    // the line has been transliterated, and the closing line would then be
    // laid out as an ordinary verse line.
    const _closingWords = ["முற்றிற்று", "ஸமாப்தம்",
                           c("common.muttrittru"), c("common.samaptham")].filter(Boolean);
    const _isClosing  = t => _closingWords.some(w => t.includes(w));

    let html = "";
    let slokaLines = [];

    const flushSloka = () => {
      if (!slokaLines.length) return;
      html += `<div class="nnc-sloka-card">
        ${slokaLines.map(l => `<div class="nnc-fixed-line">${l}</div>`).join("")}
      </div>`;
      slokaLines = [];
    };

    for (const l of lines) {
      const t = (l.line_text || "").trim();
      if (!t) continue;
      if (_isBracket(t)) {
        flushSloka();
        html += `<div class="nnc-fixed-subheading">${t.slice(1,-1).trim()}</div>`;
        continue;
      }
      if (_isClosing(t)) {
        flushSloka();
        html += `<div class="nnc-fixed-closing">${t}</div>`;
        continue;
      }
      // verse line — accumulate
      slokaLines.push(t);
      if (_endsFull(t)) flushSloka();
    }
    flushSloka(); // flush any trailing lines

    return `
      <div class="nnc-section-box" ${anchor}>
        <div class="nnc-section-heading">${label}</div>
        <div class="nnc-section-inner">${html}</div>
      </div>`;
  } catch(e) { return comingSoonBox(label, anchor); }
}

// ── Render vazhi thirunamam ───────────────────────────────────────────────────
export async function renderVazhi(label, anchor) {
  try {
    const entries = await fetch(`${API}/nithyanusandhanam?sub=vazhi`).then(r=>r.json());
    const html = entries.map(e => {
      // Group lines by vazhi_group; each group sits in its own bordered card
      const groups = {};
      for (const l of (e.lines || [])) {
        const g = l.vazhi_group || 1;
        if (!groups[g]) groups[g] = [];
        groups[g].push(l);
      }
      const lHtml = Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(g =>
        `<div class="nnc-vazhi-group-card">` +
          groups[g].map(l => `<div class="nnc-vazhi-line">${l.line_text || ""}</div>`).join("") +
        `</div>`
      ).join("");
      return `<div class="nnc-vazhi-entry" id="vazhi-item-${e.vazhi_id}">
        <div class="nnc-vazhi-name">${e.name||""}</div>
        <div class="nnc-vazhi-lines">${lHtml}</div>
      </div>`;
    }).join("");
    return `
      <div class="nnc-section-box" ${anchor}>
        <div class="nnc-section-heading">${label}</div>
        <div class="nnc-section-inner">${html}</div>
      </div>`;
  } catch { return comingSoonBox(label, anchor); }
}

// ── Coming soon ───────────────────────────────────────────────────────────────
export function comingSoonBox(label, anchor) {
  return `
    <div class="nnc-coming-box" ${anchor||""}>
      <div style="font-size:24px;">🪷</div>
      <div style="font-size:14px;">${label}</div>
      <div style="font-size:12px;margin-top:4px;">${uiText("comingSoon")}</div>
    </div>`;
}

// ── Render one sequence item ──────────────────────────────────────────────────
export async function renderItem(item) {
  const anchor = `id="nnc-item-${item.id}"`;
  switch(item.item_type) {
    case "thaniyan":   return renderThaniyanItem(item.ref_value, item.ref_type);
    case "section":
      if (item.ref_value === "22" || item.ref_value === "23")
        return renderMadal(item.ref_value, item.display_label, anchor);
      return renderSection(item.ref_value, item.display_label, anchor);
    case "pathu":      return renderPathu(item.ref_value, item.display_label, anchor);
    case "thirumozhi": return renderThirumozhi(item.ref_value, item.display_label, anchor);
    case "pasuram":    return renderSinglePasuram(item.ref_value, anchor);
    case "group_header": return `<div class="nnc-group-label" ${anchor}>✦ ${item.display_label}</div>`;
    case "koil":       return renderKoil(item.ref_value, anchor);
    case "fixed":      return renderFixed(item.ref_value, item.display_label, anchor);
    case "vazhi":      return renderVazhi(item.display_label, anchor);
    case "coming_soon": return comingSoonBox(item.display_label, anchor);
    default:           return "";
  }
}