import { state } from "../state.js";
import { t } from "../utils/uiStrings.js";
import { selectThousand } from "../navigation.js";

export function renderThousand() {

  if (!state.thousandData) return `<div>${t("loading")}</div>`;

  return `
  <h3>${t("adiyen")}</h3>
  <p>${t("selectAnOption")}</p>

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