// nncCSS.js — all styles for Nithyanusandhanam
export function injectNNCCSS() {
  if (document.getElementById("nnc-style")) return;
  const s = document.createElement("style");
  s.id = "nnc-style";
  s.textContent = `
    /* ── Entry ── */
    .nnc-entry { min-height:100vh; background:linear-gradient(160deg,#fdf3dc,#f5d98b 50%,#e8c060); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 16px; box-sizing:border-box; font-family:'Latha','Bamini',serif; }
    .nnc-frame { background:linear-gradient(145deg,#fff9ed,#fef0c0); border:3px double #b38b2e; border-radius:16px; box-shadow:0 8px 32px rgba(179,139,46,0.18); max-width:480px; width:100%; padding:28px 20px 32px; display:flex; flex-direction:column; align-items:center; gap:14px; }
    .nnc-logo { width:110px; opacity:0.9; }
    .nnc-deity-img { width:100%; max-width:360px; border-radius:12px; border:2px solid #c9a227; }
    .nnc-deity-name { font-size:13px; color:#7a5a20; text-align:center; }
    .nnc-title { font-size:22px; font-weight:900; color:#4a2c00; text-align:center; }
    .nnc-subtitle { font-size:13px; color:#8a6a30; text-align:center; font-style:italic; }
    .nnc-begin-btn { margin-top:6px; background:linear-gradient(135deg,#c9a227,#e8c060); color:#2a1a00; border:none; border-radius:30px; padding:12px 40px; font-size:15px; font-weight:700; cursor:pointer; font-family:'Latha','Bamini',serif; }
    /* ── Page ── */
    .nnc-page { max-width:700px; margin:0 auto; padding:0 0 80px; font-family:'Latha','Bamini',serif; background:#fffdf5; min-height:100vh; }
    .nnc-page-header { background:linear-gradient(135deg,#4a2c00,#7a5a20); color:#fef0c0; text-align:center; padding:16px 12px 12px; font-size:18px; font-weight:900; position:sticky; top:0; z-index:10; }
    .nnc-page-header-sub { font-size:11px; color:#d4a843; margin-top:2px; }
    /* ── Index ── */
    .nnc-index { border-bottom:2px solid #e8c060; }
    .nnc-index-title { font-size:10px; font-weight:700; color:#b38b2e; text-transform:uppercase; letter-spacing:1px; padding:8px 14px 4px; }
    .nnc-idx-item { display:flex; align-items:center; padding:8px 14px; cursor:pointer; border-bottom:1px solid #f5e8c0; font-size:14px; color:#3a2000; }
    .nnc-idx-item.group { font-weight:700; color:#4a2c00; background:#fef3d0; }
    .nnc-idx-item.child { padding-left:28px; font-size:11px; color:#5a3a10; border-left:3px solid #e8c060; line-height:1.4; }
    .nnc-idx-item.dim { color:#bbb; cursor:default; }
    .nnc-idx-arrow { margin-left:auto; font-size:10px; color:#b38b2e; transition:transform 0.2s; min-width:14px; }
    .nnc-idx-arrow.open { transform:rotate(90deg); }
    .nnc-idx-children { display:none; }
    .nnc-idx-children.open { display:block; }
    .nnc-soon-badge { font-size:9px; background:#eee; color:#aaa; border-radius:8px; padding:1px 5px; margin-left:6px; }
    /* ── Content boxes ── */
    .nnc-section-box { border:3px double #b38b2e; border-radius:8px; margin:12px; background:#fff; overflow:hidden; }
    .nnc-section-heading { font-size:15px; font-weight:900; color:#4a2c00; text-align:center; padding:12px; border-bottom:1px solid #e8d090; line-height:1.5; }
    .nnc-thirumozhi-subheading { font-size:13px; font-weight:700; color:#7a5a20; text-align:center; padding:6px 12px 0; }
    .nnc-section-inner { padding:8px 12px; }
    /* ── Thaniyan ── */
    .nnc-thaniyan-box { border:3px double #b38b2e; border-radius:8px; background:#fffbf0; margin:12px; padding:14px 12px; }
    .nnc-thaniyan-label { font-size:10px; font-weight:700; color:#b38b2e; text-transform:uppercase; letter-spacing:1px; text-align:center; margin-bottom:6px; }
    .nnc-thaniyan-box .thaniyan-title { font-size:13px; font-weight:700; text-align:center; color:#4a2c00; margin:6px 0 2px; }
    .nnc-thaniyan-box .thaniyan-subhead { font-size:12px; text-align:center; color:#7a5a20; margin-bottom:4px; }
    .nnc-thaniyan-box .thaniyan-line { font-size:13px; text-align:left; line-height:1.7; color:#2a1a00; }
    .nnc-thaniyan-box .thaniyan-prosody { font-size:10px; color:#bbb; font-style:italic; text-align:center; }
    /* ── Pathu / Thirumozhi ── */
    .nnc-pathu-heading { font-size:14px; font-weight:700; color:#4a2c00; padding:10px 0 4px; border-top:1px dashed #d4a843; margin-top:6px; text-align:center; }
    .nnc-thirumozhi-box { margin-bottom:8px; }
    .nnc-thirumozhi-heading { font-size:13px; font-weight:700; color:#4a2c00; padding:6px 0 2px; text-align:center; }
    /* ── Display items ── */
    .dh-section-display { font-size:12px; color:#7a5a20; text-align:center; padding:2px 0; font-style:italic; }
    .dh-thirumozhi-display { font-size:12px; color:#7a5a20; text-align:center; padding:2px 0; font-style:italic; }
    .dh-prosody { font-size:11px; color:#aaa; text-align:center; padding:2px 0; font-style:italic; }
    .dh-adivaravu { font-size:13px; color:#7a5a20; text-align:center; padding:8px 0 4px; font-style:italic; border-top:1px dashed #d4a843; margin-top:8px; }
    .nnc-section-closing { font-size:13px; font-weight:700; color:#7a5a20; text-align:center; padding:10px 0; border-top:1px dashed #d4a843; margin-top:6px; }
    /* ── Pasurams ── */
    .nnc-pasuram-block { margin-bottom:14px; position:relative; }
    .nnc-pasuram-sep { border-top:1px dashed #e0d0a0; margin:10px 0; }
    .nnc-global-no { font-size:12px; font-weight:700; color:#b38b2e; text-align:left; margin-bottom:2px; }
    .nnc-lines { font-size:var(--base-font,13px); color:#1a2a00; line-height:1.85; text-align:left; }
    .nnc-line { display:block; font-size:var(--base-font,13px); }
    .nnc-group-gap { height:8px; }
    .nnc-local-no { font-size:11px; color:#bbb; text-align:right; margin-top:-2px; }
    /* ── Special ── */
    .nnc-coming-box { border:2px dashed #ddd; border-radius:8px; background:#f9f9f9; margin:12px; padding:20px; text-align:center; color:#bbb; font-size:14px; }
    .nnc-group-label { font-size:13px; font-weight:700; color:#7a5a20; padding:10px 14px 4px; border-bottom:1px solid #e8d090; }
    .nnc-annex-heading { font-size:13px; font-weight:700; color:#7a5a20; text-align:center; padding:10px 0 4px; border-top:1px dashed #d4a843; margin-top:8px; font-style:italic; }
    /* ── Vazhi thirunamam ── */
    .nnc-vazhi-entry { margin-bottom:16px; padding-bottom:12px; border-bottom:1px dashed #e8d090; }
    .nnc-vazhi-name { font-size:12px; font-weight:900; color:#4a2c00; margin-bottom:4px; text-align:left; }
    .nnc-vazhi-lines { font-size:13px; line-height:1.8; text-align:left; }
    .nnc-vazhi-line { display:block; text-align:left; }
    /* ── Madal ── */
    .nnc-madal-plain-block { margin-bottom:22px; }
    .nnc-madal-couplet { margin-bottom:22px; }
    .nnc-madal-dual-block { background:#fffbee; padding:6px 8px; border-radius:4px; margin-bottom:22px; }
    .nnc-madal-line { display:block; font-size:var(--base-font,13px); color:#1a2a00; line-height:1.55; text-align:left; }
    .nnc-line-with-no { display:flex; justify-content:space-between; align-items:baseline; }
    .nnc-couplet-no { font-size:11px; color:#bbb; margin-left:8px; flex-shrink:0; }
    /* ── Final closing ── */
    .nnc-final-closing { text-align:center; font-size:16px; font-weight:900; color:#4a2c00; padding:24px 12px; border-top:3px double #b38b2e; margin:12px; }
    /* ── Spinner ── */
    .nnc-spinner { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:50vh; gap:12px; }
    .nnc-spinner-lotus { font-size:40px; animation:nnc-spin 1.8s linear infinite; }
    @keyframes nnc-spin { 0%{transform:rotate(0deg) scale(1);}50%{transform:rotate(180deg) scale(1.1);}100%{transform:rotate(360deg) scale(1);} }
    /* ── Float nav ── */
    .nnc-float-nav { position:fixed; bottom:20px; right:14px; display:flex; flex-direction:column; gap:8px; z-index:999; }
    .nnc-float-nav button { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,#c9a227,#e8c060); border:2px solid #b38b2e; color:#2a1a00; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:'Latha','Bamini',serif; }
  `;
  document.head.appendChild(s);
}
