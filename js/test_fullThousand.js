import { state } from "./state.js";
import { t as uiText } from "./utils/uiStrings.js";
import {
  fetchSections,
  fetchThaniyan,
  fetchPasuram,
  fetchMadal,
  fetchKootrirukkai,
  fetchThousand
  } from "./api.js";

import { renderPasuram } from "./render/pasuram_full.js";
import { sectionPlayAll, sectionAudioUrls, thousandPlayAll, specialSectionUrls, specialSectionPlayAll, globalThaniyanUrls, playUrls } from "./render/globalAudio.js";
import { renderMadal, renderKootrirukkai } from "./render/special.js";
import { getThaniyanHTML } from "./thaniyanController.js";
import { renderIndex } from "./index.js";
import { renderThaniyan } from "./render/thaniyan.js";
import { sectionAllowedForSect, thousandAllowedForSect, SECTION_SECT } from "./utils/sectUtils.js";

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

// =========================
// 🔥 MAIN FUNCTION
// =========================
export async function testFullThousand(selectedThousandId = null) {

let html = "";
let fullAnchorRows = [];

// ✅ ADD THIS
const isFullMode = !selectedThousandId;


  state.isFullRender = true;


  const context = {
    thousandId: null,
    globalTracker: {}
  };

  // =========================
  // 🔥 FETCH THOUSANDS
  // =========================
  await fetchThousand();

  const thousands = state.thousandData || [];

  // Sect scope for this render (VM users carry sect='V')
  const _sect    = localStorage.getItem("sect") || "T";
  const _subsect = localStorage.getItem("subsect") || "";

  // Accumulates every rendered thousand's audio queue → Full-4000 play button
  let grandQueue = [];

  // 🔥 FILTER (FOR 1–4 OR FULL 4000) + sect scoping
  const filteredThousands = (selectedThousandId
    ? thousands.filter(t => Number(t.id) === Number(selectedThousandId))
    : thousands
  ).filter(t => thousandAllowedForSect(t.id, _sect));

  // இதர பிரபந்தங்கள் (99) is NOT part of the 4000 — always render it LAST,
  // after the 4000's closing, inside its own distinct box.
  const _ordered = [...filteredThousands].sort(
    (a, b) => (Number(a.id) === 99 ? 1 : 0) - (Number(b.id) === 99 ? 1 : 0)
  );

  // Is a section part of the core 4000 ('B') vs ithara (sect-specific)?
  const _isItharaSection = id => (SECTION_SECT[Number(id)] || "B") !== "B";

  const _CLOSING_4000 = `
    <div style="text-align:center;margin:50px 0 30px 0;">
      <div style="font-size:26px;font-weight:900;">
        நாலாயிர திவ்யப்பிரபந்தம் முற்றிற்று
      </div>
      <div style="font-size:18px;margin-top:10px;color:#b38b2e;">
        ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖
      </div>
    </div>
  `;
  let _closing4000Done = false;

  
  // =========================
  // 🔥 LOOP THOUSANDS
  // =========================
  for (const t of _ordered) {

    const _isIthara = Number(t.id) === 99;

    // In full mode: close out the 4000 BEFORE ithara begins, and open a
    // visually distinct box so users see ithara is a separate collection.
    if (_isIthara && isFullMode) {
      html += _CLOSING_4000;
      _closing4000Done = true;
      html += `<div style="border:3px double #b38b2e;border-radius:10px;
                           padding:14px 10px;margin:26px 0;background:#fffdf5;">`;
    }

    state.selectedThousandId = t.id;
    context.thousandId = t.id;

    // Per-thousand audio queue (accumulated across its sections, audio-only)
    let thousandQueue = [];

// =========================
// 🔥 THOUSAND HEADER
// =========================
html += `
  <div style="text-align:center;margin:30px 0 20px 0;">
    
    ${
      selectedThousandId
        ? `<div style="font-size:26px;font-weight:900;">
             நாலாயிர திவ்யப்பிரபந்தம்
           </div>`
        : ``
    }

    <div style="font-size:20px;font-weight:700;margin-top:6px;">
  ${
    t.name === "நாலாயிர திவ்யப்பிரபந்தம்"
      ? ""
      : (Number(t.id) === 99 ? "இதர பிரபந்தங்கள்" : t.name)
  }
</div>

  </div>
`;

// Full-Thousand Play button goes here (filled in after sections are gathered)
html += `<!--FTP:${t.id}-->`;

// =========================
// 🔥 FETCH anchor map FIRST
// =========================
const res = await fetch(
  "https://cdnaalayiram-api.kanchitrust.workers.dev/api/anchor-map?thousand_id=" + t.id
);

const anchorRows = await res.json();

// Sections of this thousand, sect-scoped AND core/ithara-scoped:
// core thousands render only shared ('B') sections; the ithara box
// renders only the user's sect-specific (non-'B') sections.
const _allowSec = id =>
  sectionAllowedForSect(id, _sect) &&
  (_isIthara ? _isItharaSection(id) : !_isItharaSection(id));

// 🔥 accumulate for full index
fullAnchorRows.push(...anchorRows);



// =========================
// 🔥 INDEX FOR THIS THOUSAND (IMPORTANT)
// =========================
// 🔥 SHOW INDEX ONLY FOR SINGLE THOUSAND
if (selectedThousandId) {
  html += `
  <div class="index-border">

    <div class="index-title">
      📑 ${uiText("index")}
    </div>

    ${renderIndex(anchorRows.filter(r => _allowSec(r.section_id)), t.id)}

  </div>
`;

html += `
  <div class="page-spacer"></div>
`;
}

// =========================
// 🔥 BUILD SECTIONS FROM anchor map (MUST BE INSIDE LOOP)
// =========================
// Sections of this thousand, sect-scoped AND core/ithara-scoped (see
// _allowSec above, defined right after the anchor-map fetch).
const sections = [...new Set(anchorRows.map(r => r.section_id))]
  .filter(_allowSec)
  .sort((a, b) => a - b)
  .map(id => ({ id }));


// =========================
// 🔥 LOOP SECTIONS
// =========================
for (const sec of sections) {

  state.selectedSectionId = sec.id;

  const sectionRow = anchorRows.find(
    r => r.section_id === sec.id && r.type === "section"
  );

  let baseName = sectionRow?.canonical_text || "";

  // 🔥 FIX missing section names
  if (!baseName) {
    const SECTION_BASE_NAME = {
      2: "பெரியாழ்வார் திருமொழி",
      4: "நாச்சியார் திருமொழி",
      5: "பெருமாள் திருமொழி",
      11: "பெரிய திருமொழி",
      26: "திருவாய்மொழி"
    };

    baseName = SECTION_BASE_NAME[sec.id] || "";
  }

  state.selectedSectionName = baseName;

  const sectionTitle = sectionHeaderMap[baseName] || baseName;


      // =========================
      // 🔥 FETCH THANIYAN ALWAYS
      // =========================
      if (![2, 12, 13].includes(sec.id)) {
    await fetchThaniyan();
    }

      const isSpecial = isSpecialSection(sec.id);

// =========================
// 🔥 SPECIAL SECTIONS (FINAL FIXED)
// =========================
if (isSpecial) {

  const sectionId = Number(sec.section_id || sec.id);

  let specialHtml = "";

  if ([22, 23, 2673, 2674].includes(sectionId)) {
    await fetchMadal();
    specialHtml = renderMadal(state.madalData);
  }
  else if ([21, 2672].includes(sectionId)) {
    await fetchKootrirukkai();
    specialHtml = renderKootrirukkai(state.kootrirukkaiData);
  }

  // ✅ FILTER ONLY SECTION THANIYAN
  const thaniyanData =
    (state.thaniyanData?.data ||
     state.thaniyanData?.rows ||
     state.thaniyanData ||
     []).filter(t => t.type === "section");

// ✅ ADD THIS FIRST
html += `<div id="section-${sec.section_id || sec.id}" style="height:1px;"></div>`;

  // ✅ THANIYAN OUTSIDE (IMPORTANT)
  if (thaniyanData && thaniyanData.length > 0) {
  html += `
    <div class="thaniyan-border">
      ${renderThaniyan(thaniyanData)}
    </div>
  `;
}

  // ✅ CONTENT BOX SEPARATE
  html += `
    <div class="content-border">

      ${specialSectionPlayAll(sectionId)}

      ${specialHtml}

      <div class="section-final-ending">
      ${sectionHeaderMap[state.selectedSectionName] || state.selectedSectionName} முற்றிற்று
      </div>

    </div>
  `;

  // Special sections use hardcoded work files (thaniyan_id / work global_no),
  // not the generic per-row scheme — push those exact URLs.
  thousandQueue.push(...specialSectionUrls(sectionId));

  continue;
}


// =========================
// ✅ NORMAL SECTIONS
// =========================

// ❗ Skip thaniyan for 2 / 12 / 13
if (![2, 12, 13].includes(sec.id)) {
  html += `
    <div class="thaniyan-border">
      ${getThaniyanHTML(sec, state, context)}
    </div>
  `;
}


      // =========================
      // ✅ PASURAM FLOW
      // =========================
      await fetchPasuram();

      const currentDisplayMap = state.displayMap
        ? JSON.parse(JSON.stringify(state.displayMap))
        : { section: [], pathu: {}, thirumozhi: {}, pasuram: {} };

      const currentSectionClosing = state.sectionClosing
        ? JSON.parse(JSON.stringify(state.sectionClosing))
        : [];

      const hasPasuram =
        state.pasuramData &&
        (
          Array.isArray(state.pasuramData)
            ? state.pasuramData.length > 0
            : Object.keys(state.pasuramData).length > 0
        );

      // accumulate this section's audio (thaniyan + pasurams) into the thousand queue
      thousandQueue.push(...sectionAudioUrls(sec.id, state.thaniyanData, state.pasuramData));

     
// 🔥 CRITICAL RESET PER SECTION
window._lastThiru = null;
window._lastPathu = null;

if (hasPasuram) {

  

  html += `
    <div class="content-border">

      <div id="section-${sec.id}"
           class="section-heading"
           style="scroll-margin-top:80px;">
        ${sectionTitle}
      </div>

      ${sectionPlayAll(sec.id, state.thaniyanData, state.pasuramData)}

      ${renderPasuram(currentDisplayMap, currentSectionClosing)}

    </div>
  `;

  
}

    } // sections loop

// Fill in the Full-Thousand Play button now that its queue is complete.
// Prepend the sect pothu thaniyan once (T→t, V→v, Madam→k then v) so a
// thousand's playback opens with the global thaniyan before the pasurams.
// (Empty queue → thousandPlayAll returns "", so the placeholder just clears.)
const _thousandFullQueue = thousandQueue.length
  ? [...globalThaniyanUrls(_sect, _subsect), ...thousandQueue]
  : thousandQueue;
html = html.replace(`<!--FTP:${t.id}-->`,
  thousandPlayAll(t.id, _isIthara ? "இதர பிரபந்தங்கள்" : t.name, _thousandFullQueue));

// Ithara is NOT part of the 4000 — keep it out of the Full-4000 queue.
// (It keeps its own Play button above; nothing lost.)
if (!_isIthara) grandQueue.push(...thousandQueue);

// 🔥 THOUSAND CLOSING (SAFE + NON-DESTRUCTIVE)

let closingText = t.closing_text || t.closingText || t.closing;


// fallback only if missing (no override)
if (!closingText) {
  const fallback = {
    1: "முதலாமாயிரம் முற்றிற்று",
    2: "இரண்டாமாயிரம் முற்றிற்று",
    3: "முன்றாமாயிரம் / இயற்பா முற்றிற்று",
    4: "நான்காமாயிரம் முற்றிற்று",
    99: "இதர பிரபந்தங்கள் முற்றிற்று"
  };
  closingText = fallback[t.id];
}

if (closingText) {
 

  html += `
  <div class="section-closing" style="text-align:center;margin:40px 0 30px 0;">

    <div style="font-size:22px;font-weight:900;margin-bottom:10px;">
      ${closingText}
    </div>

    <div style="width:100px;height:2px;background:#b38b2e;margin:8px auto;"></div>

    <div style="font-size:16px;letter-spacing:5px;color:#b38b2e;">
      ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖
    </div>

    <div style="width:100px;height:2px;background:#b38b2e;margin:8px auto;"></div>

  </div>
`;
}

// Close the distinct ithara box opened before this thousand's header.
if (_isIthara && isFullMode) {
  html += `</div>`;
}
} // ✅ CLOSE thousands loop properly

// 🔥 ADD THIS BACK (CRITICAL FIX)
state.fullData = fullAnchorRows;

// 🔥 expose to bookMode
window.fullAnchorRows = fullAnchorRows;


// =========================
// 🔥 AFTER LOOP (SAFE)
// =========================

// 🔥 expose full anchor data
window.fullAnchorRows = fullAnchorRows;


// =========================
// 🔥 FINAL 4000 CLOSING
// =========================
if (!selectedThousandId && !_closing4000Done) {
  html += _CLOSING_4000;
}

// =========================
// 🔥 FLOATING NAV — matches site-wide naal-float-nav style
html += `
  <div id="floating-nav" class="naal-float-nav" style="display:flex;">
    <button onclick="goHome()" title="Home">🏠</button>
    <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
    <button onclick="goPrevPage()" title="Back">◀</button>
    <button onclick="goNextPage()" title="Next">▶</button>
    <button onclick="increaseFont()" title="Font+">A+</button>
    <button onclick="decreaseFont()" title="Font−">A−</button>
  </div>
`;
// ✅ ONLY FOR FULL 4000 (STRICT)
if (isFullMode) {

  // Full-4000 Play All: pothu thaniyan once, then every thousand's queue in
  // order. Items without audio were never queued; bad files are skipped by
  // the player's onerror → playback just moves to the next item.
  const _f4kQueue = grandQueue.length
    ? [...globalThaniyanUrls(_sect, _subsect), ...grandQueue]
    : [];
  window._f4kPlayAll = () => { if (_f4kQueue.length) playUrls(_f4kQueue); };

  const _f4kBtn = _f4kQueue.length ? `
    <div style="text-align:center;margin:14px 0 4px;">
      <button onclick="window._f4kPlayAll && window._f4kPlayAll()"
        style="background:linear-gradient(135deg,#2f7d32,#1b5e20);color:#fff;border:none;
               border-radius:22px;padding:10px 24px;font-size:15px;font-weight:700;cursor:pointer;
               box-shadow:0 3px 10px rgba(0,0,0,0.2)">${uiText("playFullNaalayiram")}</button>
    </div>` : "";

  // Index split: core 4000 sections vs ithara — separate boxes, separate
  // numbering, both sect-scoped, so ithara never reads as "part of the 4000".
  const _coreIdxRows = fullAnchorRows.filter(r =>
    sectionAllowedForSect(r.section_id, _sect) && !_isItharaSection(r.section_id));
  const _ithIdxRows = fullAnchorRows.filter(r =>
    sectionAllowedForSect(r.section_id, _sect) && _isItharaSection(r.section_id));

  const _ithIdxBox = _ithIdxRows.length ? `
  <div class="index-border">
    <div class="index-title">
      📑 இதர பிரபந்தங்கள்
    </div>

    ${renderIndex(_ithIdxRows, null)}
  </div>
  ` : "";

  html = `
  <div id="main-4000-heading" style="text-align:center;margin:40px 0 50px 0;">
    <div style="font-size:34px;font-weight:900;">
      நாலாயிர திவ்யப்பிரபந்தம்
    </div>
    ${_f4kBtn}
    <div style="width:140px;height:2px;background:#b38b2e;margin:12px auto;"></div>
  </div>

  <div class="index-border">
    <div class="index-title">
      📑 ${uiText("index")}
    </div>

    ${renderIndex(_coreIdxRows, null)}
  </div>

  ${_ithIdxBox}

  <div class="page-spacer"></div>
` + html;

}
state.isFullRender = false;
// 🔥 REMOVE accidental duplicates (safety)
setTimeout(() => {
  const all = document.querySelectorAll("#main-4000-heading");
  if (all.length > 1) {
    all.forEach((el, i) => {
      if (i !== 0) el.remove();
    });
  }
}, 0);



return html;
}



window.goHome = function() {
  window.location.href = "tree.html"; // 🔥 your entry page
};


window.goIndex = function() {

  // 🔥 first index on page
  const el = document.querySelector(".index-container");

  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
};


window.goPrevPage = function() {

  window.scrollBy({
    top: -window.innerHeight * 0.9,
    behavior: "smooth"
  });
};


window.goNextPage = function() {

  window.scrollBy({
    top: window.innerHeight * 0.9,
    behavior: "smooth"
  });
};

window.increaseFont = function () {
  // Update both --base-font (used by this file) and --nf (used by shared madal module)
  const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font')) || 18;
  const next = cur + 2;
  document.documentElement.style.setProperty('--base-font', next + 'px');
  document.documentElement.style.setProperty('--nf', next + 'px');
};

window.decreaseFont = function () {
  const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font')) || 18;
  if (cur > 12) {
    const next = cur - 2;
    document.documentElement.style.setProperty('--base-font', next + 'px');
    document.documentElement.style.setProperty('--nf', next + 'px');
  }
};






// =========================
// 🔥 HELPER (REQUIRED)
// =========================
function isSpecialSection(id) {
  return [21, 22, 23].includes(Number(id));
}