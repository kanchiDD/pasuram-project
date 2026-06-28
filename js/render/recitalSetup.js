// ── recitalSetup.js ──────────────────────────────────────────────
import { state } from "../state.js";

const WORKER              = "https://recitalworker.kanchitrust.workers.dev";
const PATHU_SECTIONS      = new Set([2, 11, 26]);
const THIRUMOZHI_SECTIONS = new Set([4, 5]);
const SPECIAL_DIRECT      = new Set([21]); // no popup, no modal, add directly
const NO_RETTAI           = new Set([21]); // no rettai option

// ── Module state ──
let selectedDay      = 0;     // default Sunday (0-6 = Sun-Sat, 7 = All Days)
let selectedItems    = [];    // { entity_type, entity_id, label, global_no_start }
let catalogData      = [];
let modalStack       = [];
let dragSrcIndex     = null;
let pendingItem      = null;  // for Full/Rettai popup
let isDirty          = false; // true when user has unsaved changes on current day
let planLoadedForDay = null;  // which day's plan is currently shown

// ─────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────
export async function renderRecitalModule() {
  const mobile = localStorage.getItem("mobile");
  if (!mobile) {
    return `<div style="padding:24px;text-align:center">
      <div style="font-size:15px;color:#4a2c00;margin-bottom:16px">
        Please sign in to use the Recital Plan feature.
      </div>
      <button onclick="window.location.href='register.html'"
        style="padding:12px 24px;background:#7a4d00;color:#fef0c0;
               border:none;border-radius:8px;font-size:14px;
               font-weight:700;cursor:pointer">
        Sign In / Register
      </button>
    </div>`;
  }
  loadCatalog();
  return buildIntroHTML();
}

