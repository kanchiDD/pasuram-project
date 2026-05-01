// nncIndex.js — index builder with expand/collapse

const KOIL_THIRUMOZHI_CHILDREN = [
  { label: "முதற்பத்து — முதல் திருமொழி — வாடினேன்",                  pathuId: 44  },
  { label: "முதற்பத்து — ஏழாம் திருமொழி — அங்கண் ஞாலம்",             pathuId: 50  },
  { label: "முதற்பத்து — ஒன்பதாம் திருமொழி — தாயே தந்தை",            pathuId: 52  },
  { label: "இரண்டாம் பத்து — மூன்றாம் திருமொழி — விற்பெரு",          pathuId: 56  },
  { label: "இரண்டாம் பத்து — நான்காம் திருமொழி — அன்று ஆயர்",       pathuId: 57  },
  { label: "இரண்டாம் பத்து — ஆறாம் திருமொழி — நண்ணாத",              pathuId: 59  },
  { label: "இரண்டாம் பத்து — ஏழாம் திருமொழி — திவளும்",              pathuId: 60  },
  { label: "மூன்றாம் பத்து — ஆறாம் திருமொழி — தூவிரிய",              pathuId: 69  },
  { label: "நான்காம் பத்து — ஒன்பதாம் திருமொழி — நும்மை",            pathuId: 82  },
  { label: "ஐந்தாம் பத்து — எட்டாம் திருமொழி — ஏழை ஏதலன்",         pathuId: 91  },
  { label: "ஆறாம் பத்து — ஒன்பதாம் திருமொழி — பெடை அடர்த்த",       pathuId: 102 },
  { label: "ஏழாம் பத்து — நான்காம் திருமொழி — கண்சோர",               pathuId: 107 },
  { label: "எட்டாம் பத்து — இரண்டாம் திருமொழி — தெள்ளியீர்",        pathuId: 115 },
  { label: "ஒன்பதாம் பத்து — ஒன்பதாம் திருமொழி — மூவரில்",          pathuId: 132 },
  { label: "பத்தாம் பத்து — எட்டாம் திருமொழி — காதில் கடிப்பிட்டு", pathuId: 141 },
  { label: "பதினொன்றாம் பத்து — எட்டாம் திருமொழி — மாற்றம் உள",     pathuId: 151 }
];

const KOIL_THIRUVAIMOZHI_CHILDREN = [
  { label: "முதற்பத்து — முதல் திருவாய்மொழி — உயர்வற",                      pathuId: 152 },
  { label: "முதற்பத்து — இரண்டாம் திருவாய்மொழி — வீடுமின்",                 pathuId: 153 },
  { label: "இரண்டாம் பத்து — பத்தாம் திருவாய்மொழி — கிளரொளி",              pathuId: 171 },
  { label: "மூன்றாம் பத்து — மூன்றாம் திருவாய்மொழி — ஒழுவில்காலமெல்லாம்", pathuId: 174 },
  { label: "நான்காம் பத்து — முதல் திருவாய்மொழி — ஒருநாயகமாய்",            pathuId: 182 },
  { label: "நான்காம் பத்து — பத்தாம் திருவாய்மொழி — ஒன்றும்தேவும்",        pathuId: 191 },
  { label: "ஐந்தாம் பத்து — எட்டாம் திருவாய்மொழி — ஆராவமுதே",             pathuId: 199 },
  { label: "ஆறாம் பத்து — பத்தாம் திருவாய்மொழி — உலகமுண்ட",               pathuId: 211 },
  { label: "ஏழாம் பத்து — இரண்டாம் திருவாய்மொழி — கங்குலும் பகலும்",      pathuId: 213 },
  { label: "ஏழாம் பத்து — நான்காம் திருவாய்மொழி — ஆழிஎழ",                 pathuId: 215 },
  { label: "எட்டாம் பத்து — பத்தாம் திருவாய்மொழி — நெடுமாற்கடிமை",        pathuId: 231 },
  { label: "ஒன்பதாம் பத்து — பத்தாம் திருவாய்மொழி — மாலைநண்ணி",           pathuId: 241 },
  { label: "பத்தாம் பத்து — ஒன்பதாம் திருவாய்மொழி — சூழ்விசும்பு",        pathuId: 250 },
  { label: "பத்தாம் பத்து — பத்தாம் திருவாய்மொழி — முனியே",                pathuId: 251 }
];

