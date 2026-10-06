// =============================================================
// pdfEdition.js  →  js/utils/pdfEdition.js
//
// Turns the full-thousand page (built by test_fullThousand.js, exactly as
// the site shows it) into a PDF edition. Used ONLY by pdf-book.html, which
// only the PDF generator opens — nothing on the live site imports this.
//
// A PDF runs no JavaScript, so the site's open-and-close index cannot work
// in it. The same two steps are rebuilt from links instead:
//
//   Index (sections only, as the site shows it collapsed)
//     └─ tap a section → that section's own contents page, placed at the
//        start of the section: its pathus and thirumozhis, each a link
//          └─ tap a thirumozhi → lands just above its header lines
//
//   Way back: every thirumozhi ends with "↑ <section>" (to the section's
//   contents), and the contents page and each section's end have
//   "↑ Index". The PDF's bookmark sidebar gives the whole tree as well.
//
// Play buttons: only the "Play All" ones are kept (each section's, and each
// thousand's "Play full"). A PDF cannot run the site's player, so each
// becomes a link to arulicheyal.org/play.html carrying its queue; that page
// plays it with the site's own player and applies the Anadhyayana Kalam
// rule on the day it is tapped. The single ▶ of every pasuram and thaniyan
// is left out, as is the floating nav.
// =============================================================

import { queueUrls } from "../render/globalAudio.js";

const PLAY_PAGE = "https://arulicheyal.org/play.html";

// A queue of the site's recordings, written short enough for a link:
//   thaniyans/thaniyan_2.mp3   -> t2
//   pasurams/pasuram_13..24    -> 13-24   (consecutive numbers run together)
// joined with dots: q=t2.13-24.30  — play.html reads it back in order.
function queueParam(urls) {
  const parts = [];
  let runA = null, runB = null;
  const flush = () => {
    if (runA !== null) parts.push(runA === runB ? String(runA) : runA + "-" + runB);
    runA = runB = null;
  };
  for (const u of urls || []) {
    let m = String(u).match(/^https:\/\/audio\.arulicheyal\.org\/pasurams\/pasuram_(\d+)\.mp3$/);
    if (m) {
      const n = Number(m[1]);
      if (runA !== null && n === runB + 1) { runB = n; continue; }
      flush(); runA = runB = n; continue;
    }
    m = String(u).match(/^https:\/\/audio\.arulicheyal\.org\/thaniyans\/thaniyan_([a-z0-9]+)\.mp3$/i);
    if (!m) return null;                  // not one of ours: no link at all
    flush(); parts.push("t" + m[1].toLowerCase());
  }
  flush();
  return parts.length ? parts.join(".") : null;
}

