// =============================================================
// ddCore.js  →  js/render/divyadesam/ddCore.js
// Shared constants, CSS, API helpers, render utilities
// Used by all other divyadesam view files
// =============================================================

import { renderThaniyan } from "../thaniyan.js";
import {
  injectDisplayCSS,
  fetchDisplayData,
  fetchThaniyanWithProsody,
  renderSectionDisplayItems,
  renderSectionProsody,
  renderSectionClosing,
  buildPasuramDisplayMap,
  buildThirumozhiDisplayMap,
  buildPathuDisplayMap
} from "../displayHelper.js";

export { renderThaniyan, injectDisplayCSS, fetchDisplayData,
         fetchThaniyanWithProsody, renderSectionDisplayItems,
         renderSectionProsody, renderSectionClosing,
         buildPasuramDisplayMap, buildThirumozhiDisplayMap, buildPathuDisplayMap };

export const API_DD   = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/divyadesam";
export const API_BASE = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";
export const PAGE_SIZE = 10;

// ── Verified pasuram counts per desam (golden reference) ─────────────────────
export const DESAM_TOTAL = {
  1:247,2:2,3:5,4:1,5:1,6:24,7:10,8:33,9:1,10:45,
  11:10,12:13,13:2,14:52,15:1,16:47,17:128,18:42,19:10,20:110,
  21:10,22:11,23:32,24:10,25:10,26:10,27:14,28:1,29:10,30:12,
  31:10,32:10,33:10,34:10,35:10,36:10,37:10,38:10,39:10,40:10,
  41:128,42:39,43:8,44:21,45:5,46:12,47:2,48:2,49:11,50:11,
  51:11,52:11,53:12,54:1,55:2,56:11,57:40,58:12,59:11,60:1,
  61:11,62:14,63:12,64:11,65:13,66:22,67:11,68:11,69:10,70:11,
  71:11,72:10,73:21,74:7,75:12,76:3,77:4,78:6,79:1,80:1,
  81:6,82:15,83:1,84:1,85:1,86:1,87:10,88:2,89:2,90:12,
  91:20,92:13,93:27,94:12,95:5,96:202,97:10,98:13,99:10,100:12,
  101:22,102:11,103:12,104:13,105:49,106:22,107:51,108:37
};
export const GRAND_TOTAL = 2149;

// ── Section → thousand mapping ────────────────────────────────────────────────
export const SECTION_TO_THOUSAND = {
  1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,
  11:2,12:2,13:2,
  14:3,15:3,16:3,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:3,
  26:4
};

// ── Azhwar master (chronological) ────────────────────────────────────────────
export const AZHWARS = [
  { id:1,  name:"ஸ்ரீ பொய்கை ஆழ்வார்",           sections:[14] },
  { id:2,  name:"ஸ்ரீ பூதத்தாழ்வார்",             sections:[15] },
  { id:3,  name:"ஸ்ரீ பேயாழ்வார்",               sections:[16] },
  { id:4,  name:"ஸ்ரீ திருமழிசை ஆழ்வார்",          sections:[6,17] },
  { id:5,  name:"ஸ்ரீ மதுரகவி ஆழ்வார்",            sections:[10] },
  { id:6,  name:"ஸ்ரீ நம்மாழ்வார்",               sections:[18,19,20,26] },
  { id:7,  name:"ஸ்ரீ பெரியாழ்வார்",              sections:[1,2] },
  { id:8,  name:"ஸ்ரீ ஆண்டாள்",                  sections:[3,4] },
  { id:9,  name:"ஸ்ரீ குலசேகராழ்வார்",             sections:[5] },
  { id:10, name:"ஸ்ரீ தொண்டரடிப்பொடி ஆழ்வார்",    sections:[7,8] },
  { id:11, name:"ஸ்ரீ திருப்பாணாழ்வார்",           sections:[9] },
  { id:12, name:"ஸ்ரீ திருமங்கை ஆழ்வார்",          sections:[11,12,13,21,22,23] },
  { id:13, name:"ஸ்ரீ திருவரங்கத்தமுதனார்",        sections:[24] }
];

