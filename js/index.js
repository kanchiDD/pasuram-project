import { openPathuSelector } from "./render/pathuSelector.js";
import { state } from "./state.js";
import { render } from "./render/layout.js";
import { renderInlineOptions } from "./inlinePathuUI.js";

const SECTION_NAMES = {
  1: "திருப்பல்லாண்டு",
  2: "பெரியாழ்வார் திருமொழி",
  3: "திருப்பாவை",
  4: "நாச்சியார் திருமொழி",
  5: "பெருமாள் திருமொழி",
  6: "திருச்சந்தவிருத்தம்",
  7: "திருமாலை",
  8: "திருப்பள்ளியெழுச்சி",
  9: "அமலானதிபிரான்",
  10: "கண்ணிநுண்சிறுத்தாம்பு",
  11: "பெரிய திருமொழி",
  12: "திருகுறுந்தாண்டகம்",
  13: "திருநெடுந்தாண்டகம்",
  14: "முதல்‌ திருவந்தாதி",
  15: "இரண்டாம்‌ திருவந்தாதி",
  16: "மூன்றாம்‌ திருவந்தாதி",
  17: "நான்முகன்‌திருவந்தாதி",
  18: "திருவிருத்தம்",
  19: "திருவாசிரியம்",
  20: "பெரியதிருவந்தாதி",
  21: "திருவெழுகூற்றிருக்கை",
  22: "சிறியதிருமடல்",
  23: "பெரியதிருமடல்",
  24: "இராமாநுச நூற்றந்தாதி",
  25: "உபதேசரத்தினமாலை",
  26: "திருவாய்மொழி",
  27: "திருவாய்மொழி நூற்றந்தாதி"
};

function getTamilNumber(text) {

  if (!text) return "";

  const map = [
    { keys: ["முதற்", "முதல்"], val: 1 },
    { keys: ["இரண்டாம்"], val: 2 },
    { keys: ["மூன்றாம்"], val: 3 },
    { keys: ["நான்காம்"], val: 4 },
    { keys: ["ஐந்தாம்"], val: 5 },
    { keys: ["ஆறாம்"], val: 6 },
    { keys: ["ஏழாம்"], val: 7 },
    { keys: ["எட்டாம்"], val: 8 },
    { keys: ["ஒன்பதாம்"], val: 9 },
    { keys: ["பத்தாம்"], val: 10 },
    { keys: ["பதினொன்றாம்"], val: 11 }
  ];

  for (const entry of map) {
    if (entry.keys.some(k => text.includes(k))) {
      return entry.val;
    }
  }

  return "";
}

function getPathuShortName(pathuName) {

  if (!pathuName) return "";

  const map = [
    { keys: ["முதற்", "முதல்"], val: "1ம்" },
    { keys: ["இரண்டாம்"], val: "2ம்" },
    { keys: ["மூன்றாம்"], val: "3ம்" },
    { keys: ["நான்காம்"], val: "4ம்" },
    { keys: ["ஐந்தாம்"], val: "5ம்" },
    { keys: ["ஆறாம்"], val: "6ம்" },
    { keys: ["ஏழாம்"], val: "7ம்" },
    { keys: ["எட்டாம்"], val: "8ம்" },
    { keys: ["ஒன்பதாம்"], val: "9ம்" },
    { keys: ["பத்தாம்"], val: "10ம்" },
    { keys: ["பதினொன்றாம்"], val: "11ம்" } 
  ];

  for (const entry of map) {
    if (entry.keys.some(k => pathuName.includes(k))) {
      return entry.val + " பத்து";
    }
  }

  return pathuName;
}

