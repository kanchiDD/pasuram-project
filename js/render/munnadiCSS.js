// munnadiCSS.js
export function injectMunnadiCSS() {
  if (document.getElementById("mp-style")) return;
  const s = document.createElement("style");
  s.id = "mp-style";
  s.textContent = `
    .mp-portrait-gate { display:none; position:fixed; inset:0; z-index:9999; background:#4a2c00; flex-direction:column; align-items:center; justify-content:center; gap:16px; text-align:center; padding:24px; }
    @media (orientation:portrait)  { .mp-portrait-gate{display:flex;} .mp-page{display:none;} }
    @media (orientation:landscape) { .mp-portrait-gate{display:none;} .mp-page{display:block;} }
    .mp-rotate-icon { font-size:48px; animation:mp-rot 2s ease-in-out infinite; }
    @keyframes mp-rot { 0%,100%{transform:rotate(0deg);} 50%{transform:rotate(-90deg);} }
    .mp-rotate-msg { font-size:15px; color:#fef0c0; font-family:'Latha','Bamini',serif; line-height:1.7; }

    :root { --mp-header-h:60px; --mp-font:11px; }
    .mp-page { max-width:900px; margin:0 auto; padding:0 0 80px; font-family:'Latha','Bamini',serif; background:#fffdf5; min-height:100vh; }
    .mp-page-header { background:linear-gradient(135deg,#4a2c00,#7a5a20); color:#fef0c0; text-align:center; padding:16px 12px 12px; font-size:18px; font-weight:900; position:sticky; top:0; z-index:10; }
    .mp-page-header-sub { font-size:11px; color:#d4a843; margin-top:2px; }

    .mp-spinner { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:50vh; gap:12px; }
    .mp-spinner-lotus { font-size:40px; animation:mp-spin 1.8s linear infinite; }
    @keyframes mp-spin { 0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.1);} 100%{transform:rotate(360deg) scale(1);} }

    /* ── INDEX ── */
    .mp-index { border-bottom:2px solid #e8c060; }
    .mp-index-title { font-size:10px; font-weight:700; color:#b38b2e; text-transform:uppercase; letter-spacing:1px; padding:8px 14px 4px; }

    /* Level 0 — section */
    .mp-idx-item { display:flex; align-items:center; padding:8px 14px; cursor:pointer; border-bottom:1px solid #f5e8c0; font-size:14px; color:#3a2000; }
    .mp-idx-item:hover { background:#fef3d0; }
    .mp-idx-group { font-weight:700; color:#4a2c00; background:#fef3d0; }
    .mp-idx-arrow { margin-left:auto; font-size:10px; color:#b38b2e; transition:transform 0.2s; flex-shrink:0; }
    .mp-idx-arrow.open { transform:rotate(90deg); }
    .mp-idx-children { display:none; }
    .mp-idx-children.open { display:block; }

    /* Level 1 — pathu or direct thirumozhi: left-aligned, indented 18px */
    .mp-idx-child { display:flex; align-items:center; padding:5px 14px 5px 18px; font-size:12px; color:#5a3a10; border-bottom:1px solid #f5e8c0; cursor:pointer; line-height:1.5; text-align:left; }
    .mp-idx-child:hover { background:#fef8e8; }
    .mp-idx-child-label { flex:1; text-align:left; }
    .mp-idx-child-sub { color:#9a7a40; font-size:11px; margin-left:4px; }
    .mp-idx-child-arrow { font-size:10px; color:#b38b2e; transition:transform 0.2s; flex-shrink:0; margin-left:6px; }
    .mp-idx-child-arrow.open { transform:rotate(90deg); }
    .mp-idx-grandchildren { display:none; }
    .mp-idx-grandchildren.open { display:block; }

    /* Level 2 — thirumozhi under pathu: left-aligned, indented 34px, subtle left bar */
    .mp-idx-grandchild { display:flex; align-items:center; padding:4px 14px 4px 34px; font-size:11px; color:#7a5a20; border-bottom:1px solid #f5e8c0; border-left:2px solid #e8c060; cursor:pointer; line-height:1.4; text-align:left; }
    .mp-idx-grandchild:hover { background:#fef8e8; }

    /* ── THANIYAN ── */
    .mp-thaniyan-box { border:3px double #b38b2e; border-radius:8px; background:#fffbf0; margin:12px; padding:14px 12px; }
    .mp-thaniyan-label { font-size:10px; font-weight:700; color:#b38b2e; text-transform:uppercase; letter-spacing:1px; text-align:center; margin-bottom:6px; }
    .mp-thaniyan-name { font-size:13px; font-weight:700; text-align:center; color:#4a2c00; margin:6px 0 2px; }
    .mp-thaniyan-subhead { font-size:12px; text-align:center; color:#7a5a20; font-style:italic; margin:3px 0; }
    .mp-thaniyan-line { font-size:13px; text-align:left; line-height:1.7; color:#2a1a00; display:block; }
    .mp-thaniyan-gap { height:8px; }
    /* Pallandu merged row */
    .mp-pasuram-merged { min-height:40px; }
    .mp-pasuram-merged .mp-line1 { white-space:normal; overflow:visible; }
    .mp-pasuram-merged .mp-line2 { white-space:normal; }

    /* ── SECTION BOX ── */
    .mp-section-box { border:3px double #b38b2e; border-radius:8px; margin:12px; background:#fff; overflow:hidden; }
    .mp-section-heading { font-size:13px; font-weight:900; color:#4a2c00; text-align:center; padding:10px 12px 8px; border-bottom:1px solid #e8d090; line-height:1.5; }
    .mp-section-inner { padding:0; }
    .mp-section-closing { font-size:11px; font-weight:700; color:#7a5a20; text-align:center; padding:8px 0; border-top:1px dashed #d4a843; margin:4px 12px; }
    .mp-tm-closing { font-size:10px; font-style:italic; color:#7a5a20; text-align:center; padding:3px 8px 5px; border-top:1px dotted #e0c070; margin:0 8px 4px; }

    .mp-pathu-group { margin-bottom:2px; }
    .mp-pathu-heading { font-size:12px; font-weight:700; color:#4a2c00; text-align:center; padding:6px 0 2px; border-top:1px dashed #d4a843; margin-top:4px; }
    .mp-thirumozhi-group { margin-bottom:2px; }
    .mp-thirumozhi-heading { font-size:12px; font-weight:700; color:#4a2c00; text-align:center; padding:6px 0 2px; border-top:1px dashed #d4a843; margin-top:4px; }
    .mp-subunit-heading { font-size:10px; color:#7a5a20; text-align:center; padding:0 0 3px; font-style:italic; }

    /* ── COLUMN HEADERS — sticky below page header ── */
    .mp-col-headers { display:grid; grid-template-columns:34px 1fr 1px 1fr 26px; align-items:center; padding:3px 8px; background:#fef3d0; border-bottom:2px solid #e8c060; border-top:1px solid #e8d090; font-size:9px; font-weight:700; color:#b38b2e; text-transform:uppercase; letter-spacing:0.8px; position:sticky; top:var(--mp-header-h); z-index:5; }
    .mp-ch-gno { text-align:right; padding-right:5px; }
    .mp-ch-m   { text-align:center; padding:0 4px; }
    .mp-ch-div { background:#d4a843; height:12px; width:1px; margin:0 auto; }
    .mp-ch-p   { text-align:center; padding:0 4px; }
    .mp-ch-no  { text-align:right; color:#ccc; }

    /* ── PASURAM GRID ── */
    .mp-pasurams { width:100%; padding:0 8px; box-sizing:border-box; }
    .mp-pasuram-row { display:grid; grid-template-columns:34px 1fr 1px 1fr 26px; align-items:start; font-size:var(--mp-font); line-height:1.75; color:#1a2a00; border-bottom:1px solid #f0e4b8; }
    .mp-pasurams > .mp-pasuram-row:first-child { padding-top:6px; }
    .mp-pasuram-merged { min-height:40px; margin-top:28px; }
    .mp-pasuram-merged .mp-line1 { white-space:normal; overflow:visible; }
    .mp-pasuram-merged .mp-line2 { white-space:normal; }
    .mp-pasuram-row:hover .mp-line1, .mp-pasuram-row:hover .mp-line2 { background:#fef8f0; }
    .mp-pno    { font-size:calc(var(--mp-font) - 1px); color:#b38b2e; text-align:right; padding-right:5px; white-space:nowrap; padding-top:2px; }
    /* left-aligned, indented from GNO col and from centre line */
    .mp-line1  { color:#1a2a00; padding:1px 4px 1px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left; }
    .mp-vline  { background:#d4a843; align-self:stretch; min-height:100%; width:1px; }
    .mp-line2  { color:#1a2a00; padding:1px 4px 1px 6px; word-break:break-word; text-align:left; }
    .mp-localn { font-size:calc(var(--mp-font) - 1px); color:#ccc; text-align:right; padding-left:3px; white-space:nowrap; padding-top:2px; }
    .mp-dual-marker { font-size:9px; color:#b38b2e; font-weight:700; }
    .mp-pasuram-merged .mp-line1 { white-space:normal; overflow:visible; }
    .mp-pasuram-merged .mp-line2 { white-space:normal; }

    /* ── FLOAT NAV ── */
    .mp-float-nav { position:fixed; bottom:20px; right:14px; display:flex; flex-direction:column; gap:8px; z-index:999; }
    .mp-float-nav button { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,#c9a227,#e8c060); border:2px solid #b38b2e; color:#2a1a00; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:'Latha','Bamini',serif; }
    .mp-final-closing { text-align:center; font-size:16px; font-weight:900; color:#4a2c00; padding:24px 12px; border-top:3px double #b38b2e; margin:12px; }
  `;
  document.head.appendChild(s);

  // Set sticky top = actual header height after render
  requestAnimationFrame(() => {
    const hdr = document.querySelector('.mp-page-header');
    if (hdr) document.documentElement.style.setProperty('--mp-header-h', hdr.offsetHeight + 'px');
  });
}
