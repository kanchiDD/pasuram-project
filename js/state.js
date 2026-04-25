export const state = {
  level: "HOME",
  history: [],

  view: "COVER",
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

  // ✅ Snapshot ALL keys needed to re-render any screen
  const snapshot = {
    level: state.level,

    selectedThousandId: state.selectedThousandId,
    selectedSectionId: state.selectedSectionId,
    selectedSectionName: state.selectedSectionName,

    thousandData: state.thousandData,
    sectionData: state.sectionData,
    thaniyanData: state.thaniyanData,
    pasuramData: state.pasuramData,
    filteredPasuram: state.filteredPasuram,

    madalData: state.madalData,
    kootrirukkaiData: state.kootrirukkaiData,

    isPathuSelectionActive: state.isPathuSelectionActive,
    isStandaloneSelection: state.isStandaloneSelection,
    isSpecialSection: state.isSpecialSection,
    isFullRender: state.isFullRender,
  };

  state.history.push(snapshot);
}


export function goBack() {
  if (!state.history || state.history.length === 0) {
    return;
  }

  const prev = state.history.pop();
  if (!prev) return;

  for (let key in prev) {
    state[key] = prev[key];
  }
}

export function goHome() {
  state.level = "HOME";
  state.history = [];
}

window.state = state;
