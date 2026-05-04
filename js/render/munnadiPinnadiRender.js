// munnadiPinnadiRender.js

import { injectMunnadiCSS } from "./munnadiCSS.js";
import { buildMunnadiIndex, registerMunnadiIndexHandlers } from "./munnadiIndex.js";

const API_BASE = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

// ── Section heading map (full "Sri X arulicheyta Y" title) ──
const SECTION_HEADER = {
  1:  "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த திருப்பல்லாண்டு",
  2:  "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த பெரியாழ்வார் திருமொழி",
  3:  "ஸ்ரீ ஆண்டாள் அருளிச்செய்த திருப்பாவை",
  4:  "ஸ்ரீ ஆண்டாள் அருளிச்செய்த நாச்சியார் திருமொழி",
  5:  "ஸ்ரீ குலசேகர பெருமாள் அருளிச்செய்த பெருமாள் திருமொழி",
  6:  "ஸ்ரீ திருமழிசைப்பிரான் அருளிச்செய்த திருச்சந்தவிருத்தம்",
  7:  "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருமாலை",
  8:  "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருப்பள்ளியெழுச்சி",
  9:  "ஸ்ரீ திருப்பாணாழ்வார் அருளிச்செய்த அமலனாதிபிரான்",
  10: "ஸ்ரீ மதுரகவி ஆழ்வார் அருளிச்செய்த கண்ணிநுண்சிறுத்தாம்பு",
  11: "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரிய திருமொழி",
  12: "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருகுறுந்தாண்டகம்",
  13: "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருநெடுந்தாண்டகம்",
  14: "ஸ்ரீ பொய்கையாழ்வார்‌ அருளிச்செய்த முதல்‌ திருவந்தாதி",
  15: "ஸ்ரீ பூதத்தாழ்வார்‌ அருளிச்செய்த இரண்டாம்‌ திருவந்தாதி",
  16: "ஸ்ரீ பேயாழ்வார்‌ அருளிச்செய்த மூன்றாம்‌ திருவந்தாதி",
  17: "ஸ்ரீ திருமழிசைப்பிரான்‌ அருளிச்செய்த நான்முகன்‌திருவந்தாதி",
  18: "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த ருக்வேதஸாரமான திருவிருத்தம்",
  20: "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த அதர்வணவேத ஸாரமான பெரியதிருவந்தாதி",
  24: "ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த இராமாநுச நூற்றந்தாதி",
  26: "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி",
};

// ── Section closing text (from section_closing_master) keyed by section_id ──
// Worker does not return this — embedded client-side
const SECTION_CLOSING = {
  1:  "ஸ்ரீ பெரியாழ்வார் திருவடிகளே சரணம்",
  2:  "ஸ்ரீ பெரியாழ்வார் திருவடிகளே சரணம்",
  3:  "ஸ்ரீ ஆண்டாள் திருவடிகளே சரணம்",
  4:  "ஸ்ரீ ஆண்டாள் திருவடிகளே சரணம்",
  5:  "ஸ்ரீ குலசேகர பெருமாள் திருவடிகளே சரணம்",
  6:  "ஸ்ரீ திருமழிசைப்பிரான் திருவடிகளே சரணம்",
  7:  "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் திருவடிகளே சரணம்",
  8:  "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் திருவடிகளே சரணம்",
  9:  "ஸ்ரீ திருப்பாணாழ்வார் திருவடிகளே சரணம்",
  10: "ஸ்ரீ மதுரகவி ஆழ்வார் திருவடிகளே சரணம்",
  11: "ஸ்ரீ திருமங்கை ஆழ்வார் திருவடிகளே சரணம்",
  12: "ஸ்ரீ திருமங்கை ஆழ்வார் திருவடிகளே சரணம்",
  13: "ஸ்ரீ திருமங்கை ஆழ்வார் திருவடிகளே சரணம்",
  14: "ஸ்ரீ பொய்கை ஆழ்வார் திருவடிகளே சரணம்",
  15: "ஸ்ரீ பூதத்தாழ்வார் திருவடிகளே சரணம்",
  16: "ஸ்ரீ பேயாழ்வார் திருவடிகளே சரணம்",
  17: "ஸ்ரீ திருமழிசைப்பிரான் திருவடிகளே சரணம்",
  18: "ஸ்ரீ நம்மாழ்வார் திருவடிகளே சரணம்",
  20: "ஸ்ரீ நம்மாழ்வார் திருவடிகளே சரணம்",
  24: "ஸ்ரீ திருவரங்கத்தமுதனார் திருவடிகளே சரணம்",
  26: "ஸ்ரீ நம்மாழ்வார் திருவடிகளே சரணம்",
};

