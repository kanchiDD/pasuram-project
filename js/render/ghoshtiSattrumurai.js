// ═══════════════════════════════════════════════════════════════════
//  ghoshtiSattrumurai.js  (v2 — revised simplified design)
//
//  1. Thiruppavai sattrumurai (502/503) — always first
//  2. For each selected section (canonical order), show that section's
//     (or pathu's) sattrumurai pasurams as ACTUAL TEXT with checkboxes.
//     Dual-recital pasurams prefixed with "**", single ones no symbol.
//  3. Section 26 -> if 10th pathu selected, also show section 10
//     (Kanninun Siruthambu) special sequence.
//  4. After all sections: Ramanusa Nootrandhadhi (optional) -> Pallandu
//     (always) -> Upadesa Rathinamalai (optional) -> Thiruvaimozhi
//     Nootrandhadhi (optional)
//  5. Fixed text: pothu saatru / iyal saatru -- shown as toggles
//  6. Vazhi Thirunamam -- heading checkboxes, multi-select
//  7. "Add my Sattrumurai" -- compiles + appends to ghoshti, saves
// ═══════════════════════════════════════════════════════════════════

import { getUserSect, VAZHI_GHOSHTI_ALL, FIXED_DEFS_GHOSHTI, getDefaultFixedTextState } from "../utils/sectUtils.js";

const WORKER_GET = "https://cacheproxy.kanchitrust.workers.dev";
const WORKER_POST = "https://recitalworker.kanchitrust.workers.dev";

const SATTRUMURAI_PASURAMS = {
  // Section 3 — Thiruppavai (always first)
  thiruppavai: { dual: [502, 503], single: [] },

  // Section 2 — Periyazhwar Thirumozhi (by pathu)
  "2_1": { dual: [116, 117], single: [] },
  "2_2": { dual: [221, 222], single: [] },
  "2_3": { dual: [326, 327], single: [] },
  "2_4": { dual: [431, 432], single: [] },
  "2_5": { dual: [472, 473], single: [] },

  // Section 4 — Nachiyar Thirumozhi
  "4": { dual: [645, 646], single: [] },

  // Section 5 — Perumal Thirumozhi
  "5": { dual: [750, 751], single: [] },

  // Section 6 — Thiruchandavirutham
  "6": { dual: [870, 871], single: [] },

  // Section 7 — Thirumaalai
  "7": { dual: [915, 916], single: [] },

  // Section 9 — Amalanathipiran
  "9": { dual: [935, 936], single: [] },

  // Section 11 — Periya Thirumozhi (by pathu)
  "11_1":  { dual: [1046, 1047], single: [] },
  "11_2":  { dual: [1146, 1147], single: [] },
  "11_3":  { dual: [1246, 1247], single: [] },
  "11_4":  { dual: [1346, 1347], single: [] },
  "11_5":  { dual: [1446, 1447], single: [] },
  "11_6":  { dual: [1546, 1547], single: [] },
  "11_7":  { dual: [1646, 1647], single: [] },
  "11_8":  { dual: [1746, 1747], single: [] },
  "11_9":  { dual: [1846, 1847], single: [] },
  "11_10": { dual: [1950, 1951], single: [] },
  "11_11": { dual: [2030, 2031], single: [], optional: [2029] },

  // Section 12 — Thirukurunthandakam
  "12": { dual: [2050, 2051], single: [] },

  // Section 13 — Thirunedum Thandakam
  "13": { dual: [2080, 2081], single: [] },

  // Section 14 — Mudal Thiruvandadhi (dual first, then single)
  "14": { dual: [2180, 2181], single: [2082] },

  // Section 15 — Irandaam Thiruvandadhi
  "15": { dual: [2280, 2281], single: [2182] },

  // Section 16 — Moonraam Thiruvandadhi
  "16": { dual: [2380, 2381], single: [2282] },

  // Section 17 — Naanmugan Thiruvandadhi
  "17": { dual: [2476, 2477], single: [2382] },

  // Section 18 — Thiruvirutham
  "18": { dual: [2576, 2577], single: [2478] },

  // Section 20 — Periya Thiruvandadhi
  "20": { dual: [2670, 2671], single: [2585] },

  // Section 26 — Thiruvaimozhi (by pathu) — VERIFIED correct global_nos
  "26_1":  { dual: [2783, 2784], single: [] },
  "26_2":  { dual: [2895, 2896], single: [] },
  "26_3":  { dual: [3005, 3006], single: [] },
  "26_4":  { dual: [3115, 3116], single: [] },
  "26_5":  { dual: [3225, 3226], single: [] },
  "26_6":  { dual: [3335, 3336], single: [] },
  "26_7":  { dual: [3445, 3446], single: [] },
  "26_8":  { dual: [3555, 3556], single: [] },
  "26_9":  { dual: [3665, 3666], single: [] },
  "26_10": { dual: [3775, 3776], single: [2675] },
};

const NO_SATTRUMURAI = new Set([8, 19, 21]); // 22/23 handled separately via madal tables

const PATHU_NAMES = {
  1: "முதல் பத்து", 2: "இரண்டாம் பத்து", 3: "மூன்றாம் பத்து",
  4: "நான்காம் பத்து", 5: "ஐந்தாம் பத்து", 6: "ஆறாம் பத்து",
  7: "ஏழாம் பத்து", 8: "எட்டாம் பத்து", 9: "ஒன்பதாம் பத்து",
  10: "பத்தாம் பத்து", 11: "பதினொன்றாம் பத்து"
};

const SECTION_NAMES = {
  2: "பெரியாழ்வார் திருமொழி", 3: "திருப்பாவை", 4: "நாச்சியார் திருமொழி",
  5: "பெருமாள் திருமொழி", 6: "திருச்சந்தவிருத்தம்", 7: "திருமாலை",
  9: "அமலனாதிபிரான்", 10: "கண்ணிநுண்சிறுத்தாம்பு", 11: "பெரிய திருமொழி",
  12: "திருக்குறுந்தாண்டகம்", 13: "திருநெடுந்தாண்டகம்", 14: "முதல் திருவந்தாதி",
  15: "இரண்டாம் திருவந்தாதி", 16: "மூன்றாம் திருவந்தாதி", 17: "நான்முகன் திருவந்தாதி",
  18: "திருவிருத்தம்", 20: "பெரிய திருவந்தாதி",
  22: "சிறிய திருமடல்", 23: "பெரிய திருமடல்", 26: "திருவாய்மொழி"
};

// Maps section_id to explicit key
const EXPLICIT_SECTION_MAP = {
  24: "ramanusa", 25: "upadesa", 27: "thiruvaimozhi_nootrandhadhi",
  // Vadagalai (Desika Prabandham) sattrumurai items
  38: "adaikkalappathu", 33: "adhikara_sangraham",
  49: "prabandha_saram", 51: "pillaiyandhadhi",
  52: "adivan_adaikkalappathu", 53: "lakshmi_adaikkalappathu"
};

const EXPLICIT_SECTIONS = [
  {
    key: "ramanusa", label: "இராமானுச நூற்றந்தாதி",
    section_id: 24, sect: "B", beforePallandu: true,
    pasurams: [
      { no: 24106, dual: true },
      { no: 24107, dual: true },
      { no: 24108, dual: true },
      { no: 24001, dual: false },
    ]
  },
  {
    key: "upadesa", label: "உபதேசரத்தினமாலை",
    section_id: 25, sect: "T", beforePallandu: false,
    pasurams: [
      { no: 25072, dual: true },
      { no: 25073, dual: true },
      { no: 25074, dual: false },
    ]
  },
  {
    key: "thiruvaimozhi_nootrandhadhi", label: "திருவாய்மொழி நூற்றந்தாதி",
    section_id: 27, sect: "T", beforePallandu: false,
    pasurams: [
      { no: 27099, dual: true },
      { no: 27100, dual: true },
      { no: 27001, dual: false },
    ]
  },
  // ── Vadagalai sattrumurai (Desika Prabandham) ──
  // Array order IS the render order: after pallandu, following any
  // selected Thenkalai items above (upadesa etc.), per sect-mix rule.
  // All pasurams dual recital (** marker).
  {
    key: "adaikkalappathu", label: "அடைக்கலப்பத்து",
    section_id: 38, sect: "V", beforePallandu: false,
    pasurams: [
      { no: 38010, dual: true },
      { no: 38011, dual: true },
    ]
  },
  {
    key: "adhikara_sangraham", label: "அதிகாரசங்கிரகம்",
    section_id: 33, sect: "V", beforePallandu: false,
    pasurams: [
      { no: 33055, dual: true },
      { no: 33056, dual: true },
    ]
  },
  {
    key: "prabandha_saram", label: "ப்ரபந்தசாரம்",
    section_id: 49, sect: "V", beforePallandu: false,
    pasurams: [
      { no: 49017, dual: true },
      { no: 49018, dual: true },
    ]
  },
  {
    key: "pillaiyandhadhi", label: "பிள்ளையந்தாதி",
    section_id: 51, sect: "V", beforePallandu: false,
    pasurams: [
      { no: 51019, dual: true },
      { no: 51020, dual: true },
      { no: 51001, dual: false },
    ]
  },
  {
    key: "adivan_adaikkalappathu",
    label: "ஸ்ரீ ஆதிவண்ஶடகோப யதீந்த்ர மஹாதேஶிகன் அடைக்கலப்பத்து",
    section_id: 52, sect: "VM", beforePallandu: false,
    pasurams: [
      { no: 52010, dual: true },
      { no: 52011, dual: true },
      { no: 52001, dual: false },
    ]
  },
  {
    key: "lakshmi_adaikkalappathu",
    label: "ஶ்ரீ லக்ஷ்மீந்ரு’ஸிம்ஹன் அடைக்கலப்பத்து",
    section_id: 53, sect: "VM", beforePallandu: false,
    pasurams: [
      { no: 53010, dual: true },
      { no: 53011, dual: true },
    ]
  }
];

