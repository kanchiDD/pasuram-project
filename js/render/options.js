import { loadSections } from "../navigation.js";
import { state } from "../state.js";
import "../cover.js"; // 🔥 ensures window.openBookCover is registered before any click

export function renderOptions() {

  const names = {
    1: "Mudalaayiram",
    2: "Irandaam Aayiram",
    3: "Moondraam Aayiram/Iyarpa",
    4: "Naangaam Aayiram"
  };

  const isNaalayiram = Number(state.selectedThousandId) === 5; 
  const isItaram     = Number(state.selectedThousandId) === 99;


  // =========================
  // 🔥 SPECIAL MENU (FULL 4000)
  // =========================
  if (isNaalayiram) {

    return `
      <h3>Adiyen 🙏</h3>
      <p>Select an Option</p>

      <div class="tree-list">
        <div class="tree-item" onclick="openDualRecital(null)">Rettai/Star Pasurams</div>
        <div class="tree-item" onclick="openFullThaniyans(null)">Nallayira Thaniyangal</div>
        <div class="tree-item" onclick="openAzhwars(null)">Azhwars</div>
        <div class="tree-item" onclick="openDivyadesam(null)">Divyadesam</div>
        <div class="tree-item" onclick="openNithyanusandhanam()">Nithyaanusandanam</div>
        <div class="tree-item" onclick="openMunnadiPinnadi(null)">Munnadi Pinnadi</div>
        <div class="tree-item" onclick="openKoil('THIRUMOZHI')">Koil Thirumozhi</div>
        <div class="tree-item" onclick="openKoil('THIRUVAIMOZHI')">Koil Thiruvaimozhi</div>
        <div class="tree-item" onclick="openSattrumurai(null)">Sattrumurai</div>
        <div class="tree-item" onclick="openStarPasuram()">Star & Pasuram</div>
        <div class="tree-item" onclick="openDivyadesamArchanai()">108 Divyadesa Archanai</div>
        <div class="tree-item" onclick="openAzhwarThirunatchathra()">Azhwar Thirunatcharam Goshti</div>
        <div class="tree-item" onclick="openRegister()">Register / Sign In</div>
        <div class="tree-item" onclick="openRecitalPlan()">My Recital Plan</div>
        <div class="tree-item" onclick="openDivyadesamSpinner()">Divyadesam Spinner</div>

        <!-- 🔥 FULL BOOK IMAGE -->
        <div class="book-image-card" onclick="showFullNaalayiram()">
          <img src="assets/images/full.png" class="book-img"/>
          <div class="book-label">Click to Open</div>
        </div>

      </div>
    `;
  }

if (isItaram) {
  return `
    <h3>Adiyen 🙏</h3>
    <p>இதர பிரபந்தங்கள்</p>
    <div class="tree-list">
      <div class="tree-item" onclick="loadSections()">Arulicheyal (Sections)</div>
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

  const imageName = imageMap[state.selectedThousandId] || "full.png";

  return `
    <h3>Adiyen 🙏</h3>
    <p>Please Select an Option</p>

    <div class="tree-list">
      <div class="tree-item" onclick="loadSections()">Arulicheyal (Sections)</div>
      <div class="tree-item" onclick="openAzhwars(${state.selectedThousandId})">Azhwars</div>
      <div class="tree-item" onclick="openDualRecital(${state.selectedThousandId})">Rettai/Star Pasurams</div>
      <div class="tree-item" onclick="openFullThaniyans(${state.selectedThousandId})">Thaniyangal</div>
      <div class="tree-item" onclick="openDivyadesam(${state.selectedThousandId})">Divyadesam</div>
      <div class="tree-item" onclick="openMunnadiPinnadi(${state.selectedThousandId})">Munnadi Pinnadi</div>
      <div class="tree-item" onclick="openSattrumurai(${state.selectedThousandId})">Sattrumurai</div>
      <div class="tree-item" onclick="openRegister()">Register / Sign In</div>

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
// 🔥 THANIYANS LINK
// null  → full 4000 (from NAALAYIRAM menu)
// 1–4   → that thousand only (from per-thousand menu)
// =========================
window.openFullThaniyans = function (thousandId) {
  state.thaniyansThousandId = thousandId; // null = full 4000
  state.level = "FULL_THANIYANS";
  // import render() lazily to avoid circular deps
  import("./layout.js").then(m => m.render());
};


// =========================
// 🔥 NITHYANUSANDHANAM LINK
window.openNithyanusandhanam = function() {
  state.level = "NITHYANUSANDHANAM";
  import("./layout.js").then(m => m.render());
};

// 🔥 DIVYADESAM LINK
// =========================
window.openDivyadesam = function (thousandId) {
  state.divyadesamThousandId = thousandId;
  state.level = "FULL_DIVYADESAM";
  import("./layout.js").then(m => m.render());
};

// =========================
// 🔥 AZHWARS LINK
// null  → full 4000 (from NAALAYIRAM menu)
// 1–4   → that thousand only (from per-thousand menu)
// =========================
window.openAzhwars = function (thousandId) {
  state.azhwarsThousandId = thousandId;
  state.level = "FULL_AZHWARS";
  import("./layout.js").then(m => m.render());
};
window.openDualRecital = function (thousandId) {
  state.dualRecitalThousandId = thousandId; // null = full 4000
  state.level = "FULL_DUAL_RECITAL";
  import("./layout.js").then(m => m.render());
};


// =========================
// 🔥 MUNNADI PINNADI LINK
// null → full 4000, 1-4 → that thousand
// =========================
window.openMunnadiPinnadi = function (thousandId) {
  state.munnadiThousandId = thousandId;
  state.level = "MUNNADI_PINNADI";
  import("./layout.js").then(m => m.render());
};

window.openSattrumurai = function (thousandId) {
  // thousandId = null  → full 4000, fetch ALL sattrumurais for dropdown
  // thousandId = 1–4   → fetch only that thousand's sattrumurais
  state.sattrumuraiThousandId = thousandId;
  state.sattrumuraiId = null; // renderer auto-picks first from list
  state.level = "SATTRUMURAI";
  import("./layout.js").then(m => m.render());
};

window.openStarPasuram = function() {
  state.level = "STAR_PASURAM";
  state.starName = null;
  import("./layout.js").then(m => m.render());
};

window.openDivyadesamArchanai = function() {
  state.level = "DIVYADESAM_ARCHANAI";
  import("./layout.js").then(m => m.render());
};

window.openAzhwarThirunatchathra = function() {
  state.level = "AZHWAR_THIRUNATCHATHRA";
  import("./layout.js").then(m => m.render());
};


// =========================
// 🔥 REGISTER / SIGN IN
// =========================
window.openRegister = function() {
  window.location.href = "register.html";
};

window.openRecitalPlan = function() {
  state.level = "RECITAL";
  import("./layout.js").then(m => m.render());
};

window.openDivyadesamSpinner = function() {
  window.location.href = "spinner.html";
};


// =========================
// 🔥 COMMON HELPERS
// =========================

window.comingSoon = window.comingSoon || function () {
  alert("Coming soon");
};

window.loadSections = loadSections;
