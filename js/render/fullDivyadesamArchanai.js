// =============================================================
// fullDivyadesamArchanai.js  →  js/render/fullDivyadesamArchanai.js
// Archanai — index of all archanais, then a slideshow for the one chosen
//
//   Data:  cdnaalayiram-api  /api/archanai            (index)
//                            /api/archanai?id=N       (one archanai)
//          tables archanai_master + archanai_nama_master
//
//   Script follows the site's "Read in" banner (localStorage "script").
//   Every request carries script= explicitly — api.js leaves URLs that
//   already contain script= on the production worker, so workeri18n
//   needs no archanai route.
//
//   layout.js is unchanged: it awaits renderFullDivyadesamArchanai(),
//   sets app.innerHTML, then calls window._farchInit().
// =============================================================

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";
import { t as uiText } from "../utils/uiStrings.js";

// uiText for an existing key; English fallback for keys not yet in uiStrings.js
function tx(key, fallback) {
  try {
    const v = uiText(key);
    return (v && v !== key) ? v : fallback;
  } catch (e) { return fallback; }
}

// ── Script (same rule as api.js getScript) ───────────────────────
const VALID_SCRIPTS = ["te", "ml", "kn", "deva", "iast", "gu", "bn"];
function currentScript() {
  try {
    const s = (localStorage.getItem("script") || "ta").toLowerCase();
    return VALID_SCRIPTS.includes(s) ? s : "ta";
  } catch (e) { return "ta"; }
}