// ── Madam (Ahobila) ordering rule ─────────────────────────────
// For Madam users the Vadagalai additional prabandhams recite
// BEFORE Pallandu (after இராமானுச நூற்றந்தாதி), in array order:
// 38 → 33 → 49 → 51 → 52 → 53, then Pallandu, then sattrumurai.
// Thenkalai and plain Vadagalai keep the after-Pallandu placement.
const V_MADAM_KEYS = new Set([
  "adaikkalappathu", "adhikara_sangraham", "prabandha_saram",
  "pillaiyandhadhi", "adivan_adaikkalappathu", "lakshmi_adaikkalappathu"
]);
const isMadamUser = () => (localStorage.getItem("subsect") || "") === "madam";
// Madam ordering activates for Madam users OR when the Madam
// Arulicheyals (sections 52/53) are part of the ghoshti selection —
// reciting them implies the Madam sattrumurai order (per the
// confirmation shown at selection time).
// Madam ordering activates when the GHOSHTI's segment is Vadakalai-Madam,
// or when the Madam Arulicheyals (52/53) are in the selection. The user's own
// registration sect is intentionally ignored for ghoshti — only the 4-option
// segment decides.
function madamOrderActive() {
  if ((typeof gsatState !== "undefined" && gsatState.segment) === "VM") return true;
  const secs = (typeof gsatState !== "undefined" && gsatState.selectedSections) || [];
  return secs.some(id => Number(id) === 52 || Number(id) === 53);
}
function effBeforePallandu(sec) {
  // Madam order: after Ramanusa, ALL additional prabandhams (incl. 52/53) recite
  // BEFORE Pallandu, in array order (…52 → 53 last), then Pallandu comes last.
  return sec.beforePallandu || (madamOrderActive() && Number(sec.section_id) >= 32);
}

const PALLANDU = [
  { no: 1, dual: false },
  { no: 2, dual: false },
];

const SECTION10_SEQUENCE = [
  { type: "kanninun", label: "கண்ணிநுண்சிறுத்தாம்பு" },
  { no: 937, dual: true },  // 1st time
  
  { no: 946, dual: true  },  // 1st time
  
  { no: 947, dual: true  },  // 1st time
  { no: 937, dual: false },  // final time
];

function injectCSS() {
  if (document.getElementById("gsat-style")) return;
  const s = document.createElement("style");
  s.id = "gsat-style";
  s.textContent = `
    .gsat-wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 90px;
      font-family: "Noto Sans Tamil","Segoe UI",Arial,sans-serif; }
    .gsat-title { text-align: center; font-size: 20px; font-weight: 900; color: #4a2c00; margin-bottom: 4px; }
    .gsat-subtitle { text-align: center; font-size: 13px; color: #7a5a20; margin-bottom: 16px; }
    .gsat-divider { width: 60px; height: 2px; background: #C9A84C; margin: 0 auto 20px; }
    .gsat-section { background: #FFFDF7; border: 1.5px solid #E8D5A8; border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
    .gsat-section-head { background: #FFF4D6; padding: 10px 14px; font-size: 13px; font-weight: 700; color: #4a2c00; border-bottom: 1px solid #E8D5A8; }
    .gsat-pasuram-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #F5EDD5; }
    .gsat-pasuram-item:last-child { border-bottom: none; }
    .gsat-pasuram-item input[type="checkbox"] { width: 17px; height: 17px; accent-color: #7a4d00; flex-shrink: 0; margin-top: 2px; cursor: pointer; }
    .gsat-pasuram-text { flex: 1; font-size: 13px; color: #4a2c00; line-height: 1.6; }
    .gsat-pasuram-marker { font-weight: 900; color: #b38b2e; margin-right: 4px; }
    .gsat-pasuram-line { display: block; }
    .gsat-loading { text-align: center; padding: 40px 20px; color: #7a5a20; font-size: 13px; }
    .gsat-lotus { font-size: 36px; display: block; margin-bottom: 10px; animation: gsat-spin 1.6s linear infinite; }
    @keyframes gsat-spin { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
    .gsat-toggle-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-size: 13px; color: #4a2c00; border-bottom: 1px solid #F5EDD5; }
    .gsat-toggle-item:last-child { border-bottom: none; }
    .gsat-toggle-item input[type="checkbox"] { width: 17px; height: 17px; accent-color: #7a4d00; cursor: pointer; flex-shrink: 0; }
    .gsat-vazhi-grid { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
    .gsat-vazhi-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4a2c00; }
    .gsat-vazhi-item input[type="checkbox"] { width: 17px; height: 17px; accent-color: #7a4d00; cursor: pointer; flex-shrink: 0; }
    .gsat-save-btn { width: 100%; padding: 14px; background: #7a4d00; color: #fef0c0; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 10px; font-family: "Noto Sans Tamil","Segoe UI",Arial,sans-serif; }
    .gsat-save-btn:hover { background: #5a3a00; }
    .gsat-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .gsat-back { display: block; text-align: center; font-size: 12px; color: #7a5a20; text-decoration: underline; cursor: pointer; margin-top: 12px; }
    .gsat-empty-note { padding: 14px; font-size: 12px; color: #9a7a50; text-align: center; }
  `;
  document.head.appendChild(s);
}

let gsatState = {
  ghoshtiId: null,
  ghoshtiName: "",
  selectedSections: [],
  pasuramItems: [],
  explicitToggles: {},
  autoIncludedKeys: new Set(),
  fixedText: { pothu: true, iyal: false, muktaka: false, surnikai: false },
  fixedTextLines: {},
  selectedVaazhis: new Set(),
  vazhiLines: {},
  allVaazhis: [],
  fixedOrder: [2, 1],
};

export async function renderGhoshtiSattrumurai(container, ghoshtiId, ghoshtiMeta) {
  injectCSS();
  gsatState.ghoshtiId = ghoshtiId;
  gsatState.ghoshtiName = ghoshtiMeta?.name || "";
  gsatState.selectedSections = ghoshtiMeta?.sections || [];
  // Sampradaya segment for this ghoshti (drives vazhi + mangalam + section filtering)
  gsatState.segment = ghoshtiMeta?.segment || "BOTH";
  gsatState.pasuramItems = [];
  gsatState.explicitToggles = {};
  gsatState.autoIncludedKeys = new Set();
  gsatState.fixedText = getDefaultFixedTextState(); // shape + neutral defaults
  // Ghoshti IGNORES the user's registration sect — override the sect-dependent
  // defaults using ONLY the ghoshti segment. pothu + iyal saatru are common to
  // all; surnikai (Thirumangai) belongs to Thenkalai.
  {
    const seg = gsatState.segment;
    gsatState.fixedText.pothu    = true;
    gsatState.fixedText.iyal     = true;
    gsatState.fixedText.surnikai = (seg === "T" || seg === "BOTH");
  }
  gsatState.fixedTextLines = {};
  gsatState.vazhiLines = {};
  // Fixed saatru order by segment (fixed_id 2=iyal, 1=Thenkalai pothu, 5=Vadakalai pothu).
  // Iyal saatru is recited only in Thenkalai (and Both); Vadakalai/Madam omit it.
  gsatState.fixedOrder = gsatState.segment === "T"  ? [2, 1]
                       : gsatState.segment === "V"  ? [5]
                       : gsatState.segment === "VM" ? [5]
                       : [2, 1, 5]; // BOTH
  gsatState.selectedVaazhis = new Set();

  container.innerHTML = '<div class="gsat-loading"><span class="gsat-lotus">LOTUS</span>Preparing Sattrumurai...</div>'.replace('LOTUS','\uD83E\uDE77');

  // Vazhi list from sectUtils — includes all (T+V) for ghoshti
  // Ghoshti is multi-sect; user selects what they need
  gsatState.allVaazhis = VAZHI_GHOSHTI_ALL;

  // Mangalams default-checked per this ghoshti's segment:
  //   T → Mukthaka | V → Desika | VM → Desika + Adivan | BOTH → leave as-is
  {
    const seg = gsatState.segment;
    if (seg === "T")  { gsatState.fixedText.muktaka = true;  gsatState.fixedText.desika = false; gsatState.fixedText.adivan = false; }
    if (seg === "V")  { gsatState.fixedText.desika  = true;  gsatState.fixedText.adivan = false; gsatState.fixedText.muktaka = false; }
    if (seg === "VM") { gsatState.fixedText.desika  = true;  gsatState.fixedText.adivan = true;  gsatState.fixedText.muktaka = false; }
  }

  // Koil sattrumurai: koil children (from_koil) arrive as ghoshtiMeta.koil
  // { "11":[thirumozhi ids], "26":[thiruvaimozhi ids] }. Work out present + full/partial.
  gsatState.koil     = ghoshtiMeta?.koil || {};
  gsatState.koilInfo = await computeKoilInfo(gsatState.koil);

  const plan = buildSattrumuraiPlan(gsatState.selectedSections);
  await fetchAllPasuramTexts(plan);
  gsatState.pasuramItems = plan;

  // Default-checked mangalams need their lines pre-fetched (the
  // on-toggle fetch only fires on user interaction)
  for (const [flag, fid] of [["desika", 7], ["adivan", 6]]) {
    if (gsatState.fixedText[flag] && !gsatState.fixedTextLines[fid]) {
      try {
        const res  = await fetch(`${WORKER_POST}/recital/fixed-text?id=${fid}`);
        const data = await res.json();
        if (data.success) gsatState.fixedTextLines[fid] = data.lines;
      } catch (e) {}
    }
  }

  // Fixed text lines loaded on demand when user checks the checkbox
  // No pre-fetch — both T (id=1) and V (id=5) loaded only when selected

  render(container);
}

