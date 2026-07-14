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

// Special sections (kootrirukkai 21 / madal 22,23) name their thaniyan file
// by thaniyan_id (22/23/24), NOT section_id. Everything else uses section_id.
const SPECIAL_THANIYAN = { 21: 22, 22: 23, 23: 24 };
export function thaniyanFileUrl(sectionId, thaniyanId) {
  const sp = SPECIAL_THANIYAN[Number(sectionId)];
  return THANIYAN_URL(sp || sectionId);
}

// id → { urls: [] }
const _registry = new Map();

// ── Cross-page playback state (Option B: resume on navigation) ──────
// The single <audio> dies on each full page load, so we persist the queue +
// position to sessionStorage and auto-resume on the next page. No service
// worker / caching involved — pure JS.
let _gaState  = { urls: [], idx: 0, label: "" };
let _gaNext   = null;
let _saveTimer = null;

function saveState() {
  try {
    const p = document.getElementById("ga-player");
    if (!_gaState.urls.length || !p || !p.src) { sessionStorage.removeItem("gaPlayback"); return; }
    sessionStorage.setItem("gaPlayback", JSON.stringify({
      urls: _gaState.urls, idx: Math.max(0, _gaState.idx - 1), label: _gaState.label,
      time: p.currentTime || 0, paused: p.paused
    }));
  } catch (e) {}
}
function clearState() { try { sessionStorage.removeItem("gaPlayback"); } catch (e) {} }

function setMediaSession(label) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  label || "நாலாயிர திவ்யப்பிரபந்தம்",
      artist: "arulicheyal.org",
      album:  "Naalayira Divya Prabandham"
    });
    navigator.mediaSession.setActionHandler("play",  () => { const p = getPlayer(); p.play().catch(() => {}); updatePauseIcon(); });
    navigator.mediaSession.setActionHandler("pause", () => { getPlayer().pause(); updatePauseIcon(); });
    navigator.mediaSession.setActionHandler("stop",  () => stopAll());
    try { navigator.mediaSession.setActionHandler("nexttrack", () => { if (_gaNext) _gaNext(); }); } catch (e) {}
  } catch (e) {}
}

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
  hideAudioControls();
  _gaState = { urls: [], idx: 0, label: "" };
  clearState();
}

// ── Floating playback control bar (Pause / Stop) ───────────────────
// A shared bar so any queue playback (voice "play", play-all thaniyans,
// thousand, etc.) can be paused, resumed, or stopped.
function ensureControlBar() {
  let bar = document.getElementById("ga-controls");
  if (bar) return bar;
  bar = document.createElement("div");
  bar.id = "ga-controls";
  bar.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99998;"
    + "display:none;align-items:center;gap:10px;background:#4A3728;color:#fff;border:1px solid #C9A84C;"
    + "border-radius:30px;padding:8px 12px 8px 16px;box-shadow:0 6px 20px rgba(0,0,0,0.35);font-family:inherit";
  bar.innerHTML = `
    <span id="ga-ctl-label" style="font-size:13px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\u0b87\u0b9a\u0bc8 / Playing…</span>
    <button id="ga-ctl-pause" title="Pause" style="width:38px;height:38px;border-radius:50%;border:none;background:#C9A84C;color:#3a2a18;font-size:16px;cursor:pointer">\u2225</button>
    <button id="ga-ctl-stop" title="Stop" style="width:38px;height:38px;border-radius:50%;border:none;background:#c0392b;color:#fff;font-size:14px;cursor:pointer">\u25A0</button>`;
  document.body.appendChild(bar);
  bar.querySelector("#ga-ctl-pause").onclick = () => {
    const p = getPlayer();
    if (p.paused) { p.play().catch(() => {}); }
    else { p.pause(); }
    updatePauseIcon();
  };
  bar.querySelector("#ga-ctl-stop").onclick = () => stopAll();
  return bar;
}
function updatePauseIcon() {
  const btn = document.getElementById("ga-ctl-pause");
  if (!btn) return;
  const p = getPlayer();
  btn.textContent = p.paused ? "\u25B6" : "\u2225";
  btn.title = p.paused ? "Resume" : "Pause";
}
function showAudioControls(label) {
  const bar = ensureControlBar();
  const lbl = bar.querySelector("#ga-ctl-label");
  if (lbl && label) lbl.textContent = label;
  bar.style.display = "flex";
  updatePauseIcon();
}
function hideAudioControls() {
  const bar = document.getElementById("ga-controls");
  if (bar) bar.style.display = "none";
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
  showAudioControls(btn.getAttribute("data-ga-label") || "இசை / Playing…");
  setMediaSession(btn.getAttribute("data-ga-label") || "");
  _gaState = { urls: data.urls, idx: 0, label: btn.getAttribute("data-ga-label") || "" };
  p.onpause = () => { updatePauseIcon(); saveState(); };
  p.onplay  = () => { updatePauseIcon(); saveState(); };
  p.ontimeupdate = () => { if (!_saveTimer) _saveTimer = setTimeout(() => { _saveTimer = null; saveState(); }, 2000); };
  let preloader = null;
  const next = () => {
    if (idx >= data.urls.length) { setBtnState(btn, false); hideAudioControls(); clearState(); return; }
    _gaState.idx = idx;
    p.src = data.urls[idx++];
    p.onended = next;
    p.onerror = next;   // skip a missing/failed file and continue the queue
    p.play().catch(() => {});
    saveState();
    // Warm the next track while the current one plays → minimal gap between pasurams
    if (idx < data.urls.length) {
      preloader = new Audio();
      preloader.preload = "auto";
      preloader.src = data.urls[idx];
    }
  };
  _gaNext = () => { p.onended = null; next(); };
  next();
};
window._gaStopAll = stopAll;

