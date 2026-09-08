/**
 * TIMING MAP FORMAT (generate this once per section from your CSVs,
 * store as JSON alongside the audio file or fetch from a worker route):
 *
 *   [
 *     { "type": "thaniyan", "id": 1,    "start_ms": 872,   "end_ms": 15172 },
 *     { "type": "pasuram",  "id": 2672, "start_ms": 15172, "end_ms": 226587 }
 *   ]
 *
 * DOM CONVENTION each renderer must follow:
 *   Each block gets: data-recital-type="thaniyan|pasuram"
 *                     data-recital-id="<id>"
 *   e.g. <div data-recital-type="pasuram" data-recital-id="2672">...</div>
 *
 * BEHAVIOUR:
 *   - Each tagged block gets its own small play button injected into it.
 *   - Tapping a block's play button seeks the shared <audio> to that
 *     block's start, plays, highlights that block, and AUTOMATICALLY
 *     STOPS once that block's segment ends (does not bleed into the
 *     next block). This matches how a ghoshti/reader wants to preview
 *     just the thaniyan, or just the pasuram, on demand.
 *   - Highlighting still follows playback position generally (e.g. if
 *     the audio is played via native controls straight through), it
 *     just won't auto-stop unless started via a block's own button.
 *
 * USAGE:
 *   attachRecitalSync(audioEl, timingMap, containerEl);
 */

