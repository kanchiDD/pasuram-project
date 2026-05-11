// =============================================================
// fullAzhwarThirunatchathra.js
// Azhwar / Acharya Thirunatchathra Recital — Full 4000 only
//
// Flow:
//  1. List of Azhwars/Acharyas shown
//  2. Click one → selection modal appears
//     • Compulsory items — no checkbox (always included)
//     • Optional items  — checkbox (user selects/deselects)
//  3. Confirm → render recital in order
//
// DB tables:
//  author_birth_recital_master  — one row per author (recital_id, author_id, tamil_name)
//  author_birth_recital_sequence — sequence rows per recital_id
//  custom_recital_entity        — named custom items (koil_thirumozhi etc.)
// =============================================================

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

const _cache = new Map();
function cf(url) {
  if (!_cache.has(url)) _cache.set(url, fetch(url).then(r => r.json()));
  return _cache.get(url);
}

// ── Azhwar list (static — author_ids match your SECTION_AUTHOR map) ──
const AZHWARS = [
  { author_id:1,  name:"ஸ்ரீ பொய்கையாழ்வார்",  month:"ஐப்பசி",    star:"ஓணம்",  type:"azhwar" },
  { author_id:2,  name:"ஸ்ரீ பூதத்தாழ்வார்",       month:"ஐப்பசி", star:"அவிட்டம்",      type:"azhwar" },
  { author_id:3,  name:"ஸ்ரீ பேயாழ்வார்",         month:"ஐப்பசி",  star:"சதயம்",      type:"azhwar" },
  { author_id:4,  name:"ஸ்ரீ திருமழிசையாழ்வார்",  month:"தை",  star:"மகம்",          type:"azhwar" },
  { author_id:5,  name:"ஸ்ரீ மதுரகவியாழ்வார்",    month:"சித்திரை",  star:"சித்திரை",    type:"azhwar" },
  { author_id:6,  name:"ஸ்ரீ நம்மாழ்வார்",         month:"வைகாசி", star:"விசாகம்",      type:"azhwar" },
  { author_id:7,  name:"ஸ்ரீ பெரியாழ்வார்",       month:"ஆனி",  star:"ஸ்வாதி",         type:"azhwar" },
  { author_id:8,  name:"ஸ்ரீ ஆண்டாள்",           month:"ஆடி",  star:"பூரம்",         type:"azhwar" },
  { author_id:9,  name:"ஸ்ரீ குலசேகரஆழ்வார்",           month:"மாசி", star:"புனர் பூசம்",        type:"azhwar" },
  { author_id:10, name:"ஸ்ரீ தொண்டரடிப்பொடியாழ்வார்", month:"மார்கழி",  star:"கேட்டை",   type:"azhwar" },
  { author_id:11, name:"ஸ்ரீ திருப்பாணாழ்வார்",     month:"கார்த்திகை",  star:"ரோகிணி",  type:"azhwar" },
  { author_id:12, name:"ஸ்ரீ திருமங்கையாழ்வார்",    month:"கார்த்திகை",  star:"கார்த்திகை",  type:"azhwar" },
  { author_id:13, name:"ஸ்ரீ திருவரங்கத்தமுதனார்",  month:"பங்குனி",   star:"ஹஸ்தம்",            type:"acharya" },
  { author_id:14, name:"ஸ்ரீ இராமாநுஜர்",           month:"சித்திரை", star:"திருவாதிரை",    type:"acharya" },
  { author_id:15, name:"ஸ்ரீ மணவாளமாமுனிகள்",   month:"ஐப்பசி",    star:"மூலம்",            type:"acharya" }
];

