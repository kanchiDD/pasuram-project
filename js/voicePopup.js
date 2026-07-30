/**
 * voicePopup.js
 * Voice Search UI — Naalayira Divya Prabandham
 *
 * Responsibilities:
 *  1. Inject floating mic button into the page
 *  2. Capture voice via Web Speech API (Tamil + English)
 *  3. Show Adiyen popup with matched results as radio options
 *  4. On confirm → call executeVoiceResult()
 *  5. Off-topic / no-match → graceful Adiyen message
 *
 * No external dependencies. Uses only:
 *  - voiceSearch.js  (resolveVoiceQuery, executeVoiceResult)
 *  - Web Speech API  (browser built-in, free)
 */

import { resolveVoiceQuery, executeVoiceResult } from "./voiceSearch.js?v=5";

// ═══════════════════════════════════════════════════════
// STYLES — injected once, scoped to voice UI elements
// ═══════════════════════════════════════════════════════

function injectStyles() {
  if (document.getElementById("voice-popup-styles")) return;

  const style = document.createElement("style");
  style.id = "voice-popup-styles";
  style.textContent = `

    /* ── Floating Mic Button (brushed steel) ── */
    #voice-mic-btn {
      position: fixed;
      bottom: 28px;
      right: 24px;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: linear-gradient(145deg, #f4f6f8 0%, #cfd6dd 38%, #9aa4ad 72%, #6f7880 100%);
      border: 2px solid #b9c2cb;
      box-shadow: 0 4px 14px rgba(0,0,0,0.30),
                  inset 0 2px 3px rgba(255,255,255,0.9),
                  inset 0 -3px 5px rgba(0,0,0,0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9000;
      transition: transform 0.15s, box-shadow 0.15s;
      -webkit-tap-highlight-color: transparent;
      animation: voice-idle-glow 2.6s ease-in-out infinite;
    }

    #voice-mic-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(0,0,0,0.38),
                  inset 0 2px 3px rgba(255,255,255,0.95),
                  inset 0 -3px 5px rgba(0,0,0,0.25);
    }

    #voice-mic-btn.listening {
      background: linear-gradient(145deg, #ffd9d2 0%, #e8705c 45%, #c8402c 100%);
      border-color: #f0a99c;
      animation: voice-pulse 1.2s ease-in-out infinite;
    }

    #voice-mic-btn svg {
      width: 30px;
      height: 30px;
      filter: drop-shadow(0 1px 1px rgba(255,255,255,0.6));
    }

    @keyframes voice-idle-glow {
      0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.30), inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -3px 5px rgba(0,0,0,0.22), 0 0 0 0 rgba(120,150,180,0.45); }
      50%       { box-shadow: 0 4px 14px rgba(0,0,0,0.30), inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -3px 5px rgba(0,0,0,0.22), 0 0 0 9px rgba(120,150,180,0); }
    }

    @keyframes voice-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(200,64,44,0.5); }
      50%       { box-shadow: 0 0 0 16px rgba(200,64,44,0); }
    }

    /* ── Overlay ── */
    #voice-overlay {
      position: fixed;
      inset: 0;
      background: rgba(20, 12, 6, 0.65);
      z-index: 9100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: voice-fade-in 0.18s ease;
    }

    @keyframes voice-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Popup Card ── */
    #voice-popup {
      background: #FFF8ED;
      border: 1.5px solid #C9A84C;
      border-radius: 14px;
      width: 100%;
      max-width: 420px;
      padding: 22px 20px 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: voice-slide-up 0.2s ease;
    }

    @keyframes voice-slide-up {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    /* ── Popup Header ── */
    .vp-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 14px;
    }

    .vp-namaste {
      font-size: 30px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .vp-greeting {
      font-size: 16px;
      font-weight: 700;
      color: #3B2410;
      font-family: serif;
    }

    .vp-subgreeting {
      font-size: 13px;
      color: #7A5C3A;
      margin-top: 3px;
    }

    /* ── Heard Text ── */
    .vp-heard-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9A7A55;
      margin-bottom: 5px;
    }

    .vp-heard-text {
      font-size: 14px;
      color: #3B2410;
      background: #F0E3C8;
      border-radius: 8px;
      padding: 9px 13px;
      margin-bottom: 16px;
      font-style: italic;
      border-left: 3px solid #C9A84C;
    }

    .vp-heard-text.offtopic {
      border-left-color: #C0392B;
      background: #FDE8E4;
      color: #922B21;
    }

    /* ── Do you mean ── */
    .vp-dym-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9A7A55;
      margin-bottom: 9px;
    }

    /* ── Radio Options ── */
    .vp-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .vp-option {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 11px 13px;
      border: 1.5px solid #D4B896;
      border-radius: 9px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      background: #FFFDF7;
    }

    .vp-option:hover {
      border-color: #C9A84C;
      background: #FFF4DC;
    }

    .vp-option.selected {
      border-color: #4A3728;
      background: #FFF0CC;
    }

    .vp-option input[type="radio"] {
      margin-top: 3px;
      accent-color: #4A3728;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    .vp-option-label {
      font-size: 14px;
      font-weight: 600;
      color: #3B2410;
      line-height: 1.3;
    }

    .vp-option-sub {
      font-size: 12px;
      color: #8B6A45;
      margin-top: 3px;
    }

    /* ── Offtopic message ── */
    .vp-offtopic-msg {
      font-size: 14px;
      color: #5D4037;
      line-height: 1.65;
      margin-bottom: 16px;
      padding: 12px;
      background: #FDE8E4;
      border-radius: 8px;
      border-left: 3px solid #C0392B;
    }

    /* ── Action Buttons ── */
    .vp-actions {
      display: flex;
      gap: 10px;
    }

    .vp-btn-search {
      flex: 1;
      padding: 11px;
      border-radius: 8px;
      border: none;
      background: #4A3728;
      color: #F5E6C8;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.03em;
      transition: opacity 0.15s;
    }

    .vp-btn-search:hover { opacity: 0.88; }

    .vp-btn-retry {
      padding: 11px 15px;
      border-radius: 8px;
      border: 1.5px solid #C9A84C;
      background: transparent;
      color: #4A3728;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .vp-btn-retry:hover { background: #FFF0CC; }

    .vp-btn-close {
      width: 100%;
      padding: 11px;
      border-radius: 8px;
      border: 1.5px solid #C9A84C;
      background: transparent;
      color: #4A3728;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .vp-btn-close:hover { background: #FFF0CC; }

    /* ── Listening indicator ── */
    .vp-listening-dots {
      display: flex;
      gap: 5px;
      align-items: center;
      justify-content: center;
      padding: 18px 0 10px;
    }

    .vp-listening-dots span {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #C9A84C;
      animation: vp-dot-bounce 1.2s ease-in-out infinite;
    }

    .vp-listening-dots span:nth-child(2) { animation-delay: 0.2s; }
    .vp-listening-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes vp-dot-bounce {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
      40%           { transform: scale(1.2); opacity: 1; }
    }

    /* ── Rotating lotus (listening / fetching indicator) ── */
    .vp-lotus {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px 0 8px;
    }
    .vp-lotus svg {
      width: 62px;
      height: 62px;
      animation: vp-lotus-spin 3.2s linear infinite;
      transform-origin: 50% 50%;
    }
    .vp-lotus svg .petal { fill: #D9A441; opacity: 0.9; }
    .vp-lotus svg .petal-in { fill: #B8342B; opacity: 0.85; }
    .vp-lotus svg .core { fill: #7A1F1A; }
    @keyframes vp-lotus-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .vp-lotus svg { animation: vp-lotus-pulse 1.8s ease-in-out infinite; }
    }
    @keyframes vp-lotus-pulse {
      0%,100% { opacity: 0.75; transform: scale(0.94); }
      50%     { opacity: 1;    transform: scale(1.04); }
    }

    .vp-listening-text {
      text-align: center;
      font-size: 13px;
      color: #7A5C3A;
      margin-bottom: 14px;
    }

  `;

  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════
// MIC BUTTON — injected into page once
// ═══════════════════════════════════════════════════════

function injectMicButton() {
  if (document.getElementById("voice-mic-btn")) return;

  const btn = document.createElement("button");
  btn.id = "voice-mic-btn";
  btn.title = "Voice Search";
  btn.setAttribute("aria-label", "Voice Search");
  btn.innerHTML = micIcon();
  btn.addEventListener("click", startVoiceSearch);
  document.body.appendChild(btn);
}

function micIcon(active = false) {
  const color = active ? "#7a1d12" : "#2f3a44";
  return `
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="10" height="16" rx="5" fill="${color}"/>
      <path d="M5 14c0 4.97 4.03 9 9 9s9-4.03 9-9"
            stroke="${color}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="14" y1="23" x2="14" y2="27"
            stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="27" x2="18" y2="27"
            stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

// ═══════════════════════════════════════════════════════
// VOICE CAPTURE — Web Speech API
// ═══════════════════════════════════════════════════════

let recognition = null;
let _voiceNetRetries = 0;          // auto-retry counter for transient network drops
const _VOICE_MAX_NET_RETRIES = 2;  // silent auto-retries before showing the network popup

// ═══════════════════════════════════════════════════════
//  Option C voice flow:
//  On tap, run the FREE built-in recognition AND record audio in parallel.
//   • Built-in returns a usable result fast  → use it, drop the recording (free).
//   • Built-in slow (>2.5s) or network-fails → send the already-captured audio
//     to our STT worker silently and use that. No error message — the rotating
//     lotus keeps showing until results are ready.
//  Both paths feed the same resolveVoiceQuery, so matching/closest-list is unchanged.
// ═══════════════════════════════════════════════════════

const STT_ENDPOINT = "https://stt.kanchitrust.workers.dev/transcribe";
const VOICE_FALLBACK_MS = 2500;        // built-in gets this long before STT takes over

let _voiceSession = 0;                 // guards against overlapping taps / late callbacks
let _mediaRecorder = null, _recChunks = [], _recStream = null;

function startVoiceSearch() {
  const session = ++_voiceSession;     // any callback from an older session is ignored
  const micBtn = document.getElementById("voice-mic-btn");

  showListeningPopup();
  micBtn?.classList.add("listening");
  if (micBtn) micBtn.innerHTML = micIcon(true);

  let settled = false;                 // results already shown for this session?
  const finish = (fn) => {             // run once; ignore stale sessions
    if (settled || session !== _voiceSession) return;
    settled = true;
    micBtn?.classList.remove("listening");
    if (micBtn) micBtn.innerHTML = micIcon(false);
    stopRecording();
    fn();
  };

  // Resolve a transcript (or list of alternatives) → show results / off-topic.
  const resolveAndShow = async (alternatives) => {
    const alts = (Array.isArray(alternatives) ? alternatives : [alternatives]).filter(Boolean);
    let results = [], usedTranscript = alts[0] || "";
    for (const alt of alts) {
      results = await resolveVoiceQuery(alt);
      if (results.length > 0) { usedTranscript = alt; break; }
    }
    finish(() => {
      if (results.length === 0) showOffTopicPopup(usedTranscript || "(no match)");
      else showResultsPopupWithStore(usedTranscript, results);
    });
  };

  // ── Start recording immediately (so audio is ready if STT is needed) ──
  startRecording();

  // ── Fallback: after the timeout, transcribe the captured audio via STT ──
  const fallbackTimer = setTimeout(() => { runSttFallback(session, resolveAndShow, finish); }, VOICE_FALLBACK_MS);

  // ── Primary: the free built-in recognition ──
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // No built-in (e.g. iOS Safari) → go straight to STT; keep the lotus up.
    clearTimeout(fallbackTimer);
    runSttFallback(session, resolveAndShow, finish);
    return;
  }

  if (recognition) { try { recognition.abort(); } catch (e) {} }
  recognition = new SpeechRecognition();
  recognition.lang = "ta-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  recognition.continuous = false;

  recognition.onresult = function(event) {
    if (session !== _voiceSession || settled) return;
    clearTimeout(fallbackTimer);
    const alternatives = [];
    for (let i = 0; i < event.results[0].length; i++) alternatives.push(event.results[0][i].transcript);
    resolveAndShow(alternatives);      // free path won — recording dropped in finish()
  };

  recognition.onerror = function(event) {
    if (session !== _voiceSession || settled) return;
    const err = event.error;
    // Network failure on weak SIM → fall straight to STT, silently, no message.
    if (err === "network" || err === "service-not-allowed") {
      clearTimeout(fallbackTimer);
      runSttFallback(session, resolveAndShow, finish);
      return;
    }
    if (err === "not-allowed") { clearTimeout(fallbackTimer); finish(() => showPermissionPopup()); return; }
    if (err === "aborted") { return; }   // superseded by a newer tap — ignore
    // no-speech / audio-capture / unknown → let the STT fallback try the audio
    // we captured; if that also yields nothing, the off-topic message shows.
  };

  recognition.onend = function() { /* handled by onresult/onerror/timer */ };

  try { recognition.start(); }
  catch (e) { clearTimeout(fallbackTimer); runSttFallback(session, resolveAndShow, finish); }
}

// ── STT fallback: send the captured audio to the worker, resolve the result ──
async function runSttFallback(session, resolveAndShow, finish) {
  if (session !== _voiceSession) return;
  try { if (recognition) recognition.abort(); } catch (e) {}

  const blob = await stopRecording();    // finalise the recording, get the clip
  if (session !== _voiceSession) return;

  // Empty/near-silent clip (accidental tap) → don't spend an STT call.
  if (!blob || blob.size < 1200) { finish(() => showOffTopicPopup("(no speech detected)")); return; }

  let b64;
  try { b64 = await blobToBase64(blob); }
  catch (e) { finish(() => showOffTopicPopup("(no match)")); return; }

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
    if (!alts.length) { finish(() => showOffTopicPopup("(no match)")); return; }
    resolveAndShow(alts);
  } catch (e) {
    // Even the STT couldn't be reached — no scary error; offer a gentle retry.
    finish(() => showNetworkPopup());
  }
}

// POST to the STT worker with a timeout + one retry (mobile-resilient).
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

// ── Recording helpers (MediaRecorder + auto-stop on silence) ──
function startRecording() {
  _recChunks = [];
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    if (!recognition && _voiceSession === 0) { stream.getTracks().forEach(t => t.stop()); return; }
    _recStream = stream;
    let mime = "audio/webm;codecs=opus";
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
           : MediaRecorder.isTypeSupported("audio/mp4")  ? "audio/mp4" : "";
    }
    try {
      _mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) { _mediaRecorder = new MediaRecorder(stream); }
    _mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) _recChunks.push(e.data); };
    _mediaRecorder.start();
  }).catch(() => { /* mic denied — built-in path may still work; STT will no-op */ });
}

function stopRecording() {
  return new Promise(resolve => {
    const stream = _recStream;
    const cleanup = () => { if (stream) stream.getTracks().forEach(t => t.stop()); _recStream = null; };
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

// ═══════════════════════════════════════════════════════
// POPUP STATES
// ═══════════════════════════════════════════════════════

function showListeningPopup() {
  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen</div>
        <div class="vp-subgreeting">You are being heard…</div>
      </div>
    </div>
    <div class="vp-lotus">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g>
          <path class="petal" d="M50 8 C58 26 58 40 50 52 C42 40 42 26 50 8Z"/>
          <path class="petal" d="M92 50 C74 58 60 58 48 50 C60 42 74 42 92 50Z"/>
          <path class="petal" d="M50 92 C42 74 42 60 50 48 C58 60 58 74 50 92Z"/>
          <path class="petal" d="M8 50 C26 58 40 58 52 50 C40 42 26 42 8 50Z"/>
          <path class="petal-in" d="M79 21 C68 34 58 40 49 42 C51 33 57 23 79 21Z"/>
          <path class="petal-in" d="M79 79 C66 68 60 58 58 49 C67 51 77 57 79 79Z"/>
          <path class="petal-in" d="M21 79 C32 66 42 60 51 58 C49 67 43 77 21 79Z"/>
          <path class="petal-in" d="M21 21 C34 32 40 42 42 51 C33 49 23 43 21 21Z"/>
          <circle class="core" cx="50" cy="50" r="8"/>
        </g>
      </svg>
    </div>
    <div class="vp-listening-text">
      One moment, adiyen is finding it for you…
    </div>
    <div class="vp-actions">
      <button class="vp-btn-close" onclick="window._voicePopupClose()">
        Cancel
      </button>
    </div>
  `);
}

