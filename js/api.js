import { state } from "./state.js";
import { render } from "./render/layout.js";

// 🔥 Safe render — never fires during back navigation
function safeRender() {
  if (state.isNavigating) return;
  render();
}

export async function fetchThousand() {
  if (state.thousandData) return;
  const res = await fetch("https://cdnaalayiram-api.kanchitrust.workers.dev/api/thousand");
  state.thousandData = await res.json();
  safeRender();
}

export async function fetchSections() {
  if (state.sectionCache[state.selectedThousandId]) {
    state.sectionData = state.sectionCache[state.selectedThousandId];
    safeRender();
    return;
  }

  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/section?thousand_id=" + state.selectedThousandId
  );

  const data = await res.json();
  state.sectionData = data;
  state.sectionCache[state.selectedThousandId] = data;
  safeRender();
}

export async function fetchThaniyan() {
  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/thaniyan?section_id=" + state.selectedSectionId
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
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/madal?section_id=" + sectionId
  );

  const data = await res.json();
  state.madalData = data;

  try {
    const displayRes = await fetch(
      "https://cdnaalayiram-api.kanchitrust.workers.dev/api/pasuram-display?section_id=" + sectionId
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
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/kootrirukkai?section_id=" + sectionId
  );

  const data = await res.json();
  state.kootrirukkaiData = data;

  try {
    const displayRes = await fetch(
      "https://cdnaalayiram-api.kanchitrust.workers.dev/api/pasuram-display?section_id=" + sectionId
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
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/pasuram?section_id=" + sectionId
  );

  const data = await res.json();

  console.log("SECTION ID:", sectionId);
  console.log("PASURAM DATA SAMPLE:", data?.[0]);

  state.pasuramData = data || [];

  try {
    const displayRes = await fetch(
      "https://cdnaalayiram-api.kanchitrust.workers.dev/api/pasuram-display?section_id=" + sectionId
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
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/thirumozhi?section_id=" + sectionId
  );
  const data = await res.json();
  console.log("THIRUMOZHI LIST:", data);
  state.thirumozhiData = data;
}

export async function fetchEntitySearch() {
  const res = await fetch("https://cdnaalayiram-api.kanchitrust.workers.dev/api/entity-search");
  const data = await res.json();

  state.entitySearchData = data || [];
}