// The same id the renderer gives a thirumozhi heading (pasuram_full.js).
function thiruId(sectionId, heading) {
  const safe = String(heading || "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
  return `thiru-${sectionId}-${safe}`;
}

// onclick='openThirumozhi(3, "pathu", "heading")'  → [3, "pathu", "heading"]
// onclick='openDirectThirumozhi(3, "heading")'     → [3, "heading"]
function parseCall(attr, fnName) {
  if (!attr) return null;
  const m = attr.trim().match(new RegExp("^" + fnName + "\\((.*)\\)\\s*;?$", "s"));
  if (!m) return null;
  try { return JSON.parse("[" + m[1] + "]"); } catch (e) { return null; }
}

function cleanText(el) {
  return el.textContent.replace(/[▶►📑]/gu, "").replace(/\s+/g, " ").trim();
}

function makeLink(el, href) {
  const text = cleanText(el);
  el.removeAttribute("onclick");
  el.innerHTML = "";
  const a = document.createElement("a");
  a.className = "pdf-link";
  a.href = href;
  a.textContent = text;
  el.appendChild(a);
}

// An invisible landing point. A section's landing point carries the page
// break itself, so it is the first thing on the new page — placed before
// the break, it would sit at the foot of the previous page and a reader
// would land there instead.
function anchor(id, startsPage) {
  const a = document.createElement("div");
  a.className = startsPage ? "pdf-anchor pdf-sec-start" : "pdf-anchor";
  a.id = id;
  return a;
}

function upLink(href, label, arrow = "↑") {
  const d = document.createElement("div");
  d.className = "pdf-up";
  d.innerHTML = `<a class="pdf-link" href="${href}">${arrow} ${label}</a>`;
  return d;
}

export function preparePdf(app, indexLabel) {
  const stats = { sections: 0, thirumozhi: 0, pathu: 0, play: 0, unresolved: [] };

  // ── 0. Play All buttons become links to the play page ──────────────────
  //  ga-sec-<section>     a section's Play All
  //  ga-thousand-<id>     a thousand's Play full
  //  Every other ▶ (one pasuram, one thaniyan) is hidden by the print rules.
  app.querySelectorAll("button.ga-btn[id^='ga-sec-'], button.ga-btn[id^='ga-thousand-']").forEach(btn => {
    const q = queueParam(queueUrls(btn.id));
    const wrap = btn.closest(".ga-wrap");
    if (!q || !wrap) return;

    // What it plays, shown on the play page: the section's heading, or the
    // thousand's name printed under its button.
    const box = btn.closest(".content-border");
    const head = box && box.querySelector(".section-heading");
    const subs = Array.from(wrap.querySelectorAll(".ga-sub, span:not(.ga-wrap)"))
                      .map(x => x.textContent.trim()).filter(Boolean);
    const name = (head ? head.textContent : subs[subs.length - 1] || "").replace(/\s+/g, " ").trim();
    const label = (wrap.querySelector(".ga-sub") || {}).textContent || "";

    const a = document.createElement("a");
    a.className = "pdf-play-all";
    a.href = PLAY_PAGE + "?q=" + q + (name ? "&n=" + encodeURIComponent(name) : "");
    a.innerHTML = '<span class="pdf-play"><span class="pdf-play-tri"></span></span>' +
                  '<span class="pdf-play-label"></span>';
    a.querySelector(".pdf-play-label").textContent = label.trim() || "Play All";

    const row = document.createElement("div");
    row.className = "pdf-play-row";
    row.appendChild(a);
    (wrap.closest(".ga-center, .ga-thousand") || wrap).replaceWith(row);
    stats.play++;
  });

  // Anything pinned to the screen (the recital 🎤, floating nav) would be
  // printed on every page.
  app.querySelectorAll(".recital-float, .naal-float-nav, [style*='position:fixed'], [style*='position: fixed']")
     .forEach(el => { el.style.display = "none"; });

  // ── 0b. A thaniyan may break between its verses, never inside one ─────
  //  (kept whole, the pothu thaniyans fill a page; inside the Ithara frame
  //  they no longer fit and jumped a page, leaving an empty one)
  app.querySelectorAll(".thaniyan-group").forEach(marker => {
    const g = document.createElement("div");
    g.className = "pdf-tgroup";
    marker.parentNode.insertBefore(g, marker);
    let el = marker;
    while (el) {
      const next = el.nextElementSibling;
      g.appendChild(el);
      if (!next || next.matches(".thaniyan-group, .thaniyan-title, .thaniyan-subhead, .pdf-tgroup")) break;
      el = next;
    }
  });

  // ── 1. Find each section's blocks: [special anchor] [thaniyan] content ──
  // Found in document order wherever they sit (in the full 4000 the Ithara
  // sections are inside their own framed box). A section heading inside a
  // content box also carries id="section-N", so only top-level blocks count.
  const blocks = Array.from(app.querySelectorAll(
      ".thaniyan-border, .content-border, div[id^='section-']"))
    .filter(el => !el.parentElement.closest(".content-border, .thaniyan-border, .index-border"));

  const sections = [];          // { id, first, content }
  let group = [];
  blocks.forEach(el => {
    group.push(el);
    if (!el.classList.contains("content-border")) return;
    const idEl = group.find(b => /^section-\d+$/.test(b.id || "")) ||
                 el.querySelector("[id^='section-']");
    const m = idEl && idEl.id.match(/^section-(\d+)$/);
    if (m) sections.push({ id: m[1], first: group[0], content: el });
    group = [];
  });

  // ── 2. Landing points: one at each section start, and one just above
  //       each thirumozhi's header lines. ──
  const secById = {};
  sections.forEach(s => {
    secById[s.id] = s;
    s.anchor = anchor(`pdf-sec-${s.id}`, true);
    s.first.parentNode.insertBefore(s.anchor, s.first);

    s.thiru = [];
    s.content.querySelectorAll(".line3-bold[id^='thiru-']").forEach(h => {
      let top = h;
      const prev = h.previousElementSibling;
      if (prev && prev.classList.contains("prabandham-header")) top = prev;
      const id = "pdf-" + h.id;
      if (document.getElementById(id)) return;         // repeated heading

      // Header lines, heading, its notes and the first pasuram stay
      // together on one page, so a header never sits alone at a page foot.
      // The landing id sits on this block itself: an empty marker inside
      // it would be left behind at the foot of the previous page whenever
      // the block moves on to the next one.
      const keep = document.createElement("div");
      keep.className = "pdf-keep";
      keep.id = id;
      top.parentNode.insertBefore(keep, top);
      let el = top;
      while (el) {
        const next = el.nextElementSibling;
        keep.appendChild(el);
        if (el.classList.contains("pasuram-item") || el.classList.contains("tree-item")) break;
        el = next;
      }
      s.thiru.push(keep);
    });
  });

  // ── 2b. A thousand's heading (முதலாமாயிரம் … இதர பிரபந்தங்கள்) starts
  //       the page together with its first section, instead of being left
  //       at the foot of the page before (or alone on a page of its own).
  //  The section's landing id moves up with the page break, so the index
  //  link lands on the heading at the top of that page, not below it.
  sections.forEach(s => {
    const a = s.anchor;
    let prev = a.previousElementSibling;
    while (prev && prev.matches(".ga-thousand, .page-spacer, .pdf-anchor")) prev = prev.previousElementSibling;
    if (!prev || !prev.matches("div[style*='margin:30px 0 20px']")) return;
    let target = prev;
    while (target.parentElement && target.parentElement !== app &&
           target.parentElement.firstElementChild === target) target = target.parentElement;
    a.classList.remove("pdf-sec-start");
    a.style.position = "static";
    target.classList.add("pdf-sec-start");
    if (!target.id) { a.removeAttribute("id"); target.id = `pdf-sec-${s.id}`; }
  });

  // ── 3. The index: sections only, each linking to its section ─────────
  const indexes = app.querySelectorAll(".index-container");
  app.querySelectorAll(".index-title").forEach(t => { t.textContent = cleanText(t); });

  // The full 4000 has two indexes: the 4000, then இதர பிரபந்தங்கள். Each
  // section's "↑" leads back to the index it is listed in.
  indexes.forEach((idx, n) => {
    const box = idx.closest(".index-border") || idx;
    box.id = n === 0 ? "pdf-index" : `pdf-index-${n + 1}`;
    const t = box.querySelector(".index-title");
    idx._back = { href: "#" + box.id, label: n === 0 ? indexLabel : (t ? cleanText(t) : indexLabel) };
  });
  // …and the 4000's index ends with a link on to the இதர பிரபந்தங்கள் list.
  if (indexes.length > 1) {
    const box = indexes[0].closest(".index-border") || indexes[0];
    box.appendChild(upLink(indexes[1]._back.href, indexes[1]._back.label, "↓"));
  }

  indexes.forEach(idx => {
    idx.querySelectorAll(".inline-menu").forEach(el => el.remove());

    idx.querySelectorAll(".section").forEach(secEl => {
      const title = secEl.querySelector(".section-title[onclick]");
      const m = title && (title.getAttribute("onclick") || "").match(/handleSectionClick\((\d+)\)/);
      if (!m) return;
      const sid = m[1];
      const label = cleanText(title);
      const s = secById[sid];
      if (s) s.back = idx._back;
      if (!s) stats.unresolved.push(`section ${sid}`);
      makeLink(title, s ? `#pdf-sec-${sid}` : `#section-${sid}`);
      stats.sections++;

      // ── 4. The section's own contents page, built from its index entries ─
      const sub = secEl.querySelector(`#sec_${sid}`);
      if (!sub || !s || !sub.querySelector(".thirumozhi[onclick]")) {
        if (sub) sub.remove();
        s && (s.label = label);
        return;
      }
      sub.removeAttribute("id");
      sub.style.display = "block";
      sub.querySelectorAll("[style*='display:none'], [style*='display: none']")
         .forEach(el => { el.style.display = "block"; });
      sub.querySelectorAll(".hidden").forEach(el => el.classList.remove("hidden"));

      sub.querySelectorAll(".thirumozhi[onclick]").forEach(el => {
        const oc = el.getAttribute("onclick");
        const a = parseCall(oc, "openThirumozhi");
        const d = a ? null : parseCall(oc, "openDirectThirumozhi");
        const heading = a ? a[2] : d ? d[1] : null;
        let target = "pdf-" + thiruId(sid, heading);
        if (!document.getElementById(target)) {
          stats.unresolved.push(`${sid}: ${heading}`);
          target = `pdf-sec-${sid}`;
        }
        makeLink(el, "#" + target);
        stats.thirumozhi++;
      });
      // ── Pathu level, as on the site: the section page lists only the
      //    pathus; each pathu gets its own page, at its start, listing its
      //    thirumozhis. Sections without pathus keep their thirumozhis on
      //    the section page.
      const secName = label.replace(/^[\d.]+\s*/, "");
      const owner = {};                   // thirumozhi landing id → its pathu
      let pi = 0;
      sub.querySelectorAll(".pathu").forEach(pathuEl => {
        const ptitle = pathuEl.querySelector(".pathu-title[onclick]");
        if (!ptitle) return;
        const list  = pathuEl.querySelector(".pathu-content");
        const links = list ? Array.from(list.querySelectorAll(".thirumozhi a.pdf-link")) : [];
        const firstId = links.length ? links[0].getAttribute("href").slice(1) : "";
        const firstKeep = firstId.startsWith("pdf-thiru-") ? document.getElementById(firstId) : null;
        const plabel = cleanText(ptitle);
        stats.pathu++;
        if (!list || !firstKeep) {        // nowhere to put a pathu page
          makeLink(ptitle, firstId ? "#" + firstId : `#pdf-sec-${sid}`);
          return;
        }
        const pid = `pdf-pathu-${sid}-${pi++}`;
        const box = document.createElement("div");
        box.className = "pdf-contents index-border pdf-pathu-page pdf-sec-start";
        box.id = pid;
        box.innerHTML = `<div class="pdf-contents-title">${plabel}</div>`;
        list.style.display = "block";
        box.appendChild(list);
        box.appendChild(upLink(`#pdf-sec-${sid}`, secName));
        firstKeep.parentNode.insertBefore(box, firstKeep);
        links.forEach(a => { owner[a.getAttribute("href").slice(1)] = { href: "#" + pid, label: plabel }; });
        makeLink(ptitle, "#" + pid);
      });
      s.owner = owner;

      const page = document.createElement("div");
      page.className = "pdf-contents index-border";
      page.innerHTML = `<div class="pdf-contents-title">${label}</div>`;
      page.appendChild(sub);
      page.appendChild(upLink(s.back.href, s.back.label));

      // contents first (right after the landing point that starts the
      // page), then the section's thaniyan and verses
      const secAnchor = s.anchor;
      secAnchor.parentNode.insertBefore(page, secAnchor.nextSibling);
      s.label = label;
      s.hasContents = true;
    });
  });

  // ── 5. Ways back ───────────────────────────────────────────────────────
  // End of every thirumozhi: back to its pathu page if it has one,
  // otherwise to the section page. A thirumozhi that opens a new pathu has
  // that pathu's page in front of it, so the link goes before the page.
  sections.forEach(s => {
    const label = (s.label || "").replace(/^[\d.]+\s*/, "");
    const back = keep => (s.owner && s.owner[keep.id]) ||
                         { href: `#pdf-sec-${s.id}`, label };
    if (s.hasContents) {
      s.thiru.forEach((keep, i) => {
        if (i === 0) return;
        const b = back(s.thiru[i - 1]);
        const prev = keep.previousElementSibling;
        const at = prev && prev.classList.contains("pdf-pathu-page") ? prev : keep;
        at.parentNode.insertBefore(upLink(b.href, b.label), at);
      });
      const last = s.thiru.length ? back(s.thiru[s.thiru.length - 1]) : null;
      if (last && last.href !== `#pdf-sec-${s.id}`) s.content.appendChild(upLink(last.href, last.label));
      s.content.appendChild(upLink(`#pdf-sec-${s.id}`, label));
    }
    const ix = s.back || { href: "#pdf-index", label: indexLabel };
    s.content.appendChild(upLink(ix.href, ix.label));
  });

  // ── 5b. No page with only a closing line or a "↑" button on it ──────
  //  A thirumozhi's, pathu's or section's closing lines (❖, சரணம்,
  //  முற்றிற்று) and its "↑" buttons are tied to its last pasuram, so when
  //  they do not fit they move to the next page together with it.
  app.querySelectorAll(".pdf-up").forEach(up => {
    if (up.closest(".pdf-contents") || up.closest(".pdf-tail")) return;
    const prevUp = up.previousElementSibling;
    if (prevUp && prevUp.classList.contains("pdf-up")) return;     // handled with the first of a run

    const run = [up];
    let n = up.nextElementSibling;
    while (n && n.classList.contains("pdf-up")) { run.push(n); n = n.nextElementSibling; }

    const before = [];
    let p = up.previousElementSibling, found = false;
    for (let steps = 0; p && steps < 12; steps++) {
      before.unshift(p);
      if (p.classList.contains("pasuram-item") || p.classList.contains("tree-item") ||
          p.classList.contains("pdf-keep")) { found = true; break; }
      p = p.previousElementSibling;
    }
    if (!found) return;

    const tail = document.createElement("div");
    tail.className = "pdf-tail";
    up.parentNode.insertBefore(tail, before[0]);
    before.concat(run).forEach(el => tail.appendChild(el));
  });

  // ── 6. Bookmarks: Chrome builds the PDF's bookmark sidebar from real
  //       heading tags, and the site's headings are divs. Each is swapped
  //       for an h-tag of the right level that keeps its id, classes and
  //       look, so nothing changes on the page.
  [[".index-border > .index-title", 1], [".section-heading", 1],
   [".prabandham-header .line2", 2], [".line3-bold", 3]].forEach(([sel, lvl]) => {
    app.querySelectorAll(sel).forEach(el => {
      if (!el.textContent.trim() || el.closest(".pdf-contents")) return;
      const cs = getComputedStyle(el);
      const h = document.createElement("h" + lvl);
      for (const at of el.attributes) h.setAttribute(at.name, at.value);
      h.style.fontSize = cs.fontSize;
      h.style.fontWeight = cs.fontWeight;
      h.style.margin = cs.margin;
      while (el.firstChild) h.appendChild(el.firstChild);
      el.replaceWith(h);
    });
  });

  return stats;
}