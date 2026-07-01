// =============================================================
// 🎨 css.js  →  js/render/css.js
// Import once at top of layout.js:  import "./css.js";
// =============================================================

(function injectSharedCSS() {
  if (document.getElementById("naal-shared-style")) return;
  const s = document.createElement("style");
  s.id = "naal-shared-style";
  s.textContent = `

    /* ── Base font variable ─────────────────────────────────── */
    :root { --nf: 15px; }

/* Font loaded via <link> below — @import blocked in injected styles */
body, .pasuram-line, .thaniyan-line, .section-heading, .thaniyan-container {
  font-family: 'Noto Sans Tamil', 'Latha', 'Bamini', serif;
}

    /* ══════════════════════════════════════════════════════════
       THANIYAN BOXES — each call to renderThaniyan gets its
       own bordered box. Label auto-set by caller.
    ══════════════════════════════════════════════════════════ */
    .thaniyan-outer {
      border: 3px double #b38b2e;
      border-radius: 8px;
      padding: 10px 13px 9px;
      margin: 8px 0 12px;
      background: #fffdf7;
      box-shadow: 0 2px 6px rgba(179,139,46,0.07);
    }
    .thaniyan-label {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      color: #b38b2e;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .thaniyan-container {
      font-size: var(--nf) !important;
      line-height: 1.7;
      color: #2a1a00;
    }
    .thaniyan-title {
      text-align: center;
      font-weight: 700;
      font-size: var(--nf) !important;
      color: #4a2c00;
      margin: 3px 0 2px;
    }
    .thaniyan-subhead {
      text-align: center;
      font-size: var(--nf) !important;
      color: #7a5a20;
      font-style: italic;
      margin-bottom: 3px;
    }
    .thaniyan-group  { height: 6px; }
    .thaniyan-line   { font-size: var(--nf) !important; margin: 0; line-height: 1.7; }
    .thaniyan-prosody {
      font-size: 10px !important;
      color: #aaa !important;
      font-style: italic;
      margin-bottom: 1px;
    }

    /* ══════════════════════════════════════════════════════════
       CONTENT BOX
    ══════════════════════════════════════════════════════════ */
    .content-outer {
      border: 3px double #b38b2e;
      border-radius: 8px;
      padding: 10px 13px 10px;
      margin: 0 0 16px;
      background: #ffffff;
      box-shadow: 0 2px 6px rgba(179,139,46,0.07);
    }
    .content-heading {
      text-align: center;
      font-size: var(--nf) !important;
      font-weight: 800;
      color: #4a2c00;
      border-bottom: 1.5px solid #d4a843;
      padding-bottom: 7px;
      margin-bottom: 9px;
      line-height: 1.5;
    }

    /* ══════════════════════════════════════════════════════════
       PASURAM LINES — !important overrides any site CSS
    ══════════════════════════════════════════════════════════ */
    .tree-item.pasuram-item {
      font-size: var(--nf) !important;
      line-height: 1.7 !important;
      margin-bottom: 7px !important;
    }
    .pasuram-line    { font-size: var(--nf) !important; line-height: 1.7 !important; }
    .group-gap       { height: 8px; }
    .pasuram-local   { font-size: 11px !important; color: #999; text-align: right; }

    .prabandham-header .line1 { font-size: var(--nf) !important; color: #7a5a20; }
    .prabandham-header .line2 { font-size: var(--nf) !important; font-weight: 700; color: #4a2c00; }
    .line3-bold  { font-size: var(--nf) !important; font-weight: 700; color: #4a2c00; margin: 3px 0; }

    .display-item  { font-size: var(--nf) !important; color: #555; font-style: italic; }
    .prosody       { font-size: var(--nf) !important; color: #888; font-style: italic; margin: 2px 0; }

    .section-close {
      text-align: center;
      font-size: var(--nf) !important;
      font-weight: 700;
      color: #4a2c00;
      margin-top: 9px;
      border-top: 1px solid #d4a843;
      padding-top: 7px;
    }

    .dual-mark-inline { color: #b38b2e; font-weight: 700; }
    .dual-line  { color: #1a6b3a; }
    .dual-block { background: #f0faf0; border-left: 3px solid #8cc98c; padding-left: 6px; }

    /* ══════════════════════════════════════════════════════════
       SPECIAL SECTIONS (sections 21/22/23 — madal/kootrirukkai)
       special.js uses .content-box — style it to match content-outer.
       Zero changes to special.js needed.
    ══════════════════════════════════════════════════════════ */
    .content-box {
      border: 3px double #b38b2e;
      border-radius: 8px;
      padding: 10px 13px 10px;
      margin: 0 0 16px;
      background: #ffffff;
      box-shadow: 0 2px 6px rgba(179,139,46,0.07);
      font-size: var(--nf) !important;
    }
    .madal-container .line,
    .kootrirukkai-container .line {
      font-size: var(--nf) !important;
      line-height: 1.7;
    }
    .madal-container,
    .kootrirukkai-container {
      font-size: var(--nf) !important;
    }

    /* ── Madal/Kootrirukkai couplet & line cards (shared module, "sp" prefix) ── */
    .sp-madal-body { display:flex; flex-direction:column; gap:6px; }
    .sp-madal-couplet-card {
      background: #fffdfa;
      border: 1px solid #e8d8a0;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .sp-madal-dual-block {
      background: #fffbe8;
      border: 1px solid #e8d8a0;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .sp-madal-line {
      font-size: var(--nf) !important;
      line-height: 1.7;
      color: #2a1a00;
      display: block;
      text-align: left;
    }
    .sp-line-with-no { display: block; position: relative; }
    .sp-line-with-no .sp-couplet-no { float: right; }
    .sp-couplet-no { font-size: 10px !important; color: #999; margin-left: 8px; }
    .sp-dual-mark { color: #b38b2e; font-weight: 700; font-size: 12px; margin-right: 2px; }
    .sp-kootrirukkai-line-card {
      background: #fffdfa;
      border: 1px solid #e8d8a0;
      border-radius: 6px;
      padding: 6px 10px;
    }

    /* Modal styles untouched — controlled by existing site CSS */

    /* ══════════════════════════════════════════════════════════
       FLOATING NAV
       Hidden by default.
       layout.js adds body.show-nav only at PASURAM level.
    ══════════════════════════════════════════════════════════ */
    .naal-float-nav {
      position: fixed;
      bottom: 20px;
      right: 12px;
      display: none;
      flex-direction: column;
      gap: 6px;
      z-index: 9999;
    }
    body.show-nav .naal-float-nav {
      display: flex;
    }
    .naal-float-nav button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #b38b2e;
      background: #fff;
      color: #4a2c00;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.13);
    }
    .naal-float-nav button:active { background: #f5e9cc; }

  `;
  document.head.appendChild(s);

  // Inject Google Font as proper <link> — @import doesn't work in injected styles
  if (!document.getElementById("naal-gfont")) {
    const link = document.createElement("link");
    link.id   = "naal-gfont";
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700;900&display=swap";
    document.head.appendChild(link);
  }
})();

