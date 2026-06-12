// =============================================================
// 📜 fullSattrumurai.js  →  js/render/fullSattrumurai.js
// =============================================================

import { state } from "../state.js";

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

const _fetchCache = new Map();
function cachedFetch(url) {
  if (!_fetchCache.has(url)) {
    _fetchCache.set(url, fetch(url).then(r => r.json()));
  }
  return _fetchCache.get(url);
}

// ── CSS ───────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("full-sattrumurai-style")) return;
  const style = document.createElement("style");
  style.id = "full-sattrumurai-style";
  style.textContent = `
    .fsat-page {
      background: #ffffff;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px 14px 80px;
      font-family: "Noto Sans Tamil","Latha","Bamini",serif;
      font-size: var(--base-font, 18px);
    }
    .fsat-page-title {
      text-align: center;
      font-size: 22px;
      font-weight: 900;
      color: #4a2c00;
      margin-bottom: 8px;
    }
    .fsat-divider {
      width: 120px;
      height: 2px;
      background: #b38b2e;
      margin: 8px auto 16px;
    }
    /* ── Custom dropdown ── */
    .fsat-selector-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
      position: relative;
    }
    .fsat-custom-select {
      position: relative;
      width: 100%;
      max-width: 360px;
      font-family: "Noto Sans Tamil","Latha","Bamini",serif;
    }
    .fsat-custom-selected {
      font-family: "Noto Sans Tamil","Latha","Bamini",serif;
      font-size: 13px;
      padding: 8px 36px 8px 12px;
      border-radius: 8px;
      border: 1.5px solid #b38b2e;
      background: #fffdf5;
      color: #4a2c00;
      cursor: pointer;
      user-select: none;
      position: relative;
      white-space: normal;
      line-height: 1.5;
    }
    .fsat-custom-selected::after {
      content: "▾";
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #b38b2e;
      font-size: 14px;
    }
    .fsat-custom-options {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fffdf5;
      border: 1.5px solid #b38b2e;
      border-radius: 8px;
      margin-top: 4px;
      z-index: 999;
      max-height: 260px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .fsat-custom-options.open { display: block; }
    .fsat-custom-option {
      font-family: "Noto Sans Tamil","Latha","Bamini",serif;
      font-size: 13px;
      padding: 10px 14px;
      color: #4a2c00;
      cursor: pointer;
      line-height: 1.6;
      border-bottom: 1px solid #f0e0b0;
    }
    .fsat-custom-option:last-child { border-bottom: none; }
    .fsat-custom-option:hover { background: #fff4d6; }
    .fsat-custom-option.selected { background: #ffedb0; font-weight: 700; }
    /* ── Double border box ── */
    .fsat-box {
      background: #ffffff;
      border: 3px double #b38b2e;
      border-radius: 8px;
      padding: 18px 16px 16px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(179,139,46,0.08);
    }
    .fsat-box-heading {
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      color: #4a2c00;
      border-bottom: 1.5px solid #d4a843;
      padding-bottom: 10px;
      margin-bottom: 14px;
      line-height: 1.6;
    }
    /* ── Global no ── */
    .fsat-global-no {
      font-size: 13px;
      font-weight: 700;
      color: #b38b2e;
      text-align: left;
      margin-bottom: 4px;
    }
    /* ── Pasuram lines ── */
    .fsat-lines {
      font-size: var(--base-font, 18px);
      color: #1a2a00;
      line-height: 2;
      text-align: left;
    }
    .fsat-line {
      display: block;
    }
    /* gap between recital groups */
    .fsat-group-gap {
      display: block;
      height: 12px;
    }
    /* ★★ dual recital marker */
    .fsat-dual-mark {
      color: #1a7abf;
      font-weight: 900;
      font-size: 14px;
      margin-right: 5px;
    }
    /* ── Separator between sequence items ── */
    .fsat-sep {
      height: 1px;
      background: #e8d5a0;
      margin: 14px 0;
    }
    /* ── Fixed text ── */
    /* Author label lines: (பெரிய ஜீயர் அருளிச்செய்தது) */
    .fsat-author-label {
      display: block;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #7a5a20;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    /* Normal text lines */
    .fsat-fixed-lines {
      font-size: var(--base-font, 18px);
      color: #1a2a00;
      line-height: 2;
      text-align: left;
    }
    /* ── Vazhi ── */
    .fsat-section-heading {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: #7a5a20;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
      display: block;
    }
    .fsat-vazhi-author {
      display: block;
      text-align: center;
      font-size: 12px;
      color: #a07840;
      margin-bottom: 8px;
    }
    .fsat-vazhi-lines {
      font-size: var(--base-font, 18px);
      color: #1a2a00;
      line-height: 2;
      text-align: left;
    }
    .fsat-vazhi-group {
      margin-bottom: 10px;
    }
    /* ── End ornament ── */
    .fsat-end-ornament {
      text-align: center;
      margin: 36px 0 16px;
      color: #b38b2e;
      font-size: 18px;
      letter-spacing: 5px;
    }
    /* ── Floating nav ── */
    .fsat-float-nav {
      position: fixed;
      bottom: 20px;
      right: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 999;
    }
    .fsat-float-nav button {
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
    /* ── Spinner ── */
    .fsat-spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }
    .fsat-lotus {
      font-size: 48px;
      animation: fsat-spin 1.6s linear infinite;
    }
    @keyframes fsat-spin {
      0%   { transform: rotate(0deg)   scale(1);   }
      50%  { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1);   }
    }
    .fsat-loading-text {
      margin-top: 14px;
      font-size: 16px;
      color: #7a5a20;
      font-family: "Noto Sans Tamil","Latha","Bamini",serif;
    }
    .fsat-error {
      text-align: center;
      color: red;
      padding: 40px;
      font-size: 14px;
    }
  `;
  document.head.appendChild(style);
}

