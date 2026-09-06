import { state } from "../state.js";
import { selectSection } from "../navigation.js";
import { sectionAllowedForSect } from "../utils/sectUtils.js";

export function renderSection() {

  if (!state.sectionData) return `<div>Loading...</div>`;

  // Server filters T vs V, but only the frontend knows the madam (VM)
  // distinction — this keeps 52/53 out of the menu for plain-V users.
  const visible = state.sectionData.filter(s => sectionAllowedForSect(s.id));

  return `
    <h3>Adiyen 🙏</h3>
    <p>Select a Section</p>

    ${visible.map(s => `
      <div class="tree-item" onclick="selectSection(${s.id}, \`${s.name}\`)">
        ${s.name}
      </div>
    `).join("")}
  `;
}

window.selectSection = selectSection;