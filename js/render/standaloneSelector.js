import { renderPasuram } from "./pasuram.js";
import { t as uiText } from "../utils/uiStrings.js";
import { render } from "./layout.js";
import { state } from "../state.js";
import { isTamilScript } from "../utils/contentStrings.js";

/* ============================================================================
   standaloneSelector — sections 4 and 5 (நாச்சியார் and பெருமாள் திருமொழி)

   These have no pathus, so there is nothing to drill into: one list, and you
   may now tick as many thirumozhis as you like rather than exactly one. The
   modal keeps the size and shape it already had — the only additions are the
   count and the Read button along the foot, which a multiple selection cannot
   do without, since ticking a box can no longer mean "and go".
   ========================================================================= */

function injectStyles() {
  if (document.getElementById("msSelStyles")) return;
  const s = document.createElement("style");
  s.id = "msSelStyles";
  s.textContent = `
    .ms-list { max-height: 46vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .ms-foot { display: flex; align-items: center; justify-content: space-between;
               gap: 10px; padding-top: 9px; margin-top: 7px;
               border-top: 1px solid rgba(140,106,58,.25); }
    .ms-count { font-size: 12.5px; color: #6B5436; }
    .ms-go { background: #4A3728; color: #F5E6C8; border: 1px solid #C9A84C;
             border-radius: 7px; padding: 7px 18px; font: inherit; font-size: 14px;
             cursor: pointer; }
    .ms-go:disabled { opacity: .45; cursor: default; }
    .ms-go:not(:disabled):hover { background: #5a4535; }
  `;
  document.head.appendChild(s);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function openStandaloneSelector(sectionId, sectionName, data) {
  injectStyles();
  const container = document.getElementById("modalRoot");

  // 🔥 UNIQUE THIRUMOZHI, in the order the section recites them
  const list = [];
  const seen = new Set();
  data.forEach(p => {
    const h = String(p.thirumozhi_heading || "").trim();
    if (!h || seen.has(h)) return;
    seen.add(h);
    list.push({ name: h, unit: p.thirumozhi_name || p.pathu_subunit_name || "" });
  });

  let html = `
  <div class="overlay">
    <div class="adiyen-modal">

      <div class="modal-header">
        ${uiText("adiyen")}
        <span id="closeModal">✖</span>
      </div>

      <div class="adiyen-question">${uiText("doYouWant")}</div>

      <div class="adiyen-options ms-list">

        <label class="option">
          <input type="checkbox" id="msAll">
          ${uiText("fullOf", { name: sectionName })}
        </label>

        <div class="adiyen-sub-divider">${uiText("orSelectOneOrMore")}</div>
  `;

  list.forEach((t, i) => {
    html += `
      <label class="option">
        <input type="checkbox" class="ms-thiru" data-i="${i}">
        ${isTamilScript() ? `${i + 1}ம் திருமொழி` : esc(t.unit || `${i + 1}`)} – ${esc(t.name)}
      </label>
    `;
  });

  html += `
      </div>

      <div class="ms-foot">
        <span class="ms-count" id="msCount">${uiText("nothingSelected")}</span>
        <button class="ms-go" id="msGo" disabled>${uiText("readSelection")}</button>
      </div>

    </div>
  </div>
  `;

  container.innerHTML = html;

  // ❌ CLOSE (DON'T reload site)
  container.querySelector("#closeModal").onclick = () => {
    container.innerHTML = "";
  };

  /* Scoped to this modal, not to the document. The pathu selector uses the
     same ids and is only hidden rather than emptied when it closes, so a bare
     getElementById here would wire this modal's ticks to that one's button. */
  const boxes = Array.from(container.querySelectorAll(".ms-thiru"));
  const all = container.querySelector("#msAll");
  const go = container.querySelector("#msGo");
  const count = container.querySelector("#msCount");

  function picked() {
    const want = new Set(boxes.filter(b => b.checked).map(b => list[+b.dataset.i].name));
    return want.size
      ? data.filter(p => want.has(String(p.thirumozhi_heading || "").trim()))
      : [];
  }

  function refresh() {
    const n = boxes.filter(b => b.checked).length;
    const rows = picked().length;
    all.checked = n === boxes.length && n > 0;
    count.textContent = n
      ? uiText("selThirumozhiCount", { n, s: n === 1 ? "" : "s" }) + "  ·  " +
        uiText("selPasuramCount", { n: rows, s: rows === 1 ? "" : "s" })
      : uiText("nothingSelected");
    go.disabled = !n;
  }

  boxes.forEach(b => { b.onchange = refresh; });
  all.onchange = () => { boxes.forEach(b => { b.checked = all.checked; }); refresh(); };

  go.onclick = () => {
    /* Every tick ticked is the whole section, and the whole section is the
       section's own data untouched — so the two routes end in the same place
       rather than one of them rebuilding the list by filtering. */
    const everything = boxes.every(b => b.checked);
    const filtered = everything ? data : picked();
    if (!filtered.length) return;

    container.innerHTML = "";
    state.pasuramData = filtered;
    state.isStandaloneSelection = false;
    state.level = "PASURAM";
    render();
  };

  refresh();
}