function showResultsPopup(transcript, results) {

  let optionsHtml = "";
  results.forEach((r, i) => {
    optionsHtml += `
      <label class="vp-option" id="vp-opt-${i}"
             onclick="window._voiceSelectOpt(${i})">
        <input type="radio" name="vp-choice" value="${i}" />
        <div>
          <div class="vp-option-label">${r.label}</div>
          <div class="vp-option-sub">${r.sublabel}</div>
        </div>
      </label>
    `;
  });

  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen</div>
        <div class="vp-subgreeting">We heard you</div>
      </div>
    </div>

    <div class="vp-heard-label">You said</div>
    <div class="vp-heard-text">"${escHtml(transcript)}"</div>

    <div class="vp-dym-label">Do you mean…</div>
    <div class="vp-options">${optionsHtml}</div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="window._voiceRetry()">
        🎙 Try again
      </button>
      <button class="vp-btn-search" onclick="window._voiceConfirm()">
        Search
      </button>
    </div>
  `);

  // Auto-select first option
  window._voiceSelectOpt(0);
}

function showOffTopicPopup(transcript) {

  const isNoSpeech = transcript.startsWith("(");

  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen</div>
        <div class="vp-subgreeting">We heard you</div>
      </div>
    </div>

    ${!isNoSpeech ? `
      <div class="vp-heard-label">You said</div>
      <div class="vp-heard-text offtopic">"${escHtml(transcript)}"</div>
    ` : ""}

    <div class="vp-offtopic-msg">
      Adiyen, kindly search for topics related to<br/>
      <strong>Naalayira Divya Prabandham</strong> —
      pasurams, azhwars, divyadesams,<br/>
      thaniyans, and related sacred works.
    </div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="window._voiceRetry()">
        🎙 Try again
      </button>
      <button class="vp-btn-close" onclick="window._voicePopupClose()">
        Close
      </button>
    </div>
  `);
}

