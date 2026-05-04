import { state } from "../state.js";
import { renderHome } from "./home.js";
import { renderStart } from "./start.js";
import { renderThousand } from "./thousand.js";
import { renderOptions } from "./options.js";
import { renderSection } from "./section.js";
import { renderPasuram } from "./pasuram.js";
import { renderIndex } from "../index.js";
import { renderMadal, renderKootrirukkai } from "./special.js";
import { renderKoil } from "../koil.js";

// 🔥 NEW — import both feature renderers
import { renderFullThaniyans } from "./fullThaniyans.js";
import { renderFullDualRecital, dualRecitalSpinner } from "./fullDualRecital.js";
import { renderFullAzhwars, azhwarSpinner } from "./fullAzhwars.js";
import { renderFullDivyadesam, divyadesamSpinner } from "./fullDivyadesam.js";
import { renderFullNithyanusandhanam } from "./fullNithyanusandhanam.js";
import { renderMunnadiPinnadi, munnadiSpinner } from "./munnadiPinnadiRender.js";

export function render() {

console.log("LEVEL BEFORE RENDER:", state.level);

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

    case "KOIL":
      topbar.style.display = "flex";
      renderKoil(state.koilType); // ✅ just call it, don't assign — it handles its own DOM
      break;

    // =========================
    // 🔥 FULL THANIYANS
    // state.thaniyansThousandId:
    //   null  → entire 4000 (global thaniyan once + all sections)
    //   1–4   → only that thousand's thaniyans
    // =========================
    case "FULL_THANIYANS":
      topbar.style.display = "flex";
      app.innerHTML = dualRecitalSpinner(); // 🪷 lotus spinner
      renderFullThaniyans(state.thaniyansThousandId).then(html => {
        app.innerHTML = html;
      });
      break;

    // =========================
    // 🔥 DUAL RECITAL (★★ PASURAMS)
    // =========================
    case "FULL_DUAL_RECITAL":
      topbar.style.display = "flex";
      app.innerHTML = dualRecitalSpinner(); // 🪷 lotus spinner
      renderFullDualRecital(state.dualRecitalThousandId).then(html => {
        app.innerHTML = html;
      });
      break;

    // =========================
    // 🔥 NITHYANUSANDHANAM
    case "NITHYANUSANDHANAM":
      app.innerHTML = divyadesamSpinner(); // reuse spinner
      renderFullNithyanusandhanam().then(html => { app.innerHTML = html; });
      break;

    // 🔥 DIVYADESAM
    // =========================
    case "FULL_DIVYADESAM":
      topbar.style.display = "flex";
      app.innerHTML = divyadesamSpinner();
      renderFullDivyadesam(state.divyadesamThousandId).then(html => {
        app.innerHTML = html;
      });
      break;

    // =========================
    // 🔥 AZHWARS
    // =========================
    case "FULL_AZHWARS":
      topbar.style.display = "flex";
      app.innerHTML = azhwarSpinner(); // 🪷 lotus spinner
      renderFullAzhwars(state.azhwarsThousandId).then(html => {
        app.innerHTML = html;
      });
      break;

    // =========================
    // 🔥 MUNNADI PINNADI
    // state.munnadiThousandId: null=full 4000, 1-4=that thousand
    // =========================
    case "MUNNADI_PINNADI":
      topbar.style.display = "flex";
      app.innerHTML = munnadiSpinner();
      renderMunnadiPinnadi(
        state.munnadiThousandId === null ? "full" : "1000",
        state.munnadiThousandId
      ).then(html => { app.innerHTML = html; });
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
      if (contentDiv && !state.isPathuSelectionActive) {

        contentDiv.style.display = "block";

        // 🔥 SPECIAL SECTIONS (NO pasuramData needed)
        if (state.madalData || state.kootrirukkaiData) {
          contentDiv.innerHTML = renderPasuram();
          return;
        }

        // 🔥 NORMAL FLOW
        if (state.pasuramData) {
          contentDiv.innerHTML = renderPasuram();
        }
      }

      break;
  }
}