// Determine, per koil, whether any koil item is present and whether the FULL
// koil was selected (all members of the matching sect group) or only some.
async function computeKoilInfo(koil) {
  const check = async (sid, sub) => {
    const ids = ((koil && (koil[sid] || koil[String(sid)])) || []).map(Number);
    if (!ids.length) return { present: false, full: false };
    let full = false;
    try {
      const res  = await fetch(`${WORKER_GET}/api/koil-pathus?sub=${sub}&sect=ALL`);
      const data = await res.json();
      const groups = data.groups || {};
      // Selected ids belong to whichever sect group contains them; full = covers it all
      for (const gk of ["T", "V"]) {
        const g = (groups[gk] || []).map(p => Number(p.pathu_id));
        if (g.length && ids.every(id => g.includes(id))) {
          full = (new Set(ids).size === g.length);
          break;
        }
      }
    } catch (e) {}
    return { present: true, full };
  };
  return {
    thirumozhi:    await check(11, "THIRUMOZHI"),
    thiruvaimozhi: await check(26, "THIRUVAIMOZHI")
  };
}

function buildSattrumuraiPlan(sections) {
  const plan = [];

  pushPasuramGroup(plan, "thiruppavai", "திருப்பாவை சாற்றுமுறை பாசுரங்கள்", SATTRUMURAI_PASURAMS.thiruppavai);

  const bySection = {};
  sections.forEach(sel => {
    const sid = sel.section_id;
    if (NO_SATTRUMURAI.has(sid)) return;

    // Derive is_full and is_rettai from item fields — do not rely on caller setting them
    // Full section: entity_type=section or koil
    // Full pathu: entity_type=pathu AND pathu_id===null AND !is_child
    // Child thirumozhi: entity_type=pathu AND is_child=true — NOT eligible
    // Full rettai (section or full pathu): entity_type=rettai_group AND !is_child — eligible
    // Child rettai (single thirumozhi rettai): entity_type=rettai_group AND is_child=true — NOT eligible
    // Individual pasuram: entity_type=pasuram — NOT eligible
    const isFull = sel.entity_type === "section"
      || sel.entity_type === "koil"
      || (sel.entity_type === "pathu" && sel.pathu_id === null && !sel.is_child);
    const isRettai = sel.entity_type === "rettai_group" && !sel.is_child;

    if (!isFull && !isRettai) return;

    if (!bySection[sid]) bySection[sid] = [];
    bySection[sid].push({ ...sel, is_full: isFull, is_rettai: isRettai });
  });

  // ── Koil sattrumurai injection (exception) ──
  // Koil children are is_child (not eligible), but koil warrants its designated
  // sattrumurai: §11 → pathu 11 (11_11); §26 → pathu 10 (26_10, which also brings
  // the section-10 / Madhurakavi coupling). Skip if a REAL full-pathu/section
  // selection already produces that pathu (no duplicate).
  const _ki = gsatState.koilInfo || {};
  const injectKoilPathu = (sid, pno, kmeta) => {
    if (!kmeta || !kmeta.present) return;
    if (!bySection[sid]) bySection[sid] = [];
    const realCovers = bySection[sid].some(s =>
      !s.__koil && (s.entity_type === "section" || s.pathu_no === pno));
    if (realCovers) return;
    if (!bySection[sid].some(s => s.__koil && s.pathu_no === pno)) {
      bySection[sid].push({ section_id: sid, pathu_no: pno, is_full: true, is_rettai: false, __koil: true });
    }
  };
  injectKoilPathu(11, 11, _ki.thirumozhi);
  injectKoilPathu(26, 10, _ki.thiruvaimozhi);

  const CANONICAL_ORDER = [2, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 23, 26];
  // Madal sections map to madal_sattrumurai_master ids
  const MADAL_IDS = { 22: [1, 2], 23: [3, 4, 5, 6, 7] };
  let section26Has10thPathu = false;

  CANONICAL_ORDER.forEach(sid => {
    const sels = bySection[sid];
    if (!sels || !sels.length) return;

    if (sid === 2 || sid === 11 || sid === 26) {
      const pathuNos = [...new Set(sels.map(s => s.pathu_no).filter(p => p != null))];
      pathuNos.sort((a,b) => a-b);

      pathuNos.forEach(pno => {
        const key = `${sid}_${pno}`;
        const rule = SATTRUMURAI_PASURAMS[key];
        if (!rule) return;
        // Koil caveat: this pathu's sattrumurai comes ONLY from a koil injection
        // and the koil was partial → note that we've included it and it can be unticked.
        const pnoSels  = sels.filter(s => s.pathu_no === pno);
        const koilOnly = pnoSels.length > 0 && pnoSels.every(s => s.__koil);
        const kmeta    = sid === 11 ? (gsatState.koilInfo || {}).thirumozhi
                       : sid === 26 ? (gsatState.koilInfo || {}).thiruvaimozhi : null;
        if (koilOnly && kmeta && kmeta.present && !kmeta.full) {
          plan.push({ type: "note", key: `koil_caveat_${sid}`, text: sid === 11
            ? "Adiyen, you have not added the full Koil Thirumozhi — we are still including its saatrumurai. Please deselect if you don't want it."
            : "Adiyen, you have not added the full Koil Thiruvaimozhi — we are still including its saatrumurai. Please deselect if you don't want it." });
        }
        const heading = `${SECTION_NAMES[sid]} \u2014 ${PATHU_NAMES[pno] || pno + "ம் பத்து"} சாற்றுமுறை பாசுரங்கள்`;
        pushPasuramGroup(plan, key, heading, rule);
        // After Thiruvaimozhi 10th pathu sattrumurai, insert Madhurakavi verse (hardcoded)
        if (sid === 26 && pno === 10) {
          plan.push({
            type: "text_block", key: "madhurakavi_verse",
            lines: [
              "வேறொன்றும்\u200c நானறியேன்\u200c வேதம் தமிழ்செய்த",
              "மாறன்சடகோபன்\u200c வண்குருகூர் ஏறு",
              "எங்கள்வாழ்வாம்\u200c என்றேத்தும்\u200c மதுரகவியார்\u200c",
              "எம்மையாள்வார்\u200c அவரேயரண்"
            ],
            group: "madhurakavi_verse"
          });
        }
        if (sid === 26 && pno === 10) section26Has10thPathu = true; // triggers kanninun sequence
      });
    } else if (sid === 22 || sid === 23) {
      // Madal sattrumurai — fetched from DB, added as madal_fetch placeholders
      const madalIds = MADAL_IDS[sid];
      const sectionLabel = sid === 22 ? "சிறிய திருமடல் சாற்றுமுறை பாசுரங்கள்" : "பெரிய திருமடல் சாற்றுமுறை பாசுரங்கள்";
      plan.push({ type: "heading", key: `madal_${sid}_heading`, text: sectionLabel });
      madalIds.forEach(mid => {
        plan.push({ type: "madal_fetch", key: `madal_${sid}_${mid}`, madalId: mid,
                    sectionLabel, group: `madal_${sid}` });
      });
    } else {
      const rule = SATTRUMURAI_PASURAMS[`${sid}`];
      if (!rule) return;
      const heading = `${SECTION_NAMES[sid]} சாற்றுமுறை பாசுரங்கள்`;
      pushPasuramGroup(plan, `${sid}`, heading, rule);
    }
  });

  if (section26Has10thPathu) {
    plan.push({ type: "heading", key: "section10_heading", text: "கண்ணிநுண்சிறுத்தாம்பு" });
    SECTION10_SEQUENCE.forEach((item, idx) => {
      if (item.type === "pallandu_fixed") {
      const allLines = item.lines || [];
      const lines = allLines.map((l, li) => {
        const text = typeof l === "object" ? l.text : l;
        const pfx = (item.dual && li === 0) ? `<span class="gsat-pasuram-marker">** </span>` : "";
        return `<span class="gsat-pasuram-line">${pfx}${escHtml(text)}</span>`;
      }).join("");
      html += `<div class="gsat-pasuram-item" style="background:#FFFAF0">
        <div class="gsat-pasuram-text" style="padding-left:27px">${lines}</div>
      </div>`;
      return;
    }
    if (item.type === "kanninun") {
        plan.push({ type: "kanninun", key: `kanninun_${idx}`, label: item.label, checked: true });
      } else {
        plan.push({ type: "pasuram", key: `sec10_${idx}_${item.no}`, global_no: item.no, dual: item.dual, checked: true, lines: null, group: "section10" });
      }
    });
  }

  // Auto-include section 24 (before pallandu) if selected in ghoshti
  gsatState.autoIncludedKeys = new Set();
  const selectedSectionIds = new Set(sections.map(s => s.section_id));
  EXPLICIT_SECTIONS.forEach(sec => {
    if (selectedSectionIds.has(sec.section_id) && effBeforePallandu(sec)) {
      gsatState.autoIncludedKeys.add(sec.key);
      const heading = `${sec.label} சாற்றுமுறை பாசுரங்கள்`;
      pushPasuramGroup(plan, `explicit_${sec.key}`, heading,
        { dual: sec.pasurams.filter(p => p.dual).map(p => p.no),
          single: sec.pasurams.filter(p => !p.dual).map(p => p.no) });
    }
  });

  plan.push({ type: "heading", key: "pallandu_heading", text: "பல்லாண்டு" });
  PALLANDU.forEach((p, idx) => {
    plan.push({ type: "pallandu_fixed", key: `pallandu_${idx}_${p.no}`, global_no: p.no, dual: p.dual, lines: null, group: "pallandu" });
  });

  // Auto-include sections 25 and 27 (after pallandu) if selected in ghoshti
  EXPLICIT_SECTIONS.forEach(sec => {
    if (selectedSectionIds.has(sec.section_id) && !effBeforePallandu(sec)) {
      gsatState.autoIncludedKeys.add(sec.key);
      const heading = `${sec.label} சாற்றுமுறை பாசுரங்கள்`;
      pushPasuramGroup(plan, `explicit_${sec.key}`, heading,
        { dual: sec.pasurams.filter(p => p.dual).map(p => p.no),
          single: sec.pasurams.filter(p => !p.dual).map(p => p.no) });
    }
  });

  return plan;
}

