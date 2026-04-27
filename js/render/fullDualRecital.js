// =============================================================
// 🔥 fullDualRecital.js  →  js/render/fullDualRecital.js
// ⚠️  Raw fetch only — no api.js imports (avoids safeRender loop)
//
// Structure per section:
//   Section heading (full name)
//   └─ Thaniyan box (double-border white)
//   └─ Pathu groups:
//       pathu_name  (e.g. முதற்பத்து)
//       └─ pathu_subunit_name + thirumozhi_heading
//           → ALL ★★ pasurams in ONE block (no border per pasuram)
//           → Within each pasuram: group separator between recital groups
//           → global_no top-left, local_no bottom-right
//   └─ Section closing (last sectionClosing entry)
// =============================================================

import { state } from "../state.js";
import { renderThaniyan } from "./thaniyan.js";

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

// ── CSS ──────────────────────────────────────────────────────────────────────
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
    .fdr-page-title {
      text-align: center;
      font-size: 26px;
      font-weight: 900;
      color: #4a2c00;
      margin-bottom: 6px;
    }
    .fdr-page-subtitle {
      text-align: center;
      font-size: 15px;
      color: #7a5a20;
      margin-bottom: 4px;
    }
    .fdr-divider {
      width: 120px;
      height: 2px;
      background: #b38b2e;
      margin: 8px auto 24px;
    }
    .fdr-thousand-heading {
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      color: #4a2c00;
      margin: 28px 0 14px;
    }

    /* ── section outer box ── */
    .fdr-section-box {
      background: #ffffff;
      border: 3px double #b38b2e;
      border-radius: 8px;
      padding: 18px 16px 16px;
      margin-bottom: 28px;
      box-shadow: 0 2px 8px rgba(179,139,46,0.08);
    }
    .fdr-section-heading {
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      color: #4a2c00;
      border-bottom: 1.5px solid #d4a843;
      padding-bottom: 10px;
      margin-bottom: 16px;
      line-height: 1.5;
    }

    /* ── thaniyan inner box ── */
    .fdr-thaniyan-box {
      background: #ffffff;
      border: 3px double #b38b2e;
      border-radius: 6px;
      padding: 14px 14px;
      margin-bottom: 16px;
    }
    .fdr-thaniyan-label {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      color: #b38b2e;
      letter-spacing: 1px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    /* ── pathu heading ── */
    .fdr-pathu-heading {
      text-align: center;
      font-size: 17px;
      font-weight: 800;
      color: #4a2c00;
      margin: 16px 0 8px;
      padding: 6px 0;
      border-bottom: 1px dashed #d4a843;
    }

    /* ── thirumozhi group box (one per thirumozhi, contains all its ★★) ── */
    .fdr-thirumozhi-box {
      background: #ffffff;
      border: 3px double #b38b2e;
      border-radius: 6px;
      padding: 14px 14px 10px;
      margin-bottom: 14px;
    }

    /* subunit + thirumozhi heading inside thirumozhi box */
    .fdr-thirumozhi-heading {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      color: #4a2c00;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e8d5a0;
      line-height: 1.6;
    }
    .fdr-thirumozhi-sub {
      font-size: 13px;
      color: #7a5a20;
      font-style: italic;
    }

    /* ── pasuram block (all ★★ of one thirumozhi in one block) ── */
    .fdr-pasuram-block {
      margin-bottom: 10px;
    }

    /* global_no — top left */
    .fdr-global-no {
      font-size: 13px;
      font-weight: 700;
      color: #b38b2e;
      text-align: left;
      margin-bottom: 4px;
    }

    /* pasuram lines — left aligned, respects font adjuster */
    .fdr-lines {
      font-size: var(--base-font, 18px);
      color: #1a2a00;
      line-height: 2;
      text-align: left;
    }
    .fdr-line { display: block; }

    /* recital group gap — MUST be display:block for height to work */
    .fdr-group-gap {
      display: block;
      height: 14px;
    }

    /* local_no — bottom right */
    .fdr-local-no {
      font-size: 12px;
      color: #999;
      text-align: right;
      margin-top: 2px;
    }

    /* divider between pasurams within same thirumozhi block */
    .fdr-pasuram-sep {
      height: 1px;
      background: #e8d5a0;
      margin: 10px 0;
    }

    /* ── section closing ── */
    .fdr-section-closing {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      color: #4a2c00;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #d4a843;
    }

    .fdr-end-ornament {
      text-align: center;
      margin: 36px 0 16px;
      color: #b38b2e;
      font-size: 18px;
      letter-spacing: 5px;
    }

    /* ── floating nav ── */
    .fdr-float-nav {
      position: fixed;
      bottom: 20px;
      right: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 999;
    }
    .fdr-float-nav button {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid #b38b2e;
      background: #fff;
      color: #4a2c00;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    /* ── lotus spinner ── */
    .fdr-spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }
    .fdr-lotus {
      font-size: 48px;
      animation: fdr-spin 1.6s linear infinite;
    }
    @keyframes fdr-spin {
      0%   { transform: rotate(0deg) scale(1);   }
      50%  { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }
    .fdr-loading-text {
      margin-top: 14px;
      font-size: 16px;
      color: #7a5a20;
      font-family: "Latha", "Bamini", serif;
    }
  `;
  document.head.appendChild(style);
}

// ── spinner HTML (inject into app immediately before async work) ──────────────
export function dualRecitalSpinner() {
  return `
    <div class="fdr-spinner-wrap">
      <div class="fdr-lotus">🪷</div>
      <div class="fdr-loading-text">Content Loading...</div>
    </div>
  `;
}

// ── raw fetchers ──────────────────────────────────────────────────────────────
async function fetchThousandRaw() {
  if (state.thousandData) return state.thousandData;
  const res = await fetch(`${API}/thousand`);
  return await res.json();
}

async function fetchThaniyanRaw(sectionId) {
  const res = await fetch(`${API}/thaniyan?section_id=${sectionId}`);
  const data = await res.json();
  return data.thaniyan || data || [];
}

async function fetchPasuramRaw(sectionId) {
  const res = await fetch(`${API}/pasuram?section_id=${sectionId}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchSectionClosingRaw(sectionId) {
  const res = await fetch(`${API}/pasuram-display?section_id=${sectionId}`);
  const data = await res.json();
  return data.sectionClosing || [];
}

function getRows(data, type) {
  const raw = Array.isArray(data) ? data : (data?.data || data?.rows || []);
  return type ? raw.filter(r => r.type === type) : raw;
}

// ── render lines with recital group gaps ─────────────────────────────────────
// lines: [{text, group}] — group changes indicate a recital section break
function renderLinesWithGroups(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  let html = "";
  let lastGroup = null;
  for (const l of lines) {
    const g = l.group ?? 1;
    const text = typeof l === "string" ? l : (l?.text || "");
    if (lastGroup !== null && g !== lastGroup) {
      // gap between recital groups — div so height:14px actually renders
      html += `<div class="fdr-group-gap"></div>`;
    }
    html += `<div class="fdr-line">${text}</div>`;
    lastGroup = g;
  }
  return html;
}

// ── render all ★★ pasurams for one thirumozhi in ONE block ───────────────────
function renderPasuramBlock(pasurams) {
  let html = "";
  for (let i = 0; i < pasurams.length; i++) {
    const p = pasurams[i];
    if (i > 0) html += `<div class="fdr-pasuram-sep"></div>`;
    html += `
      <div class="fdr-pasuram-block">
        <div class="fdr-global-no">${p.global_no}</div>
        <div class="fdr-lines">${renderLinesWithGroups(p.lines)}</div>
        <div class="fdr-local-no">${p.local_no}</div>
      </div>
    `;
  }
  return html;
}

// ── floating nav ─────────────────────────────────────────────────────────────
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

// ── build one section block ───────────────────────────────────────────────────
function buildSectionBlock(heading, thaniyanRows, pasurams, sectionClosing) {

  // thaniyan box
  const thaniyanHtml = thaniyanRows.length > 0 ? `
    <div class="fdr-thaniyan-box">
      <div class="fdr-thaniyan-label">தனியன்</div>
      ${renderThaniyan(thaniyanRows)}
    </div>
  ` : "";

  // filter ★★ only
  const dualPasurams = pasurams.filter(p => p.double_recital === 1);

  // ── group: pathu_id → pathu_subunit_name+thirumozhi_heading ─────────────
  // We preserve insertion order to keep chronological sequence

  // Step 1: collect ordered pathu keys
  const pathuMap = new Map(); // pathuKey → { label, thiruMap }
  for (const p of dualPasurams) {
    const pathuKey = p.pathu_id != null ? String(p.pathu_id) : "__none__";
    if (!pathuMap.has(pathuKey)) {
      pathuMap.set(pathuKey, { label: p.pathu_name || "", thiruMap: new Map() });
    }
    const pm = pathuMap.get(pathuKey);

    // Step 2: within pathu, group by thirumozhi_id
    const thiruKey = p.thirumozhi_id != null ? String(p.thirumozhi_id) : "__none__";
    if (!pm.thiruMap.has(thiruKey)) {
      // heading parts: thirumozhi_name (e.g. "முதல் திருமொழி") + subunit + thirumozhi_heading
      const thiruName   = p.thirumozhi_name || "";       // "முதல் திருமொழி"
      const subunit     = p.pathu_subunit_name || "";    // e.g. "முதற்பத்து"
      const thiruHeading = p.thirumozhi_heading || "";   // e.g. "வண்ணமாடங்கள்"
      pm.thiruMap.set(thiruKey, { thiruName, subunit, thiruHeading, pasurams: [] });
    }
    pm.thiruMap.get(thiruKey).pasurams.push(p);
  }

  // Step 3: render
  let groupsHtml = "";
  for (const [, pathu] of pathuMap) {
    if (pathu.label) {
      groupsHtml += `<div class="fdr-pathu-heading">${pathu.label}</div>`;
    }
    for (const [, thiru] of pathu.thiruMap) {
      let thiruHeadingHtml = "";

      // For pathu-based sections: subunit - thirumozhi_heading (e.g. "முதற்பத்து - வண்ணமாடங்கள்")
      // For thirumozhi-based sections (நாச்சியார், பெருமாள்): thirumozhi_name - thirumozhi_heading
      const line1 = thiru.thiruName || thiru.subunit || ""; // thirumozhi order name
      const line2 = thiru.thiruHeading || "";               // song title

      if (line1 || line2) {
        const parts = [line1, line2].filter(Boolean);
        thiruHeadingHtml = `
          <div class="fdr-thirumozhi-heading">
            ${parts.join(" — ")}
          </div>
        `;
      }

      groupsHtml += `
        <div class="fdr-thirumozhi-box">
          ${thiruHeadingHtml}
          ${renderPasuramBlock(thiru.pasurams)}
        </div>
      `;
    }
  }

  // section closing — field is closing_text (confirmed from API)
  let closingHtml = "";
  if (sectionClosing && sectionClosing.length > 0) {
    const closing = sectionClosing[0].closing_text;
    if (closing) {
      closingHtml = `<div class="fdr-section-closing">${closing}</div>`;
    }
  }

  const countBadge = dualPasurams.length > 0
    ? ` <span style="font-size:12px;font-weight:400;color:#b38b2e;">(${dualPasurams.length} ★★)</span>`
    : "";

  return `
    <div class="fdr-section-box">
      <div class="fdr-section-heading">${heading}${countBadge}</div>
      ${thaniyanHtml}
      ${groupsHtml}
      ${closingHtml}
    </div>
  `;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
/**
 * renderFullDualRecital(selectedThousandId?)
 *   null / undefined → full 4000
 *   1 / 2 / 3 / 4   → only that thousand
 * @returns {Promise<string>}
 */
export async function renderFullDualRecital(selectedThousandId = null) {
  injectCSS();

  // font adjuster — sets --base-font on :root, inherited by .fdr-lines via var()
  window.fdrAdjFont = function(delta) {
    const current = getComputedStyle(document.documentElement)
      .getPropertyValue('--base-font').trim();
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
  const pageTitle = isFullMode
    ? "நாலாயிர திவ்யப்பிரபந்தம்"
    : (filtered[0]?.name || "");

  let html = `
    <div class="fdr-page">
      <div class="fdr-page-title">${pageTitle}</div>
      <div class="fdr-page-subtitle">★★ Rettai / Dual Recital Pasurams</div>
      <div class="fdr-divider"></div>
  `;

  for (const t of filtered) {
    const anchorRes = await fetch(`${API}/anchor-map?thousand_id=${t.id}`);
    const anchorRows = await anchorRes.json();

    if (isFullMode) {
      const tName = t.name === "நாலாயிர திவ்யப்பிரபந்தம்" ? "" : t.name;
      if (tName) html += `<div class="fdr-thousand-heading">${tName}</div>`;
    }

    const sectionIds = [...new Set(anchorRows.map(r => r.section_id))]
      .sort((a, b) => a - b);

    for (const secId of sectionIds) {
      const sectionRow = anchorRows.find(r => r.section_id === secId && r.type === "section");
      let baseName = sectionRow?.canonical_text || "";
      if (!baseName) {
        const FB = { 2:"பெரியாழ்வார் திருமொழி", 4:"நாச்சியார் திருமொழி",
                     5:"பெருமாள் திருமொழி", 11:"பெரிய திருமொழி", 26:"திருவாய்மொழி" };
        baseName = FB[secId] || "";
      }

      // thaniyan
      let sectionThaniyanRows = [];
      if (!SKIP_THANIYAN_SECTIONS.includes(Number(secId))) {
        const thaniyanData = await fetchThaniyanRaw(secId);
        sectionThaniyanRows = getRows(thaniyanData, "section");
      }

      // pasurams
      const allPasurams = await fetchPasuramRaw(secId);

      // section closing
      const sectionClosing = await fetchSectionClosingRaw(secId);

      const heading = sectionHeaderMap[baseName] || baseName;
      html += buildSectionBlock(heading, sectionThaniyanRows, allPasurams, sectionClosing);
    }
  }

  html += `
      <div class="fdr-end-ornament">❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖</div>
    </div>
    ${floatingNav()}
  `;

  return html;
}
