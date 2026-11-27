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
// Section headings: தனியன், வாழித்திருநாமம், நாள்பாட்டு, தொங்கல், திருநக்ஷத்திரம்;
// then the two tabs (ஆசார்ய பரம்பரை, வானமாமலை மடம்) and பட்டம்;
// then the two Vadakalai sub-headings (ஆண்டவன் ஆஶ்ரமம் / அஹோபில மடம் வாழித் திருநாமங்கள்)
// (made with transliterate_db.py, same sound rules as the text)
const VT_LABELS = {
  ta:   ["தனியன்", "வாழித்திருநாமம்", "நாள்பாட்டு", "தொங்கல்", "திருநக்ஷத்திரம்", "ஆசார்ய பரம்பரை", "வானமாமலை மடம்", "பட்டம்", "ஆண்டவன் ஆஶ்ரமம் வாழித் திருநாமங்கள்", "அஹோபில மடம் வாழித் திருநாமங்கள்"],
  te:   ["తనియన్", "వాఴిత్తిరునామం", "నాళ్బాట్టు", "తొంగల్", "తిరునక్షత్తిరం", "ఆచార్య పరంబరై", "వానమామలై మడం", "పట్టం", "ఆండవన్ ఆశ్రమం వాఴిత్ తిరునామంగళ్", "అహోబిల మడం వాఴిత్ తిరునామంగళ్"],
  kn:   ["ತನಿಯನ್", "ವಾೞಿತ್ತಿರುನಾಮಂ", "ನಾಳ್ಬಾಟ್ಟು", "ತೊಂಗಲ್", "ತಿರುನಕ್ಷತ್ತಿರಂ", "ಆಚಾರ್ಯ ಪರಂಬರೈ", "ವಾನಮಾಮಲೈ ಮಡಂ", "ಪಟ್ಟಂ", "ಆಂಡವನ್ ಆಶ್ರಮಂ ವಾೞಿತ್ ತಿರುನಾಮಂಗಳ್", "ಅಹೋಬಿಲ ಮಡಂ ವಾೞಿತ್ ತಿರುನಾಮಂಗಳ್"],
  ml:   ["തനിയൻ", "വാഴിത്തിരുനാമം", "നാൾബാട്ടു", "തൊംഗൽ", "തിരുനക്ഷത്തിരം", "ആചാര്യ പരംബരൈ", "വാനമാമലൈ മഡം", "പട്ടം", "ആണ്ഡവൻ ആശ്രമം വാഴിത് തിരുനാമംഗൾ", "അഹോബില മഡം വാഴിത് തിരുനാമംഗൾ"],
  deva: ["तनियन्", "वाऴित्तिरुनामम्", "नाळ्बाट्टु", "तॊङ्गल्", "तिरुनक्षत्तिरम्", "आचार्य परम्बरै", "वानमामलै मडम्", "पट्टम्", "आण्डवन् आश्रमम् वाऴित् तिरुनामङ्गळ्", "अहोबिल मडम् वाऴित् तिरुनामङ्गळ्"],
  iast: ["taniyan", "vāḻittirunāmam", "nāl̤bāṭṭu", "tŏṅgal", "tirunakṣattiram", "ācārya parambarai", "vānamāmalai maḍam", "paṭṭam", "āṇḍavan āśramam vāḻit tirunāmaṅgal̤", "ahobila maḍam vāḻit tirunāmaṅgal̤"],
  gu:   ["તનિયન્", "વાળ઼િત્તિરુનામમ્", "નાળ્બાટ્ટુ", "તોઙ્ગલ્", "તિરુનક્ષત્તિરમ્", "આચાર્ય પરમ્બરૈ", "વાનમામલૈ મડમ્", "પટ્ટમ્", "આણ્ડવન્ આશ્રમમ્ વાળ઼િત્ તિરુનામઙ્ગળ્", "અહોબિલ મડમ્ વાળ઼િત્ તિરુનામઙ્ગળ્"],
  bn:   ["তনিয়ন্", "বাষ়িত্তিরুনামম্", "নাল়্বাট্টু", "তোঙ্গল্", "তিরুনক্ষত্তিরম্", "আচার্য পরম্বরৈ", "বানমামলৈ মডম্", "পট্টম্", "আণ্ডবন্ আশ্রমম্ বাষ়িৎ তিরুনামঙ্গল়্", "অহোবিল মডম্ বাষ়িৎ তিরুনামঙ্গল়্"]
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

// ── LINEAGE TABS: main guru parampara | Vanamamalai mutt (Tenkalai only) ──
function vtSect() {
  try { return localStorage.getItem("sect") === "V" ? "V" : "T"; } catch (e) { return "T"; }
}
function vtGetLineage() {
  if (vtSect() !== "T") return "";
  try { return localStorage.getItem("vt_lineage") === "VMM" ? "VMM" : ""; } catch (e) { return ""; }
}
function vtSetLineage(l) {
  try { if (l === "VMM") localStorage.setItem("vt_lineage", "VMM"); else localStorage.removeItem("vt_lineage"); } catch (e) {}
}
function vtDrawTabs() {
  const box = document.getElementById("vtTabs");
  if (!box) return;
  if (vtSect() !== "T") { box.innerHTML = ""; box.hidden = true; return; }
  box.hidden = false;
  const cur = vtGetLineage();
  box.innerHTML =
    `<button type="button" class="vt-tab${cur === "" ? " on" : ""}" data-l="">${vtL(5)}</button>` +
    `<button type="button" class="vt-tab${cur === "VMM" ? " on" : ""}" data-l="VMM">${vtL(6)}</button>`;
  box.querySelectorAll(".vt-tab").forEach(b => b.onclick = () => vtSwitchLineage(b.dataset.l));
}
window.vtSwitchLineage = function (l) {
  if (l === vtGetLineage()) return;
  vtSetLineage(l);
  vtCurrent = 0;
  const trigger = document.getElementById("vtDropdownTrigger");
  if (trigger) trigger.textContent = "— Select —";
  window.scrollTo({ top: 0, behavior: "smooth" });
  loadVazhiThaniyan();
};
// Card / dropdown title: "1. name" in the main list; "1ம் பட்டம் · name" in the mutt list.
// In the Vadakalai list the numbering starts again at 1 under each sub-heading (a._n, set in vtNumber).
function vtTitle(a, i) {
  if (vtGetLineage() && a.pattam_no) {
    const p = vtGetScript() === "ta" ? `${a.pattam_no}ம் ${vtL(7)}` : `${vtL(7)} ${a.pattam_no}`;
    return `${p} · ${a.canonical_name}`;
  }
  if (vtGetLineage()) return a.canonical_name;
  return `${a._n || i + 1}. ${a.canonical_name}`;
}

// ── VADAKALAI SUB-GROUPS: AA = Andavan Ashramam, AM = Ahobila Madam (the worker sends
//    them after the common list, with a.lineage set). Heading text by group:
const VT_GROUP_LABEL = { AA: 8, AM: 9 };
function vtGroupHead(a, prev) {
  const g = a.lineage || "";
  if (!VT_GROUP_LABEL[g] || (prev && (prev.lineage || "") === g)) return "";
  return vtL(VT_GROUP_LABEL[g]);
}
function vtNumber() {
  let n = 0, g = null;
  vtData.forEach(a => {
    const cur = a.lineage || "";
    if (cur !== g) { n = 0; g = cur; }
    a._n = ++n;
  });
}
(function vtGroupStyle() {
  if (document.getElementById("vt-group-css")) return;
  const st = document.createElement("style");
  st.id = "vt-group-css";
  st.textContent =
    ".vt-group-head{margin:8px 0 18px;padding:10px 12px;border-radius:10px;background:#7a4d00;color:#fff;" +
    "font-weight:bold;font-size:1.05rem;text-align:center;line-height:1.5}" +
    ".vt-dd-head{padding:8px 12px;font-size:13px;font-weight:bold;color:#fff;background:#7a4d00;cursor:default}" +
    "@media (max-width:480px){.vt-group-head{font-size:.95rem}}";
  document.head.appendChild(st);
})();

async function loadVazhiThaniyan() {
  const sc = vtGetScript();
  const lin = vtGetLineage();
  vtDrawScripts();
  vtDrawTabs();
  vtLoadFont(sc);
  try {
    const qs = [sc !== "ta" ? "script=" + sc : "", lin ? "lineage=" + lin : ""].filter(Boolean).join("&");
    const res = await fetch(VT_API + (qs ? "?" + qs : ""), { cache: "no-store" });
    if (!res.ok) throw new Error("API error " + res.status);
    vtData = await res.json();
    vtNumber();
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
  list.innerHTML = vtData.map((a, i) => {
    const h = vtGroupHead(a, vtData[i - 1]);
    return (h ? `<div class="vt-dd-head">${esc(h)}</div>` : "") +
      `<div class="vt-dd-item" data-idx="${i}" onclick="vtJumpTo(${i})">${esc(vtTitle(a, i))}</div>`;
  }).join("");
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
  if (trigger) trigger.textContent = vtTitle(a, vtCurrent);
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
  container.innerHTML = vtData.map((a, i) => {
    const h = vtGroupHead(a, vtData[i - 1]);
    return (h ? `<div class="vt-group-head">${esc(h)}</div>` : "") + renderCard(a, i);
  }).join("");
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
      <div class="vt-acharya-name">${esc(vtTitle(a, i))}</div>
      ${a.alias_name ? `<div class="vt-alias${vtIsLatest(a) ? " now" : ""}">${esc(a.alias_name)}</div>` : ""}
      ${birth ? `<div class="vt-birth-info">${vtL(4)} &nbsp;|&nbsp; ${birth}</div>` : ""}
      ${sections}
      ${a.see_lineage === "VMM" && vtSect() === "T"
        ? `<button type="button" class="vt-see" onclick="vtSwitchLineage('VMM')">${vtL(6)} →</button>` : ""}
    </div>
  `;
}

// The present jeeyar = highest pattam in the mutt list (his alias line shows as a tag)
function vtIsLatest(a) {
  if (!vtGetLineage() || !a.pattam_no) return false;
  return a.pattam_no === Math.max(...vtData.map(x => x.pattam_no || 0));
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
  if (trigger) trigger.textContent = vtTitle(a, vtCurrent);
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