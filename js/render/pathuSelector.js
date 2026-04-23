import { state } from "../state.js";
import { render } from "./layout.js";

/* 🔥 HELPERS */

function getTamilNumber(subName) {
  const map = {
    "முதல்": 1,
    "இரண்டாம்": 2,
    "மூன்றாம்": 3,
    "நான்காம்": 4,
    "ஐந்தாம்": 5,
    "ஆறாம்": 6,
    "ஏழாம்": 7,
    "எட்டாம்": 8,
    "ஒன்பதாம்": 9,
    "பத்தாம்": 10
  };

  const key = Object.keys(map).find(k => subName.includes(k));
  return key ? map[key] : "";
}

function getUnitLabel(sectionName) {
  if (!sectionName) return "திருமொழி";
  if (sectionName.includes("திருவாய்மொழி")) return "திருவாய்மொழி";
  if (sectionName.includes("திருமொழி")) return "திருமொழி";
  return "திருமொழி";
}

function getPathuShortName(pathuName) {
  const map = {
    "முதல்": "1ம்",
    "இரண்டாம்": "2ம்",
    "மூன்றாம்": "3ம்",
    "நான்காம்": "4ம்",
    "ஐந்தாம்": "5ம்",
    "ஆறாம்": "6ம்",
    "ஏழாம்": "7ம்",
    "எட்டாம்": "8ம்",
    "ஒன்பதாம்": "9ம்",
    "பத்தாம்": "10ம்",
    "பதினொன்றாம்": "11ம்"
  };

  const key = Object.keys(map).find(k => pathuName.includes(k));
  return key ? map[key] + " பத்து" : pathuName;
}
/* 🔥 OPEN PATHU SELECTOR */

export function openPathuSelector() {
  const modal = document.getElementById("pathuModal");
  const sectionName = state.selectedSectionName || "Section";

  let html = `
    <div class="overlay">
      <div class="adiyen-modal">
        <div class="modal-header">
          🙏 Adiyen
          <span onclick="closePathuModal()">✖</span>
        </div>

        <div class="adiyen-question">Do you want:</div>

        <div class="adiyen-options">

          <label class="option">
            <input type="radio" name="pathu" value="full" onclick="setTimeout(confirmPathu,0)">
            Full ${sectionName}
          </label>

          <div class="adiyen-sub-divider">— OR (select any one) —</div>
  `;

  const source = state.pasuramData || [];

  const map = new Map();

  source.forEach(p => {
    const key = `${p.section_id}_${p.pathu_name}`;
    if (!map.has(key)) {
      map.set(key, p.pathu_name);
    }
  });

  Array.from(map.entries()).forEach(([key, name]) => {
    html += `
      <label class="option">
        <input type="radio" name="pathu" value="${key}" onclick="setTimeout(confirmPathu,0)">
        ${name}
      </label>
    `;
  });

  html += `</div></div></div>`;

  modal.innerHTML = html;
  modal.style.display = "block";
}


/* 🔥 STEP 1 */

window.confirmPathu = function () {
  const selected = document.querySelector('input[name="pathu"]:checked');
  if (!selected) return;

  if (selected.value === "full") {
    state.filteredPasuram = state.pasuramData || [];

/* 🔥 ADD THIS */
state.pasuramData = state.filteredPasuram;

state.level = "PASURAM";

    closePathuModal(true);
    render();
    return;
  }

  const [sectionId, pathuName] = selected.value.split("_");

  state.selectedPathu = { sectionId, pathuName };

  openThirumozhiSelector();
};


/* 🔥 STEP 2 */

function openThirumozhiSelector() {
  const modal = document.getElementById("pathuModal");

  const source = state.pasuramData || [];
  const { sectionId, pathuName } = state.selectedPathu;

  const map = new Map();

  source.forEach(p => {
    if (
      Number(p.section_id) === Number(sectionId) &&
      String(p.pathu_name).trim() === String(pathuName).trim()
    ) {
      const key = `${p.sub_unit_no}_${p.thirumozhi_heading}`;

      if (!map.has(key)) {
        map.set(key, {
	no: p.thirumozhi_heading,   // 🔥 THIS IS THE FIX
  	heading: p.thirumozhi_heading,
  	subName: p.pathu_subunit_name
	});
      }
    }
  });

  const list = Array.from(map.values()).sort((a, b) => a.no - b.no);

  let html = `
    <div class="overlay">
      <div class="adiyen-modal">

        <div class="modal-header">
          🙏 Adiyen
          <span onclick="closePathuModal()">✖</span>
        </div>

        <div class="adiyen-question">
          Select ${state.selectedSectionName}:
        </div>

        <div class="adiyen-options">

          <label class="option">
            <input type="radio" name="thirumozhi" value="full" onclick="setTimeout(confirmThirumozhi,0)">
            Full ${pathuName}
          </label>

          <div class="adiyen-sub-divider">— OR (select any one) —</div>
  `;

  list.forEach(obj => {
    html += `
      <label class="option">
        <input type="radio" name="thirumozhi" value="${String(obj.no)}" onclick="setTimeout(confirmThirumozhi,0)">
        ${getPathuShortName(pathuName)} - ${getTamilNumber(obj.subName)}ம் ${getUnitLabel(state.selectedSectionName)} - ${obj.heading}
      </label>
    `;
  });

  html += `</div></div></div>`;

  modal.innerHTML = html;
}


/* 🔥 FINAL */

window.confirmThirumozhi = function () {

  const selected = document.querySelector('input[name="thirumozhi"]:checked');
  if (!selected) return;

  const source = state.pasuramData || [];
  const { sectionId, pathuName } = state.selectedPathu;

  let filtered = [];

  if (selected.value === "full") {

    filtered = source.filter(p =>
      Number(p.section_id) === Number(sectionId) &&
      String(p.pathu_name).trim() === String(pathuName).trim()
    );

  } else {

    const heading = selected.value;

    filtered = source.filter(p =>
      Number(p.section_id) === Number(sectionId) &&
      String(p.pathu_name).trim() === String(pathuName).trim() &&
      String(p.thirumozhi_heading).trim() === String(heading).trim()
    );
  }

  // ✅ SET DATA FIRST
  state.filteredPasuram = filtered;
  state.pasuramData = filtered;

  // ✅ TURN OFF MODAL FLAG (CRITICAL)
  state.isPathuSelectionActive = false;

  // ✅ SET LEVEL
  state.level = "PASURAM";

  // ✅ CLOSE + RENDER ONCE
  closePathuModal(true);
  render();
};
  

/* 🔥 ADD THIS LINE */
state.pasuramData = filtered;

state.level = "PASURAM";

  closePathuModal(true);
  render();
};


/* 🔥 CLOSE */

window.closePathuModal = function (skipRender = false) {
  const modal = document.getElementById("pathuModal");
  modal.style.display = "none";

  if (!skipRender) {
    state.level = "SECTION";
    render();
  }
};