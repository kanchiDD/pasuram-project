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

export function startTree() {
  pushState();
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

export function loadThousand() {
  state.isFullRender = false;
  pushState();
  state.level = "THOUSAND";
  render();
  fetchThousand();
}

export function selectThousand(id) {
  if (Number(id) === 5) {
    pushState();
    state.selectedThousandId = id;
    state.level = "NAALAYIRAM_OPTIONS";
    render();
    return;
  }
  pushState();
  state.selectedThousandId = id;
  state.level = "THOUSAND_OPTIONS";
  render();
}

export function loadSections() {
  pushState();
  state.level = "SECTION";
  render();
  fetchSections();
}

export function selectSection(id, name) {
  state.isFullRender = false;
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
    Promise.all([fetchThaniyan(), fetchKootrirukkai()]).then(() => render());
    return;
  }

  if ([22, 23, 2673, 2674].includes(sectionId)) {
    state.level = "PASURAM";
    Promise.all([fetchThaniyan(), fetchMadal()]).then(() => render());
    return;
  }

  const standaloneSections = [4, 5];
  if (standaloneSections.includes(sectionId)) {
    state.isStandaloneSelection = true;
    fetchThaniyan();
    fetchPasuram().then(() => {
      openStandaloneSelector(sectionId, state.selectedSectionName, state.pasuramData);
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

/* =====================================================
   BACK BUTTON — attached exactly once
   ===================================================== */

if (!window._backListenerAttached) {
  window._backListenerAttached = true;

  document.addEventListener("click", function(e) {
    const back = e.target.closest("#backBtn");
    const home = e.target.closest("#homeBtn");

    if (back) {
      stopAudio();

      // 🔥 THE FIX: if no history left, OR after goBack we land on HOME
      // → always go to index page, never show ghost HOME screen
      if (!state.history || state.history.length === 0) {
        window.location.href = "/";
        return;
      }

      goBack();

      // 🔥 if goBack landed on HOME level → go to index instead of rendering it
      if (state.level === "HOME") {
        window.location.href = "/";
        return;
      }

      render();
    }

    if (home) {
      stopAudio();
      window.location.href = "/";
    }
  });
}

function stopAudio() {
  const audios = document.querySelectorAll("audio");
  audios.forEach(a => { a.pause(); a.currentTime = 0; });
}

window.selectThousand = selectThousand;
window.goBack = goBack;
window.loadThousand = loadThousand;
