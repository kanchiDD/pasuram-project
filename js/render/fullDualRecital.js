// =============================================================
// 🔥 fullDualRecital.js  →  js/render/fullDualRecital.js
// ⚠️  Raw fetch only — no api.js imports (avoids safeRender loop)
// ✅  OPTIMISED: parallel fetches + in-memory dedup cache
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
  renderSectionClosing,
  buildPasuramDisplayMap,
  buildThirumozhiDisplayMap,
  buildPathuDisplayMap
} from "./displayHelper.js";

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

const sectionHeaderMap = {
  "திருப்பல்லாண்டு": "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த திருப்பல்லாண்டு",
  "பெரியாழ்வார் திருமொழி": "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த பெரியாழ்வார் திருமொழி",
  "திருப்பாவை": "ஸ்ரீ ஆண்டாள் அருளிச்செய்த திருப்பாவை",
  "நாச்சியார் திருமொழி": "ஸ்ரீ ஆண்டாள் அருளிச்செய்த நாச்சியார் திருமொழி",
  "பெருமாள் திருமொழி": "ஸ்ரீ குலசேகர பெருமாள் அருளிச்செய்த பெருமாள் திருமொழி",
  "திருச்சந்தவிருத்தம்": "ஸ்ரீ திருமழிசைப்பிரான் அருளிச்செய்த திருச்சந்தவிருத்தம்",
  "திருமாலை": "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருமாலை",
  "திருப்பள்ளியெழுச்சி": "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருப்பள்ளியெழுச்சி",
  "அமலனாதிபிரான்": "ஸ்ரீ திருப்பாணாழ்வார் அருளிச்செய்த அமலனாதிபிரான்",
  "கண்ணிநுண்சிறுத்தாம்பு": "ஸ்ரீ மதுரகவி ஆழ்வார் அருளிச்செய்த கண்ணிநுண்சிறுத்தாம்பு",
  "பெரிய திருமொழி": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரிய திருமொழி",
  "திருகுறுந்தாண்டகம்": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருகுறுந்தாண்டகம்",
  "திருநெடுந்தாண்டகம்": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருநெடுந்தாண்டகம்",
  "முதல்‌ திருவந்தாதி": "ஸ்ரீ பொய்கையாழ்வார்‌ அருளிச்செய்த முதல்‌ திருவந்தாதி",
  "இரண்டாம்‌ திருவந்தாதி": "ஸ்ரீ பூதத்தாழ்வார்‌ அருளிச்செய்த இரண்டாம்‌ திருவந்தாதி",
  "மூன்றாம்‌ திருவந்தாதி": "ஸ்ரீ பேயாழ்வார்‌ அருளிச்செய்த மூன்றாம்‌ திருவந்தாதி",
  "நான்முகன்‌திருவந்தாதி": "ஸ்ரீ திருமழிசைப்பிரான்‌ அருளிச்செய்த நான்முகன்‌திருவந்தாதி",
  "திருவிருத்தம்": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த ருக்வேதஸாரமான திருவிருத்தம்",
  "திருவாசிரியம்": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த யஜுர்வேதஸாரமான திருவாசிரியம்",
  "பெரியதிருவந்தாதி": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த அதர்வணவேத ஸாரமான பெரியதிருவந்தாதி",
  "திருவெழுகூற்றிருக்கை": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருவெழுகூற்றிருக்கை",
  "சிறியதிருமடல்": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த சிறியதிருமடல்",
  "பெரியதிருமடல்": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரியதிருமடல்",
  "இராமாநுச நூற்றந்தாதி": "ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த ப்ரபந்நகாயத்ரி என்னும்‌ இராமாநுச நூற்றந்தாதி",
  "உபதேசரத்தினமாலை": "ஸ்ரீ பெரியஜீயர் அருளிச்செய்த உபதேசரத்தினமாலை",
  "திருவாய்மொழி": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி",
  "திருவாய்மொழி நூற்றந்தாதி": "ஸ்ரீ மணவாள மாமுனிகள் அருளிச்செய்த திருவாய்மொழி நூற்றந்தாதி",
  "ஞானசாரம்": "பரமகாருணிகரான அருளாளப்  பெருமாள் எம்பெருமானார் திருவாய் மலர்ந்தருளிய  ஞானசாரம்",
  "ப்ரமேயஸாரம்": "பரமகாருணிகரான அருளாளப்  பெருமாள் எம்பெருமானார் திருவாய் மலர்ந்தருளிய ப்ரமேயஸாரம்",
  "ஸப்தகாதை": "ஸ்ரீ விலாஞ்சோலைப்பிள்ளை  அருளிச்செய்த  ஸப்தகாதை",
  "ஆர்த்தி ப்ரபந்தம்": "ஸ்ரீ மணவாள மாமுனிகள் அருளிச்செய்த ஆர்த்தி ப்ரபந்தம்"
};

