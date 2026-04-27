// =============================================================
// 🪷 fullAzhwars.js  →  js/render/fullAzhwars.js
// ⚠️  Raw fetch only — no api.js imports (avoids safeRender loop)
// =============================================================

import { state } from "../state.js";
import { renderThaniyan } from "./thaniyan.js";
import { renderMadal, renderKootrirukkai } from "./special.js";
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

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

const AZHWARS = [
  { id:1,  name:"பொய்கை ஆழ்வார்",          month:"ஐப்பசி",    star:"ஓணம்",        sections:[14] },
  { id:2,  name:"பூதத்தாழ்வார்",            month:"ஐப்பசி",    star:"அவிட்டம்",    sections:[15] },
  { id:3,  name:"பேயாழ்வார்",              month:"ஐப்பசி",    star:"சதயம்",       sections:[16] },
  { id:4,  name:"திருமழிசை ஆழ்வார்",        month:"தை",        star:"மகம்",        sections:[6, 17] },
  { id:5,  name:"மதுரகவி ஆழ்வார்",          month:"சித்திரை",  star:"சித்திரை",    sections:[10] },
  { id:6,  name:"நம்மாழ்வார்",              month:"வைகாசி",    star:"விசாகம்",     sections:[18, 19, 20, 26] },
  { id:7,  name:"பெரியாழ்வார்",             month:"ஆனி",       star:"ஸ்வாதி",      sections:[1, 2] },
  { id:8,  name:"ஆண்டாள்",                 month:"ஆடி",       star:"பூரம்",       sections:[3, 4] },
  { id:9,  name:"குலசேகராழ்வார்",           month:"மாசி",      star:"புனர் பூசம்", sections:[5] },
  { id:10, name:"தொண்டரடிப்பொடி ஆழ்வார்",  month:"மார்கழி",   star:"கேட்டை",      sections:[7, 8] },
  { id:11, name:"திருப்பாணாழ்வார்",         month:"கார்த்திகை",star:"ரோகிணி",      sections:[9] },
  { id:12, name:"திருமங்கை ஆழ்வார்",        month:"கார்த்திகை",star:"கார்த்திகை",  sections:[11, 12, 13, 21, 22, 23] },
  { id:13, name:"திருவரங்கத்தமுதனார்",      month:null,        star:null,          acharya:true, sections:[24] }
];

const SECTION_TO_THOUSAND = {
  1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,
  11:2,12:2,13:2,
  14:3,15:3,16:3,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:3,
  26:4
};

const SPECIAL_MADAL  = [22, 23];
const SPECIAL_KOOTRI = [21];
const SKIP_THANIYAN_SECTIONS = [2, 12, 13];

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
  18:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த ருக்வேதஸாரமான திருவிருத்தம்",
  19:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த யஜுர்வேதஸாரமான திருவாசிரியம்",
  20:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த அதர்வணவேத ஸாரமான பெரியதிருவந்தாதி",
  21:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருவெழுகூற்றிருக்கை",
  22:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த சிறியதிருமடல்",
  23:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரியதிருமடல்",
  24:"ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த ப்ரபந்நகாயத்ரி என்னும்‌ இராமாநுச நூற்றந்தாதி",
  26:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி"
};

const sectionNameMap = { 21:"திருவெழுகூற்றிருக்கை", 22:"சிறியதிருமடல்", 23:"பெரியதிருமடல்" };