// "Noto Sans" sits after each script font so the Tamil subscript
// digits (₂ ₃ ₄) always have a font that draws them.
const FONT_STACK = {
  ta:   '"Noto Sans Tamil","Noto Sans","Latha",sans-serif',
  deva: '"Noto Sans Devanagari","Noto Sans","Mangal",sans-serif',
  te:   '"Noto Sans Telugu","Noto Sans",sans-serif',
  kn:   '"Noto Sans Kannada","Noto Sans",sans-serif',
  ml:   '"Noto Sans Malayalam","Noto Sans",sans-serif',
  bn:   '"Noto Sans Bengali","Noto Sans",sans-serif',
  gu:   '"Noto Sans Gujarati","Noto Sans",sans-serif',
  iast: '"Noto Sans",sans-serif',
};
const GFONT = {
  ta: "Noto+Sans+Tamil", deva: "Noto+Sans+Devanagari", te: "Noto+Sans+Telugu",
  kn: "Noto+Sans+Kannada", ml: "Noto+Sans+Malayalam", bn: "Noto+Sans+Bengali",
  gu: "Noto+Sans+Gujarati", iast: "Noto+Sans",
};
function loadFonts(sc) {
  [sc, "iast"].forEach(k => {
    const id = "gfont-arch-" + k;
    if (!GFONT[k] || document.getElementById(id)) return;
    const lk = document.createElement("link");
    lk.id = id; lk.rel = "stylesheet";
    lk.href = "https://fonts.googleapis.com/css2?family=" + GFONT[k] + ":wght@400;700&display=swap";
    document.head.appendChild(lk);
  });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Styles ───────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("farch-style")) return;
  const s = document.createElement("style");
  s.id = "farch-style";
  s.textContent = `
    .farch-page {
      background:#1a0a00;min-height:100vh;box-sizing:border-box;
      display:flex;flex-direction:column;align-items:center;
      padding:18px 14px 110px;
    }
    .farch-page *, .farch-page *::before, .farch-page *::after { box-sizing:border-box; }
    .farch-title {
      text-align:center;font-size:21px;font-weight:700;color:#f0d080;
      margin:0 0 4px;letter-spacing:.02em;line-height:1.5;
    }
    .farch-subtitle { text-align:center;font-size:13px;color:#c9a84c;margin-bottom:16px; }
    .farch-wrap { width:100%;max-width:600px;display:flex;flex-direction:column;gap:12px; }

    /* ── Index ── */
    .farch-feature {
      width:100%;text-align:left;cursor:pointer;
      background:#2a1400;border:2px solid #c9a84c;border-radius:14px;
      padding:16px;color:#f0d080;box-shadow:0 0 30px rgba(201,168,76,.22);
      display:flex;flex-direction:column;gap:4px;font:inherit;
    }
    .farch-group-name {
      font-family:Arial,sans-serif;font-size:11px;letter-spacing:.09em;
      text-transform:uppercase;color:#a07c3c;margin:10px 2px 0;
    }
    .farch-item {
      width:100%;text-align:left;cursor:pointer;font:inherit;
      background:#241100;border:1px solid #5a3a14;border-radius:10px;
      padding:12px 14px;color:#f0d080;
      display:flex;align-items:center;gap:12px;
    }
    .farch-item:hover, .farch-feature:hover { background:#331a02; }
    .farch-item:focus-visible, .farch-feature:focus-visible, .farch-btn:focus-visible {
      outline:2px solid #f0d080;outline-offset:2px;
    }
    .farch-item-text { flex:1;min-width:0;display:flex;flex-direction:column;gap:2px; }
    .farch-item-title { font-size:16px;font-weight:700;line-height:1.5;overflow-wrap:anywhere; }
    .farch-item-en { font-family:Arial,sans-serif;font-size:12px;color:#b8925a; }
    .farch-count {
      font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1a0a00;
      background:#c9a84c;border-radius:999px;padding:3px 9px;white-space:nowrap;
      font-variant-numeric:tabular-nums;
    }

    /* ── Slideshow ── */
    .farch-back {
      align-self:flex-start;background:transparent;border:1px solid #5a3a14;color:#c9a84c;
      border-radius:999px;padding:6px 14px;font-family:Arial,sans-serif;font-size:13px;cursor:pointer;
    }
    .farch-stage {
      width:100%;min-height:240px;background:#2a1400;border:2px solid #c9a84c;border-radius:14px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:22px 18px;box-shadow:0 0 40px rgba(201,168,76,.3);
    }
    .farch-no {
      font-family:Arial,sans-serif;font-size:13px;color:#c9a84c;font-weight:700;
      margin-bottom:10px;letter-spacing:.08em;font-variant-numeric:tabular-nums;
    }
    .farch-caption {
      font-size:19px;font-weight:700;color:#f0d080;text-align:center;
      line-height:1.5;margin-bottom:10px;overflow-wrap:anywhere;
    }
    .farch-caption:empty { display:none; }
    .farch-namavalli {
      font-size:var(--base-font,19px);color:#ffeebb;text-align:center;line-height:1.9;
      overflow-wrap:anywhere;transition:opacity .35s ease;
    }
    .farch-namavalli.fade { opacity:0; }
    .farch-progress-wrap { width:100%;background:#3a2000;border-radius:4px;height:4px;overflow:hidden; }
    .farch-progress-bar { height:100%;background:#c9a84c;width:0%;transition:width .3s linear; }
    .farch-controls { display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center; }
    .farch-btn {
      padding:10px 18px;border-radius:8px;border:1.5px solid #c9a84c;background:transparent;
      color:#f0d080;font-size:14px;cursor:pointer;font-family:Arial,sans-serif;
    }
    .farch-btn:hover { background:#3a2000; }
    .farch-btn.active { background:#c9a84c;color:#1a0a00; }
    .farch-play { width:200px;font-size:16px;padding:12px; }
    .farch-speed-wrap {
      display:flex;align-items:center;justify-content:center;gap:10px;color:#c9a84c;
      font-family:Arial,sans-serif;font-size:13px;
    }
    .farch-speed-wrap input[type=range] { accent-color:#c9a84c;width:150px;cursor:pointer; }
    .farch-goto { display:flex;gap:6px;align-items:center; }
    .farch-goto input {
      width:84px;padding:9px 8px;border-radius:8px;border:1.5px solid #5a3a14;
      background:#241100;color:#f0d080;font-size:14px;text-align:center;
    }
    .farch-msg { color:#c9a84c;text-align:center;padding:40px 10px;font-family:Arial,sans-serif; }

    /* ── Floating nav (same as before) ── */
    .fstar-float-nav {
      position:fixed;bottom:20px;right:10px;display:flex;flex-direction:column;gap:6px;z-index:9999;
    }
    .fnav-item { display:flex;flex-direction:column;align-items:center; }
    .fstar-float-nav button {
      width:46px;height:46px;border-radius:50%;border:2px solid #c9a84c;background:#fff;
      color:#4a2c00;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.15);
    }
    .fnav-label { font-size:8px;line-height:1;margin-top:2px;color:#111;font-weight:700; }

    /* ── Spinner ── */
    .farch-spinner { display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh; }
    .farch-lotus { font-size:48px;animation:farch-spin 1.6s linear infinite; }
    @keyframes farch-spin {
      0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.1);} 100%{transform:rotate(360deg) scale(1);}
    }
    .farch-loading-text { margin-top:14px;font-size:15px;color:#c9a84c; }
    /* phones: keep content clear of the floating round buttons on the right */
    @media (max-width: 720px) {
      .farch-page { padding-right:66px; padding-left:12px; }
      .farch-item { padding:11px 12px;gap:8px; }
      .farch-play { width:100%;max-width:200px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .farch-namavalli, .farch-progress-bar { transition:none; }
      .farch-lotus { animation:none; }
    }
  `;
  document.head.appendChild(s);
}

