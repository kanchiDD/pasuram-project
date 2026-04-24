import { state } from "../state.js";
import { renderThaniyan } from "./thaniyan.js";
import { renderMadal, renderKootrirukkai } from "./special.js";

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

export function renderPasuram(displayMapOverride, sectionClosingOverride) {
const displayMap = displayMapOverride || state.displayMap;
const sectionClosing = sectionClosingOverride || state.sectionClosing;

  console.log("RENDER PASURAM FUNCTION RUNNING");

  if (!state) return "";

  let html = "";

  // 🔥 SAFE STANDALONE FILTER (NON-DESTRUCTIVE)
  let originalData = state.pasuramData;

  if (state.selectedThirumozhiId) {
    state.pasuramData = originalData.filter(p =>
      p.thirumozhi_id === state.selectedThirumozhiId
    );
  }

  const closingText = sectionClosing?.[0]?.closing_text || ""; 

 // console.log("MADAL?", state.madalData);
 // console.log("KOOTRIRUKKAI?", state.kootrirukkaiData);

  // 🔥 ALWAYS HANDLE SPECIAL FIRST

if (state.madalData) {
  html += renderMadal(state.madalData);
  return html;
}

if (state.kootrirukkaiData) {
  html += renderKootrirukkai(state.kootrirukkaiData);
  return html;
}

  function getProsodyName(globalNo) {
    if (!state.prosodyScope || !state.prosodyMaster) return null;

    const row = state.prosodyScope.find(r =>
      globalNo >= r.start_global_no &&
      globalNo <= r.end_global_no
    );

    if (!row) return null;

    return state.prosodyMaster[row.prosody_id]?.canonical_name_tamil;
  }

  /* ================= THANIYAN ================= */

  if (!state.isFullRender && state.thaniyanData) {
    const thaniyanHtml = renderThaniyan(
      state.thaniyanData?.data || state.thaniyanData?.rows || state.thaniyanData,
      state.prosodyMap
    );

    if (typeof thaniyanHtml === "string") {
      html += thaniyanHtml;
    }
  }

  /* ================= SECTION HEADER ================= */

  if (!state.isFullRender) {

  let sectionName = state.selectedSectionName || "";

  if (sectionName) {
    const title =
      sectionHeaderMap[sectionName] ||
      sectionName;

    html += `
      <div style="text-align:center;margin:20px 0 10px 0;font-weight:600;">
        ${title}
      </div>
    `;
  }

}

  /* ================= SECTION DISPLAY ================= */

  if (displayMap && displayMap.section && displayMap.section.length > 0) {

    html += `
      <div class="section-display">
        ${(displayMap && displayMap.section ? displayMap.section : [])
          .filter(d =>
            d &&
            d.text &&
            typeof d.text === "string" &&
            d.text.trim() !== "" &&
            !(d.text && d.text.toLowerCase().includes("அடிவரவு"))
          )
          .map(d => `
            <div class="display-item ${d.type || ""}">
              ${d.text}
            </div>
          `).join("")}
      </div>
    `;
  }

  /* ================= PASURAM ================= */

  if (Array.isArray(state.pasuramData) && state.pasuramData.length > 0) {

    window._lastPathu = null;
    window._lastThiru = null;

    let currentProsody = null;

    state.pasuramData.forEach(function(p, index) {
    
      
      const key = String(p.global_no);

      /* ===== PATHU HEADER ===== */

if (p.pathu_id !== null && p.pathu_id !== undefined) {

  if (window._lastPathu !== p.pathu_id) {

    window._lastPathu = p.pathu_id;
    window._lastThiruHeading = null;

    html += '<div class="prabandham-header">';
    html += '<div class="line1">' + (p.section_name || '') + '</div>';
    html += '<div class="line2">' + (p.pathu_name || '') + ' - ' + (p.pathu_subunit_name || '') + '</div>';
    html += '</div>';
  }

  if (
    p.thirumozhi_heading &&
    window._lastThiruHeading !== p.thirumozhi_heading
  ) {
    window._lastThiruHeading = p.thirumozhi_heading;

    // ✅ ORIGINAL (RESTORED)
    html += '<div class="line3-bold">' + p.thirumozhi_heading + '</div>';

    const pathuKey = String(p.pathu_id);

    if (
      state.displayMap &&
      state.displayMap.pathu &&
      displayMap.pathu[pathuKey]
    ) {
      html += '<div class="display-block">';

      state.displayMap.pathu[pathuKey]
        .filter(d => d && d.text && !d.text.includes("அடிவரவு"))
        .forEach(function(d) {
          html += '<div class="display-item">' + d.text + '</div>';
        });

      html += '</div>';
    }
  }
}

      /* ===== DIRECT THIRUMOZHI ===== */

else if (p.thirumozhi_id !== null && p.thirumozhi_id !== undefined) {

  if (window._lastThiru !== p.thirumozhi_id) {

    window._lastThiru = p.thirumozhi_id;

    html += '<div class="prabandham-header">';
    html += '<div class="line1">' + (p.section_name || '') + '</div>';
    html += '<div class="line2">' + (p.thirumozhi_name || '') + '</div>';
    html += '</div>';

    // ✅ ORIGINAL (RESTORED)
    html += '<div class="line3-bold">' + (p.thirumozhi_heading || '') + '</div>';

    const thiruKey = String(p.thirumozhi_id);

    if (
      state.displayMap &&
      state.displayMap.thirumozhi &&
      displayMap.thirumozhi[thiruKey] &&
      state.displayMap.thirumozhi[thiruKey].items
    ) {
      html += '<div class="display-block">';

      state.displayMap.thirumozhi[thiruKey].items
        .filter(d => d && d.text && !d.text.includes("அடிவரவு"))
        .forEach(function(d) {
          html += '<div class="display-item">' + d.text + '</div>';
        });

      html += '</div>';
    }
  }
}

      /* ================= PROSODY ================= */

      const pProsody = getProsodyName(p.global_no);

      if (pProsody && pProsody !== currentProsody) {
        html += '<div class="prosody">' + pProsody + '</div>';
        currentProsody = pProsody;
      }

      /* ===== DISPLAY BLOCK ===== */

      if (
        state.displayMap &&
        state.displayMap.pasuram &&
        displayMap.pasuram[key]
      ) {

        html += '<div class="display-block">';

        state.displayMap.pasuram[key]
          .filter(d => d && d.text && !d.text.includes("அடிவரவு"))
          .forEach(function(d) {
            html += '<div class="display-item">' + d.text + '</div>';
          });

        html += '</div>';
      }

      /* ===== PASURAM ===== */

      html += '<div class="tree-item pasuram-item">';
      html += '<b>' + p.global_no + '</b>';

     /* 🔥 FINAL — UNIVERSAL GROUP HANDLING (UPDATED) */

/* 🟢 UPDATED BLOCK START */

if (Array.isArray(p.lines)) {

  let prevGroup = null;

  /* 🟢 ADD index 'i' */
  p.lines.forEach(function(l, i) {

    const group = l.recital_group || l.group || 1;

    /* 🟡 SAME LOGIC — GAP ONLY ON GROUP CHANGE */
    if (prevGroup !== null && prevGroup !== group) {
      html += '<div class="group-gap"></div>';
    }

    /* 🟢 INLINE DUAL MARK (ONLY FIRST LINE) */
    const dualPrefix =
      (i === 0 && Number(p.double_recital) === 1)
        ? '<span class="dual-mark-inline">**</span> '
        : '';

    /* 🟢 SAFE TEXT FALLBACK */
    const text = l.text || l.line_text || '';

    /* 🟢 FINAL RENDER */
    html += '<div class="pasuram-line group' + group + '">'
          + dualPrefix + text +
          '</div>';

    prevGroup = group;
  });

}

/* 🟢 UPDATED BLOCK END */


/* 🟡 UNCHANGED BELOW */

html += '<div class="pasuram-local">';
html += (p.local_no || p.local_pasuram_no || "");
html += '</div>';

html += '</div>';
      /* ===== END DETECTION (UNCHANGED) ===== */

      const next = state.pasuramData[index + 1];

      const isLastOfPathu =
        p.pathu_id &&
        (!next || next.pathu_id !== p.pathu_id);

      const isLastOfThirumozhi =
        p.thirumozhi_id &&
        (!next || next.thirumozhi_id !== p.thirumozhi_id);

      if (isLastOfPathu) {
        const pathuKey = String(p.pathu_id);

        ((state.displayMap && state.displayMap.pathu && state.displayMap.pathu[pathuKey]) || [])
          .filter(d => d && d.text && d.text.includes("அடிவரவு"))
          .forEach(function(d) {
            html += '<div class="display-item">' + d.text + '</div>';
          });

        if (closingText) {
          html += '<div class="section-close">' + closingText + '</div>';
        }
      }

      if (isLastOfThirumozhi) {
        const thiruKey = String(p.thirumozhi_id);

        ((state.displayMap &&
          state.displayMap.thirumozhi &&
          state.displayMap.thirumozhi[thiruKey] &&
          state.displayMap.thirumozhi[thiruKey].items) || [])
          .filter(d => d && d.text && d.text.includes("அடிவரவு"))
          .forEach(function(d) {
            html += '<div class="display-item">' + d.text + '</div>';
          });

        if (closingText) {
          html += '<div class="section-close">' + closingText + '</div>';
        }
      }

      const hasPathuData =
        state.displayMap &&
        displayMap.pathu &&
        Object.keys(state.displayMap.pathu).length > 0;

      const hasThiruData =
        state.displayMap &&
        displayMap.thirumozhi &&
        Object.keys(state.displayMap.thirumozhi).length > 0;

      const isLastStandalone =
        !hasPathuData &&
        !hasThiruData &&
        (!next || next.section_id !== p.section_id);

      if (isLastStandalone) {

        ((state.displayMap && displayMap.section) || [])
          .filter(d => d && d.text && d.text.includes("அடிவரவு"))
          .forEach(function(d) {
            html += '<div class="display-item">' + d.text + '</div>';
          });

        if (closingText) {
          html += '<div class="section-close">' + closingText + '</div>';
        }
      }

    });
  }

  state.pasuramData = originalData;
/* ✅ MIC BUTTON */
html += `
  <div class="mic-btn" onclick="openRecital()">
    🎤
  </div>
`;  
  return html;
}

