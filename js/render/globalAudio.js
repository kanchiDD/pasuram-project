// =============================================================
// globalAudio.js  →  js/render/globalAudio.js
// ONE audio design for the whole site:
//   small round GREEN button, ▶ symbol, "Play" subscript below.
//   While playing: RED button, ■ symbol, "Stop" subscript.
//   Tap again to stop. Only one thing plays at a time.
//
// Levels:
//   inline  (pasuram)        → 18px circle, next to global_no
//   section (thaniyan/whole) → 26px circle, centered
//
// A button can hold ONE url or a QUEUE of urls (plays in order:
// thaniyan → pasuram 1 → pasuram 2 → …).
//
// R2 conventions:
//   thaniyans/thaniyan_{thaniyan_id}.mp3
//   pasurams/pasuram_{global_no}.mp3
// =============================================================

const AUDIO_BASE = "https://audio.arulicheyal.org";
export const THANIYAN_URL = id => `${AUDIO_BASE}/thaniyans/thaniyan_${id}.mp3`;
export const THANIYAN_SEC_URL = section_id => `${AUDIO_BASE}/thaniyans/thaniyan_${section_id}.mp3`;
export const PASURAM_URL  = no => `${AUDIO_BASE}/pasurams/pasuram_${no}.mp3`;

// id → { urls: [] }
const _registry = new Map();

function getPlayer() {
  let p = document.getElementById("ga-player");
  if (!p) {
    p = document.createElement("audio");
    p.id = "ga-player";
    p.style.display = "none";
    document.body.appendChild(p);
  }
  return p;
}

// ── Button visual state ────────────────────────────────────────
function setBtnState(btn, playing) {
  if (!btn) return;
  const label = btn.parentElement?.querySelector(".ga-sub");
  if (playing) {
    btn.style.background = "#c0392b";     // red
    btn.textContent = "■";
    btn.classList.add("ga-playing");
    if (label) { label.textContent = "Stop"; label.style.color = "#c0392b"; }
  } else {
    btn.style.background = "#2e7d32";     // green
    btn.textContent = "▶";
    btn.classList.remove("ga-playing");
    if (label) { label.textContent = label.dataset.idle || "Play"; label.style.color = "#2e7d32"; }
  }
}

function stopAll() {
  const p = getPlayer();
  p.pause(); p.src = ""; p.onended = null; p.onerror = null;
  document.querySelectorAll(".ga-btn").forEach(b => setBtnState(b, false));
}

// ── The single toggle used by every button ─────────────────────
window._gaToggle = function (id) {
  const btn  = document.getElementById(id);
  const data = _registry.get(id);
  if (!btn || !data || !data.urls.length) return;

  // Tapping the playing button stops it
  if (btn.classList.contains("ga-playing")) { stopAll(); return; }

  stopAll();
  const p = getPlayer();
  let idx = 0;
  setBtnState(btn, true);
  const next = () => {
    if (idx >= data.urls.length) { setBtnState(btn, false); return; }
    p.src = data.urls[idx++];
    p.onended = next;
    p.onerror = null;   // don't skip on error — let it stay stopped
    p.play().catch(() => {});
  };
  next();
};
window._gaStopAll = stopAll;

// ── ONE builder ────────────────────────────────────────────────
// size: "sm" (inline pasuram) | "lg" (thaniyan / section)
// label: idle subscript text ("Play", "Play All")
export function audioBtn(id, urls, size = "sm", label = "Play") {
  _registry.set(id, { urls: Array.isArray(urls) ? urls : [urls] });
  const d    = size === "lg" ? 26 : 18;
  const fs   = size === "lg" ? 12 : 9;
  const lfs  = size === "lg" ? 10 : 8;
  return `<span class="ga-wrap" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 4px;line-height:1">
    <button id="${id}" class="ga-btn" type="button" onclick="_gaToggle('${id}')"
      style="background:#2e7d32;color:#fff;border:none;border-radius:50%;
             width:${d}px;height:${d}px;font-size:${fs}px;cursor:pointer;
             line-height:1;padding:0;display:flex;align-items:center;justify-content:center">▶</button>
    <span class="ga-sub" data-idle="${label}"
      style="font-size:${lfs}px;color:#2e7d32;margin-top:2px;line-height:1">${label}</span>
  </span>`;
}

// ── Compatibility wrappers (existing renderer imports keep working) ──
export function inlinePlayBtn(id, url) {
  return audioBtn(id, url, "sm", "Play");
}
export function sectionListenBtn(id, url) {
  return `<div style="text-align:center;margin:6px 0">${audioBtn(id, url, "lg", "Play")}</div>`;
}
export function sectionQueueBtn(id, urls) {
  return `<div style="text-align:center;margin:6px 0">${audioBtn(id, urls, "lg", "Play All")}</div>`;
}