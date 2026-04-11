import { startTree } from "../navigation.js";

export function renderHome() {
  return `
    <button class="tree-btn" onclick="startTree()">
      Show My Naalayiram Tree
    </button>
  `;
}

// 🔥 REQUIRED for onclick
window.startTree = startTree;