// ── Headless queue playback (voice "play" commands — no button needed) ──
// Plays a list of audio URLs in order, skipping any that fail, reusing the
// single shared <audio> player so it behaves exactly like the on-page buttons.
// Core queue player — persists state so it can resume across page loads.
function _playQueue(urls, label, startIdx, startTime, autoplay) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (!list.length) return false;
  startIdx  = startIdx  || 0;
  startTime = startTime || 0;
  stopAll();
  _gaState = { urls: list, idx: startIdx, label: label || "" };
  const p = getPlayer();
  showAudioControls(label || "இசை / Playing…");
  setMediaSession(label);
  p.onpause = () => { updatePauseIcon(); saveState(); };
  p.onplay  = () => { updatePauseIcon(); saveState(); };
  p.ontimeupdate = () => {
    if (!_saveTimer) _saveTimer = setTimeout(() => { _saveTimer = null; saveState(); }, 2000);
  };
  let preloader = null;
  const next = () => {
    if (_gaState.idx >= list.length) { hideAudioControls(); clearState(); return; }
    const cur = _gaState.idx;
    p.src = list[_gaState.idx++];
    p.onended = next;
    p.onerror = next;               // skip missing/failed file, continue
    if (startTime && cur === startIdx) {
      p.onloadedmetadata = () => { try { p.currentTime = startTime; } catch (e) {} p.play().catch(() => {}); };
    } else {
      p.play().catch(() => {});
    }
    saveState();
    if (_gaState.idx < list.length) {
      preloader = new Audio();
      preloader.preload = "auto";
      preloader.src = list[_gaState.idx];
    }
  };
  _gaNext = () => { p.onended = null; next(); };
  next();
  if (autoplay === false) { p.pause(); updatePauseIcon(); }
  return true;
}

export function playUrls(urls, label) {
  return _playQueue(urls, label, 0, 0, true);
}
export function stopPlayback() { stopAll(); }

// Global pothu thaniyan audio queue for a sect. Madam recites Kesavarya
// (thaniyan_k.mp3) before the Vadakalai pothu (thaniyan_v.mp3).
//   Thenkalai      → [t]
//   Vadakalai      → [v]
//   Vadakalai Madam→ [k, v]
export function globalThaniyanUrls(sect, subsect) {
  const s = (sect || "T").toUpperCase();
  const isMadam = (subsect || "").toLowerCase() === "madam";
  if (s === "V" && isMadam) return [THANIYAN_URL("k"), THANIYAN_URL("v")];
  if (s === "V")            return [THANIYAN_URL("v")];
  return [THANIYAN_URL("t")];
}

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
export function sectionAudioUrls(sectionId, thaniyanData, pasuramData) {
  const rows = Array.isArray(thaniyanData)
    ? thaniyanData
    : (thaniyanData?.thaniyan || thaniyanData?.data || thaniyanData?.rows || []);
  const urls = [];
  const secThan = (rows || []).find(t => t.type === "section" && t.has_audio);
  if (secThan) urls.push(thaniyanFileUrl(secThan.section_id || sectionId, secThan.thaniyan_id));
  // Regular pasurams AND special segments (madal/kootrirukkai) share the same
  // shape: rows with global_no + has_audio, file pasuram_{global_no}.mp3.
  const pas = normalizeSegments(pasuramData);
  for (const p of pas) { if (p && p.has_audio && p.global_no != null) urls.push(PASURAM_URL(p.global_no)); }
  return urls;
}

