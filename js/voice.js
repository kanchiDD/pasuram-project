/**
 * voice.js
 * Voice Search Controller — voice.html
 *
 * Responsibilities:
 *  1. Capture voice via Web Speech API
 *  2. Resolve transcript → tree destination (via voiceSearch.js)
 *  3. Show Adiyen popup with radio options
 *  4. On confirm → store in sessionStorage → navigate to tree.html
 *
 * Handoff contract (sessionStorage key: "voiceNav"):
 * {
 *   fn   : string   — function name to call in tree
 *   args : array    — arguments
 *   label: string   — for display/debug
 * }
 */

import { resolveVoiceQuery as _resolveBase, resolveVoiceQueryExtended as _resolveExtended } from "./voiceSearch.js?v=6";
import { t as uiText } from "./utils/uiStrings.js";
import { translitLive, hasTamil, activeScript } from "./utils/translitLive.js";
import { playSectionAudio, playPasuramAudio, playThirumozhiAudio, playStandaloneAudio, playPathuAudio } from "./render/voicePlay.js?v=2";

// Use extended if available, fall back to base
async function resolveVoiceQuery(transcript) {
  try {
    if (typeof _resolveExtended === "function") {
      return await _resolveExtended(transcript);
    }
  } catch(e) {
    console.warn("[Voice] extended resolver failed, using base:", e);
  }
  return await _resolveBase(transcript);
}

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

let recognition   = null;
let _results      = [];
let _selectedIdx  = 0;

// ── STT fallback (mobile SIM) — records in parallel, falls back silently ──
const STT_ENDPOINT      = "https://stt.kanchitrust.workers.dev/transcribe";
const VOICE_FALLBACK_MS = 2500;
let _voiceSession = 0;
let _mediaRecorder = null, _recChunks = [], _recStream = null;
let _recAudioCtx = null, _recSpokeYet = false, _recSilentSince = 0;

// ═══════════════════════════════════════════════════════
// VOICE CAPTURE
// ═══════════════════════════════════════════════════════

window.startVoiceSearch = function () {

  const session = ++_voiceSession;
  showListening();
  setMicState(true);

  let settled = false;
  const finish = (fn) => {
    if (settled || session !== _voiceSession) return;
    settled = true;
    setMicState(false);
    stopRecording();
    fn();
  };

  // Resolve a transcript (or alternatives) → show results / off-topic.
  const resolveAndShow = async (alternatives) => {
    const alts = (Array.isArray(alternatives) ? alternatives : [alternatives]).filter(Boolean);
    let results = [], usedTranscript = alts[0] || "";
    for (const alt of alts) {
      try { results = await resolveVoiceQuery(alt); }
      catch (e) { results = []; }
      if (results.length > 0) { usedTranscript = alt; break; }
    }
    finish(() => {
      if (results.length === 0) showOffTopic(usedTranscript || "(no match)");
      else showResults(usedTranscript, results);
    });
  };

  // ── Single path, every device: record → wait until you actually finish
  //    speaking (real 1.2s pause) → send to STT. This gives consistent,
  //    generous timing on laptop and mobile alike — no built-in recognition
  //    cutting you off early. iPhone works too (no built-in dependency).
  startRecording();
  runSttFallback(session, resolveAndShow, finish);
};

// ── STT fallback: send captured audio to the worker, resolve the result ──
async function runSttFallback(session, resolveAndShow, finish) {
  if (session !== _voiceSession) return;
  try { if (recognition) recognition.abort(); } catch (e) {}

  // Wait until the speaker has actually finished (real pause), so multi-word
  // queries with small between-word gaps are captured in full, not cut short.
  await waitForSpeechEnd();
  if (session !== _voiceSession) return;

  const blob = await stopRecording();
  if (session !== _voiceSession) return;
  if (!blob) { finish(() => showOffTopic("(no speech detected)")); return; }
  if (blob.size < 1200) { finish(() => showOffTopic("(no speech detected)")); return; }

  let b64;
  try { b64 = await blobToBase64(blob); }
  catch (e) { finish(() => showOffTopic("(no match)")); return; }

  try {
    const data = await sttFetch(STT_ENDPOINT, {
      audio: b64,
      encoding: blob.type.includes("mp4") ? "MP4" : "WEBM_OPUS",
      sampleRateHertz: 48000,
      lang: "ta-IN"
    });
    if (session !== _voiceSession) return;
    const alts = (data.alternatives && data.alternatives.length)
      ? data.alternatives
      : (data.transcript ? [data.transcript] : []);
    if (!alts.length) { finish(() => showOffTopic("(no match)")); return; }
    resolveAndShow(alts);
  } catch (e) {
    finish(() => showOffTopic("(could not reach voice service — please try again)"));
  }
}