// ── CSS ───────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("full-azhwars-style")) return;
  const style = document.createElement("style");
  style.id = "full-azhwars-style";
  style.textContent = `
    .faz-page { background:#ffffff; max-width:700px; margin:0 auto; padding:20px 14px 80px; font-family:"Latha","Bamini",serif; font-size:var(--base-font,18px); }
    .faz-page-title { text-align:center; font-size:26px; font-weight:900; color:#4a2c00; margin-bottom:6px; }
    .faz-page-subtitle { text-align:center; font-size:15px; color:#7a5a20; margin-bottom:4px; }
    .faz-divider { width:120px; height:2px; background:#b38b2e; margin:8px auto 24px; }
    .faz-index-box { background:#ffffff; border:3px double #b38b2e; border-radius:8px; padding:18px 16px; margin-bottom:30px; }
    .faz-index-title { text-align:center; font-size:17px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:8px; margin-bottom:14px; }
    .faz-index-row { display:flex; align-items:flex-start; gap:8px; padding:7px 0; border-bottom:1px dotted #e8d5a0; font-size:15px; color:#2a1a00; text-decoration:none; }
    .faz-index-row:last-child { border-bottom:none; }
    .faz-index-num { min-width:22px; font-size:12px; color:#b38b2e; font-weight:700; text-align:left; padding-top:2px; }
    .faz-index-name { font-weight:700; flex:1; text-align:left; display:block; }
    .faz-index-birth { font-size:11px; color:#7a5a20; white-space:normal; text-align:left; display:block; margin-top:1px; font-style:italic; }
    .faz-azhwar-block { margin-bottom:36px; }
    .faz-thaniyan-box { background:#ffffff; border:3px double #b38b2e; border-radius:8px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(179,139,46,0.08); }
    .faz-thaniyan-label { text-align:center; font-size:12px; font-weight:700; color:#b38b2e; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase; }
    .faz-content-box { background:#ffffff; border:3px double #b38b2e; border-radius:8px; padding:18px 16px 16px; margin-bottom:20px; box-shadow:0 2px 8px rgba(179,139,46,0.08); }
    .faz-section-heading { text-align:center; font-size:16px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:10px; margin-bottom:14px; line-height:1.5; }
    .faz-pathu-heading { text-align:center; font-size:17px; font-weight:800; color:#4a2c00; margin:14px 0 8px; padding:6px 0; border-bottom:1px dashed #d4a843; }
    .faz-thirumozhi-box { background:#ffffff; border:3px double #b38b2e; border-radius:6px; padding:14px 14px 10px; margin-bottom:14px; }
    .faz-thirumozhi-heading { text-align:center; font-size:15px; font-weight:700; color:#4a2c00; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #e8d5a0; line-height:1.6; }
    .faz-pasuram-block { margin-bottom:10px; }
    .faz-global-no { font-size:13px; font-weight:700; color:#b38b2e; text-align:left; margin-bottom:4px; }
    .faz-lines { font-size:var(--base-font,18px); color:#1a2a00; line-height:2; text-align:left; }
    .faz-line { display:block; }
    .faz-group-gap { display:block; height:14px; }
    .faz-local-no { font-size:12px; color:#999; text-align:right; margin-top:2px; }
    .faz-pasuram-sep { height:1px; background:#e8d5a0; margin:10px 0; }
    .faz-section-closing { text-align:center; font-size:15px; font-weight:700; color:#4a2c00; margin-top:14px; padding-top:12px; border-top:1px solid #d4a843; }
    .faz-end-ornament { text-align:center; margin:36px 0 16px; color:#b38b2e; font-size:18px; letter-spacing:5px; }
    .faz-float-nav { position:fixed; bottom:20px; right:12px; display:flex; flex-direction:column; gap:8px; z-index:999; }
    .faz-float-nav button { width:44px; height:44px; border-radius:50%; border:2px solid #b38b2e; background:#fff; color:#4a2c00; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.15); }
    .faz-spinner-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; }
    .faz-lotus { font-size:48px; animation:faz-spin 1.6s linear infinite; }
    @keyframes faz-spin { 0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.1);} 100%{transform:rotate(360deg) scale(1);} }
    .faz-loading-text { margin-top:14px; font-size:16px; color:#7a5a20; }
    /* thaniyan prosody — display only, kept small */
    .thaniyan-prosody {
      font-size: 11px !important;
      color: #999 !important;
      font-style: italic;
      margin-bottom: 2px;
    }
  `;
  document.head.appendChild(style);
}

export function azhwarSpinner() {
  return `<div class="faz-spinner-wrap"><div class="faz-lotus">🪷</div><div class="faz-loading-text">Content Loading...</div></div>`;
}