export function archanaiSpinner() {
  return `<div class="farch-spinner" style="background:#1a0a00;min-height:60vh;">
    <div class="farch-lotus">🪷</div>
    <div class="farch-loading-text">${uiText("archLoading")}</div>
  </div>`;
}

function floatNav() {
  return `<div class="fstar-float-nav">
    <div class="fnav-item">
      <button onclick="history.back()">🏠</button>
      <div class="fnav-label">${uiText("home")}</div>
    </div>
    <div class="fnav-item">
      <button onclick="window.location.href='tree.html'">↩</button>
      <div class="fnav-label">${uiText("backPlain")}</div>
    </div>
    <div class="fnav-item">
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})">⬆</button>
      <div class="fnav-label">${uiText("top")}</div>
    </div>
    <div class="fnav-item">
      <button onclick="window.scrollBy({top:-window.innerHeight*.85,behavior:'smooth'})">◀</button>
      <div class="fnav-label">${uiText("up")}</div>
    </div>
    <div class="fnav-item">
      <button onclick="window.scrollBy({top:window.innerHeight*.85,behavior:'smooth'})">▶</button>
      <div class="fnav-label">${uiText("down")}</div>
    </div>
  </div>`;
}

// ── Data (cached for the page's lifetime) ────────────────────────
const _indexCache = {};   // script → index rows
const _listCache  = {};   // script|id → archanai with names

async function fetchIndex(sc) {
  if (_indexCache[sc]) return _indexCache[sc];
  const res = await fetch(`${API}/archanai?script=${sc}`).then(r => r.json());
  _indexCache[sc] = res.archanai || [];
  return _indexCache[sc];
}

async function fetchArchanai(id, sc) {
  const key = sc + "|" + id;
  if (_listCache[key]) return _listCache[key];
  const res = await fetch(`${API}/archanai?id=${id}&script=${sc}`).then(r => r.json());
  if (!res || !Array.isArray(res.names)) throw new Error(res && res.error || "No data");
  _listCache[key] = res;
  return res;
}

// ── Index view ───────────────────────────────────────────────────
function countLabel(n) { return n + " " + tx("archNames", "names"); }

function indexHTML(rows) {
  const featured = rows.filter(r => r.archanai_id === 1);
  const rest     = rows.filter(r => r.archanai_id !== 1);

  const groups = [];
  const byId = {};
  rest.forEach(r => {
    if (!byId[r.group_id]) {
      byId[r.group_id] = { name: r.group_name || "", order: r.group_order ?? 999, items: [] };
      groups.push(byId[r.group_id]);
    }
    byId[r.group_id].items.push(r);
  });
  groups.sort((a, b) => a.order - b.order);

  const item = r => `
    <button type="button" class="farch-item" onclick="farchOpen(${r.archanai_id})">
      <span class="farch-item-text">
        <span class="farch-item-title">${esc(r.title)}</span>
        <span class="farch-item-en">${esc(r.name_en)}</span>
      </span>
      <span class="farch-count">${countLabel(r.nama_count)}</span>
    </button>`;

  return `
    <div class="farch-title">${esc(tx("archIndexTitle", "Archanai"))}</div>
    <div class="farch-subtitle">${esc(tx("archIndexSubtitle", "Choose an archanai — it plays one name at a time"))}</div>
    <div class="farch-wrap">
      ${featured.map(r => `
        <button type="button" class="farch-feature" onclick="farchOpen(${r.archanai_id})">
          <span class="farch-item-title" style="font-size:19px">${esc(r.title)}</span>
          <span class="farch-item-en">${esc(r.name_en)} · ${countLabel(r.nama_count)}</span>
        </button>`).join("")}
      ${groups.map(g => `
        <div class="farch-group-name">${esc(g.name)}</div>
        ${g.items.map(item).join("")}`).join("")}
    </div>`;
}