async function sttFetch(url, payload, { timeout = 9000, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) { clearTimeout(t); lastErr = e; }
  }
  throw lastErr || new Error("stt failed");
}

function startRecording() {
  _recChunks = [];
  _recSpokeYet = false;
  _recSilentSince = 0;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    _recStream = stream;
    let mime = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
           : MediaRecorder.isTypeSupported("audio/mp4")  ? "audio/mp4" : "";
    }
    try { _mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
    catch (e) { _mediaRecorder = new MediaRecorder(stream); }
    _mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) _recChunks.push(e.data); };
    _mediaRecorder.start();
    _setupSilenceMeter(stream);   // start measuring so we can detect a real pause
  }).catch(() => { /* mic denied — built-in may still work; STT will no-op */ });
}

// Continuously measure mic loudness so runSttFallback can wait for a genuine
// end-of-phrase pause (not a between-word gap) before sending to STT.
function _setupSilenceMeter(stream) {
  try {
    _recAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = _recAudioCtx.createMediaStreamSource(stream);
    const analyser = _recAudioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      if (!_recStream) return;                 // recording ended
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (rms > 0.030) {                        // speaking
        _recSpokeYet = true;
        _recSilentSince = 0;
      } else if (_recSpokeYet) {                // quiet after having spoken
        if (!_recSilentSince) _recSilentSince = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch (e) { /* meter optional; hard cap still applies downstream */ }
}

// How long a silence counts as end-of-phrase (ms). Between-word gaps are
// shorter than this, so multi-word queries with small gaps aren't cut off.
const REC_END_SILENCE_MS = 1200;
const REC_HARD_CAP_MS    = 10000;   // never record longer than this

// Wait until the speaker has clearly finished (a real pause) or the hard cap.
function waitForSpeechEnd() {
  return new Promise(resolve => {
    const t0 = performance.now();
    const check = () => {
      const now = performance.now();
      if (now - t0 > REC_HARD_CAP_MS) return resolve();            // safety cap
      if (_recSpokeYet && _recSilentSince && (now - _recSilentSince) > REC_END_SILENCE_MS) return resolve();
      setTimeout(check, 100);
    };
    check();
  });
}

function stopRecording() {
  return new Promise(resolve => {
    const stream = _recStream;
    const cleanup = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      _recStream = null;
      if (_recAudioCtx) { try { _recAudioCtx.close(); } catch (e) {} _recAudioCtx = null; }
    };
    if (_mediaRecorder && _mediaRecorder.state !== "inactive") {
      _mediaRecorder.onstop = () => {
        const type = _recChunks[0]?.type || "audio/webm";
        const blob = _recChunks.length ? new Blob(_recChunks, { type }) : null;
        _mediaRecorder = null; cleanup(); resolve(blob);
      };
      try { _mediaRecorder.stop(); } catch (e) { _mediaRecorder = null; cleanup(); resolve(null); }
    } else {
      const blob = _recChunks.length ? new Blob(_recChunks, { type: _recChunks[0]?.type || "audio/webm" }) : null;
      cleanup(); resolve(blob);
    }
  });
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// Demo chips — simulate a voice result without mic
window.runDemo = async function (transcript) {
  try {
    const results = await resolveVoiceQuery(transcript);
    if (results.length === 0) {
      showOffTopic(transcript);
    } else {
      showResults(transcript, results);
    }
  } catch(e) {
    console.error("[Voice] runDemo error:", e);
    showOffTopic(transcript);
  }
};

// ═══════════════════════════════════════════════════════
// SCRIPT PICKER
// ═══════════════════════════════════════════════════════
// voice.html is a standalone page and does not load scriptBanner.js (which
// pulls in api.js). The picker is built here instead, in the module the page
// already imports. Choosing a script only changes what is DISPLAYED — the
// recogniser stays ta-IN, because the words being spoken are Tamil whatever
// script they are read in.

function injectScriptBanner() {
  if (document.getElementById("script-banner")) return;
  const LIST = [
    { code: "ta",   label: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd",                     name: "Tamil" },
    { code: "te",   label: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41",              name: "Telugu" },
    { code: "kn",   label: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1",                     name: "Kannada" },
    { code: "ml",   label: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02",              name: "Malayalam" },
    { code: "deva", label: "\u0926\u0947\u0935\u0928\u093e\u0917\u0930\u0940", name: "Devanagari" },
    { code: "iast", label: "Roman",                                                  name: "Roman (IAST)" },
  ];
  const current = activeScript() || "ta";
  const bar = document.createElement("div");
  bar.id = "script-banner";
  bar.style.cssText = "background:#fff8e6;border-bottom:1px solid #e8d8a0;padding:7px 10px;"
    + "text-align:center;font-family:Arial,sans-serif;display:flex;align-items:center;"
    + "justify-content:center;gap:6px;flex-wrap:wrap;";
  const lbl = document.createElement("span");
  lbl.textContent = "Read in:";
  lbl.style.cssText = "font-size:12px;color:#8a7a5a;margin-right:2px";
  bar.appendChild(lbl);
  for (const s of LIST) {
    const b = document.createElement("button");
    b.textContent = s.label; b.title = s.name;
    const on = s.code === current;
    b.style.cssText = "border:1px solid " + (on ? "#2f7d32" : "#d8c48a")
      + ";background:" + (on ? "#2f7d32" : "#fff")
      + ";color:" + (on ? "#fff" : "#4a3728")
      + ";border-radius:14px;padding:4px 12px;font-size:13px;cursor:pointer;font-weight:"
      + (on ? "700" : "500") + ";";
    b.addEventListener("click", () => {
      if (s.code === current) return;
      try {
        if (s.code === "ta") localStorage.removeItem("script");
        else localStorage.setItem("script", s.code);
      } catch (e) {}
      location.reload();
    });
    bar.appendChild(b);
  }
  const stage = document.getElementById("voice-stage");
  if (stage && stage.parentNode) stage.parentNode.insertBefore(bar, stage);
  else document.body.insertBefore(bar, document.body.firstChild);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectScriptBanner);
} else {
  injectScriptBanner();
}

// ═══════════════════════════════════════════════════════
// MIC BUTTON STATE
// ═══════════════════════════════════════════════════════

function setMicState(listening) {
  const btn = document.getElementById("mic-btn");
  if (!btn) return;
  btn.classList.toggle("listening", listening);
}

// ═══════════════════════════════════════════════════════
// POPUP STATES
// ═══════════════════════════════════════════════════════

function showListening() {
  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">${uiText("voiceListening")}</div>
      </div>
    </div>
    <div class="vp-dots">
      <span></span><span></span><span></span>
    </div>
    <div class="vp-listen-text">
      தேவரீர் திருவாக்கினை கேட்கிறோம்…
    </div>
    <div class="vp-actions">
      <button class="vp-btn-close" onclick="cancelVoice()">${uiText("cancel")}</button>
    </div>
  `);
}

// ── Canonicalize the reverent recital command for DISPLAY only ──
// The user always means "சாதித்தருளாய்" (the canonical Vaishnava recital
// term), but speech-to-text mangles it ("சாதித் தொழிலாய்", "சாதித்தாய்",
// "play", …). For the "You said" box we keep the actual content words the
// user searched and replace only the recital command with சாதித்தருளாய்.
// If no recital word is present (a plain text search), the transcript is
// returned unchanged. This is purely cosmetic — it does not affect matching.
function _normJoinLite(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\u0B80-\u0BFF]/g, "").replace(/்/g, "");
}
function _editDist(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}
function canonicalizeRecitalWord(transcript) {
  const raw = (transcript || "").trim();
  if (!raw) return raw;
  const CANON  = "சாதித்தருளாய்";
  const target = _normJoinLite(CANON);
  // Tail fragments STT emits when it splits சாதித்தருளாய் in two
  // (e.g. "சாதித்" + "தருளாய்"). We ONLY drop such a tail when the word
  // right before it was itself a சாதி-fragment — that adjacency is the
  // signature of the recital command. A standalone அருளாய் ("bless"),
  // which is common devotional content, is never stripped on its own.
  const TAILS = new Set(["தருளாய", "அருளாய", "தொழிலாய"]);
  const isRecitalHead = wj =>
    wj.startsWith("சாதி") || (wj.length >= 4 && _editDist(wj, target) <= 3);

  const words = raw.split(/\s+/);
  let hadPlay = false;
  const kept = [];
  let prevWasRecital = false;
  for (const w of words) {
    const wl = w.toLowerCase();
    const wj = _normJoinLite(w);
    if (wl === "play" || wl === "பிளே") { hadPlay = true; prevWasRecital = true; continue; }
    if (isRecitalHead(wj)) { hadPlay = true; prevWasRecital = true; continue; }
    // Trailing recital fragment — drop ONLY if it directly follows a
    // recital head (so content அருளாய் elsewhere is preserved).
    if (prevWasRecital && TAILS.has(wj)) { hadPlay = true; continue; }
    kept.push(w);
    prevWasRecital = false;
  }
  if (!hadPlay) return raw;                     // plain search — leave as-is
  const content = kept.join(" ").trim();
  return content ? `${content} ${CANON}` : CANON;
}

// The "You said" box. What was heard is always Tamil — the recogniser runs
// in ta-IN whatever script the reader uses, because the words being spoken
// are Tamil. So the echo is transliterated for display, and the Tamil is
// kept underneath: the reader sees their own script, and can still check
// what the microphone actually caught.
// Option labels and sublabels come from voiceSearch.js, where the Tamil is
// also the matcher's search key — so it is converted here, at the moment of
// display, and left alone at the source. English inside a label ("Koil
// Thirumozhi") passes through untouched, so mixed labels convert only their
// Tamil half.
function disp(text) {
  return translitLive(text == null ? "" : text, activeScript());
}

function heardBox(text, cls) {
  const sc = activeScript();
  const shown = translitLive(text, sc);
  const showOriginal = sc && hasTamil(text) && shown !== text;
  return `
    <div class="vp-heard-label">${uiText("voiceYouSaid")}</div>
    <div class="vp-heard-text${cls ? " " + cls : ""}">"${esc(shown)}"${
      showOriginal
        ? `<div class="vp-heard-orig">${esc(text)}</div>`
        : ""
    }</div>`;
}

function showResults(transcript, results) {

  // A single "notice" result (e.g. out-of-range ordinal) → message card, not
  // a selectable option. Carries a polite Adiyen message from the resolver.
  if (results.length === 1 && results[0] && results[0].info) {
    showNotice(transcript, results[0].message || results[0].label);
    return;
  }

  _results     = results;
  _selectedIdx = 0;

  // Show the canonical recital word in the "You said" box (display only).
  const displayTranscript = canonicalizeRecitalWord(transcript);

  let optionsHtml = "";
  results.forEach((r, i) => {
    optionsHtml += `
      <label class="vp-option${i === 0 ? " selected" : ""}"
             id="vp-opt-${i}"
             onclick="selectOpt(${i})">
        <input type="radio" name="vp-choice"
               ${i === 0 ? "checked" : ""} />
        <div>
          <div class="vp-opt-label">${esc(disp(r.label))}</div>
          <div class="vp-opt-sub">${esc(disp(r.sublabel))}</div>
        </div>
      </label>
    `;
  });

  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">${uiText("voiceWeHeard")}</div>
      </div>
    </div>

    ${heardBox(displayTranscript)}

    <div class="vp-dym-label">${uiText("voiceDoYouMean")}</div>
    <div class="vp-options">${optionsHtml}</div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="retryVoice()">🎙 Try again</button>
      <button class="vp-btn-search" onclick="confirmSearch()">${uiText("search")}</button>
    </div>
  `);
}

function showOffTopic(transcript) {

  const noSpeech = transcript.startsWith("(");

  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">${uiText("voiceWeHeard")}</div>
      </div>
    </div>

    ${ !noSpeech ? `
      ${heardBox(transcript, "offtopic")}
    ` : "" }

    <div class="vp-offtopic-msg">
      Adiyen, kindly search for topics related to<br/>
      <strong>${esc(disp("நாலாயிர திவ்யப்பிரபந்தம்"))}</strong> —
      pasurams, azhwars, divyadesams,<br/>
      thaniyans, and related sacred works.
    </div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="retryVoice()">🎙 Try again</button>
      <button class="vp-btn-close" onclick="closePopup()">${uiText("close")}</button>
    </div>
  `);
}

function showNotice(transcript, message) {
  const displayTranscript = canonicalizeRecitalWord(transcript);
  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">${uiText("voiceWeHeard")}</div>
      </div>
    </div>

    ${heardBox(displayTranscript, "offtopic")}

    <div class="vp-offtopic-msg">${esc(disp(message))}</div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="retryVoice()">🎙 Try again</button>
      <button class="vp-btn-close" onclick="closePopup()">${uiText("close")}</button>
    </div>
  `);
}

function showPermissionError() {
  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div><div class="vp-greeting">Adiyen — நமஸ்காரம்</div></div>
    </div>
    <div class="vp-offtopic-msg">
      Please allow microphone access in your browser
      to use voice search.
    </div>
    <button class="vp-btn-close" onclick="closePopup()">${uiText("close")}</button>
  `);
}

function showNoSupport() {
  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div><div class="vp-greeting">Adiyen — நமஸ்காரம்</div></div>
    </div>
    <div class="vp-offtopic-msg">
      Voice search works best in Chrome browser.<br/>
      Please open this page in Chrome to use voice search.
    </div>
    <button class="vp-btn-close" onclick="closePopup()">${uiText("close")}</button>
  `);
}

// ═══════════════════════════════════════════════════════
// POPUP HELPERS
// ═══════════════════════════════════════════════════════

function setPopup(html) {
  const popup   = document.getElementById("voice-popup");
  const overlay = document.getElementById("voice-overlay");
  if (!popup || !overlay) return;
  popup.innerHTML = html;
  overlay.classList.add("active");
}

function closePopup() {
  const overlay = document.getElementById("voice-overlay");
  if (overlay) overlay.classList.remove("active");
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }
}
// Expose to window — voice.html inline onclick handlers need this
window.closePopup = closePopup;

// Close on backdrop click
document.getElementById("voice-overlay")?.addEventListener("click", function (e) {
  if (e.target === this) closePopup();
});

// ═══════════════════════════════════════════════════════
// RADIO SELECTION
// ═══════════════════════════════════════════════════════

window.selectOpt = function (index) {
  _selectedIdx = index;
  document.querySelectorAll(".vp-option").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
    const radio = el.querySelector("input[type=radio]");
    if (radio) radio.checked = (i === index);
  });
};

