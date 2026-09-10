// =============================================================
// scriptBanner.js  →  js/utils/scriptBanner.js
//
// A slim banner at the top of the tree page letting the reader
// choose the script the pasurams are shown in.
//
//   Tamil is the default and is what everyone sees until they
//   choose otherwise. Choosing a script stores it and reloads,
//   so every screen picks it up.
//
//   The INTERFACE stays in English regardless — this changes the
//   scripture text only.
//
// Add one line to whatever loads the tree page:
//     import "./utils/scriptBanner.js";
// =============================================================

import { getScript, setScript } from "../api.js";

// Add more entries here as each script is loaded into text_pair.
const SCRIPTS = [
  { code: "ta", label: "தமிழ்",   name: "Tamil"   },
  { code: "te", label: "తెలుగు",  name: "Telugu"  },
  // { code: "ml",   label: "മലയാളം",  name: "Malayalam"  },
  // { code: "kn",   label: "ಕನ್ನಡ",    name: "Kannada"    },
  // { code: "deva", label: "देवनागरी", name: "Devanagari" },
  // { code: "iast", label: "Roman",   name: "Roman"      },
];

function render() {
  if (document.getElementById("script-banner")) return;

  const current = getScript();
  const bar = document.createElement("div");
  bar.id = "script-banner";
  bar.style.cssText = `
    background:#fff8e6;border-bottom:1px solid #e8d8a0;
    padding:7px 10px;text-align:center;font-family:Arial,sans-serif;
    display:flex;align-items:center;justify-content:center;
    gap:6px;flex-wrap:wrap;`;

  const label = document.createElement("span");
  label.textContent = "Read in:";
  label.style.cssText = "font-size:12px;color:#8a7a5a;margin-right:2px";
  bar.appendChild(label);

  for (const s of SCRIPTS) {
    const b = document.createElement("button");
    b.textContent = s.label;
    b.title = s.name;
    const on = s.code === current;
    b.style.cssText = `
      border:1px solid ${on ? "#2f7d32" : "#d8c48a"};
      background:${on ? "#2f7d32" : "#fff"};
      color:${on ? "#fff" : "#4a3728"};
      border-radius:14px;padding:4px 12px;font-size:13px;
      cursor:pointer;font-weight:${on ? "700" : "500"};`;
    b.addEventListener("click", () => {
      if (s.code === current) return;
      setScript(s.code);
      location.reload();          // simplest way to refresh every view
    });
    bar.appendChild(b);
  }

  // Only shown when a non-Tamil script is active, so the default
  // view stays uncluttered.
  if (current !== "ta") {
    const note = document.createElement("span");
    note.textContent = "Text is transliterated — the wording is unchanged.";
    note.style.cssText = "font-size:11px;color:#8a7a5a;width:100%;margin-top:2px";
    bar.appendChild(note);
  }

  // Sit directly above the page content (tree.html uses #app).
  const app = document.getElementById("app") || document.getElementById("contentPage");
  if (app && app.parentNode) app.parentNode.insertBefore(bar, app);
  else document.body.insertBefore(bar, document.body.firstChild);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}