// ── Slideshow view ───────────────────────────────────────────────
function slideHTML(a) {
  const total = a.names.length;
  return `
    <div class="farch-wrap">
      <button type="button" class="farch-back" onclick="farchShowIndex()">← ${esc(tx("archBackToList", "All archanais"))}</button>
      <div class="farch-title">${esc(a.title)}</div>

      <div class="farch-stage" id="farch-stage">
        <div class="farch-no" id="farch-no">1 / ${total}</div>
        <div class="farch-caption" id="farch-caption"></div>
        <div class="farch-namavalli" id="farch-nv">—</div>
      </div>

      <div class="farch-progress-wrap"><div class="farch-progress-bar" id="farch-bar"></div></div>

      <div class="farch-controls" style="flex-direction:column;gap:10px;">
        <button type="button" class="farch-btn farch-play active" id="farch-play-btn" onclick="farchToggle()">${uiText("pause")}</button>
        <div class="farch-controls">
          <button type="button" class="farch-btn" onclick="farchPrev()">${uiText("previous")}</button>
          <button type="button" class="farch-btn" onclick="farchNext()">${uiText("next")}</button>
        </div>
      </div>

      <div class="farch-speed-wrap">
        <span aria-hidden="true">🐢</span>
        <input type="range" id="farch-speed" min="1" max="20" value="${21 - a.default_speed_sec}"
          aria-label="Speed" oninput="farchSetSpeed(this.value)" />
        <span aria-hidden="true">🐇</span>
        <span id="farch-speed-label">${a.default_speed_sec}s</span>
      </div>

      <div class="farch-controls">
        <button type="button" class="farch-btn" onclick="farchFont(2)">A+</button>
        <button type="button" class="farch-btn" onclick="farchFont(-2)">A-</button>
        <span class="farch-goto">
          <input type="number" id="farch-goto-no" min="1" max="${total}" inputmode="numeric"
            placeholder="1–${total}" aria-label="Name number" />
          <button type="button" class="farch-btn" onclick="farchGoTo()">${uiText("goTo")}</button>
        </span>
      </div>
    </div>`;
}

// ── Controller ───────────────────────────────────────────────────
let _sc = "ta", _rows = [], _cur = null;
let _idx = 0, _playing = false, _speed = 3000, _timer = null, _wake = null;

function stopTimer() { clearInterval(_timer); _timer = null; }

async function keepAwake(on) {
  try {
    if (on && !_wake && navigator.wakeLock) _wake = await navigator.wakeLock.request("screen");
    if (!on && _wake) { await _wake.release(); _wake = null; }
  } catch (e) { _wake = null; }
}

function rootEl() { return document.getElementById("farch-root"); }

function show(i) {
  if (!_cur) return;
  const names = _cur.names;
  _idx = Math.max(0, Math.min(i, names.length - 1));
  const nv = document.getElementById("farch-nv");
  if (!nv) { stopTimer(); return; }               // screen left — stop quietly
  const n = names[_idx];
  nv.classList.add("fade");
  setTimeout(() => {
    const no = document.getElementById("farch-no");
    const cap = document.getElementById("farch-caption");
    const bar = document.getElementById("farch-bar");
    if (!no) return;
    no.textContent  = (_idx + 1) + " / " + names.length;
    cap.textContent = n.caption || "";
    nv.textContent  = n.text || "";
    bar.style.width = ((_idx + 1) / names.length * 100) + "%";
    nv.classList.remove("fade");
  }, 350);
}

function setPlayButton() {
  const btn = document.getElementById("farch-play-btn");
  if (!btn) return;
  btn.textContent = _playing ? uiText("pause") : uiText("play");
  btn.classList.toggle("active", _playing);
}

