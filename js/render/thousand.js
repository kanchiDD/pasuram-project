import { state } from "../state.js";
import { t as uiText } from "../utils/uiStrings.js";
import { selectThousand } from "../navigation.js";

export function renderThousand() {

  if (!state.thousandData) return `<div>${uiText("loading")}</div>`;

  return `
  <h3>${uiText("adiyen")}</h3>
  <p>${uiText("selectAnOption")}</p>

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