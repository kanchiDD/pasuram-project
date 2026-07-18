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

import { resolveVoiceQuery as _resolveBase, resolveVoiceQueryExtended as _resolveExtended } from "./voiceSearch.js?v=4";
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
  // ta-IN works on Android Chrome; some devices need en-IN fallback
  // We set ta-IN but accept mixed Tamil/English input
  recognition.lang            = "ta-IN";
  recognition.interimResults  = false;
  recognition.maxAlternatives = 5;  // more alternatives improves match rate
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
      try {
        results = await resolveVoiceQuery(alt);
      } catch(e) {
        console.error("[Voice] resolve error:", e);
        results = [];
      }
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
    console.warn("[Voice] error:", event.error);
    if (event.error === "no-speech") {
      showOffTopic("(no speech detected)");
    } else if (event.error === "not-allowed") {
      showPermissionError();
    } else if (event.error === "language-not-supported") {
      // Tamil not supported — retry with en-IN
      recognition.lang = "en-IN";
      try { recognition.start(); return; } catch(e) {}
      showOffTopic("(language not supported)");
    } else if (event.error === "network") {
      showOffTopic("(network error — check connection)");
    } else if (event.error === "audio-capture") {
      showPermissionError();
    } else {
      showOffTopic("(mic error: " + event.error + ")");
    }
  };

  recognition.onend = function () {
    setMicState(false);
  };

  recognition.start();
};

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
    <div class="vp-heard-text">"${esc(displayTranscript)}"</div>

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

function showNotice(transcript, message) {
  const displayTranscript = canonicalizeRecitalWord(transcript);
  setPopup(`
    <div class="vp-header">
      <div class="vp-namaste">🙏</div>
      <div>
        <div class="vp-greeting">Adiyen — நமஸ்காரம்</div>
        <div class="vp-subgreeting">We heard you</div>
      </div>
    </div>

    <div class="vp-heard-label">You said</div>
    <div class="vp-heard-text offtopic">"${esc(displayTranscript)}"</div>

    <div class="vp-offtopic-msg">${esc(message)}</div>

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