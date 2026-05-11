import { loadThousand } from "../navigation.js";
import { testFullThousand } from "../test_fullThousand.js";
import { renderIndex } from "../index.js";
import { state } from "../state.js";

export function renderStart() {

  return `
    <h3>Adiyen 🙏</h3>
    <p>What would you like to do?</p>

    <div class="tree-list">
      <div class="tree-item" onclick="showFull()">See Full Naalayiram</div>
      <div class="tree-item" onclick="loadThousand()">Explore by Thousand</div>
      <div class="tree-item" onclick="showIndexTest()">Test New Index</div>
    </div>
  `;
}

// expose
window.loadThousand = loadThousand;

// ==========================================
// 🔥 FULL VIEW (UNCHANGED)
// ==========================================
window.showFull = async function () {

  const app = document.getElementById("app");

  app.innerHTML = "Loading full thousand...";

  const html = await testFullThousand();

  app.innerHTML = html;
};

// keep existing binding
window.showFull = showFull;

// ==========================================
// ✅ NEW INDEX TEST (CLEAN PIPELINE)
// ==========================================
window.showIndexTest = async function () {

  const app = document.getElementById("app");
  app.innerHTML = "Loading index...";

  try {

    const res = await fetch(
      "https://cdnaalayiram-api.kanchitrust.workers.dev/api/anchor-map?thousand_id=1"
    );

    if (!res.ok) {
      throw new Error("API ERROR: " + res.status);
    }

    const rows = await res.json();

    console.log("RAW ROWS:", rows);

    // 🔥 IMPORTANT
    state.fullData = rows;

    // 🔥 RENDER INDEX
    app.innerHTML = renderIndex(rows);

  } catch (err) {

    console.error("INDEX LOAD ERROR:", err);

    app.innerHTML =
      `<div style="padding:20px;color:red">
        Failed to load index
      </div>`;
  }
};