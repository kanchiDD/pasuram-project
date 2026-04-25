export const state = {
  level: "HOME",
  history: [],

  view: "COVER",

  // 🔥 ADD THIS LINE (MISSING ROOT CAUSE)
  showIndex: false,

  thousandData: null,
  sectionData: null,
  thaniyanData: null,
  pasuramData: null,

  selectedThousandId: null,
  selectedSectionId: null,

  thirumozhiData: null,
  selectedThirumozhiId: null,

  sectionCache: {}
};


export function pushState() {
  state.history = state.history || [];

  const snapshot = {
    level: state.level,

    selectedThousandId: state.selectedThousandId,
    selectedSectionId: state.selectedSectionId,
    selectedSectionName: state.selectedSectionName,

    filteredPasuram: state.filteredPasuram,
    pasuramData: state.pasuramData,

    madalData: state.madalData,
    kootrirukkaiData: state.kootrirukkaiData,

    isPathuSelectionActive: state.isPathuSelectionActive
  };

  state.history.push(snapshot);
}


export function goBack() {
  if (!state.history || state.history.length === 0) {
    return; // ❗ DO NOT redirect
  }

  const prev = state.history.pop();

  if (!prev) return;

  // 🔥 FULL SAFE RESTORE
  for (let key in prev) {
    state[key] = prev[key];
  }

  // 🔥 IMPORTANT: DO NOT carry over history snapshot
  state.history = state.history;
}

export function goHome() {
  state.level = "HOME";
  state.history = [];
}

/* 👇 ADD THIS ONLY FOR DEBUG */
window.state = state;