// ── Spinner ───────────────────────────────────────────────────
export function sattrumuraiSpinner() {
  return `
    <div class="fsat-spinner-wrap">
      <div class="fsat-lotus">🪷</div>
      <div class="fsat-loading-text">Adiyen Content Loading...</div>
    </div>
  `;
}

// ── Floating nav ──────────────────────────────────────────────
function floatingNav() {
  return `
    <div class="fsat-float-nav">
      <button onclick="window.location.href='tree.html'" title="Home">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})" title="Up">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})" title="Down">▶</button>
      <button onclick="fsatAdjFont(2)" title="Font+">A+</button>
      <button onclick="fsatAdjFont(-2)" title="Font-">A-</button>
    </div>
  `;
}

// ── Helper: is this line an author label? ─────────────────────
// Lines like (பெரிய ஜீயர் அருளிச்செய்தது) start and end with ( )
function isAuthorLabel(line) {
  const t = line.trim();
  return t.startsWith("(") && t.endsWith(")");
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export async function renderFullSattrumurai(sattrumuraiId) {
  injectCSS();

  window.fsatAdjFont = function(delta) {
    let size = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--base-font")
    ) || 18;
    if (delta < 0 && size <= 12) return;
    document.documentElement.style.setProperty("--base-font", (size + delta) + "px");
  };

  // ── Fetch list filtered by thousand ──────────────────────
  const thousandId = state.sattrumuraiThousandId || null;
  const listUrl = thousandId
    ? `${API}/sattrumurai/list?thousand_id=${thousandId}`
    : `${API}/sattrumurai/list`;

  let listData;
  try {
    listData = await cachedFetch(listUrl);
  } catch(e) {
    listData = { success: false };
  }

  const allSattrumurai = listData.success ? listData.data : [];

  // If no sattrumuraiId passed (first open), use first from filtered list
  if (!sattrumuraiId && allSattrumurai.length) {
    sattrumuraiId = allSattrumurai[0].sattrumurai_id;
  }

  // If this thousand has no sattrumurais at all, show message
  if (!sattrumuraiId) {
    return `<div class="fsat-error">இந்த ஆயிரத்தில் சாற்றுமுறை இல்லை.</div>`;
  }

  // ── Fetch selected sattrumurai ────────────────────────────
  let data;
  try {
    data = await cachedFetch(`${API}/sattrumurai/${sattrumuraiId}`);
  } catch (e) {
    return `<div class="fsat-error">தொடர்பு தோல்வி: ${e.message}</div>`;
  }

  if (!data.success) {
    return `<div class="fsat-error">பிழை: ${data.error || "தெரியவில்லை"}</div>`;
  }

  const { sattrumurai, sequence } = data;

  // ── Dropdown — only if more than one sattrumurai ──────────
  const selectedLabel = allSattrumurai.find(s => s.sattrumurai_id == sattrumuraiId);
  const dropdownHtml = allSattrumurai.length > 1 ? `
    <div class="fsat-selector-wrap">
      <div class="fsat-custom-select" id="fsatDropdown">
        <div class="fsat-custom-selected" id="fsatSelected" onclick="fsatToggleDropdown()">
          ${selectedLabel ? (selectedLabel.tamil_name || selectedLabel.name) : ""}
        </div>
        <div class="fsat-custom-options" id="fsatOptions">
          ${allSattrumurai.map(s => `
            <div class="fsat-custom-option ${s.sattrumurai_id == sattrumuraiId ? 'selected' : ''}"
              onclick="fsatPickOption(${s.sattrumurai_id}, '${(s.tamil_name || s.name).replace(/'/g, "\'")}')">
              ${s.tamil_name || s.name}
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  ` : "";

  window.fsatToggleDropdown = function() {
    const opts = document.getElementById("fsatOptions");
    if (opts) opts.classList.toggle("open");
  };

  window.fsatPickOption = function(id, label) {
    const opts = document.getElementById("fsatOptions");
    const sel = document.getElementById("fsatSelected");
    if (opts) opts.classList.remove("open");
    if (sel) sel.textContent = label;
    fsatSwitch(id);
  };

  // Close dropdown on outside click
  document.addEventListener("click", function fsatOutside(e) {
    const dd = document.getElementById("fsatDropdown");
    if (dd && !dd.contains(e.target)) {
      const opts = document.getElementById("fsatOptions");
      if (opts) opts.classList.remove("open");
    }
  }, { once: false });

  window.fsatSwitch = function(newId) {
    state.sattrumuraiId = Number(newId);
    // clear cache for this id so fresh data loads
    _fetchCache.delete(`${API}/sattrumurai/${newId}`);
    import("./layout.js").then(m => m.render());
  };

  // ── Build sequence HTML ───────────────────────────────────
  let itemsHtml = "";
  sequence.forEach((item, idx) => {
    if (idx > 0) itemsHtml += `<div class="fsat-sep"></div>`;
    itemsHtml += renderItem(item);
  });

  // ── Final HTML ────────────────────────────────────────────
  // Title "சாற்றுமுறை" shows ONCE at top
  // Heading inside box shows the specific sattrumurai name
  // NO subtitle repeated outside the box
  return `
    <div class="fsat-page">
      <div class="fsat-page-title">சாற்றுமுறை</div>
      <div class="fsat-divider"></div>
      ${dropdownHtml}
      <div class="fsat-box">
        <div class="fsat-box-heading">${sattrumurai.tamil_name || sattrumurai.name}</div>
        ${itemsHtml}
      </div>
      <div class="fsat-end-ornament">❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖</div>
    </div>
    ${floatingNav()}
  `;
}

// ── Item dispatcher ───────────────────────────────────────────
function renderItem(item) {
  if (item.entity_type === "pasuram")    return renderPasuramItem(item);
  if (item.entity_type === "fixed_text") return renderFixedItem(item);
  if (item.entity_type === "vazhi")      return renderVazhiItem(item);
  return "";
}

// ── Pasuram ───────────────────────────────────────────────────
function renderPasuramItem(item) {
  const c = item.content;
  if (!c) return `<div class="fsat-error">பாசுரம் #${item.entity_id} கிடைக்கவில்லை</div>`;

  let linesHtml = "";
  let prevGroup = null;

  c.lines.forEach((line, li) => {
    const text  = typeof line === "object" ? line.text  : line;
    const group = typeof line === "object" ? line.group : 1;

    // Insert gap when recital group changes
    if (prevGroup !== null && group !== prevGroup) {
      linesHtml += `<span class="fsat-group-gap"></span>`;
    }
    prevGroup = group;

    if (li === 0 && item.is_dual_recital) {
      linesHtml += `<span class="fsat-line"><span class="fsat-dual-mark">★★</span>${text}</span>`;
    } else {
      linesHtml += `<span class="fsat-line">${text}</span>`;
    }
  });

  return `
    <div>
      <div class="fsat-global-no">${c.global_no}</div>
      <div class="fsat-lines">${linesHtml}</div>
    </div>
  `;
}

