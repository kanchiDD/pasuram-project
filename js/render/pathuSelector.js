import { state } from "../state.js";
import { t as uiText } from "../utils/uiStrings.js";
import { render } from "./layout.js";
import { isTamilScript } from "../utils/contentStrings.js";

/* ============================================================================
   pathuSelector — sections 2 / 11 / 26

   One or more pathus, or a few thirumozhis out of one pathu, or a mixture of
   both taken from different pathus.

   The modal stays the size it has always been. Everything is still one list at
   a time: the pathus, or the thirumozhis inside ONE pathu. A tree with every
   pathu expanded would hold over a hundred rows for Thiruvaimozhi, which is
   not a modal any more. So drilling into a pathu REPLACES the list, going back
   restores it, and the ticks are remembered across both — you work one pathu
   at a time and the selection accumulates.

   Ticking a pathu means the whole pathu. That is the default and needs no
   drilling. You only open a pathu when you want fewer than all of it, and the
   row then says how many you kept.
   ========================================================================= */

/* 🔥 HELPERS */

function getTamilNumber(subName) {
  const map = {
    "முதல்": 1, "இரண்டாம்": 2, "மூன்றாம்": 3, "நான்காம்": 4, "ஐந்தாம்": 5,
    "ஆறாம்": 6, "ஏழாம்": 7, "எட்டாம்": 8, "ஒன்பதாம்": 9, "பத்தாம்": 10
  };
  const key = Object.keys(map).find(k => subName.includes(k));
  return key ? map[key] : "";
}

function getUnitLabel(sectionName) {
  if (!sectionName) return "திருமொழி";
  if (sectionName.includes("திருவாய்மொழி")) return "திருவாய்மொழி";
  if (sectionName.includes("திருமொழி")) return "திருமொழி";
  return "திருமொழி";
}

function getPathuShortName(pathuName) {
  const map = {
    "முதல்": "1ம்", "இரண்டாம்": "2ம்", "மூன்றாம்": "3ம்", "நான்காம்": "4ம்",
    "ஐந்தாம்": "5ம்", "ஆறாம்": "6ம்", "ஏழாம்": "7ம்", "எட்டாம்": "8ம்",
    "ஒன்பதாம்": "9ம்", "பத்தாம்": "10ம்", "பதினொன்றாம்": "11ம்"
  };
  const key = Object.keys(map).find(k => pathuName.includes(k));
  return key ? map[key] + " பத்து" : pathuName;
}

/* ---------------------------------------------------------------- the look */
/* Only what the multi-select adds. The modal, the options and the header keep
   the stylesheet they already have, so nothing about the look changes. */
