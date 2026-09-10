import { state } from "./state.js";
import { render } from "./render/layout.js";

// 🔥 Safe render — never fires during back navigation
function safeRender() {
  if (state.isNavigating) return;
  render();
}

export async function fetchThousand() {
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
// Every API call above now goes through the overlay worker, which
// forwards to the cacheproxy unchanged. The interceptor below adds
// &script= ONLY when the reader has chosen a non-Tamil script, so
// with the default (Tamil) every request is byte-identical to before.
const OVERLAY_HOST = "overlay-worker.kanchitrust.workers.dev";
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
        if (url && url.includes(OVERLAY_HOST) && !url.includes("script=")) {
          const joined = url + (url.includes("?") ? "&" : "?") + "script=" + sc;
          if (typeof input === "string") input = joined;
          else input = new Request(joined, input);
        }
      }
    } catch (e) { /* never block a request */ }
    return _fetch(input, init);
  };
}