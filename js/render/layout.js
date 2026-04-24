import { state } from "../state.js";
import { renderHome } from "./home.js";
import { renderStart } from "./start.js";
import { renderThousand } from "./thousand.js";
import { renderOptions } from "./options.js";
import { renderSection } from "./section.js";
import { renderPasuram } from "./pasuram.js";
import { renderIndex } from "../index.js";
import { renderMadal, renderKootrirukkai } from "./special.js";

export function render() {

  // 🔥 BLOCK render during full build
  if (state.isFullRender && state.level !== "PASURAM") {
  return;
}

  console.log("🔥 RENDER CALLED", Date.now());
  const app = document.getElementById("app");
  const topbar = document.getElementById("topbar");

  if (!app) return;

  switch (state.level) {

    case "HOME":
      topbar.style.display = "none";
      app.innerHTML = renderHome();
      break;

    case "START":
      topbar.style.display = "flex";
      app.innerHTML = renderStart();
      break;

    case "THOUSAND":
      topbar.style.display = "flex";
      app.innerHTML = renderThousand();
      break;

    case "THOUSAND_OPTIONS":
      topbar.style.display = "flex";
      app.innerHTML = renderOptions();
      break;

    case "NAALAYIRAM_OPTIONS":
      topbar.style.display = "flex";
      app.innerHTML = renderOptions();
      break; 

    case "SECTION":
      topbar.style.display = "flex";
      app.innerHTML = renderSection();
      break;

    case "PASURAM":
  topbar.style.display = "flex";

  // =========================
  // ✅ FIRST TIME → create structure
  // =========================
  if (!document.getElementById("indexPage")) {

    const indexDiv = document.createElement("div");
    indexDiv.id = "indexPage";

    // ✅ ONLY render index if full data exists
    if (window.fullAnchorRows && window.fullAnchorRows.length) {
      indexDiv.innerHTML = renderIndex(window.fullAnchorRows, null);
    } else {
      indexDiv.innerHTML = "";
    }

    const contentDiv = document.createElement("div");
    contentDiv.id = "contentPage";
    contentDiv.style.display = "none";

    app.innerHTML = "";
    app.appendChild(indexDiv);
    app.appendChild(contentDiv);
  }

  // =========================
  // ✅ GET EXISTING ELEMENT
  // =========================
  let contentDiv = document.getElementById("contentPage");

  // =========================
  // ✅ RENDER CONTROL (FINAL)
  // =========================
  if (contentDiv && state.pasuramData && !state.isPathuSelectionActive) {

  contentDiv.style.display = "block";

  const sectionId = Number(state.selectedSectionId);

  // ✅ SPECIAL SECTIONS
  if ([21, 22, 23].includes(sectionId)) {

    // 🔥 IMPORTANT: use special renderer
    if (state.specialData) {
      contentDiv.innerHTML = renderSpecial(state.specialData);
    } else {
      console.log("⚠️ No specialData");
      contentDiv.innerHTML = "";
    }

  } else {

    // ✅ NORMAL FLOW
    contentDiv.innerHTML = renderPasuram();
  }
}

  break;
  }
}

function renderSpecial(data) {
  const name = state.selectedSectionName || "";

  if (name.includes("மடல்")) return renderMadal(data);
  if (name.includes("கூற்றிருக்கை")) return renderKootrirukkai(data);

  return "";
}