function showPermissionPopup() {
  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen</div>
      </div>
    </div>
    <div class="vp-offtopic-msg">
      Please allow microphone access in your browser
      to use voice search.
    </div>
    <button class="vp-btn-close" onclick="window._voicePopupClose()">
      Close
    </button>
  `);
}

// Shown when recognition fails for a network reason (common on mobile SIM,
// since Android sends the audio to Google's servers) or an unknown error.
function showNetworkPopup(kind) {
  const msg = kind === "mic"
    ? "Adiyen, I couldn't reach your microphone. Please check it isn't in use by another app, and try again."
    : "Adiyen, the voice service couldn't be reached — the network seems weak just now. Please try again in a moment. 🙏";
  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen</div>
        <div class="vp-subgreeting">Voice search</div>
      </div>
    </div>
    <div class="vp-offtopic-msg">${msg}</div>
    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="window._voiceRetry()">
        🎙 Try again
      </button>
      <button class="vp-btn-close" onclick="window._voicePopupClose()">
        Close
      </button>
    </div>
  `);
}

function showNoSupportPopup() {
  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen</div>
      </div>
    </div>
    <div class="vp-offtopic-msg">
      Voice search works best in Chrome browser.
      Please open this page in Chrome to use voice search.
    </div>
    <button class="vp-btn-close" onclick="window._voicePopupClose()">
      Close
    </button>
  `);
}

// ═══════════════════════════════════════════════════════
// OVERLAY HELPERS
// ═══════════════════════════════════════════════════════

function showOverlay(innerHtml) {
  closeOverlay(); // remove any existing

  const overlay = document.createElement("div");
  overlay.id = "voice-overlay";

  const popup = document.createElement("div");
  popup.id = "voice-popup";
  popup.innerHTML = innerHtml;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) window._voicePopupClose();
  });
}

function closeOverlay() {
  const existing = document.getElementById("voice-overlay");
  if (existing) existing.remove();
}

// ═══════════════════════════════════════════════════════
// WINDOW HANDLERS — called from inline onclick
// ═══════════════════════════════════════════════════════

let _selectedIndex = 0;
let _currentResults = [];

window._voiceSelectOpt = function(index) {
  _selectedIndex = index;
  document.querySelectorAll(".vp-option").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
    const radio = el.querySelector("input[type=radio]");
    if (radio) radio.checked = (i === index);
  });
};

window._voiceConfirm = function() {
  const result = _currentResults[_selectedIndex];
  if (!result) return;
  closeOverlay();
  executeVoiceResult(result);
};

window._voiceRetry = function() {
  closeOverlay();
  startVoiceSearch();
};

window._voicePopupClose = function() {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
  closeOverlay();
};

function showResultsPopupWithStore(transcript, results) {
  _currentResults = results;
  _selectedIndex = 0;
  showResultsPopup(transcript, results);
}

// ═══════════════════════════════════════════════════════
// HTML ESCAPE
// ═══════════════════════════════════════════════════════

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════
// INIT — call once from your entry point
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// AUTO INIT — runs when module is imported
// ═══════════════════════════════════════════════════════
injectStyles();
injectMicButton();

// Named export for manual re-init if needed
export function initVoiceSearch() {
  injectStyles();
  injectMicButton();
}