export function renderIndex(rows, thousandId) {

  
  const grouped = groupBySection(rows);

  let html = `<div class="index-container">`;

  grouped.forEach((section, secIndex) => {
console.log("INDEX thousandId:", thousandId);  // 🔥 ADD THIS

    let secNum = "";

// 🔥 STRICT MODE (NO AUTO DETECT)
if (thousandId === undefined || thousandId === null) {
  // FULL 4000
  secNum = `${secIndex + 1}`;
} else {
  // SINGLE THOUSAND
  secNum = `${thousandId}.${secIndex + 1}`;
}

    const sectionId = `sec_${section.section_id}`;

    const hasPathu = section.pathu_groups.length > 0;
    const hasDirect = section.direct_thirumozhis.length > 0;

    html += `
  <div class="section">

    <div class="section-title"
      onclick='handleSectionClick(${section.section_id})'>

      ${secNum}. ${section.label}
      ${(hasPathu || hasDirect) ? " ▶" : ""}
    </div>

    <div id="${sectionId}" style="display:none;">
`;


    // ================= PATHU =================
    section.pathu_groups.forEach((p, i) => {

      const pathuId = `pathu_${section.section_id}_${i}`;

      html += `
        <div class="pathu" data-section="${section.section_id}">
          <div class="pathu-title"
            onclick='togglePathu("${section.section_id}", "${pathuId}")'>
            ▶ ${p.label}
          </div>

          <div id="${pathuId}" class="pathu-content hidden">
      `;

      p.thirumozhis.forEach(t => {

        html += `
          <div class="thirumozhi"
            onclick='openThirumozhi(${section.section_id}, ${JSON.stringify(p.label)}, ${JSON.stringify(t.heading)})'>
            ${t.subunit_label} - ${t.heading}
          </div>
        `;
      });

      html += `</div></div>`;
    });

    // ================= DIRECT THIRUMOZHI =================
    section.direct_thirumozhis.forEach(t => {

      html += `
        <div class="thirumozhi"
          onclick='openDirectThirumozhi(${section.section_id}, ${JSON.stringify(t.heading)})'>
          ${t.label}
        </div>
      `;
    });

    html += `</div></div>`;
  });

  html += `</div>`;

  return html;
}


// ================= GROUPING =================
function groupBySection(rows) {

  const map = {};

  rows.forEach(row => {

    if (!map[row.section_id]) {
      map[row.section_id] = {
        section_id: row.section_id,
        label: "",
        pathu_groups: [],
        direct_thirumozhis: []
      };
    }

    const section = map[row.section_id];

    // =========================
// 🔥 SECTION NAME (FINAL FIX)
// =========================

// 1. Use section row if present
if (row.type === "section" && row.canonical_text) {
  section.label = row.canonical_text;
}

// 2. FINAL fallback ONLY from master map
if (!section.label) {
  section.label = SECTION_NAMES[row.section_id] || "";
}

    // =========================
    // 🔥 PATHU STRUCTURE
    // =========================
    if (row.type === "pathu") {

      let pathu = section.pathu_groups.find(p => p.label === row.pathu_name);

      if (!pathu) {
        pathu = {
          label: row.pathu_name,
          thirumozhis: []
        };
        section.pathu_groups.push(pathu);
      }

      pathu.thirumozhis.push({
        subunit_label: row.subunit_name,
        heading: row.thirumozhi_heading
      });
    }

    // =========================
    // 🔥 DIRECT THIRUMOZHI
    // =========================
    if (row.type === "thirumozhi") {
      section.direct_thirumozhis.push({
        heading: row.thirumozhi_heading,
        label: row.canonical_text
      });
    }

  });

  // 🔥 ensure correct order
  return Object.values(map).sort((a, b) => a.section_id - b.section_id);
}


// ================= HANDLERS =================

let currentOpenSection = null;
let currentOpenPathu = null;




window.openThirumozhi = function(sectionId, pathuName, heading) {

  const data = state.fullData.filter(p =>
    Number(p.section_id) === Number(sectionId) &&
    String(p.pathu_name).trim() === String(pathuName).trim() &&
    String(p.thirumozhi_heading).trim() === String(heading).trim()
  );

  state.pasuramData = data;
  state.filteredPasuram = data;
  state.level = "PASURAM";

  render();
};

window.openDirectThirumozhi = function(sectionId, heading) {

  const data = state.fullData.filter(p =>
    Number(p.section_id) === Number(sectionId) &&
    String(p.thirumozhi_heading).trim() === String(heading).trim()
  );

  state.pasuramData = data;
  state.filteredPasuram = data;
  state.level = "PASURAM";

  render();
};




window.toggle = function(id) {

  const el = document.getElementById(id);
  if (!el) return;

  // 🔥 get sectionId from id
  const sectionId = id.split("_")[1];

  // 🔴 close ALL in same section
  const all = document.querySelectorAll(`[id^="pathu_${sectionId}_"]`);

  all.forEach(p => p.classList.add("hidden"));

  // 🔴 if already open → keep closed
  if (!el.classList.contains("hidden")) {
    return;
  }

  // 🔥 open selected
  el.classList.remove("hidden");
};