function tick() {
  if (!rootEl() || !_cur) { stopTimer(); keepAwake(false); return; }
  if (_idx >= _cur.names.length - 1) {
    _playing = false; stopTimer(); setPlayButton(); keepAwake(false); return;
  }
  show(_idx + 1);
}

function startTimer() { stopTimer(); _timer = setInterval(tick, _speed); }

function play(on) {
  _playing = on;
  setPlayButton();
  if (on) { startTimer(); keepAwake(true); } else { stopTimer(); keepAwake(false); }
}

window.farchOpen = async function (id) {
  const root = rootEl();
  if (!root) return;
  stopTimer();
  root.innerHTML = archanaiSpinner();
  window.scrollTo({ top: 0 });
  try {
    _cur = await fetchArchanai(id, _sc);
  } catch (e) {
    root.innerHTML = `<div class="farch-msg">${uiText("archNoData")}</div>
      <button type="button" class="farch-back" style="align-self:center" onclick="farchShowIndex()">← ${esc(tx("archBackToList", "All archanais"))}</button>`;
    return;
  }
  if (!rootEl()) return;
  root.innerHTML = slideHTML(_cur);
  _speed = (_cur.default_speed_sec || 3) * 1000;
  _idx = 0;
  show(0);
  play(true);
};

window.farchShowIndex = function () {
  play(false);
  _cur = null;
  const root = rootEl();
  if (!root) return;
  root.innerHTML = indexHTML(_rows);
  window.scrollTo({ top: 0 });
};

window.farchToggle = function () {
  if (!_cur) return;
  if (!_playing && _idx >= _cur.names.length - 1) show(0);    // finished → start again
  play(!_playing);
};

window.farchNext = function () {
  if (!_cur) return;
  stopTimer();
  show(_idx + 1);
  if (_playing) startTimer();
};

window.farchPrev = function () {
  if (!_cur) return;
  stopTimer();
  show(_idx - 1);
  if (_playing) startTimer();
};

window.farchSetSpeed = function (val) {
  _speed = (21 - Number(val)) * 1000;                       // slider right = faster
  const lbl = document.getElementById("farch-speed-label");
  if (lbl) lbl.textContent = Math.round(_speed / 1000) + "s";
  if (_playing) startTimer();
};

window.farchFont = function (step) {
  const de = document.documentElement;
  const v = parseFloat(getComputedStyle(de).getPropertyValue("--base-font")) || 19;
  const nv = Math.min(40, Math.max(13, v + step));
  de.style.setProperty("--base-font", nv + "px");
};

window.farchGoTo = function () {
  if (!_cur) return;
  const inp = document.getElementById("farch-goto-no");
  const n = parseInt(inp && inp.value, 10);
  if (isNaN(n) || n < 1 || n > _cur.names.length) { if (inp) inp.focus(); return; }
  stopTimer();
  show(n - 1);
  if (_playing) startTimer();
  if (inp) inp.value = "";
};

// Keyboard on desktop: space = play/pause, ← → = previous / next
if (!window.__farchKeys) {
  window.__farchKeys = true;
  document.addEventListener("keydown", e => {
    if (!_cur || !rootEl()) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === " ") { e.preventDefault(); window.farchToggle(); }
    else if (e.key === "ArrowRight") window.farchNext();
    else if (e.key === "ArrowLeft") window.farchPrev();
  });
}

// Called by layout.js after app.innerHTML is set. The index needs no
// start-up work; this only makes sure no old timer is still running.
window._farchInit = function () {
  if (!_cur) { stopTimer(); _playing = false; }
};

// ── Entry point (layout.js) ──────────────────────────────────────
export async function renderFullDivyadesamArchanai() {
  injectCSS();
  stopTimer(); _playing = false; _cur = null;
  _sc = currentScript();
  loadFonts(_sc);

  try { _rows = await fetchIndex(_sc); } catch (e) { _rows = []; }

  if (!_rows.length) {
    return `<div class="farch-page" id="farch-root">
      <div class="farch-title">${esc(tx("archIndexTitle", "Archanai"))}</div>
      <div class="farch-msg">${uiText("archNoData")}</div>
    </div>${floatNav()}`;
  }

  return `<div class="farch-page" id="farch-root" style="font-family:${FONT_STACK[_sc]}">
    ${indexHTML(_rows)}
  </div>${floatNav()}`;
}