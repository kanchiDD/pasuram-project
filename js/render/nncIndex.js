// nncIndex.js — index builder with expand/collapse
import { getKoilThirumozhi, getKoilThiruvaimozhi, getVazhiChildren } from "../utils/sectUtils.js";



// All 34 vazhi thirunamam entries with their vazhi_id

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
        childHtml = getKoilThirumozhi().map(c =>
          `<div class="nnc-idx-item child"
            onclick="window._nncGoKoil(${c.pathuId})">${c.label}</div>`
        ).join("");

      } else if (gkey === "koil_thiruvaimozhi") {
        childHtml = getKoilThiruvaimozhi().map(c =>
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
      const childHtml = getVazhiChildren().map(v =>
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