// ── Fixed text ────────────────────────────────────────────────
// Lines starting and ending with ( ) are author labels → small centered gold
// All other lines → normal left-aligned text
function renderFixedItem(item) {
  const c = item.content;
  if (!c) return "";

  let linesHtml = "";
  c.lines.forEach(line => {
    if (isAuthorLabel(line)) {
      // e.g. (பெரிய ஜீயர் அருளிச்செய்தது)
      linesHtml += `<span class="fsat-author-label">${line}</span>`;
    } else {
      linesHtml += `<span class="fsat-line">${line}</span>`;
    }
  });

  return `
    <div>
      <div class="fsat-fixed-lines">${linesHtml}</div>
    </div>
  `;
}

// ── Vazhi Thirunamam ──────────────────────────────────────────
function renderVazhiItem(item) {
  const c = item.content;
  if (!c) return "";

  // vazhi_name comes from worker: "ஸ்ரீ " + author canonical_name
  const authorLine = c.vazhi_name
    ? `<span class="fsat-vazhi-author">${c.vazhi_name} வாழி திருநாமம்</span>`
    : "";

  let groupsHtml = "";
  c.groups.forEach(g => {
    const linesHtml = g.lines
      .map(l => `<span class="fsat-line">${l}</span>`)
      .join("");
    groupsHtml += `<div class="fsat-vazhi-group"><div class="fsat-vazhi-lines">${linesHtml}</div></div>`;
  });

  return `
    <div>
      <span class="fsat-section-heading">வாழி திருநாமம்</span>
      ${authorLine}
      ${groupsHtml}
    </div>
  `;
}