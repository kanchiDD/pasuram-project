// ═══════════════════════════════════════════════════════════
//  vazhi-thaniyan.js  —  Acharya Thaniyan & Vazhi renderer
// ═══════════════════════════════════════════════════════════

const VT_API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/vazhi-thaniyan";

let vtData    = [];
let vtCurrent = 0;
let vtFontSize = 15;

async function loadVazhiThaniyan() {
  try {
    const res = await fetch(VT_API, { cache: "no-store" });
    if (!res.ok) throw new Error("API error " + res.status);
    vtData = await res.json();
    buildDropdown();
    renderCards();
  } catch (e) {
    console.error("[VT]", e);
    document.getElementById("vtCards").innerHTML =
      '<div class="vt-loading" style="color:red">Failed to load. Please try again.</div>';
  }
}

// ── CUSTOM DROPDOWN (replaces native <select> for mobile font control) ──
function buildDropdown() {
  const list = document.getElementById("vtDropdownList");
  list.innerHTML = vtData.map((a, i) =>
    `<div class="vt-dd-item" data-idx="${i}" onclick="vtJumpTo(${i})">${i + 1}. ${esc(a.canonical_name)}</div>`
  ).join("");
}

window.vtToggleDropdown = function () {
  document.getElementById("vtDropdown").classList.toggle("open");
};

// Close dropdown when clicking outside
document.addEventListener("click", function (e) {
  const dd = document.getElementById("vtDropdown");
  if (dd && !dd.contains(e.target)) dd.classList.remove("open");
});

window.vtJumpTo = function (idx) {
  if (idx === "" || idx === undefined) return;
  vtCurrent = Number(idx);
  const a = vtData[vtCurrent];
  if (!a) return;

  // Update trigger text and close dropdown
  const trigger = document.getElementById("vtDropdownTrigger");
  if (trigger) trigger.textContent = (vtCurrent + 1) + ". " + a.canonical_name;
  document.getElementById("vtDropdown")?.classList.remove("open");

  // Mark selected item
  document.querySelectorAll(".vt-dd-item").forEach(el => {
    el.classList.toggle("selected", Number(el.dataset.idx) === vtCurrent);
  });

  const el = document.getElementById("acharya-" + a.acharya_id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ── CARDS ────────────────────────────────────────────────────
function renderCards() {
  const container = document.getElementById("vtCards");
  if (!vtData.length) {
    container.innerHTML = '<div class="vt-loading">No data found.</div>';
    return;
  }
  container.innerHTML = vtData.map((a, i) => renderCard(a, i)).join("");
}

function renderCard(a, i) {
  const birth = [a.tamil_month, a.star].filter(Boolean).join(" • ");

  let sections = "";

  // Thaniyan — one heading, multiple items separated by blank space
  if (a.thaniyans && a.thaniyans.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">தனியன்</div>
      ${a.thaniyans.map((t, ti) =>
        `<div class="vt-item">${esc(t.lines.join("\n"))}</div>` +
        (ti < a.thaniyans.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  // Vazhi Thirunamam
  if (a.vazhis && a.vazhis.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">வாழித்திருநாமம்</div>
      ${a.vazhis.map((v, vi) =>
        `<div class="vt-item">${esc(v.lines.join("\n"))}</div>` +
        (vi < a.vazhis.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  // Naalpattu
  if (a.naalpattu && a.naalpattu.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">நாள்பாட்டு</div>
      ${a.naalpattu.map((n, ni) =>
        `<div class="vt-item">${esc(n.lines.join("\n"))}</div>` +
        (ni < a.naalpattu.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  // Thongal
  if (a.thongal && a.thongal.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">தொங்கல்</div>
      ${a.thongal.map((t, ti) =>
        `<div class="vt-item">${esc(t.lines.join("\n"))}</div>` +
        (ti < a.thongal.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  if (!sections) return "";

  return `
    <div class="vt-card" id="acharya-${a.acharya_id}" data-idx="${i}">
      <div class="vt-acharya-name">${i + 1}. ${a.canonical_name}</div>
      ${birth ? `<div class="vt-birth-info">திருநக்ஷத்திரம் &nbsp;|&nbsp; ${birth}</div>` : ""}
      ${sections}
    </div>
  `;
}

function esc(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── PREV / NEXT ───────────────────────────────────────────────
window.vtPrev = function () {
  if (!vtData.length) return;
  vtCurrent = (vtCurrent - 1 + vtData.length) % vtData.length;
  syncDropdown();
  scrollToCard(vtCurrent);
};

window.vtNext = function () {
  if (!vtData.length) return;
  vtCurrent = (vtCurrent + 1) % vtData.length;
  syncDropdown();
  scrollToCard(vtCurrent);
};

function syncDropdown() {
  const a = vtData[vtCurrent];
  if (!a) return;
  const trigger = document.getElementById("vtDropdownTrigger");
  if (trigger) trigger.textContent = (vtCurrent + 1) + ". " + a.canonical_name;
  document.querySelectorAll(".vt-dd-item").forEach(el => {
    el.classList.toggle("selected", Number(el.dataset.idx) === vtCurrent);
  });
}

function scrollToCard(idx) {
  const a = vtData[idx];
  if (!a) return;
  const el = document.getElementById("acharya-" + a.acharya_id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── FONT SIZE ─────────────────────────────────────────────────
window.vtFont = function (delta) {
  vtFontSize = Math.min(24, Math.max(12, vtFontSize + delta));
  document.querySelectorAll(".vt-item").forEach(el => {
    el.style.fontSize = vtFontSize + "px";
  });
};