import { state } from "./state.js";
import { render } from "./render/layout.js";
import { ensureContentStrings } from "./utils/contentStrings.js";

// 🔥 Safe render — never fires during back navigation
function safeRender() {
  if (state.isNavigating) return;
  render();
}

export async function fetchThousand() {
  await ensureContentStrings();
  if (state.thousandData) return;
  const res = await fetch("https://overlay-worker.kanchitrust.workers.dev/api/thousand");
  state.thousandData = await res.json();
  safeRender();
}

export async function fetchSections() {
  const sect = localStorage.getItem("sect") || "T";
  // Cache key includes sect so T and V get separate caches
  const cacheKey = state.selectedThousandId + "_" + sect;
  if (state.sectionCache[cacheKey]) {
    state.sectionData = state.sectionCache[cacheKey];
    safeRender();
    return;
  }

  // Bypass cache proxy for section — sect-specific, cache proxy can't handle per-sect caching
  const res = await fetch(
    "https://overlay-worker.kanchitrust.workers.dev/api/section?thousand_id=" + state.selectedThousandId + "&sect=" + sect
  );

  const data = await res.json();
  state.sectionData = data;
  state.sectionCache[cacheKey] = data;
  safeRender();
}

export async function fetchThaniyan() {
  const res = await fetch(
    "https://overlay-worker.kanchitrust.workers.dev/api/thaniyan?section_id=" + state.selectedSectionId
  );

  const data = await res.json();
  state.thaniyanData = data.thaniyan;
  state.prosodyMap = data.prosodyMap;

  if (!state.isSpecialSection) {
    safeRender();
  }
}

export async function fetchMadal() {
  const sectionId = state.selectedSectionId;

  const res = await fetch(
    "https://overlay-worker.kanchitrust.workers.dev/api/madal?section_id=" + sectionId
  );

  const data = await res.json();
  state.madalData = data;

  try {
    const displayRes = await fetch(
      "https://overlay-worker.kanchitrust.workers.dev/api/pasuram-display?section_id=" + sectionId
    );
    const displayData = await displayRes.json();
    state.displayMap = {
      section: displayData.section || [],
      pathu: displayData.pathu || {},
      thirumozhi: displayData.thirumozhi || {},
      pasuram: displayData.pasuram || {}
    };
    state.sectionClosing = displayData.sectionClosing || [];
    state.prosodyScope = displayData.prosodyScope || [];
    state.prosodyMaster = {};
    (displayData.prosodyMaster || []).forEach(p => {
      state.prosodyMaster[p.prosody_id] = p;
    });
  } catch (e) {
    console.log("DISPLAY ERROR:", e);
    state.displayMap = { section: [], pasuram: {} };
  }
}

export async function fetchKootrirukkai() {
  const sectionId = state.selectedSectionId;

  const res = await fetch(
    "https://overlay-worker.kanchitrust.workers.dev/api/kootrirukkai?section_id=" + sectionId
  );

  const data = await res.json();
  state.kootrirukkaiData = data;

  try {
    const displayRes = await fetch(
      "https://overlay-worker.kanchitrust.workers.dev/api/pasuram-display?section_id=" + sectionId
    );
    const displayData = await displayRes.json();
    state.displayMap = {
      section: displayData.section || [],
      pathu: displayData.pathu || {},
      thirumozhi: displayData.thirumozhi || {},
      pasuram: displayData.pasuram || {}
    };
    state.sectionClosing = displayData.sectionClosing || [];
    state.prosodyScope = displayData.prosodyScope || [];
    state.prosodyMaster = {};
    (displayData.prosodyMaster || []).forEach(p => {
      state.prosodyMaster[p.prosody_id] = p;
    });
  } catch (e) {
    console.log("DISPLAY ERROR (KOOTRIRUKKAI):", e);
  }

  state.pasuramData = null;
}

