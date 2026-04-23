import { state } from "../state.js";
import { renderHome } from "./home.js";
import { renderStart } from "./start.js";
import { renderThousand } from "./thousand.js";
import { renderOptions } from "./options.js";
import { renderSection } from "./section.js";
import { renderPasuram } from "./pasuram.js";
import { renderIndex } from "../index.js";

export function render() {

  // 🔥 BLOCK render during full build
  if (state.isFullRender) {
    console.log("⛔ render blocked (full render mode)");
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

  // ✅ FIRST TIME → create structure
  if (!document.getElementById("indexPage")) {

    const indexDiv = document.createElement("div");
    indexDiv.id = "indexPage";
    indexDiv.innerHTML = renderIndex(window.fullAnchorRows, null);

    const contentDiv = document.createElement("div");
    contentDiv.id = "contentPage";
    contentDiv.style.display = "none";

    app.innerHTML = "";
    app.appendChild(indexDiv);
    app.appendChild(contentDiv);
  }

  // ✅ ALWAYS ensure content is rendered
  const contentDiv = document.getElementById("contentPage");

  if (contentDiv && !contentDiv.innerHTML) {
    contentDiv.innerHTML = renderPasuram();
  }

  break;
  }
}