function pushPasuramGroup(plan, groupKey, headingText, rule) {
  plan.push({ type: "heading", key: `${groupKey}_heading`, text: headingText });
  (rule.optional || []).forEach((no, idx) => {
    plan.push({ type: "pasuram", key: `${groupKey}_opt_${idx}_${no}`, global_no: no, dual: true, checked: false, lines: null, group: groupKey, optional: true });
  });
  (rule.dual || []).forEach((no, idx) => {
    plan.push({ type: "pasuram", key: `${groupKey}_dual_${idx}_${no}`, global_no: no, dual: true, checked: true, lines: null, group: groupKey });
  });
  (rule.single || []).forEach((no, idx) => {
    plan.push({ type: "pasuram", key: `${groupKey}_single_${idx}_${no}`, global_no: no, dual: false, checked: true, lines: null, group: groupKey });
  });
}

async function fetchAllPasuramTexts(plan) {
  const pasuramEntries = plan.filter(p => p.type === "pasuram" || p.type === "pallandu_fixed");
  const madalEntries   = plan.filter(p => p.type === "madal_fetch");

  await Promise.all([
    ...pasuramEntries.map(async entry => {
      try {
        const res = await fetch(`${WORKER_GET}/recital/pasuram-lines?no=${entry.global_no}`);
        const data = await res.json();
        entry.lines = (data?.lines || []).filter(l => l.line_text).map(l => ({ text: l.line_text, group: l.recital_group || 1 }));
      } catch(e) {
        entry.lines = [`(Pasuram ${entry.global_no} — could not load)`];
      }
    }),
    ...madalEntries.map(async entry => {
      try {
        const res  = await fetch(`${WORKER_GET}/recital/madal-sattrumurai?id=${entry.madalId}`);
        const data = await res.json();
        if (data.success) {
          entry.title = data.title;
          entry.lines = (data.lines || []).map(l => ({
            line_no:   l.line_no,
            line_text: l.line_text,
            is_dual:   l.is_dual_recital === 1,
            checked:   true,
          }));
        } else {
          entry.lines = [];
        }
      } catch(e) {
        entry.lines = [];
      }
    }),
  ]);
}

function render(container) {
  container.innerHTML = `
    <div class="gsat-wrap">
      <div class="gsat-title">சாற்றுமுறை</div>
      <div class="gsat-subtitle">${escHtml(gsatState.ghoshtiName)}</div>
      <div class="gsat-divider"></div>
      ${renderPasuramPlan()}
      ${renderExplicitToggles()}
      ${renderFixedTextSection()}
      ${renderVazhiSection()}
      ${renderManualAddSection()}
      ${(gsatState.segment === "T"  || gsatState.segment === "BOTH") ? renderMuktakaSection() : ""}
      ${(gsatState.segment === "V"  || gsatState.segment === "VM" || gsatState.segment === "BOTH") ? renderNamedMangalam("desika", 7, "ஸ்ரீதேஶிக மங்களம்", "ஸ்ரீதேஶிக மங்களம் முற்றிற்று") : ""}
      ${(gsatState.segment === "VM" || gsatState.segment === "BOTH") ? renderNamedMangalam("adivan", 6, "ஆதிவண்ஶடகோப மங்களம்", "ஆதிவண்ஶடகோப மங்களம் முற்றிற்று") : ""}
      <button class="gsat-save-btn" onclick="gsatSave()" id="gsat-save-btn">Add my Sattrumurai \uD83D\uDE4F</button>
      <span class="gsat-back" onclick="gsatBack()">\u2190 Back to Ghoshti</span>
    </div>
  `;
}

function renderPasuramPlan() {
  let html = "";
  let openSection = false;

  gsatState.pasuramItems.forEach((item, i) => {
    if (item.type === "heading") {
      if (openSection) html += `</div>`;
      html += `<div class="gsat-section"><div class="gsat-section-head">${escHtml(item.text)}</div>`;
      openSection = true;
      return;
    }
    if (item.type === "note") {
      html += `<div style="background:#fff6e0;border:1px solid #e0c070;border-radius:8px;padding:8px 10px;margin:6px 0;font-size:12px;color:#7a5a20;line-height:1.5">${escHtml(item.text)}</div>`;
      return;
    }
    if (item.type === "pallandu_fixed") {
      const allLines = item.lines || [];
      const g1 = allLines.filter(l => (typeof l==="object" ? l.group : 1) === 1);
      const g2 = allLines.filter(l => (typeof l==="object" ? l.group : 1) === 2);
      let linesHtml = "";
      if (g1.length) {
        const pfx = item.dual ? `<span class="gsat-pasuram-marker">** </span>` : "";
        linesHtml += g1.map((l,li) => `<span class="gsat-pasuram-line">${li===0?pfx:""}${escHtml(typeof l==="object"?l.text:l)}</span>`).join("");
      }
      if (g2.length) {
        linesHtml += `<span class="gsat-pasuram-line">&nbsp;</span>`;
        linesHtml += g2.map(l => `<span class="gsat-pasuram-line">${escHtml(typeof l==="object"?l.text:l)}</span>`).join("");
      }
      html += `<div class="gsat-pasuram-item" style="background:#FFFAF0">
        <div class="gsat-pasuram-text" style="padding-left:27px">${linesHtml}</div>
      </div>`;
      return;
    }
    if (item.type === "kanninun") {
      html += `<div class="gsat-pasuram-item">
        <input type="checkbox" id="gsat-item-${i}" ${item.checked ? "checked" : ""} onchange="gsatToggleItem(${i}, this.checked)">
        <div class="gsat-pasuram-text"><strong>${escHtml(item.label)}</strong>
          <span style="font-size:11px;color:#9a7a50;display:block">(Full text recited once — no ** marking needed)</span>
        </div>
      </div>`;
      return;
    }
    if (item.type === "madal_fetch") {
      if (!item.lines || !item.lines.length) return;
      // One checkbox for the entire madal block, no sub-heading shown
      // ** prefix on dual lines, amber color on greyed (non-dual) lines
      // Each madal_sattrumurai_master record = one separate block with line space
      const blockKey = `gsat-madal-block-${i}`;
      const lineHtml = item.lines.map(line => {
        const pfx   = line.is_dual ? `<span class="gsat-pasuram-marker">** </span>` : "";
        const style = !line.is_dual ? "color:#b38b2e;" : "";
        return `<span class="gsat-pasuram-line" style="${style}">${pfx}${escHtml(line.line_text)}</span>`;
      }).join("");
      html += `<div class="gsat-pasuram-item" style="margin-bottom:8px">
        <input type="checkbox" id="${blockKey}" checked
          onchange="gsatToggleMadalBlock('${item.key}', this.checked)">
        <div class="gsat-pasuram-text">${lineHtml}</div>
      </div>`;
      return;
    }
    if (item.type === "pasuram") {
      // ** marker only on first line for dual pasurams
      const allLines = item.lines || [];
      const g1 = allLines.filter(l => (typeof l === "object" ? l.group : 1) === 1);
      const g2 = allLines.filter(l => (typeof l === "object" ? l.group : 1) === 2);
      const renderLine = (l, li, isDual) => {
        const text = typeof l === "object" ? l.text : l;
        const pfx = (isDual && li === 0) ? `<span class="gsat-pasuram-marker">** </span>` : "";
        return `<span class="gsat-pasuram-line">${pfx}${escHtml(text)}</span>`;
      };
      let lines = g1.map((l, li) => renderLine(l, li, item.dual)).join("");
      if (g2.length) lines += `<span class="gsat-pasuram-line">&nbsp;</span>` + g2.map((l, li) => renderLine(l, li, false)).join("");
      if (!g1.length && !g2.length) lines = allLines.map((l, li) => renderLine(l, li, item.dual && li === 0)).join("");
      const optionalNote = item.optional ? ` <span style="font-size:10px;color:#b38b2e">(optional)</span>` : "";
      html += `<div class="gsat-pasuram-item">
        <input type="checkbox" id="gsat-item-${i}" ${item.checked ? "checked" : ""} onchange="gsatToggleItem(${i}, this.checked)">
        <div class="gsat-pasuram-text">${optionalNote}${lines}</div>
      </div>`;
      return;
    }
  });

  if (openSection) html += `</div>`;
  return html;
}

function renderManualAddSection() {
  return `<div class="gsat-section">
    <div class="gsat-section-head">\uD83D\uDD22 Add Pasuram by Number</div>
    <div style="padding:12px 14px;display:flex;gap:8px">
      <input type="number" id="gsat-manual-no" placeholder="Global Pasuram No (1-4000)"
        min="1" max="4000"
        style="flex:1;padding:8px 10px;border:1.5px solid #C9A84C;border-radius:8px;font-size:13px;color:#4a2c00;background:#fffdf5;outline:none">
      <button onclick="gsatAddManual()"
        style="padding:8px 16px;background:#7a4d00;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Add</button>
    </div>
    <div id="gsat-manual-added" style="padding:0 14px 12px;font-size:12px;color:#4a2c00"></div>
  </div>`;
}

function _explicitAllowedBySegment(sec) {
  const s = sec.sect || "B";
  const seg = gsatState.segment || "BOTH";
  if (seg === "BOTH") return true;
  if (seg === "T")  return s === "B" || s === "T";
  if (seg === "V")  return s === "B" || s === "V";           // not VM (52/53)
  if (seg === "VM") return s === "B" || s === "V" || s === "VM";
  return true;
}

function renderExplicitToggles() {
  const items = EXPLICIT_SECTIONS.filter(_explicitAllowedBySegment).map(sec => {
    const isAuto = gsatState.autoIncludedKeys?.has(sec.key);
    if (isAuto) {
      return `<div class="gsat-toggle-item" style="opacity:0.45;pointer-events:none">
        <input type="checkbox" disabled checked>
        <label style="cursor:default">${escHtml(sec.label)}</label>
      </div>`;
    }
    const isOn = gsatState.explicitToggles[sec.key];
    return `<div class="gsat-toggle-item">
      <input type="checkbox" id="gsat-ex-${sec.key}" ${isOn ? "checked" : ""} onchange="gsatToggleExplicit('${sec.key}', this.checked)">
      <label for="gsat-ex-${sec.key}" style="cursor:pointer">${escHtml(sec.label)}</label>
    </div>`;
  }).join("");

  return `<div class="gsat-section">
    <div class="gsat-section-head">\u2795 Additional Prabandhams (Optional)</div>
    ${items}
  </div>`;
}