const SKIP_THANIYAN_SECTIONS = [2, 12, 13];
const SPECIAL_MADAL  = [22, 23]; // சிறியதிருமடல், பெரியதிருமடல்
const SPECIAL_KOOTRI = [21];     // திருவெழுகூற்றிருக்கை
const sectionNameMap = { 21:"திருவெழுகூற்றிருக்கை", 22:"சிறியதிருமடல்", 23:"பெரியதிருமடல்" };

// ── In-memory fetch cache (deduplication) ─────────────────────────────────────
// Stores Promise objects so parallel calls for the same URL share one request.
const _fetchCache = new Map();
function cachedFetch(url) {
  if (!_fetchCache.has(url)) {
    _fetchCache.set(url, fetch(url).then(r => r.json()));
  }
  return _fetchCache.get(url);
}

// ── CSS ───────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("full-dual-recital-style")) return;
  const style = document.createElement("style");
  style.id = "full-dual-recital-style";
  style.textContent = `
    .fdr-page {
      background: #ffffff;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px 14px 80px;
      font-family: "Latha", "Bamini", serif;
      font-size: var(--base-font, 18px);
    }
    .fdr-page-title { text-align:center; font-size:26px; font-weight:900; color:#4a2c00; margin-bottom:6px; }
    .fdr-page-subtitle { text-align:center; font-size:15px; color:#7a5a20; margin-bottom:4px; }
    .fdr-divider { width:120px; height:2px; background:#b38b2e; margin:8px auto 24px; }
    .fdr-thousand-heading { text-align:center; font-size:20px; font-weight:900; color:#4a2c00; margin:28px 0 14px; }
    .fdr-section-box { background:#ffffff; border:3px double #b38b2e; border-radius:8px; padding:18px 16px 16px; margin-bottom:34px; box-shadow:0 2px 8px rgba(179,139,46,0.08); }
    .fdr-section-heading { text-align:center; font-size:16px; font-weight:800; color:#4a2c00; border-bottom:1.5px solid #d4a843; padding-bottom:10px; margin-bottom:16px; line-height:1.5; }
    .fdr-thaniyan-box { background:#ffffff; border:3px double #b38b2e; border-radius:6px; padding:14px; margin-bottom:16px; }
    .fdr-thaniyan-label { text-align:center; font-size:12px; font-weight:700; color:#b38b2e; letter-spacing:1px; margin-bottom:8px; text-transform:uppercase; }
    .fdr-pathu-heading { text-align:center; font-size:17px; font-weight:800; color:#4a2c00; margin:14px 0 8px; padding:6px 0; border-bottom:1px dashed #d4a843; }
    .fdr-thirumozhi-box { background:#ffffff; border:3px double #b38b2e; border-radius:6px; padding:14px 14px 10px; margin-bottom:14px; }
    .fdr-thirumozhi-heading { text-align:center; font-size:15px; font-weight:700; color:#4a2c00; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #e8d5a0; line-height:1.6; }
    .fdr-count-badge { display:inline-block; background:#e8f5e9; color:#1a6b3a; font-size:12px; font-weight:700; padding:1px 10px; border-radius:12px; margin-left:10px; border:1px solid #8cc98c; }
    .fdr-pasuram-block { margin-bottom:10px; }
    .fdr-global-no { font-size:13px; font-weight:700; color:#b38b2e; text-align:left; margin-bottom:4px; }
    .fdr-lines { font-size:var(--base-font,18px); color:#1a2a00; line-height:2; text-align:left; }
    .fdr-line { display:block; }
    .fdr-group-gap { display:block; height:14px; }
    .fdr-local-no { font-size:12px; color:#999; text-align:right; margin-top:2px; }
    .fdr-pasuram-sep { height:1px; background:#e8d5a0; margin:10px 0; }
    /* couplet no right-aligned on last line of each couplet */
    .fdr-line-with-no {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .fdr-couplet-no {
      font-size: 12px;
      color: #999;
      margin-left: 8px;
      flex-shrink: 0;
    }
    .fdr-section-closing { text-align:center; font-size:15px; font-weight:700; color:#4a2c00; margin-top:14px; padding-top:12px; border-top:1px solid #d4a843; }
    .fdr-end-ornament { text-align:center; margin:36px 0 16px; color:#b38b2e; font-size:18px; letter-spacing:5px; }
    .fdr-float-nav { position:fixed; bottom:20px; right:12px; display:flex; flex-direction:column; gap:8px; z-index:999; }
    .fdr-float-nav button { width:44px; height:44px; border-radius:50%; border:2px solid #b38b2e; background:#fff; color:#4a2c00; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.15); }
    .fdr-spinner-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; }
    .fdr-lotus { font-size:48px; animation:fdr-spin 1.6s linear infinite; }
    @keyframes fdr-spin { 0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.1);} 100%{transform:rotate(360deg) scale(1);} }
    .fdr-loading-text { margin-top:14px; font-size:16px; color:#7a5a20; font-family:"Latha","Bamini",serif; }
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

export function dualRecitalSpinner() {
  return `<div class="fdr-spinner-wrap"><div class="fdr-lotus">🪷</div><div class="fdr-loading-text">Content Loading...</div></div>`;
}

// ── Raw fetchers ──────────────────────────────────────────────────────────────
async function fetchThousandRaw() {
  if (state.thousandData) return state.thousandData;
  return cachedFetch(`${API}/thousand`);
}
async function fetchPasuramRaw(sectionId) {
  const data = await cachedFetch(`${API}/pasuram?section_id=${sectionId}`);
  return Array.isArray(data) ? data : [];
}
async function fetchMadalRaw(sectionId) {
  return cachedFetch(`${API}/madal?section_id=${sectionId}`);
}
async function fetchKootrirukkai_Raw(sectionId) {
  return cachedFetch(`${API}/kootrirukkai?section_id=${sectionId}`);
}
function getRows(data, type) {
  const raw = Array.isArray(data) ? data : (data?.data || data?.rows || []);
  return type ? raw.filter(r => r.type === type) : raw;
}

// ── Render lines with recital group gaps ─────────────────────────────────────
function renderLinesWithGroups(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  let html = "", lastGroup = null;
  for (const l of lines) {
    const g = l.group ?? 1;
    const text = typeof l === "string" ? l : (l?.text || "");
    if (lastGroup !== null && g !== lastGroup) html += `<div class="fdr-group-gap"></div>`;
    html += `<div class="fdr-line">${text}</div>`;
    lastGroup = g;
  }
  return html;
}

// ── Render ★★ pasurams for one thirumozhi with per-pasuram display items ──────
function renderPasuramBlock(pasurams, pasuramDisplayMap) {
  let html = "";
  for (let i = 0; i < pasurams.length; i++) {
    const p = pasurams[i];
    if (i > 0) html += `<div class="fdr-pasuram-sep"></div>`;
    // per-pasuram display item (e.g. ragam/talam shown above specific pasurams)
    const displayItem = pasuramDisplayMap?.get(String(p.global_no)) || "";
    html += `
      <div class="fdr-pasuram-block">
        ${displayItem}
        <div class="fdr-global-no">${p.global_no}</div>
        <div class="fdr-lines">${renderLinesWithGroups(p.lines)}</div>
        <div class="fdr-local-no">${p.local_no}</div>
      </div>
    `;
  }
  return html;
}

// ── Floating nav ──────────────────────────────────────────────────────────────
function floatingNav() {
  return `
    <div class="fdr-float-nav">
      <button onclick="window.location.href='tree.html'" title="Home">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})" title="Up">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})" title="Down">▶</button>
      <button onclick="fdrAdjFont(2)" title="Font+">A+</button>
      <button onclick="fdrAdjFont(-2)" title="Font-">A-</button>
    </div>
  `;
}

// ── Build section block ───────────────────────────────────────────────────────
function buildSectionBlock(heading, thaniyanRows, pasurams, displayData) {

  // build lookup maps from display data
  const pasuramDisplayMap   = buildPasuramDisplayMap(displayData);
  const thirumozhiDisplayMap = buildThirumozhiDisplayMap(displayData);
  const pathuDisplayMap     = buildPathuDisplayMap(displayData);

  // section-level display (carnatic/prosody) shown at top
  const sectionDisplayHtml = renderSectionDisplayItems(displayData);
  const prosodyHtml        = renderSectionProsody(displayData);
  const closingHtml        = renderSectionClosing(displayData, "fdr-section-closing");

  const thaniyanHtml = thaniyanRows.length > 0 ? `
    <div class="fdr-thaniyan-box">
      <div class="fdr-thaniyan-label">தனியன்</div>
      ${renderThaniyan(thaniyanRows, thaniyanRows._prosodyMap || {})}
    </div>
  ` : "";

  const dualPasurams = pasurams.filter(p => p.double_recital === 1);

  // group: pathu → thirumozhi
  const pathuMap = new Map();
  for (const p of dualPasurams) {
    const pk = p.pathu_id != null ? String(p.pathu_id) : "__none__";
    if (!pathuMap.has(pk)) pathuMap.set(pk, { label: p.pathu_name || "", thiruMap: new Map() });
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

  let groupsHtml = "";
  for (const [pk, pathu] of pathuMap) {
    if (pathu.label) groupsHtml += `<div class="fdr-pathu-heading">${pathu.label}</div>`;
    // pathu-level display items
    const pathuDisplay = pk !== "__none__" ? (pathuDisplayMap.get(pk) || "") : "";
    if (pathuDisplay) groupsHtml += pathuDisplay;

    for (const [tk, thiru] of pathu.thiruMap) {
      const line1 = thiru.thiruName || thiru.subunit || "";
      const line2 = thiru.thiruHeading || "";
      const parts = [line1, line2].filter(Boolean);
      const thiruHeadingHtml = parts.length > 0
        ? `<div class="fdr-thirumozhi-heading">${parts.join(" — ")}</div>`
        : "";

      // thirumozhi-level display items and closing
      const thiruDisplay = tk !== "__none__" ? (thirumozhiDisplayMap.get(tk) || {}) : {};
      const thiruDisplayHtml = thiruDisplay.displayHtml || "";
      const thiruClosingHtml = thiruDisplay.closingHtml || "";

      groupsHtml += `
        <div class="fdr-thirumozhi-box">
          ${thiruHeadingHtml}
          ${thiruDisplayHtml}
          ${renderPasuramBlock(thiru.pasurams, pasuramDisplayMap)}
          ${thiruClosingHtml}
        </div>
      `;
    }
  }

  const countBadge = dualPasurams.length > 0
    ? ` <span style="font-size:12px;font-weight:400;color:#b38b2e;">(${dualPasurams.length} ★★)</span>`
    : "";

  return `
    <div class="fdr-section-box">
      <div class="fdr-section-heading">${heading}${countBadge}</div>
      ${thaniyanHtml}
      ${sectionDisplayHtml}
      ${prosodyHtml}
      ${groupsHtml}
      ${closingHtml}
    </div>
  `;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function renderFullDualRecital(selectedThousandId = null) {
  injectCSS();
  injectDisplayCSS();

  window.fdrAdjFont = function(delta) {
    const current = getComputedStyle(document.documentElement).getPropertyValue('--base-font').trim();
    let size = current ? parseFloat(current) : 18;
    if (isNaN(size)) size = 18;
    if (delta < 0 && size <= 12) return;
    document.documentElement.style.setProperty('--base-font', (size + delta) + 'px');
  };

  const thousands = await fetchThousandRaw();
  const filtered = selectedThousandId
    ? thousands.filter(t => Number(t.id) === Number(selectedThousandId))
    : thousands;

  const isFullMode = !selectedThousandId;
  const pageTitle = isFullMode ? "நாலாயிர திவ்யப்பிரபந்தம்" : (filtered[0]?.name || "");

  let html = `
    <div class="fdr-page">
      <div class="fdr-page-title">${pageTitle}</div>
      <div class="fdr-page-subtitle">★★ Rettai / Dual Recital Pasurams</div>
      <div class="fdr-divider"></div>
  `;

  // ── Step 1: Fetch all anchor-maps in parallel ─────────────────────────────
  const allAnchorRows = await Promise.all(
    filtered.map(t => cachedFetch(`${API}/anchor-map?thousand_id=${t.id}`))
  );

  // ── Step 2: Collect all unique section IDs across all thousands ───────────
  const allSectionIds = [];
  const seenSections = new Set();
  for (const anchorRows of allAnchorRows) {
    const sectionIds = [...new Set(anchorRows.map(r => r.section_id))].sort((a, b) => a - b);
    for (const secId of sectionIds) {
      if (!seenSections.has(secId)) {
        seenSections.add(secId);
        allSectionIds.push(secId);
      }
    }
  }

  // ── Step 3: Prefetch all section data in parallel ─────────────────────────
  // For each section we need: thaniyan, displayData, and either
  // pasuram / madal / kootrirukkai depending on type.
  const sectionDataMap = new Map(); // secId → { thaniyanRows, displayData, pasurams/madalData/kootriData }

  await Promise.all(allSectionIds.map(async secId => {
    const isSpecialMadal  = SPECIAL_MADAL.includes(Number(secId));
    const isSpecialKootri = SPECIAL_KOOTRI.includes(Number(secId));
    const skipThaniyan    = SKIP_THANIYAN_SECTIONS.includes(Number(secId));

    // Fire all needed fetches for this section concurrently
    const [thaniyanResult, displayData, contentData] = await Promise.all([
      skipThaniyan
        ? Promise.resolve({ rows: [], prosodyMap: {} })
        : fetchThaniyanWithProsody(secId),
      fetchDisplayData(secId),
      isSpecialMadal  ? fetchMadalRaw(secId)         :
      isSpecialKootri ? fetchKootrirukkai_Raw(secId)  :
                        fetchPasuramRaw(secId)
    ]);

    const thaniyanRows = getRows(thaniyanResult.rows, "section");
    thaniyanRows._prosodyMap = thaniyanResult.prosodyMap;

    sectionDataMap.set(secId, {
      thaniyanRows,
      displayData,
      contentData,
      isSpecialMadal,
      isSpecialKootri
    });
  }));

  // ── Step 4: Build HTML (pure sync rendering from prefetched data) ─────────
  for (let ti = 0; ti < filtered.length; ti++) {
    const t = filtered[ti];
    const anchorRows = allAnchorRows[ti];

    if (isFullMode) {
      const tName = t.name === "நாலாயிர திவ்யப்பிரபந்தம்" ? "" : t.name;
      if (tName) html += `<div class="fdr-thousand-heading">${tName}</div>`;
    }

    const sectionIds = [...new Set(anchorRows.map(r => r.section_id))].sort((a, b) => a - b);

    for (const secId of sectionIds) {
      const sectionRow = anchorRows.find(r => r.section_id === secId && r.type === "section");
      let baseName = sectionRow?.canonical_text || "";
      if (!baseName) {
        const FB = {2:"பெரியாழ்வார் திருமொழி",4:"நாச்சியார் திருமொழி",5:"பெருமாள் திருமொழி",11:"பெரிய திருமொழி",26:"திருவாய்மொழி"};
        baseName = FB[secId] || "";
      }

      const { thaniyanRows, displayData, contentData, isSpecialMadal, isSpecialKootri }
        = sectionDataMap.get(secId);

      const heading = sectionHeaderMap[baseName] || baseName;

      // ── special sections use renderMadal / renderKootrirukkai ──────────────
      if (isSpecialMadal || isSpecialKootri) {
        // set state fields that special.js renderers read
        state.selectedSectionId   = secId;
        state.selectedSectionName = sectionNameMap[Number(secId)] || "";
        state.isFullRender        = false;
        state.thaniyanData        = null;
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

        let specialDualHtml = "";

        if (isSpecialMadal) {
          // ── Extract only dual-recital lines/blocks from madal ──────────────
          const madalData = contentData;
          const rules = madalData.rules || [];
          const sectionGlobalNo = madalData.global_no || madalData.section_global_no
            || (secId === 22 ? 2673 : 2674);

          function getBlockRule(c, l) {
            return rules.find(r =>
              r.rule_type === "block_repeat" &&
              ((c > r.start_couplet || (c === r.start_couplet && l >= r.start_line)) &&
               (c < r.end_couplet   || (c === r.end_couplet   && l <= r.end_line)))
            );
          }
          function isLineDual(c, l) {
            return rules.some(r => r.rule_type === "line_repeat" && r.start_couplet == c && r.line_no == l);
          }

          // build grouped lines per couplet
          const grouped = {};
          (madalData.units || []).forEach(u => {
            const c = u.couplet_no;
            if (!grouped[c]) grouped[c] = [];
            for (let i = 1; i <= 8; i++) {
              if (u[`line_${i}`]) grouped[c].push({ text: u[`line_${i}`], line_no: i });
            }
          });

          const couplets = Object.keys(grouped).map(Number).sort((a,b) => a-b);
          const maxCouplet = sectionNameMap[Number(secId)] === "பெரியதிருமடல்" ? 148 : 77;
          let prevBlockRule = null;

          const units = [];

          for (const c of couplets) {
            const lines = grouped[c];
            let thisCoupletBlockRule = null;
            const coupletDualLines = [];

            for (let li = 0; li < lines.length; li++) {
              const l = lines[li];
              const blockRule = getBlockRule(c, l.line_no);
              const lineDual  = isLineDual(c, l.line_no);
              const isInsideBlock = !!blockRule;
              const isLastLine = li === lines.length - 1;

              if (isInsideBlock || lineDual) {
                if (isInsideBlock) thisCoupletBlockRule = blockRule;
                const showCoupletNo = isLastLine && c <= maxCouplet;
                coupletDualLines.push({ text: l.text, showCoupletNo, coupletNo: c });
              }
              prevBlockRule = blockRule || prevBlockRule;
            }

            if (coupletDualLines.length === 0) continue;

            if (thisCoupletBlockRule) {
              const brId = thisCoupletBlockRule.start_couplet + "_" + thisCoupletBlockRule.start_line;
              const existing = units.find(u => u.blockRuleId === brId);
              if (existing) {
                existing.couplets.push({ c, lines: coupletDualLines });
              } else {
                units.push({ blockRuleId: brId, couplets: [{ c, lines: coupletDualLines }] });
              }
            } else {
              units.push({ blockRuleId: null, couplets: [{ c, lines: coupletDualLines }] });
            }
          }

          if (units.length > 0) {
            specialDualHtml = `<div class="fdr-global-no">${sectionGlobalNo}</div>`;
            specialDualHtml += units.map((unit, ui) => {
              const innerHtml = unit.couplets.map(({ c, lines }) => {
                return lines.map((l, li) => {
                  if (l.showCoupletNo) {
                    return `<div class="fdr-line-with-no">
                      <span>${l.text}</span>
                      <span class="fdr-couplet-no">${l.coupletNo}</span>
                    </div>`;
                  }
                  return `<div class="fdr-line">${l.text}</div>`;
                }).join("");
              }).join("");
              return `<div class="fdr-lines" style="margin-bottom:${unit.blockRuleId ? "0" : "6px"};">${innerHtml}</div>`;
            }).join('<div class="fdr-pasuram-sep"></div>');
          }

        } else {
          // ── Kootrirukkai: only line_no == 41 is dual ──────────────────────
          const kootriData = contentData;
          const dualLines = (kootriData.lines || []).filter(l => l.line_no == 41);
          if (dualLines.length > 0) {
            specialDualHtml = `
              <div class="fdr-pasuram-block">
                <div class="fdr-global-no">2672</div>
                <div class="fdr-lines">
                  ${dualLines.map(l => `<div class="fdr-line">${l.line_text}</div>`).join("")}
                </div>
              </div>
            `;
          }
        }

        // wrap in section box with thaniyan
        const spThaniyanHtml = thaniyanRows.length > 0 ? `
          <div class="fdr-thaniyan-box">
            <div class="fdr-thaniyan-label">தனியன்</div>
            ${renderThaniyan(thaniyanRows, thaniyanRows._prosodyMap || {})}
          </div>
        ` : "";

        const spClosing = (displayData.sectionClosing || [])[0]?.closing_text || "";

        html += `
          <div class="fdr-section-box">
            <div class="fdr-section-heading">${heading}</div>
            ${spThaniyanHtml}
            ${renderSectionDisplayItems(displayData)}
            ${renderSectionProsody(displayData)}
            ${specialDualHtml || '<div style="text-align:center;color:#aaa;font-style:italic;padding:10px 0;">★★ பாசுரங்கள் இல்லை</div>'}
            ${spClosing ? `<div class="fdr-section-closing">${spClosing}</div>` : ""}
          </div>
        `;
        continue;
      }

      // ── normal sections ────────────────────────────────────────────────────
      html += buildSectionBlock(heading, thaniyanRows, contentData, displayData);
    }
  }

  html += `
      <div class="fdr-end-ornament">❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖</div>
    </div>
    ${floatingNav()}
  `;

  return html;
}
