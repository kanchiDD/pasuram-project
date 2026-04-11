import { state } from "../state.js";
import { renderHome } from "./home.js";
import { renderStart } from "./start.js";
import { renderThousand } from "./thousand.js";
import { renderOptions } from "./options.js";
import { renderSection } from "./section.js";
import { renderPasuram } from "./pasuram.js";

export function render() {

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
      app.innerHTML = renderPasuram();
      break;
  }
}