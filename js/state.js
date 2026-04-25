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
  const snapshot = JSON.parse(JSON.stringify(state));

  // 🔥 CRITICAL FIX — remove history from snapshot
  delete snapshot.history;

  state.history.push(snapshot);
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