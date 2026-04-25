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

// SS1 → SS2
export function startTree() {
  pushState();                  // saves: HOME
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

export function loadThousand() {
  state.isFullRender = false;
  pushState();                  // saves: current level before going to THOUSAND
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

// SS2 → SS3
export function selectThousand(id) {
  if (Number(id) === 5) {
    pushState();                // saves: THOUSAND
    state.selectedThousandId = id;
    state.level = "NAALAYIRAM_OPTIONS";
    render();
    return;
  }
  pushState();                  // saves: THOUSAND
  state.selectedThousandId = id;
  state.level = "THOUSAND_OPTIONS";
  render();
}

// SS3 → SS4
// ✅ KEY FIX: loadSections must NOT pushState
// Because loadSections and selectSection are BOTH called for SS3→SS4 transition
// Only selectSection should push (it saves SS4/SECTION correctly)
export function loadSections() {
  state.level = "SECTION";
  render();
  fetchSections();
}

// SS4 → SS5
export function selectSection(id, name) {
  state.isFullRender = false;

  // Push BEFORE any mutation — saves the SECTION screen (SS4)
  pushState();

  state.selectedSectionId = id;
  state.selectedSectionName = name || "Thirumozhi";

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

  if (back) {
    stopAudio();

    if (!state.history || state.history.length === 0) {
      window.location.href = "/";
      return;
    }

    // goBack first — never null data before goBack (it wipes the restore)
    goBack();
    render();
  }

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