// ── Section name map — respectful full names ─────────────────
const SECTION_HEADER_MAP = {
  "திருப்பல்லாண்டு":        "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த திருப்பல்லாண்டு",
  "பெரியாழ்வார் திருமொழி":  "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த பெரியாழ்வார் திருமொழி",
  "திருப்பாவை":              "ஸ்ரீ ஆண்டாள் அருளிச்செய்த திருப்பாவை",
  "நாச்சியார் திருமொழி":    "ஸ்ரீ ஆண்டாள் அருளிச்செய்த நாச்சியார் திருமொழி",
  "பெருமாள் திருமொழி":      "ஸ்ரீ குலசேகர பெருமாள் அருளிச்செய்த பெருமாள் திருமொழி",
  "திருச்சந்தவிருத்தம்":     "ஸ்ரீ திருமழிசைப்பிரான் அருளிச்செய்த திருச்சந்தவிருத்தம்",
  "திருமாலை":                "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருமாலை",
  "திருப்பள்ளியெழுச்சி":    "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருப்பள்ளியெழுச்சி",
  "அமலனாதிபிரான்":          "ஸ்ரீ திருப்பாணாழ்வார் அருளிச்செய்த அமலனாதிபிரான்",
  "கண்ணிநுண்சிறுத்தாம்பு":  "ஸ்ரீ மதுரகவி ஆழ்வார் அருளிச்செய்த கண்ணிநுண்சிறுத்தாம்பு",
  "பெரிய திருமொழி":          "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரிய திருமொழி",
  "திருகுறுந்தாண்டகம்":      "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருகுறுந்தாண்டகம்",
  "திருநெடுந்தாண்டகம்":     "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருநெடுந்தாண்டகம்",
  "முதல்‌ திருவந்தாதி":      "ஸ்ரீ பொய்கையாழ்வார்‌ அருளிச்செய்த முதல்‌ திருவந்தாதி",
  "இரண்டாம்‌ திருவந்தாதி":  "ஸ்ரீ பூதத்தாழ்வார்‌ அருளிச்செய்த இரண்டாம்‌ திருவந்தாதி",
  "மூன்றாம்‌ திருவந்தாதி":  "ஸ்ரீ பேயாழ்வார்‌ அருளிச்செய்த மூன்றாம்‌ திருவந்தாதி",
  "நான்முகன்‌திருவந்தாதி":  "ஸ்ரீ திருமழிசைப்பிரான்‌ அருளிச்செய்த நான்முகன்‌திருவந்தாதி",
  "திருவிருத்தம்":            "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த ருக்வேதஸாரமான திருவிருத்தம்",
  "திருவாசிரியம்":            "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த யஜுர்வேதஸாரமான திருவாசிரியம்",
  "பெரியதிருவந்தாதி":        "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த அதர்வணவேத ஸாரமான பெரியதிருவந்தாதி",
  "திருவெழுகூற்றிருக்கை":   "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருவெழுகூற்றிருக்கை",
  "சிறியதிருமடல்":            "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த சிறியதிருமடல்",
  "பெரியதிருமடல்":           "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரியதிருமடல்",
  "இராமாநுச நூற்றந்தாதி":   "ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த ப்ரபந்நகாயத்ரி என்னும்‌ இராமாநுச நூற்றந்தாதி",
  "உபதேசரத்தினமாலை":        "ஸ்ரீ பெரியஜீயர் அருளிச்செய்த உபதேசரத்தினமாலை",
  "திருவாய்மொழி":            "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி",
  "திருவாய்மொழி நூற்றந்தாதி":"ஸ்ரீ மணவாள மாமுனிகள் அருளிச்செய்த திருவாய்மொழி நூற்றந்தாதி",
  "ஞானசாரம்":                "பரமகாருணிகரான அருளாளப் பெருமாள் எம்பெருமானார் திருவாய் மலர்ந்தருளிய ஞானசாரம்",
  "ப்ரமேயஸாரம்":             "பரமகாருணிகரான அருளாளப் பெருமாள் எம்பெருமானார் திருவாய் மலர்ந்தருளிய ப்ரமேயஸாரம்",
  "ஸப்தகாதை":               "ஸ்ரீ விலாஞ்சோலைப்பிள்ளை அருளிச்செய்த ஸப்தகாதை",
  "ஆர்த்தி ப்ரபந்தம்":       "ஸ்ரீ மணவாள மாமுனிகள் அருளிச்செய்த ஆர்த்தி ப்ரபந்தம்"
};

// Known custom entity key → Tamil label (fallback when API unavailable)
// Keyed by both string key AND numeric id
const CUSTOM_KEY_MAP = {
  "pothu_sattrumurai": "பொது சாற்றுமுறை",
  "koil_thirumozhi":    "கோயில் திருமொழி",
  "koil_thiruvaimozhi": "கோயில் திருவாய்மொழி",
  "1": "கோயில் திருமொழி",    // numeric id fallback
  "2": "கோயில் திருவாய்மொழி" // numeric id fallback
};

// Helper: resolve any display name through respectful section heading map
function _sectionHeading(name) {
  return SECTION_HEADER_MAP[name] || name;
}

// ── CSS — loaded from external file ─────────────────────────
function injectCSS() {
  if (document.getElementById("fathn-style")) return;
  const link = document.createElement("link");
  link.id   = "fathn-style";
  link.rel  = "stylesheet";
  link.href = new URL("./fullAzhwarThirunatchathra.css", import.meta.url).href;
  document.head.appendChild(link);
}

export function thirunatchathraSpinner() {
  return `<div class="fathn-spinner">
    <div class="fathn-lotus">🪷</div>
    <div class="fathn-loading-text">Loading...</div>
  </div>`;
}

function floatNav() {
  return `<div class="fathn-float-nav">
    <button onclick="window._fathnBackToList && window._fathnBackToList()">◀</button>
    <button onclick="window.scrollTo({top:0,behavior:'smooth'})">⬆</button>
    <button onclick="window.scrollBy({top:-window.innerHeight*.85,behavior:'smooth'})">▲</button>
    <button onclick="window.scrollBy({top:window.innerHeight*.85,behavior:'smooth'})">▼</button>
    <button onclick="window._fathnFont(2)">A+</button>
    <button onclick="window._fathnFont(-2)">A-</button>
  </div>`;
}

window._fathnFont = function(delta) {
  const root = document.documentElement;
  const cur  = parseFloat(root.style.getPropertyValue('--base-font')) || 18;
  const next = cur + delta;
  if (next < 12) return;
  root.style.setProperty('--base-font', next + 'px');
};

