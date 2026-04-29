// =============================================================
// ddByDesam.js  →  js/render/divyadesam/ddByDesam.js
// Fixes:
// - No counts at thousand level (confusing due to special sections)
// - Special sections 21/22/23 pasurams included
// - Thaniyan shown once per azhwar per section group (not per desam)
// - No adivaravu in divyadesam views
// - Verified counts (DESAM_TOTAL) only for full 4000
// =============================================================

import {
  API_DD, API_BASE, DESAM_TOTAL, GRAND_TOTAL,
  SECTION_TO_THOUSAND, SECTION_TO_AZHWAR, AZHWARS,
  friendlyLabel, azhwarName,
  renderPickList, renderLines, renderGroupedPasurams,
  renderSectionDisplayItems, renderSectionProsody,
  renderSectionClosing, fetchDisplayData, fetchThaniyanWithProsody,
  renderThaniyan, buildPasuramDisplayMap, ddSpinner
} from "./ddCore.js";


// ── Fetch lines for special sections 21/22/23 ─────────────────────────────────
// These sections use different API endpoints and different DB tables
const _specialCache = {};



// ── HARDCODED: Special section desam→couplet lookup ──────────────────────────
// Section 21 (திருவெழுகூற்றிருக்கை, global_no 2672): only desam 14
// Section 22 (சிறியதிருமடல், global_no 2673): specific couplets per desam
// Section 23 (பெரியதிருமடல், global_no 2674): specific couplets per desam
// These values are eternal and never change.
const SPECIAL_SECTION_DESAM_COUPLETS = {
  // section_id → { desam_id → [couplet_nos] }
  21: {
    14: "lines_38_41"  // திருக்குடந்தை — lines 38-41 of kootrirukkai
  },
  22: {
    1:71, 6:70, 8:70, 10:72, 12:72, 14:73, 16:72, 17:72, 18:71,
    20:71, 27:71, 41:74, 45:71, 46:74, 63:71, 73:69, 81:70, 82:70,
    92:73, 93:73, 95:73, 96:69, 101:74, 105:74, 106:28
  },
  23: {
    1:118, 6:118, 8:118, 9:130, 10:123, 12:115, 13:132, 14:null,
    16:113, 17:[90,133], 18:115, 20:[73,133], 22:126, 23:124, 27:116,
    30:132, 41:125, 42:125, 43:126, 44:131, 45:120, 57:114, 62:129,
    66:118, 73:122, 75:128, 77:127, 78:127, 81:128, 82:127, 88:117,
    90:116, 91:130, 92:119, 93:120, 96:[6,124]
  }
};

// Get couplet lines for a specific desam from a special section
async function fetchSpecificLines(secId, annotation, desamId) {
  if (secId === 21) {
    // Kootrirukkai — lines 38-41 reference திருக்குடந்தை
    if (!_specialCache[21]) {
      const d = await fetch(`${API_BASE}/kootrirukkai?section_id=21`).then(r=>r.json());
      _specialCache[21] = d.lines || [];
    }
    const lines = _specialCache[21];
    return lines.filter(l => l.line_no >= 38 && l.line_no <= 41)
                .map(l => ({ text: l.line_text, group: 1 }));
  }

  // Sections 22 & 23 — lookup from hardcoded table
  const lookup = SPECIAL_SECTION_DESAM_COUPLETS[secId];
  const coupletRef = lookup ? lookup[desamId] : null;

  if (coupletRef === null || coupletRef === undefined) return [];

  const coupletNos = Array.isArray(coupletRef) ? coupletRef : [coupletRef];

  // Fetch madal units (cached)
  const cacheKey = `madal_units_${secId}`;
  if (!_specialCache[cacheKey]) {
    const data = await fetch(`${API_BASE}/madal?section_id=${secId}`).then(r=>r.json());
    _specialCache[cacheKey] = data.units || [];
  }
  const units = _specialCache[cacheKey];

  const result = [];
  for (const coupletNo of coupletNos) {
    const unit = units.find(u => u.couplet_no === coupletNo);
    if (!unit) continue;
    if (result.length > 0) result.push({ text: "—", group: 2 });
    for (let i = 1; i <= 8; i++) {
      if (unit[`line_${i}`]) result.push({ text: unit[`line_${i}`], group: 1 });
    }
  }
  return result;
}

async function fetchSpecialSectionLines(secId) {
  if (_specialCache[secId]) return _specialCache[secId];
  let lines = [];
  if (secId === 21) {
    // thiruvezhukootrarikkai — all lines as one pasuram
    const data = await fetch(`${API_BASE}/kootrirukkai?section_id=21`).then(r=>r.json());
    lines = (data.lines||[]).map(l => ({ text: l.line_text, group: 1 }));
  } else if (secId === 22 || secId === 23) {
    // madal — all couplet lines as one pasuram
    const data = await fetch(`${API_BASE}/madal?section_id=${secId}`).then(r=>r.json());
    const grouped = {};
    (data.units||[]).forEach(u => {
      const c = u.couplet_no;
      if (!grouped[c]) grouped[c] = [];
      for (let i=1;i<=8;i++) if (u[`line_${i}`]) grouped[c].push({ text:u[`line_${i}`], group:1 });
    });
    Object.values(grouped).forEach(ls => lines.push(...ls));
  }
  _specialCache[secId] = lines;
  return lines;
}

