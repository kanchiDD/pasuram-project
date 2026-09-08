import { state } from "../state.js";
import { t as uiText } from "../utils/uiStrings.js";
import { selectSection } from "../navigation.js";
import { sectionAllowedForSect } from "../utils/sectUtils.js";

export function renderSection() {

  if (!state.sectionData) return `<div>${uiText("loading")}</div>`;

  // Server filters T vs V, but only the frontend knows the madam (VM)
  // distinction — this keeps 52/53 out of the menu for plain-V users.
  const visible = state.sectionData.filter(s => sectionAllowedForSect(s.id));

  return `
    <h3>${uiText("adiyen")}</h3>
    <p>${uiText("selectASection")}</p>

    ${visible.map(s => `
      <div class="tree-item" onclick="selectSection(${s.id}, \`${s.name}\`)">
        ${s.name}
      </div>
    `).join("")}
  `;
}

window.selectSection = selectSection;