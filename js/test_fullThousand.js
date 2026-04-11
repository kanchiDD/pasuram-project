import { state } from "./state.js";
import {
  fetchSections,
  fetchThaniyan,
  fetchPasuram,
  fetchMadal,
  fetchKootrirukkai,
  fetchThousand
} from "./api.js";

import { renderPasuram } from "./render/pasuram.js";
import { renderMadal, renderKootrirukkai } from "./render/special.js";
import { getThaniyanHTML } from "./thaniyanController.js";

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

  state.isFullRender = true;

  let html = "";

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

    await fetchSections();

    const sections = state.sectionData || [];

    // =========================
    // 🔥 LOOP SECTIONS (NO EXTRA FILTER)
    // =========================
    for (const sec of sections) {

      state.selectedSectionId = sec.id;
      state.selectedSectionName = sec.name;

      // =========================
      // 🔥 FETCH THANIYAN ALWAYS
      // =========================
      await fetchThaniyan();

      const isSpecial = isSpecialSection(sec.id);

      // =========================
      // 🔥 SPECIAL SECTIONS
      // =========================
      if (isSpecial) {

        html += getThaniyanHTML(sec, state, context);

        const sectionName = (state.selectedSectionName || "").trim();

        const title =
          sectionHeaderMap[sectionName] ||
          sectionName;

        html += `
          <div style="text-align:center;margin:20px 0 10px 0;font-weight:600;">
            ${title}
          </div>
        `;

        const sectionId = Number(sec.section_id || sec.id);

        if ([22, 23, 2673, 2674].includes(sectionId)) {
          await fetchMadal();
          html += renderMadal(state.madalData);
        }
        else if ([21, 2672].includes(sectionId)) {
          await fetchKootrirukkai();
          html += renderKootrirukkai(state.kootrirukkaiData);
        }

        continue;
      }

      // =========================
      // ✅ NORMAL SECTIONS
      // =========================
      html += getThaniyanHTML(sec, state, context);

      const sectionName = (state.selectedSectionName || "").trim();

      const title =
        sectionHeaderMap[sectionName] ||
        sectionName;

      html += `
        <div style="text-align:center;margin:20px 0 10px 0;font-weight:600;">
          ${title}
        </div>
      `;

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

      if (hasPasuram) {
        html += renderPasuram(currentDisplayMap, currentSectionClosing);
      }

    } // sections loop

  // =========================
// 🔥 THOUSAND CLOSING (SAFE + NON-DESTRUCTIVE)
// =========================
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
    <div style="text-align:center;margin:30px 0 40px 0;font-size:20px;font-weight:700;">
      ${closingText}
    </div>
  `;
}

} // ✅ CLOSE thousands loop properly


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

return html;
}

// =========================
// 🔥 HELPER (REQUIRED)
// =========================
function isSpecialSection(id) {
  return [21, 22, 23].includes(Number(id));
}