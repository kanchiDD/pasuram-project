// fullNithyanusandhanam.js — thin router, imports from split files
import { injectNNCCSS } from "./nncCSS.js";
import { buildIndex, registerIndexHandlers } from "./nncIndex.js";
import { renderItem } from "./nncRender.js";

const API = "https://cdnaalayiram-api.kanchitrust.workers.dev/api";

// ── Entry screen ──────────────────────────────────────────────────────────────
function entryScreen() {
  return `
    <div class="nnc-entry">
      <div class="nnc-frame">
        <img src="assets/images/vaishnava_transparent.png" class="nnc-logo" alt=""/>
        <img src="assets/images/first.png" class="nnc-deity-img" alt=""/>
        <div class="nnc-deity-name">ஸ்ரீ பெரிய பெருமாள் ஸ்ரீ பெரிய பிராட்டியார்</div>
        <div class="nnc-title">நித்யானுஸந்தானம்</div>
        <div class="nnc-subtitle">நாலாயிர திவ்யப்பிரபந்தம்</div>
        <button class="nnc-begin-btn" onclick="window._nncBegin()">Begin 🙏</button>
      </div>
    </div>`;
}

// ── Float nav ─────────────────────────────────────────────────────────────────
function floatNav() {
  return `<div class="nnc-float-nav">
    <button onclick="window.goHome?.()">🏠</button>
    <button onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>
    <button onclick="window.scrollBy({top:-window.innerHeight*0.85,behavior:'smooth'})">◀</button>
    <button onclick="window.scrollBy({top:window.innerHeight*0.85,behavior:'smooth'})">▶</button>
    <button onclick="(()=>{const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font')||'15');document.documentElement.style.setProperty('--base-font',(v+1)+'px')})()">A+</button>
    <button onclick="(()=>{const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font')||'15');document.documentElement.style.setProperty('--base-font',(v-1)+'px')})()">A-</button>
  </div>`;
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function renderFullNithyanusandhanam() {
  injectNNCCSS();
  registerIndexHandlers();

  window._nncBegin = async () => {
    const app = document.getElementById("app");
    if (!app) return;

    // Show spinner
    app.innerHTML = `
      <div class="nnc-page">
        <div class="nnc-page-header">
          நித்யானுஸந்தானம்
          <div class="nnc-page-header-sub">நாலாயிர திவ்யப்பிரபந்தம்</div>
        </div>
        <div class="nnc-spinner">
          <div class="nnc-spinner-lotus">🪷</div>
          <div style="font-size:15px;color:#7a5a20;font-family:'Latha','Bamini',serif;">Loading...</div>
        </div>
      </div>`;

    // Fetch sequence
    const items = await fetch(`${API}/nithyanusandhanam?sub=sequence`).then(r => r.json());

    // ── FIX 1: Fetch deduplicator ─────────────────────────────────────────────
    // When Promise.all fires 55 renders simultaneously, many call the same URL
    // (e.g. /api/pasuram?section_id=2 called by multiple pathu items).
    // Deduplicator ensures only ONE actual HTTP request per unique URL —
    // all others wait for the same promise. Zero changes to nncRender.js.
    // Deduplicator caches the JSON promise (not Response) so body is only read once
    const _inflight = new Map();
    const _origFetch = window.fetch;
    window.fetch = (url, opts) => {
      if (opts) return _origFetch(url, opts);
      const key = typeof url === "string" ? url : url.toString();
      if (_inflight.has(key)) {
        // Return a fake Response wrapping the cached JSON promise
        const cached = _inflight.get(key);
        return Promise.resolve({ json: () => cached, ok: true });
      }
      const jsonPromise = _origFetch(url).then(r => r.json()).finally(() => _inflight.delete(key));
      _inflight.set(key, jsonPromise);
      return Promise.resolve({ json: () => jsonPromise, ok: true });
    };

    // ── FIX 2: Parallel rendering ─────────────────────────────────────────────
    // Promise.all starts ALL 55 renders simultaneously instead of one by one.
    // Total time = slowest single render, not sum of all renders.
    const htmlParts = await Promise.all(
      items.map(item => renderItem(item).catch(err => {
        console.error("renderItem failed for item", item.id, err);
        return "";
      }))
    );

    // Restore original fetch
    window.fetch = _origFetch;

    const contentHtml = `
      <div id="nnc-content">
        ${htmlParts.join("")}
        <div class="nnc-final-closing">நித்யானுஸந்தானம் முற்றிற்று 🙏</div>
      </div>`;

    // Build index AFTER content (so koil IDs are available)
    const indexHtml = buildIndex(items);

    const page = app.querySelector(".nnc-page");
    if (page) {
      page.innerHTML = `
        <div class="nnc-page-header">
          நித்யானுஸந்தானம்
          <div class="nnc-page-header-sub">நாலாயிர திவ்யப்பிரபந்தம்</div>
        </div>
        ${indexHtml}
        ${contentHtml}
        ${floatNav()}`;
    }
  };

  return entryScreen();
}
