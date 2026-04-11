import { loadThousand } from "../navigation.js";
import { testFullThousand } from "../test_fullThousand.js";

export function renderStart() {
 

  return `
    <h3>Adiyen 🙏</h3>
    <p>What would you like to do?</p>

    <div class="tree-list">
      <div class="tree-item" onclick="showFull()">See Full Naalayiram</div>
      <div class="tree-item" onclick="loadThousand()">Explore by Thousand</div>
    </div>
  `;
}
// expose
window.loadThousand = loadThousand;

// 🔥 ADD THIS
window.showFull = async function () {

  const app = document.getElementById("app");

  app.innerHTML = "Loading full thousand...";

  const html = await testFullThousand();

  app.innerHTML = html;
};


// 🔥 TEMP TEST HOOK (SAFE)
window.startFullThousand = function (thousandId) {
  startRecitalByThousand(thousandId);
};

window.showFull = showFull;