// =============================================================
// js/render/madalKootrirukkaiCore.js
// Single source of truth for Madal (Siriya/Periya Thirumadal)
// and Thiruvezhukootrirukkai rendering — display logic only.
//
// Algorithm is taken verbatim from nncRender.js's renderMadal —
// the proven correct block_repeat / line_repeat segment logic.
// The only addition here is a container wrapper per couplet
// (madal) and per line (kootrirukkai) for readability.
//
// This module does NOT fetch data, does NOT render headings,
// thaniyan, or closing text — callers keep their own wrapping.
// It only builds the inner couplet/line HTML.
//
// Usage:
//   import { buildMadalCoupletsHTML, buildKootrirukkaiLinesHTML }
//     from "./madalKootrirukkaiCore.js";
//
//   const innerHtml = buildMadalCoupletsHTML(data, "nnc");
//   // data = { units:[...], rules:[...] }  (raw /api/madal response)
//   // "nnc" = class prefix -> produces nnc-madal-couplet-card etc.
// =============================================================

// ── MADAL ──────────────────────────────────────────────────────
// data: { units: [...], rules: [...] }
// prefix: CSS class prefix, e.g. "nnc", "fathn", "rec", "ghosh"
// maxCouplet: couplet number beyond which the couplet-no is not shown
//             (Siriya = 77, Periya = 148) — pass explicitly per caller
export function buildMadalCoupletsHTML(data, prefix, maxCouplet) {
  const units = data?.units || [];
  const rules = data?.rules || [];
  if (!units.length) return "";

  function isLineInBlock(c, lineNo) {
    return rules.some(r => {
      if (r.rule_type !== "block_repeat") return false;
      const afterStart = (c > r.start_couplet) || (c === r.start_couplet && lineNo >= r.start_line);
      const beforeEnd  = (c < r.end_couplet)   || (c === r.end_couplet   && lineNo <= r.end_line);
      return afterStart && beforeEnd;
    });
  }
  function isLineDual(c, lineNo) {
    return rules.some(r =>
      r.rule_type === "line_repeat" &&
      r.start_couplet === c &&
      r.line_no === lineNo
    );
  }

  const coupletMap = new Map();
  for (const u of units) {
    const c = u.couplet_no;
    if (!coupletMap.has(c)) coupletMap.set(c, []);
    for (let i = 1; i <= 8; i++) {
      if (u[`line_${i}`]) coupletMap.get(c).push({ text: u[`line_${i}`], lineNo: i });
    }
  }

  // Segments tracked ACROSS couplets so block_repeat lines spanning
  // multiple couplets merge into ONE dual-block div — exact NNC logic
  const couplets = [...coupletMap.keys()].sort((a, b) => a - b);
  const allSegments = [];
  let currentSegment = null;

  for (const c of couplets) {
    const lines = coupletMap.get(c);
    for (let li = 0; li < lines.length; li++) {
      const { text, lineNo } = lines[li];
      const inBlock  = isLineInBlock(c, lineNo);
      const lineDual = isLineDual(c, lineNo);
      const isDual   = inBlock || lineDual;
      const isLastInCouplet = li === lines.length - 1;
      const showCoupletNo   = isLastInCouplet && (maxCouplet == null || c <= maxCouplet);

      if (isDual) {
        if (currentSegment && currentSegment.isDual) {
          currentSegment.lines.push({ text, showCoupletNo, coupletNo: c });
        } else {
          if (currentSegment) allSegments.push(currentSegment);
          currentSegment = { isDual: true, lines: [{ text, showCoupletNo, coupletNo: c }] };
        }
      } else {
        if (currentSegment && !currentSegment.isDual) {
          currentSegment.lines.push({ text, showCoupletNo, coupletNo: c });
        } else {
          if (currentSegment) allSegments.push(currentSegment);
          currentSegment = { isDual: false, lines: [{ text, showCoupletNo, coupletNo: c }] };
        }
      }
    }
  }
  if (currentSegment) allSegments.push(currentSegment);

  let html = "";
  for (const seg of allSegments) {
    const linesHtml = seg.lines.map((l, idx) => {
      const prefixMark = (seg.isDual && idx === 0) ? `<span class="${prefix}-dual-mark">★★</span> ` : "";
      if (l.showCoupletNo) {
        return `<div class="${prefix}-madal-line ${prefix}-line-with-no">
          <span>${prefixMark}${l.text}</span>
          <span class="${prefix}-couplet-no">${l.coupletNo}</span>
        </div>`;
      }
      return `<div class="${prefix}-madal-line">${prefixMark}${l.text}</div>`;
    }).join("");

    if (seg.isDual) {
      // Dual block — single shared card for the whole repeated block,
      // possibly spanning multiple couplets
      html += `<div class="${prefix}-madal-couplet-card ${prefix}-madal-dual-block">${linesHtml}</div>`;
    } else {
      // Plain segment — wrap EACH couplet separately in its own card
      // for readability (this is the new requirement)
      let coupletHtml = "";
      let currentCoupletLines = [];
      let currentCouplet = null;
      for (const l of seg.lines) {
        if (currentCouplet !== null && l.coupletNo !== currentCouplet) {
          coupletHtml += `<div class="${prefix}-madal-couplet-card">${currentCoupletLines.join("")}</div>`;
          currentCoupletLines = [];
        }
        currentCouplet = l.coupletNo;
        const prefixMark = "";
        const lineHtml = l.showCoupletNo
          ? `<div class="${prefix}-madal-line ${prefix}-line-with-no"><span>${l.text}</span><span class="${prefix}-couplet-no">${l.coupletNo}</span></div>`
          : `<div class="${prefix}-madal-line">${l.text}</div>`;
        currentCoupletLines.push(lineHtml);
      }
      if (currentCoupletLines.length) {
        coupletHtml += `<div class="${prefix}-madal-couplet-card">${currentCoupletLines.join("")}</div>`;
      }
      html += coupletHtml;
    }
  }

  return html;
}

// ── KOOTRIRUKKAI (Thiruvezhukootrirukkai) ────────────────────────
// data: { lines: [...] }  — raw /api/kootrirukkai response
// prefix: CSS class prefix
// dualLineNo: which line_no is the dual-recital marker line (typically 41)
export function buildKootrirukkaiLinesHTML(data, prefix, dualLineNo = 41) {
  const lines = data?.lines || [];
  if (!lines.length) return "";

  let html = "";
  for (const l of lines) {
    const isDual = Number(l.line_no) === Number(dualLineNo);
    const mark = isDual ? `<span class="${prefix}-dual-mark">★★</span> ` : "";
    html += `<div class="${prefix}-kootrirukkai-line-card">
      <div class="${prefix}-madal-line">${mark}${l.line_text}</div>
    </div>`;
  }
  return html;
}