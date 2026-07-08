// =============================================================
// globalAudio.js  →  js/render/globalAudio.js
// Single source of truth for all audio controls on the site.
//
// ONE shared <audio> element (id="ga-player") is created once.
// Tapping any Listen button loads its URL and plays it.
// Tapping again or tapping another button stops the current one.
//
// URL conventions (R2 bucket: arulicheyal-audio):
//   thaniyan : https://audio.arulicheyal.org/thaniyans/thaniyan_{thaniyan_id}.mp3
//   pasuram  : https://audio.arulicheyal.org/pasurams/pasuram_{global_no}.mp3
//
// Controls:
//   section-level  (thaniyan / madal / kootrirukkai / whole section)
//     → "Listen" pill button, full ▶ Stop row on expand
//   pasuram-level  (individual pasuram inline)
//     → tiny ▶ next to global_no; stops previous on tap
// =============================================================

const AUDIO_BASE = "https://audio.arulicheyal.org";

export const THANIYAN_URL = id =>
  `${AUDIO_BASE}/thaniyans/thaniyan_${id}.mp3`;
export const PASURAM_URL  = no =>
  `${AUDIO_BASE}/pasurams/pasuram_${no}.mp3`;

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

// Stop the shared player and reset all Listen buttons
function stopAll() {
  const p = getPlayer();
  p.pause();
  p.src = "";
  document.querySelectorAll(".ga-listen-btn").forEach(b => {
    b.textContent = "Listen";
    b.classList.remove("ga-playing");
  });
  document.querySelectorAll(".ga-inline-btn").forEach(b => {
    b.textContent = "▶";
    b.classList.remove("ga-playing");
  });
}

// Play a URL, toggling the triggering button
function playUrl(url, btn, isInline) {
  const p = getPlayer();
  // Tapping the same button while playing → stop
  if (btn.classList.contains("ga-playing")) { stopAll(); return; }
  stopAll();
  p.src = url;
  p.play().catch(() => {});
  btn.textContent = isInline ? "■" : "Stop";
  btn.classList.add("ga-playing");
  p.onended = () => { btn.textContent = isInline ? "▶" : "Listen"; btn.classList.remove("ga-playing"); };
}

// ── Section-level queue (whole section: thaniyan + all pasurams) ──
// Caller passes ordered array of URLs; button plays them sequentially.
function playQueue(urls, btn) {
  if (!urls.length) return;
  if (btn.classList.contains("ga-playing")) { stopAll(); return; }
  stopAll();
  let idx = 0;
  const p = getPlayer();
  btn.textContent = "Stop";
  btn.classList.add("ga-playing");
  function next() {
    if (idx >= urls.length) { btn.textContent = "▶ Listen"; btn.classList.remove("ga-playing"); btn.style.color="#7a4d00"; btn.style.borderColor="#b38b2e"; btn.style.background="#fffdf5"; return; }
    p.src = urls[idx++];
    p.play().catch(() => {});
    p.onended = next;
  }
  next();
}

// ── Bind functions to window so inline onclick="" attributes work ──
window._gaPlay          = (url, btnId) => playUrl(url, document.getElementById(btnId), false);
window._gaPlayInline    = (url, btnId) => playUrl(url, document.getElementById(btnId), true);
window._gaQueue         = (urlsJson, btnId) => playQueue(JSON.parse(urlsJson), document.getElementById(btnId));
window._gaStop          = stopAll;
window._gaPlayBtn       = (btn) => playUrl(btn.dataset.url, btn, false);
window._gaPlayInlineBtn = (btn) => playUrl(btn.dataset.url, btn, true);
window._gaQueueBtn      = (btn) => playQueue(JSON.parse(btn.dataset.queue), btn);

// ── HTML builders ──────────────────────────────────────────────

// Section-level "Listen" button (thaniyan or single-file section)
// id must be unique per page element.
export function sectionListenBtn(id, url) {
  return `<button id="${id}" class="ga-listen-btn"
    onclick="_gaPlay('${url}','${id}')"
    style="display:inline-flex;align-items:center;gap:5px;
           padding:4px 12px;border-radius:20px;border:1px solid #b38b2e;
           background:#fffdf5;color:#7a4d00;font-size:12px;
           cursor:pointer;margin:4px 0;font-family:inherit">
    Listen
  </button>`;
}

// Section-level "Listen" button that plays a queue (thaniyan + pasurams)
export function sectionQueueBtn(id, urls) {
  const json = JSON.stringify(urls).replace(/'/g, "\\'");
  return `<button id="${id}" class="ga-listen-btn"
    onclick="_gaQueue('${json}','${id}')"
    style="display:inline-flex;align-items:center;gap:5px;
           padding:4px 14px;border-radius:20px;border:1.5px solid #b38b2e;
           background:#fffdf5;color:#7a4d00;font-size:12px;font-weight:600;
           cursor:pointer;margin:6px 0;font-family:inherit">
    ▶ Listen
  </button>`;
}

// Pasuram-level inline ▶ button (tiny, next to global_no)
export function inlinePlayBtn(id, url) {
  return `<button id="${id}" class="ga-inline-btn"
    onclick="_gaPlayInline('${url}','${id}')"
    title="Play"
    style="background:none;border:none;color:#b38b2e;
           font-size:13px;cursor:pointer;padding:0 4px;
           vertical-align:middle;line-height:1">▶</button>`;
}