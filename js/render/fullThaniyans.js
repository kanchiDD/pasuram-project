// =============================================================
// 📜 fullThaniyans.js  →  js/render/fullThaniyans.js
// ⚠️  Raw fetch only — no api.js imports (avoids safeRender loop)
// ✅  OPTIMISED: parallel fetches + in-memory dedup cache
// =============================================================

import { state } from "../state.js";
import { t as uiText } from "../utils/uiStrings.js";
import { renderThaniyan } from "./thaniyan.js";
import { fetchThaniyanWithProsody } from "./displayHelper.js";
import { playUrls, globalThaniyanUrls, THANIYAN_SEC_URL } from "./globalAudio.js";
import { sectionAllowedForSect } from "../utils/sectUtils.js";
import { c, sectionTitle, ensureContentStrings } from "../utils/contentStrings.js";

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

// Ceremonial titles come from ui_text_master (sec.title.<id>) via sectionTitle().

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
      font-family: "Noto Sans Tamil","Latha", "Bamini", serif;
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
      <button onclick="window.location.href='tree.html'" title="${uiText("home")}">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="${uiText("top")}">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})" title="${uiText("up")}">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})" title="${uiText("down")}">▶</button>
      <button onclick="ftAdjFont(2)" title="${uiText("fontBigger")}">A+</button>
      <button onclick="ftAdjFont(-2)" title="${uiText("fontSmaller")}">A-</button>
    </div>
  `;
}

// ── MAIN EXPORT ──────────────────────────────────────────────────────────────
export async function renderFullThaniyans(selectedThousandId = null) {
  await ensureContentStrings();

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
    ? c("common.naalayiram")
    : (filtered[0]?.name || "");

  let html = `
    <div class="ft-page">
      <div class="ft-page-title">${pageTitle}</div>
      <div class="ft-page-subtitle">${c("thy.page.subtitle")}</div>
      <div style="text-align:center;margin:6px 0 10px">
        <button id="ft-play-all" onclick="window._ftPlayAll && window._ftPlayAll()"
          style="background:linear-gradient(135deg,#2f7d32,#1b5e20);color:#fff;border:none;
                 border-radius:22px;padding:9px 20px;font-size:14px;font-weight:700;cursor:pointer;
                 box-shadow:0 3px 10px rgba(0,0,0,0.2)">▶ Play All Thaniyans</button>
      </div>
      <div class="ft-divider"></div>
  `;

  // Audio queue for the play-all button: sect pothu thaniyan first, then each
  // section thaniyan that has audio, in render order.
  const _sect    = localStorage.getItem("sect") || "T";
  const _subsect = localStorage.getItem("subsect") || "";
  const playAllSecIds = [];

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
      if (!SKIP_THANIYAN_SECTIONS.includes(Number(secId)) &&
          sectionAllowedForSect(secId, _sect)) {
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
      const tName = t.name === c("common.naalayiram") ? "" : t.name;
      if (tName) html += `<div class="ft-thousand-heading">${tName}</div>`;
    }

    // ── global thaniyan ONCE ────────────────────────────────────────────
    if (!globalRendered || !isFullMode) {
      // Sect-filter the pothu rows: if rows carry a sect tag, keep only the
      // user's sect (plus shared 'B'); rows without the tag pass through
      // unchanged so untagged legacy data is never hidden by mistake.
      const _rowSectOk = r => !r.sect || r.sect === "B" || r.sect === _sect;
      const globalRows = [
        ...getRows(globalDataResolved, "global").filter(_rowSectOk),
        ...getRows(globalDataResolved, "thousand").filter(_rowSectOk)
      ];
      if (globalRows.length > 0) {
        // ONE heading only — label tag above, no separate inner title
        html += `
          <div class="ft-box">
            <div class="ft-box-heading">
              <div><span class="ft-global-tag">${c("common.pothu.thaniyan")}</span></div>
              ${isFullMode ? c("common.naalayiram") : pageTitle}
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
      if (!sectionAllowedForSect(secId, _sect)) continue;   // sect-scope the view

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
      if (sectionRows.some(r => r.has_audio)) playAllSecIds.push(secId);

      const heading = sectionTitle(secId, baseName);

      // ONE heading only — no badge/tag inside, just the section name
      html += `
        <div class="ft-box">
          <div class="ft-box-heading">${heading}</div>
          ${renderThaniyan(sectionRows, sectionProsodyMap)}
        </div>
      `;
    }
  }

  // Register the play-all handler: sect pothu thaniyan, then section thaniyans
  // that have audio, in order. Missing files are skipped by the player.
  const playAllUrls = [
    ...globalThaniyanUrls(_sect, _subsect),
    ...playAllSecIds.map(id => THANIYAN_SEC_URL(id))
  ];
  window._ftPlayAll = () => playUrls(playAllUrls);

  html += `
      <div class="ft-end-ornament">❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖</div>
    </div>
    ${floatingNav()}
  `;

  return html;
}