// All 34 vazhi thirunamam entries with their vazhi_id
const VAZHI_CHILDREN = [
  { vazhi_id:  1, name: "பெரிய பெருமாள்" },
  { vazhi_id:  2, name: "பெரிய பிராட்டியார்" },
  { vazhi_id:  3, name: "சேனைமுதலியார்" },
  { vazhi_id:  4, name: "நம்மாழ்வார்" },
  { vazhi_id:  5, name: "ஸ்ரீமந்நாதமுனிகள்" },
  { vazhi_id:  6, name: "உய்யக்கொண்டார்" },
  { vazhi_id:  7, name: "மணக்கால்நம்பி" },
  { vazhi_id:  8, name: "ஆளவந்தார்" },
  { vazhi_id:  9, name: "பெரியநம்பிகள்" },
  { vazhi_id: 10, name: "திருக்கச்சிநம்பிகள்" },
  { vazhi_id: 11, name: "எம்பெருமானார்" },
  { vazhi_id: 12, name: "கூரத்தாழ்வான்" },
  { vazhi_id: 13, name: "முதலியாண்டான்" },
  { vazhi_id: 14, name: "திருவரங்கத்தமுதனார்" },
  { vazhi_id: 15, name: "எம்பார்" },
  { vazhi_id: 16, name: "பெரியபட்டர்" },
  { vazhi_id: 17, name: "நஞ்சீயர்" },
  { vazhi_id: 18, name: "நம்பிள்ளை" },
  { vazhi_id: 19, name: "வடக்குத் திருவீதிப்பிள்ளை" },
  { vazhi_id: 20, name: "பிள்ளைலோகாசாரியர்" },
  { vazhi_id: 21, name: "கூரகுலோத்தம தாஸர்" },
  { vazhi_id: 22, name: "திருவாய்மொழிப்பிள்ளை" },
  { vazhi_id: 23, name: "மணவாளமாமுனிகள்" },
  { vazhi_id: 24, name: "ஆண்டாள்" },
  { vazhi_id: 25, name: "பொய்கை ஆழ்வார்" },
  { vazhi_id: 26, name: "பூதத்தாழ்வார்" },
  { vazhi_id: 27, name: "பேயாழ்வார்" },
  { vazhi_id: 28, name: "திருமழிசை ஆழ்வார்" },
  { vazhi_id: 29, name: "மதுரகவி ஆழ்வார்" },
  { vazhi_id: 30, name: "பெரியாழ்வார்" },
  { vazhi_id: 31, name: "குலசேகராழ்வார்" },
  { vazhi_id: 32, name: "தொண்டரடிப்பொடி ஆழ்வார்" },
  { vazhi_id: 33, name: "திருப்பாணாழ்வார்" },
  { vazhi_id: 34, name: "திருமங்கை ஆழ்வார்" }
];