// ─────────────────────────────────────────────
// INTRO SCREEN
// ─────────────────────────────────────────────
function buildIntroHTML() {
  return `
  <div class="recital-wrap">
    ${recitalCSS()}
    <div class="recital-title">🙏 My Recital Plan</div>
    <div class="recital-sub">
      Your personal daily recital from the Naalayira Divya Prabandham
    </div>
    <div class="recital-intro-card">
      <div class="recital-intro-how">How it works</div>
      <div class="recital-intro-step">
        <span class="recital-step-no">1</span>
        Choose sections, pathus or thirumozhi from the full 4000
      </div>
      <div class="recital-intro-step">
        <span class="recital-step-no">2</span>
        Assign to a day of the week or all days
      </div>
      <div class="recital-intro-step">
        <span class="recital-step-no">3</span>
        Your plan renders daily with thaniyans and sattrumurai automatically
      </div>
    </div>
    <div class="recital-intro-btns">
      <button class="recital-btn-primary" onclick="window._recitalGoSetup()">
        Setup My Plan
      </button>
      <button class="recital-btn-secondary" onclick="window._recitalGoToday()">
        Today's Recital
      </button>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────
function buildSetupHTML() {
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat","All Days"];
  let dayBtns = "";
  for (let i = 0; i <= 7; i++) {
    dayBtns += `<button class="r-day-btn ${i === selectedDay ? "active" : ""}"
      onclick="window._recitalSelectDay(${i})">${dayNames[i]}</button>`;
  }

  return `
  <div class="recital-wrap">
    ${recitalCSS()}
    <div class="recital-nav-row">
      <span class="recital-back-link" onclick="window._recitalGoIntro()">← Back</span>
      <div class="recital-title" style="margin:0">Setup My Plan</div>
      <span></span>
    </div>

    <div class="r-section-label">Assign to day</div>
    <div class="r-day-row">${dayBtns}</div>

    <div class="r-selected-wrap">
      <div class="r-selected-label">Your Selection</div>
      <div id="r-selected-list">
        <div class="r-selected-empty">Nothing selected yet</div>
      </div>
    </div>

    <div class="r-pasuram-box">
      <div class="r-pasuram-label">Add specific Pasuram — enter pasuram number (1–3776)</div>
      <div class="r-pasuram-row">
        <input type="number" id="r-pasuram-input" class="r-pasuram-input"
               placeholder="e.g. 474" min="1" max="3776">
        <button class="r-pasuram-btn" onclick="window._recitalLookupPasuram()">Add</button>
      </div>
      <div id="r-pasuram-preview" class="r-pasuram-preview"></div>
    </div>

    <div class="r-section-label">Select Prabandham</div>
    <div id="r-catalog-list">
      <div style="text-align:center;color:#bbb;font-size:13px;padding:20px">Loading...</div>
    </div>

    <button class="recital-btn-primary" style="width:100%;margin-top:8px"
            onclick="window._recitalSavePlan()">
      Save Plan 🙏
    </button>
    <div id="r-save-msg" class="r-save-msg"></div>
  </div>

  <!-- Full/Rettai popup -->
  <div class="r-popup-overlay" id="r-popup-overlay">
    <div class="r-popup-box">
      <div class="r-popup-title">🙏 Adiyen</div>
      <div class="r-popup-sub" id="r-popup-sub"></div>
      <button class="recital-btn-primary" style="width:100%;margin-bottom:8px"
              onclick="window._recitalPickFull()">
        Full — All Pasurams
      </button>
      <button class="recital-btn-secondary" style="width:100%"
              onclick="window._recitalPickRettai()">
        Rettai — இரட்டை Pasurams only
      </button>
      <div style="text-align:center;margin-top:10px">
        <span style="font-size:12px;color:#b38b2e;cursor:pointer;text-decoration:underline"
              onclick="window._recitalCancelPopup()">Cancel</span>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <div class="r-modal-overlay" id="r-modal-overlay"
       onclick="window._recitalCloseModalOutside(event)">
    <div class="r-modal-box">
      <div class="r-modal-header">
        <div class="r-modal-title" id="r-modal-title"></div>
        <div class="r-modal-close" onclick="window._recitalCloseModal()">✕</div>
      </div>
      <div class="r-modal-back" id="r-modal-back"
           onclick="window._recitalModalBack()">← Back</div>
      <div id="r-modal-content"></div>
    </div>
  </div>

  <!-- Message toast -->
  <div id="r-toast" class="r-toast"></div>`;
}

// ─────────────────────────────────────────────
// RECITAL DISPLAY
// ─────────────────────────────────────────────
async function buildRecitalHTML() {
  const mobile = localStorage.getItem("mobile");
  const today  = new Date().getDay();
  const app    = document.getElementById("app");

  app.innerHTML = `<div style="text-align:center;padding:40px;color:#b38b2e">
    Loading today's recital...
  </div>`;

  try {
    const planRes  = await fetch(
      `${WORKER}/recital/plan?mobile=${encodeURIComponent(mobile)}&day=${today}`
    );
    const planData = await planRes.json();

    if (!planData.plan) {
      app.innerHTML = `
        <div class="recital-wrap">
          ${recitalCSS()}
          <div class="recital-title">🙏 Today's Recital</div>
          <div style="text-align:center;padding:30px;color:#999;font-size:14px">
            No plan set up for today.<br>
            <button class="recital-btn-primary" style="margin-top:16px"
                    onclick="window._recitalGoSetup()">
              Setup My Plan
            </button>
          </div>
        </div>`;
      return;
    }

    const renderRes  = await fetch(
      `${WORKER}/recital/render?plan_id=${planData.plan.plan_id}`
    );
    const renderData = await renderRes.json();
    app.innerHTML    = buildRecitalDisplayHTML(renderData.blocks, planData.plan);

  } catch(e) {
    app.innerHTML = `<div style="padding:20px;color:#c0392b">
      Error loading recital: ${e.message}
    </div>`;
  }
}

function buildRecitalDisplayHTML(blocks, plan) {
  let html = `
  <div class="recital-wrap">
    ${recitalCSS()}
    <div class="recital-nav-row">
      <span class="recital-back-link" onclick="window._recitalGoIntro()">← Back</span>
      <div class="recital-title" style="margin:0">Today's Recital</div>
      <span></span>
    </div>
    <div class="r-recital-content">`;

  for (const block of blocks) {
    if (block.block_type === "global_thaniyan") {
      html += `<div class="r-block r-block-thaniyan">
        <div class="r-block-badge">பொது தனியன்</div>`;
      html += renderLines(block.lines);
      html += `</div>`;
    } else if (block.block_type === "section_thaniyan") {
      html += `<div class="r-block r-block-thaniyan">
        <div class="r-block-badge">தனியன்</div>`;
      html += renderLines(block.lines);
      html += `</div>`;
    } else if (block.block_type === "pasurams") {
      const grouped = groupPasurams(block.pasurams);
      for (const pasuram of grouped) {
        html += `<div class="r-block r-block-pasuram">
          <div class="r-pasuram-no">${pasuram.local_pasuram_no}</div>
          <div class="r-pasuram-lines">`;
        for (const group of pasuram.groups) {
          html += `<div class="r-recital-group">`;
          for (const line of group) {
            html += `<div class="r-line">${line.line_text}</div>`;
          }
          html += `</div>`;
        }
        html += `</div></div>`;
      }
    } else if (block.block_type === "sattrumurai") {
      html += `<div class="r-block r-block-sattrumurai">
        <div class="r-block-badge">சாற்றுமுறை</div>
      </div>`;
    }
  }

  html += `</div>
    <button class="recital-btn-secondary" style="width:100%;margin-top:16px"
            onclick="window._recitalCreateGhoshti(${plan.plan_id})">
      Create Ghoshti Link 🔗
    </button>
    <div id="r-ghoshti-result" style="margin-top:10px;font-size:13px;
         text-align:center;color:#b38b2e"></div>
  </div>`;

  return html;
}

// ─────────────────────────────────────────────
// OVERLAP DETECTION
// ─────────────────────────────────────────────

// Get section_id for any item (from catalog data)
function getSectionIdForItem(entity_type, entity_id) {
  if (entity_type === "section") return entity_id;
  // For pathu/thirumozhi/pasuram we check catalogData hierarchy
  // We store section_id on items when we add them
  const found = selectedItems.find(
    i => i.entity_type === entity_type && i.entity_id === entity_id
  );
  return found?.section_id || null;
}

// Check if a superior item already covers the new item.
// "Superior" means: an existing item that already CONTAINS the new item.
// A full pathu X is superior to its child thirumozhi Y.
// A child Y is NOT superior to anything — it never blocks adding its parent X.
function findSuperiorConflict(entity_type, entity_id, section_id, pathu_id, is_child) {
  for (const item of selectedItems) {

    // ── 1. Full section blocks everything inside it ──────────
    if (item.entity_type === "section" && item.entity_id === section_id
        && entity_type !== "section") {
      return { type: "block", existing: item };
    }

    // ── 1b. Koil item blocks new individual items from same section ──
    if (item.entity_type === "koil" && item.section_id === section_id
        && entity_type !== "koil") {
      return { type: "block", existing: item };
    }

    // ── 2. Full pathu blocks new children of that pathu ──────
    // A pathu item is "full" only when is_child=false (stored on item by addItem)
    if (item.entity_type === "pathu" && !item.is_child) {
      // item.entity_id IS the full pathu's id (parent id)
      const itemPathuId = item.pathu_id; // = item.entity_id for full pathu
      // Block: new child whose parent = this full pathu
      if (is_child && entity_type === "pathu" && pathu_id === itemPathuId) {
        return { type: "block", existing: item };
      }
      // Block: new thirumozhi belonging to this pathu (not standalone pasuram — pasuram has its own check)
      if (entity_type === "thirumozhi" && pathu_id === itemPathuId) {
        return { type: "block", existing: item };
      }
    }

    // ── 3. Rettai group conflicts ─────────────────────────────
    if (item.entity_type === "rettai_group") {
      const src = item.rettai_source;
      // 3a. Exact duplicate rettai (same source, same type) — block
      // But allow if new item is full pathu/section replacing it
      if (src.entity_type === entity_type && src.entity_id === entity_id
          && is_child) {
        return { type: "block", existing: item };
      }
      // 3b. Full pathu rettai (not child rettai) blocks new child of that pathu
      if (!item.is_child && entity_type === "pathu" && is_child
          && pathu_id === src.entity_id) {
        return { type: "block", existing: item };
      }
    }
  }
  return null;
}

// Check if inferior items exist that should be silently replaced by a new superior.
// Only called when adding a FULL pathu or FULL section (never for children).
function findInferiorItems(entity_type, entity_id, section_id, pathu_id, is_child, global_no_start, global_no_end, pathu_no) {
  // Only full pathus and full sections can have inferiors
  const newItemIsFullPathu = entity_type === "pathu" && pathu_id === null && !is_child;
  const newItemIsSection   = entity_type === "section";
  const newItemIsThirumozhi = entity_type === "thirumozhi";
  const newItemIsChildPathu = entity_type === "pathu" && is_child;

  // For thirumozhi or child pathu: remove pasurams whose global_no falls in the range
  if (newItemIsThirumozhi || newItemIsChildPathu) {
    if (!global_no_start || !global_no_end) return [];
    return selectedItems.filter(i =>
      i.entity_type === "pasuram" &&
      i.entity_id >= global_no_start &&
      i.entity_id <= global_no_end
    );
  }

  if (!newItemIsFullPathu && !newItemIsSection) return [];

  const toRemove = [];
  for (const item of selectedItems) {
    if (newItemIsSection) {
      // Full section replaces everything from same section (pathu, child, pasuram, rettai)
      if (item.section_id === section_id && item.entity_id !== entity_id) {
        toRemove.push(item);
      }
    } else if (newItemIsFullPathu) {
      // Full pathu X replaces:
      //  - child thirumozhi items whose parent = X (stored pathu_id = X, entity_id ≠ X)
      // Remove all children of this pathu: is_child=true AND pathu_id = first_child_id (entity_id)
      // Note: child 1 has entity_id === first_child_id, so the old entity_id !== entity_id
      // check wrongly excluded it. Use is_child flag instead.
      if (item.entity_type === "pathu"
          && item.is_child
          && item.pathu_id === entity_id) {
        toRemove.push(item);
      }
      //  - rettai_group for a child of this pathu (pathu_id = X = full pathu id)
      //    OR rettai_group for the full pathu itself (rettai_source.entity_id = X)
      if (item.entity_type === "rettai_group" && item.rettai_source) {
        const srcId = item.rettai_source.entity_id;
        if (
          item.pathu_id === entity_id ||          // child rettai under this pathu
          srcId === entity_id                      // full-pathu rettai for same pathu
        ) {
          toRemove.push(item);
        }
      }
      //  - individual pasurams within this pathu's global_no range (if range known)
      if (item.entity_type === "pasuram" && global_no_start && global_no_end &&
          item.entity_id >= global_no_start && item.entity_id <= global_no_end) {
        toRemove.push(item);
      }
      //  - individual pasurams by section_id + pathu_no (when range not available)
      if (item.entity_type === "pasuram" && pathu_no &&
          Number(item.section_id) === Number(section_id)) {
        // pasuram's pathu_id is a specific thirumozhi — check it belongs to same pathu_no
        // We compare via section_id match only as a safe approximation since
        // pathu_no is not stored on pasuram items
        // Actually use: pasuram item stores pathu_id which IS a pathu_master.pathu_id
        // We need to check if that pathu_id belongs to our pathu_no group
        // Store pathu_no on pasuram items at confirm time to enable this check
        if (item.pathu_no && Number(item.pathu_no) === Number(pathu_no)) {
          toRemove.push(item);
        }
      }
    }
  }
  // Deduplicate
  const seen = new Set();
  return toRemove.filter(i => {
    const key = `${i.entity_type}_${i.entity_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────
// ADD / REMOVE
// ─────────────────────────────────────────────
function addItem(entity_type, entity_id, label, global_no_start, section_id, pathu_id, is_child, global_no_end, pathu_no) {
  if (isSelected(entity_type, entity_id)) return;

  const storedPathuId = entity_type === "pathu"
    ? (is_child ? pathu_id : (pathu_id == null ? null : (pathu_id !== entity_id ? pathu_id : entity_id)))
    : (pathu_id || null);

  const conflict = findSuperiorConflict(entity_type, entity_id, section_id, storedPathuId, is_child);
  if (conflict) {
    showToast(`Adiyen, you already selected "${conflict.existing.label}". Please delete it first to change.`);
    return;
  }

  const inferiors = findInferiorItems(entity_type, entity_id, section_id, storedPathuId, is_child, global_no_start, global_no_end, pathu_no);
  if (inferiors.length) {
    const removedLabels = inferiors.map(i => i.label).join(", ");
    inferiors.forEach(i => {
      selectedItems = selectedItems.filter(
        s => !(s.entity_type === i.entity_type && s.entity_id === i.entity_id)
      );
    });
    showToast(`Adiyen, previous selection "${removedLabels}" replaced with "${label}"`);
  }

  selectedItems.push({
    entity_type, entity_id, label,
    global_no_start: global_no_start || 0,
    section_id:      section_id      || null,
    pathu_id:        storedPathuId,
    is_child:        !!(is_child),
    pathu_no:        pathu_no        || null
  });
  isDirty = true;
  renderSelected();
}

function removeItem(entity_type, entity_id) {
  selectedItems = selectedItems.filter(
    i => !(i.entity_type === entity_type && i.entity_id === entity_id)
  );
  isDirty = true;
  renderSelected();
}

function isSelected(entity_type, entity_id) {
  return selectedItems.some(
    i => i.entity_type === entity_type && i.entity_id === entity_id
  );
}

// ─────────────────────────────────────────────
// PRIORITY ORDER
// ─────────────────────────────────────────────
function applyPriorityOrder(items) {
  // Priority: sec1 → sec8 → sec3 → everything else sorted by global_no_start
  // This applies to both direct section items AND rettai_group items from those sections
  const isPrioritySec = (item, secId) => {
    if (item.entity_type === "section" && Number(item.entity_id) === secId) return true;
    if (item.entity_type === "rettai_group" && Number(item.section_id) === secId) return true;
    return false;
  };
  const sec1   = items.filter(i => isPrioritySec(i, 1));
  const sec8   = items.filter(i => isPrioritySec(i, 8));
  const sec3   = items.filter(i => isPrioritySec(i, 3));
  const others = items.filter(i =>
    !isPrioritySec(i, 1) && !isPrioritySec(i, 8) && !isPrioritySec(i, 3)
  );
  others.sort((a, b) => (a.global_no_start || 9999) - (b.global_no_start || 9999));
  return [...sec1, ...sec8, ...sec3, ...others];
}

// ─────────────────────────────────────────────
// TOAST MESSAGE
// ─────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("r-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

// ─────────────────────────────────────────────
// FULL / RETTAI POPUP
// ─────────────────────────────────────────────
function showFullRettaiPopup(entity_type, entity_id, label, global_no_start, section_id, pathu_id, global_no_end, is_child, pathu_no) {
  pendingItem = { entity_type, entity_id, label, global_no_start, section_id, pathu_id,
                  global_no_end: global_no_end || 0, is_child: !!is_child,
                  pathu_no: pathu_no || null };
  const sub   = document.getElementById("r-popup-sub");
  if (sub) sub.textContent = `What would you like to add for "${label}"?`;
  const overlay = document.getElementById("r-popup-overlay");
  if (overlay) overlay.classList.add("open");
}

// ─────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────
async function loadCatalog() {
  try {
    const res   = await fetch(`${WORKER}/recital/catalog`);
    catalogData = await res.json();
    renderCatalogIntoDOM();
  } catch(e) {}
}

function renderCatalogIntoDOM() {
  const el = document.getElementById("r-catalog-list");
  if (!el) return;
  let html = "";

  const KOIL_HTML = `<div class="r-thousand-group">
    <div class="r-thousand-name">கோயில் திருமொழிகள்</div>
    <div class="r-section-card" onclick="window._recitalAddKoil(1)">
      <div class="r-section-name">கோயில் திருமொழி</div>
      <div style="color:#b38b2e">+</div>
    </div>
    <div class="r-section-card" onclick="window._recitalAddKoil(2)">
      <div class="r-section-name">கோயில் திருவாய்மொழி</div>
      <div style="color:#b38b2e">+</div>
    </div>
  </div>`;
  for (const thousand of catalogData) {
    if (!thousand.sections.length) continue;
    html += `<div class="r-thousand-group">
      <div class="r-thousand-name">${thousand.thousand_name}</div>`;
    for (const sec of thousand.sections) {
      html += `<div class="r-section-card"
        onclick="window._recitalOpenSection(
          ${sec.section_id},'${escHtml(sec.section_name)}',
          ${sec.global_no_start || 0})">
        <div class="r-section-name">${sec.section_name}</div>
        <div style="color:#b38b2e">›</div>
      </div>`;
    }
    html += `</div>`;
    // Insert koil group after நான்காமாயிரம் (thousand_id=4)
    if (thousand.thousand_id === 4) html += KOIL_HTML;
  }
  el.innerHTML = html;
}

// ─────────────────────────────────────────────
// SELECTED LIST
// ─────────────────────────────────────────────
function renderSelected() {
  const el = document.getElementById("r-selected-list");
  if (!el) return;
  if (!selectedItems.length) {
    el.innerHTML = `<div class="r-selected-empty">Nothing selected yet</div>`;
    return;
  }
  // Always display in priority order: sec1 → sec8 → sec3 → others by global_no_start
  const displayItems = applyPriorityOrder(selectedItems);
  let html = "";
  displayItems.forEach((item, i) => {
    // Find original index for drag-drop (drag operates on selectedItems array)
    const origIdx = selectedItems.indexOf(item);
    html += `<div class="r-selected-item" draggable="true"
      ondragstart="window._recitalDragStart(${origIdx})"
      ondragover="window._recitalDragOver(event)"
      ondrop="window._recitalDragDrop(${origIdx})"
      ondragend="window._recitalDragEnd()">
      <span style="color:#ccc;cursor:grab;font-size:16px;flex-shrink:0">☰</span>
      <span class="r-selected-item-label">${item.label}</span>
      <span style="color:#c0392b;cursor:pointer;font-weight:700;flex-shrink:0"
            onclick="window._recitalRemoveItem('${item.entity_type}',${item.entity_id})">✕</span>
    </div>`;
  });
  el.innerHTML = html;
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
async function openSectionModal(section_id, section_name, global_no_start) {

  // Special direct sections — no modal, no popup
  if (SPECIAL_DIRECT.has(section_id)) {
    addItem("section", section_id, section_name, global_no_start, section_id, null);
    return;
  }

  // Standalone sections (Type 3) — show Full/Rettai popup directly
  if (!PATHU_SECTIONS.has(section_id) && !THIRUMOZHI_SECTIONS.has(section_id)) {
    showFullRettaiPopup("section", section_id, section_name, global_no_start, section_id, null);
    return;
  }

  // Type 1 and 2 — open modal
  const res  = await fetch(`${WORKER}/recital/catalog?section_id=${section_id}`);
  const data = await res.json();
  modalStack = [];
  modalStack.push({ level:"section", section_id, section_name, data, global_no_start });
  renderModalContent();
  document.getElementById("r-modal-overlay").classList.add("open");
}

function renderModalContent() {
  const frame = modalStack[modalStack.length - 1];
  document.getElementById("r-modal-title").textContent = frame.section_name;
  document.getElementById("r-modal-back").style.display =
    modalStack.length > 1 ? "block" : "none";

  let html = "";

  if (frame.level === "section") {
    html += `<div class="r-modal-option">
      <input type="checkbox" ${isSelected("section", frame.section_id) ? "checked" : ""}
             onchange="window._recitalToggleSection(
               ${frame.section_id},'${escHtml(frame.section_name)}',
               ${frame.global_no_start||0},this.checked)">
      <span class="r-modal-option-label">Full ${frame.section_name}</span>
    </div>
    <div class="r-modal-divider">— OR select specific —</div>`;

    if (frame.data.type === "pathu") {
      for (const p of frame.data.items) {
        html += `<div class="r-modal-option">
          <input type="checkbox" ${selectedItems.some(i => i.entity_type==="pathu" && i.entity_id===p.pathu_id && i.pathu_id===null && !i.is_child) ? "checked" : ""}
                 onchange="window._recitalTogglePathuCheck(
                   ${frame.section_id},'${escHtml(frame.section_name)}',
                   ${p.pathu_id},'${escHtml(p.pathu_name)}',${p.pathu_no},${p.global_no_start||0},this.checked)">
          <span class="r-modal-option-label">${p.pathu_name}</span>
          <span class="r-modal-drill"
                onclick="window._recitalOpenPathu(
                  ${frame.section_id},'${escHtml(frame.section_name)}',
                  ${p.pathu_no},'${escHtml(p.pathu_name)}',${p.pathu_id},${p.global_no_start||0})">
            Thirumozhi ›
          </span>
        </div>`;
      }
    } else if (frame.data.type === "thirumozhi") {
      for (const t of frame.data.items) {
        const thiruName    = t.thirumozhi_name    || "";
        const thiruHeading = t.thirumozhi_heading || "";
        const label = [frame.section_name, thiruName, thiruHeading].filter(Boolean).join(" — ");
        html += `<div class="r-modal-option">
          <input type="checkbox" ${isSelected("thirumozhi", t.thirumozhi_id) ? "checked" : ""}
                 onchange="window._recitalToggleThirumozhiCheck(
                   ${t.thirumozhi_id},'${escHtml(label)}',
                   ${t.global_no_start||0},${t.global_no_end||0},
                   ${frame.section_id},null,this.checked)">
          <span class="r-modal-option-label">
            ${t.thirumozhi_no}. ${[thiruName, thiruHeading].filter(Boolean).join(" — ")}
          </span>
        </div>`;
      }
    }
  }

  if (frame.level === "pathu") {
    html += `<div class="r-modal-option">
      <input type="checkbox" ${selectedItems.some(i => i.entity_type==="pathu" && i.entity_id===frame.pathu_id && i.pathu_id===null && !i.is_child) ? "checked" : ""}
             onchange="window._recitalTogglePathuCheck(
               ${frame.section_id},'${escHtml(frame.section_name)}',
               ${frame.pathu_id},'${escHtml(frame.pathu_name)}',${frame.pathu_no||0},${frame.global_no_start||0},this.checked)">
      <span class="r-modal-option-label">Full ${frame.pathu_name}</span>
    </div>
    <div class="r-modal-divider">— OR select specific Thirumozhi —</div>`;

    for (const t of frame.data.items) {
      const subunit  = t.pathu_subunit_name || "";
      const heading  = t.thirumozhi_heading  || t.pathu_heading || "";
      const label    = [frame.section_name, frame.pathu_name, subunit, heading]
                         .filter(Boolean).join(" — ");
      html += `<div class="r-modal-option">
        <input type="checkbox" ${isSelected("pathu", t.pathu_id) ? "checked" : ""}
               onchange="window._recitalToggleThirumozhiPathuCheck(
                 ${t.pathu_id},'${escHtml(label)}',
                 ${t.global_no_start||0},${t.global_no_end||0},
                 ${frame.section_id},${frame.pathu_id},this.checked)">
        <span class="r-modal-option-label">
          ${t.sub_unit_no}. ${t.thirumozhi_heading || t.pathu_subunit_name}
        </span>
      </div>`;
    }
  }

  document.getElementById("r-modal-content").innerHTML = html;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function groupPasurams(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.global_no)) {
      map.set(row.global_no, {
        global_no:        row.global_no,
        local_pasuram_no: row.local_pasuram_no,
        double_recital:   row.double_recital,
        groups:           new Map()
      });
    }
    const p = map.get(row.global_no);
    if (!p.groups.has(row.recital_group)) p.groups.set(row.recital_group, []);
    p.groups.get(row.recital_group).push(row);
  }
  return [...map.values()].map(p => ({ ...p, groups: [...p.groups.values()] }));
}

function renderLines(lines) {
  let html = "";
  let currentGroup = null;
  for (const line of lines) {
    if (line.line_role === "title") {
      html += `<div class="r-thaniyan-title">${line.line_text}</div>`;
    } else if (line.line_role === "subhead") {
      html += `<div class="r-thaniyan-subhead">${line.line_text}</div>`;
    } else {
      if (line.line_group !== currentGroup) {
        if (currentGroup !== null) html += `</div>`;
        html += `<div class="r-thaniyan-group">`;
        currentGroup = line.line_group;
      }
      html += `<div class="r-line">${line.line_text}</div>`;
    }
  }
  if (currentGroup !== null) html += `</div>`;
  return html;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/'/g,"&#39;")
    .replace(/"/g,"&quot;");
}

function buildLabel(entity_type, entity_id) {
  if (entity_type === "section") {
    for (const t of catalogData) {
      const sec = t.sections.find(s => s.section_id === entity_id);
      if (sec) return sec.section_name;
    }
  }
  if (entity_type === "pasuram")    return `Pasuram ${entity_id}`;
  if (entity_type === "pathu")      return `Pathu ${entity_id}`;
  if (entity_type === "thirumozhi") return `Thirumozhi ${entity_id}`;
  return `${entity_type} ${entity_id}`;
}

async function loadExistingPlan() {
  const mobile      = localStorage.getItem("mobile");
  const dayToLoad   = selectedDay;
  try {
    const res  = await fetch(
      `${WORKER}/recital/plan?mobile=${encodeURIComponent(mobile)}&day=${dayToLoad}`
    );
    const data = await res.json();

    // Guard: if user switched day while loading, discard stale result
    if (dayToLoad !== selectedDay) return;

    if (!data.plan || !data.items || !data.items.length) {
      // No plan saved for this day — start blank (not a load error)
      selectedItems    = [];
      isDirty          = false;
      planLoadedForDay = dayToLoad;
      renderSelected();
      return;
    }

    // Resolve proper labels from worker
    const labelRes  = await fetch(`${WORKER}/recital/resolve-labels`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ items: data.items })
    });
    const labelData = await labelRes.json();

    if (dayToLoad !== selectedDay) return; // guard again after async

    // Build a lookup of DB items by entity_type+entity_id for metadata
    const dbItemMap = new Map();
    for (const dbItem of data.items) {
      dbItemMap.set(`${dbItem.entity_type}_${dbItem.entity_id}`, dbItem);
    }

    selectedItems = labelData.labels.map(item => {
      const dbItem = dbItemMap.get(`${item.entity_type}_${item.entity_id}`) || {};

      // Restore rettai_group items
      if (dbItem.is_rettai) {
        // Determine pathu_id: for child rettai = parent pathu id; for full = entity_id
        const restoredPathuId = dbItem.pathu_id || item.pathu_id || null;
        // is_child: pathu_id is set (child rettai always has pathu_id stored)
        // Do NOT use pathu_id !== entity_id — MIN child has them equal (coincidence)
        // Any rettai with a pathu_id stored is a child rettai
        const isChild = !!(restoredPathuId);
        // Append rettai marker to label — count not available on reload, show just இரட்டை
        const rettaiLabel = item.label.includes("இரட்டை")
          ? item.label
          : `${item.label} — இரட்டை`;
        return {
          entity_type:     "rettai_group",
          entity_id:       item.entity_id,
          rettai_key:      `${item.entity_type}_${item.entity_id}`,
          rettai_source:   { entity_type: item.entity_type, entity_id: item.entity_id },
          label:           rettaiLabel,
          global_no_start: dbItem.global_no_start || item.global_no_start || 0,
          section_id:      dbItem.section_id  || item.section_id  || null,
          pathu_id:        isChild ? restoredPathuId : (item.entity_id),
          is_child:        isChild,
          pasurams:        []
        };
      }

      // For pathu items: restore pathu_id so parent/child detection works after reload
      // A full pathu has pathu_id === entity_id; a child has pathu_id = parent's id
      const restoredPathuId = item.pathu_id || dbItem.pathu_id || null;
      const finalPathuId = item.entity_type === "pathu"
        ? (restoredPathuId || item.entity_id)  // fallback: treat as full pathu if unknown
        : restoredPathuId;

      return {
        entity_type:     item.entity_type,
        entity_id:       item.entity_id,
        label:           item.label,
        global_no_start: item.entity_type === "pasuram" ? item.entity_id
                       : (item.global_no_start || dbItem.global_no_start || 0),
        section_id:      item.section_id  || dbItem.section_id  || null,
        pathu_id:        finalPathuId
      };
    });

    isDirty          = false;   // freshly loaded = clean
    planLoadedForDay = dayToLoad;
    renderSelected();

    // Background: update rettai labels with actual pasuram count
    const rettaiItems = selectedItems.filter(i => i.entity_type === "rettai_group");
    if (rettaiItems.length) {
      Promise.all(rettaiItems.map(async item => {
        try {
          const src = item.rettai_source;
          const params = new URLSearchParams({ entity_type: src.entity_type, entity_id: src.entity_id });
          if (item.is_child) {
            params.set("is_child", "1");
            if (item.global_no_start) params.set("gns", item.global_no_start);
            // gne not stored — worker will look it up from pathu_master
          }
          const res  = await fetch(`${WORKER}/recital/rettai?${params}`);
          const data = await res.json();
          const count = data.pasurams?.length || 0;
          if (count > 0) {
            // Update label: replace "— இரட்டை" with "— இரட்டை (N pasurams)"
            item.label = item.label.replace(/ — இரட்டை.*$/, "") + ` — இரட்டை (${count} pasurams)`;
          }
        } catch(e) {}
      })).then(() => renderSelected());
    }

  } catch(e) {
    console.error("loadExistingPlan error:", e);
  }
}
// ─────────────────────────────────────────────
// WINDOW BINDINGS
// ─────────────────────────────────────────────
export function registerRecitalBindings() {

  window._recitalGoIntro = () => {
    import("./layout.js").then(m => {
      state.level = "RECITAL";
      m.render();
    });
  };

  window._recitalGoSetup = () => {
    // Reset state fresh — loadExistingPlan will populate selectedItems
    selectedItems    = [];
    isDirty          = false;
    planLoadedForDay = null;
    const app = document.getElementById("app");
    app.innerHTML = buildSetupHTML();
    loadCatalog();
    loadExistingPlan();
    registerRecitalBindings();
  };

  window._recitalGoToday = () => { buildRecitalHTML(); };

  window._recitalSelectDay = async (day) => {
    if (day === selectedDay) return;

    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat","All Days"];

    // Prompt if user made any unsaved changes (including deletions)
    if (isDirty) {
      const current   = dayNames[selectedDay];
      const confirmed = confirm(
        `Adiyen, do you want to save your changes for ${current} before switching?`
      );
      if (confirmed) {
        // Special: moving FROM "All Days" (7) to a specific day
        if (selectedDay === 7 && day !== 7 && selectedItems.length > 0) {
          await _applyAllDaysToOtherDays();
          return; // _applyAllDaysToOtherDays handles the day switch
        }
        await window._recitalSavePlan(true); // silent save
      }
    }

    await _switchToDay(day);
  };

  // Switch to a day: update state, buttons, load plan
  async function _switchToDay(day) {
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat","All Days"];
    selectedDay      = day;
    selectedItems    = [];
    isDirty          = false;
    planLoadedForDay = null;
    renderSelected();

    const row = document.querySelector(".r-day-row");
    if (row) {
      row.innerHTML = "";
      for (let i = 0; i <= 7; i++) {
        const btn       = document.createElement("button");
        btn.className   = `r-day-btn${i === day ? " active" : ""}`;
        btn.textContent = dayNames[i];
        btn.onclick     = () => window._recitalSelectDay(i);
        row.appendChild(btn);
      }
    }
    await loadExistingPlan();
  }

  // When leaving "All Days" with a selection: ask add-on vs replace
  async function _applyAllDaysToOtherDays() {
    const mobile       = localStorage.getItem("mobile");
    const allDaysItems = [...selectedItems]; // current All Days selection
    const workerItems  = _buildWorkerItems(allDaysItems);

    const choice = confirm(
      `Adiyen, how should this "All Days" selection be applied to each day?

` +
      `OK  → Add to each day's existing selections (keep what they have + add these)
` +
      `Cancel → Replace all days with exactly this selection`
    );

    // Save All Days plan first
    await window._recitalSavePlan(true);

    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let d = 0; d <= 6; d++) {
      try {
        if (choice) {
          // Add-on: fetch existing plan for day, merge, save
          const res  = await fetch(
            `${WORKER}/recital/plan?mobile=${encodeURIComponent(mobile)}&day=${d}`
          );
          const data = await res.json();
          const existingItems = (data.items || []).map(i => ({
            entity_type: i.entity_type,
            entity_id:   i.entity_id
          }));
          // Merge: existing first, then allDays items not already in existing
          // Then apply priority order (sec1/sec8/sec3 first)
          const existingKeys = new Set(existingItems.map(i => `${i.entity_type}_${i.entity_id}`));
          const rawMerged = [
            ...existingItems,
            ...workerItems.filter(i => !existingKeys.has(`${i.entity_type}_${i.entity_id}`))
          ];
          // Priority-order the merged set: reconstruct pseudo-items with global_no_start
          // For existing DB items we don't have global_no_start, so sort sec1/8/3 first,
          // then keep the rest in their original order
          const sec1Items = rawMerged.filter(i => i.entity_type === "section" && i.entity_id === 1);
          const sec8Items = rawMerged.filter(i => i.entity_type === "section" && i.entity_id === 8);
          const sec3Items = rawMerged.filter(i => i.entity_type === "section" && i.entity_id === 3);
          const otherItems = rawMerged.filter(i =>
            !(i.entity_type === "section" && [1, 8, 3].includes(i.entity_id))
          );
          const merged = [...sec1Items, ...sec8Items, ...sec3Items, ...otherItems];
          await fetch(`${WORKER}/recital/plan`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mobile,
              day_of_week: d,
              plan_name:   `My Recital — Day ${d}`,
              items:       merged
            })
          });
        } else {
          // Replace: overwrite each day with allDays items
          await fetch(`${WORKER}/recital/plan`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mobile,
              day_of_week: d,
              plan_name:   `My Recital — Day ${d}`,
              items:       workerItems
            })
          });
        }
      } catch(e) {
        console.error(`Failed to apply All Days to ${dayNames[d]}:`, e);
      }
    }

    showToast(choice
      ? `Added to all 7 days 🙏`
      : `Replaced all 7 days with this selection 🙏`
    );
    // Now switch to the day the user was clicking
    // (we lost target day — switch to Sunday by default after All Days)
    await _switchToDay(0);
  }

  // Build worker-ready items array from selectedItems (expands rettai_group)
  function _buildWorkerItems(items) {
    const result = [];
    for (const item of items) {
      if (item.entity_type === "rettai_group") {
        result.push({
          entity_type:     item.rettai_source.entity_type,
          entity_id:       item.rettai_source.entity_id,
          is_rettai:       true,
          section_id:      item.section_id || null,
          pathu_id:        item.pathu_id   || null,
          global_no_start: item.global_no_start || 0
        });
      } else {
        // Save pathu_id and section_id so reload can restore parent/child relationships
        result.push({
          entity_type:     item.entity_type,
          entity_id:       item.entity_id,
          section_id:      item.section_id || null,
          pathu_id:        item.pathu_id   || null,
          global_no_start: item.global_no_start || 0
        });
      }
    }
    return result;
  }

  window._recitalAddKoil = (koilId) => {
    const label = koilId === 1 ? "கோயில் திருமொழி" : "கோயில் திருவாய்மொழி";
    const gns   = koilId === 1 ? 948 : 2675;
    const sid   = koilId === 1 ? 11  : 26;
    if (isSelected("koil", koilId)) { showToast(`"${label}" already added.`); return; }
    const removed = selectedItems.filter(i => i.section_id === sid);
    if (removed.length) selectedItems = selectedItems.filter(i => i.section_id !== sid);
    selectedItems.push({ entity_type:"koil", entity_id:koilId, label,
      global_no_start:gns, section_id:sid, pathu_id:null });
    isDirty = true; renderSelected();
    showToast(removed.length ? `Replaced with "${label}"` : `"${label}" added 🙏`);
  };

  window._recitalOpenSection = openSectionModal;

  // Section checkbox in modal
  window._recitalToggleSection = (section_id, section_name, global_no_start, checked) => {
    if (checked) {
      // Section 21 (திருவெழுகூற்றிருக்கை) has no rettai — add full directly
      if (Number(section_id) === 21) {
        addItem("section", section_id, section_name, global_no_start, section_id, null);
        return;
      }
      showFullRettaiPopup("section", section_id, section_name,
        global_no_start, section_id, null);
    } else {
      removeItem("section", section_id);
    }
  };

  // Pathu checkbox in modal
  window._recitalTogglePathuCheck = (section_id, section_name, pathu_id, pathu_name, pathu_no, global_no_start, checked) => {
    if (checked) {
      const label = `${section_name} — ${pathu_name}`;
      showFullRettaiPopup("pathu", pathu_id, label, global_no_start||0, section_id, null, 0, false, pathu_no);
    } else {
      removeItem("pathu", pathu_id);
    }
  };

  // Thirumozhi checkbox (Type 2 sections)
  window._recitalToggleThirumozhiCheck = (thirumozhi_id, label, global_no_start, global_no_end, section_id, pathu_id, checked) => {
    if (checked) {
      showFullRettaiPopup("thirumozhi", thirumozhi_id, label,
        global_no_start, section_id, pathu_id, global_no_end);
    } else {
      removeItem("thirumozhi", thirumozhi_id);
    }
  };

  // Thirumozhi checkbox (Type 1 pathu drill)
  // global_no_end passed so rettai can be scoped to this child's range
  window._recitalToggleThirumozhiPathuCheck = (pathu_id, label, global_no_start, global_no_end, section_id, parent_pathu_id, checked) => {
    if (checked) {
      // Always true — every item in pathu drill is a child by definition
      showFullRettaiPopup("pathu", pathu_id, label,
        global_no_start, section_id, parent_pathu_id, global_no_end, true);
    } else {
      removeItem("pathu", pathu_id);
    }
  };

  // Full/Rettai popup actions
  window._recitalPickFull = () => {
    if (!pendingItem) return;
    const { entity_type, entity_id, label, global_no_start, section_id, pathu_id, is_child, global_no_end, pathu_no } = pendingItem;
    addItem(entity_type, entity_id, label, global_no_start, section_id, pathu_id, is_child, global_no_end, pathu_no);
    document.getElementById("r-popup-overlay").classList.remove("open");
    pendingItem = null;
  };

  window._recitalPickRettai = async () => {
    if (!pendingItem) return;
    const { entity_type, entity_id, label, global_no_start, section_id, pathu_id } = pendingItem;
    document.getElementById("r-popup-overlay").classList.remove("open");

    try {
      // Pass is_child flag so worker scopes to exact thirumozhi vs full pathu
      const rettaiParams = new URLSearchParams({ entity_type, entity_id });
      if (pendingItem.is_child) {
        rettaiParams.set("is_child", "1");
        if (pendingItem.global_no_start) rettaiParams.set("gns", pendingItem.global_no_start);
        if (pendingItem.global_no_end)   rettaiParams.set("gne", pendingItem.global_no_end);
      }
      const res  = await fetch(`${WORKER}/recital/rettai?${rettaiParams}`);
      const data = await res.json();

      if (!data.pasurams || !data.pasurams.length) {
        showToast("No Rettai pasurams found for this selection.");
        pendingItem = null;
        return;
      }

      // Store as ONE grouped rettai item — not individual pasurams
      // entity_id = first pasuram global_no (for uniqueness); pasurams array stored inside
      const rettaiId    = `${entity_type}_${entity_id}`; // e.g. "pathu_42"
      const rettaiLabel = `${label} — இரட்டை (${data.pasurams.length} pasurams)`;

      // Check duplicate
      if (selectedItems.some(i => i.entity_type === "rettai_group" && i.rettai_key === rettaiId)) {
        showToast(`Rettai for "${label}" already added.`);
        pendingItem = null;
        return;
      }

      // Check if a non-rettai superior (full pathu or section) already covers this
      const conflict = findSuperiorConflict(entity_type, entity_id, section_id, pathu_id, false);
      if (conflict && conflict.existing.entity_type !== "rettai_group") {
        showToast(`Adiyen, "${conflict.existing.label}" already covers this. Delete it first.`);
        pendingItem = null;
        return;
      }

      // Determine hierarchy for this rettai item
      // PATHU type: child = pathu_id differs from entity_id; parent = pathu_id
      // THIRUMOZHI type: always a child of its section; section_id = parent
      // SECTION type: full section rettai — superior to all thirumozhi rettai of same section
      const isThirumozhiType = entity_type === "thirumozhi";
      const isChildRettai = pendingItem.is_child ||
        isThirumozhiType ||
        (pathu_id && pathu_id !== entity_id);
      const parentPathuId = isChildRettai && !isThirumozhiType ? pathu_id : entity_id;

      if (isChildRettai) {
        if (isThirumozhiType) {
          // Thirumozhi rettai: check if full section rettai exists for same section
          const fullSectionRettai = selectedItems.find(i =>
            i.entity_type === "rettai_group" &&
            i.rettai_source.entity_type === "section" &&
            Number(i.rettai_source.entity_id) === Number(section_id) &&
            !i.is_child
          );
          if (fullSectionRettai) {
            showToast(`Adiyen, section rettai "${fullSectionRettai.label}" already covers this.`);
            pendingItem = null;
            return;
          }
        } else {
          // Pathu child rettai: check if full-pathu rettai of same parent exists
          const fullPathuRettai = selectedItems.find(i =>
            i.entity_type === "rettai_group" &&
            i.rettai_source.entity_id === parentPathuId &&
            !i.is_child
          );
          if (fullPathuRettai) {
            showToast(`Adiyen, full pathu rettai "${fullPathuRettai.label}" already covers this.`);
            pendingItem = null;
            return;
          }
        }
      } else {
        // Adding full pathu/section rettai:
        // Remove child rettai items from same pathu/section
        let childRettaiToRemove;
        if (entity_type === "section") {
          // Remove all thirumozhi rettai of same section
          // Match by section_id (coerce to number for safety) OR by rettai_source being thirumozhi
          childRettaiToRemove = selectedItems.filter(i =>
            i.entity_type === "rettai_group" &&
            i.is_child && (
              Number(i.section_id) === Number(section_id) ||
              (i.rettai_source?.entity_type === "thirumozhi" &&
               Number(i.section_id) === Number(section_id))
            )
          );
        } else {
          // Remove child thirumozhi rettai of same pathu
          childRettaiToRemove = selectedItems.filter(i =>
            i.entity_type === "rettai_group" &&
            i.is_child &&
            i.pathu_id === entity_id
          );
        }
        if (childRettaiToRemove.length) {
          const removedLabels = childRettaiToRemove.map(i => i.label).join(", ");
          const removeKeys = new Set(childRettaiToRemove.map(i => i.rettai_key));
          selectedItems = selectedItems.filter(i =>
            !(i.entity_type === "rettai_group" && removeKeys.has(i.rettai_key))
          );
          showToast(`Replaced "${removedLabels}" with full rettai`);
        }
        // Remove individual pasurams from same section (full section rettai covers all)
        if (entity_type === "section") {
          selectedItems = selectedItems.filter(i =>
            !(i.entity_type === "pasuram" && Number(i.section_id) === Number(section_id))
          );
        }
      }

      // Remove individual pasurams covered by this rettai's range
      if (pendingItem.global_no_start && pendingItem.global_no_end) {
        const gns = pendingItem.global_no_start;
        const gne = pendingItem.global_no_end;
        selectedItems = selectedItems.filter(i =>
          !(i.entity_type === "pasuram" && i.entity_id >= gns && i.entity_id <= gne)
        );
      }
      // Full pathu rettai: remove pasurams by section_id + pathu_no
      if (pendingItem.pathu_no && pendingItem.section_id) {
        selectedItems = selectedItems.filter(i =>
          !(i.entity_type === "pasuram" &&
            Number(i.section_id) === Number(pendingItem.section_id) &&
            i.pathu_no && Number(i.pathu_no) === Number(pendingItem.pathu_no))
        );
      }

      selectedItems.push({
        entity_type:     "rettai_group",
        entity_id:       data.pasurams[0].global_no, // first pasuram no as numeric id
        rettai_key:      rettaiId,                   // unique key for duplicate check
        rettai_source:   { entity_type, entity_id }, // original source for saving
        label:           rettaiLabel,
        global_no_start: data.pasurams[0].global_no,
        section_id:      section_id || null,
        // pathu_id: for pathu-child rettai = parent id; for full pathu = entity_id; for thirumozhi/section = null
        // Store pathu_id ONLY for children — null for full pathu/section rettai
        // This lets reload distinguish: pathu_id=null → full; pathu_id set → child
        pathu_id:        isThirumozhiType ? null
                       : (isChildRettai ? parentPathuId : null),
        is_child:        isChildRettai,
        pasurams:        data.pasurams.map(p => p.global_no) // actual pasuram nos
      });
      isDirty = true;
      renderSelected();
      showToast(`இரட்டை pasurams added for "${label}" 🙏`);
    } catch(e) {
      showToast("Error fetching Rettai pasurams: " + e.message);
    }
    pendingItem = null;
  };

  window._recitalCancelPopup = () => {
    document.getElementById("r-popup-overlay").classList.remove("open");
    pendingItem = null;
  };

  // Pathu drill down
  window._recitalOpenPathu = async (section_id, section_name, pathu_no, pathu_name, pathu_id, global_no_start) => {
    const res  = await fetch(
      `${WORKER}/recital/catalog?section_id=${section_id}&pathu_no=${pathu_no}`
    );
    const data = await res.json();
    modalStack.push({
      level: "pathu", section_id, section_name,
      pathu_id, pathu_no, pathu_name, global_no_start: global_no_start||0, data
    });
    renderModalContent();
  };

  window._recitalModalBack = () => {
    if (modalStack.length > 1) { modalStack.pop(); renderModalContent(); }
  };

  window._recitalCloseModal = () => {
    document.getElementById("r-modal-overlay").classList.remove("open");
    modalStack = [];
  };

  window._recitalCloseModalOutside = (e) => {
    if (e.target.id === "r-modal-overlay") window._recitalCloseModal();
  };

  window._recitalRemoveItem = (entity_type, entity_id) => {
    removeItem(entity_type, Number(entity_id));
  };

  window._recitalDragStart = (i)      => { dragSrcIndex = i; };
  window._recitalDragEnd   = ()       => { dragSrcIndex = null; };
  window._recitalDragOver  = (e)      => { e.preventDefault(); };
  window._recitalDragDrop  = (target) => {
    if (dragSrcIndex === null || dragSrcIndex === target) return;
    const moved = selectedItems.splice(dragSrcIndex, 1)[0];
    selectedItems.splice(target, 0, moved);
    isDirty = true;
    renderSelected();
  };

  window._recitalLookupPasuram = async () => {
    const no      = parseInt(document.getElementById("r-pasuram-input")?.value?.trim());
    const preview = document.getElementById("r-pasuram-preview");
    if (!preview) return;

    if (!no || isNaN(no)) {
      preview.innerHTML = `<span style="color:#c0392b">Enter a valid pasuram number</span>`;
      return;
    }
    if (no < 1 || no > 3776) {
      preview.innerHTML = `<span style="color:#c0392b">
        Pasuram number must be between 1 and 3776</span>`;
      return;
    }

    try {
      const [lookupRes, linesRes] = await Promise.all([
        fetch(`${WORKER}/recital/pasuram-lookup?no=${no}`),
        fetch(`${WORKER}/recital/pasuram-lines?no=${no}`)
      ]);
      const data      = await lookupRes.json();
      const linesData = await linesRes.json();

      if (data.error) {
        preview.innerHTML = `<span style="color:#c0392b">Pasuram ${no} not found</span>`;
        return;
      }

      const label = `Pasuram ${data.global_no} — ${data.section_name}` +
                    (data.pathu_name      ? ` — ${data.pathu_name}`      : "") +
                    (data.thirumozhi_name ? ` — ${data.thirumozhi_name}` : "");

      let previewLines = "";
      if (linesData.lines?.length) {
        previewLines = linesData.lines.slice(0, 4).map(l =>
          `<div style="font-size:13px;color:#4a2c00;line-height:1.7">${l.line_text}</div>`
        ).join("");
      }

      preview.innerHTML = `
        <div style="background:#fef3d0;border:1px solid #e8c060;
                    border-radius:8px;padding:10px;margin-top:6px">
          <div style="font-size:12px;font-weight:700;color:#7a4d00;
                      margin-bottom:6px">${label}</div>
          ${previewLines}
          <button onclick="window._recitalConfirmPasuram(
                    ${data.global_no},
                    '${escHtml(label)}',
                    ${data.section_id || 0},
                    ${data.pathu_id   || 0},
                    ${data.pathu_no   || 0})"
            style="margin-top:8px;padding:6px 14px;background:#7a4d00;
                   color:#fff;border:none;border-radius:6px;font-size:12px;
                   font-weight:700;cursor:pointer;width:100%">
            Add Pasuram ✓
          </button>
        </div>`;
    } catch(e) {
      preview.innerHTML = `<span style="color:#c0392b">Error: ${e.message}</span>`;
    }
  };

  window._recitalConfirmPasuram = (global_no, label, section_id, pathu_id, pathu_no) => {
  if (!label || label === "undefined") {
    label = `Pasuram ${global_no}`;
  }
  const gno = Number(global_no);
  // Check if this pasuram is already covered by any existing selection
  const alreadyCovered = selectedItems.some(i => {
    // Full section covers all pasurams in that section
    if (i.entity_type === "section" &&
        i.section_id && Number(i.section_id) === Number(section_id)) return true;
    // Koil covers its section
    if (i.entity_type === "koil" &&
        i.section_id && Number(i.section_id) === Number(section_id)) return true;
    // Full pathu (pathu_id=null, not a child): covers all in that section+pathu_no
    // Child pathu: only covers its own global_no range — checked below
    if (i.entity_type === "pathu" && !i.is_child && !i.pathu_id &&
        i.section_id && Number(i.section_id) === Number(section_id)) return true;
    // Child pathu/thirumozhi: only blocks if pasuram falls within its range
    if ((i.entity_type === "pathu" && i.is_child) || i.entity_type === "thirumozhi") {
      const gns = i.global_no_start || 0;
      const gne = i.global_no_end   || 0;
      if (gns && gne && gno >= gns && gno <= gne) return true;
    }
    // Individual pasuram already added
    if (i.entity_type === "pasuram" && i.entity_id === gno) return true;
    // Rettai group — check if this pasuram is in the rettai list
    if (i.entity_type === "rettai_group" && i.pasurams?.includes(gno)) return true;
    return false;
  });
  if (alreadyCovered) {
    showToast(`Adiyen, Pasuram ${gno} is already covered by an existing selection.`);
    const inp = document.getElementById("r-pasuram-input");
    const pre = document.getElementById("r-pasuram-preview");
    if (inp) inp.value = "";
    if (pre) pre.innerHTML = "";
    return;
  }
  addItem(
    "pasuram",
    gno,
    label,
    gno,
    section_id ? Number(section_id) : null,
    pathu_id   ? Number(pathu_id)   : null,
    false, 0,
    pathu_no   ? Number(pathu_no)   : null
  );
  const inp = document.getElementById("r-pasuram-input");
  const pre = document.getElementById("r-pasuram-preview");
  if (inp) inp.value  = "";
  if (pre) pre.innerHTML = "";
};

  // silent=true skips DOM feedback (used when auto-saving before day switch)
  window._recitalSavePlan = async (silent = false) => {
    const mobile  = localStorage.getItem("mobile");
    const saveMsg = document.getElementById("r-save-msg");

    const orderedItems = applyPriorityOrder(selectedItems);

    // Expand rettai_group items into worker-ready format
    const workerItems = _buildWorkerItems(orderedItems);

    // If empty, still save — this marks it as a recital-free day
    // Worker must accept empty items array; if it returns 500 for empty,
    // we guard here and just mark clean locally
    if (workerItems.length === 0) {
      // Try to save empty; if worker rejects, treat as locally saved (free day)
      try {
        const res = await fetch(`${WORKER}/recital/plan`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobile,
            day_of_week: selectedDay,
            plan_name:   `My Recital — Day ${selectedDay}`,
            items:       []
          })
        });
        // Accept both success and 500 for empty (worker may not support yet)
        const data = await res.json().catch(() => ({ success: true }));
        isDirty = false;
        if (!silent && saveMsg) {
          saveMsg.style.color   = "#b38b2e";
          saveMsg.textContent   = "Recital-free day saved 🙏";
          saveMsg.style.display = "block";
          setTimeout(() => { saveMsg.style.display = "none"; }, 3000);
        }
      } catch(e) {
        // Even on error, mark clean — user's intent is clear
        isDirty = false;
      }
      return;
    }

    try {
      const res  = await fetch(`${WORKER}/recital/plan`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile,
          day_of_week: selectedDay,
          plan_name:   `My Recital — Day ${selectedDay}`,
          items:       workerItems
        })
      });
      const data = await res.json();

      if (data.success) {
        selectedItems = orderedItems;
        isDirty       = false;
        renderSelected();
        if (!silent && saveMsg) {
          saveMsg.style.color   = "#b38b2e";
          saveMsg.textContent   = "Plan saved successfully 🙏";
          saveMsg.style.display = "block";
          setTimeout(() => { saveMsg.style.display = "none"; }, 3000);
        }
      } else {
        throw new Error(data.error || "Save failed");
      }
    } catch(e) {
      if (!silent && saveMsg) {
        saveMsg.style.color   = "#c0392b";
        saveMsg.textContent   = "Error: " + e.message;
        saveMsg.style.display = "block";
      }
    }
  };

  window._recitalCreateGhoshti = async (plan_id) => {
    const mobile     = localStorage.getItem("mobile");
    const resultEl   = document.getElementById("r-ghoshti-result");
    if (!resultEl) return;
    const ghoshti_name = prompt("Enter a name for this Ghoshti session:");
    if (!ghoshti_name) return;
    const start_time   = new Date().toISOString();
    try {
      const res  = await fetch(`${WORKER}/recital/ghoshti`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id, mobile, ghoshti_name, start_time })
      });
      const data = await res.json();
      if (data.success) {
        resultEl.innerHTML = `
          Ghoshti link created! 🙏<br>
          <a href="${data.link}" target="_blank"
             style="color:#b38b2e;font-weight:700">${data.link}</a><br>
          <span style="font-size:11px;color:#999">
            Expires: ${new Date(data.expires_at).toLocaleString()}
          </span>`;
      } else throw new Error(data.error);
    } catch(e) {
      resultEl.style.color = "#c0392b";
      resultEl.textContent = "Error: " + e.message;
    }
  };
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
function recitalCSS() {
  return `<style>
  .recital-wrap {
    max-width:680px; margin:0 auto;
    padding:20px 16px 40px;
    background:#fffdf5; min-height:calc(100vh - 160px);
  }
  .recital-title {
    text-align:center; font-size:18px; font-weight:900;
    color:#4a2c00; margin-bottom:4px;
  }
  .recital-sub {
    text-align:center; font-size:12px; color:#b38b2e; margin-bottom:20px;
  }
  .recital-nav-row {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:16px;
  }
  .recital-back-link {
    font-size:13px; color:#b38b2e; cursor:pointer; text-decoration:underline;
  }
  .recital-intro-card {
    background:#fff; border:1.5px solid #e8c060; border-radius:12px;
    padding:16px; margin-bottom:20px;
  }
  .recital-intro-how {
    font-size:11px; font-weight:700; color:#b38b2e;
    text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px;
  }
  .recital-intro-step {
    display:flex; align-items:flex-start; gap:10px;
    font-size:13px; color:#4a2c00; margin-bottom:8px; line-height:1.5;
  }
  .recital-step-no {
    background:#7a4d00; color:#fef0c0; border-radius:50%;
    width:20px; height:20px; display:flex; align-items:center;
    justify-content:center; font-size:11px; font-weight:900; flex-shrink:0;
  }
  .recital-intro-btns { display:flex; gap:10px; margin-bottom:20px; }
  .recital-btn-primary {
    flex:1; padding:13px; background:#7a4d00; color:#fef0c0;
    border:none; border-radius:10px; font-size:15px; font-weight:700;
    cursor:pointer; transition:background .2s;
  }
  .recital-btn-primary:hover { background:#4a2c00; }
  .recital-btn-secondary {
    flex:1; padding:13px; background:#fff; color:#7a4d00;
    border:2px solid #e8c060; border-radius:10px; font-size:15px;
    font-weight:700; cursor:pointer; transition:all .2s;
  }
  .recital-btn-secondary:hover { background:#fef3d0; }
  .r-section-label {
    font-size:11px; font-weight:700; color:#b38b2e;
    text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px;
  }
  .r-day-row {
    display:flex; gap:6px; flex-wrap:wrap;
    justify-content:center; margin-bottom:20px;
  }
  .r-day-btn {
    padding:7px 12px; border:1.5px solid #e8c060; border-radius:20px;
    font-size:12px; font-weight:700; color:#7a4d00; background:#fff;
    cursor:pointer; transition:all .2s;
  }
  .r-day-btn.active { background:#7a4d00; color:#fef0c0; border-color:#7a4d00; }
  .r-selected-wrap {
    background:#fef3d0; border:2px solid #e8c060; border-radius:12px;
    padding:14px; margin-bottom:16px;
  }
  .r-selected-label {
    font-size:11px; font-weight:700; color:#b38b2e;
    text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px;
  }
  .r-selected-empty { font-size:13px; color:#bbb; text-align:center; padding:8px 0; }
  .r-selected-item {
    background:#fff; border:1px solid #e8c060; border-radius:8px;
    padding:8px 10px; margin-bottom:6px;
    display:flex; align-items:center; gap:8px;
  }
  .r-selected-item-label {
    flex:1; font-size:12px; color:#4a2c00; font-weight:600; line-height:1.4;
  }
  .r-pasuram-box {
    background:#fff; border:1.5px solid #e8c060; border-radius:10px;
    padding:14px; margin-bottom:16px;
  }
  .r-pasuram-label { font-size:12px; font-weight:700; color:#7a4d00; margin-bottom:8px; }
  .r-pasuram-row { display:flex; gap:8px; }
  .r-pasuram-input {
    flex:1; padding:10px 12px; border:1.5px solid #e8c060; border-radius:8px;
    font-size:15px; color:#4a2c00; background:#fffdf5; outline:none;
  }
  .r-pasuram-btn {
    padding:10px 16px; background:#7a4d00; color:#fef0c0;
    border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer;
  }
  .r-pasuram-preview { margin-top:8px; font-size:12px; color:#7a4d00; }
  .r-thousand-group { margin-bottom:16px; }
  .r-thousand-name {
    font-size:12px; font-weight:700; color:#b38b2e;
    border-bottom:1px solid #e8c060; padding-bottom:4px; margin-bottom:8px;
  }
  .r-section-card {
    background:#fff; border:1.5px solid #e8c060; border-radius:10px;
    padding:12px 14px; margin-bottom:8px;
    display:flex; align-items:center; justify-content:space-between;
    cursor:pointer; transition:background .2s;
  }
  .r-section-card:hover { background:#fef3d0; }
  .r-section-name { font-size:15px; font-weight:700; color:#4a2c00; }
  .r-save-msg { text-align:center; font-size:13px; margin-top:10px; display:none; }
  .r-modal-overlay {
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,0.45); z-index:1000;
    align-items:center; justify-content:center;
  }
  .r-modal-overlay.open { display:flex; }
  .r-modal-box {
    background:#fff; border:3px double #b38b2e; border-radius:16px;
    width:96%; max-width:420px; max-height:85vh; overflow-y:auto;
    padding:16px; animation:modalIn .25s ease;
  }
  @keyframes modalIn {
    from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none}
  }
  .r-modal-header {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:14px;
  }
  .r-modal-title { font-size:14px; font-weight:900; color:#4a2c00; }
  .r-modal-close { font-size:20px; cursor:pointer; color:#b38b2e; font-weight:700; }
  .r-modal-back {
    font-size:12px; color:#b38b2e; cursor:pointer;
    text-decoration:underline; margin-bottom:10px; display:none;
  }
  .r-modal-option {
    display:flex; align-items:center; gap:8px;
    padding:8px 0; border-bottom:1px solid #f0e0b0; text-align:left;
  }
  .r-modal-option:last-child { border-bottom:none; }
  .r-modal-option input[type="checkbox"] {
    width:16px; height:16px; accent-color:#7a4d00; flex-shrink:0; cursor:pointer;
  }
  .r-modal-option-label {
    flex:1; font-size:12px; color:#4a2c00; font-weight:600;
    line-height:1.4; text-align:left;
  }
  .r-modal-drill {
    font-size:11px; color:#b38b2e; cursor:pointer;
    padding:2px 6px; border:1px solid #e8c060;
    border-radius:6px; white-space:nowrap; flex-shrink:0;
  }
  .r-modal-divider { text-align:left; font-size:11px; color:#bbb; margin:6px 0; }
  .r-popup-overlay {
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,0.45); z-index:1001;
    align-items:center; justify-content:center;
  }
  .r-popup-overlay.open { display:flex; }
  .r-popup-box {
    background:#fff; border:3px double #b38b2e; border-radius:16px;
    width:90%; max-width:360px; padding:20px;
    animation:modalIn .25s ease;
  }
  .r-popup-title {
    font-size:15px; font-weight:900; color:#4a2c00;
    text-align:center; margin-bottom:6px;
  }
  .r-popup-sub {
    font-size:12px; color:#7a4d00; text-align:center; margin-bottom:16px;
  }
  .r-toast {
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#4a2c00; color:#fef0c0; padding:10px 18px;
    border-radius:20px; font-size:13px; font-weight:600;
    opacity:0; transition:opacity .3s; z-index:2000;
    max-width:90%; text-align:center; pointer-events:none;
  }
  .r-toast.show { opacity:1; }
  .r-recital-content { padding-bottom:20px; }
  .r-block { margin-bottom:20px; }
  .r-block-thaniyan {
    background:#fef3d0; border:1.5px solid #e8c060;
    border-radius:10px; padding:14px;
  }
  .r-block-pasuram {
    display:flex; gap:10px; padding:10px 0;
    border-bottom:1px solid #f0e0b0;
  }
  .r-pasuram-no {
    font-size:11px; font-weight:700; color:#b38b2e;
    width:24px; flex-shrink:0; padding-top:2px;
  }
  .r-pasuram-lines { flex:1; }
  .r-recital-group { margin-bottom:8px; }
  .r-line { font-size:16px; color:#4a2c00; line-height:1.8; }
  .r-thaniyan-title {
    font-size:13px; font-weight:900; color:#7a4d00; margin-bottom:4px;
  }
  .r-thaniyan-subhead {
    font-size:12px; color:#b38b2e; margin-bottom:6px; font-style:italic;
  }
  .r-thaniyan-group { margin-bottom:10px; }
  .r-block-badge {
    font-size:10px; font-weight:700; color:#b38b2e;
    text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px;
  }
  .r-block-sattrumurai {
    background:#fff8e8; border:1px solid #e8c060;
    border-radius:8px; padding:10px;
  }
  </style>`;
}