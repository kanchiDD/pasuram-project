export function scrollToExactThirumozhi(sectionId, heading) {

  setTimeout(() => {

    let el;

    // ✅ NORMAL CASE (thirumozhi click)
    if (heading) {
      const safeHeading = String(heading)
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^\p{L}\p{N}]/gu, "");

      const id = `thiru-${sectionId}-${safeHeading}`;
      el = document.getElementById(id);
    }

    // ❌ DO NOT try to guess pathu here
    // Pathu is handled separately via openPathuStart()

    // ✅ FALLBACK (just in case)
    if (!el) {
      const sectionEl = document.getElementById("section-" + sectionId);

      if (sectionEl) {
        el = sectionEl.querySelector('[id^="thiru-"]');
      }
    }

    if (!el) {
      console.warn("❌ Target not found");
      return;
    }

    el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    el.style.background = "#ffff99";
    setTimeout(() => el.style.background = "", 1200);

  }, 100);
}

window.scrollToExactThirumozhi = scrollToExactThirumozhi;