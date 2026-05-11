import { renderPasuram } from "./pasuram.js";
import { render } from "./layout.js";
import { state } from "../state.js";

export function openStandaloneSelector(sectionId, sectionName, data) {

     const container = document.getElementById("modalRoot");
  // 🔥 UNIQUE THIRUMOZHI
  const map = {};

  data.forEach(p => {
    if (p.thirumozhi_heading) {
      map[p.thirumozhi_heading] = {
        name: p.thirumozhi_heading,
        section_id: p.section_id
      };
    }
  });

  const list = Object.values(map);

  let html = `
  <div class="overlay">
    <div class="adiyen-modal">

      <div class="modal-header">
        🙏 Adiyen
        <span id="closeModal">✖</span>
      </div>

      <div class="adiyen-question">
  Do you want:
</div>

<div class="adiyen-options">

  <label class="option">
    <input type="radio" name="mode" value="full">
    Full ${sectionName}
  </label>

  <div class="adiyen-sub-divider">
    — OR (select any one) —
  </div>

        
  `;

  // ✅ FIXED LABEL TEXT
  list.forEach((t, i) => {
    html += `
      <label class="option">
        <input type="radio" name="mode" value="thiru_${t.name}">
        ${i + 1}ம் திருமொழி – ${t.name}
      </label>
    `;
  });

  html += `
      </div>
    </div>
  </div>
  `;

  container.innerHTML = html;

  // ❌ CLOSE (DON'T reload site)
  document.getElementById("closeModal").onclick = () => {
    container.innerHTML = "";
  };

  // 🎯 CLICK HANDLER (FIXED)
  const radios = container.querySelectorAll('input[name="mode"]');

  radios.forEach(r => {
  r.onclick = () => {

    const val = r.value;

    // ✅ FULL
    if (val === "full") {

      container.innerHTML = "";

      // 🔥 USE EXISTING FLOW (SAFE)
      state.pasuramData = data;
     state.isStandaloneSelection = false;
     state.level = "PASURAM";   // ✅ ADD THIS LINE
      render();
      return;
    }

    // ✅ THIRUMOZHI
    if (val.startsWith("thiru_")) {

      const heading = val.replace("thiru_", "");

      const filtered = data.filter(
        p => p.thirumozhi_heading === heading
      );

      if (filtered.length) {

        container.innerHTML = "";

        // 🔥 KEY FIX — DO NOT call renderPasuram
        state.pasuramData = filtered;
        state.level = "PASURAM";   // 🔥 ADD THIS LINE
        render();
      }
    }

  };
});

}