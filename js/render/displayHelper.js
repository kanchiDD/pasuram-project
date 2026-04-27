// =============================================================
// 📐 displayHelper.js  →  js/render/displayHelper.js
//
// Shared utility for rendering display items from pasuram-display API.
// Used by fullThaniyans.js, fullDualRecital.js, fullAzhwars.js
//
// pasuram-display API shape:
//   section[]      → display items for the whole section (carnatic, prosody etc.)
//   pathu{}        → display items per pathu_id
//   thirumozhi{}   → display items per thirumozhi_id (includes closing)
//   pasuram{}      → display items per global_no (individual pasuram display)
//   sectionClosing → [{section_id, closing_text}]
//   prosodyScope   → [{prosody_id, ...}]
//   prosodyMaster  → [{prosody_id, canonical_name_tamil, ...}]
// =============================================================

// ── CSS for display items (injected once) ─────────────────────────────────────
export function injectDisplayCSS() {
  if (document.getElementById("display-helper-style")) return;
  const style = document.createElement("style");
  style.id = "display-helper-style";
  style.textContent = `
    /* section-level display items (carnatic info, shown once at top) */
    .dh-section-display {
      text-align: center;
      font-size: 14px;
      color: #7a5a20;
      font-style: italic;
      margin: 2px 0;
      line-height: 1.6;
    }
    /* prosody line */
    .dh-prosody {
      text-align: center;
      font-size: 14px;
      color: #555;
      font-style: italic;
      margin: 4px 0 10px;
    }
    /* per-pasuram display item (above the pasuram) */
    .dh-pasuram-display {
      text-align: center;
      font-size: 13px;
      color: #7a5a20;
      font-style: italic;
      margin-bottom: 4px;
    }
    /* thirumozhi-level display items */
    .dh-thirumozhi-display {
      text-align: center;
      font-size: 13px;
      color: #7a5a20;
      font-style: italic;
      margin-bottom: 6px;
    }
    /* thirumozhi closing */
    .dh-thirumozhi-closing {
      text-align: center;
      font-size: 13px;
      color: #7a5a20;
      font-style: italic;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dotted #d4a843;
    }
    /* adivaravu */
    .dh-adivaravu {
      text-align: center;
      font-size: 13px;
      color: #7a5a20;
      font-style: italic;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dotted #d4a843;
    }
  `;
  document.head.appendChild(style);
}

// ── Raw fetch display data ────────────────────────────────────────────────────
export async function fetchDisplayData(sectionId) {
  const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";
  const res = await fetch(`${API}/pasuram-display?section_id=${sectionId}`);
  return await res.json();
}

// Fetch thaniyan rows + prosodyMap — renderThaniyan() needs BOTH as separate args
export async function fetchThaniyanWithProsody(sectionId) {
  const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";
  const res  = await fetch(`${API}/thaniyan?section_id=${sectionId}`);
  const data = await res.json();
  return {
    rows:       data.thaniyan || (Array.isArray(data) ? data : []),
    prosodyMap: data.prosodyMap || {}
  };
}

// ── Section-level display items (excluding adivaravu) ────────────────────────
// shown once at the top of a section, before pasurams
export function renderSectionDisplayItems(displayData) {
  if (!displayData?.section) return "";
  return displayData.section
    .filter(d => d?.text && !d.text.includes("அடிவரவு"))
    .map(d => `<div class="dh-section-display">${d.text}</div>`)
    .join("");
}

// ── Section-level prosody (first prosody entry) ───────────────────────────────
export function renderSectionProsody(displayData) {
  if (!displayData?.prosodyScope?.length || !displayData?.prosodyMaster) return "";
  const master = {};
  (displayData.prosodyMaster || []).forEach(p => { master[p.prosody_id] = p; });
  const first = displayData.prosodyScope[0];
  if (!first || !master[first.prosody_id]) return "";
  return `<div class="dh-prosody">${master[first.prosody_id].canonical_name_tamil}</div>`;
}

// ── Adivaravu (section-level, shown after all pasurams) ──────────────────────
export function renderAdivaravu(displayData) {
  if (!displayData?.section) return "";
  const item = displayData.section.find(d => d?.text?.includes("அடிவரவு"));
  return item ? `<div class="dh-adivaravu">${item.text}</div>` : "";
}

// ── Section closing ───────────────────────────────────────────────────────────
export function renderSectionClosing(displayData, cssClass = "fdr-section-closing") {
  const arr = displayData?.sectionClosing || [];
  if (!arr.length || !arr[0]?.closing_text) return "";
  return `<div class="${cssClass}">${arr[0].closing_text}</div>`;
}

// ── Build per-pasuram display lookup map ─────────────────────────────────────
// Returns: Map<global_no_string, html_string>
// displayData.pasuram is keyed by global_no (string or number)
export function buildPasuramDisplayMap(displayData) {
  const map = new Map();
  if (!displayData?.pasuram) return map;

  for (const [key, items] of Object.entries(displayData.pasuram)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    const html = items
      .filter(d => d?.text)
      .map(d => `<div class="dh-pasuram-display">${d.text}</div>`)
      .join("");
    if (html) map.set(String(key), html);
  }
  return map;
}

// ── Thirumozhi display items lookup map ──────────────────────────────────────
// Returns: Map<thirumozhi_id_string, {displayHtml, closingHtml}>
export function buildThirumozhiDisplayMap(displayData) {
  const map = new Map();
  if (!displayData?.thirumozhi) return map;

  for (const [key, items] of Object.entries(displayData.thirumozhi)) {
    if (!Array.isArray(items)) continue;

    // separate closing items from display items
    const displayItems = items.filter(d => d?.text && !d.closing_text);
    const closingItems = items.filter(d => d?.closing_text);

    const displayHtml = displayItems
      .map(d => `<div class="dh-thirumozhi-display">${d.text}</div>`)
      .join("");

    const closingHtml = closingItems.length > 0
      ? `<div class="dh-thirumozhi-closing">${closingItems.sort((a,b)=>(a.order||0)-(b.order||0)).slice(-1)[0].closing_text}</div>`
      : "";

    map.set(String(key), { displayHtml, closingHtml });
  }
  return map;
}

// ── Pathu display items lookup map ───────────────────────────────────────────
// Returns: Map<pathu_id_string, html_string>
export function buildPathuDisplayMap(displayData) {
  const map = new Map();
  if (!displayData?.pathu) return map;

  for (const [key, items] of Object.entries(displayData.pathu)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    const html = items
      .filter(d => d?.text)
      .map(d => `<div class="dh-thirumozhi-display">${d.text}</div>`)
      .join("");
    if (html) map.set(String(key), html);
  }
  return map;
}
