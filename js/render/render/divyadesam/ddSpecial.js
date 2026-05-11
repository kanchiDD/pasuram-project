// =============================================================
// ddSpecial.js — Special Groups (full 4000 only)
// Thirunangur(11) / Navathiruppathi(9) / Irattai(2)
// =============================================================

import { API_DD, DESAM_TOTAL, friendlyLabel, ddSpinner } from "./ddCore.js";

// Verified desam_ids for each special group
const SPECIAL_DESAM_IDS = {
  thirunangur:     [30,31,32,33,34,35,36,37,38,39,40],  // verified
  navathiruppathi: [49,50,52,53,54,55,56,58],            // verified from DB
  irattai:         [50,18]                               // திருதொலைவில்லிமங்கலம் + திருவாலி-திருநகரி
};

const SPECIAL_LABELS = {
  thirunangur:     "Thirunangur Divya Desams (11)",
  navathiruppathi: "Nava Thiruppathi Divya Desams (9)",
  irattai:         "Irattai Thiruppathi (2 Twin-Temple Desams)"
};

const SPECIAL_SUB = {
  thirunangur:     "11 Desams · ஸ்ரீ திருமங்கை ஆழ்வார்",
  navathiruppathi: "9 Thiruppathis",
  irattai:         "2 Irattai Thiruppathis"
};

// ── Special group menu (full 4000 only) ───────────────────────────────────────
export function renderSpecialMenu() {
  const rows = Object.keys(SPECIAL_DESAM_IDS).map(key => `
    <div class="dd-list-item" onclick="ddOpenSpecial('${key}')">
      <div class="dd-list-name">${SPECIAL_LABELS[key]}</div>
      <div class="dd-list-sub">${SPECIAL_SUB[key]}</div>
    </div>`).join("");

  return `
    <div class="dd-list-box">
      <div class="dd-list-heading">Special Divya Desam Groups</div>
      ${rows}
    </div>`;
}

// ── Open special group — fetch from API using known desam_ids ─────────────────
export async function renderSpecialGroup(groupKey) {
  const content = document.getElementById("fdd-content");
  if (content) content.innerHTML = ddSpinner();

  const back = `<div class="dd-back" onclick="ddView('special')">◀ Back to Special Groups</div>`;

  // Fetch the full list and filter to known desam_ids
  const desamIds = SPECIAL_DESAM_IDS[groupKey];
  if (!desamIds) {
    if (content) content.innerHTML = back + `<div style="text-align:center;padding:20px;color:#aaa;">Unknown group</div>`;
    return;
  }

  // Use the API list to get desam details (already cached by ddIndex)
  const allDesams = window._fddAllDesams ||
    await fetch(`${API_DD}?sub=list`).then(r => r.json());

  // Deity name overrides for special desams
  const DEITY_OVERRIDE = {
    50: {
      perumal_name: "ஸ்ரீ தேவப்பிரான் & ஸ்ரீ அரவிந்தலோசனர்",
      thayar_name:  "ஸ்ரீ கருந்தடங்கண்ணி நாயகி & ஸ்ரீ வக்ஷஸ்தல லக்ஷ்மி"
    }
  };

  const desams = desamIds
    .map(id => {
      const d = allDesams.find(d => d.divyadesam_id === id);
      if (!d) return null;
      const override = DEITY_OVERRIDE[id];
      return override ? { ...d, ...override } : d;
    })
    .filter(Boolean);

  if (!desams.length) {
    if (content) content.innerHTML = back +
      `<div style="text-align:center;padding:20px;color:#aaa;">No Desams found</div>`;
    return;
  }

  const listHtml = desams.map(d => {
    const count = DESAM_TOTAL[d.divyadesam_id] || 0;
    const deity = [d.perumal_name, d.thayar_name].filter(Boolean).join(" | ");
    return `
      <div class="dd-list-item" onclick="ddOpenDesam(${d.divyadesam_id})">
        <div>
          <span class="dd-list-name">${d.canonical_name}</span>
          <span class="dd-list-count">(${count})</span>
        </div>
        ${deity ? `<div class="dd-list-sub">${deity}</div>` : ""}
        <div class="dd-list-sub">${friendlyLabel(d.traditional_region)}</div>
      </div>`;
  }).join("");

  if (content) content.innerHTML = back + `
    <div class="dd-list-box">
      <div class="dd-list-heading">${SPECIAL_LABELS[groupKey]} (${desams.length})</div>
      ${listHtml}
    </div>`;
}
