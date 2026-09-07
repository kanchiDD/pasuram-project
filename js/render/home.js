import { startTree } from "../navigation.js";
import { t } from "../utils/uiStrings.js";

export function renderHome() {
  return `
    <button class="tree-btn" onclick="startTree()">
      ${t("showMyTree")}
    </button>
  `;
}

// 🔥 REQUIRED for onclick
window.startTree = startTree;