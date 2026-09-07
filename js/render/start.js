import { loadThousand } from "../navigation.js";
import { t } from "../utils/uiStrings.js";
import { testFullThousand } from "../test_fullThousand.js";
import { renderIndex } from "../index.js";
import { state } from "../state.js";

export function renderStart() {

  return `
    <h3>${t("adiyen")}</h3>
    <p>${t("whatWouldYouLike")}</p>

    <div class="tree-list">
      <div class="tree-item" onclick="showFull()">${t("seeFullNaalayiram")}</div>
      <div class="tree-item" onclick="loadThousand()">${t("exploreByThousand")}</div>
      <div class="tree-item" onclick="showIndexTest()">${t("testNewIndex")}</div>
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

  app.innerHTML = t("loadingFullThousand");

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
  app.innerHTML = t("loadingIndex");

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
        ${t("failedLoadIndex")}
      </div>`;
  }
};