// ── Register handlers ─────────────────────────────────────────────────────────
export function registerIndexHandlers() {
  window._nncGroup = (gkey) => {
    const ch  = document.getElementById(`nnc-ch-${gkey}`);
    const arr = document.getElementById(`nnc-arr-${gkey}`);
    if (!ch) return;
    const opening = !ch.classList.contains("open");
    // Close all other open groups before opening this one
    document.querySelectorAll(".nnc-idx-children.open").forEach(el => {
      if (el.id !== `nnc-ch-${gkey}`) {
        el.classList.remove("open");
        const otherKey = el.id.replace("nnc-ch-", "");
        const otherArr = document.getElementById(`nnc-arr-${otherKey}`);
        if (otherArr) otherArr.classList.remove("open");
      }
    });
    ch.classList.toggle("open", opening);
    if (arr) arr.classList.toggle("open", opening);
  };

  window._nncGo = (id) => {
    const el = document.getElementById("nnc-item-" + id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window._nncGoKoil = (pathuId) => {
    const el = document.getElementById("koil-thiru-" + pathuId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Navigate to specific vazhi entry inside the vazhi section
  window._nncGoVazhi = (vazhiId) => {
    const el = document.getElementById("vazhi-item-" + vazhiId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

// ── Build index HTML ──────────────────────────────────────────────────────────
export function buildIndex(items) {
  let html = `<div class="nnc-index"><div class="nnc-index-title">Index</div>`;

  for (const item of items) {
    if (!item.show_in_index) continue;

    // ── Group header ──────────────────────────────────────────────────────────
    if (item.item_type === "group_header") {
      const gkey = item.group_key;
      let childHtml = "";

      if (gkey === "koil_thirumozhi") {
        childHtml = KOIL_THIRUMOZHI_CHILDREN.map(c =>
          `<div class="nnc-idx-item child"
            onclick="window._nncGoKoil(${c.pathuId})">${c.label}</div>`
        ).join("");

      } else if (gkey === "koil_thiruvaimozhi") {
        childHtml = KOIL_THIRUVAIMOZHI_CHILDREN.map(c =>
          `<div class="nnc-idx-item child"
            onclick="window._nncGoKoil(${c.pathuId})">${c.label}</div>`
        ).join("");

      } else {
        const children = items.filter(x =>
          x.group_key === gkey &&
          x.item_type !== "group_header" &&
          x.item_type !== "section" &&
          x.item_type !== "thaniyan" &&
          x.show_in_index
        );
        childHtml = children.map(c =>
          `<div class="nnc-idx-item child ${!c.is_active ? "dim" : ""}"
            data-nid="${c.id}"
            onclick="${c.is_active ? "window._nncGo(this.dataset.nid)" : ""}">
            ${c.display_label}
            ${!c.is_active ? '<span class="nnc-soon-badge">Soon</span>' : ""}
          </div>`
        ).join("");
      }

      html += `
        <div class="nnc-idx-item group" data-gkey="${gkey}"
          onclick="window._nncGroup(this.dataset.gkey)">
          ${item.display_label}
          <span class="nnc-idx-arrow" id="nnc-arr-${gkey}">▶</span>
        </div>
        <div class="nnc-idx-children" id="nnc-ch-${gkey}">
          ${childHtml}
        </div>`;

    // ── Thaniyan — skip ───────────────────────────────────────────────────────
    } else if (item.item_type === "thaniyan") {
      continue;

    // ── Koil — skip (shown via group) ─────────────────────────────────────────
    } else if (item.item_type === "koil") {
      continue;

    // ── pathu/thirumozhi inside periyazhwar/nachiyar/perumal — skip ───────────
    } else if (
      item.group_key &&
      item.group_key !== "koil_thirumozhi" &&
      item.group_key !== "koil_thiruvaimozhi" &&
      item.item_type !== "section"
    ) {
      continue;

    // ── Vazhi — render as expandable dropdown with all 34 entries ────────────
    } else if (item.item_type === "vazhi") {
      const childHtml = VAZHI_CHILDREN.map(v =>
        `<div class="nnc-idx-item child"
          onclick="window._nncGoVazhi(${v.vazhi_id})">${v.name}</div>`
      ).join("");

      html += `
        <div class="nnc-idx-item group" data-gkey="vazhi"
          onclick="window._nncGroup('vazhi')">
          ${item.display_label}
          <span class="nnc-idx-arrow" id="nnc-arr-vazhi">▶</span>
        </div>
        <div class="nnc-idx-children" id="nnc-ch-vazhi">
          ${childHtml}
        </div>`;

    // ── Everything else → standalone ──────────────────────────────────────────
    } else {
      const isComing = item.item_type === "coming_soon" && !item.is_active;
      html += `
        <div class="nnc-idx-item ${isComing ? "dim" : ""}"
          data-nid="${item.id}"
          onclick="${item.is_active !== false ? `window._nncGo(this.dataset.nid)` : ""}">
          ${item.display_label}
          ${isComing ? '<span class="nnc-soon-badge">Soon</span>' : ""}
        </div>`;
    }
  }

  html += `</div>`;
  return html;
}
