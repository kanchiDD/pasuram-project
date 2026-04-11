import { state } from "../state.js";
import { selectThousand } from "../navigation.js";

export function renderThousand() {

  if (!state.thousandData) return `<div>Loading...</div>`;

  return `
  <h3>Adiyen 🙏</h3>
  <p>Select an Option</p>

  <div class="tree-list">
    ${state.thousandData.map(t => `
  <div class="tree-item" onclick="selectThousand(${t.id})">
    ${t.name}
  </div>
`).join("")}
  </div>
`;
}

window.selectThousand = selectThousand;