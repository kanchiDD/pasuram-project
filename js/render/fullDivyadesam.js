// =============================================================
// 📿 fullDivyadesam.js  →  js/render/fullDivyadesam.js
// ⚠️  Raw fetch only — no api.js imports (avoids safeRender loop)
// =============================================================

import { state } from "../state.js";
import { renderThaniyan } from "./thaniyan.js";
import {
  injectDisplayCSS,
  fetchDisplayData,
  fetchThaniyanWithProsody,
  renderSectionDisplayItems,
  renderSectionProsody,
  renderAdivaravu,
  renderSectionClosing,
  buildPasuramDisplayMap,
  buildThirumozhiDisplayMap,
  buildPathuDisplayMap
} from "./displayHelper.js";

// ── Module-level helpers (must be defined before any onclick uses them) ───────
function friendlyRegion(slug) {
  if (!slug) return "";
  const m = {
    chola_nadu_divyadesam:"சோழ நாடு", pandiya_nadu_divyadesam:"பாண்டிய நாடு",
    thondai_nadu_divyadesam:"தொண்டை நாடு", malai_nadu_divyadesam:"மலை நாடு",
    nadu_nadu_divyadesam:"நடு நாடு", vada_nadu_divyadesam:"வட நாடு",
    vinnulaga_divyadesam:"விண்ணுலகம்",
    tamil_nadu:"Tamil Nadu", andhra_pradesh:"Andhra Pradesh",
    kerala:"Kerala", gujarat:"Gujarat", uttar_pradesh:"Uttar Pradesh",
    uttarakhand:"Uttarakhand", nepal:"Nepal", vinnulagam:"Vinnulagam"
  };
  return m[slug] || slug;
}
function azhwarShortName(id) {
  const m = {1:"பொய்கை",2:"பூதம்",3:"பேய்",4:"திருமழிசை",5:"மதுரகவி",
    6:"நம்மாழ்வார்",7:"பெரியாழ்வார்",8:"ஆண்டாள்",9:"குலசேகர்",
    10:"தொண்டரடிப்பொடி",11:"திருப்பாணர்",12:"திருமங்கை",13:"திருவரங்கத்தமுதனார்"};
  return m[Number(id)] || "";
}
window.friendlyRegion   = friendlyRegion;
window.azhwarShortName  = azhwarShortName;



const API_DD  = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/divyadesam";
const API_BASE = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";
const PAGE_SIZE = 10;

// section_id → total pasuram count (from section_master global ranges)
// Used to decide if adivaravu / section closing should show
// (show only when ALL pasurams of that section are attributed to this desam)
const SECTION_TOTAL = {
  1:12, 2:461, 3:30, 4:143, 5:105, 6:120, 7:45, 8:10,
  9:10, 10:11, 11:1084, 12:20, 13:30, 14:100, 15:100,
  16:100, 17:96, 18:100, 19:7, 20:87, 21:1, 22:1, 23:1,
  24:108, 26:1102
};

const AZHWARS = [
  { id:1,  name:"பொய்கை ஆழ்வார்",         month:"ஐப்பசி",    star:"ஓணம்" },
  { id:2,  name:"பூதத்தாழ்வார்",           month:"ஐப்பசி",    star:"அவிட்டம்" },
  { id:3,  name:"பேயாழ்வார்",             month:"ஐப்பசி",    star:"சதயம்" },
  { id:4,  name:"திருமழிசை ஆழ்வார்",       month:"தை",        star:"மகம்" },
  { id:5,  name:"மதுரகவி ஆழ்வார்",         month:"சித்திரை",  star:"சித்திரை" },
  { id:6,  name:"நம்மாழ்வார்",             month:"வைகாசி",    star:"விசாகம்" },
  { id:7,  name:"பெரியாழ்வார்",            month:"ஆனி",       star:"ஸ்வாதி" },
  { id:8,  name:"ஆண்டாள்",                month:"ஆடி",       star:"பூரம்" },
  { id:9,  name:"குலசேகராழ்வார்",          month:"மாசி",      star:"புனர் பூசம்" },
  { id:10, name:"தொண்டரடிப்பொடி ஆழ்வார்", month:"மார்கழி",   star:"கேட்டை" },
  { id:11, name:"திருப்பாணாழ்வார்",        month:"கார்த்திகை",star:"ரோகிணி" },
  { id:12, name:"திருமங்கை ஆழ்வார்",       month:"கார்த்திகை",star:"கார்த்திகை" },
  { id:13, name:"திருவரங்கத்தமுதனார்",     month:null,        star:null }
];

