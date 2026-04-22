import { state } from "./state.js";
import {
  fetchSections,
  fetchThaniyan,
  fetchPasuram,
  fetchMadal,
  fetchKootrirukkai,
  fetchThousand
  } from "./api.js";

import { renderPasuram } from "./render/pasuram_full.js";
import { renderMadal, renderKootrirukkai } from "./render/special.js";
import { getThaniyanHTML } from "./thaniyanController.js";
import { renderIndex } from "./index.js";
import { renderThaniyan } from "./render/thaniyan.js";

const sectionHeaderMap = {
  "திருப்பல்லாண்டு": "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த திருப்பல்லாண்டு",
  "பெரியாழ்வார் திருமொழி": "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த பெரியாழ்வார் திருமொழி",
  "திருப்பாவை": "ஸ்ரீ ஆண்டாள் அருளிச்செய்த திருப்பாவை",
  "நாச்சியார் திருமொழி": "ஸ்ரீ ஆண்டாள் அருளிச்செய்த நாச்சியார் திருமொழி",
  "பெருமாள் திருமொழி": "ஸ்ரீ குலசேகர பெருமாள் அருளிச்செய்த பெருமாள் திருமொழி",
  "திருச்சந்தவிருத்தம்": "ஸ்ரீ திருமழிசைப்பிரான் அருளிச்செய்த திருச்சந்தவிருத்தம்",
  "திருமாலை": "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருமாலை",
  "திருப்பள்ளியெழுச்சி": "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருப்பள்ளியெழுச்சி",
  "அமலானதிபிரான்": "ஸ்ரீ திருப்பாணாழ்வார் அருளிச்செய்த அமலானதிபிரான்",
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

  // 🔥 FILTER (FOR 1–4 OR FULL 4000)
  const filteredThousands = selectedThousandId
    ? thousands.filter(t => Number(t.id) === Number(selectedThousandId))
    : thousands;

  // =========================
  // 🔥 FULL 4000 HEADING (TOP)
  // =========================
  if (!selectedThousandId) {
    html += `
      <div style="text-align:center;margin:30px 0 40px 0;font-size:24px;font-weight:800;">
        நாலாயிர திவ்யப்பிரபந்தம்
      </div>
    `;
  }

  // =========================
  // 🔥 LOOP THOUSANDS
  // =========================
  for (const t of filteredThousands) {

    state.selectedThousandId = t.id;
    context.thousandId = t.id;

// =========================
// 🔥 THOUSAND HEADER
// =========================
html += `
  <div style="text-align:center;margin:30px 0 20px 0;font-size:20px;font-weight:700;">
    ${t.name}
  </div>
`;

// =========================
// 🔥 FETCH anchor map FIRST
// =========================
const res = await fetch(
  "https://cdnaalayiram-api.kanchitrust.workers.dev/api/anchor-map?thousand_id=" + t.id
);

const anchorRows = await res.json();

// 🔥 accumulate for full index
fullAnchorRows.push(...anchorRows);

// ✅ DEBUG LOG (ADD THIS)
console.log("Thousand:", t.id, "Rows:", anchorRows.length, "Total so far:", fullAnchorRows.length);

// =========================
// 🔥 INDEX FOR THIS THOUSAND (IMPORTANT)
// =========================
// 🔥 SHOW INDEX ONLY FOR SINGLE THOUSAND
if (selectedThousandId) {
  html += `
  <div class="index-border">

    <div class="index-title">
      📑 Index
    </div>

    ${renderIndex(anchorRows, t.id)}

  </div>
`;

html += `
  <div class="page-spacer"></div>
`;
}

// =========================
// 🔥 BUILD SECTIONS FROM anchor map (MUST BE INSIDE LOOP)
// =========================
const sections = [...new Set(anchorRows.map(r => r.section_id))]
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

      ${specialHtml}

      <div class="section-final-ending">
        ${sectionHeaderMap[state.selectedSectionName] || state.selectedSectionName} முற்றிற்று
      </div>

    </div>
  `;

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

      console.log("SECTION START:", sec.id);
// 🔥 CRITICAL RESET PER SECTION
window._lastThiru = null;
window._lastPathu = null;

if (hasPasuram) {

  console.log("RENDERING SECTION:", sec.id);

  html += `
    <div class="content-border">

      <div id="section-${sec.id}"
           class="section-heading"
           style="scroll-margin-top:80px;">
        ${sectionTitle}
      </div>

      ${renderPasuram(currentDisplayMap, currentSectionClosing)}

    </div>
  `;

  console.log("HTML ADDED FOR SECTION:", sec.id);
}

    } // sections loop

// 🔥 THOUSAND CLOSING (SAFE + NON-DESTRUCTIVE)
let closingText = t.closing_text || t.closingText || t.closing;


// fallback only if missing (no override)
if (!closingText) {
  const fallback = {
    1: "முதலாமாயிரம் முற்றிற்று",
    2: "இரண்டாமாயிரம் முற்றிற்று",
    3: "முன்றாமாயிரம் / இயற்பா முற்றிற்று",
    4: "நான்காமாயிரம் முற்றிற்று"
  };
  closingText = fallback[t.id];
}

if (closingText) {
 

  html += `
    <div class="section-closing">
      ${closingText}
    </div>
  `;
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
if (!selectedThousandId) {
  html += `
    <div style="text-align:center;margin:40px 0;font-size:24px;font-weight:800;">
      நாலாயிர திவ்யப்பிரபந்தம் முற்றிற்று
    </div>
  `;
}


// =========================
// 🔥 FLOATING NAV (FINAL)
// =========================
html += `
  <div id="floating-nav" style="
    position:fixed;
    bottom:20px;
    right:20px;
    display:flex;
    flex-direction:column;
    gap:10px;
    z-index:999;
  ">

    <button onclick="goHome()">🏠</button>
    <button onclick="goIndex()">📑</button>
    <button onclick="goPrevPage()">◀️</button>
    <button onclick="goNextPage()">▶️</button>

  </div>
`;

// ✅ ONLY FOR FULL 4000 (STRICT)
if (isFullMode) {

  html = `
    <div class="index-border">
      <div class="index-title">
        📑 Index
      </div>

      ${renderIndex(fullAnchorRows, null)}
    </div>

    <div class="page-spacer"></div>
  ` + html;

}
state.isFullRender = false;
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







// =========================
// 🔥 HELPER (REQUIRED)
// =========================
function isSpecialSection(id) {
  return [21, 22, 23].includes(Number(id));
}


