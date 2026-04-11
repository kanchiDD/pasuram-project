import { state } from "../state.js";
import { selectSection } from "../navigation.js";

export function renderSection() {

  if (!state.sectionData) return `<div>Loading...</div>`;

  return `
    <h3>Adiyen 🙏</h3>
    <p>Select a Section</p>

    ${state.sectionData.map(s => `
      <div class="tree-item" onclick="selectSection(${s.id}, \`${s.name}\`)">
        ${s.name}
      </div>
    `).join("")}
  `;
}

window.selectSection = selectSection;