// ═══════════════════════════════════════════════════════
// CONFIRM → HANDOFF TO TREE
// ═══════════════════════════════════════════════════════

window.confirmSearch = function () {

  const result = _results[_selectedIdx];
  if (!result) return;

  // Notice card (out-of-range ordinal etc.) — nothing to open, just close.
  if (result.info || result.fn === "_voiceInfo") { closePopup(); return; }

  // ── PLAY intents stay on the voice screen ──
  // Audio playback (from "… சாதித்தருளாய்" / "play …") plays right here
  // via the shared voicePlay.js module — no jump to tree.html into an
  // otherwise-empty page. Text-navigation intents still hand off to the
  // tree (below). The floating audio bar + seek control appear in place.
  if (result.fn === "_playSection") {
    const [sectionId, sectionName] = result.args || [];
    closePopup();
    playSectionAudio(sectionId, sectionName);
    return;
  }
  if (result.fn === "_playPasuram") {
    const [globalNo] = result.args || [];
    closePopup();
    playPasuramAudio(globalNo);
    return;
  }
  if (result.fn === "_playThirumozhi") {
    const [sectionId, sectionName, pathuNum, heading] = result.args || [];
    closePopup();
    playThirumozhiAudio(sectionId, sectionName, pathuNum, heading);
    return;
  }
  if (result.fn === "_playStandalone") {
    const [sectionId, sectionName, pathuNum] = result.args || [];
    closePopup();
    playStandaloneAudio(sectionId, sectionName, pathuNum);
    return;
  }
  if (result.fn === "_playPathu") {
    const [sectionId, sectionName, pathuNum] = result.args || [];
    closePopup();
    playPathuAudio(sectionId, sectionName, pathuNum);
    return;
  }

  // ── Text navigation → hand off to tree.html (unchanged) ──
  sessionStorage.setItem("voiceNav", JSON.stringify({
    fn    : result.fn,
    args  : result.args,
    label : result.label
  }));

  window.location.href = "tree.html";
};

// ═══════════════════════════════════════════════════════
// RETRY / CANCEL
// ═══════════════════════════════════════════════════════

window.retryVoice = function () {
  closePopup();
  // small delay so popup closes cleanly before mic opens
  setTimeout(() => window.startVoiceSearch(), 150);
};

window.cancelVoice = function () {
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }
  closePopup();
};

// ═══════════════════════════════════════════════════════
// HTML ESCAPE
// ═══════════════════════════════════════════════════════

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}