const sectionHeaderMap = {
  1:"ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த திருப்பல்லாண்டு",
  2:"ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த பெரியாழ்வார் திருமொழி",
  3:"ஸ்ரீ ஆண்டாள் அருளிச்செய்த திருப்பாவை",
  4:"ஸ்ரீ ஆண்டாள் அருளிச்செய்த நாச்சியார் திருமொழி",
  5:"ஸ்ரீ குலசேகர பெருமாள் அருளிச்செய்த பெருமாள் திருமொழி",
  6:"ஸ்ரீ திருமழிசைப்பிரான் அருளிச்செய்த திருச்சந்தவிருத்தம்",
  7:"ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருமாலை",
  8:"ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருப்பள்ளியெழுச்சி",
  9:"ஸ்ரீ திருப்பாணாழ்வார் அருளிச்செய்த அமலனாதிபிரான்",
  10:"ஸ்ரீ மதுரகவி ஆழ்வார் அருளிச்செய்த கண்ணிநுண்சிறுத்தாம்பு",
  11:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரிய திருமொழி",
  12:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருகுறுந்தாண்டகம்",
  13:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருநெடுந்தாண்டகம்",
  14:"ஸ்ரீ பொய்கையாழ்வார்‌ அருளிச்செய்த முதல்‌ திருவந்தாதி",
  15:"ஸ்ரீ பூதத்தாழ்வார்‌ அருளிச்செய்த இரண்டாம்‌ திருவந்தாதி",
  16:"ஸ்ரீ பேயாழ்வார்‌ அருளிச்செய்த மூன்றாம்‌ திருவந்தாதி",
  17:"ஸ்ரீ திருமழிசைப்பிரான்‌ அருளிச்செய்த நான்முகன்‌திருவந்தாதி",
  18:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவிருத்தம்",
  19:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாசிரியம்",
  20:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த பெரியதிருவந்தாதி",
  24:"ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த இராமாநுச நூற்றந்தாதி",
  26:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி"
};

