// =============================================================
// fullDivyadesamArchanai.js  →  js/render/fullDivyadesamArchanai.js
// 108 Divyadesa Archanai — animated center-stage scrolling
// =============================================================

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

function injectCSS() {
  if (document.getElementById("farch-style")) return;

  // Load Aksharamukha for transliteration
  if (!document.getElementById("aksharamukha-script")) {
    const ak = document.createElement("script");
    ak.id  = "aksharamukha-script";
    ak.src = "https://cdn.jsdelivr.net/npm/aksharamukha@2.0.3/dist/aksharamukha.min.js";
    document.head.appendChild(ak);
  }

  const s = document.createElement("style");
  s.id = "farch-style";
  s.textContent = `
    .farch-page {
      background:#1a0a00;min-height:100vh;
      display:flex;flex-direction:column;
      align-items:center;padding:20px 16px 100px;
      font-family:"Noto Sans Tamil","Latha","Bamini",serif;
    }
    .farch-title {
      text-align:center;font-size:22px;font-weight:900;
      color:#f0d080;margin-bottom:4px;letter-spacing:.04em;
    }
    .farch-subtitle {
      text-align:center;font-size:13px;color:#c9a84c;margin-bottom:16px;
    }
    /* ── Stage ── */
    .farch-stage {
      width:100%;max-width:600px;
      min-height:260px;
      background:#2a1400;
      border:2px solid #c9a84c;
      border-radius:14px;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:24px 20px;
      box-shadow:0 0 40px rgba(201,168,76,.3);
      position:relative;
      overflow:hidden;
    }
    .farch-desam-no {
      font-size:13px;color:#c9a84c;font-weight:700;
      margin-bottom:10px;letter-spacing:.08em;
    }
    .farch-desam-name {
      font-size:20px;font-weight:900;color:#f0d080;
      text-align:center;line-height:1.5;margin-bottom:10px;
    }
    .farch-namavalli {
      font-size:var(--base-font,17px);color:#ffeebb;
      text-align:center;line-height:2;
      white-space:pre-line;
      transition:opacity .4s ease;
    }
    .farch-namavalli.fade { opacity:0; }
    /* ── Progress bar ── */
    .farch-progress-wrap {
      width:100%;max-width:600px;margin-top:12px;
      background:#3a2000;border-radius:4px;height:4px;overflow:hidden;
    }
    .farch-progress-bar {
      height:100%;background:#c9a84c;
      transition:width .3s linear;width:0%;
    }
    /* ── Controls ── */
    .farch-controls {
      display:flex;align-items:center;gap:14px;
      margin-top:18px;flex-wrap:wrap;justify-content:center;
    }
    .farch-btn {
      padding:10px 20px;border-radius:8px;
      border:1.5px solid #c9a84c;background:transparent;
      color:#f0d080;font-size:14px;cursor:pointer;
      font-family:"Noto Sans Tamil","Latha","Bamini",serif;
      transition:background .15s;
    }
    .farch-btn:hover { background:#3a2000; }
    .farch-btn.active { background:#c9a84c;color:#1a0a00; }
    /* ── Speed control ── */
    .farch-speed-wrap {
      display:flex;align-items:center;gap:10px;color:#c9a84c;
      font-size:13px;margin-top:10px;
    }
    .farch-speed-wrap input[type=range] {
      accent-color:#c9a84c;width:140px;cursor:pointer;
    }
    /* ── Counter ── */
    .farch-counter {
      font-size:13px;color:#8a6030;margin-top:8px;
    }
    /* ── List view (fallback) ── */
    .farch-list {
      width:100%;max-width:600px;margin-top:24px;display:none;
    }
    .farch-list-item {
      border-bottom:1px solid #3a2000;padding:12px 4px;
    }
    .farch-list-no { font-size:11px;color:#8a6030;margin-bottom:4px; }
    .farch-list-name { font-size:15px;font-weight:700;color:#f0d080; }
    .farch-list-namavalli {
      font-size:13px;color:#c9a84c;margin-top:4px;white-space:pre-line;
    }
    .fstar-float-nav {
  position:fixed;
  bottom:20px;
  right:10px;
  display:flex;
  flex-direction:column;
  gap:6px;
  z-index:9999;
}

.fnav-item {
  display:flex;
  flex-direction:column;
  align-items:center;
}

.fstar-float-nav button {
  width:46px;
  height:46px;
  border-radius:50%;
  border:2px solid #c9a84c;
  background:#fff;
  color:#4a2c00;
  font-size:18px;
  cursor:pointer;

  display:flex;
  align-items:center;
  justify-content:center;

  box-shadow:0 2px 6px rgba(0,0,0,.15);
}

.fnav-label {
  font-size:8px;
  line-height:1;
  margin-top:2px;
  color:#111;
  font-weight:700;
}


    /* Lang toggle */
    .farch-lang-wrap {
      display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;justify-content:center;
    }
    .farch-lang-btn {
      padding:6px 14px;border-radius:16px;
      border:1.5px solid #c9a84c;background:transparent;
      color:#c9a84c;font-size:13px;cursor:pointer;
      font-family:"Noto Sans Tamil","Latha",serif;
    }
    .farch-lang-btn.active { background:#c9a84c;color:#1a0a00;font-weight:700; }

    /* Spinner */
    .farch-spinner {
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;min-height:60vh;
    }
    .farch-lotus { font-size:48px;animation:farch-spin 1.6s linear infinite; }
    @keyframes farch-spin {
      0%{transform:rotate(0deg) scale(1);}
      50%{transform:rotate(180deg) scale(1.1);}
      100%{transform:rotate(360deg) scale(1);}
    }
    .farch-loading-text { margin-top:14px;font-size:15px;color:#c9a84c; }
  `;
  document.head.appendChild(s);
}