let stylesInjected = false;
function injectDefaultStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .recital-play-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 20;
      border: none;
      background: #f5c242;
      color: #3c2f00;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      font-size: 13px;
      line-height: 32px;
      text-align: center;
      padding: 0;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }
    .recital-play-btn:hover { background: #e0ac1f; }
    .recital-active {
      background: #fff4d6 !important;
      box-shadow: inset 0 0 0 2px #f5c242;
      transition: background 0.2s ease;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Approximate per-line timing, computed WITHOUT any manual per-line
 * recording. Given the single recorded start/end for a whole block
 * (thaniyan or pasuram) and the text of each line inside it, this
 * divides the block's duration proportionally by line length —
 * longer lines get more time, short lines get less.
 *
 * This is an approximation (real recitation speed varies line to
 * line), but it needs zero extra recording work and is far more
 * useful for following along than whole-block highlighting.
 *
 * items: [{ id, text }, ...]  in the order they're recited
 * Returns a timingMap-compatible array:
 *   [{ type: "line", id, start_ms, end_ms }, ...]
 *
 * minWeightChars: a floor so very short lines (e.g. a single word,
 * or a "★★" dual marker line) still get a reasonable minimum share
 * of time rather than nearly zero.
 */
export function buildProportionalLineMap(startMs, endMs, items, { minWeightChars = 8 } = {}) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const weights = items.map((it) =>
    Math.max(String(it.text || "").replace(/<[^>]*>/g, "").trim().length, minWeightChars)
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const totalDuration = endMs - startMs;

  let cursor = startMs;
  return items.map((it, i) => {
    const share = weights[i] / totalWeight;
    const segStart = cursor;
    const segEnd = i === items.length - 1
      ? endMs
      : cursor + Math.round(totalDuration * share);
    cursor = segEnd;
    return { type: "line", id: it.id, start_ms: segStart, end_ms: segEnd };
  });
}

/**
 * USAGE:
 *   attachRecitalSync(audioEl, buttonSegments, highlightSegments, containerEl);
 *
 * buttonSegments — exactly ONE entry per playable block (e.g. one for
 *   the whole thaniyan, one for the whole pasuram). Each gets exactly
 *   ONE play button. Tapping it seeks to that block's start, plays,
 *   and auto-stops at that block's end.
 *
 * highlightSegments — finer-grained (e.g. one per line). NO buttons
 *   are created for these. As audio plays — from ANY source, a block
 *   button or otherwise — whichever segment the current time falls
 *   into gets automatically highlighted. This is what makes the
 *   highlight move line-by-line on its own without further clicking.
 *
 * Both arrays use the same shape: { type, id, start_ms, end_ms }
 * and both key into the DOM via: data-recital-type="<type>" data-recital-id="<id>"
 */
export function attachRecitalSync(audioEl, buttonSegments, highlightSegments, containerEl) {
  if (!audioEl || !containerEl) return;
  buttonSegments = Array.isArray(buttonSegments) ? buttonSegments : [];
  highlightSegments = Array.isArray(highlightSegments) ? highlightSegments : [];

  const sortedHighlights = [...highlightSegments].sort((a, b) => a.start_ms - b.start_ms);
  let stopAtMs = null;

  function findBlock(type, id) {
    return containerEl.querySelector(
      `[data-recital-type="${type}"][data-recital-id="${id}"]`
    );
  }

  function clearHighlight() {
    containerEl
      .querySelectorAll(".recital-active")
      .forEach((el) => el.classList.remove("recital-active"));
  }

  function highlightForTime(ms) {
    const seg = sortedHighlights.find((s) => ms >= s.start_ms && ms < s.end_ms);
    clearHighlight();
    if (!seg) return;
    const el = findBlock(seg.type, seg.id);
    if (el) {
      el.classList.add("recital-active");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function playSegment(seg) {
    audioEl.currentTime = seg.start_ms / 1000;
    stopAtMs = seg.end_ms;
    audioEl.play();
  }

  audioEl.addEventListener("timeupdate", () => {
    const ms = audioEl.currentTime * 1000;
    highlightForTime(ms);
    if (stopAtMs !== null && ms >= stopAtMs) {
      audioEl.pause();
      stopAtMs = null;
    }
  });

  injectDefaultStyles();

  // Buttons — ONE per block, no more.
  buttonSegments.forEach((seg) => {
    const el = findBlock(seg.type, seg.id);
    if (!el) return;

    const computedPos = window.getComputedStyle(el).position;
    if (computedPos === "static") el.style.position = "relative";

    if (!el.querySelector(".recital-play-btn")) {
      const btn = document.createElement("button");
      btn.className = "recital-play-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Play this " + seg.type);
      btn.textContent = "▶";
      el.appendChild(btn);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        playSegment(seg);
      });
    }
  });

  audioEl.addEventListener("pause", clearHighlight);
  audioEl.addEventListener("ended", () => {
    clearHighlight();
    stopAtMs = null;
  });
}

/**
 * Silent follow-along mode — for ghoshti recitals where people are
 * reciting together out loud (no per-person audio playback), but want
 * a shared visual indicator of "where we currently are" so anyone who
 * gets distracted can glance at their phone and pick back up instantly.
 *
 * Drives the SAME highlighting/scroll logic as attachRecitalSync, but
 * from a plain elapsed-time clock instead of an <audio> element.
 *
 * USAGE:
 *   const ghoshti = attachSilentPreview(timingMap, containerEl);
 *   ghoshti.start();          // call when ghoshti recital begins
 *   ghoshti.pause();          // if the group pauses
 *   ghoshti.resume();
 *   ghoshti.seekTo(msValue);  // jump to a specific point (e.g. leader manually advances)
 *   ghoshti.stop();           // clears highlight, resets clock
 *
 * speed: playback multiplier if the group recites faster/slower than
 * the original recording pace (default 1 = real time).
 */
export function attachSilentPreview(timingMap, containerEl, { speed = 1 } = {}) {
  const sorted = [...timingMap].sort((a, b) => a.start_ms - b.start_ms);
  const totalEnd = sorted.length
    ? sorted[sorted.length - 1].end_ms
    : 0;

  let elapsed = 0;
  let running = false;
  let lastTick = null;
  let raf = null;

  function findBlock(type, id) {
    return containerEl.querySelector(
      `[data-recital-type="${type}"][data-recital-id="${id}"]`
    );
  }

  function clearHighlight() {
    containerEl
      .querySelectorAll(".recital-active")
      .forEach((el) => el.classList.remove("recital-active"));
  }

  function highlightForTime(ms) {
    const seg = sorted.find((s) => ms >= s.start_ms && ms < s.end_ms);
    clearHighlight();
    if (!seg) return;
    const el = findBlock(seg.type, seg.id);
    if (el) {
      el.classList.add("recital-active");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function tick(ts) {
    if (!running) return;
    if (lastTick === null) lastTick = ts;
    const delta = (ts - lastTick) * speed;
    lastTick = ts;
    elapsed = Math.min(totalEnd, elapsed + delta);
    highlightForTime(elapsed);
    if (elapsed >= totalEnd) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    start() {
      elapsed = sorted.length ? sorted[0].start_ms : 0;
      running = true;
      lastTick = null;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    },
    resume() {
      if (running) return;
      running = true;
      lastTick = null;
      raf = requestAnimationFrame(tick);
    },
    seekTo(ms) {
      elapsed = ms;
      highlightForTime(elapsed);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      elapsed = 0;
      clearHighlight();
    },
  };
}

export function buildTimingMap(pasuramRows, thaniyanRows) {
  const rows = [
    ...pasuramRows.map((r) => ({
      type: "pasuram",
      id: r.GlobalNo ?? r.global_no,
      ms: Number(r.Milliseconds ?? r.ms),
    })),
    ...thaniyanRows.map((r) => ({
      type: "thaniyan",
      id: r.ThaniyanId ?? r.thaniyan_id,
      ms: Number(r.Milliseconds ?? r.ms),
    })),
  ].sort((a, b) => a.ms - b.ms);

  return rows.map((row, i) => ({
    type: row.type,
    id: row.id,
    start_ms: row.ms,
    end_ms: i + 1 < rows.length ? rows[i + 1].ms : Infinity,
  }));
}