// Accepts an array, or the {rows:[...]}/{data:[...]}/{pasurams:[...]}/{segments:[...]}
// shapes that madal/kootrirukkai data may arrive in, and returns a flat row array.
function normalizeSegments(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  return d.rows || d.data || d.pasurams || d.segments || d.lines || [];
}
export function sectionPlayAll(sectionId, thaniyanData, pasuramData) {
  // Only show Play All when the section has at least one recorded PASURAM.
  // A section with only a thaniyan already shows the thaniyan's own button,
  // so a "Play All" there would be redundant/misleading.
  const pas = normalizeSegments(pasuramData);
  const pasUrls = [];
  for (const p of pas) { if (p && p.has_audio && p.global_no != null) pasUrls.push(PASURAM_URL(p.global_no)); }
  if (!pasUrls.length) return "";
  const rows = Array.isArray(thaniyanData)
    ? thaniyanData
    : (thaniyanData?.thaniyan || thaniyanData?.data || thaniyanData?.rows || []);
  const secThan = (rows || []).find(t => t.type === "section" && t.has_audio);
  const queue = [];
  if (secThan) queue.push(thaniyanFileUrl(secThan.section_id || sectionId, secThan.thaniyan_id));
  queue.push(...pasUrls);
  return centerQueueBtn("ga-sec-" + (sectionId || "x"), queue);
}

// ── Full-Thousand Play (data-driven) ──
// Slightly bigger green ▶ that plays the whole thousand in order:
// "Play full" (bold) with the thousand name below in a subtle font.
// urls is the accumulated audio queue for that thousand; "" if none.
export function thousandPlayAll(thousandId, thousandName, urls) {
  if (!urls || !urls.length) return "";
  const id = "ga-thousand-" + thousandId;
  _registry.set(id, { urls: Array.isArray(urls) ? urls : [urls] });
  const nameHtml = thousandName
    ? `<span style="font-size:11px;color:#8a6a30;font-weight:400;margin-top:1px;line-height:1.1">${thousandName}</span>`
    : "";
  return `<div class="ga-thousand" style="display:flex;justify-content:center;margin:14px 0 22px">
    <span class="ga-wrap" style="display:inline-flex;flex-direction:column;align-items:center;line-height:1.15">
      <button id="${id}" class="ga-btn" type="button" onclick="_gaToggle('${id}')"
        style="background:#2e7d32;color:#fff;border:none;border-radius:50%;
               width:30px;height:30px;font-size:15px;cursor:pointer;
               line-height:1;padding:0;display:flex;align-items:center;justify-content:center">▶</button>
      <span class="ga-sub" data-idle="Play full"
        style="font-size:12px;color:#2e7d32;margin-top:3px;line-height:1.1;font-weight:600">Play full</span>
      ${nameHtml}
    </span>
  </div>`;
}

// ── Special sections (kootrirukkai / madal) ──
// These are single recorded works, NOT per-pasuram rows. The thaniyan file
// is named by thaniyan_id (22/23/24), and the work by its global_no
// (2672/2673/2674). Mirrors SECTION_AUDIO_MAP in newSpecial.js — keep in
// sync if those files ever change. Keyed by both section_id and work global_no.
const SPECIAL_AUDIO = {
  21:   { thaniyan: 22, work: 2672 },  // திருவெழுகூற்றிருக்கை
  2672: { thaniyan: 22, work: 2672 },
  22:   { thaniyan: 23, work: 2673 },  // சிறியதிருமடல்
  2673: { thaniyan: 23, work: 2673 },
  23:   { thaniyan: 24, work: 2674 },  // பெரியதிருமடல்
  2674: { thaniyan: 24, work: 2674 }
};
export function specialSectionUrls(sectionId) {
  const m = SPECIAL_AUDIO[Number(sectionId)];
  if (!m) return [];
  return [
    `${AUDIO_BASE}/thaniyans/thaniyan_${m.thaniyan}.mp3`,
    `${AUDIO_BASE}/pasurams/pasuram_${m.work}.mp3`
  ];
}
export function specialSectionPlayAll(sectionId) {
  const urls = specialSectionUrls(sectionId);
  if (!urls.length) return "";
  return centerQueueBtn("ga-sec-" + sectionId, urls);
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
// ── Option B: save on navigation + auto-resume on next page ─────────────────
// Pure JS — no service worker, no caching. Browsers may block autoplay without
// a prior gesture; in that case the queue restores paused and the floating
// bar's ▶ resumes with one tap (Android PWA with media engagement usually
// auto-plays). Media Session gives lock-screen controls where the OS allows.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", saveState);
  window.addEventListener("beforeunload", saveState);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveState(); });

  const _gaResume = () => {
    let s;
    try { s = JSON.parse(sessionStorage.getItem("gaPlayback") || "null"); } catch (e) { s = null; }
    if (!s || !s.urls || !s.urls.length) return;
    _playQueue(s.urls, s.label, s.idx || 0, s.time || 0, !s.paused);
    if (s.paused) { const p = getPlayer(); p.pause(); updatePauseIcon(); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _gaResume);
  else _gaResume();
}