import { startTree } from "../navigation.js";
import { t as uiText } from "../utils/uiStrings.js";

export function renderHome() {
  return `
    <button class="tree-btn" onclick="startTree()">
      ${uiText("showMyTree")}
    </button>
  `;
}

// 🔥 REQUIRED for onclick
window.startTree = startTree;