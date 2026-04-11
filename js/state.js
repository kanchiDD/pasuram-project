export const state = {
  level: "HOME",
  history: [],
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
  state.history.push(JSON.parse(JSON.stringify(state)));
}

export function goBack() {
  if (state.history.length === 0) {
    window.location.href = "index.html";
    return;
  }

  const prev = state.history.pop();
  Object.assign(state, prev);
}

export function goHome() {
  state.level = "HOME";
  state.history = [];
}

/* 👇 ADD THIS ONLY FOR DEBUG */
window.state = state;