function renderFixedLines(lines) {
  if (!lines || !lines.length) return "";
  return lines.map(l => {
    const text = _lineText(l);
        if (!text) return "";
    if (text.startsWith("(") && text.endsWith(")")) {
      return `<div style="text-align:center;font-size:12px;font-weight:700;color:#4a2c00;margin:6px 0 2px">${escHtml(text)}</div>`;
    }
    return `<span class="gsat-pasuram-line">${escHtml(text)}</span>`;
  }).join("");
}

function renderFixedTextSection() {
  const FIXED_DEFS = FIXED_DEFS_GHOSHTI; // from sectUtils — includes both T and V pothu
  let html = `<div class="gsat-section"><div class="gsat-section-head">\uD83D\uDCDC சாற்றுமுறை</div>`;
  gsatState.fixedOrder.forEach((fid, orderIdx) => {
    const def = FIXED_DEFS.find(d => d.id === fid);
    if (!def) return;
    const isAlways = !!def.always;
    const isOn     = isAlways || gsatState.fixedText[def.key];
    const lines    = gsatState.fixedTextLines[fid];
    const isLoaded = lines && lines.length > 0;
    const canUp    = orderIdx > 0;
    const canDown  = orderIdx < gsatState.fixedOrder.length - 1;
    const upStyle  = canUp   ? "cursor:pointer;color:#b38b2e" : "cursor:default;color:#ddd";
    const dnStyle  = canDown ? "cursor:pointer;color:#b38b2e" : "cursor:default;color:#ddd";
    const upClick  = canUp   ? `gsatMoveFixed(${fid},-1)` : "";
    const dnClick  = canDown ? `gsatMoveFixed(${fid},1)`  : "";
    const arrows   = `<span style="display:flex;gap:6px;margin-left:auto"><span onclick="${upClick}" style="font-size:14px;${upStyle}">▲</span><span onclick="${dnClick}" style="font-size:14px;${dnStyle}">▼</span></span>`;
    const linesHtml = isOn && isLoaded ? `<div style="width:100%;padding:4px 0 0 27px;font-size:13px;color:#4a2c00;line-height:1.8">${renderFixedLines(lines)}</div>` : "";
    if (isAlways) {
      html += `<div class="gsat-toggle-item" style="flex-wrap:wrap;opacity:0.75"><input type="checkbox" checked disabled style="opacity:0.5"><label style="color:#7a4d00;font-weight:700">${escHtml(def.label)}</label>${arrows}${linesHtml}</div>`;
    } else {
      html += `<div class="gsat-toggle-item" style="flex-wrap:wrap;${isOn ? "opacity:0.75" : ""}"><input type="checkbox" id="gsat-fixed-${def.key}" ${isOn ? "checked" : ""} onchange="gsatToggleFixedText('${def.key}',${def.id},this.checked)"><label for="gsat-fixed-${def.key}" style="cursor:pointer">${escHtml(def.label)}</label>${arrows}${linesHtml}</div>`;
    }
  });
  return html + `</div>`;
}

function _vazhiIsDesikaNaalpaattu(v) {
  const n = v.author_name || "";
  return /நிகமாந்த|தேஶிக|தேசிக/.test(n) && /நாள்பாட்டு/.test(n);
}
function _vazhiIsAndal(v) {
  return /ஆண்டாள்/.test(v.author_name || "");
}
// Vazhi visibility by this ghoshti's segment:
//   T  → all EXCEPT Desika Naalpaattu
//   V/VM → ONLY Andal + Andal Naalpaattu + Desika Naalpaattu
//   BOTH → all
function _vazhiAllowedBySegment(v) {
  const seg = gsatState.segment || "BOTH";
  if (seg === "BOTH") return true;
  if (seg === "T")    return !_vazhiIsDesikaNaalpaattu(v);
  return _vazhiIsAndal(v) || _vazhiIsDesikaNaalpaattu(v);   // V or VM
}

function renderVazhiSection() {
  if (!gsatState.allVaazhis.length) {
    return `<div class="gsat-section"><div class="gsat-section-head">\uD83C\uDF1F \u0bb5\u0bbe\u0bb4\u0bbf \u0ba4\u0bbf\u0bb0\u0bc1\u0ba8\u0bbe\u0bae\u0bae\u0bcd</div><div class="gsat-empty-note">\u0bb5\u0bbe\u0bb4\u0bbf \u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bcd \u0b8f\u0bb1\u0bcd\u0bb1 \u0bae\u0bc1\u0b9f\u0bbf\u0baf\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8</div></div>`;
  }
  const items = gsatState.allVaazhis.filter(_vazhiAllowedBySegment).map(v => {
    // ── Fixed_id 4 special item ──────────────────────────────
    if (v.is_fixed && v.fixed_id === 4) {
      const isOn    = gsatState.fixedText.surnikai;
      const vData   = gsatState.fixedTextLines[4];
      const isLoaded = vData && vData.length > 0;
      const linesHtml = isOn && isLoaded
        ? `<div style="width:100%;padding:4px 0 0 27px">${vData.map(l => {
            const text = _lineText(l);
        if (!text) return "";
            const endsWithBar = _mangalamGap(text);
            return `<div style="font-size:12px;color:#4a2c00;line-height:1.7;padding:2px 6px;background:#fef8e8;border-radius:4px;margin-bottom:2px">${escHtml(text)}</div>${endsWithBar ? '<div style="height:6px"></div>' : ''}`;
          }).join("")}</div>`
        : "";
      return `<div class="gsat-vazhi-item" style="flex-wrap:wrap;${isOn ? 'opacity:0.75' : ''};border-top:1px dashed #e8c060;padding-top:6px;margin-top:4px">
        <input type="checkbox" id="gsat-fixed-surnikai" ${isOn ? "checked" : ""}
          onchange="gsatToggleFixedText('surnikai',4,this.checked)">
        <label for="gsat-fixed-surnikai" style="cursor:pointer;font-weight:600;color:#7a4d00">${escHtml(v.author_name)}</label>
        ${linesHtml}
      </div>`;
    }
    // ── Regular vazhi item ───────────────────────────────────
    const isOn    = gsatState.selectedVaazhis.has(v.vazhi_id);
    const vData   = gsatState.vazhiLines[v.vazhi_id];
    const isLoaded = vData && vData.lines && vData.lines.length > 0;
    const authorName = escHtml(v.author_name || ("Vazhi " + v.vazhi_id));
    let linesHtml = "";
    if (isOn && isLoaded) {
      // Group lines by vazhi_group, add blank line between groups
      const groups = {};
      vData.lines.forEach(l => {
        const g = l.vazhi_group || 1;
        if (!groups[g]) groups[g] = [];
        groups[g].push(l);
      });
      linesHtml = `<div style="width:100%;padding:6px 0 0 27px;display:flex;flex-direction:column;gap:6px">`;
      Object.keys(groups).sort((a,b) => Number(a)-Number(b)).forEach(g => {
        linesHtml += `<div style="border:1px solid #e0c98a;border-radius:8px;padding:8px 12px;background:#fffdf6;font-size:14px;color:#4a2c00;line-height:1.9">`
          + groups[g].map(l => `<div>${escHtml(l.line_text)}</div>`).join("")
          + `</div>`;
      });
      linesHtml += `</div>`;
    }
    return `<div class="gsat-vazhi-item" style="flex-wrap:wrap;${isOn ? 'opacity:0.75' : ''}">
      <input type="checkbox" id="gsat-vazhi-${v.vazhi_id}" ${isOn ? "checked" : ""} onchange="gsatToggleVazhi(${v.vazhi_id},this.checked)">
      <label for="gsat-vazhi-${v.vazhi_id}" style="cursor:pointer;font-weight:${isOn ? '700' : '400'}">${authorName}</label>
      ${linesHtml}
    </div>`;
  }).join("");
  return `<div class="gsat-section"><div class="gsat-section-head">\uD83C\uDF1F \u0bb5\u0bbe\u0bb4\u0bbf \u0ba4\u0bbf\u0bb0\u0bc1\u0ba8\u0bbe\u0bae\u0bae\u0bcd <span style="font-size:11px;color:#9a7a50;font-weight:400">(\u0baa\u0bb2\u0bb5\u0bb1\u0bcd\u0bb1\u0bc8 \u0ba4\u0bc7\u0bb0\u0bcd\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0bb2\u0bbe\u0bae\u0bcd)</span></div><div class="gsat-vazhi-grid">${items}</div></div>`;
}

// Null-safe line text: rows may be strings, {line_text} objects, or
// carry NULL/blank line_text (spacer rows) — never crash, just skip.
function _lineText(l) {
  if (l == null) return "";
  if (typeof l === "string") return l;
  return l.line_text != null ? String(l.line_text) : "";
}

// Line-gap after a completed śloka: both ASCII || and devanagari ॥
function _mangalamGap(text) {
  return /(\|\||॥)$/.test(String(text).trimEnd());
}

// Generic mangalam checkbox section — mirrors Muktaka Mangalam exactly
// (same fonts/sizes) so தேஶிக / ஆதிவண்ஶடகோப render consistently.
function renderNamedMangalam(key, fid, heading, closing) {
  const isOn     = gsatState.fixedText[key];
  const lines    = gsatState.fixedTextLines[fid];
  const isLoaded = lines && lines.length > 0;
  const linesHtml = isOn && isLoaded
    ? `<div style="padding:8px 14px">${_mangalamCards(lines)}
      <div style="text-align:center;font-size:12px;color:#7a5a20;margin-top:10px;font-style:italic">${escHtml(closing)}</div>
    </div>`
    : "";
  return `<div class="gsat-section">
    <div class="gsat-section-head" style="text-align:center">${escHtml(heading)}</div>
    <div class="gsat-toggle-item">
      <input type="checkbox" id="gsat-fixed-${key}" ${isOn ? "checked" : ""}
        onchange="gsatToggleFixedText('${key}',${fid},this.checked)">
      <label for="gsat-fixed-${key}" style="cursor:pointer">${escHtml(heading)} சேர்க்க</label>
    </div>
    ${linesHtml}
  </div>`;
}