window.togglePathu = function(sectionId, id) {

  try {
    const all = document.querySelectorAll(`[id^="pathu_${sectionId}_"]`);

    all.forEach(p => {
      p.style.display = "none";
    });

    const el = document.getElementById(id);
    if (!el) return;

    el.style.display = "block";

  } catch (e) {
    console.error("togglePathu error:", e);
  }
};


window.scrollToSection = function(sectionId) {

   // 🔥 ONLY SCROLL — NOTHING ELSE
  setTimeout(() => {
    const el = document.getElementById("section-" + sectionId);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      console.warn("Section not found:", sectionId);
    }
  }, 100);
};


window.handleSectionClick = function(sectionId) {

  const id = Number(sectionId);

  // 🔴 RECLICK → COLLAPSE
  if (currentOpenSection === id) {

    // remove inline menu if exists
    document.querySelectorAll(".inline-menu").forEach(el => el.remove());

    currentOpenSection = null;
    return;
  }

  // 🔥 NEW CLICK → CLOSE PREVIOUS
  document.querySelectorAll(".inline-menu").forEach(el => el.remove());

  currentOpenSection = id;

  // 🔥 SPECIAL SECTIONS → OPEN MENU ONLY
  if ([2,4,5,11,26].includes(id)) {
    toggleIndexOptions(id);
    return;
  }

  // 🔥 NORMAL SECTIONS → SCROLL
  scrollToSection(id);
};

window.toggleIndexOptions = function(sectionId) {

  // 🔥 remove any existing open menu
  document.querySelectorAll(".inline-menu").forEach(el => el.remove());

  // 🔥 find section container in index
  const container = document.querySelector(
    `[onclick="handleSectionClick(${sectionId})"]`
  )?.parentElement;

  if (!container) return;

  // 🔥 create menu
  const menu = document.createElement("div");
  menu.className = "inline-menu";
  menu.style.marginLeft = "15px";

menu.innerHTML = renderInlineOptions(sectionId, state.fullData);
container.appendChild(menu);
};

function buildInlineMenu(sectionId) {

  const rows = state.fullData || [];

  const filtered = rows.filter(r => Number(r.section_id) === Number(sectionId));

  let html = `
    <div class="option-item" onclick="scrollToSection(${sectionId})">
      ▶ Full Section
    </div>
  `;

  const pathuMap = {};

  filtered.forEach(r => {

    if (r.type === "pathu") {

      if (!pathuMap[r.pathu_name]) {
        pathuMap[r.pathu_name] = [];
      }

      pathuMap[r.pathu_name].push(r);
    }
  });

  // 🔥 PATHU BLOCK
  Object.entries(pathuMap).forEach(([name, list], i) => {

    html += `
  <div class="option-item"
       onclick='openPathuStart(${sectionId}, ${JSON.stringify(name)})'>
    ▶ ${name}
  </div>

  <div id="submenu-${sectionId}-${i}" style="display:none;margin-left:15px;">
`;

list.forEach(r => {
  html += `
    <div class="option-item"
         onclick='scrollToExactThirumozhi(${sectionId}, ${JSON.stringify(r.thirumozhi_heading)})'>
      ▶ ${(r.pathu_subunit_name || "")} - ${(r.thirumozhi_heading || "")}
    </div>
  `;
});

    html += `</div>`;
  });

  return html;
}


function renderInlinePathu(id) {

  const container = document.querySelector(
    `[onclick="toggleInline('${id}')"]`
  )?.parentElement;

  if (!container) return;

  const div = document.createElement("div");
  div.id = "pathu-" + id;
  div.style.marginLeft = "15px";

  // 🔥 build content from state.fullData (like modal logic)
  const [sectionId, index] = id.split("-");

  const data = state.fullData.filter(p =>
    Number(p.section_id) === Number(sectionId)
  );

  let html = "";

  data.forEach(p => {
    html += `<div class="option-item">${p.thirumozhi_heading}</div>`;
  });

  div.innerHTML = html;
  container.appendChild(div);
}

window.openPathuStart = function(sectionId, pathuName) {

  const data = state.fullData.filter(p =>
    Number(p.section_id) === Number(sectionId) &&
    String(p.pathu_name).trim() === String(pathuName).trim()
  );

  if (!data.length) return;

  const first = data[0];

  scrollToExactThirumozhi(
    sectionId,
    first.thirumozhi_heading
  );
};