function injectStyles() {
  if (document.getElementById("msSelStyles")) return;
  const s = document.createElement("style");
  s.id = "msSelStyles";
  s.textContent = `
    .ms-list { max-height: 46vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .ms-row { display: flex; align-items: center; gap: 4px; }
    .ms-row .option { flex: 1 1 auto; min-width: 0; }
    .ms-drill { flex: 0 0 auto; background: none; border: none; cursor: pointer;
                font-size: 20px; line-height: 1; padding: 4px 8px; color: #8C6A3A;
                border-radius: 6px; }
    .ms-drill:hover { background: rgba(140,106,58,.12); }
    .ms-note { font-size: 11.5px; color: #8C6A3A; margin-left: 6px; white-space: nowrap; }
    .ms-back { background: none; border: none; cursor: pointer; color: #8C6A3A;
               font-size: 13px; padding: 4px 2px; margin-bottom: 2px; }
    .ms-back:hover { text-decoration: underline; }
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

/* --------------------------------------------------------------- the state */
/* SOURCE is captured once when the modal opens. The old code read
   state.pasuramData each time and also overwrote it with the filtered result,
   so a second pass through the modal would have been working from whatever the
   first pass left behind. Holding the full list here keeps every drill-in
   measuring against the same thing. */
/* Every lookup goes through this element, never through the document. The two
   selectors use the same ids, and closePathuModal only hides its modal rather
   than emptying it — so a bare getElementById("msGo") from the other selector
   finds this one's button, still sitting in the page, and nothing responds. */
let ROOT = null;
const $ = sel => (ROOT ? ROOT.querySelector(sel) : null);

let SOURCE = [];
let SECTION_NAME = "";
let PATHUS = [];          /* [{ name, thirus:[{ heading, subName }] }]        */
let WHOLE = new Set();    /* pathu names taken entire                         */
let PART = new Map();     /* pathu name -> Set of thirumozhi headings kept    */
let OPEN = null;          /* the pathu being drilled into, or null            */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildIndex() {
  PATHUS = [];
  const byPathu = new Map();
  SOURCE.forEach(p => {
    const name = String(p.pathu_name || "").trim();
    if (!name) return;
    if (!byPathu.has(name)) {
      byPathu.set(name, { name, thirus: [], seen: new Set() });
      PATHUS.push(byPathu.get(name));
    }
    const h = String(p.thirumozhi_heading || "").trim();
    const g = byPathu.get(name);
    if (h && !g.seen.has(h)) {
      g.seen.add(h);
      g.thirus.push({ heading: h, subName: p.pathu_subunit_name || "" });
    }
  });
}

/* How many pasurams the current ticks come to. Shown on the button so you can
   see the selection growing as you move between pathus — without it, going in
   and out of pathus is work done blind. */
function chosen() {
  if (!WHOLE.size && !PART.size) return [];
  return SOURCE.filter(p => {
    const name = String(p.pathu_name || "").trim();
    if (WHOLE.has(name)) return true;
    const set = PART.get(name);
    return !!set && set.has(String(p.thirumozhi_heading || "").trim());
  });
}

/* 🔥 OPEN PATHU SELECTOR */

export function openPathuSelector() {
  injectStyles();
  const modal = document.getElementById("pathuModal");
  ROOT = modal;

  SOURCE = (state.pasuramData || []).slice();
  SECTION_NAME = state.selectedSectionName || uiText("sectionFallback");
  WHOLE = new Set();
  PART = new Map();
  OPEN = null;
  buildIndex();

  modal.innerHTML = `
    <div class="overlay">
      <div class="adiyen-modal">
        <div class="modal-header">
          ${uiText("adiyen")}
          <span onclick="closePathuModal()">✖</span>
        </div>
        <div class="adiyen-question" id="msQ"></div>
        <div class="adiyen-options ms-list" id="msList"></div>
        <div class="ms-foot">
          <span class="ms-count" id="msCount"></span>
          <button class="ms-go" id="msGo" disabled>${uiText("readSelection")}</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = "block";

  $("#msGo").onclick = commit;
  draw();
}

/* ------------------------------------------------------------ the two lists */
function draw() {
  OPEN === null ? drawPathus() : drawThirus();
  refreshFoot();
}

function drawPathus() {
  $("#msQ").textContent = uiText("doYouWant");

  const everything = PATHUS.length > 0 && WHOLE.size === PATHUS.length;
  let html = `
    <label class="option">
      <input type="checkbox" id="msAll" ${everything ? "checked" : ""}>
      ${uiText("fullOf", { name: SECTION_NAME })}
    </label>
    <div class="adiyen-sub-divider">${uiText("orSelectOneOrMore")}</div>
  `;

  PATHUS.forEach((g, i) => {
    const part = PART.get(g.name);
    const note = part && part.size
      ? `<span class="ms-note">${uiText("partOfWhole",
            { n: part.size, total: g.thirus.length })}</span>` : "";
    html += `
      <div class="ms-row">
        <label class="option">
          <input type="checkbox" class="ms-pathu" data-i="${i}"
                 ${WHOLE.has(g.name) ? "checked" : ""}>
          ${esc(getPathuShortName(g.name))}${note}
        </label>
        <button class="ms-drill" data-i="${i}" title="choose inside this pathu">›</button>
      </div>
    `;
  });

  const list = $("#msList");
  list.innerHTML = html;

  /* Ticking a pathu means all of it, so any partial choice inside it is
     dropped — otherwise the row would claim the whole pathu while quietly
     holding three thirumozhis. */
  list.querySelectorAll(".ms-pathu").forEach(cb => {
    cb.onchange = () => {
      const g = PATHUS[+cb.dataset.i];
      PART.delete(g.name);
      cb.checked ? WHOLE.add(g.name) : WHOLE.delete(g.name);
      drawPathus(); refreshFoot();
    };
  });
  list.querySelectorAll(".ms-drill").forEach(b => {
    b.onclick = () => { OPEN = +b.dataset.i; draw(); };
  });
  const all = $("#msAll");
  all.onchange = () => {
    PART.clear(); WHOLE.clear();
    if (all.checked) PATHUS.forEach(g => WHOLE.add(g.name));
    drawPathus(); refreshFoot();
  };
}

