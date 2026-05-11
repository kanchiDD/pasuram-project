// =============================================================
// fullDivyadesam.js  →  js/render/fullDivyadesam.js
// Thin entry point — delegates to ddIndex.js
// =============================================================

export { renderDivyadesamIndex as renderFullDivyadesam } from "./divyadesam/ddIndex.js";

// Spinner for layout.js (used while the async render runs)
export function divyadesamSpinner() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;">
      <div style="font-size:48px;animation:fdd-spin 1.6s linear infinite;">🪷</div>
      <div style="margin-top:14px;font-size:16px;color:#7a5a20;font-family:'Latha','Bamini',serif;">Loading...</div>
    </div>
    <style>@keyframes fdd-spin{0%{transform:rotate(0deg) scale(1);}50%{transform:rotate(180deg) scale(1.1);}100%{transform:rotate(360deg) scale(1);}}</style>`;
}