// ── Raw fetchers ──────────────────────────────────────────────────────────────
// thaniyan fetch now via fetchThaniyanWithProsody from displayHelper
async function fetchPasuramRaw(sectionId) {
  const res = await fetch(`${API}/pasuram?section_id=${sectionId}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
async function fetchMadalRaw(sectionId) {
  const res = await fetch(`${API}/madal?section_id=${sectionId}`);
  return await res.json();
}
async function fetchKootrirukkai_Raw(sectionId) {
  const res = await fetch(`${API}/kootrirukkai?section_id=${sectionId}`);
  return await res.json();
}
function getRows(data, type) {
  const raw = Array.isArray(data) ? data : (data?.data || data?.rows || []);
  return type ? raw.filter(r => r.type === type) : raw;
}

// ── Render lines with group gaps ──────────────────────────────────────────────
function renderLinesWithGroups(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  let html = "", lastGroup = null;
  for (const l of lines) {
    const g = l.group ?? 1;
    const text = typeof l === "string" ? l : (l?.text || "");
    if (lastGroup !== null && g !== lastGroup) html += `<div class="faz-group-gap"></div>`;
    html += `<div class="faz-line">${text}</div>`;
    lastGroup = g;
  }
  return html;
}

// ── Render pasurams with per-pasuram display ──────────────────────────────────
function renderPasuramBlock(pasurams, pasuramDisplayMap) {
  let html = "";
  for (let i = 0; i < pasurams.length; i++) {
    const p = pasurams[i];
    if (i > 0) html += `<div class="faz-pasuram-sep"></div>`;
    const displayItem = pasuramDisplayMap?.get(String(p.global_no)) || "";
    html += `
      <div class="faz-pasuram-block">
        ${displayItem}
        <div class="faz-global-no">${p.global_no}</div>
        <div class="faz-lines">${renderLinesWithGroups(p.lines)}</div>
        <div class="faz-local-no">${p.local_no}</div>
      </div>
    `;
  }
  return html;
}

// ── Group pasurams by pathu → thirumozhi with display items ──────────────────
function renderGroupedPasurams(pasurams, displayData) {
  const pasuramDisplayMap    = buildPasuramDisplayMap(displayData);
  const thirumozhiDisplayMap = buildThirumozhiDisplayMap(displayData);
  const pathuDisplayMap      = buildPathuDisplayMap(displayData);

  const pathuMap = new Map();
  for (const p of pasurams) {
    const pk = p.pathu_id != null ? String(p.pathu_id) : "__none__";
    if (!pathuMap.has(pk)) pathuMap.set(pk, { label: p.pathu_name || "", thiruMap: new Map() });
    const pm = pathuMap.get(pk);
    const tk = p.thirumozhi_id != null ? String(p.thirumozhi_id) : "__none__";
    if (!pm.thiruMap.has(tk)) {
      pm.thiruMap.set(tk, {
        thiruName: p.thirumozhi_name || "",
        subunit: p.pathu_subunit_name || "",
        thiruHeading: p.thirumozhi_heading || "",
        pasurams: []
      });
    }
    pm.thiruMap.get(tk).pasurams.push(p);
  }

  let html = "";
  for (const [pk, pathu] of pathuMap) {
    if (pathu.label) html += `<div class="faz-pathu-heading">${pathu.label}</div>`;
    if (pk !== "__none__") html += pathuDisplayMap.get(pk) || "";

    for (const [tk, thiru] of pathu.thiruMap) {
      const line1 = thiru.thiruName || thiru.subunit || "";
      const line2 = thiru.thiruHeading || "";
      const parts = [line1, line2].filter(Boolean);
      const thiruHeadingHtml = parts.length > 0
        ? `<div class="faz-thirumozhi-heading">${parts.join(" — ")}</div>` : "";

      const thiruDisplay = tk !== "__none__" ? (thirumozhiDisplayMap.get(tk) || {}) : {};

      html += `
        <div class="faz-thirumozhi-box">
          ${thiruHeadingHtml}
          ${thiruDisplay.displayHtml || ""}
          ${renderPasuramBlock(thiru.pasurams, pasuramDisplayMap)}
          ${thiruDisplay.closingHtml || ""}
        </div>
      `;
    }
  }
  return html;
}

// ── Build normal section ──────────────────────────────────────────────────────
async function buildNormalSectionBlock(sectionId, azhwarHeader = "") {
  const heading = sectionHeaderMap[sectionId] || `Section ${sectionId}`;

  let thaniyanHtml = "";
  if (!SKIP_THANIYAN_SECTIONS.includes(sectionId)) {
    const { rows: thaniyanData, prosodyMap: thaniyanProsodyMap } = await fetchThaniyanWithProsody(sectionId);
    const rows = getRows(thaniyanData, "section");
    if (rows.length > 0) {
      thaniyanHtml = `
        <div class="faz-thaniyan-box">
          <div class="faz-thaniyan-label">தனியன்</div>
          ${renderThaniyan(rows, thaniyanProsodyMap)}
        </div>
      `;
    }
  }

  const displayData = await fetchDisplayData(sectionId);
  const pasurams    = await fetchPasuramRaw(sectionId);

  const sectionDisplayHtml = renderSectionDisplayItems(displayData);
  const prosodyHtml        = renderSectionProsody(displayData);
  const adivaravuHtml      = renderAdivaravu(displayData);
  const closingHtml        = renderSectionClosing(displayData, "faz-section-closing");
  const groupedHtml        = renderGroupedPasurams(pasurams, displayData);

  const contentBox = `
    <div class="faz-content-box">
      ${azhwarHeader}
      <div class="faz-section-heading">${heading}</div>
      ${sectionDisplayHtml}
      ${prosodyHtml}
      ${groupedHtml}
      ${adivaravuHtml}
      ${closingHtml}
    </div>
  `;

  return thaniyanHtml + contentBox;
}

// ── Build special section (21/22/23) ─────────────────────────────────────────
async function buildSpecialSectionBlock(sectionId, azhwarHeader = "") {
  const heading    = sectionHeaderMap[sectionId] || `Section ${sectionId}`;
  const sectionName = sectionNameMap[sectionId] || "";

  let thaniyanHtml = "";
  const { rows: thaniyanData, prosodyMap: thaniyanProsodyMap } = await fetchThaniyanWithProsody(sectionId);
  const rows = getRows(thaniyanData, "section");
  if (rows.length > 0) {
    thaniyanHtml = `
      <div class="faz-thaniyan-box">
        <div class="faz-thaniyan-label">தனியன்</div>
        ${renderThaniyan(rows, thaniyanProsodyMap)}
      </div>
    `;
  }

  state.selectedSectionId   = sectionId;
  state.selectedSectionName = sectionName;
  state.isFullRender        = false;
  state.thaniyanData        = null;

  const displayData = await fetchDisplayData(sectionId);
  state.displayMap = {
    section:    displayData.section    || [],
    pathu:      displayData.pathu      || {},
    thirumozhi: displayData.thirumozhi || {},
    pasuram:    displayData.pasuram    || {}
  };
  state.sectionClosing  = displayData.sectionClosing  || [];
  state.prosodyScope    = displayData.prosodyScope     || [];
  state.prosodyMaster   = {};
  (displayData.prosodyMaster || []).forEach(p => { state.prosodyMaster[p.prosody_id] = p; });

  let specialHtml = "";
  if (SPECIAL_MADAL.includes(sectionId)) {
    const madalData = await fetchMadalRaw(sectionId);
    state.madalData = madalData;
    specialHtml = renderMadal(madalData);
  } else if (SPECIAL_KOOTRI.includes(sectionId)) {
    const kootriData = await fetchKootrirukkai_Raw(sectionId);
    state.kootrirukkaiData = kootriData;
    specialHtml = renderKootrirukkai(kootriData);
  }

  return `
    ${thaniyanHtml}
    <div class="faz-content-box">
      ${azhwarHeader}
      <div class="faz-section-heading">${heading}</div>
      ${specialHtml}
    </div>
  `;
}

// ── Index ─────────────────────────────────────────────────────────────────────
function buildIndex(azhwarsToShow) {
  return `
    <div class="faz-index-box">
      <div class="faz-index-title">📑 ஆழ்வார்கள் — அட்டவணை</div>
      ${azhwarsToShow.map((a, i) => {
        const birth = a.month && a.star ? `${a.month} — ${a.star}` : "";
        return `
          <a class="faz-index-row" href="#faz-azhwar-${a.id}">
            <span class="faz-index-num">${i + 1}.</span>
            <span style="flex:1;">
              <span class="faz-index-name">ஸ்ரீ ${a.name}</span>
              ${birth ? `<span class="faz-index-birth">${birth}</span>` : ""}
            </span>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

// ── Floating nav ──────────────────────────────────────────────────────────────
function floatingNav() {
  return `
    <div class="faz-float-nav">
      <button onclick="window.location.href='tree.html'" title="Home">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})" title="Up">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})" title="Down">▶</button>
      <button onclick="fazAdjFont(2)" title="Font+">A+</button>
      <button onclick="fazAdjFont(-2)" title="Font-">A-</button>
    </div>
  `;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function renderFullAzhwars(selectedThousandId = null) {
  injectCSS();
  injectDisplayCSS();

  window.fazAdjFont = function(delta) {
    const current = getComputedStyle(document.documentElement).getPropertyValue('--base-font').trim();
    let size = current ? parseFloat(current) : 18;
    if (isNaN(size)) size = 18;
    if (delta < 0 && size <= 12) return;
    document.documentElement.style.setProperty('--base-font', (size + delta) + 'px');
  };

  const isFullMode = !selectedThousandId;

  const azhwarsToShow = AZHWARS.filter(a =>
    isFullMode || a.sections.some(secId => SECTION_TO_THOUSAND[secId] === Number(selectedThousandId))
  );

  const pageTitle = isFullMode
    ? "நாலாயிர திவ்யப்பிரபந்தம்"
    : ({1:"முதலாமாயிரம்",2:"இரண்டாமாயிரம்",3:"மூன்றாமாயிரம்",4:"நான்காமாயிரம்"}[selectedThousandId] || "");

  let html = `
    <div class="faz-page">
      <div class="faz-page-title">${pageTitle}</div>
      <div class="faz-page-subtitle">ஆழ்வார்கள் — அருளிச்செயல்</div>
      <div class="faz-divider"></div>
      ${buildIndex(azhwarsToShow)}
  `;

  for (const azhwar of azhwarsToShow) {
    const sectionsToShow = isFullMode
      ? azhwar.sections
      : azhwar.sections.filter(secId => SECTION_TO_THOUSAND[secId] === Number(selectedThousandId));
    if (sectionsToShow.length === 0) continue;

    const birthLine = azhwar.month && azhwar.star
      ? `${azhwar.month} மாதம் — ${azhwar.star} நட்சத்திரம்` : "";

    // azhwar name + birth stored — injected into FIRST section's content box heading
    const azhwarLabel = `ஸ்ரீ ${azhwar.name}`;
    const azhwarBirth = azhwar.month
      ? `${azhwar.month} மாதம் — ${azhwar.star} நட்சத்திரம்` : "";
    let firstSection = true;

    html += `<div class="faz-azhwar-block" id="faz-azhwar-${azhwar.id}">`;

    let isFirstSec = true;
    for (const secId of sectionsToShow) {
      // Build azhwar header — injected inside first section's content box only
      const azhHdr = isFirstSec ? `
        <div style="text-align:center;font-size:16px;font-weight:900;color:#4a2c00;margin-bottom:2px;">ஸ்ரீ ${azhwarLabel}</div>
        ${azhwarBirth ? `<div style="text-align:center;font-size:12px;color:#7a5a20;font-style:italic;margin-bottom:8px;">${azhwarBirth}</div>` : ""}
        <div style="height:1px;background:#d4a843;margin:0 0 12px;"></div>
      ` : "";
      isFirstSec = false;
      if (SPECIAL_MADAL.includes(secId) || SPECIAL_KOOTRI.includes(secId)) {
        html += await buildSpecialSectionBlock(secId, azhHdr);
      } else {
        html += await buildNormalSectionBlock(secId, azhHdr);
      }
    }

    html += `</div>`;
  }

  html += `
      <div class="faz-end-ornament">❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖</div>
    </div>
    ${floatingNav()}
  `;

  return html;
}