/* ── Floating nav ──────────────────────────────────────────────────── */
(function injectFloatingNav() {
  function _inject() {
    if (document.getElementById("naal-float-nav")) return;
    const nav = document.createElement("div");
    nav.id = "naal-float-nav";
    nav.className = "naal-float-nav";
    nav.innerHTML = `
      <button onclick="window.location.href='tree.html'" title="Home">🏠</button>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Top">⬆</button>
      <button onclick="window.scrollBy({top:-window.innerHeight*0.8,behavior:'smooth'})" title="Up">◀</button>
      <button onclick="window.scrollBy({top:window.innerHeight*0.8,behavior:'smooth'})" title="Down">▶</button>
      <button onclick="naalAdjFont(2)" title="Font+">A+</button>
      <button onclick="naalAdjFont(-2)" title="Font−">A−</button>
    `;
    document.body.appendChild(nav);
  }
  if (document.body) _inject();
  else document.addEventListener("DOMContentLoaded", _inject);
})();

/* ── Font adjuster ─────────────────────────────────────────────────── */
window.naalAdjFont = function(delta) {
  const cur = getComputedStyle(document.documentElement).getPropertyValue("--nf").trim();
  let size = parseFloat(cur) || 15;
  if (delta < 0 && size <= 11) return;
  document.documentElement.style.setProperty("--nf", (size + delta) + "px");
};