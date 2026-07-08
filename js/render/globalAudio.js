// globalAudio.js — shared audio module for all renderers
// Uses a JS Map registry so NO data is embedded in HTML attributes —
// completely avoids all quote/injection issues.

const AUDIO_BASE = "https://audio.arulicheyal.org";
export const THANIYAN_URL = id => `${AUDIO_BASE}/thaniyans/thaniyan_${id}.mp3`;
export const PASURAM_URL  = no => `${AUDIO_BASE}/pasurams/pasuram_${no}.mp3`;

// ── Registry: buttonId → url or url[] ─────────────────────────
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

function setPlaying(btn, isInline) {
  btn.textContent = isInline ? "■" : "Stop";
  btn.classList.add("ga-playing");
  btn.style.color = "#c0392b";
  btn.style.borderColor = "#c0392b";
  if (!isInline) btn.style.background = "#fff0f0";
}

function setReady(btn, isInline) {
  btn.textContent = isInline ? "▶" : "▶ Listen";
  btn.classList.remove("ga-playing");
  btn.style.color = isInline ? "#b38b2e" : "#7a4d00";
  btn.style.borderColor = "#b38b2e";
  btn.style.background = isInline ? "none" : "#fffdf5";
}

function stopAll() {
  const p = getPlayer();
  p.pause(); p.src = "";
  document.querySelectorAll(".ga-listen-btn").forEach(b => setReady(b, false));
  document.querySelectorAll(".ga-inline-btn").forEach(b => setReady(b, true));
}

function playUrl(url, btn, isInline) {
  if (btn.classList.contains("ga-playing")) { stopAll(); return; }
  stopAll();
  const p = getPlayer();
  p.src = url;
  p.play().catch(() => {});
  setPlaying(btn, isInline);
  p.onended = () => setReady(btn, isInline);
}

function playQueue(urls, btn) {
  if (!urls || !urls.length) return;
  if (btn.classList.contains("ga-playing")) { stopAll(); return; }
  stopAll();
  let idx = 0;
  const p = getPlayer();
  setPlaying(btn, false);
  function next() {
    if (idx >= urls.length) { setReady(btn, false); return; }
    p.src = urls[idx++];
    p.play().catch(() => {});
    p.onended = next;
  }
  next();
}

// ── Window bindings (called from onclick) ─────────────────────
window._gaStop = stopAll;
window._gaBtn  = function(id) {
  const btn  = document.getElementById(id);
  if (!btn) return;
  const data = _registry.get(id);
  if (!data) return;
  if (Array.isArray(data)) playQueue(data, btn);
  else playUrl(data, btn, btn.classList.contains("ga-inline-btn"));
};

// ── Button builders ────────────────────────────────────────────
const BTN_STYLE  = "display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;border:1px solid #b38b2e;background:#fffdf5;color:#7a4d00;font-size:12px;cursor:pointer;margin:4px 0;font-family:inherit";
const QBTN_STYLE = "display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;border:1.5px solid #b38b2e;background:#fffdf5;color:#7a4d00;font-size:12px;font-weight:600;cursor:pointer;margin:6px 0;font-family:inherit";
const IBTN_STYLE = "background:none;border:none;color:#b38b2e;font-size:13px;cursor:pointer;padding:0 4px;vertical-align:middle;line-height:1";

export function sectionListenBtn(id, url) {
  _registry.set(id, url);
  return `<button id="${id}" class="ga-listen-btn" onclick="_gaBtn('${id}')" style="${BTN_STYLE}">▶ Listen</button>`;
}

export function sectionQueueBtn(id, urls) {
  _registry.set(id, urls);
  return `<button id="${id}" class="ga-listen-btn" onclick="_gaBtn('${id}')" style="${QBTN_STYLE}">▶ Listen</button>`;
}

export function inlinePlayBtn(id, url) {
  _registry.set(id, url);
  return `<button id="${id}" class="ga-inline-btn" onclick="_gaBtn('${id}')" style="${IBTN_STYLE}">▶</button>`;
}