// ── Render main list ──────────────────────────────────────────
export async function renderFullAzhwarThirunatchathra() {
  injectCSS();

  const azhwars  = AZHWARS.filter(a => a.type === "azhwar");
  const acharyas = AZHWARS.filter(a => a.type === "acharya");

  function card(a) {
    return `
      <div class="fathn-card" onclick="window._fathnOpenModal(${a.author_id})">
        <div>
          <div class="fathn-card-name">${a.name}</div>
          ${a.star ? `<div class="fathn-card-star">⭐ ${a.month} - ${a.star}</div>` : ""}
        </div>
        <div class="fathn-card-arrow">▶</div>
      </div>`;
  }

  const listHtml = `
    <div class="fathn-section-label">ஆழ்வார்கள்</div>
    <div class="fathn-list">${azhwars.map(card).join("")}</div>
    <div class="fathn-section-label" style="margin-top:20px;">ஆச்சார்யர்கள்</div>
    <div class="fathn-list">${acharyas.map(card).join("")}</div>`;

  // Register modal handler
  window._fathnOpenModal = async function(authorId) {
    const azhwar = AZHWARS.find(a => a.author_id === authorId);
    if (!azhwar) return;

    // Fetch recital sequence for this author
    let sequence = [];
    let customItems = [];
    
    // Fetch independently so one failure doesn't kill the other
    try {
      const seqRes = await fetch(`${API}/azhwar-recital?author_id=${authorId}`).then(r => r.json());
      sequence = Array.isArray(seqRes?.sequence) ? seqRes.sequence : [];
    } catch(e) { console.warn("azhwar-recital fetch failed", e); }

    try {
      const custRes = await fetch(`${API}/custom-recital-entities`).then(r => r.json());
      customItems = Array.isArray(custRes) ? custRes : (custRes?.results || []);
    } catch(e) { console.warn("custom-recital-entities fetch failed", e); }

    _showSelectionModal(azhwar, sequence, customItems);
  };

  window._fathnBackToList = function() {
    import("./layout.js").then(m => m.render());
  };

  return `
    <div class="fathn-page" id="fathn-root">
      <div class="fathn-title">ஆழ்வார் திருநட்சத்திர அனுஸந்தானம்</div>
      <div class="fathn-subtitle">Azhwar Thirunatchathra Recital</div>
      <div class="fathn-divider"></div>
      ${listHtml}
    </div>
    <div id="fathn-modal-root"></div>
    ${floatNav()}`;
}