// ── CSS ───────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("full-divyadesam-style")) return;
  const style = document.createElement("style");
  style.id = "full-divyadesam-style";
  style.textContent = `
    .fdd-page { background:#fff; max-width:700px; margin:0 auto; padding:20px 14px 80px; font-family:"Latha","Bamini",serif; font-size:var(--base-font,18px); }
    .fdd-page-title { text-align:center; font-size:26px; font-weight:900; color:#4a2c00; margin-bottom:6px; }
    .fdd-page-subtitle { text-align:center; font-size:15px; color:#7a5a20; margin-bottom:4px; }
    .fdd-divider { width:120px; height:2px; background:#b38b2e; margin:8px auto 20px; }
    /* menu */
    .fdd-menu-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; }
    .fdd-menu-btn { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:16px 12px; text-align:center; cursor:pointer; font-family:"Latha","Bamini",serif; font-size:16px; font-weight:700; color:#4a2c00; }
    .fdd-menu-btn:hover { background:#fdf6e3; }
    .fdd-menu-icon { font-size:24px; display:block; margin-bottom:6px; }
    .fdd-menu-sub { font-size:12px; color:#7a5a20; font-weight:400; margin-top:4px; }
    /* picklist */
    .fdd-picklist-box { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:16px; margin-bottom:20px; }
    .fdd-picklist-heading { text-align:center; font-size:16px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:8px; margin-bottom:12px; }
    .fdd-pick-item { padding:10px 12px; border-bottom:1px dotted #e8d5a0; cursor:pointer; font-size:16px; color:#2a1a00; }
    .fdd-pick-item:hover { background:#fdf6e3; }
    .fdd-pick-item:last-child { border-bottom:none; }
    .fdd-pick-sub { font-size:12px; color:#7a5a20; margin-top:2px; }
    /* pagination */
    .fdd-pagination { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
    .fdd-page-btn { background:#fff; border:2px solid #b38b2e; border-radius:20px; padding:6px 16px; cursor:pointer; font-size:14px; color:#4a2c00; font-family:"Latha","Bamini",serif; }
    .fdd-page-btn:disabled { opacity:0.35; cursor:default; }
    .fdd-page-info { font-size:13px; color:#7a5a20; }
    /* back */
    .fdd-back { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; margin-bottom:16px; background:#fdf6e3; border:1.5px solid #d4a843; border-radius:20px; cursor:pointer; font-size:14px; color:#4a2c00; }
    /* desam card — double border white (site standard) */
    .fdd-desam-card { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:18px 16px 16px; margin-bottom:24px; }
    .fdd-desam-name { text-align:center; font-size:18px; font-weight:900; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:8px; margin-bottom:8px; }
    .fdd-desam-meta { text-align:center; font-size:13px; color:#7a5a20; margin-bottom:6px; }
    /* thaniyan box — same as rest of site */
    .fdd-thaniyan-box { background:#fffbf0; border-left:4px solid #b38b2e; border-radius:4px; padding:10px 14px; margin-bottom:12px; }
    .fdd-thaniyan-label { text-align:center; font-size:12px; font-weight:700; color:#b38b2e; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase; }
    /* content box — section heading + pasurams */
    .fdd-content-box { background:#fff; border:3px double #b38b2e; border-radius:8px; padding:16px; margin-bottom:16px; }
    .fdd-section-heading { text-align:center; font-size:16px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:8px; margin-bottom:12px; line-height:1.5; }
    /* azhwar label inside desam */
    .fdd-azhwar-label { font-size:15px; font-weight:800; color:#4a2c00; border-bottom:1px dashed #d4a843; padding-bottom:6px; margin-bottom:10px; margin-top:14px; }
    /* pathu / thirumozhi heading */
    .fdd-pathu-heading { text-align:center; font-size:16px; font-weight:800; color:#4a2c00; margin:12px 0 8px; padding:5px 0; border-bottom:1px dashed #d4a843; }
    .fdd-thirumozhi-group { margin-bottom:14px; padding-bottom:10px; border-bottom:1px dotted #e8d5a0; }
    .fdd-thirumozhi-group:last-child { border-bottom:none; }
    .fdd-thirumozhi-heading { text-align:center; font-size:14px; font-weight:700; color:#4a2c00; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #e8d5a0; line-height:1.6; }
    /* pasuram */
    .fdd-pasuram-block { margin-bottom:10px; }
    .fdd-global-no { font-size:13px; font-weight:700; color:#b38b2e; text-align:left; margin-bottom:4px; }
    .fdd-lines { font-size:var(--base-font,18px); color:#1a2a00; line-height:2; text-align:left; }
    .fdd-line { display:block; }
    .fdd-group-gap { display:block; height:14px; }
    .fdd-local-no { font-size:12px; color:#999; text-align:right; margin-top:2px; }
    .fdd-pasuram-sep { height:1px; background:#e8d5a0; margin:10px 0; }
    .fdd-pasuram-note { font-size:12px; color:#7a5a20; font-style:italic; margin-top:4px; }
    /* section closing */
    .fdd-section-closing { text-align:center; font-size:14px; font-weight:700; color:#4a2c00; margin-top:12px; padding-top:10px; border-top:1px solid #d4a843; }
    /* desam list */
    .fdd-desam-list-item { padding:12px 14px; border-bottom:1px dotted #e8d5a0; cursor:pointer; }
    .fdd-desam-list-item:hover { background:#fdf6e3; }
    .fdd-desam-list-name { font-size:16px; font-weight:700; color:#4a2c00; }
    .fdd-desam-list-sub { font-size:12px; color:#7a5a20; margin-top:2px; }
    /* prosody small */
    .thaniyan-prosody { font-size:11px !important; color:#999 !important; font-style:italic; margin-bottom:2px; }
    /* float nav */
    .fdd-float-nav { position:fixed; bottom:20px; right:12px; display:flex; flex-direction:column; gap:8px; z-index:999; }
    .fdd-float-nav button { width:44px; height:44px; border-radius:50%; border:2px solid #b38b2e; background:#fff; color:#4a2c00; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.15); }
    /* spinner */
    .fdd-spinner-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; }
    .fdd-lotus { font-size:48px; animation:fdd-spin 1.6s linear infinite; }
    @keyframes fdd-spin { 0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.1);} 100%{transform:rotate(360deg) scale(1);} }
    .fdd-loading-text { margin-top:14px; font-size:16px; color:#7a5a20; }
  `;
  document.head.appendChild(style);
}

export function divyadesamSpinner() {
  return `<div class="fdd-spinner-wrap"><div class="fdd-lotus">🪷</div><div class="fdd-loading-text">Content Loading...</div></div>`;
}

// ── Render pasuram lines with group gaps ──────────────────────────────────────
function renderLines(lines) {
  if (!Array.isArray(lines) || !lines.length) return "";
  let html = "", lastGroup = null;
  for (const l of lines) {
    const g = l.group ?? 1;
    const text = typeof l === "string" ? l : (l?.text || "");
    if (lastGroup !== null && g !== lastGroup) html += `<div class="fdd-group-gap"></div>`;
    html += `<div class="fdd-line">${text}</div>`;
    lastGroup = g;
  }
  return html;
}