// Render fixed-text (mangalam) lines as bordered verse cards — each śloka
// couplet (lines through a closing ||) sits in its own box, matching the
// printed layout for easy reading. Parenthetical lines become sub-headings.
function _mangalamCards(lines) {
  const cards = [];
  let cur = [];
  const flush = () => { if (cur.length) { cards.push({ type: "verse", lines: cur.slice() }); cur = []; } };
  for (const l of (lines || [])) {
    const text = _lineText(l);
    if (!text) continue;
    if (text.startsWith("(") && text.endsWith(")")) { flush(); cards.push({ type: "subhead", text }); continue; }
    cur.push(text);
    if (_mangalamGap(text)) flush();
  }
  flush();
  return cards.map(c => {
    if (c.type === "subhead")
      return `<div style="text-align:center;font-weight:700;font-size:13px;color:#4a2c00;margin:10px 0 4px">${escHtml(c.text)}</div>`;
    return `<div style="border:1px solid #e0c98a;border-radius:8px;padding:10px 14px;margin-bottom:8px;background:#fffdf6">
      ${c.lines.map(t => `<div style="font-size:14px;color:#4a2c00;line-height:1.9">${escHtml(t)}</div>`).join("")}
    </div>`;
  }).join("");
}

function renderMuktakaSection() {
  const isOn    = gsatState.fixedText.muktaka;
  const lines   = gsatState.fixedTextLines[3];
  const isLoaded = lines && lines.length > 0;
  const linesHtml = isOn && isLoaded
    ? `<div style="padding:8px 14px">${_mangalamCards(lines)}
      <div style="text-align:center;font-size:12px;color:#7a5a20;margin-top:10px;font-style:italic">\u0bae\u0bc1\u0b95\u0bcd\u0ba4\u0b95 \u0bae\u0b99\u0bcd\u0b95\u0bb3\u0bae\u0bcd \u0bae\u0bc1\u0bb1\u0bcd\u0bb1\u0bbf\u0bb1\u0bcd\u0bb1\u0bc1</div>
    </div>`
    : "";
  return `<div class="gsat-section">
    <div class="gsat-section-head" style="text-align:center">\u0bae\u0bc1\u0b95\u0bcd\u0ba4\u0b95 \u0bae\u0b99\u0bcd\u0b95\u0bb3\u0bae\u0bcd</div>
    <div class="gsat-toggle-item">
      <input type="checkbox" id="gsat-fixed-muktaka" ${isOn ? "checked" : ""}
        onchange="gsatToggleFixedText('muktaka',3,this.checked)">
      <label for="gsat-fixed-muktaka" style="cursor:pointer">\u0bae\u0bc1\u0b95\u0bcd\u0ba4\u0b95 \u0bae\u0b99\u0bcd\u0b95\u0bb3\u0bae\u0bcd \u0b9a\u0bc7\u0bb0\u0bcd\u0b95\u0bcd\u0b95</label>
    </div>
    ${linesHtml}
  </div>`;
}

window.gsatToggleItem = function(i, checked) { gsatState.pasuramItems[i].checked = checked; };
window.gsatMoveFixed = function(fid, dir) {
  const arr = gsatState.fixedOrder;
  const idx = arr.indexOf(fid);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  const container = document.querySelector(".gsat-wrap")?.parentElement;
  if (container) render(container);
};

window.gsatToggleFixedText = async function(key, fid, checked) {
  if (fid === 4 && checked) {
    const ok = confirm("Adiyen, திருமங்கைமன்னன் வடிவழகு சூர்ணிகை is usually recited only on Thirumangai Azhwar Varusha Thirunatchathram. Do you still wish to add it?");
    if (!ok) return;
  }
  gsatState.fixedText[key] = checked;
  if (checked && !gsatState.fixedTextLines[fid]) {
    try {
      const res  = await fetch(`${WORKER_POST}/recital/fixed-text?id=${fid}`);
      const data = await res.json();
      if (data.success) gsatState.fixedTextLines[fid] = data.lines;
    } catch(e) {}
  }
  const container = document.querySelector(".gsat-wrap")?.parentElement;
  if (container) render(container);
};
window.gsatToggleExplicit = async function(key, checked) {
  gsatState.explicitToggles[key] = checked;
  const sec = EXPLICIT_SECTIONS.find(s => s.key === key);
  if (!sec) return;
  const groupKey = `explicit_${key}`;

  if (checked) {
    // Build plan items for this explicit section
    const items = [];
    items.push({ type: "heading", key: `${groupKey}_heading`,
      text: `${sec.label} சாற்றுமுறை பாசுரங்கள்` });
    sec.pasurams.forEach((p, idx) => {
      items.push({ type: "pasuram",
        key: `${groupKey}_${p.dual ? "dual" : "single"}_${idx}_${p.no}`,
        global_no: p.no, dual: p.dual, checked: true, lines: null, group: groupKey });
    });
    // Fetch lines
    await Promise.all(items.filter(it => it.type === "pasuram").map(async entry => {
      try {
        const res = await fetch(`${WORKER_GET}/recital/pasuram-lines?no=${entry.global_no}`);
        const data = await res.json();
        entry.lines = (data?.lines || []).filter(l => l.line_text).map(l => ({ text: l.line_text, group: l.recital_group || 1 }));
      } catch(e) { entry.lines = []; }
    }));
    // Insert into the correct region (before/after pallandu per the
    // EFFECTIVE flag — Madam users place V items before pallandu) and
    // keep EXPLICIT_SECTIONS array order regardless of toggle order:
    // insert before the first same-region explicit group that comes
    // LATER in the array; default = region end.
    const pallanduIdx = gsatState.pasuramItems.findIndex(it => it.key === "pallandu_heading");
    const myBefore    = effBeforePallandu(sec);
    const myIdx       = EXPLICIT_SECTIONS.findIndex(s => s.key === key);
    const regionEnd   = (myBefore && pallanduIdx >= 0)
      ? pallanduIdx
      : gsatState.pasuramItems.length;
    let insertAt = regionEnd;
    for (let i = 0; i < regionEnd; i++) {
      const it = gsatState.pasuramItems[i];
      if (it.type === "heading" && it.key.startsWith("explicit_") && it.key.endsWith("_heading")) {
        const otherKey = it.key.slice("explicit_".length, -("_heading".length));
        const otherSec = EXPLICIT_SECTIONS.find(s => s.key === otherKey);
        const otherIdx = EXPLICIT_SECTIONS.findIndex(s => s.key === otherKey);
        if (!otherSec) continue;
        // only compare within my region
        if (effBeforePallandu(otherSec) !== myBefore) continue;
        // after-pallandu region: skip anything before pallandu
        if (!myBefore && pallanduIdx >= 0 && i < pallanduIdx) continue;
        if (otherIdx > myIdx) { insertAt = i; break; }
      }
    }
    gsatState.pasuramItems.splice(insertAt, 0, ...items);
  } else {
    // Remove all items for this group
    gsatState.pasuramItems = gsatState.pasuramItems.filter(it =>
      !(it.group === groupKey || it.key === `${groupKey}_heading`)
    );
  }
  const container = document.querySelector(".gsat-wrap")?.parentElement;
  if (container) render(container);
};
window.gsatToggleMadalLine = function(itemKey, lineIdx, checked) {
  const item = gsatState.pasuramItems.find(it => it.key === itemKey);
  if (item && item.lines && item.lines[lineIdx]) {
    item.lines[lineIdx].checked = checked;
  }
};
window.gsatToggleMadalBlock = function(itemKey, checked) {
  const item = gsatState.pasuramItems.find(it => it.key === itemKey);
  if (item && item.lines) {
    item.lines.forEach(l => { l.checked = checked; });
    item.blockChecked = checked;
  }
};
window.gsatToggleVazhi = async function(id, checked) {
  if (checked) {
    gsatState.selectedVaazhis.add(id);
    if (!gsatState.vazhiLines[id]) {
      try {
        const res  = await fetch(`${WORKER_POST}/recital/vazhi-lines?id=${id}`);
        const data = await res.json();
        if (data.success) gsatState.vazhiLines[id] = { author_name: data.author_name, lines: data.lines };
      } catch(e) {}
    }
  } else {
    gsatState.selectedVaazhis.delete(id);
  }
  const container = document.querySelector(".gsat-wrap")?.parentElement;
  if (container) render(container);
};