// ── Section → azhwar id ───────────────────────────────────────────────────────
export const SECTION_TO_AZHWAR = {
  1:7,2:7,3:8,4:8,5:9,6:4,7:10,8:10,9:11,10:5,
  11:12,12:12,13:12,14:1,15:2,16:3,17:4,
  18:6,19:6,20:6,21:12,22:12,23:12,24:13,26:6
};

// ── Thousand display names ────────────────────────────────────────────────────
export const THOUSAND_NAMES = {
  1:"முதலாமாயிரம்", 2:"இரண்டாமாயிரம்",
  3:"மூன்றாமாயிரம்", 4:"நான்காமாயிரம்"
};

// ── Region/state slug → readable label ───────────────────────────────────────
export const REGION_LABELS = {
  chola_nadu_divyadesam:"சோழ நாடு",
  pandiya_nadu_divyadesam:"பாண்டிய நாடு",
  thondai_nadu_divyadesam:"தொண்டை நாடு",
  malai_nadu_divyadesam:"மலை நாடு",
  nadu_nadu_divyadesam:"நடு நாடு",
  vada_nadu_divyadesam:"வட நாடு",
  vinnulaga_divyadesam:"விண்ணுலகம்",
  tamil_nadu:"Tamil Nadu", andhra_pradesh:"Andhra Pradesh",
  kerala:"Kerala", gujarat:"Gujarat",
  uttar_pradesh:"Uttar Pradesh", uttarakhand:"Uttarakhand",
  nepal:"Nepal", vinnulagam:"Vinnulagam"
};
export function friendlyLabel(slug) {
  return REGION_LABELS[slug] || slug || "";
}

// ── Get azhwar name by id ─────────────────────────────────────────────────────
export function azhwarName(id) {
  return AZHWARS.find(a => a.id === Number(id))?.name || "";
}

// ── Get sections for an azhwar filtered by thousand ──────────────────────────
export function azhwarSectionsInThousand(azhwarId, thousandId) {
  const a = AZHWARS.find(x => x.id === Number(azhwarId));
  if (!a) return [];
  if (!thousandId) return a.sections;
  return a.sections.filter(s => SECTION_TO_THOUSAND[s] === Number(thousandId));
}

