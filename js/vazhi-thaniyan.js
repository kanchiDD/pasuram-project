// ═══════════════════════════════════════════════════════════
//  vazhi-thaniyan.js  —  Acharya Thaniyan & Vazhi renderer
// ═══════════════════════════════════════════════════════════

const VT_API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api/vazhi-thaniyan";

let vtData    = [];
let vtCurrent = 0;
let vtFontSize = 15;

// ── SCRIPT ("Read in") — the same "script" setting as the tree page and the
//    Sthothram page, so a choice made on any of them carries to the others.
//    Tamil sends no script param; the worker then reads nothing extra.
const VT_SCRIPTS = [
  { code: "ta",   label: "தமிழ்" },
  { code: "te",   label: "తెలుగు" },
  { code: "kn",   label: "ಕನ್ನಡ" },
  { code: "ml",   label: "മലയാളം" },
  { code: "deva", label: "देवनागरी" },
  { code: "gu",   label: "ગુજરાતી" },
  { code: "bn",   label: "বাংলা" },
  { code: "iast", label: "Roman" }
];
const VT_VALID = ["te", "ml", "kn", "deva", "iast", "gu", "bn"];
// Section headings: தனியன், வாழித்திருநாமம், நாள்பாட்டு, தொங்கல், திருநக்ஷத்திரம்
// (made with transliterate_db.py, same sound rules as the text)
const VT_LABELS = {
  ta:   ["தனியன்", "வாழித்திருநாமம்", "நாள்பாட்டு", "தொங்கல்", "திருநக்ஷத்திரம்"],
  te:   ["తనియన్", "వాఴిత్తిరునామం", "నాళ్బాట్టు", "తొంగల్", "తిరునక్షత్తిరం"],
  kn:   ["ತನಿಯನ್", "ವಾೞಿತ್ತಿರುನಾಮಂ", "ನಾಳ್ಬಾಟ್ಟು", "ತೊಂಗಲ್", "ತಿರುನಕ್ಷತ್ತಿರಂ"],
  ml:   ["തനിയൻ", "വാഴിത്തിരുനാമം", "നാൾബാട്ടു", "തൊംഗൽ", "തിരുനക്ഷത്തിരം"],
  deva: ["तनियन्", "वाऴित्तिरुनामम्", "नाळ्बाट्टु", "तॊङ्गल्", "तिरुनक्षत्तिरम्"],
  iast: ["taniyan", "vāḻittirunāmam", "nāl̤bāṭṭu", "tŏṅgal", "tirunakṣattiram"],
  gu:   ["તનિયન્", "વાળ઼િત્તિરુનામમ્", "નાળ્બાટ્ટુ", "તોઙ્ગલ્", "તિરુનક્ષત્તિરમ્"],
  bn:   ["তনিয়ন্", "বাষ়িত্তিরুনামম্", "নাল়্বাট্টু", "তোঙ্গল্", "তিরুনক্ষত্তিরম্"]
};
// "Noto Sans" after each script font so the Tamil subscript digits always render.
const VT_FONT = {
  ta:   '"Noto Sans Tamil","Noto Sans","Latha",sans-serif',
  deva: '"Noto Sans Devanagari","Noto Sans","Mangal",sans-serif',
  te:   '"Noto Sans Telugu","Noto Sans",sans-serif',
  kn:   '"Noto Sans Kannada","Noto Sans",sans-serif',
  ml:   '"Noto Sans Malayalam","Noto Sans",sans-serif',
  bn:   '"Noto Sans Bengali","Noto Sans",sans-serif',
  gu:   '"Noto Sans Gujarati","Noto Sans",sans-serif',
  iast: '"Noto Sans",sans-serif'
};
const VT_GFONT = {
  ta: "Noto+Sans+Tamil", deva: "Noto+Sans+Devanagari", te: "Noto+Sans+Telugu",
  kn: "Noto+Sans+Kannada", ml: "Noto+Sans+Malayalam", bn: "Noto+Sans+Bengali",
  gu: "Noto+Sans+Gujarati", iast: "Noto+Sans"
};

function vtGetScript() {
  let s = "ta";
  try { s = (localStorage.getItem("script") || "ta").toLowerCase(); } catch (e) {}
  return VT_VALID.includes(s) ? s : "ta";
}
function vtSetScript(s) {
  try {
    if (s && s !== "ta" && VT_VALID.includes(s)) localStorage.setItem("script", s);
    else localStorage.removeItem("script");
  } catch (e) {}
}
function vtLoadFont(sc) {
  [sc, "iast"].forEach(k => {
    const id = "gfont-vt-" + k;
    if (!VT_GFONT[k] || document.getElementById(id)) return;
    const lk = document.createElement("link");
    lk.id = id; lk.rel = "stylesheet";
    lk.href = "https://fonts.googleapis.com/css2?family=" + VT_GFONT[k] + ":wght@400;700&display=swap";
    document.head.appendChild(lk);
  });
  const wrap = document.querySelector(".vt-wrap");
  if (wrap) wrap.style.fontFamily = VT_FONT[sc] || VT_FONT.ta;
}
function vtDrawScripts() {
  const box = document.getElementById("vtScripts");
  if (!box) return;
  const cur = vtGetScript();
  box.innerHTML = '<span class="vt-read">Read in:</span>' + VT_SCRIPTS.map(s =>
    `<button type="button" class="vt-sc${s.code === cur ? " on" : ""}" data-sc="${s.code}">${s.label}</button>`
  ).join("");
  box.querySelectorAll(".vt-sc").forEach(b => b.onclick = () => {
    if (b.dataset.sc === vtGetScript()) return;
    vtSetScript(b.dataset.sc);
    vtCurrent = 0;
    const trigger = document.getElementById("vtDropdownTrigger");
    if (trigger) trigger.textContent = "— Select —";
    loadVazhiThaniyan();
  });
}
function vtL(i) { return (VT_LABELS[vtGetScript()] || VT_LABELS.ta)[i]; }

async function loadVazhiThaniyan() {
  const sc = vtGetScript();
  vtDrawScripts();
  vtLoadFont(sc);
  try {
    const res = await fetch(VT_API + (sc !== "ta" ? "?script=" + sc : ""), { cache: "no-store" });
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
      <div class="vt-section-title">${vtL(0)}</div>
      ${a.thaniyans.map((t, ti) =>
        `<div class="vt-item">${esc(t.lines.join("\n"))}</div>` +
        (ti < a.thaniyans.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  // Vazhi Thirunamam
  if (a.vazhis && a.vazhis.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">${vtL(1)}</div>
      ${a.vazhis.map((v, vi) =>
        `<div class="vt-item">${esc(v.lines.join("\n"))}</div>` +
        (vi < a.vazhis.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  // Naalpattu
  if (a.naalpattu && a.naalpattu.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">${vtL(2)}</div>
      ${a.naalpattu.map((n, ni) =>
        `<div class="vt-item">${esc(n.lines.join("\n"))}</div>` +
        (ni < a.naalpattu.length - 1 ? '<div class="vt-item-sep"></div>' : "")
      ).join("")}
    </div>`;
  }

  // Thongal
  if (a.thongal && a.thongal.length) {
    sections += `<div class="vt-section">
      <div class="vt-section-title">${vtL(3)}</div>
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
      ${birth ? `<div class="vt-birth-info">${vtL(4)} &nbsp;|&nbsp; ${birth}</div>` : ""}
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