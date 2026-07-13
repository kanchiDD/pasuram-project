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

import { resolveVoiceQuery, executeVoiceResult } from "./voiceSearch.js";

// ═══════════════════════════════════════════════════════
// STYLES — injected once, scoped to voice UI elements
// ═══════════════════════════════════════════════════════

function injectStyles() {
  if (document.getElementById("voice-popup-styles")) return;

  const style = document.createElement("style");
  style.id = "voice-popup-styles";
  style.textContent = `

    /* ── Floating Mic Button ── */
    #voice-mic-btn {
      position: fixed;
      bottom: 28px;
      right: 24px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FF9128 0%, #F2601A 55%, #DA3F17 100%);
      border: 3px solid #FFD86B;
      box-shadow: 0 6px 20px rgba(216,67,26,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9000;
      transition: transform 0.15s, box-shadow 0.15s;
      -webkit-tap-highlight-color: transparent;
      animation: voice-idle-glow 2.4s ease-in-out infinite;
    }

    #voice-mic-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 8px 26px rgba(216,67,26,0.6);
    }

    #voice-mic-btn.listening {
      background: linear-gradient(135deg, #E8351E 0%, #B01E12 100%);
      border-color: #FFE39A;
      animation: voice-pulse 1.2s ease-in-out infinite;
    }

    #voice-mic-btn svg {
      width: 30px;
      height: 30px;
    }

    @keyframes voice-idle-glow {
      0%, 100% { box-shadow: 0 6px 20px rgba(216,67,26,0.5), 0 0 0 0 rgba(255,150,60,0.55); }
      50%       { box-shadow: 0 6px 20px rgba(216,67,26,0.5), 0 0 0 11px rgba(255,150,60,0); }
    }

    @keyframes voice-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(230,53,30,0.5); }
      50%       { box-shadow: 0 0 0 16px rgba(230,53,30,0); }
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
  const color = active ? "#FFFFFF" : "#FFFFFF";
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

function startVoiceSearch() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showNoSupportPopup();
    return;
  }

  // Stop any running recognition
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ta-IN";          // Tamil primary
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;     // get top 3 alternatives
  recognition.continuous = false;

  const micBtn = document.getElementById("voice-mic-btn");

  // Show listening popup
  showListeningPopup();
  micBtn?.classList.add("listening");
  micBtn.innerHTML = micIcon(true);

  recognition.onresult = async function(event) {

    micBtn?.classList.remove("listening");
    micBtn.innerHTML = micIcon(false);

    // Collect all alternatives, try each
    const alternatives = [];
    for (let i = 0; i < event.results[0].length; i++) {
      alternatives.push(event.results[0][i].transcript);
    }

    // Try each alternative until we get results
    let results = [];
    let usedTranscript = alternatives[0];

    for (const alt of alternatives) {
      results = await resolveVoiceQuery(alt);
      if (results.length > 0) {
        usedTranscript = alt;
        break;
      }
    }

    if (results.length === 0) {
      showOffTopicPopup(usedTranscript);
    } else {
      showResultsPopupWithStore(usedTranscript, results);
    }
  };

  recognition.onerror = function(event) {
    micBtn?.classList.remove("listening");
    micBtn.innerHTML = micIcon(false);
    closeOverlay();

    if (event.error === "no-speech") {
      showOffTopicPopup("(no speech detected)");
    } else if (event.error === "not-allowed") {
      showPermissionPopup();
    }
  };

  recognition.onend = function() {
    micBtn?.classList.remove("listening");
    micBtn.innerHTML = micIcon(false);
  };

  recognition.start();
}

// ═══════════════════════════════════════════════════════
// POPUP STATES
// ═══════════════════════════════════════════════════════

function showListeningPopup() {
  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">Listening… speak in Tamil or English</div>
      </div>
    </div>
    <div class="vp-listening-dots">
      <span></span><span></span><span></span>
    </div>
    <div class="vp-listening-text">
      We are Hearing you pl proceed…
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
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
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
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">We heard you</div>
      </div>
    </div>

    ${!isNoSpeech ? `
      <div class="vp-heard-label">You said</div>
      <div class="vp-heard-text offtopic">"${escHtml(transcript)}"</div>
    ` : ""}

    <div class="vp-offtopic-msg">
      Adiyen, kindly search for topics related to<br/>
      <strong>நாலாயிர திவ்யப்பிரபந்தம்</strong> —
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
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
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

function showNoSupportPopup() {
  showOverlay(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
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