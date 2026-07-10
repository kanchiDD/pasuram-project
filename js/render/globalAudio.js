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
    p.preload = "auto";
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
  let preloader = null;
  const next = () => {
    if (idx >= data.urls.length) { setBtnState(btn, false); return; }
    p.src = data.urls[idx++];
    p.onended = next;
    p.onerror = null;   // don't skip on error — let it stay stopped
    p.play().catch(() => {});
    // Warm the next track while the current one plays → minimal gap between pasurams
    if (idx < data.urls.length) {
      preloader = new Audio();
      preloader.preload = "auto";
      preloader.src = data.urls[idx];
    }
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
  // label omitted (empty) → no subscript, just the green circle
  const sub  = label
    ? `<span class="ga-sub" data-idle="${label}"
        style="font-size:${lfs}px;color:#2e7d32;margin-top:2px;line-height:1">${label}</span>`
    : "";
  return `<span class="ga-wrap" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 4px;line-height:1">
    <button id="${id}" class="ga-btn" type="button" onclick="_gaToggle('${id}')"
      style="background:#2e7d32;color:#fff;border:none;border-radius:50%;
             width:${d}px;height:${d}px;font-size:${fs}px;cursor:pointer;
             line-height:1;padding:0;display:flex;align-items:center;justify-content:center">▶</button>
    ${sub}
  </span>`;
}

// ── Centered, label-less green ▶ (the ONE look used everywhere) ──
// centerPlayBtn : plays a single url (thaniyan / pasuram)
// centerQueueBtn: plays a queue (section Play All) — same look
export function centerPlayBtn(id, url) {
  return `<div class="ga-center" style="display:flex;justify-content:center;margin:3px 0 5px">${audioBtn(id, url, "sm", "Play")}</div>`;
}
export function centerQueueBtn(id, urls) {
  return `<div class="ga-center" style="display:flex;justify-content:center;margin:3px 0 5px">${audioBtn(id, urls, "sm", "Play All")}</div>`;
}

// ── Pasuram number + play on ONE line (no extra row) ──
// numberHtml : the view's own number markup (e.g. "<b>927</b>")
// The number pins to the left; the small green ▶ (with Play/Stop
// subscript that flips green→red automatically) centers on the SAME line.
export function numLinePlay(numberHtml, id, url, hasAudio) {
  const btn = hasAudio ? audioBtn(id, url, "sm", "Play") : "";
  return `<div class="ga-numline" style="display:flex;align-items:center;min-height:24px">
    <span style="flex:0 0 auto">${numberHtml}</span>
    <span style="flex:1;display:flex;justify-content:center">${btn}</span>
  </div>`;
}

// ── Section Play All (data-driven) ──
// Builds a queue from ONLY the audio items in this section:
//   section thaniyan (if it has audio) → each pasuram that has audio.
// Returns "" when the section has no audio at all, so the button appears
// on its own the moment has_audio is set in the DB — no .js changes needed.
export function sectionPlayAll(sectionId, thaniyanData, pasuramData) {
  const rows = Array.isArray(thaniyanData)
    ? thaniyanData
    : (thaniyanData?.thaniyan || thaniyanData?.data || thaniyanData?.rows || []);
  const queue = [];
  const secThan = (rows || []).find(t => t.type === "section" && t.has_audio);
  if (secThan) queue.push(THANIYAN_URL(secThan.section_id || sectionId));
  const pas = Array.isArray(pasuramData) ? pasuramData : [];
  for (const p of pas) { if (p.has_audio) queue.push(PASURAM_URL(p.global_no)); }
  if (!queue.length) return "";
  return centerQueueBtn("ga-sec-" + (sectionId || "x"), queue);
}

// ── Compatibility wrappers (existing renderer imports keep working) ──
export function inlinePlayBtn(id, url) {
  return audioBtn(id, url, "sm", "");
}
export function sectionListenBtn(id, url) {
  return centerPlayBtn(id, url);
}
export function sectionQueueBtn(id, urls) {
  return centerQueueBtn(id, urls);
}