// ── Render one pasuram with per-pasuram display item ─────────────────────────
function renderPasuramCard(p, isFirst, pasuramDisplayMap) {
  const displayItem = pasuramDisplayMap?.get(String(p.global_no)) || "";
  const noteHtml = p.notes ? `<div class="fdd-pasuram-note">📝 ${p.notes}</div>` : "";
  return `
    ${!isFirst ? '<div class="fdd-pasuram-sep"></div>' : ""}
    <div class="fdd-pasuram-block">
      ${displayItem}
      <div class="fdd-global-no">${p.global_no}</div>
      <div class="fdd-lines">${renderLines(p.lines)}</div>
      <div class="fdd-local-no">${p.local_no}</div>
      ${noteHtml}
    </div>
  `;
}

// ── Render grouped pasurams: pathu → thirumozhi → pasurams ───────────────────
// With all display items matching fullAzhwars.js pattern
function renderGroupedPasurams(pasurams, displayData, desamGlobalNosSet) {
  const pasuramDisplayMap    = buildPasuramDisplayMap(displayData);
  const thirumozhiDisplayMap = buildThirumozhiDisplayMap(displayData);
  const pathuDisplayMap      = buildPathuDisplayMap(displayData);

  // group by pathu → thirumozhi (preserve insertion order = chronological)
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
    if (pathu.label) html += `<div class="fdd-pathu-heading">${pathu.label}</div>`;
    if (pk !== "__none__") html += pathuDisplayMap.get(pk) || "";

    for (const [tk, thiru] of pathu.thiruMap) {
      const parts = [thiru.line1, thiru.line2].filter(Boolean);
      const thiruHeadingHtml = parts.length
        ? `<div class="fdd-thirumozhi-heading">${parts.join(" — ")}</div>` : "";

      const thiruDisplay = tk !== "__none__" ? (thirumozhiDisplayMap.get(tk) || {}) : {};

      // thirumozhi closing only if ALL pasurams of this thirumozhi are in the desam
      // We show it if present in displayData
      const thiruClosingHtml = thiruDisplay.closingHtml || "";

      // mobile-friendly: no extra box border per thirumozhi — use heading + separator
      html += `
        <div class="fdd-thirumozhi-group">
          ${thiruHeadingHtml}
          ${thiruDisplay.displayHtml || ""}
          ${thiru.pasurams.map((p, i) => renderPasuramCard(p, i === 0, pasuramDisplayMap)).join("")}
          ${thiruClosingHtml}
        </div>
      `;
    }
  }
  return html;
}

// ── Render one azhwar's pasurams for a desam with full display UI ─────────────
// Groups pasurams by section, fetches thaniyan + display per section
async function renderAzhwarDesamBlock(authorId, pasurams) {
  const azhwar = AZHWARS.find(a => a.id === authorId);
  const name = azhwar ? `ஸ்ரீ ${azhwar.name}` : `Author ${authorId}`;

  // group by section_id
  const sectionMap = new Map();
  for (const p of pasurams) {
    const sid = p.section_id;
    if (!sectionMap.has(sid)) sectionMap.set(sid, []);
    sectionMap.get(sid).push(p);
  }

  let html = `<div class="fdd-azhwar-label">${name}</div>`;

  for (const [sid, secPasurams] of sectionMap) {
    const secHeading = sectionHeaderMap[sid] || secPasurams[0]?.section_name || "";

    // fetch thaniyan for this section
    let thaniyanHtml = "";
    const { rows: thRows, prosodyMap } = await fetchThaniyanWithProsody(sid);
    const secRows = thRows.filter ? thRows.filter(r => r.type === "section") : thRows;
    if (secRows.length > 0) {
      thaniyanHtml = `
        <div class="fdd-thaniyan-box">
          <div class="fdd-thaniyan-label">தனியன்</div>
          ${renderThaniyan(secRows, prosodyMap)}
        </div>
      `;
    }

    // fetch display data for this section
    const displayData = await fetchDisplayData(sid);

    // check if all pasurams of section are present → show adivaravu + section closing
    const totalInSection = SECTION_TOTAL[sid] || 999;
    const countPresent = secPasurams.length;
    const isFullSection = countPresent >= totalInSection;

    // check if all pasurams of each thirumozhi are present → show thirumozhi closing
    // (handled inside renderGroupedPasurams via displayData.thirumozhi)

    const sectionDisplayHtml = renderSectionDisplayItems(displayData);
    const prosodyHtml         = renderSectionProsody(displayData);
    const adivaravuHtml       = isFullSection ? renderAdivaravu(displayData) : "";
    const closingHtml         = isFullSection
      ? renderSectionClosing(displayData, "fdd-section-closing") : "";

    const groupedHtml = renderGroupedPasurams(secPasurams, displayData);

    html += `
      <div class="fdd-content-box">
        ${secHeading ? `<div class="fdd-section-heading">${secHeading}</div>` : ""}
        ${thaniyanHtml}
        ${sectionDisplayHtml}
        ${prosodyHtml}
        ${groupedHtml}
        ${adivaravuHtml}
        ${closingHtml}
      </div>
    `;
  }

  return html;
}

