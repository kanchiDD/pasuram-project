import { state } from "./state.js";
import { render } from "./render/layout.js";

export async function fetchThousand() {

  if (state.thousandData) return;

  const res = await fetch("https://cdnaalayiram-api.kanchitrust.workers.dev/api/thousand");
  state.thousandData = await res.json();

  render();
}

export async function fetchSections() {

  if (state.sectionCache[state.selectedThousandId]) {
    state.sectionData = state.sectionCache[state.selectedThousandId];
    render();
    return;
  }

  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/section?thousand_id=" + state.selectedThousandId
  );

  const data = await res.json();

  // 🔥 NO TRANSFORM — USE RAW API
  state.sectionData = data;
  state.sectionCache[state.selectedThousandId] = data;

  render();
}  



export async function fetchThaniyan() {

  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/thaniyan?section_id=" + state.selectedSectionId
  );

  const data = await res.json();

  state.thaniyanData = data.thaniyan;
  state.prosodyMap = data.prosodyMap;

  // 🔥 ONLY render for normal sections
  if (!state.isSpecialSection) {
    render();
  }
}

/* 🔥 NEW — MADAL (FIXED) */
export async function fetchMadal() {

  const sectionId = state.selectedSectionId;

  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/madal?section_id=" + sectionId
  );

  const data = await res.json();

  state.madalData = data;

  /* 🔥 ADD THIS BLOCK (IMPORTANT) */
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

  // 🔥 ONLY render if NOT standalone modal flow
  if (!state.isStandaloneSelection) {
    
  }
}

/* 🔥 NEW — KOOTRIRUKKAI (FIXED) */
export async function fetchKootrirukkai() {

  const sectionId = state.selectedSectionId;

  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/kootrirukkai?section_id=" + sectionId
  );

  const data = await res.json();

  state.kootrirukkaiData = data;

  /* 🔥 SAME ADDITION */
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

  /* Clear others */
  state.pasuramData = null;


}

export async function fetchPasuram() {

  // 🔥 STEP 1: HARD RESET (fixes repetition bug)
  state.pasuramData = [];
   state.displayMap = { section: [], pathu: {}, thirumozhi: {}, pasuram: {} };
  const sectionId = state.selectedSectionId;

  // safety
  if (!sectionId) return;

  /* 🟢 PASURAM */
  const res = await fetch(
    "https://cdnaalayiram-api.kanchitrust.workers.dev/api/pasuram?section_id=" + sectionId
  );

  const data = await res.json();

// 🔍 ADD THESE 2 LINES
console.log("SECTION ID:", sectionId);
console.log("PASURAM DATA SAMPLE:", data?.[0]);

  // 🔥 STEP 2: FORCE ASSIGN (no reuse of old data)
  state.pasuramData = data || [];

// 🔥 ADD THIS (INSIDE fetchPasuram — NOT outside)

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