// ── Selection Modal ───────────────────────────────────────────
function _showSelectionModal(azhwar, sequence, customItems) {

  // Build custom item map — keyed by custom_key AND by id (numeric)
  const custMap = {};
  for (const c of customItems) {
    custMap[c.custom_key] = c.tamil_name;          // "koil_thirumozhi" → name
    if (c.id != null) custMap[String(c.id)] = c.tamil_name;  // "1" → name
    if (c.custom_recital_entity_id != null)
      custMap[String(c.custom_recital_entity_id)] = c.tamil_name;
  }

  // Separate compulsory vs optional
  const compulsory = sequence.filter(s => !s.is_optional);
  const optional   = sequence.filter(s =>  s.is_optional);

  // Track user selections (all optional selected by default)
  const selected = new Set(optional.map(s => s.sequence_no));

  // Build lookup: section entity_id → short section name (for pasuram/thaniyan labels)
  const sectionNameById = {};
  for (const s of sequence) {
    if (s.entity_type === "section") {
      sectionNameById[s.entity_id] = s.content?.display_name || "";
    }
  }

  function itemLabel(s) {
    // Section — use respectful full heading from map
    if (s.entity_type === "section") {
      const dn = s.content?.display_name || "";
      return _sectionHeading(dn) || `பிரிவு ${s.entity_id}`;
    }
    // Custom — entity_id may be numeric or string key
    if (s.entity_type === "custom") {
      const eid = String(s.entity_id);
      return custMap[eid] || custMap[s.entity_id] ||
             CUSTOM_KEY_MAP[eid] || CUSTOM_KEY_MAP[s.entity_id] ||
             s.entity_id;
    }
    // Thaniyan — "ஸ்ரீ நம்மாழ்வார் அருளிச்செய்த... திருவிருத்தம் தனியன்" or தனியன்கள்
    if (s.entity_type === "thaniyan") {
      const ref = s.content?.ref || "";
      const secId = ref.startsWith("section_") ? Number(ref.replace("section_","")) : null;
      const rawName = secId ? (sectionNameById[secId] || "") : "";
      const fullName = rawName ? _sectionHeading(rawName) : "";
      // Count siblings to decide தனியன் vs தனியன்கள்
      const sibCount = sequence.filter(si =>
        si.entity_type === "thaniyan" && (si.content?.ref || "") === ref
      ).length;
      const word = sibCount > 1 ? "தனியன்கள்" : "தனியன்";
      return fullName ? `${fullName} ${word}` : word;
    }
    // Pasuram — show "SectionName சாற்றுமுறை பாசுரம்" so user knows what it is
    if (s.entity_type === "pasuram") {
      const secName = s.content?.section_name ||
                      sectionNameById[s.content?.section_id] || "";
      return secName ? `${secName} — சாற்றுமுறை பாசுரம்` : `சாற்றுமுறை பாசுரம்`;
    }
    if (s.entity_type === "fixed_text") return `சாற்றுமுறை`;
    if (s.entity_type === "vazhi")      return `வாழி திருநாமம்`;
    if (s.entity_type === "pathu")      return `பத்து ${s.entity_id}`;
    const heading = s.content?.display_name || s.content?.title || s.content?.name;
    if (heading) return _sectionHeading(heading);
    return `${s.entity_type} ${s.entity_id}`;
  }

  function buildModalHtml() {
    // ONE unified list — all items in sequence order.
    // Compulsory: no checkbox, just label.
    // Optional: checkbox inline right on the item, no separate section below.
    // Optional children (thaniyan/pasuram of a section) indented under parent.
    const allRendered = [];
    const renderedSeqNos = new Set();

    for (const s of sequence) {
      if (renderedSeqNos.has(s.sequence_no)) continue;
      renderedSeqNos.has(s.sequence_no); // just checking — add below
      const isOptional = !!s.is_optional;

      const row = (item, indent) => {
        const isOpt = !!item.is_optional;
        return `
          <div class="fathn-seq-item${isOpt ? "" : " compulsory"}"
            id="fathn-opt-${item.sequence_no}"
            style="${indent ? "margin-left:18px;border-left:2px solid #e0c97a;padding-left:8px;" : ""}">
            ${isOpt ? `<input type="checkbox"
              ${selected.has(item.sequence_no) ? "checked" : ""}
              onchange="window._fathnToggle(${item.sequence_no}, this.checked)"
              style="width:18px;height:18px;accent-color:#4a2c00;cursor:pointer;flex-shrink:0;margin-top:2px;" />` : ""}
            <div class="fathn-seq-label">${itemLabel(item)}</div>
          </div>`;
      };

      renderedSeqNos.add(s.sequence_no);
      allRendered.push(row(s, false));

      // If this is a section, render its optional children indented right below
      if (s.entity_type === "section") {
        const secId = s.entity_id;
        const children = sequence.filter(o =>
          !renderedSeqNos.has(o.sequence_no) && o.is_optional && (
            (o.entity_type === "thaniyan" && o.content?.ref === `section_${secId}`) ||
            (o.entity_type === "pasuram"  && o.content?.section_id === secId)
          )
        );
        for (const child of children) {
          renderedSeqNos.add(child.sequence_no);
          allRendered.push(row(child, true));
        }
      }
    }

    return `
      <div class="fathn-modal-overlay" id="fathn-modal-overlay"
           onclick="if(event.target===this)window._fathnCloseModal()">
        <div class="fathn-modal">
          <div class="fathn-modal-title">${azhwar.name}</div>
          ${azhwar.star ? `<div class="fathn-modal-sub">⭐ ${azhwar.month} மாதம் — ${azhwar.star} திருநட்சத்திரம்</div>` : ""}
          <div class="fathn-modal-greeting">
            🙏 Adiyen — Select the Arulicheyal you want to recite.
          </div>

          ${sequence.length ? allRendered.join("") : `
            <div style="text-align:center;color:#aaa;padding:20px;font-size:14px;">
              🙏 The Recital sequence <br/>
              soon will be updated
            </div>`}

          <div class="fathn-modal-actions">
            <button class="fathn-modal-btn cancel"
              onclick="window._fathnCloseModal()">close</button>
            ${sequence.length ? `
            <button class="fathn-modal-btn confirm"
              onclick="window._fathnStartRecital(${azhwar.author_id})">
              🙏 Start
            </button>` : ""}
          </div>
        </div>
      </div>`;
  }

  // Build map: section sequence_no → child sequence_nos (thaniyan + pasurams)
  // so deselecting a section auto-deselects all its children
  const sectionToChildren = {};
  for (const s of optional) {
    if (s.entity_type === "section") {
      const secId = s.entity_id;
      const children = optional.filter(o =>
        (o.entity_type === "thaniyan" && o.content?.ref === `section_${secId}`) ||
        (o.entity_type === "pasuram"  && o.content?.section_id === secId)
      ).map(o => o.sequence_no);
      if (children.length) sectionToChildren[s.sequence_no] = children;
    }
  }

  // Toggle optional selection
  window._fathnToggle = function(seqNo, checked) {
    if (checked) {
      selected.add(seqNo);
    } else {
      selected.delete(seqNo);
      // If a section is deselected, deselect its thaniyan + pasurams too
      if (sectionToChildren[seqNo]) {
        for (const childSeqNo of sectionToChildren[seqNo]) {
          selected.delete(childSeqNo);
          const cb = document.getElementById(`fathn-opt-${childSeqNo}`)?.querySelector("input");
          if (cb) cb.checked = false;
        }
      }
    }
  };

  window._fathnCloseModal = function() {
    const m = document.getElementById("fathn-modal-overlay");
    if (m) m.remove();
  };

  window._fathnStartRecital = async function(authorId) {
    window._fathnCloseModal();
    const app = document.getElementById("fathn-root") ||
                document.getElementById("app");
    if (app) app.innerHTML = `<div class="fathn-spinner">
      <div class="fathn-lotus">🪷</div>
      <div class="fathn-loading-text">Content Loading...</div>
    </div>`;

    // Build selected sequence_nos: all compulsory + user-selected optional
    const seqNos = [
      ...compulsory.map(s => s.sequence_no),
      ...optional.filter(s => selected.has(s.sequence_no)).map(s => s.sequence_no)
    ].sort((a, b) => a - b);

    const html = await _renderRecital(azhwar, sequence, seqNos, customItems);
    if (app) app.innerHTML = html;
  };

  // Mount modal
  const root = document.getElementById("fathn-modal-root");
  if (root) root.innerHTML = buildModalHtml();
}