// ── CSS (injected once) ───────────────────────────────────────────────────────
export function injectDDCSS() {
  if (document.getElementById("dd-style")) return;
  const style = document.createElement("style");
  style.id = "dd-style";
  style.textContent = `
    /* ── page wrapper ── */
    .dd-page { background:#fff; max-width:700px; margin:0 auto; padding:16px 12px 80px; font-family:"Latha","Bamini",serif; font-size:var(--base-font,17px); }
    .dd-page-title { text-align:center; font-size:24px; font-weight:900; color:#4a2c00; margin-bottom:4px; }
    .dd-page-sub { text-align:center; font-size:14px; color:#7a5a20; margin-bottom:4px; }
    .dd-divider { width:100px; height:2px; background:#b38b2e; margin:6px auto 18px; }

    /* ── menu grid ── */
    .dd-menu-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
    .dd-menu-btn { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:14px 10px; text-align:center; cursor:pointer; font-family:"Latha","Bamini",serif; font-size:14px; font-weight:700; color:#4a2c00; line-height:1.4; }
    .dd-menu-btn:active { background:#fdf6e3; }
    .dd-menu-icon { font-size:22px; display:block; margin-bottom:4px; }
    .dd-menu-sub { font-size:11px; color:#7a5a20; font-weight:400; margin-top:3px; }

    /* ── back button ── */
    .dd-back { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; margin-bottom:14px; background:#fdf6e3; border:1.5px solid #d4a843; border-radius:20px; cursor:pointer; font-size:13px; color:#4a2c00; font-family:"Latha","Bamini",serif; }

    /* ── pick list box ── */
    .dd-list-box { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:14px 12px; margin-bottom:18px; }
    .dd-list-heading { text-align:center; font-size:15px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:7px; margin-bottom:10px; }
    .dd-list-item { padding:9px 10px; border-bottom:1px dotted #e8d5a0; cursor:pointer; }
    .dd-list-item:last-child { border-bottom:none; }
    .dd-list-item:active { background:#fdf6e3; }
    .dd-list-name { font-size:15px; font-weight:700; color:#2a1a00; }
    .dd-list-count { font-size:12px; color:#b38b2e; font-weight:700; margin-left:6px; }
    .dd-list-sub { font-size:11px; color:#7a5a20; margin-top:2px; }
    .dd-list-azhwars { font-size:11px; color:#4a2c00; margin-top:2px; }

    /* ── pagination ── */
    .dd-pagination { display:flex; justify-content:space-between; align-items:center; margin-top:10px; }
    .dd-page-btn { background:#fff; border:2px solid #b38b2e; border-radius:16px; padding:5px 14px; cursor:pointer; font-size:13px; color:#4a2c00; font-family:"Latha","Bamini",serif; }
    .dd-page-btn:disabled { opacity:0.35; cursor:default; }
    .dd-page-info { font-size:12px; color:#7a5a20; }

    /* ── desam detail card ── */
    .dd-desam-card { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:16px 14px 14px; margin-bottom:20px; }
    .dd-desam-title { text-align:center; font-size:17px; font-weight:900; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:7px; margin-bottom:6px; line-height:1.4; }
    .dd-desam-deity { text-align:center; font-size:13px; color:#7a5a20; margin-bottom:4px; }
    .dd-desam-meta { text-align:center; font-size:11px; color:#999; margin-bottom:12px; }

    /* ── azhwar group inside desam ── */
    .dd-azhwar-group { margin-bottom:14px; }
    .dd-azhwar-label { font-size:14px; font-weight:800; color:#4a2c00; padding:6px 0 4px; border-bottom:1px dashed #d4a843; margin-bottom:8px; }

    /* ── thaniyan box ── */
    .dd-thaniyan-box { background:#ffffff; border:3px double #b38b2e; border-radius:8px; padding:14px 12px; margin-bottom:12px; box-shadow:0 2px 6px rgba(179,139,46,0.07); }
    .dd-thaniyan-label { font-size:10px; font-weight:700; color:#b38b2e; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px; opacity:0.8; }

    /* ── section content box ── */
    .dd-content-box { background:#fff; border:3px double #b38b2e; border-radius:6px; padding:14px 12px 12px; margin-bottom:12px; }
    .dd-section-heading { text-align:center; font-size:14px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:7px; margin-bottom:10px; line-height:1.5; }

    /* ── pathu / thirumozhi ── */
    .dd-pathu-heading { text-align:center; font-size:14px; font-weight:800; color:#4a2c00; margin:10px 0 6px; padding:4px 0; border-bottom:1px dashed #d4a843; }
    .dd-thirumozhi-heading { text-align:center; font-size:13px; font-weight:700; color:#4a2c00; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #e8d5a0; line-height:1.5; }

    /* ── pasuram ── */
    .dd-pasuram-block { margin-bottom:8px; }
    .dd-global-no { font-size:12px; font-weight:700; color:#b38b2e; margin-bottom:3px; text-align:left; }
    .dd-lines { font-size:var(--base-font,17px); color:#1a2a00; line-height:1.9; text-align:left; }
    .dd-line { display:block; }
    .dd-group-gap { display:block; height:12px; }
    .dd-local-no { font-size:11px; color:#bbb; text-align:right; margin-top:1px; display:block; }
    .dd-pasuram-sep { height:1px; background:#e8d5a0; margin:8px 0; }

    /* ── section closing ── */
    .dd-section-closing { text-align:center; font-size:13px; font-weight:700; color:#4a2c00; margin-top:10px; padding-top:8px; border-top:1px solid #d4a843; }

    /* ── prosody small ── */
    .thaniyan-prosody { font-size:9px !important; color:#ccc !important; font-style:italic; }
    .dd-thaniyan-box .thaniyan-container { font-size:13px; }
    .dd-thaniyan-box .thaniyan-line { font-size:13px; line-height:1.7; }
    .dd-thaniyan-box .thaniyan-title { font-size:13px; font-weight:700; }
    .dd-thaniyan-box .thaniyan-subhead { font-size:12px; color:#7a5a20; }

    /* ── floating nav ── */
    .dd-float-nav { position:fixed; bottom:18px; right:10px; display:flex; flex-direction:column; gap:7px; z-index:999; }
    .dd-float-nav button { width:42px; height:42px; border-radius:50%; border:2px solid #b38b2e; background:#fff; color:#4a2c00; font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.14); }

    /* ── spinner ── */
    .dd-spinner { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:55vh; }
    .dd-lotus { font-size:44px; animation:dd-spin 1.6s linear infinite; }
    @keyframes dd-spin { 0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.1);} 100%{transform:rotate(360deg) scale(1);} }
    .dd-loading-text { margin-top:12px; font-size:15px; color:#7a5a20; font-family:"Latha","Bamini",serif; }
  `;
  document.head.appendChild(style);
}

