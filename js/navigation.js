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
// 🔥 MARK SPECIAL SECTION
state.isSpecialSection = [21, 22, 23, 2672, 2673, 2674].includes(sectionId);

 
 if ([21, 2672].includes(sectionId)) {

  state.level = "PASURAM";

  Promise.all([
    fetchThaniyan(),
    fetchKootrirukkai()
  ]).then(() => {
    render();
  });

  return;
}


if ([22, 23, 2673, 2674].includes(sectionId)) {

  state.level = "PASURAM";

  Promise.all([
    fetchThaniyan(),
    fetchMadal()
  ]).then(() => {
    render();
  });

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
}

document.addEventListener("click", (e) => {

  const back = e.target.closest("#backBtn");
  const home = e.target.closest("#homeBtn");

  // 🔙 BACK
  if (back) {
    stopAudio();

    state.madalData = null;
    state.kootrirukkaiData = null;

    // 🔥 IF NO HISTORY → GO TO INDEX
    if (!state.history || state.history.length === 0) {
  window.location.href = "/";
  return;
}

    goBack();
    
  }

  
  // 🏠 HOME (ALWAYS INDEX)
if (home) {
  stopAudio();

  state.madalData = null;
  state.kootrirukkaiData = null;

  window.location.href = "/";
}

});



function stopAudio() {
  const audios = document.querySelectorAll("audio");

  audios.forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
}


window.selectThousand = selectThousand;
window.goBack = goBack;
window.loadThousand = loadThousand;