// ── Build full desam detail HTML (async — all sections + thaniyan + display) ──
async function buildDesamDetail(res) {
  const desam = res.desam || res;
  const azhwars = res.azhwars || [];

  const meta = [desam.traditional_region, desam.state, desam.district].filter(Boolean).join(" · ");
  const deity = [desam.perumal_name, desam.thayar_name].filter(Boolean).join(" | ");

  let azhwarBlocksHtml = "";
  for (const a of azhwars) {
    azhwarBlocksHtml += await renderAzhwarDesamBlock(a.author_id, a.pasurams);
  }

  return `
    <div class="fdd-desam-card">
      <div class="fdd-desam-name">${desam.canonical_name}</div>
      ${deity ? `<div class="fdd-desam-meta">${deity}</div>` : ""}
      ${meta ? `<div class="fdd-desam-meta" style="font-size:12px;">${meta}</div>` : ""}
      ${azhwarBlocksHtml}
    </div>
  `;
}

// ── Paginated pick list ───────────────────────────────────────────────────────
function renderPickList(items, title, pageFn, page, renderItem) {
  const start = page * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);
  const total = Math.ceil(items.length / PAGE_SIZE);
  const pagination = total > 1 ? `
    <div class="fdd-pagination">
      <button class="fdd-page-btn" onclick="${pageFn}(${page-1})" ${page===0?"disabled":""}>◀ முந்தைய</button>
      <span class="fdd-page-info">${page+1} / ${total}</span>
      <button class="fdd-page-btn" onclick="${pageFn}(${page+1})" ${page>=total-1?"disabled":""}>அடுத்த ▶</button>
    </div>` : "";
  return `
    <div class="fdd-picklist-box">
      <div class="fdd-picklist-heading">${title}</div>
      ${pageItems.map(renderItem).join("")}
      ${pagination}
    </div>`;
}

