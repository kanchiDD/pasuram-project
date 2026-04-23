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
  // 🔥 SPECIAL MENU (FULL 4000)
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

        <!-- 🔥 FULL BOOK IMAGE -->
        <div class="book-image-card" onclick="showFullNaalayiram()">
          <img src="assets/images/full.png" class="book-img"/>
          <div class="book-label">Click to Open</div>
        </div>

      </div>
    `;
  }

  // =========================
  // ✅ NORMAL FLOW (1–4)
  // =========================

  const title = names[state.selectedThousandId] || "Naalayiram";

  const imageMap = {
    1: "mudal.png",
    2: "irandaam.png",
    3: "moonraam.png",
    4: "naangu.png"
  };

  const imageName = imageMap[state.selectedThousandId];

  return `
    <h3>Adiyen 🙏</h3>
    <p>Please Select an Option</p>

    <div class="tree-list">
      <div class="tree-item" onclick="loadSections()">Arulicheyal (Sections)</div>
      <div class="tree-item" onclick="comingSoon()">Azhwars</div>
      <div class="tree-item" onclick="comingSoon()">Divyadesam</div>

      <!-- 🔥 BOOK IMAGE -->
      <div class="book-image-card" onclick="showFullByThousand(${state.selectedThousandId})">
        <img src="assets/images/${imageName}" class="book-img"/>
        <div class="book-label">Click to Open</div>
      </div>

    </div>
  `;
}


// =========================
// 🔥 COVER LINKS
// =========================

window.showFullNaalayiram = function () {
  openBookCover("full", "நாலாயிர திவ்யப்பிரபந்தம்");
};

window.showFullByThousand = function (thousandId) {

  const names = {
    1: "முதலாமாயிரம்",
    2: "இரண்டாமாயிரம்",
    3: "மூன்றாமாயிரம்",
    4: "நான்காமாயிரம்"
  };

  const name = names[thousandId] || "";

  openBookCover(thousandId, name);
};


// =========================
// 🔥 COMMON HELPERS
// =========================

window.comingSoon = window.comingSoon || function () {
  alert("Coming soon");
};

window.loadSections = loadSections;