function drawThirus() {
  const g = PATHUS[OPEN];
  $("#msQ").textContent = uiText("selectOf", { name: getPathuShortName(g.name) });

  /* A pathu ticked whole shows all its thirumozhis ticked when you open it, so
     taking three out of eleven is three taps rather than eight. */
  const whole = WHOLE.has(g.name);
  const set = PART.get(g.name);
  const on = h => whole || (!!set && set.has(h));

  let html = `<button class="ms-back" id="msBack">${uiText("backToList")}</button>`;
  g.thirus.forEach((t, i) => {
    // Tamil keeps the assembled "1ம் திருவாய்மொழி" form; other scripts use the
    // subunit's own converted name, since the ordinal words it is built from
    // no longer match once transliterated.
    const unitLabel = isTamilScript()
      ? `${getTamilNumber(t.subName || "")}ம் ${getUnitLabel(SECTION_NAME)}`
      : (t.subName || "");
    html += `
      <label class="option">
        <input type="checkbox" class="ms-thiru" data-i="${i}" ${on(t.heading) ? "checked" : ""}>
        ${esc(unitLabel)} - ${esc(t.heading)}
      </label>
    `;
  });

  const list = $("#msList");
  list.innerHTML = html;
  list.scrollTop = 0;

  list.querySelectorAll(".ms-thiru").forEach(cb => {
    cb.onchange = () => {
      /* The first tick inside a whole pathu turns it into a partial one, and
         the pathu stops being whole. Ticking every one of them makes it whole
         again, so the row reads "1ம் பத்து" and not "11 of 11". */
      let cur = PART.get(g.name);
      if (!cur) {
        cur = new Set(WHOLE.has(g.name) ? g.thirus.map(t => t.heading) : []);
        PART.set(g.name, cur);
        WHOLE.delete(g.name);
      }
      const h = g.thirus[+cb.dataset.i].heading;
      cb.checked ? cur.add(h) : cur.delete(h);
      if (cur.size === g.thirus.length) { PART.delete(g.name); WHOLE.add(g.name); }
      else if (cur.size === 0) { PART.delete(g.name); }
      refreshFoot();
    };
  });
  $("#msBack").onclick = () => { OPEN = null; draw(); };
}

function refreshFoot() {
  const n = chosen().length;
  /* {s} is the plural marker uiStrings already uses for desamsFor, so these
     read the same way as the rest of the dictionary. */
  const bits = [];
  if (WHOLE.size) bits.push(uiText("selPathuCount",
      { n: WHOLE.size, s: WHOLE.size === 1 ? "" : "s" }));
  let tot = 0; PART.forEach(set => { tot += set.size; });
  if (tot) bits.push(uiText("selThirumozhiCount",
      { n: tot, s: tot === 1 ? "" : "s" }));
  $("#msCount").textContent = n
    ? bits.join(" + ") + "  ·  " + uiText("selPasuramCount", { n, s: n === 1 ? "" : "s" })
    : uiText("nothingSelected");
  $("#msGo").disabled = !n;
}

function commit() {
  const filtered = chosen();
  if (!filtered.length) return;

  /* SOURCE order is book order, so a thirumozhi picked out of pathu 1 and one
     picked out of pathu 5 come back in the order they are recited, without
     any sorting here. */
  state.filteredPasuram = filtered;
  state.pasuramData = filtered;
  state.isPathuSelectionActive = false;
  state.level = "PASURAM";

  closePathuModal(true);
  render();
}

/* 🔥 CLOSE */

window.closePathuModal = function (skipRender = false) {
  const modal = document.getElementById("pathuModal");
  modal.style.display = "none";
  if (!skipRender) {
    state.level = "SECTION";
    render();
  }
};