// ── Spinner HTML ──────────────────────────────────────────────────────────────
export function ddSpinner() {
  return `<div class="dd-spinner"><div class="dd-lotus">🪷</div><div class="dd-loading-text">Loading...</div></div>`;
}

// ── Floating nav ──────────────────────────────────────────────────────────────
export function ddFloatNav() {
  return `
    <div class="dd-float-nav">
      <button onclick="window.location.href='tree.html'" title="Home">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.8,behavior:'smooth'})" title="Up">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.8,behavior:'smooth'})" title="Down">▶</button>
      <button onclick="ddFont(2)">A+</button>
      <button onclick="ddFont(-2)">A-</button>
    </div>`;
}

// ── Font adjuster ─────────────────────────────────────────────────────────────
export function initFontAdjuster() {
  window.ddFont = function(d) {
    const cur = getComputedStyle(document.documentElement).getPropertyValue('--base-font').trim();
    let s = cur ? parseFloat(cur) : 17;
    if (isNaN(s)) s = 17;
    if (d < 0 && s <= 12) return;
    document.documentElement.style.setProperty('--base-font', (s + d) + 'px');
  };
}

// ── Paginated pick list ───────────────────────────────────────────────────────
export function renderPickList(items, title, pageFnName, page, renderItemFn) {
  const start = page * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pagination = totalPages > 1 ? `
    <div class="dd-pagination">
      <button class="dd-page-btn" onclick="${pageFnName}(${page-1})" ${page===0?"disabled":""}>◀ Previous</button>
      <span class="dd-page-info">${page+1} / ${totalPages}</span>
      <button class="dd-page-btn" onclick="${pageFnName}(${page+1})" ${page>=totalPages-1?"disabled":""}>Next ▶</button>
    </div>` : "";
  return `
    <div class="dd-list-box">
      <div class="dd-list-heading">${title}</div>
      ${pageItems.map(renderItemFn).join("")}
      ${pagination}
    </div>`;
}

// ── Render pasuram lines with group gaps ──────────────────────────────────────
export function renderLines(lines) {
  if (!Array.isArray(lines) || !lines.length) return "";
  let html = "", last = null;
  for (const l of lines) {
    const g = l.group ?? 1;
    const t = typeof l === "string" ? l : (l?.text || "");
    if (last !== null && g !== last) html += `<div class="dd-group-gap"></div>`;
    html += `<div class="dd-line">${t}</div>`;
    last = g;
  }
  return html;
}

// ── Render one pasuram card ───────────────────────────────────────────────────
export function renderPasuramCard(p, isFirst, pasuramDisplayMap) {
  const display = pasuramDisplayMap?.get(String(p.global_no)) || "";
  return `
    ${!isFirst ? '<div class="dd-pasuram-sep"></div>' : ""}
    <div class="dd-pasuram-block">
      ${display}
      <div class="dd-global-no">${p.global_no}</div>
      <div class="dd-lines">${renderLines(p.lines)}</div>
      <div class="dd-local-no">${p.local_no}</div>
    </div>`;
}

// ── Render grouped pasurams (pathu → thirumozhi) ──────────────────────────────
// Strip adivaravu entries from a display map (DD views never show adivaravu)
function stripAdivaravu(map) {
  map.forEach((val, key) => {
    if (typeof val === "string") {
      // pathu map: val is HTML string — remove dh-thirumozhi-display divs containing adivaravu
      const cleaned = val.replace(/<div class="dh-thirumozhi-display">[^<]*(?:adivaravu|அடிவரவு)[^<]*<\/div>/gi, "");
      if (cleaned !== val) map.set(key, cleaned);
    } else if (val && typeof val === "object") {
      // thirumozhi map: val = {displayHtml, closingHtml}
      if (val.displayHtml) {
        val.displayHtml = val.displayHtml.replace(/<div class="dh-thirumozhi-display">[^<]*(?:adivaravu|அடிவரவு)[^<]*<\/div>/gi, "");
      }
    }
  });
  return map;
}