// ── Re-order my sattrumurai — shown at finalize, heading blocks only ──
// Groups = contiguous run from each heading (its pasurams, text blocks,
// madal lines move with it). Continue proceeds to save in shown order.
function gsatShowReorder(onDone) {
  // Split pasuramItems into heading-led blocks
  const blocks = [];
  let cur = null;
  gsatState.pasuramItems.forEach(it => {
    if (it.type === "heading" || (it.type === "kanninun" && !cur)) {
      cur = { label: it.text || it.label || "பாசுரங்கள்", items: [it] };
      blocks.push(cur);
    } else {
      if (!cur) { cur = { label: "பாசுரங்கள்", items: [] }; blocks.push(cur); }
      cur.items.push(it);
    }
  });
  if (blocks.length < 2) { onDone(); return; }  // nothing to reorder

  let order = [...blocks];
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px";
  const btnCss = "border:1px solid #c8a84b;background:#fff;color:#7a4d00;border-radius:6px;width:30px;height:30px;font-size:13px;cursor:pointer;flex-shrink:0";

  const draw = () => {
    overlay.innerHTML = `
      <div style="background:#fff9ed;border:2px solid #c8a84b;border-radius:12px;max-width:430px;width:100%;max-height:82vh;display:flex;flex-direction:column;font-family:inherit">
        <div style="padding:14px 16px 4px;font-weight:700;color:#7a4d00;font-size:15px">Re-order my sattrumurai ⇅</div>
        <div style="padding:0 16px 6px;font-size:12px;color:#b38b2e">The sattrumurai will follow this order 🙏</div>
        <div style="overflow-y:auto;padding:6px 16px;flex:1">
          ${order.map((b, i) => `
            <div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e8d9b0;border-radius:8px;padding:8px 10px;margin-bottom:6px">
              <span style="flex:1;font-size:13px;color:#2a1a00">${escHtml(b.label)}</span>
              <button style="${btnCss};${i === 0 ? "opacity:.35" : ""}" ${i === 0 ? "disabled" : ""}
                      onclick="window._gsatReorderMove(${i},-1)">▲</button>
              <button style="${btnCss};${i === order.length - 1 ? "opacity:.35" : ""}" ${i === order.length - 1 ? "disabled" : ""}
                      onclick="window._gsatReorderMove(${i},1)">▼</button>
            </div>`).join("")}
        </div>
        <div style="padding:10px 16px 14px;display:flex;gap:8px">
          <button style="flex:1;padding:11px;border:1px solid #c8a84b;background:#fff;color:#7a4d00;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit"
                  onclick="window._gsatReorderReset()">Reset order</button>
          <button style="flex:1;padding:11px;border:none;background:#7a4d00;color:#fef0c0;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit"
                  onclick="window._gsatReorderDone()">Continue 🙏</button>
        </div>
      </div>`;
  };

  window._gsatReorderMove = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    draw();
  };
  window._gsatReorderReset = () => { order = [...blocks]; draw(); };
  window._gsatReorderDone  = () => {
    gsatState.pasuramItems = order.flatMap(b => b.items);
    document.body.removeChild(overlay);
    document.body.style.overflow = "";
    onDone();
  };

  draw();
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

