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
import { openStandaloneSelector } from "./render/standaloneSelector.js";
import { openPathuSelector } from "./render/pathuSelector.js";

function hasValidPathu(data) {
  if (!data || !data.length) return false;
  return data.some(p =>
    p.pathu_name && String(p.pathu_name).trim() !== ""
  );
}


/* ACTIONS */

export function startTree() {
  // Save HOME before leaving it
  pushState();                  // ✅ saves: level=HOME
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

export function loadThousand() {
  state.isFullRender = false;
  // Save current screen before leaving it
  pushState();                  // ✅ saves: level=THOUSAND_OPTIONS or NAALAYIRAM_OPTIONS
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

export function selectThousand(id) {

  // SPECIAL CASE — 5th ITEM
  if (Number(id) === 5) {
    pushState();                // ✅ saves: level=THOUSAND
    state.selectedThousandId = id;
    state.level = "NAALAYIRAM_OPTIONS";
    render();
    return;
  }

  // NORMAL FLOW
  pushState();                  // ✅ saves: level=THOUSAND
  state.selectedThousandId = id;
  state.level = "THOUSAND_OPTIONS";
  render();
}

export function loadSections() {
  // ✅ FIX: was missing pushState entirely — SS3 was never saved
  pushState();                  // ✅ saves: level=THOUSAND_OPTIONS or NAALAYIRAM_OPTIONS
  state.level = "SECTION";
  render();
  fetchSections();
}


/* MAIN SECTION CLICK */

export function selectSection(id, name) {
  state.isFullRender = false;

  // ✅ FIX: pushState BEFORE mutating level, so we save SECTION screen correctly
  pushState();                  // ✅ saves: level=SECTION

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

  // STANDALONE
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

  // PATHU / DIRECT FLOW
  fetchThaniyan();
  fetchPasuram().then(() => {
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

  // BACK
  if (back) {
    stopAudio();

    if (!state.history || state.history.length === 0) {
      window.location.href = "/";
      return;
    }

    // ✅ FIX: goBack() first — it restores madalData/kootrirukkaiData from snapshot
    // Do NOT null them before goBack, that was wiping restored data
    goBack();
    render();
  }

  // HOME
  if (home) {
    stopAudio();
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
