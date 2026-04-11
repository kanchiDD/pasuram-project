import { renderThaniyan } from "./render/thaniyan.js";

export function getThaniyanHTML(section, state, context) {

  if (!section || !state?.thaniyanData) return "";

  const mode = Number(section.thaniyan_display_mode ?? 1);
  if (mode === 0) return "";

  const data = state.thaniyanData?.data || state.thaniyanData || [];

  const global = data.filter(t => t.type === "global");
  const sectionOnly = data.filter(t => t.type === "section");

  let html = "";

  const key = context.thousandId ?? "global";

  if (!(key in context.globalTracker)) {
    context.globalTracker[key] = false;
  }

  // MODE 1
  if (mode === 1) {

    if (!context.globalTracker[key] && global.length) {
      html += renderThaniyan(global, state.prosodyMap);
      context.globalTracker[key] = true;
    }

    if (sectionOnly.length) {
      html += renderThaniyan(sectionOnly, state.prosodyMap);
    }
  }

  // MODE 2
  else if (mode === 2) {
    if (sectionOnly.length) {
      html += renderThaniyan(sectionOnly, state.prosodyMap);
    }
  }

  return html;
}