// ── Cache ──
const _cache = new Map();
function fetchMunnadi(scope, part) {
  const url = scope === "1000" && part
    ? `${API_BASE}/munnadi-pinnadi?scope=1000&part=${part}`
    : `${API_BASE}/munnadi-pinnadi?scope=full`;
  if (!_cache.has(url)) _cache.set(url, fetch(url).then(r => r.json()));
  return _cache.get(url);
}

// Global thaniyan — shown once at top, fetched from /api/thaniyan (type:'global')
const _globalThaniyanCache = new Map();
async function fetchGlobalThaniyan() {
  if (!_globalThaniyanCache.has('data')) {
    const promise = (async () => {
      try {
        const r = await fetch(`${API_BASE}/thaniyan`);
        if (r.ok) {
          const d = await r.json();
          return (d.thaniyan || []).find(t => t.type === 'global') || null;
        }
      } catch(e) {}
      return null;
    })();
    _globalThaniyanCache.set('data', promise);
  }
  return _globalThaniyanCache.get('data');
}

// Fetch thaniyans separately — Worker returns empty thaniyans[] in munnadi-pinnadi response
// Tries /api/thaniyan then /api/thaniyans — whichever the Worker exposes
const _thaniyanCache = new Map();
async function fetchThaniyans() {
  if (!_thaniyanCache.has('data')) {
    const promise = (async () => {
      // Try the standard thaniyan endpoint used elsewhere in the app
      try {
        const r = await fetch(`${API_BASE}/thaniyan`);
        if (r.ok) {
          const d = await r.json();
          // Expected shape: array of {section_id, thaniyan_id, canonical_name, lines:[]}
          // OR object {[section_id]: [{name, lines}]}
          if (Array.isArray(d)) {
            // Convert array → map keyed by section_id
            const map = {};
            for (const t of d) {
              const sid = t.section_id;
              if (!map[sid]) map[sid] = [];
              map[sid].push({ name: t.canonical_name || t.name || '', lines: t.lines || [] });
            }
            return map;
          }
          return d; // already a map
        }
      } catch(e) { /* try next */ }
      try {
        const r = await fetch(`${API_BASE}/thaniyans`);
        if (r.ok) return await r.json();
      } catch(e) { /* give up */ }
      return {};
    })();
    _thaniyanCache.set('data', promise);
  }
  return _thaniyanCache.get('data');
}

// ── Spinner ──
export function munnadiSpinner() {
  return `
    <div class="mp-portrait-gate">
      <div class="mp-rotate-icon">🔄</div>
      <div class="mp-rotate-msg">Please rotate to landscape to view Munnadi Pinnadi</div>
    </div>
    <div class="mp-page">
      <div class="mp-page-header">Munnadi Pinnadi<div class="mp-page-header-sub">Naalayira Divya Prabandham</div></div>
      <div class="mp-spinner"><div class="mp-spinner-lotus">🪷</div><div style="font-size:13px;color:#7a5a20;">Loading...</div></div>
    </div>`;
}

// ── Float nav ──
function floatNav() {
  return `<div class="mp-float-nav">
    <button title="Home"      onclick="window.goHome?.()">🏠</button>
    <button title="Top"       onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>
    <button title="Page up"   onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})">◀</button>
    <button title="Page down" onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})">▶</button>
    <button title="Zoom in"   onclick="(()=>{const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mp-font')||'11');document.documentElement.style.setProperty('--mp-font',(v+1)+'px')})()">A+</button>
    <button title="Zoom out"  onclick="(()=>{const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mp-font')||'11');document.documentElement.style.setProperty('--mp-font',(Math.max(8,v-1))+'px')})()">A-</button>
  </div>`;
}

// ── Main entry ──
export async function renderMunnadiPinnadi(scope = "full", part = null) {
  injectMunnadiCSS();
  registerMunnadiIndexHandlers();
  const [data, globalThaniyan] = await Promise.all([
    fetchMunnadi(scope, part),
    fetchGlobalThaniyan(),
  ]);
  if (data.error) {
    return `<div class="mp-page"><div style="padding:20px;color:red;">Error: ${data.error}</div></div>`;
  }
  return buildPage(data, globalThaniyan);
}