// ── Render the actual recital ─────────────────────────────────
async function _renderRecital(azhwar, sequence, selectedSeqNos, customItems) {

  const selectedItems = sequence
    .filter(s => selectedSeqNos.includes(s.sequence_no))
    .sort((a, b) => a.sequence_no - b.sequence_no);

  // Build section name lookup for thaniyan headings
  const sectionNameById = {};
  for (const s of sequence) {
    if (s.entity_type === "section") {
      sectionNameById[s.entity_id] = s.content?.display_name || "";
    }
  }

  let html = `
    <div class="fathn-page">

      <div class="fathn-back-btn"
        onclick="window._fathnBackToList && window._fathnBackToList()">
        ◀ Back
      </div>

      <div class="fathn-recital-header">
        ${azhwar.name}
      </div>

      ${azhwar.star ? `
        <div class="fathn-recital-star">
          ⭐ ${azhwar.month} மாதம் — ${azhwar.star} திருநட்சத்திரம்
        </div>
      ` : ""}
  `;

  let sattrumuraiStarted = false;
  let pothuStarted = false;
  let vazhiStarted = false;

  for (const item of selectedItems) {

    console.log("RECITAL ITEM", item);

    try {

      // ─────────────────────────────────────────
      // THANIYAN
      // ─────────────────────────────────────────
      if (item.entity_type === "thaniyan") {
        const t = item.content;
        if (!t) continue;

        // Count how many thaniyans belong to the same section (for தனியன்/தனியன்கள்)
        const sectionRef = t.ref || "";
        const siblingCount = selectedItems.filter(si =>
          si.entity_type === "thaniyan" &&
          si.content?.ref === sectionRef
        ).length;
        const thaniyanWord = siblingCount > 1 ? "தனியன்கள்" : "தனியன்";

        // Derive section name from ref (e.g. "section_1" → section_id=1 → name)
        let secFullName = "";
        if (sectionRef === "global") {
          secFullName = "";
        } else {
          const secIdFromRef = Number(sectionRef.replace("section_", ""));
          const secRawName   = sectionNameById[secIdFromRef] || t.title || "";
          secFullName = _sectionHeading(secRawName);
        }

        const thaniyanHeading = secFullName
          ? `${secFullName} ${thaniyanWord}`
          : (t.title ? `${_sectionHeading(t.title)} ${thaniyanWord}` : thaniyanWord);

        html += `
          <div class="fathn-thaniyan-box">
            <div class="fathn-thaniyan-heading">${thaniyanHeading}</div>
            <div class="fathn-thaniyan-lines">
              ${(t.lines || []).map(l => {
                const line = l.line_text || l.text || "";
                if (line.trim().startsWith("(") && line.trim().endsWith(")")) {
                  return `<span class="fathn-thaniyan-label">${line}</span>`;
                }
                return `<span class="fathn-line">${line}</span>`;
              }).join("")}
            </div>
          </div>
        `;
      }

      // ─────────────────────────────────────────
      // SECTION — mirrors pasuram_full.js exactly
      // pathu header once, thirumozhi header once,
      // display items once per group, adivaravu at end
      // ─────────────────────────────────────────
      else if (item.entity_type === "section") {
        const s = item.content;
        if (!s) continue;

        const pasurams = s.pasurams || [];

        // Section heading box — open
        html += `<div class="fathn-thaniyan-box">`;
        html += `<div class="fathn-thaniyan-heading">${_sectionHeading(s.display_name)}</div>`;

        // Section-level display items (not adivaravu) shown once at top
        const secDispItems = (s.display_items || [])
          .filter(d => d.text && !d.text.includes("அடிவரவு"));
        if (secDispItems.length) {
          html += `<div class="fathn-display-block">`;
          for (const d of secDispItems)
            html += `<div class="fathn-display-item">${d.text}</div>`;
          html += `</div>`;
        }

        let _lastPathu    = null;
        let _lastThiru    = null;
        let _lastProsody  = null;

        for (let pi = 0; pi < pasurams.length; pi++) {
          const p    = pasurams[pi];
          const next = pasurams[pi + 1];
          const disp = p.display_items || [];

          // ── Pathu header (once per pathu change) ──
          if (p.pathu_id != null && p.pathu_id !== _lastPathu) {
            _lastPathu   = p.pathu_id;
            _lastThiru   = null;
            html += `<div class="fathn-prabandham-header">`;
            html += `<div class="fathn-ph-line1">${p.section_name || s.display_name || ""}</div>`;
            html += `<div class="fathn-ph-line2">${p.pathu_name || ""} — ${p.pathu_subunit_name || ""}</div>`;
            html += `</div>`;
          }

          // ── Thirumozhi heading (once per thirumozhi change) ──
          if (p.pathu_id != null) {
            // pathu structure — heading from thirumozhi_heading
            const th = p.thirumozhi_heading || "";
            if (th && th !== _lastThiru) {
              _lastThiru = th;
              html += `<div class="fathn-ph-line3">${th}</div>`;
              // Display items for this pathu (carnatic etc — not adivaravu)
              const pathuDisp = disp.filter(d => d.text && !d.text.includes("அடிவரவு"));
              if (pathuDisp.length) {
                html += `<div class="fathn-display-block">`;
                for (const d of pathuDisp)
                  html += `<div class="fathn-display-item">${d.text}</div>`;
                html += `</div>`;
              }
            }
          } else if (p.thirumozhi_id != null && p.thirumozhi_id !== _lastThiru) {
            // direct thirumozhi structure
            if (_lastThiru !== null) html += `</div>`; // close prev unit
            _lastThiru = p.thirumozhi_id;
            html += `<div class="fathn-thirumozhi-unit">`;
            html += `<div class="fathn-prabandham-header">`;
            html += `<div class="fathn-ph-line1">${p.section_name || s.display_name || ""}</div>`;
            html += `<div class="fathn-ph-line2">${p.thirumozhi_name || ""}</div>`;
            html += `</div>`;
            const th = p.thirumozhi_heading || "";
            if (th) html += `<div class="fathn-ph-line3">${th}</div>`;
            // Display items for this thirumozhi
            const thiruDisp = disp.filter(d => d.text && !d.text.includes("அடிவரவு"));
            if (thiruDisp.length) {
              html += `<div class="fathn-display-block">`;
              for (const d of thiruDisp)
                html += `<div class="fathn-display-item">${d.text}</div>`;
              html += `</div>`;
            }
          }

          // ── Prosody (once per change) ──
          if (p.prosody && p.prosody !== _lastProsody) {
            html += `<div class="fathn-carnatic">${p.prosody}</div>`;
            _lastProsody = p.prosody;
          }

          // ── Pasuram per-item display (carnatic per pasuram if present) ──
          const pasuramDisp = disp.filter(d => d.text && !d.text.includes("அடிவரவு"));
          // Only show pasuram-level display if NOT already shown at pathu/thirumozhi level
          // (worker merges them — if pathu_id exists and we already showed them above, skip)
          // We show pasuram-level only if no pathu and no thirumozhi grouping
          if (!p.pathu_id && !p.thirumozhi_id && pasuramDisp.length) {
            html += `<div class="fathn-display-block">`;
            for (const d of pasuramDisp)
              html += `<div class="fathn-display-item">${d.text}</div>`;
            html += `</div>`;
          }

          // ── Render pasuram lines ──
          html += _renderPasuram(p, 0, null, false);

          // ── Adivaravu at end of pathu ──
          const isLastOfPathu = p.pathu_id && (!next || next.pathu_id !== p.pathu_id);
          if (isLastOfPathu) {
            const adiv = disp.find(d => d.text && d.text.includes("அடிவரவு"));
            if (adiv) html += `<div class="fathn-adivaravu">${adiv.text}</div>`;
          }

          // ── Adivaravu at end of thirumozhi ──
          const isLastOfThiru = p.thirumozhi_id && (!next || next.thirumozhi_id !== p.thirumozhi_id);
          if (isLastOfThiru) {
            const adiv = disp.find(d => d.text && d.text.includes("அடிவரவு"));
            if (adiv) html += `<div class="fathn-adivaravu">${adiv.text}</div>`;
            if (p.thirumozhi_id != null && p.pathu_id == null) {
              html += `</div>`; // close thirumozhi-unit
              _lastThiru = null;
            }
          }

          // ── Section closing + முற்றிற்று at very end ──
          const isLast = !next;
          if (isLast) {
            if (s.closing_text)
              html += `<div class="fathn-closing">${s.closing_text}</div>`;
            html += `<div class="fathn-section-final">${_sectionHeading(s.display_name)} முற்றிற்று</div>`;
          }
        }

        html += `</div>`; // close fathn-thaniyan-box
      }

      // ─────────────────────────────────────────
      // PASURAM (சாற்றுமுறை individual pasurams)
      // All pasurams go into ONE box with ONE heading
      // ─────────────────────────────────────────
      else if (item.entity_type === "pasuram") {

        if (!sattrumuraiStarted) {
          sattrumuraiStarted = true;
          html += `<div class="fathn-thaniyan-box" style="margin-top:24px;">
            <div class="fathn-thaniyan-heading">${azhwar.name} சாற்றுமுறை</div>`;
        }

        const p = item.content;
        if (!p) continue;
        html += _renderPasuram(p, item.is_dual_recital, null, true);

        // Close the box after the last pasuram item in the sequence
        const isLastPasuram = (() => {
          const allPasurams = selectedItems.filter(i => i.entity_type === "pasuram");
          return allPasurams[allPasurams.length - 1]?.sequence_no === item.sequence_no;
        })();
        if (isLastPasuram) html += `</div>`;
      }

      // ─────────────────────────────────────────
      // FIXED TEXT
      // ─────────────────────────────────────────
      else if (item.entity_type === "fixed_text") {

        const f = item.content;
        if (!f) continue;

        if (!pothuStarted) {

          pothuStarted = true;

          html += `
            <div class="fathn-section-head"
              style="
                margin-top:28px;
                background:#f8fff2;
                border:2px solid #8fb46a;
                border-radius:8px;
                padding:10px;
              ">
              பொது சாற்றுமுறை
            </div>
          `;
        }

        html += `
          <div class="fathn-thaniyan-box">
            ${f.name ? `<div class="fathn-thaniyan-heading">${f.name}</div>` : ""}
            <div class="fathn-fixed-lines">
              ${(f.lines || []).map(line => {
                if (line.trim().startsWith("(") && line.trim().endsWith(")")) {
                  return `<span class="fathn-author-label">${line}</span>`;
                }
                return `<span class="fathn-line">${line}</span>`;
              }).join("")}
            </div>
          </div>
        `;
      }

      // ─────────────────────────────────────────
      // CUSTOM (பொது சாற்றுமுறை etc.)
      // ─────────────────────────────────────────
      else if (item.entity_type === "custom") {
        // Custom entities: கோயில் திருமொழி / கோயில் திருவாய்மொழி
        // The worker stores custom_key + tamil_name in content.
        // Actual pasurams are in the full sequence as section items
        // tagged with matching koilTitle — find and render them here.
        const c = item.content;
        const koilTitle = (c && c.tamil_name) ||
                          CUSTOM_KEY_MAP[item.entity_id] ||
                          item.entity_id;

        // Custom entity content comes from the worker's custom map.
        // The worker returns: { custom_key, tamil_name, pasurams?, sections? }
        // If pasurams are embedded in content — render them directly.
        // Otherwise fall back to filtering sequence section items.

        // Case 1: worker returns pasurams directly in content
        const directPasurams = c?.pasurams || c?.sections?.[0]?.pasurams || [];

        // Case 2: find matching section items already in sequence
        const koilSections = sequence.filter(si =>
          si.entity_type === "section" &&
          si.content &&
          (si.content.display_name === koilTitle ||
           (si.content.display_name || "").includes(koilTitle))
        );

        html += `<div class="fathn-thaniyan-box">
            <div class="fathn-thaniyan-heading">${koilTitle}</div>`;

        if (directPasurams.length) {
          let lastProsody = null;
          for (const p of directPasurams) {
            html += _renderPasuram(p, 0, lastProsody, false);
            if (p.prosody) lastProsody = p.prosody;
          }
        } else if (koilSections.length) {
          for (const ks of koilSections) {
            const s = ks.content;
            const secDisp     = s.display_items || [];
            const secCarnatic = secDisp.find(d => d.key === "carnatic");
            const adivaravu   = secDisp.find(d => d.key === "adivaravu");
            if (secCarnatic) html += `<div class="fathn-carnatic">${secCarnatic.text}</div>`;
            let lastProsody = null;
            for (const p of (s.pasurams || [])) {
              html += _renderPasuram(p, 0, lastProsody, false);
              if (p.prosody) lastProsody = p.prosody;
            }
            if (adivaravu) html += `<div class="fathn-adivaravu">${adivaravu.text}</div>`;
            if (s.closing_text) html += `<div class="fathn-closing">${s.closing_text}</div>`;
          }
        } else {
          // Last fallback: individual pasurams tagged with this section in sequence
          const koilSeqItems = sequence.filter(si =>
            si.entity_type === "pasuram" &&
            si.content?.section_name === koilTitle
          );
          let lastProsody = null;
          for (const si of koilSeqItems) {
            html += _renderPasuram(si.content, 0, lastProsody, false);
            if (si.content?.prosody) lastProsody = si.content.prosody;
          }
        }

        const closing = koilTitle + " முற்றிற்று";
        html += `
            <div class="fathn-closing">${closing}</div>
          </div>
        `;
      }

      // ─────────────────────────────────────────
      // MADAL SATTRUMURAI (author 12 — couplet structure)
      // ─────────────────────────────────────────
      else if (item.entity_type === "madal_sattrumurai") {

        const m = item.content;
        if (!m) continue;

        if (!sattrumuraiStarted) {
          sattrumuraiStarted = true;
          html += `<div class="fathn-thaniyan-box" style="margin-top:24px;">
            <div class="fathn-thaniyan-heading">${azhwar.name} சாற்றுமுறை</div>`;
        }

        // Each madal_sattrumurai item is one couplet/unit — show title + lines
        html += `<div class="fathn-pasuram-block">`;
        if (m.title) {
          html += `<div class="fathn-global-no">${m.title}</div>`;
        }
        html += `<div class="fathn-lines">`;
        for (const l of (m.lines || [])) {
          const isDual = Number(l.is_dual_recital) === 1;
          html += `<span class="fathn-line">
            ${isDual ? `<span class="fathn-dual-mark">★★</span>` : ""}
            ${l.text || ""}
          </span>`;
        }
        html += `</div></div>`;

        // Close the sattrumurai box after the last madal_sattrumurai item
        const allMadal = selectedItems.filter(i => i.entity_type === "madal_sattrumurai");
        if (allMadal[allMadal.length - 1]?.sequence_no === item.sequence_no) {
          html += `</div>`;
        }
      }

      // ─────────────────────────────────────────
      // VAZHI
      // ─────────────────────────────────────────
      else if (item.entity_type === "vazhi") {

        const v = item.content;
        if (!v) continue;

        if (!vazhiStarted) {

          vazhiStarted = true;

          html += `
            <div class="fathn-section-head"
              style="
                margin-top:28px;
                background:#f7f8ff;
                border:2px solid #7c89d9;
                border-radius:8px;
                padding:10px;
              ">
              வாழித் திருநாமம்
            </div>
          `;
        }

        html += `
          <div class="fathn-thaniyan-box">
            <div class="fathn-thaniyan-heading">வாழி திருநாமம்</div>
            ${v.vazhi_name ? `<span class="fathn-vazhi-author">${v.vazhi_name}</span>` : ""}
            ${(v.groups || []).map(g => `
              <div class="fathn-vazhi-group">
                <div class="fathn-vazhi-lines">
                  ${(g.lines || []).map(line => `<span class="fathn-line">${line}</span>`).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }

    } catch(e) {

      console.error(e);

      html += `
        <div style="
          color:#aaa;
          text-align:center;
          padding:10px;
          font-size:13px;
        ">
          ${item.entity_type} ${item.entity_id}
          — Error in Updation
        </div>
      `;
    }
  }

  if (!selectedItems.length) {

    html += `
      <div style="
        text-align:center;
        color:#aaa;
        padding:40px;
        font-size:14px;
      ">
        🙏 You have not selected anything to recite
      </div>
    `;
  }

  html += `
      <div style="
        text-align:center;
        color:#b38b2e;
        font-size:18px;
        letter-spacing:5px;
        margin:30px 0;
      ">
        ❖ ❖ ❖ ❖ ❖
      </div>

    </div>
  `;

  return html + floatNav();
}


function _renderThaniyanBlock(thaniyans, label) {
  if (!thaniyans?.length) return "";
  let html = `<div class="fathn-thaniyan-box">
    <div class="fathn-thaniyan-heading">${label}</div>`;
  for (const th of thaniyans) {
    if (th.title) html += `<div class="fathn-thaniyan-label">(${th.title} அருளிச்செய்தது)</div>`;
    html += `<div class="fathn-thaniyan-lines">`;
    for (const ln of th.lines || []) {
      const line = ln.line_text || "";
      if (line.trim().startsWith("(") && line.trim().endsWith(")")) {
        html += `<span class="fathn-thaniyan-label">${line}</span>`;
      } else {
        html += `<span class="fathn-line">${line}</span>`;
      }
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function _renderPasuram(p, isDualRecital = 0, lastProsody = null, useDoubleRecital = false) {
  if (!p) return "";

  // ★★ only from sequence is_dual_recital
  // useDoubleRecital=true only for standalone pasuram entity type
  const isDual = Number(isDualRecital) === 1 ||
                 (useDoubleRecital && Number(p.double_recital) === 1);

  // Carnatic per pasuram — shown ABOVE lines
  const carnaticItem = (p.display_items || []).find(d => d.key === "carnatic");
  const carnaticHtml = carnaticItem
    ? `<div class="fathn-carnatic">${carnaticItem.text}</div>` : "";

  // Prosody — only show if changed from previous
  const prosodyHtml = (p.prosody && p.prosody !== lastProsody)
    ? `<div class="fathn-carnatic">${p.prosody}</div>` : "";

  // Lines with recital group gaps
  let lines = p.lines || [];
  let linesHtml = "";
  let prevGroup = null;
  lines.forEach((l, idx) => {
    const text  = typeof l === "object" ? (l.text  || "") : l;
    const group = typeof l === "object" ? (l.group || 1)  : 1;
    if (prevGroup !== null && group !== prevGroup) {
      linesHtml += `<span class="fathn-group-gap"></span>`;
    }
    prevGroup = group;
    // On last line — add local no inline using flex
    const isLast = idx === lines.length - 1;
    const localNo = p.local_no || p.local_pasuram_no || "";
    const dualMark = (idx === 0 && isDual)
      ? `<span class="fathn-dual-mark">★★</span>` : "";
    if (isLast && localNo) {
      linesHtml += `<span class="fathn-line" style="display:flex;justify-content:space-between;align-items:baseline;">
        <span>${dualMark}${text}</span>
        <span class="fathn-local-no">${localNo}</span>
      </span>`;
    } else {
      linesHtml += `<span class="fathn-line">${dualMark}${text}</span>`;
    }
  });

  return `
    <div class="fathn-pasuram-block">
      <div class="fathn-global-no">${p.global_no || ""}</div>
      ${prosodyHtml}
      ${carnaticHtml}
      <div class="fathn-lines">${linesHtml}</div>
    </div>
  `;
}