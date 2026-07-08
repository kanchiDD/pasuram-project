// globalAudio.js  →  js/render/globalAudio.js
// Single shared audio module. Uses a JS Map registry — no URL
// embedding in HTML attributes, zero injection risk.
//
// R2 URL conventions:
//   thaniyan : https://audio.arulicheyal.org/thaniyans/thaniyan_{id}.mp3
//   pasuram  : https://audio.arulicheyal.org/pasurams/pasuram_{no}.mp3

const AUDIO_BASE = "https://audio.arulicheyal.org";
export const THANIYAN_URL = id => `${AUDIO_BASE}/thaniyans/thaniyan_${id}.mp3`;
export const PASURAM_URL  = no => `${AUDIO_BASE}/pasurams/pasuram_${no}.mp3`;

// ── Registry: buttonGroupId → { audioId, urls[] } ─────────────
const _registry = new Map();

// ── Shared player ──────────────────────────────────────────────
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

// ── Color helpers ──────────────────────────────────────────────
// Section controls: Play button green → red when playing
function _setPlayBtn(audioId, playing) {
  const btn = document.getElementById("ga-play-" + audioId);
  if (!btn) return;
  if (playing) {
    btn.style.background = "#c0392b"; // red when playing
    btn.title = "Playing";
  } else {
    btn.style.background = "#3cb043"; // green when ready
    btn.title = "Play";
  }
}

// Inline pasuram ▶ button: green → red
function _setInlineBtn(id, playing) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.style.color = playing ? "#c0392b" : "#2e7d32";
  btn.textContent = playing ? "■" : "▶";
}

// Stop all currently playing audio and reset all buttons
function stopAll() {
  const p = getPlayer();
  p.pause();
  p.src = "";
  // Reset all section play buttons to green
  document.querySelectorAll("[id^='ga-play-']").forEach(b => {
    b.style.background = "#3cb043";
  });
  // Reset all inline buttons to green ▶
  document.querySelectorAll(".ga-inline-btn").forEach(b => {
    b.style.color = "#2e7d32";
    b.textContent = "▶";
  });
}

// ── Play a single URL ──────────────────────────────────────────
window._gaPlay = function(audioId) {
  const data = _registry.get(audioId);
  if (!data) return;
  const p = getPlayer();
  // Toggle if already playing this track
  if (!p.paused && p.src.endsWith(data.urls[0].split("/").pop())) {
    stopAll(); return;
  }
  stopAll();
  p.src = data.urls[0];
  p.play().catch(() => {});
  _setPlayBtn(audioId, true);
  p.onended = () => _setPlayBtn(audioId, false);
};

// ── Stop a specific section ────────────────────────────────────
window._gaStop = function(audioId) {
  const p = getPlayer();
  p.pause(); p.src = "";
  _setPlayBtn(audioId, false);
};

// ── Mute toggle ───────────────────────────────────────────────
window._gaMute = function(audioId, btn) {
  const p = getPlayer();
  p.muted = !p.muted;
  btn.textContent = p.muted ? "🔇" : "🔊";
};

// ── Play a queue (thaniyan → pasuram → ...) ───────────────────
window._gaQueue = function(audioId) {
  const data = _registry.get(audioId);
  if (!data || !data.urls.length) return;
  const p = getPlayer();
  // Toggle off if playing
  if (!p.paused) { stopAll(); return; }
  stopAll();
  let idx = 0;
  _setPlayBtn(audioId, true);
  function next() {
    if (idx >= data.urls.length) { _setPlayBtn(audioId, false); return; }
    p.src = data.urls[idx++];
    p.play().catch(() => {});
    p.onended = next;
  }
  next();
};

// ── Inline pasuram ▶ toggle ───────────────────────────────────
window._gaInline = function(btnId) {
  const data = _registry.get(btnId);
  if (!data) return;
  const p = getPlayer();
  const btn = document.getElementById(btnId);
  if (btn && btn.textContent === "■") { stopAll(); return; }
  stopAll();
  p.src = data.urls[0];
  p.play().catch(() => {});
  _setInlineBtn(btnId, true);
  p.onended = () => _setInlineBtn(btnId, false);
};

// ── Button builders ────────────────────────────────────────────

const BTN  = "background:#3cb043;color:#fff;border:none;border-radius:50%;width:26px;height:26px;font-size:11px;cursor:pointer;";
const STOP = "background:#555;color:#fff;border:none;border-radius:50%;width:26px;height:26px;font-size:11px;cursor:pointer;";
const MUTE = "background:#777;color:#fff;border:none;border-radius:50%;width:26px;height:26px;font-size:11px;cursor:pointer;";
const LBL  = "font-size:10px;color:#666;margin-top:2px;";
const GRP  = "display:flex;flex-direction:column;align-items:center;";

// Section-level: single file (thaniyan only)
export function sectionListenBtn(id, url) {
  _registry.set(id, { urls: [url] });
  return `
    <div style="display:flex;gap:22px;justify-content:center;align-items:flex-start;margin:8px 0;">
      <div style="${GRP}">
        <button id="ga-play-${id}" type="button" title="Play"
          onclick="_gaPlay('${id}')" style="${BTN}">▶</button>
        <span style="${LBL}">Play</span>
      </div>
      <div style="${GRP}">
        <button type="button" title="Stop"
          onclick="_gaStop('${id}')" style="${STOP}">■</button>
        <span style="${LBL}">Stop</span>
      </div>
      <div style="${GRP}">
        <button type="button" title="Mute"
          onclick="_gaMute('${id}',this)" style="${MUTE}">🔊</button>
        <span style="${LBL}">Mute</span>
      </div>
    </div>`;
}

// Section-level: queue (thaniyan → pasuram → ...)
export function sectionQueueBtn(id, urls) {
  _registry.set(id, { urls });
  return `
    <div style="display:flex;gap:22px;justify-content:center;align-items:flex-start;margin:8px 0;">
      <div style="${GRP}">
        <button id="ga-play-${id}" type="button" title="Play"
          onclick="_gaQueue('${id}')" style="${BTN}">▶</button>
        <span style="${LBL}">Play</span>
      </div>
      <div style="${GRP}">
        <button type="button" title="Stop"
          onclick="_gaStop('${id}')" style="${STOP}">■</button>
        <span style="${LBL}">Stop</span>
      </div>
      <div style="${GRP}">
        <button type="button" title="Mute"
          onclick="_gaMute('${id}',this)" style="${MUTE}">🔊</button>
        <span style="${LBL}">Mute</span>
      </div>
    </div>`;
}

// Pasuram-level: tiny inline ▶ next to global_no
// Small green circle, red when playing, subscript "Play"/"Stop" label
export function inlinePlayBtn(id, url) {
  _registry.set(id, { urls: [url] });
  return `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin-left:4px;">
    <button id="${id}" class="ga-inline-btn" type="button"
      onclick="_gaInline('${id}')"
      style="background:#2e7d32;color:#fff;border:none;border-radius:50%;
             width:18px;height:18px;font-size:9px;cursor:pointer;
             line-height:1;padding:0;">▶</button>
    <span style="font-size:8px;color:#2e7d32;margin-top:1px;line-height:1">Play</span>
  </span>`;
}