export async function fetchPasuram() {
  await ensureContentStrings();
  state.pasuramData = [];
  state.displayMap = { section: [], pathu: {}, thirumozhi: {}, pasuram: {} };

  const sectionId = state.selectedSectionId;
  if (!sectionId) return;

  const res = await fetch(
    "https://overlay-worker.kanchitrust.workers.dev/api/pasuram?section_id=" + sectionId
  );

  const data = await res.json();

  console.log("SECTION ID:", sectionId);
  console.log("PASURAM DATA SAMPLE:", data?.[0]);

  state.pasuramData = data || [];

  try {
    const displayRes = await fetch(
      "https://overlay-worker.kanchitrust.workers.dev/api/pasuram-display?section_id=" + sectionId
    );
    const displayData = await displayRes.json();
    state.displayMap = {
      section: displayData.section || [],
      pathu: displayData.pathu || {},
      thirumozhi: displayData.thirumozhi || {},
      pasuram: displayData.pasuram || {}
    };
    state.sectionClosing = displayData.sectionClosing || [];
    state.prosodyScope = displayData.prosodyScope || [];
    state.prosodyMaster = {};
    (displayData.prosodyMaster || []).forEach(p => {
      state.prosodyMaster[p.prosody_id] = p;
    });
  } catch (e) {
    console.log("DISPLAY ERROR:", e);
    state.displayMap = { section: [], pasuram: {} };
  }
}

export async function fetchThirumozhiList(sectionId) {
  const res = await fetch(
    "https://overlay-worker.kanchitrust.workers.dev/api/thirumozhi?section_id=" + sectionId
  );
  const data = await res.json();
  console.log("THIRUMOZHI LIST:", data);
  state.thirumozhiData = data;
}

export async function fetchEntitySearch() {
  const res = await fetch("https://overlay-worker.kanchitrust.workers.dev/api/entity-search");
  const data = await res.json();

  state.entitySearchData = data || [];
}


// ── Transliteration script support ───────────────────────────────
// TAMIL PATH — completely untouched. Every fetch above names the
// overlay host, which forwards to the cacheproxy unchanged, and the
// interceptor below returns immediately when the script is "ta". So a
// Tamil reader's requests are byte-identical to what they were before
// any of this existed: same host, same URL, no script param.
//
// NON-TAMIL PATH — the interceptor rewrites the request to the
// separate i18n worker (a xerox of the production worker bound to the
// same D1) and appends &script=. Endpoints not yet wired there simply
// ignore the param and return Tamil, which is the intended fallback
// while the remaining endpoints are being worked through.
// Two source hosts get rewritten. The overlay carries everything that goes
// through this file; cdnaalayiram-api is called directly by a few renderers
// (test_fullThousand.js fetches the anchor map from it), and without it in
// this list the book index and section headings stayed Tamil.
// Each production host and the duplicate that serves its ?script= traffic.
// The recital worker is a SEPARATE worker with a separate duplicate, which is
// why this is a map rather than one I18N_HOST: without its entry every
// /recital/* call on every screen went to production and came back Tamil.
const HOST_MAP = {
  "overlay-worker.kanchitrust.workers.dev":   "workeri18n.kanchitrust.workers.dev",
  "cdnaalayiram-api.kanchitrust.workers.dev": "workeri18n.kanchitrust.workers.dev",
  "recitalworker.kanchitrust.workers.dev":    "recitalworkeri18n.kanchitrust.workers.dev",
};
const VALID_SCRIPTS = ["te", "ml", "kn", "deva", "iast"];

export function getScript() {
  const s = (localStorage.getItem("script") || "ta").toLowerCase();
  return VALID_SCRIPTS.includes(s) ? s : "ta";
}

export function setScript(s) {
  if (s && s !== "ta" && VALID_SCRIPTS.includes(s)) localStorage.setItem("script", s);
  else localStorage.removeItem("script");
}

if (typeof window !== "undefined" && !window.__scriptFetchPatched) {
  window.__scriptFetchPatched = true;
  const _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      const sc = getScript();
      if (sc !== "ta") {
        const url = typeof input === "string" ? input
                  : (input && input.url) ? input.url : null;
        // Longest host first, so recitalworker is not shadowed by a prefix.
        const srcHost = !url ? null
                      : Object.keys(HOST_MAP).find(h => url.includes(h)) || null;
        if (srcHost && !url.includes("script=")) {
          const joined = url.replace(srcHost, HOST_MAP[srcHost])
                       + (url.includes("?") ? "&" : "?") + "script=" + sc;
          if (typeof input === "string") input = joined;
          else input = new Request(joined, input);
        }
      }
    } catch (e) { /* never block a request */ }
    return _fetch(input, init);
  };
}