window.gsatSave = async function() {
  // Finalized — offer block reorder before compiling & saving
  await new Promise(resolve => gsatShowReorder(resolve));

  const btn = document.getElementById("gsat-save-btn");
  if (btn) { btn.disabled = true; btn.textContent = "சேமிக்கிறது..."; }

  const finalPasurams = [];
  gsatState.pasuramItems.forEach(item => {
    if (item.type === "heading") {
      finalPasurams.push({ type: "heading", text: item.text, group: item.key });
      return;
    }
    if (item.type === "pasuram" && item.checked) {
      finalPasurams.push({ global_no: item.global_no, dual: item.dual, group: item.group, lines: (item.lines||[]).map(l => typeof l === "object" ? l : { text: l, group: 1 }) });
    }
    if (item.type === "madal_fetch" && item.lines?.length) {
      // Only include if block is checked (default true)
      if (item.blockChecked === false) return;
      const selectedLines = item.lines.filter(l => l.checked).map(l => ({
        line_no: l.line_no, line_text: l.line_text, is_dual: l.is_dual
      }));
      if (selectedLines.length) {
        finalPasurams.push({ type: "madal_lines", madalId: item.madalId,
                              title: item.title, lines: selectedLines, group: item.group });
      }
    }
    if (item.type === "pallandu_fixed") {
      // Pallandu always included
      finalPasurams.push({ global_no: item.global_no, dual: item.dual, group: "pallandu", lines: (item.lines||[]).map(l => typeof l === "object" ? l : { text: l, group: 1 }) });
    }
    if (item.type === "text_block") {
      finalPasurams.push({ type: "text_block", lines: item.lines, group: item.group });
    }
    if (item.type === "kanninun" && item.checked) {
      finalPasurams.push({ type: "kanninun_full", group: "section10" });
    }
  });

  // Remove orphan headings (headings with no pasurams following them)
  const sequence = finalPasurams.filter((item, idx) => {
    if (item.type !== "heading") return true;
    // Check if next non-heading item exists and belongs to same group
    const next = finalPasurams[idx + 1];
    return next && next.type !== "heading";
  });

  // Build fixed text blocks in fixedOrder
  const fixed_blocks = [];
  gsatState.fixedOrder.forEach(fid => {
    const lines = gsatState.fixedTextLines[fid];
    if (!lines || !lines.length) return;
    // id=1 always included; others only if selected
    const def = { 1: "pothu", 2: "iyal" };
    const key = def[fid];
    if (fid !== 1 && key && !gsatState.fixedText[key]) return;
    fixed_blocks.push({ fixed_id: fid, lines });
  });

  // Build vazhi blocks in selection order
  const vazhi_blocks = [];
  gsatState.allVaazhis.forEach(v => {
    if (v.is_fixed) return; // fixed_id 4 handled separately
    if (!gsatState.selectedVaazhis.has(v.vazhi_id)) return;
    const vData = gsatState.vazhiLines[v.vazhi_id];
    if (!vData) return;
    vazhi_blocks.push({ vazhi_id: v.vazhi_id, author_name: vData.author_name, lines: vData.lines });
  });

  // Fixed_id 4 (surnikai) — after vazhi_id 37
  if (gsatState.fixedText.surnikai && gsatState.fixedTextLines[4]) {
    const idx37 = vazhi_blocks.findIndex(v => v.vazhi_id === 37);
    const surnikaiBlock = { fixed_id: 4, lines: gsatState.fixedTextLines[4], author_name: "திருமங்கைமன்னன் வடிவழகு சூர்ணிகை" };
    if (idx37 >= 0) vazhi_blocks.splice(idx37 + 1, 0, surnikaiBlock);
    else vazhi_blocks.push(surnikaiBlock);
  }

  // Muktaka mangalam
  const muktaka_lines = gsatState.fixedText.muktaka && gsatState.fixedTextLines[3]
    ? gsatState.fixedTextLines[3] : [];

  const payload = {
    ghoshti_id:   gsatState.ghoshtiId,
    pasurams:     sequence,
    explicit:     Object.keys(gsatState.explicitToggles).filter(k => gsatState.explicitToggles[k]),
    vaazhis:      [...gsatState.selectedVaazhis],
    fixed_text_1: gsatState.fixedText.pothu,
    fixed_text_2: gsatState.fixedText.iyal,
    fixed_blocks,
    vazhi_blocks,
    muktaka_lines,
    desika_lines: (gsatState.fixedText.desika && gsatState.fixedTextLines[7]) || [],
    adivan_lines: (gsatState.fixedText.adivan && gsatState.fixedTextLines[6]) || [],
  };

  console.log("SATTRUMURAI PAYLOAD:", JSON.stringify(payload));
  try {
    const res = await fetch(`${WORKER_POST}/recital/ghoshti-sattrumurai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error("SATTRUMURAI SAVE FAILED:", res.status, errBody);
    }
    const data = await res.json();
    if (data.success) {
      alert("சாற்றுமுறை சேர்க்கப்பட்டது \uD83D\uDE4F");
      window.location.href = `ghoshti.html?id=${gsatState.ghoshtiId}`;
    } else {
      alert("Error: " + (data.error || "Please try again"));
      if (btn) { btn.disabled = false; btn.textContent = "Add my Sattrumurai \uD83D\uDE4F"; }
    }
  } catch(e) {
    alert("Connection failed: " + e.message);
    if (btn) { btn.disabled = false; btn.textContent = "Add my Sattrumurai \uD83D\uDE4F"; }
  }
};

// Sections blocked from manual add (no sattrumurai or auto-handled)
const MANUAL_ADD_BLOCKED_SECTIONS = new Set([1, 3, 8, 10, 19, 21, 28, 29, 30, 31]);

window.gsatAddManual = async function() {
  const inputEl = document.getElementById("gsat-manual-no");
  const no = parseInt(inputEl?.value, 10);
  // Allow main range 1-3776 plus section 25 range 25001-25071 only
  const isValidNo = (no >= 1 && no <= 3776) || (no >= 25001 && no <= 25071);
  if (!no || !isValidNo) {
    alert("Adiyen, please enter a valid pasuram number (1-3776) or உபதேசரத்தினமாலை pasuram (25001-25071)");
    return;
  }
  const previewEl = document.getElementById("gsat-manual-added");
  if (previewEl) previewEl.innerHTML = `<span style="color:#b38b2e">Loading pasuram ${no}...</span>`;

  // ── Madal special handling ────────────────────────────────────
  const MADAL_MAP = {
    2673: { sid: 22, ids: [1, 2],          heading: "சிறிய திருமடல் சாற்றுமுறை பாசுரங்கள்" },
    2674: { sid: 23, ids: [3, 4, 5, 6, 7], heading: "பெரிய திருமடல் சாற்றுமுறை பாசுரங்கள்" },
  };
  if (MADAL_MAP[no]) {
    const madal = MADAL_MAP[no];
    // Check if already added
    const alreadyAdded = gsatState.pasuramItems.some(it => it.key === `madal_manual_${no}`);
    if (alreadyAdded) {
      alert(`Adiyen, ${madal.heading} is already added.`);
      if (inputEl) inputEl.value = "";
      if (previewEl) previewEl.innerHTML = "";
      return;
    }
    const ok = confirm(`Add ${madal.heading} to Sattrumurai?`);
    if (!ok) { if (previewEl) previewEl.innerHTML = ""; return; }

    // Fetch all madal sattrumurai records
    const madalItems = [];
    // Insert chronologically by canonical position (2673/2674)
    const pallanduIdx2 = gsatState.pasuramItems.findIndex(it => it.key === "pallandu_heading");
    let madalInsertAt = gsatState.pasuramItems.length;
    for (let idx = 0; idx < gsatState.pasuramItems.length; idx++) {
      const it = gsatState.pasuramItems[idx];
      // Check regular pasurams
      if (it.type === "pasuram" && it.global_no != null && it.global_no > no) {
        madalInsertAt = idx;
        break;
      }
      // Check other madal manual headings by their canonical no (e.g. madal_manual_2674)
      if (it.type === "heading" && it.key && it.key.startsWith("madal_manual_")) {
        const existingNo = parseInt(it.key.replace("madal_manual_", ""), 10);
        if (existingNo > no) { madalInsertAt = idx; break; }
      }
    }
    if (pallanduIdx2 >= 0 && madalInsertAt > pallanduIdx2) madalInsertAt = pallanduIdx2;
    // Walk back past headings (but not madal_manual headings of later canonical nos)
    while (madalInsertAt > 0 && gsatState.pasuramItems[madalInsertAt - 1]?.type === "heading" &&
           !gsatState.pasuramItems[madalInsertAt - 1]?.key?.startsWith("madal_manual_")) {
      madalInsertAt--;
    }

    gsatState.pasuramItems.splice(madalInsertAt, 0,
      { type: "heading", key: `madal_manual_${no}`, text: madal.heading }
    );
    // Fetch and insert each madal record after heading
    let insertOffset = madalInsertAt + 1;
    await Promise.all(madal.ids.map(async (mid, i) => {
      try {
        const res  = await fetch(`${WORKER_GET}/recital/madal-sattrumurai?id=${mid}`);
        const data = await res.json();
        if (data.success) {
          madalItems.push({ idx: i, item: {
            type: "madal_fetch", key: `madal_${madal.sid}_${mid}_manual`,
            madalId: mid, group: `madal_${madal.sid}`,
            lines: (data.lines || []).map(l => ({
              line_no: l.line_no, line_text: l.line_text,
              is_dual: l.is_dual_recital === 1, checked: true
            }))
          }});
        }
      } catch(e) {}
    }));
    madalItems.sort((a,b) => a.idx - b.idx);
    madalItems.forEach((m, i) => {
      gsatState.pasuramItems.splice(insertOffset + i, 0, m.item);
    });

    if (inputEl) inputEl.value = "";
    if (previewEl) previewEl.innerHTML = `<span style="color:#4a7c00">✓ ${madal.heading} added</span>`;
    const container = document.querySelector(".gsat-wrap")?.parentElement;
    if (container) render(container);
    return;
  }

  try {
    const res = await fetch(`${WORKER_GET}/recital/pasuram-lines?no=${no}`);
    const data = await res.json();
    const lines = (data?.lines || []).filter(l => l.line_text).map(l => ({ text: l.line_text, group: l.recital_group || 1 }));

    // If no lines found, pasuram does not exist
    if (!lines.length) {
      alert(`Adiyen, we don't have sattrumurai pasuram for this selection.`);
      if (inputEl) inputEl.value = "";
      if (previewEl) previewEl.innerHTML = "";
      return;
    }

    // Check if this pasuram belongs to a blocked section
    // Fetch lookup for section info
    let manualHeading = "Added Pasuram";
    let manualHeadingKey = "manual_added";
    let manualSecId = null;
    try {
      const lookupRes = await fetch(`${WORKER_GET}/recital/pasuram-lookup?no=${no}`);
      const lookupData = await lookupRes.json();
      const secId = lookupData?.section_id;
      manualSecId = secId;
      const isMargazhi = false; // TODO: wire panchangam check if needed

      // ── Section 24 and 27: special handling ──────────────────
      if (secId === 24 || secId === 27) {
        const secDef = EXPLICIT_SECTIONS.find(s => s.section_id === secId);
        const label = secDef?.label || (secId === 24 ? "இராமானுச நூற்றந்தாதி" : "திருவாய்மொழி நூற்றந்தாதி");
        if (gsatState.autoIncludedKeys?.has(secDef?.key)) {
          alert(`Adiyen, ${label} sattrumurai is already added.`);
        } else {
          alert(`Adiyen, please select ${label} from the options above to add sattrumurai.`);
        }
        if (inputEl) inputEl.value = "";
        if (previewEl) previewEl.innerHTML = "";
        return;
      }

      // ── Section 25: always allow, always dual ──────────────
      if (secId === 25) {
        // fall through — handled below with dual forced
      } else if (MANUAL_ADD_BLOCKED_SECTIONS.has(secId)) {
        // Special case: section 3 (Thiruppavai) allowed in Margazhi
        if (secId === 3 && isMargazhi) {
          // allowed — continue
        } else if (secId === 1 || secId === 3) {
          alert("Pallandu and Thiruppavai pasurams are always included automatically. They cannot be added manually.\n\nNote: Individual Thiruppavai pasurams can be added during Margazhi month.");
          if (inputEl) inputEl.value = "";
          if (previewEl) previewEl.innerHTML = "";
          return;
        } else if (secId === 10) {
          alert("Kanninun Siruthambu (Section 10) is included automatically with Thiruvaimozhi 10th pathu. It cannot be added manually.");
          if (inputEl) inputEl.value = "";
          if (previewEl) previewEl.innerHTML = "";
          return;
        } else {
          alert(`Adiyen, we don't have sattrumurai pasuram for this selection.`);
          if (inputEl) inputEl.value = "";
          if (previewEl) previewEl.innerHTML = "";
          return;
        }
      } else {
        // Check if this section already has sattrumurai in the plan
        const secAlreadyInPlan = gsatState.pasuramItems.some(it =>
          it.type === "pasuram" && it.group && (
            it.group === `${secId}` ||
            it.group.startsWith(`${secId}_`) ||
            it.group === `explicit_${EXPLICIT_SECTION_MAP[secId] || ""}` ||
            (it.group.startsWith("madal_") && (secId === 22 || secId === 23))
          )
        );
        if (secAlreadyInPlan) {
          const secName = lookupData.section_name || `Section ${secId}`;
          const proceed = confirm(`Adiyen, sattrumurai for ${secName} is already included. Do you still wish to add this pasuram?`);
          if (!proceed) {
            if (inputEl) inputEl.value = "";
            if (previewEl) previewEl.innerHTML = "";
            return;
          }
        }
      }

      // Build correct heading from lookup data
      manualHeading = lookupData.section_name || "Added Pasuram";
      manualHeadingKey = `manual_sec_${secId}`;
      if (secId === 2 || secId === 11 || secId === 26) {
        const parts = [lookupData.section_name, lookupData.pathu_name, lookupData.pathu_subunit_name];
        if (lookupData.pathu_thirumozhi_heading) parts.push(`(${lookupData.pathu_thirumozhi_heading})`);
        manualHeading = parts.filter(Boolean).join(" — ");
        manualHeadingKey = `manual_sec_${secId}_pathu_${lookupData.pathu_id}`;
      } else if (secId === 4 || secId === 5) {
        const parts = [lookupData.section_name, lookupData.thirumozhi_name];
        if (lookupData.thirumozhi_heading) parts.push(`(${lookupData.thirumozhi_heading})`);
        manualHeading = parts.filter(Boolean).join(" — ");
        manualHeadingKey = `manual_sec_${secId}_tm_${lookupData.thirumozhi_id}`;
      }

    } catch(e) { /* if lookup fails, proceed */ }

    const preview = lines.slice(0, 4).map(l => (typeof l === "object" ? l.text : l)).join(" / ");
    const ok = confirm(`Adiyen 🙏\n\nPasuram ${no}:\n\n${preview || "(no preview)"}\n\nAdd to Sattrumurai?`);
    if (!ok) { if (previewEl) previewEl.innerHTML = ""; return; }

    // Insert before Pallandu heading
    const pallanduIdx = gsatState.pasuramItems.findIndex(it => it.key === "pallandu_heading");
    // Section 25: all dual except 25074 which is always single
    const forcedDual = (manualSecId === 25) ? (no !== 25074) : true;
    const newItem = {
      type: "pasuram", key: `manual_${no}_${Date.now()}`,
      global_no: no, dual: forcedDual, checked: true, lines, group: "manual",
    };

    // Margazhi Thiruppavai (section 3) goes right after thiruppavai sattrumurai group
    const isThiruppavai = newItem.group_section === 3;
    if (isThiruppavai) {
      const thiruppavaiEnd = gsatState.pasuramItems.reduce((last, it, idx) =>
        it.group === "thiruppavai" ? idx : last, -1);
      const margazhiHeadingIdx = gsatState.pasuramItems.findIndex(it => it.key === "margazhi_thiruppavai_heading");
      if (margazhiHeadingIdx === -1) {
        const insertAt = thiruppavaiEnd >= 0 ? thiruppavaiEnd + 1 : 1;
        gsatState.pasuramItems.splice(insertAt, 0,
          { type: "heading", key: "margazhi_thiruppavai_heading", text: "Margazhi Thiruppavai (Additional)" },
          newItem
        );
      } else {
        gsatState.pasuramItems.splice(margazhiHeadingIdx + 1, 0, newItem);
      }
    } else {
      // Insert in chronological order by global_no among pasuram items
      let insertAt = gsatState.pasuramItems.length;
      for (let idx = 0; idx < gsatState.pasuramItems.length; idx++) {
        const it = gsatState.pasuramItems[idx];
        if (it.type === "pasuram" && it.global_no != null && it.global_no > no) {
          insertAt = idx;
          break;
        }
      }
      // If inserting before Pallandu heading, cap at pallanduIdx
      if (pallanduIdx >= 0 && insertAt > pallanduIdx) insertAt = pallanduIdx;
      // Walk back from insertAt past any heading that belongs to a later section
      // so we insert before that section's heading, not in the middle of it
      while (insertAt > 0 && gsatState.pasuramItems[insertAt - 1]?.type === "heading") {
        insertAt--;
      }
      // Add heading if not already present for this key
      const existingHeadingIdx = gsatState.pasuramItems.findIndex(it => it.key === manualHeadingKey);
      if (existingHeadingIdx === -1) {
        gsatState.pasuramItems.splice(insertAt, 0,
          { type: "heading", key: manualHeadingKey, text: manualHeading },
          newItem
        );
      } else {
        gsatState.pasuramItems.splice(insertAt, 0, newItem);
      }
    }

    if (inputEl) inputEl.value = "";
    if (previewEl) previewEl.innerHTML = `<span style="color:#4a7c00">\u2713 Pasuram ${no} added</span>`;

    // Re-render to show the new item
    const container = document.querySelector(".gsat-wrap")?.parentElement;
    if (container) render(container);
  } catch(e) {
    alert("Could not load pasuram " + no + ": " + e.message);
    if (previewEl) previewEl.innerHTML = "";
  }
};

window.gsatBack = function() { history.back(); };

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}