// ── Build page ──
function buildPage(data, globalThaniyan) {
  const parts = [];
  parts.push(`
    <div class="mp-portrait-gate">
      <div class="mp-rotate-icon">🔄</div>
      <div class="mp-rotate-msg">Please rotate to landscape to view Munnadi Pinnadi</div>
    </div>`);
  parts.push(`<div class="mp-page">`);
  parts.push(`<div class="mp-page-header">Munnadi Pinnadi<div class="mp-page-header-sub">${data.thousand_name || ''}</div></div>`);
  parts.push(buildMunnadiIndex(data));
  parts.push(`<div id="mp-content">`);

  // ── Global thaniyan block at top ──
  if (globalThaniyan && globalThaniyan.lines && globalThaniyan.lines.length > 0) {
    parts.push(`<div class="mp-thaniyan-box" style="margin:12px;">`);
    parts.push(`<div class="mp-thaniyan-label">Thaniyan</div>`);
    if (globalThaniyan.title) parts.push(`<div class="mp-thaniyan-name">${globalThaniyan.title}</div>`);
    let lastGroup = null;
    for (const line of globalThaniyan.lines) {
      const text  = line.line_text  || line;
      const role  = line.line_role  || null;
      const group = line.line_group ?? 1;
      if (role === 'title') {
       continue; // already shown via globalThaniyan.title above
      } else if (role === 'subhead') {
        parts.push(`<div class="mp-thaniyan-subhead">${text}</div>`);
        lastGroup = null;
      } else if (group === 0) {
        parts.push(`<div class="mp-thaniyan-subhead">${text}</div>`);
        lastGroup = null;
      } else {
        if (lastGroup !== null && group !== lastGroup) {
          parts.push(`<div class="mp-thaniyan-gap"></div>`);
        }
        parts.push(`<span class="mp-thaniyan-line">${text}</span>`);
        lastGroup = group;
      }
    }
    parts.push(`</div>`);
  }

  for (const sec of (data.sections || [])) {
    parts.push(buildSection(sec));
  }
  parts.push(`<div class="mp-final-closing">— முன்னடி -பின்னடி முற்றிற்று 🙏 —</div>`);
  parts.push(`</div>`);
  parts.push(floatNav());
  parts.push(`</div>`);
  return parts.join("");
}