// Build synthetic pasuram object for a special section
async function buildSpecialPasuram(secId) {
  const globalNoMap = { 21:2672, 22:2673, 23:2674 };
  const globalNo = globalNoMap[secId];
  const lines = await fetchSpecialSectionLines(secId);
  return {
    global_no: globalNo,
    local_no: 1,
    section_id: secId,
    pathu_id: null,
    thirumozhi_id: null,
    lines
  };
}


const SKIP_THANIYAN = [2, 12, 13];

const SECTION_HEADER = {
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
  21:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருவெழுகூற்றிருக்கை",
  22:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த சிறியதிருமடல்",
  23:"ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரியதிருமடல்",
  24:"ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த இராமாநுச நூற்றந்தாதி",
  26:"ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி"
};

// ── Build azhwar summary line (full names, no counts at thousand level) ───────
function buildAzhwarSummary(desam, thousandId) {
  const counts = desam.azhwar_counts || {};
  const parts = [];
  for (const az of AZHWARS) {
    const cnt = counts[az.id];
    if (!cnt) continue;
    if (thousandId && !az.sections.some(s => SECTION_TO_THOUSAND[s] === Number(thousandId))) continue;
    // Show count only for full 4000
    parts.push(thousandId ? az.name : `${az.name} (${cnt})`);
  }
  return parts.join(" | ");
}

// ── Render desam pick list ────────────────────────────────────────────────────
export function renderDesamList(allDesams, thousandId, page, onClickFn) {
  const filtered = allDesams.filter(d =>
    !thousandId || (d.thousand_ids || []).includes(Number(thousandId))
  );

  const title = thousandId
    ? `Divya Desams in this Thousand (${filtered.length})`
    : `All 108 Divya Desams — ${GRAND_TOTAL} Pasurams`;

  return renderPickList(filtered, title, onClickFn, page, d => {
    // Count: show verified total for full 4000 only
    const countLabel = !thousandId
      ? `<span class="dd-list-count">(${DESAM_TOTAL[d.divyadesam_id] || 0})</span>`
      : ""; // no count for thousand view — special sections make it unreliable
    const azhwarLine = buildAzhwarSummary(d, thousandId);
    const deity = [d.perumal_name, d.thayar_name].filter(Boolean).join(" | ");
    return `
      <div class="dd-list-item" onclick="ddOpenDesam(${d.divyadesam_id})">
        <div><span class="dd-list-name">${d.canonical_name}</span>${countLabel}</div>
        <div class="dd-list-sub">${deity} · ${friendlyLabel(d.traditional_region)}</div>
        ${azhwarLine ? `<div class="dd-list-azhwars">${azhwarLine}</div>` : ""}
      </div>`;
  });
}

// ── Fetch thaniyan for a section (with caching to avoid repeat fetches) ───────
const _thaniyanCache = {};
async function getThaniyan(secId) {
  if (_thaniyanCache[secId]) return _thaniyanCache[secId];
  if (SKIP_THANIYAN.includes(secId)) return _thaniyanCache[secId] = { rows: [], prosodyMap: {} };
  const result = await fetchThaniyanWithProsody(secId);
  const rows = (result.rows || []).filter(r => r.type === "section");
  _thaniyanCache[secId] = { rows, prosodyMap: result.prosodyMap || {} };
  return _thaniyanCache[secId];
}

// ── Build thaniyan HTML (only if not already shown for this azhwar in this view)
function buildThaniyanHtml(secId, rows, prosodyMap) {
  if (!rows.length) return "";
  return `
    <div class="dd-thaniyan-box">
      <div class="dd-thaniyan-label">Thaniyan</div>
      ${renderThaniyan(rows, prosodyMap)}
    </div>`;
}


// ── Render pasurams — handles special sections 21/22/23 ──────────────────────
async function renderSectionContent(secId, apiPasurams, displayData, desamId) {
  const SPECIAL = [21, 22, 23];
  let pasurams = apiPasurams;

  // If no pasurams came from API but section is special, fetch directly
  if (!pasurams.length && SPECIAL.includes(secId)) {
    const sp = await buildSpecialPasuram(secId);
    pasurams = [sp];
  }

  // For special sections, fetch specific lines based on annotation (couplet reference)
  if (SPECIAL.includes(secId) && pasurams.length > 0) {
    const supplemented = [];
    for (const p of pasurams) {
      if (!p.lines || p.lines.length === 0) {
        // annotation may have couplet number(s) to extract specific lines
        // e.g. annotation="71" means couplet 71 of the madal
        const annotation = p.annotation || "";
        const lines = await fetchSpecificLines(secId, p.annotation||"", desamId);
        supplemented.push({ ...p, lines });
      } else {
        supplemented.push(p);
      }
    }
    pasurams = supplemented;
  }

  const sDisp   = renderSectionDisplayItems(displayData);
  const prosody = renderSectionProsody(displayData);
  const closing = renderSectionClosing(displayData, "dd-section-closing");
  const pdMap   = buildPasuramDisplayMap(displayData);

  // Render pasurams directly (not grouped — special sections have no pathu/thirumozhi structure)
  if (SPECIAL.includes(secId)) {
    const pasuramHtml = pasurams.map((p, i) => `
      ${i > 0 ? '<div class="dd-pasuram-sep"></div>' : ""}
      <div class="dd-pasuram-block">
        ${pdMap.get(String(p.global_no)) || ""}
        <div class="dd-global-no">${p.global_no}</div>
        <div class="dd-lines">${renderLinesSimple(p.lines)}</div>
      </div>`).join("");
    return `${sDisp}${prosody}${pasuramHtml}${closing}`;
  }

  const grouped = renderGroupedPasurams(pasurams, displayData);
  return `${sDisp}${prosody}${grouped}${closing}`;
}