export function archanaiSpinner() {
  return `<div class="farch-spinner" style="background:#1a0a00;min-height:60vh;">
    <div class="farch-lotus">🪷</div>
    <div class="farch-loading-text">Loading Archanai...</div>
  </div>`;
}

function floatNav() {
  return `<div class="fstar-float-nav">

    <div class="fnav-item">
      <button onclick="history.back()">🏠</button>
      <div class="fnav-label">Home</div>
    </div>

    <div class="fnav-item">
      <button onclick="window.location.href='tree.html'">↩</button>
      <div class="fnav-label">Back</div>
    </div>

    <div class="fnav-item">
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})">⬆</button>
      <div class="fnav-label">Top</div>
    </div>

    <div class="fnav-item">
      <button onclick="window.scrollBy({top:-window.innerHeight*.85,behavior:'smooth'})">◀</button>
      <div class="fnav-label">Up</div>
    </div>

    <div class="fnav-item">
      <button onclick="window.scrollBy({top:window.innerHeight*.85,behavior:'smooth'})">▶</button>
      <div class="fnav-label">Down</div>
    </div>

  </div>`;
}

export async function renderFullDivyadesamArchanai() {
  injectCSS();

  // Fetch all 108 desams with archana_namavalli
  let desams = [];
  try {
    const res = await fetch(`${API}/divyadesam?sub=archanai`).then(r => r.json());
    desams = Array.isArray(res) ? res : (res.results || []);
  } catch(e) {}

  if (!desams.length) {
    return `<div class="farch-page">
      <div class="farch-title">திவ்யதேச அர்ச்சனை</div>
      <div style="color:#c9a84c;text-align:center;padding:40px;">
        அர்ச்சனை தகவல் கிடைக்கவில்லை
      </div>
    </div>`;
  }

  // Build desam array for controller
  const DESAMS = desams.map(d => ({
    id:   d.divyadesam_id,
    name: d.canonical_name || "",
    nv:   d.archana_namavalli || d.canonical_name || ""
  }));

  // ── Controller — registered on window BEFORE html is returned ──
  // innerHTML blocks <script> execution so we register functions
  // on window here in the module, then call initFarch() via RAF
  // after layout.js sets app.innerHTML

  let _idx = 0, _playing = true, _speed = 8000, _timer = null;
  let _currentLang = "ta"; // ta = Tamil (no conversion), hi = Devanagari

  // Transliterate Tamil text to target script
  function _transliterate(text) {
    if (_currentLang === "ta") return text;
    try {
      if (typeof Aksharamukha !== "undefined" && Aksharamukha.transliterate) {
        const schemeMap = { "hi": "Devanagari", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam" };
        const target = schemeMap[_currentLang];
        if (target) return Aksharamukha.transliterate("Tamil", target, text);
      }
    } catch(e) { console.warn("Transliteration error:", e); }
    return text; // fallback to Tamil
  }

  // Switch language and re-render current desam
  window.farchSetLang = function(lang) {
    _currentLang = lang;
    // Update button styles
    document.querySelectorAll(".farch-lang-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
    // Update font for non-Tamil scripts
    const root = document.getElementById("farch-root");
    if (root) {
      root.style.fontFamily = lang === "ta"
        ? '"Noto Sans Tamil","Latha","Bamini",serif'
        : '"Noto Sans Devanagari","Noto Sans Telugu","Noto Sans",serif';
    }
    _farchShow(_idx); // re-render current
  };

  function _farchShow(i) {
    _idx = Math.max(0, Math.min(i, DESAMS.length - 1));
    const d    = DESAMS[_idx];
    const nv   = document.getElementById("farch-nv");
    const name = document.getElementById("farch-name");
    const no   = document.getElementById("farch-no");
    const bar  = document.getElementById("farch-bar");
    if (!nv) return;
    nv.classList.add("fade");
    setTimeout(() => {
      no.textContent  = (_idx + 1) + " / " + DESAMS.length;
      name.textContent = _transliterate(d.name);
      nv.textContent  = _transliterate(d.nv);
      bar.style.width = ((_idx + 1) / DESAMS.length * 100) + "%";
      nv.classList.remove("fade");
    }, 400);
  }

  function _farchNext() {
    if (_idx >= DESAMS.length - 1) {
      _playing = false;
      const btn = document.getElementById("farch-play-btn");
      if (btn) { btn.textContent = "▶ Play"; btn.classList.remove("active"); }
      clearInterval(_timer); _timer = null; return;
    }
    _farchShow(_idx + 1);
  }

  function _farchStartTimer() {
    clearInterval(_timer);
    _timer = setInterval(_farchNext, _speed);
  }

  window.farchToggle = function() {
    _playing = !_playing;
    const btn = document.getElementById("farch-play-btn");
    if (_playing) {
      if (btn) { btn.textContent = "⏸ Pause"; btn.classList.add("active"); }
      _farchStartTimer();
    } else {
      if (btn) { btn.textContent = "▶ Play"; btn.classList.remove("active"); }
      clearInterval(_timer); _timer = null;
    }
  };

  window.farchNext = function() {
    clearInterval(_timer); _timer = null;
    _farchNext();
    if (_playing) _farchStartTimer();
  };

  window.farchPrev = function() {
    clearInterval(_timer); _timer = null;
    _farchShow(_idx - 1);
    if (_playing) _farchStartTimer();
  };

  window.farchSetSpeed = function(val) {
    _speed = (22 - Number(val)) * 1000;
    const lbl = document.getElementById("farch-speed-label");
    if (lbl) lbl.textContent = Math.round(_speed / 1000) + "s";
    if (_playing) _farchStartTimer();
  };

  window.farchGoTo = function() {
    const n = parseInt(prompt("Desam number (1-108):"), 10);
    if (!isNaN(n) && n >= 1 && n <= 108) {
      clearInterval(_timer); _timer = null;
      _farchShow(n - 1);
      if (_playing) _farchStartTimer();
    }
  };

  // initFarch called after app.innerHTML is set by layout.js
  window._farchInit = function() {
    _idx = 0; _playing = true; _speed = 8000;
    clearInterval(_timer); _timer = null;
    _farchShow(0);
    _farchStartTimer();
  };

  return `
<div class="farch-page" id="farch-root">
  <div class="farch-title">திவ்யதேச அர்ச்சனை</div>
  <div class="farch-subtitle">108 திவ்யதேசங்கள் — நாமாவளி</div>

  <div class="farch-lang-wrap">
    <button class="farch-lang-btn active" data-lang="ta" onclick="farchSetLang('ta')">அ Tamil</button>
    <button class="farch-lang-btn" data-lang="hi"  onclick="farchSetLang('hi')">अ Devanagari</button>
    <button class="farch-lang-btn" data-lang="te"  onclick="farchSetLang('te')">అ Telugu</button>
    <button class="farch-lang-btn" data-lang="kn"  onclick="farchSetLang('kn')">ಅ Kannada</button>
    <button class="farch-lang-btn" data-lang="ml"  onclick="farchSetLang('ml')">അ Malayalam</button>
  </div>

  <div class="farch-stage" id="farch-stage">
    <div class="farch-desam-no" id="farch-no">1 / ${DESAMS.length}</div>
    <div class="farch-desam-name" id="farch-name">—</div>
    <div class="farch-namavalli" id="farch-nv">—</div>
  </div>

  <div class="farch-progress-wrap">
    <div class="farch-progress-bar" id="farch-bar"></div>
  </div>

  <div class="farch-counter" id="farch-counter"></div>

  <div class="farch-controls" style="flex-direction:column;gap:10px;">
    <button class="farch-btn active" id="farch-play-btn"
      onclick="farchToggle()"
      style="width:200px;font-size:16px;padding:12px;">
      ⏸ Pause
    </button>
    <div style="display:flex;gap:14px;justify-content:center;">
      <button class="farch-btn" onclick="farchPrev()">◀ Previous</button>
      <button class="farch-btn" onclick="farchNext()">Next ▶</button>
    </div>
  </div>

  <div class="farch-speed-wrap">
    <span>🐢</span>
    <input type="range" id="farch-speed" min="2" max="20" value="8"
      oninput="farchSetSpeed(this.value)" />
    <span>🐇</span>
    <span id="farch-speed-label">8s</span>
  </div>

  <div class="farch-controls" style="margin-top:6px;">
    <button class="farch-btn"
      onclick="(()=>{let v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font')||'17');document.documentElement.style.setProperty('--base-font',(v+2)+'px')})()">A+</button>
    <button class="farch-btn"
      onclick="(()=>{let v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font')||'17');if(v>12)document.documentElement.style.setProperty('--base-font',(v-2)+'px')})()">A-</button>
    <button class="farch-btn" onclick="farchGoTo()">🔢 Go To</button>
    <button class="farch-btn" onclick="window.location.href='tree.html'">🏠</button>
  </div>
</div>${floatNav()}`;
}