export function renderGroupedPasurams(pasurams, displayData) {
  const pdMap  = buildPasuramDisplayMap(displayData);
  const tdMap  = stripAdivaravu(buildThirumozhiDisplayMap(displayData));
  const patMap = stripAdivaravu(buildPathuDisplayMap(displayData));

  const pathuMap = new Map();
  for (const p of pasurams) {
    const pk = p.pathu_id != null ? String(p.pathu_id) : "__none__";
    if (!pathuMap.has(pk)) pathuMap.set(pk, { label: p.pathu_name || "", thiruMap: new Map() });
    const pm = pathuMap.get(pk);
    const tk = p.thirumozhi_id != null ? String(p.thirumozhi_id) : "__none__";
    if (!pm.thiruMap.has(tk)) {
      const line1 = p.thirumozhi_name || p.pathu_subunit_name || "";
      const line2 = p.thirumozhi_heading || "";
      pm.thiruMap.set(tk, { line1, line2, pasurams: [] });
    }
    pm.thiruMap.get(tk).pasurams.push(p);
  }

  let html = "";
  for (const [pk, pathu] of pathuMap) {
    if (pathu.label) html += `<div class="dd-pathu-heading">${pathu.label}</div>`;
    if (pk !== "__none__") html += patMap.get(pk) || "";
    for (const [tk, thiru] of pathu.thiruMap) {
      const parts = [thiru.line1, thiru.line2].filter(Boolean);
      const thiruHead = parts.length ? `<div class="dd-thirumozhi-heading">${parts.join(" — ")}</div>` : "";
      const td = tk !== "__none__" ? (tdMap.get(tk) || {}) : {};
      // Skip td.displayHtml — may contain adivaravu in DD views
      html += thiruHead;
      thiru.pasurams.forEach((p, i) => { html += renderPasuramCard(p, i===0, pdMap); });
      html += td.closingHtml || "";
    }
  }
  return html;
}

// ── Render one section block (thaniyan + content box) ─────────────────────────
export async function renderSectionBlock(sectionId, sectionHeaderMap, extraHeader = "") {
  const heading = sectionHeaderMap[sectionId] || `Section ${sectionId}`;

  // thaniyan
  let thaniyanHtml = "";
  const SKIP_THANIYAN = [2, 12, 13];
  if (!SKIP_THANIYAN.includes(sectionId)) {
    const { rows, prosodyMap } = await fetchThaniyanWithProsody(sectionId);
    const secRows = rows.filter ? rows.filter(r => r.type === "section") : rows;
    if (secRows.length > 0) {
      thaniyanHtml = `
        <div class="dd-thaniyan-box">
          <div class="dd-thaniyan-label">Thaniyan</div>
          ${renderThaniyan(secRows, prosodyMap)}
        </div>`;
    }
  }

  const displayData = await fetchDisplayData(sectionId);
  const res = await fetch(`${API_BASE}/pasuram?section_id=${sectionId}`);
  const allPasurams = await res.json();

  const sectionDisplay = renderSectionDisplayItems(displayData);
  const prosody        = renderSectionProsody(displayData);
  const closing        = renderSectionClosing(displayData, "dd-section-closing");
  const grouped        = renderGroupedPasurams(allPasurams, displayData);

  return `
    ${thaniyanHtml}
    <div class="dd-content-box">
      ${extraHeader}
      <div class="dd-section-heading">${heading}</div>
      ${sectionDisplay}${prosody}
      ${grouped}
      ${closing}
    </div>`;
}

// ── Filter pasurams to specific sections only ─────────────────────────────────
export async function fetchPasuramsBatched(globalNos) {
  if (!globalNos.length) return [];
  const CHUNK = 50;
  const results = [];
  for (let i = 0; i < globalNos.length; i += CHUNK) {
    const chunk = globalNos.slice(i, i + CHUNK);
    const ph = chunk.map(() => "?").join(",");
    // We can't do D1 directly from frontend — fetch via existing pasuram endpoint per section
    // This is called after we already have pasurams grouped, so we filter client-side
  }
  return results;
}
