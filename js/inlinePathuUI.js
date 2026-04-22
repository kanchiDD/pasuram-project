import { scrollToExactThirumozhi } from "./scrollManager.js";
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


export function renderInlineOptions(sectionId, anchorRows) {

  const rows = anchorRows.filter(
  r => Number(r.section_id) === Number(sectionId)
)

  const pathuMap = {};
  const standalone = [];

  rows.forEach(r => {

    if (r.type === "pathu") {

      if (!pathuMap[r.pathu_name]) {
        pathuMap[r.pathu_name] = [];
      }

      pathuMap[r.pathu_name].push({
      sub: r.pathu_subunit_name || r.subunit_name, // 🔥 FIX
      heading: r.thirumozhi_heading,
      id: r.id
      });
    }

    if (r.type === "thirumozhi") {
      standalone.push({
        sub: r.subunit_name,
        heading: r.thirumozhi_heading,
        id: r.id
      });
    }

  });

  let html = `<div class="inline-options">`;

  // =========================
  // 🔥 FULL SECTION
  // =========================
  html += `
    <div class="option-item" onclick="event.stopPropagation(); scrollToSection(${sectionId})">
      ▶ Full Section
    </div>
  `;

  // =========================
// 🔥 PATHU MODE
// =========================
const isPathuSection = [2, 11, 26].includes(Number(sectionId));

if (isPathuSection) {

  Object.entries(pathuMap).forEach(([pathuName, list], i) => {

    const pathuId = `${sectionId}-${i}`;

    html += `
      <div class="option-item" onclick="toggleInline('${pathuId}')">
        ▶ ${getPathuShortName(pathuName)}
      </div>

      <div id="pathu-${pathuId}" class="pathu-block">

        <!-- ✅ FULL PATHU (KEEP SECTION SCROLL) -->
        <div class="option-item"
             onclick="event.stopPropagation(); openPathuStart(${sectionId}, '${pathuName}')">
          ▶ Full ${getPathuShortName(pathuName)}
        </div>
    `;

    list.forEach(t => {

      const pathuShort = getPathuShortName(pathuName || "");

      const subText = t.sub || t.subunit_name || "";
      const num = getTamilNumber(subText);
      const heading = t.heading || "";

      const unitWord =
        Number(sectionId) === 26 ? "திருவாய்மொழி" : "திருமொழி";

      const displayText =
        `${pathuShort} - ${num ? num + "ம் " + unitWord : subText} - ${heading}`;

      html += `
        <div class="option-item"
             onclick="event.stopPropagation(); window.scrollToExactThirumozhi(${sectionId}, '${heading}')">
          ▶ ${displayText}
        </div>
      `;
    });

    html += `</div>`;
  });

}

 // =========================
// 🔥 STANDALONE
// =========================
else {

  standalone.forEach(t => {
const heading = t.heading || "";  // 🔥 MUST EXIST


    html += `
      <div class="option-item"
           onclick="event.stopPropagation(); window.scrollToExactThirumozhi(${sectionId}, '${heading}')">
        ▶ ${t.sub} - ${t.heading}
      </div>
    `;
  });

}

window.toggleInline = function(id) {

  const target = document.getElementById("pathu-" + id);
  if (!target) return;

  const isOpen = target.classList.contains("active");

  // 🔴 close ALL pathu blocks
  document.querySelectorAll(".pathu-block").forEach(el => {
    el.classList.remove("active");
  });

  // 🔴 open only if it was closed
  if (!isOpen) {
    target.classList.add("active");
  }
};

html += `</div>`;
return html;
}

window.openPathuStart = function(sectionId, pathuName) {

  const data = window.fullAnchorRows || [];

  const filtered = data.filter(p =>
    Number(p.section_id) === Number(sectionId) &&
    String(p.pathu_name).trim() === String(pathuName).trim()
  );

  if (!filtered.length) {
    console.warn("❌ No pathu data");
    return;
  }

  const first = filtered[0];

  const safeHeading = String(first.thirumozhi_heading)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

  const id = `thiru-${sectionId}-${safeHeading}`;

  const el = document.getElementById(id);

  if (!el) {
    console.warn("❌ Element not found:", id);
    return;
  }

  el.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};