// ── Floating nav ──────────────────────────────────────────────────────────────
function floatingNav() {
  return `
    <div class="fdd-float-nav">
      <button onclick="window.location.href='tree.html'">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})">▶</button>
      <button onclick="fddAdjFont(2)">A+</button>
      <button onclick="fddAdjFont(-2)">A-</button>
    </div>`;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function renderFullDivyadesam(selectedThousandId = null) {
  injectCSS();
  injectDisplayCSS();

  window.fddAdjFont = function(delta) {
    const cur = getComputedStyle(document.documentElement).getPropertyValue('--base-font').trim();
    let size = cur ? parseFloat(cur) : 18;
    if (isNaN(size)) size = 18;
    if (delta < 0 && size <= 12) return;
    document.documentElement.style.setProperty('--base-font', (size + delta) + 'px');
  };

  registerHandlers(selectedThousandId);

  const pageTitle = selectedThousandId
    ? ({1:"முதலாமாயிரம்",2:"இரண்டாமாயிரம்",3:"மூன்றாமாயிரம்",4:"நான்காமாயிரம்"}[selectedThousandId] || "")
    : "நாலாயிர திவ்யப்பிரபந்தம்";

  // fetch list once to determine which menus are applicable
  const allDesams = await fetch(`${API_DD}?sub=list`).then(r => r.json());
  const relevantDesams = allDesams.filter(d => desamAllowed_static(d, selectedThousandId));

  // determine which menus make sense for this context
  const hasDesams   = relevantDesams.length > 0;
  const hasAzhwars  = AZHWARS.filter(a => azhwarAllowed_static(a.id, selectedThousandId)).length > 0;
  const hasMandalam = hasDesams; // always show if desams exist
  const hasState    = hasDesams;
  const hasDistrict = hasDesams;
  // Special groups (Thirunangur etc.) are in 3rd thousand or full 4000
  const t = Number(selectedThousandId);
  // All special groups (Thirunangur, Nava, Irattai) confirmed in 4th thousand
  const hasSpecial  = !selectedThousandId || t === 4;

  // cache for handlers
  window._fddAllDesams = allDesams;

  const menuHtml = [
    hasDesams  ? `<div class="fdd-menu-btn" onclick="fddView('desam')"><span class="fdd-menu-icon">🛕</span>By Divyadesam<div class="fdd-menu-sub">${relevantDesams.length} திவ்யதேசங்கள்</div></div>` : "",
    hasAzhwars ? `<div class="fdd-menu-btn" onclick="fddView('azhwar')"><span class="fdd-menu-icon">🙏</span>By Azhwar<div class="fdd-menu-sub">ஆழ்வார்கள்</div></div>` : "",
    hasMandalam? `<div class="fdd-menu-btn" onclick="fddView('mandalam')"><span class="fdd-menu-icon">🗺️</span>By Mandalam<div class="fdd-menu-sub">மண்டலம்</div></div>` : "",
    hasState   ? `<div class="fdd-menu-btn" onclick="fddView('state')"><span class="fdd-menu-icon">📍</span>By State<div class="fdd-menu-sub">மாநிலம்</div></div>` : "",
    hasDistrict? `<div class="fdd-menu-btn" onclick="fddView('district')"><span class="fdd-menu-icon">🏘️</span>By District<div class="fdd-menu-sub">மாவட்டம்</div></div>` : "",
    hasSpecial ? `<div class="fdd-menu-btn" onclick="fddView('special')"><span class="fdd-menu-icon">⭐</span>Special Groups<div class="fdd-menu-sub">திருநாங்கூர் / நவ...</div></div>` : ""
  ].filter(Boolean).join("");

  return `
    <div class="fdd-page">
      <div class="fdd-page-title">${pageTitle}</div>
      <div class="fdd-page-subtitle">திவ்யதேசங்கள்</div>
      <div class="fdd-divider"></div>
      <div class="fdd-menu-grid">${menuHtml}</div>
      <div id="fdd-content"></div>
    </div>
    ${floatingNav()}`;
}

// static filter helpers (before registerHandlers runs)
function desamAllowed_static(desam, tId) {
  if (!tId) return true;
  return (desam.thousand_ids || []).includes(Number(tId));
}
function azhwarAllowed_static(authorId, tId) {
  if (!tId) return true;
  const AZHWAR_SECTIONS_S = {
    1:[14],2:[15],3:[16],4:[6,17],5:[10],
    6:[18,19,20,26],7:[1,2],8:[3,4],9:[5],
    10:[7,8],11:[9],12:[11,12,13,21,22,23],13:[24]
  };
  const SEC_TO_T = {1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,11:2,12:2,13:2,14:3,15:3,16:3,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:3,26:4};
  return (AZHWAR_SECTIONS_S[authorId] || []).some(s => SEC_TO_T[s] === Number(tId));
}


// ── Which sections belong to which thousand ──────────────────────────────────
const SECTION_TO_THOUSAND = {
  1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,
  11:2,12:2,13:2,
  14:3,15:3,16:3,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:3,
  26:4
};

// azhwar_id → section_ids they authored
const AZHWAR_SECTIONS = {
  1:[14], 2:[15], 3:[16], 4:[6,17], 5:[10],
  6:[18,19,20,26], 7:[1,2], 8:[3,4], 9:[5],
  10:[7,8], 11:[9], 12:[11,12,13,21,22,23], 13:[24]
};
// ── Register all window handlers ──────────────────────────────────────────────
function registerHandlers(thousandId) {
  // ── build allowed sets for this thousand ─────────────────────────────────
  // null = full 4000 = no filter
  const allowedAzhwarIds = thousandId
    ? new Set(Object.entries(AZHWAR_SECTIONS)
        .filter(([, secs]) => secs.some(s => SECTION_TO_THOUSAND[s] === Number(thousandId)))
        .map(([id]) => Number(id)))
    : null; // null = all azhwars allowed

  // allowed desam ids = desams sung by allowed azhwars
  // We filter after fetching using azhwar_ids on each desam
  // use thousand_ids field from API (most reliable filter)
  function desamAllowed(desam) {
    if (!thousandId) return true;
    return (desam.thousand_ids || []).includes(Number(thousandId));
  }

  function azhwarAllowed(authorId) {
    if (!allowedAzhwarIds) return true;
    return allowedAzhwarIds.has(Number(authorId));
  }

  const $ = () => document.getElementById("fdd-content");
  const set = (html) => { if ($()) $().innerHTML = html; };
  const loading = () => { if ($()) $().innerHTML = `<div style="text-align:center;padding:30px;"><div class="fdd-lotus" style="font-size:40px;">🪷</div></div>`; };

  // ── main view router ──────────────────────────────────────────────────────
  window.fddView = async function(view, page = 0) {
    loading();
    if (view === "desam") {
      const res = window._fddAllDesams || await fetch(`${API_DD}?sub=list`).then(r => r.json());
      const filtered = res.filter(d => desamAllowed(d));
      set(renderPickList(filtered, `திவ்யதேசங்கள் (${filtered.length})`, "fddDesamPage", page, d => `
        <div class="fdd-pick-item" onclick="fddOpenDesam(${d.divyadesam_id})">
          <div>${d.canonical_name}${d.total_pasurams>0?` <span style="font-size:11px;color:#b38b2e;">(${d.total_pasurams})</span>`:""}</div>
          <div class="fdd-pick-sub">${[d.perumal_name, friendlyRegion(d.traditional_region)].filter(Boolean).join(" · ")}</div>
          ${d.azhwar_counts&&Object.keys(d.azhwar_counts).length?`<div class="fdd-pick-sub" style="color:#4a2c00;font-size:11px;">${Object.entries(d.azhwar_counts).map(([id,n])=>azhwarShortName(id)+"("+n+")").join(" | ")}</div>`:""}
        </div>`));
    } else if (view === "azhwar") {
      const filteredAzhwars = AZHWARS.filter(a => azhwarAllowed(a.id));
      set(renderPickList(filteredAzhwars, "ஆழ்வார்கள்", "fddAzhwarPage", page, a => `
        <div class="fdd-pick-item" onclick="fddOpenAzhwar(${a.id})">
          <div>ஸ்ரீ ${a.name}</div>
          ${a.month ? `<div class="fdd-pick-sub">${a.month} — ${a.star}</div>` : ""}
        </div>`));
    } else if (view === "mandalam" || view === "state" || view === "district") {
      const res = await fetch(`${API_DD}?sub=filters`).then(r => r.json());
      const items = view === "mandalam" ? res.regions : view === "state" ? res.states : res.districts;
      const label = view === "mandalam" ? "மண்டலம்" : view === "state" ? "மாநிலம்" : "மாவட்டம்";
      const fn = view === "mandalam" ? "fddPickRegion" : view === "state" ? "fddPickState" : "fddPickDistrict";
      set(renderPickList(items.map(v=>({v})), label, `fddFilterPage_${view}`, page, x => `
        <div class="fdd-pick-item" onclick="${fn}('${x.v.replace(/'/g,"\\'")}')">
          <div>${friendlyRegion(x.v)||x.v}</div>
        </div>`));
    } else if (view === "special") {
      const tNum = Number(thousandId);
      // All 3 special groups confirmed in 4th thousand (Nammazhwar Thiruvaimozhi)
      const sT = !thousandId||tNum===4, sN = !thousandId||tNum===4, sI = !thousandId||tNum===4;
      set(`
        <div class="fdd-picklist-box">
          <div class="fdd-picklist-heading">சிறப்பு திவ்யதேச குழுக்கள்</div>
          ${sT?`<div class="fdd-pick-item" onclick="fddOpenSpecial('thirunangur')"><div>திருநாங்கூர் திவ்யதேசங்கள்</div><div class="fdd-pick-sub">11 — 2nd thousand</div></div>`:""}
          ${sN?`<div class="fdd-pick-item" onclick="fddOpenSpecial('navathiruppathi')"><div>நவதிருப்பதி திவ்யதேசங்கள்</div><div class="fdd-pick-sub">9 — 2nd thousand</div></div>`:""}
          ${sI?`<div class="fdd-pick-item" onclick="fddOpenSpecial('irattai')"><div>இரட்டை திருப்பதி திவ்யதேசங்கள்</div><div class="fdd-pick-sub">2 — 4th thousand</div></div>`:""}
        </div>`);
    }
  };

  // ── pagination callbacks ──────────────────────────────────────────────────
  window.fddDesamPage  = (p) => fddView("desam", p); // uses same desamAllowed filter
  window.fddAzhwarPage = (p) => fddView("azhwar", p); // uses same azhwarAllowed filter

  // ── open one desam (full display) ────────────────────────────────────────
  window.fddOpenDesam = async function(desam_id) {
    loading();
    const res = await fetch(`${API_DD}?sub=by-desam&desam_id=${desam_id}`).then(r => r.json());
    const back = `<div class="fdd-back" onclick="fddView('desam')">◀ திவ்யதேசங்கள்</div>`;
    // filter azhwars to only those relevant to this thousand
    const filteredAzhwars = (res.azhwars || []).filter(a => azhwarAllowed(a.author_id));
    if (!filteredAzhwars.length) { set(back + `<div style="text-align:center;padding:20px;color:#aaa;">பாசுரங்கள் இல்லை</div>`); return; }
    const detail = await buildDesamDetail({ desam: res.desam, azhwars: filteredAzhwars });
    set(back + detail);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── open one azhwar (full display) ───────────────────────────────────────
  window.fddOpenAzhwar = async function(author_id) {
    loading();
    const res = await fetch(`${API_DD}?sub=by-azhwar&author_id=${author_id}`).then(r => r.json());
    const azhwar = AZHWARS.find(a => a.id === author_id);
    const back = `<div class="fdd-back" onclick="fddView('azhwar')">◀ ஆழ்வார்கள்</div>`;
    if (!res.desams?.length) { set(back + `<div style="text-align:center;padding:20px;color:#aaa;">திவ்யதேசங்கள் இல்லை</div>`); return; }

    let html = back;
    if (azhwar) html += `
      <div style="text-align:center;font-size:20px;font-weight:900;color:#4a2c00;margin-bottom:4px;">ஸ்ரீ ${azhwar.name}</div>
      ${azhwar.month ? `<div style="text-align:center;font-size:13px;color:#7a5a20;margin-bottom:16px;">${azhwar.month} — ${azhwar.star}</div>` : ""}
    `;

    for (const desam of res.desams) {
      // build azhwar group from desam.pasurams
      const fakeAzhwars = [{ author_id, pasurams: desam.pasurams }];
      html += await buildDesamDetail({ desam, azhwars: fakeAzhwars });
    }
    set(html);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── filter picks → desam list ─────────────────────────────────────────────
  async function showFilterResult(sub, paramKey, paramVal, backAction) {
    loading();
    const res = await fetch(`${API_DD}?sub=${sub}&${paramKey}=${encodeURIComponent(paramVal)}`).then(r => r.json());
    const back = `<div class="fdd-back" onclick="${backAction}">◀ ${paramVal}</div>`;
    const list = res.filter(d => desamAllowed(d)).map(d => `
      <div class="fdd-desam-list-item" onclick="fddOpenDesam(${d.divyadesam_id})">
        <div class="fdd-desam-list-name">${d.canonical_name}</div>
        <div class="fdd-desam-list-sub">${[d.perumal_name, d.thayar_name].filter(Boolean).join(" | ")}</div>
      </div>`).join("");
    set(back + `<div class="fdd-picklist-box"><div class="fdd-picklist-heading">${paramVal} (${res.length})</div>${list || '<div style="padding:10px;color:#aaa;text-align:center;">இல்லை</div>'}</div>`);
  }

  window.fddPickRegion   = (v) => showFilterResult("by-region",   "region",   v, "fddView('mandalam')");
  window.fddPickState    = (v) => showFilterResult("by-state",    "state",    v, "fddView('state')");
  window.fddPickDistrict = (v) => showFilterResult("by-district", "district", v, "fddView('district')");

  // ── special groups ────────────────────────────────────────────────────────
  window.fddOpenSpecial = async function(group) {
    loading();
    const res = await fetch(`${API_DD}?sub=special&group=${group}`).then(r => r.json());
    const back = `<div class="fdd-back" onclick="fddView('special')">◀ சிறப்பு குழுக்கள்</div>`;
    const list = (res.desams || []).filter(d => desamAllowed(d)).map(d => `
      <div class="fdd-desam-list-item" onclick="fddOpenDesam(${d.divyadesam_id})">
        <div class="fdd-desam-list-name">${d.canonical_name}</div>
        <div class="fdd-desam-list-sub">${[d.perumal_name, d.thayar_name].filter(Boolean).join(" | ")}</div>
      </div>`).join("");
    set(back + `<div class="fdd-picklist-box"><div class="fdd-picklist-heading">${group} (${res.desams?.length || 0})</div>${list || '<div style="padding:10px;color:#aaa;text-align:center;">இல்லை</div>'}</div>`);
  };
}
