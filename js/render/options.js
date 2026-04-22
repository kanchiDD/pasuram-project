import { loadSections } from "../navigation.js";
import { state } from "../state.js";

export function renderOptions() {

  const names = {
    1: "Mudalaayiram",
    2: "Irandaam Aayiram",
    3: "Moondraam Aayiram/Iyarpa",
    4: "Naangaam Aayiram"
  };

  const isNaalayiram = Number(state.selectedThousandId) === 5;

  // =========================
  // 🔥 SPECIAL MENU (5th ITEM)
  // =========================
  if (isNaalayiram) {

    return `
      <h3>Adiyen 🙏</h3>
      <p>Select an Option</p>

      <div class="tree-list">

        <div class="tree-item" onclick="comingSoon()">Azhwars</div>

        <div class="tree-item" onclick="comingSoon()">Divyadesam</div>

        <div class="tree-item" onclick="comingSoon()">Nithyaanusandanam</div>

        <div class="tree-item" onclick="comingSoon()">Koil Thirumozhi</div>

        <div class="tree-item" onclick="comingSoon()">Koil Thiruvaimozhi</div>

        <div class="tree-item" onclick="showFullNaalayiram()">
          Full NaalayiraDivyaprabandham
        </div>

      </div>
    `;
  }

  // =========================
  // ✅ NORMAL FLOW (1–4)
  // =========================

  const title = names[state.selectedThousandId] || "Naalayiram";

  return `
    <h3>Adiyen 🙏</h3>
    <p>Please Select an Option</p>

    <div class="tree-list">
      <div class="tree-item" onclick="loadSections()">Arulicheyal (Sections)</div>
      <div class="tree-item" onclick="comingSoon()">Azhwars</div>
      <div class="tree-item" onclick="comingSoon()">Divyadesam</div>

      <div class="tree-item" onclick="showFullByThousand(${state.selectedThousandId})">
        Show Full ${title}
      </div>
    </div>
  `;
}


window.showFullNaalayiram = async function () {

  const app = document.getElementById("app");

  const { testFullThousand } = await import("../test_fullThousand.js");

 // ✅ FIXED: explicitly pass null for full 4000
  const html = await testFullThousand(null);


  app.innerHTML = html;
};


window.showFullByThousand = async function (thousandId) {

  const app = document.getElementById("app");

  const { testFullThousand } = await import("../test_fullThousand.js");

  const html = await testFullThousand(thousandId);

  app.innerHTML = html;
};

// =========================
// 🔥 COMMON HELPERS
// =========================
window.comingSoon = window.comingSoon || function () {
  alert("Coming soon");
};

window.loadSections = loadSections;