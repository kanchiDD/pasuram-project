import { state, pushState, goBack, goHome } from "./state.js";
import { render } from "./render/layout.js";
import {
  fetchThousand,
  fetchSections,
  fetchThaniyan,
  fetchPasuram,
  fetchMadal,
  fetchKootrirukkai
} from "./api.js";
// ✅ STATIC IMPORTS
import { openStandaloneSelector } from "./render/standaloneSelector.js";
import { openPathuSelector } from "./render/pathuSelector.js";

/* 🔥 SAFE CHECK — ONLY ADDITION */
function hasValidPathu(data) {
  if (!data || !data.length) return false;

  return data.some(p =>
    p.pathu_name && String(p.pathu_name).trim() !== ""
  );
}

export function initNavigation() {

  document.getElementById("backBtn").onclick = () => {

    state.madalData = null;
    state.kootrirukkaiData = null;

    goBack();
    render();
  };

  document.getElementById("homeBtn").onclick = () => {

    state.madalData = null;
    state.kootrirukkaiData = null;

    goHome();
    render();
  };

  render();
}


/* ACTIONS */

export function startTree() {

  pushState();

  // 🔥 DIRECT ENTRY TO THOUSAND
  state.level = "THOUSAND";

  render();

  fetchThousand();
}

export function loadThousand() {
state.isFullRender = false;   // 🔥 ADD THIS
  pushState();
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

export function selectThousand(id) {


  // 🔥 SPECIAL CASE — 5th ITEM
  if (Number(id) === 5) {
    state.selectedThousandId = id;   // 🔥 ADD THIS LINE
    pushState();
    state.level = "NAALAYIRAM_OPTIONS";
    render();
    return;
  }

  // NORMAL FLOW
  pushState();
  state.level = "THOUSAND_OPTIONS";
  state.selectedThousandId = id;
  render();
}

export function loadSections() {
  pushState();
  state.level = "SECTION";
  render();
  fetchSections();
}


/* 🔥 MAIN SECTION CLICK */

export function selectSection(id, name) {
state.isFullRender = false;   // 🔥 VERY IMPORTANT
  console.log("SECTION CLICK:", id, name);

  pushState();
  state.level = "SECTION";

  state.selectedSectionId = id;
  state.selectedSectionName = name || "Thirumozhi";

  // RESET
  state.pasuramData = null;
  state.thaniyanData = null;
  state.madalData = null;
  state.kootrirukkaiData = null;

  state.selectedPathu = null;
  state.filteredPasuram = null;

  const sectionId = Number(id);

 
  // 🔶 KOOTRIRUKKAI
  if ([21, 2672].includes(Number(id))) {
     state.level = "PASURAM";   // 🔥 ADD THIS
    fetchThaniyan();
    fetchKootrirukkai();
    return;
  }


// 🔶 MADAL
  if ([22, 23, 2673, 2674].includes(Number(id))) {
     state.level = "PASURAM";   // 🔥 ADD THIS
    fetchThaniyan();
    fetchMadal();
    return;
  }


  // 🔶 STANDALONE (UNCHANGED — SAFE)
  const standaloneSections = [4, 5];

  if (standaloneSections.includes(sectionId)) {

    state.isStandaloneSelection = true;

    fetchThaniyan();

    fetchPasuram().then(() => {
      openStandaloneSelector(
        sectionId,
        state.selectedSectionName,
        state.pasuramData
      );
    });

    return;
  }

  // 🔶 PATHU / DIRECT FLOW (FIX APPLIED HERE ONLY)

  fetchThaniyan();

  fetchPasuram().then(() => {

    console.log("PASURAM DATA READY:", state.pasuramData);

    if (hasValidPathu(state.pasuramData)) {

  state.isPathuSelectionActive = true;
  openPathuSelector();

} else {

  state.isPathuSelectionActive = false;
  state.filteredPasuram = state.pasuramData;
  state.level = "PASURAM";
  render();
}
});

window.selectThousand = selectThousand;
window.goBack = goBack;
window.loadThousand = loadThousand;