// ── Build one section ──
function buildSection(sec) {
  const parts       = [];
  const closingText = SECTION_CLOSING[sec.section_id] || '';
  const heading     = SECTION_HEADER[sec.section_id]  || sec.section_name || '';

  parts.push(`<div id="mp-sec-${sec.section_id}">`);

  // ── Thaniyan box ──
  const tMode    = Number(sec.thaniyan_display_mode ?? 0);
  const thaniyans = sec.thaniyans || [];
  if (tMode !== 0 && thaniyans.length > 0) {
    parts.push(`<div class="mp-thaniyan-box">`);
    parts.push(`<div class="mp-thaniyan-label">Thaniyan</div>`);
    for (const t of thaniyans) {
      // canonical name from thaniyan_master = section-level heading, skip if first line duplicates it
      //if (t.name) parts.push(`<div class="mp-thaniyan-name">${t.name}</div>`);
      let lastGroup = null;
      for (const line of (t.lines || [])) {
        // line is now {text, role, group} from handler
        const text  = typeof line === 'object' ? line.text  : line;
        const role  = typeof line === 'object' ? line.role  : null;
        const group = typeof line === 'object' ? line.group : 1;
        // Skip if text duplicates canonical name
        const clean = s => s.replace(/[\u200c\u200b\s]/g, '');
        if (text && t.name && clean(text) === clean(t.name)) continue;
        if (role === 'title') {
          parts.push(`<div class="mp-thaniyan-name">${text}</div>`);
          lastGroup = null;
        } else if (role === 'subhead' || group === 0) {
          parts.push(`<div class="mp-thaniyan-subhead">${text}</div>`);
          lastGroup = null;
        } else {
          // verse line — add gap div when group changes (new stanza)
          if (lastGroup !== null && group !== lastGroup) {
            parts.push(`<div class="mp-thaniyan-gap"></div>`);
          }
          parts.push(`<span class="mp-thaniyan-line">${text}</span>`);
          lastGroup = group;
        }
      }
    }
    parts.push(`</div>`);
  }

  // ── Section box ──
  parts.push(`<div class="mp-section-box">`);
  parts.push(`<div class="mp-section-heading">${heading}</div>`);
  parts.push(`<div class="mp-section-inner">`);

  const secType = sec.section_type || 'simple';
  if (secType === 'pathu') {
    const groups = sec.groups || [];
    for (let gi = 0; gi < groups.length; gi++) {
      const grp  = groups[gi];
      const pid  = grp.pathu_id;
      const sub  = grp.subunit_name       || '';
      const tmh  = grp.thirumozhi_heading || '';
      const isLast = gi === groups.length - 1;
      parts.push(`<div class="mp-pathu-group" id="mp-grp-${pid}">`);
      parts.push(`<div class="mp-pathu-heading">${grp.pathu_name || ''}</div>`);
      if (sub || tmh) parts.push(`<div class="mp-subunit-heading">${[sub, tmh].filter(Boolean).join(' — ')}</div>`);
      parts.push(buildPasurams(grp.pasurams || []));
      // closing after every pathu group; last group closing is the section closing styled differently
      if (closingText) {
        parts.push(isLast
          ? `<div class="mp-section-closing">${closingText}</div>`
          : `<div class="mp-tm-closing">${closingText}</div>`);
      }
      parts.push(`</div>`);
    }

  } else if (secType === 'thirumozhi') {
    const groups = sec.groups || [];
    for (let gi = 0; gi < groups.length; gi++) {
      const grp    = groups[gi];
      const tid    = grp.thirumozhi_id;
      const tmh    = grp.thirumozhi_heading || '';
      const isLast = gi === groups.length - 1;
      parts.push(`<div class="mp-thirumozhi-group" id="mp-grp-tm-${tid}">`);
      parts.push(`<div class="mp-thirumozhi-heading">${grp.thirumozhi_name || ''}</div>`);
      if (tmh) parts.push(`<div class="mp-subunit-heading">${tmh}</div>`);
      parts.push(buildPasurams(grp.pasurams || []));
      if (closingText) {
        parts.push(isLast
          ? `<div class="mp-section-closing">${closingText}</div>`
          : `<div class="mp-tm-closing">${closingText}</div>`);
      }
      parts.push(`</div>`);
    }

  } else {
    // simple — direct pasurams, single closing at end
    parts.push(buildPasurams(sec.pasurams || []));
    if (closingText) parts.push(`<div class="mp-section-closing">${closingText}</div>`);
  }

  parts.push(`</div>`); // section-inner
  // NO extra mp-section-closing here — already emitted inside the last group above
  parts.push(`</div>`); // section-box
  parts.push(`</div>`); // mp-sec-N
  return parts.join("");
}

// ── Column headers ──
const COL_HEADERS = `
  <div class="mp-col-headers">
    <div class="mp-ch-gno">GNO</div>
    <div class="mp-ch-m">Munnadi</div>
    <div class="mp-ch-div"></div>
    <div class="mp-ch-p">Pinnadi</div>
    <div class="mp-ch-no">No.</div>
  </div>`;

// ── Pasuram rows ──
function buildPasurams(pasurams) {
  if (!pasurams || pasurams.length === 0) return '';
  const parts = [`<div class="mp-pasurams">${COL_HEADERS}`];
  for (const p of pasurams) {
    const dual = p.double_recital ? `<span class="mp-dual-marker">** </span>` : "";
    if (p.merged) {
      parts.push(`
        <div class="mp-pasuram-row mp-pasuram-merged" id="mp-p-1">
          <span class="mp-pno">1&amp;2</span>
          <span class="mp-line1"><span class="mp-dual-marker">** </span>பல்லாண்டு பல்லாண்டு</span>
          <span class="mp-vline"></span>
          <span class="mp-line2">அடியோமோடும் நின்னோடும்</span>
          <span class="mp-localn">1&amp;2</span>
        </div>`);
      continue;
    }
    parts.push(`
      <div class="mp-pasuram-row" id="mp-p-${p.global_no}">
        <span class="mp-pno">${p.global_no}</span>
        <span class="mp-line1">${dual}${p.line_1 || ""}</span>
        <span class="mp-vline"></span>
        <span class="mp-line2">${p.line_2 || ""}</span>
        <span class="mp-localn">${p.local_no}</span>
      </div>`);
  }
  parts.push(`</div>`);
  return parts.join("");
}
