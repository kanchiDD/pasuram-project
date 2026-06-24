/* ================= LANDSCAPE FIX (injected via JS — bypasses SW cache) ================= */
(function () {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 900px) and (orientation: landscape) {
      .nav { display: none !important; }
      .hamburger { display: block !important; }
      .mobile-menu { overflow-y: auto; padding-top: 10px; padding-bottom: 20px; }
      .header { padding: 6px 10px !important; }
      .center-block img { height: 40px !important; }
      .site-title { font-size: 14px !important; }
      .content { padding: 0 12px; margin: 10px auto; }
      .cover { min-height: unset !important; padding: 10px 0; }
    }
  `;
  document.head.appendChild(style);
})();

function loadLayout() {

  /* ================= HEADER ================= */
  fetch("components/header.html?v=" + Date.now())
    .then(response => {
      if (!response.ok) {
        throw new Error("Header not found: " + response.status);
      }
      return response.text();
    })
    .then(html => {
      const headerEl = document.getElementById("header");

      if (headerEl) {
        headerEl.innerHTML = html;
        console.log("✅ Header loaded");

        // attach menu AFTER header is injected
        attachMenuHandlers();
      } else {
        console.error("❌ #header element missing in HTML");
      }
    })
    .catch(err => {
      console.error("❌ HEADER LOAD ERROR:", err);
    });


  /* ================= FOOTER ================= */
  fetch("components/footer.html")
    .then(response => {
      if (!response.ok) {
        throw new Error("Footer not found: " + response.status);
      }
      return response.text();
    })
    .then(html => {
      const footerEl = document.getElementById("footer");

      if (footerEl) {
        footerEl.innerHTML = html;
        console.log("✅ Footer loaded");
      } else {
        console.error("❌ #footer element missing in HTML");
      }
    })
    .catch(err => {
      console.error("❌ FOOTER LOAD ERROR:", err);
    });
}


/* ========================= */
/* 🔥 GLOBAL MENU FUNCTION */
/* ========================= */

function attachMenuHandlers() {

  window.toggleMenu = function () {

    const menu = document.getElementById("mobileMenu");
    const overlay = document.getElementById("overlay");

    if (!menu || !overlay) {
      console.warn("⚠️ Menu or overlay missing");
      return;
    }

    const isOpen = menu.classList.contains("show");

    if (isOpen) {
      menu.classList.remove("show");
      overlay.classList.remove("show");
    } else {
      menu.classList.add("show");
      overlay.classList.add("show");
    }
  };

}