function renderLinesSimple(lines) {
  if (!lines || !lines.length) return "";
  return lines.map(l => `<div class="dd-line">${typeof l === "string" ? l : l.text}</div>`).join("");
}



// ── Open one desam — full detail view ────────────────────────────────────────
export async function renderDesamDetail(desamId, thousandId) {
  const content = document.getElementById("fdd-content");
  if (content) content.innerHTML = ddSpinner();

  const res = await fetch(`${API_DD}?sub=by-desam-full&desam_id=${desamId}`).then(r => r.json());
  const desam       = res.desam || {};
  const azhwars     = res.azhwars || [];
  const thaniyanMap = res.thaniyanMap || {};  // pre-fetched thaniyan per section
  const displayMap  = res.displayMap || {};   // pre-fetched display data per section

  // filter azhwar groups to this thousand
  const filtered = azhwars.filter(a => {
    if (!thousandId) return true;
    const az = AZHWARS.find(x => x.id === a.author_id);
    return az?.sections.some(s => SECTION_TO_THOUSAND[s] === Number(thousandId));
  });

  if (!filtered.length) {
    if (content) content.innerHTML =
      `<div class="dd-back" onclick="ddView('desam')">◀ Back to List</div>
       <div style="text-align:center;padding:20px;color:#aaa;">No pasurams found for this Thousand</div>`;
    return;
  }

  const deity = [desam.perumal_name, desam.thayar_name].filter(Boolean).join(" | ");
  const region = friendlyLabel(desam.traditional_region);
  const verifiedCount = DESAM_TOTAL[desamId] || 0;
  const countLabel = thousandId ? "" : ` (${verifiedCount})`;

  let html = `
    <div class="dd-back" onclick="ddView('desam')">◀ Back to List</div>
    <div class="dd-desam-card">
      <div class="dd-desam-title">${desam.canonical_name}${countLabel}</div>
      ${deity  ? `<div class="dd-desam-deity">${deity}</div>` : ""}
      ${region ? `<div class="dd-desam-meta">${region}</div>` : ""}`;

  // Track which sections' thaniyans have been shown per azhwar
  // Key: azhwar_id — value: Set of section_ids already shown
  const shownThaniyanForAzhwar = {};

  for (const azhwarGroup of filtered) {
    const azId   = azhwarGroup.author_id;
    const azName = azhwarName(azId);
    if (!shownThaniyanForAzhwar[azId]) shownThaniyanForAzhwar[azId] = new Set();

    // group pasurams by section_id
    const sectionMap = new Map();
    for (const p of (azhwarGroup.pasurams || [])) {
      // filter to this thousand's sections only
      if (thousandId && SECTION_TO_THOUSAND[p.section_id] !== Number(thousandId)) continue;
      if (!sectionMap.has(p.section_id)) sectionMap.set(p.section_id, []);
      sectionMap.get(p.section_id).push(p);
    }
    if (!sectionMap.size) continue;

    html += `<div class="dd-azhwar-group"><div class="dd-azhwar-label">${azName}</div>`;

    for (const [secId, secPasurams] of sectionMap) {
      const secHeading = SECTION_HEADER[secId] || secPasurams[0]?.section_name || "";

      // Thaniyan: from pre-fetched map — no extra API call
      let thaniyanHtml = "";
      if (!shownThaniyanForAzhwar[azId].has(secId)) {
        const td = thaniyanMap[secId] || {};
        const rows = (td.thaniyan || []).filter(r => r.type === "section");
        thaniyanHtml = buildThaniyanHtml(secId, rows, td.prosodyMap || {});
        shownThaniyanForAzhwar[azId].add(secId);
      }

      // Use pre-fetched display data — no extra API call
      const displayData = displayMap[secId] || {};
      const pasuramContent = await renderSectionContent(secId, secPasurams, displayData, desamId);

      html += `
        ${thaniyanHtml}
        <div class="dd-content-box">
          <div class="dd-section-heading">${secHeading}</div>
          ${pasuramContent}
        </div>`;
    }

    html += `</div>`; // close dd-azhwar-group
  }

  html += `</div>`; // close dd-desam-card
  if (content) {
    content.innerHTML = html;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
