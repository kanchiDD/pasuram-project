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

import { resolveVoiceQuery } from "./voiceSearch.js";

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

let recognition   = null;
let _results      = [];
let _selectedIdx  = 0;

// ═══════════════════════════════════════════════════════
// VOICE CAPTURE
// ═══════════════════════════════════════════════════════

window.startVoiceSearch = function () {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showNoSupport();
    return;
  }

  // Stop any existing session
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
    recognition = null;
  }

  recognition = new SpeechRecognition();
  recognition.lang            = "ta-IN";   // Tamil primary
  recognition.interimResults  = false;
  recognition.maxAlternatives = 3;
  recognition.continuous      = false;

  showListening();
  setMicState(true);

  // ── Result received ──────────────────────────────
  recognition.onresult = async function (event) {

    setMicState(false);

    // Collect all speech alternatives
    const alternatives = [];
    for (let i = 0; i < event.results[0].length; i++) {
      alternatives.push(event.results[0][i].transcript);
    }

    // Try each alternative until we get a match
    let results       = [];
    let usedTranscript = alternatives[0];

    for (const alt of alternatives) {
      results = await resolveVoiceQuery(alt);
      if (results.length > 0) {
        usedTranscript = alt;
        break;
      }
    }

    if (results.length === 0) {
      showOffTopic(usedTranscript);
    } else {
      showResults(usedTranscript, results);
    }
  };

  // ── Error handling ───────────────────────────────
  recognition.onerror = function (event) {
    setMicState(false);
    if (event.error === "no-speech") {
      showOffTopic("(no speech detected)");
    } else if (event.error === "not-allowed") {
      showPermissionError();
    } else {
      closePopup();
    }
  };

  recognition.onend = function () {
    setMicState(false);
  };

  recognition.start();
};

// Demo chips — simulate a voice result without mic
window.runDemo = async function (transcript) {
  const results = await resolveVoiceQuery(transcript);
  if (results.length === 0) {
    showOffTopic(transcript);
  } else {
    showResults(transcript, results);
  }
};

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
        <div class="vp-subgreeting">Listening… speak in Tamil or English</div>
      </div>
    </div>
    <div class="vp-dots">
      <span></span><span></span><span></span>
    </div>
    <div class="vp-listen-text">
      தேவரீர் திருவாக்கினை கேட்கிறோம்…
    </div>
    <div class="vp-actions">
      <button class="vp-btn-close" onclick="cancelVoice()">Cancel</button>
    </div>
  `);
}

function showResults(transcript, results) {

  _results     = results;
  _selectedIdx = 0;

  let optionsHtml = "";
  results.forEach((r, i) => {
    optionsHtml += `
      <label class="vp-option${i === 0 ? " selected" : ""}"
             id="vp-opt-${i}"
             onclick="selectOpt(${i})">
        <input type="radio" name="vp-choice"
               ${i === 0 ? "checked" : ""} />
        <div>
          <div class="vp-opt-label">${esc(r.label)}</div>
          <div class="vp-opt-sub">${esc(r.sublabel)}</div>
        </div>
      </label>
    `;
  });

  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">We heard you</div>
      </div>
    </div>

    <div class="vp-heard-label">You said</div>
    <div class="vp-heard-text">"${esc(transcript)}"</div>

    <div class="vp-dym-label">Do you mean…</div>
    <div class="vp-options">${optionsHtml}</div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="retryVoice()">🎙 Try again</button>
      <button class="vp-btn-search" onclick="confirmSearch()">Search</button>
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
        <div class="vp-subgreeting">We heard you</div>
      </div>
    </div>

    ${ !noSpeech ? `
      <div class="vp-heard-label">You said</div>
      <div class="vp-heard-text offtopic">"${esc(transcript)}"</div>
    ` : "" }

    <div class="vp-offtopic-msg">
      Adiyen, kindly search for topics related to<br/>
      <strong>நாலாயிர திவ்யப்பிரபந்தம்</strong> —
      pasurams, azhwars, divyadesams,<br/>
      thaniyans, and related sacred works.
    </div>

    <div class="vp-actions">
      <button class="vp-btn-retry" onclick="retryVoice()">🎙 Try again</button>
      <button class="vp-btn-close" onclick="closePopup()">Close</button>
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
    <button class="vp-btn-close" onclick="closePopup()">Close</button>
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
    <button class="vp-btn-close" onclick="closePopup()">Close</button>
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

  // Store destination in sessionStorage
  sessionStorage.setItem("voiceNav", JSON.stringify({
    fn    : result.fn,
    args  : result.args,
    label : result.label
  }));

  // Navigate to tree
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
