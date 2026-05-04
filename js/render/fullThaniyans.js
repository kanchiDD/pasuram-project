// =============================================================
// 📜 fullThaniyans.js  →  js/render/fullThaniyans.js
// ⚠️  Raw fetch only — no api.js imports (avoids safeRender loop)
// ✅  OPTIMISED: parallel fetches + in-memory dedup cache
// =============================================================

import { state } from "../state.js";
import { renderThaniyan } from "./thaniyan.js";
import { fetchThaniyanWithProsody } from "./displayHelper.js";

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

// ── In-memory fetch cache (deduplication) ─────────────────────────────────────
// Stores Promise objects so parallel calls for the same URL share one request.
const _fetchCache = new Map();
function cachedFetch(url) {
  if (!_fetchCache.has(url)) {
    _fetchCache.set(url, fetch(url).then(r => r.json()));
  }
  return _fetchCache.get(url);
}

// ── CSS ──────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("full-thaniyans-style")) return;
  const style = document.createElement("style");
  style.id = "full-thaniyans-style";
  style.textContent = `
    .ft-page {
      background: #ffffff;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px 14px 80px;
      font-family: "Latha", "Bamini", serif;
    }
    .ft-page-title {
      text-align: center;
      font-size: 26px;
      font-weight: 900;
      color: #4a2c00;
      margin-bottom: 6px;
    }
    .ft-page-subtitle {
      text-align: center;
      font-size: 15px;
      color: #7a5a20;
      margin-bottom: 4px;
    }
    .ft-divider {
      width: 120px;
      height: 2px;
      background: #b38b2e;
      margin: 8px auto 24px;
    }
    .ft-thousand-heading {
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      color: #4a2c00;
      margin: 28px 0 14px;
    }
    /* double-border box — same as rest of site */
    .ft-box {
      background: #ffffff;
      border: 3px double #b38b2e;
      border-radius: 8px;
      padding: 18px 16px 16px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(179,139,46,0.08);
    }
    /* single clean heading — no duplication */
    .ft-box-heading {
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      color: #4a2c00;
      border-bottom: 1.5px solid #d4a843;
      padding-bottom: 10px;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .ft-global-tag {
      display: inline-block;
      background: #b38b2e;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 8px;
      border-radius: 12px;
      margin-bottom: 6px;
    }
    .ft-end-ornament {
      text-align: center;
      margin: 36px 0 16px;
      color: #b38b2e;
      font-size: 18px;
      letter-spacing: 5px;
    }
    /* floating nav — matches site style */
    .ft-float-nav {
      position: fixed;
      bottom: 20px;
      right: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 999;
    }
    .ft-float-nav button {
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

// ── raw fetchers ─────────────────────────────────────────────────────────────
async function fetchThousandRaw() {
  if (state.thousandData) return state.thousandData;
  return cachedFetch(`${API}/thousand`);
}

// fetchThaniyanRaw replaced by fetchThaniyanWithProsody from displayHelper

function getRows(data, type) {
  const raw = Array.isArray(data) ? data : (data?.data || data?.rows || []);
  return type ? raw.filter(r => r.type === type) : raw;
}

// ── floating nav HTML ─────────────────────────────────────────────────────────
function floatingNav() {
  return `
    <div class="ft-float-nav">
      <button onclick="window.location.href='tree.html'" title="Home">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})" title="Up">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})" title="Down">▶</button>
      <button onclick="ftAdjFont(2)" title="Font+">A+</button>
      <button onclick="ftAdjFont(-2)" title="Font-">A-</button>
    </div>
  `;
}

// ── MAIN EXPORT ──────────────────────────────────────────────────────────────
export async function renderFullThaniyans(selectedThousandId = null) {
  injectCSS();

  // font adjuster (global, safe to re-register)
  window.ftAdjFont = function(delta) {
    let size = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--base-font')
    ) || 18;
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
    <div class="ft-page">
      <div class="ft-page-title">${pageTitle}</div>
      <div class="ft-page-subtitle">தனியன்கள் — முழு தொகுப்பு</div>
      <div class="ft-divider"></div>
  `;

  let globalRendered = false;

  // ── Prefetch anchor-maps for all thousands in parallel ────────────────────
  const anchorMapPromises = filtered.map(t =>
    cachedFetch(`${API}/anchor-map?thousand_id=${t.id}`)
  );
  const allAnchorRows = await Promise.all(anchorMapPromises);

  // ── Prefetch global thaniyan once (needed for first thousand or full mode) ─
  const globalThaniyanPromise = fetchThaniyanWithProsody(null);

  // Collect all unique section IDs that need thaniyan data across all thousands
  const allSectionIds = new Set();
  for (const anchorRows of allAnchorRows) {
    const sectionIds = [...new Set(anchorRows.map(r => r.section_id))].sort((a, b) => a - b);
    for (const secId of sectionIds) {
      if (!SKIP_THANIYAN_SECTIONS.includes(Number(secId))) {
        allSectionIds.add(secId);
      }
    }
  }

  // ── Prefetch all section thaniyans in parallel ────────────────────────────
  const sectionThaniyanMap = new Map();
  const sectionThaniyanEntries = [...allSectionIds].map(async secId => {
    const result = await fetchThaniyanWithProsody(secId);
    sectionThaniyanMap.set(secId, result);
  });
  // Kick off global thaniyan + all section thaniyans concurrently
  await Promise.all([globalThaniyanPromise, ...sectionThaniyanEntries]);
  const { rows: globalDataResolved, prosodyMap: globalProsodyMap } = await globalThaniyanPromise;

  // ── Build HTML per thousand ───────────────────────────────────────────────
  for (let ti = 0; ti < filtered.length; ti++) {
    const t = filtered[ti];
    const anchorRows = allAnchorRows[ti];

    if (isFullMode) {
      const tName = t.name === "நாலாயிர திவ்யப்பிரபந்தம்" ? "" : t.name;
      if (tName) html += `<div class="ft-thousand-heading">${tName}</div>`;
    }

    // ── global thaniyan ONCE ────────────────────────────────────────────
    if (!globalRendered || !isFullMode) {
      const globalRows = [
        ...getRows(globalDataResolved, "global"),
        ...getRows(globalDataResolved, "thousand")
      ];
      if (globalRows.length > 0) {
        // ONE heading only — label tag above, no separate inner title
        html += `
          <div class="ft-box">
            <div class="ft-box-heading">
              <div><span class="ft-global-tag">பொது தனியன்</span></div>
              ${isFullMode ? "நாலாயிர திவ்யப்பிரபந்தம்" : pageTitle}
            </div>
            ${renderThaniyan(globalRows, globalProsodyMap)}
          </div>
        `;
        globalRendered = true;
      }
    }

    // ── section thaniyans in order ──────────────────────────────────────
    const sectionIds = [...new Set(anchorRows.map(r => r.section_id))]
      .sort((a, b) => a - b);

    for (const secId of sectionIds) {
      if (SKIP_THANIYAN_SECTIONS.includes(Number(secId))) continue;

      const sectionRow = anchorRows.find(r => r.section_id === secId && r.type === "section");
      let baseName = sectionRow?.canonical_text || "";
      if (!baseName) {
        const FB = { 2:"பெரியாழ்வார் திருமொழி", 4:"நாச்சியார் திருமொழி",
                     5:"பெருமாள் திருமொழி", 11:"பெரிய திருமொழி", 26:"திருவாய்மொழி" };
        baseName = FB[secId] || "";
      }

      // Use pre-fetched thaniyan data (already in sectionThaniyanMap)
      const { rows: thaniyanData, prosodyMap: sectionProsodyMap } = sectionThaniyanMap.get(secId) || {};
      const sectionRows = getRows(thaniyanData, "section");
      if (sectionRows.length === 0) continue;

      const heading = sectionHeaderMap[baseName] || baseName;

      // ONE heading only — no badge/tag inside, just the section name
      html += `
        <div class="ft-box">
          <div class="ft-box-heading">${heading}</div>
          ${renderThaniyan(sectionRows, sectionProsodyMap)}
        </div>
      `;
    }
  }

  html += `
      <div class="ft-end-ornament">❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖</div>
    </div>
    ${floatingNav()}
  `;

  return html;
}
