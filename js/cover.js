
// =========================
// 🔥 COVER ENTRY
// =========================
window.openBookCover = async function(type, thousandName = "") {

  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="cover">
      <div class="cover-frame">

        <!-- 🔱 TOP SYMBOL -->
        <img src="assets/images/vaishnava_transparent.png" class="cover-logo"/>

        <!-- 🔥 SLIDESHOW AREA -->
        <div id="cover-slideshow" class="cover-slideshow"></div>

        <!-- 🔥 SPINNER AREA (full 4000 only) -->
        <div id="cover-spinner" class="cover-spinner hidden"></div>

        <!-- 🔥 FINAL TEXT AREA -->
        <div id="cover-text" class="cover-text hidden"></div>

      </div>
    </div>
  `;

  // =========================
  // 🔥 START DATA LOAD IN PARALLEL
  // Same trigger point as before — no extra cost
  // =========================
  const { testFullThousand } = await import("/js/test_fullThousand.js");

  const isFullMode = (type === "full" || type === null);

  const loadPromise = isFullMode
    ? testFullThousand(null)
    : testFullThousand(type);

  // =========================
  // 🔥 TIMING (measured from console tests)
  // Single thousands : 15 images x 2300ms = 34.5s  (~35s, data ready by ~29s worst case)
  // Full 4000        : 15 images x 3300ms = 49.5s  + ~20s spinner = ~70s (data ready at ~63s)
  // =========================
  const msPerImage = isFullMode ? 3300 : 2300;

  startCoverAnimation(thousandName, loadPromise, msPerImage, isFullMode);
};


// =========================
// 🔥 SLIDESHOW
// =========================
function startCoverAnimation(thousandName, loadPromise, msPerImage, isFullMode) {

  const images = [
    { src: "assets/images/first.png",        name: "ஸ்ரீ பெரிய பெருமாள்  ஸ்ரீ பெரிய பிராட்டியார்" },
    { src: "assets/images/top.png",           name: "ஸ்ரீ நம்மாழ்வார்" },
    { src: "assets/images/poigai.png",        name: "ஸ்ரீ பொய்கை ஆழ்வார்" },
    { src: "assets/images/bootham.png",       name: "ஸ்ரீ பூதத்தாழ்வார்" },
    { src: "assets/images/pei.png",           name: "ஸ்ரீ பேயாழ்வார்" },
    { src: "assets/images/thirumazhisai.png", name: "ஸ்ரீ திருமழிசை ஆழ்வார்" },
    { src: "assets/images/mathurakavi.png",   name: "ஸ்ரீ மதுரகவி ஆழ்வார்" },
    { src: "assets/images/periyazhwar.png",   name: "ஸ்ரீ பெரியாழ்வார்" },
    { src: "assets/images/andal.png",         name: "ஸ்ரீ ஆண்டாள்" },
    { src: "assets/images/kulasekara.png",    name: "ஸ்ரீ குலசேகராழ்வார்" },
    { src: "assets/images/thondar.png",       name: "ஸ்ரீ தொண்டரடிப்பொடி ஆழ்வார்" },
    { src: "assets/images/thiruppanar.png",   name: "ஸ்ரீ திருப்பாணாழ்வார்" },
    { src: "assets/images/bottom.png",        name: "ஸ்ரீ திருமங்கை ஆழ்வார்" },
    { src: "assets/images/left.png",          name: "ஸ்ரீ எம்பெருமானார்" },
    { src: "assets/images/right.png",         name: "ஸ்ரீ மணவாளமாமுனிகள்" }
  ];

  // 🔇 AUDIO REMOVED ENTIRELY

  const slideshow = document.getElementById("cover-slideshow");
  let index = 0;

  function showNext() {

    if (index >= images.length) {
      // Slideshow complete — next phase
      if (isFullMode) {
        showSpinner(loadPromise, thousandName);
      } else {
        showFinalScreen(loadPromise, thousandName);
      }
      return;
    }

    const item = images[index];

    slideshow.innerHTML = `
      <div class="cover-slide">
        <div class="cover-image" style="background-image:url(${item.src})"></div>
        <div class="cover-caption">${item.name}</div>
      </div>
    `;

    index++;
    setTimeout(showNext, msPerImage);
  }

  showNext();
}


// =========================
// 🔥 SPINNER PHASE
// Full 4000 only — bridges the ~14s gap between slideshow end (~50s) and data ready (~63s)
// =========================
async function showSpinner(loadPromise, thousandName) {

  const slideshow  = document.getElementById("cover-slideshow");
  const spinnerBox = document.getElementById("cover-spinner");

  slideshow.style.display = "none";
  spinnerBox.classList.remove("hidden");

  spinnerBox.innerHTML = `
    <div class="spinner-wrap">

      <div class="spinner-lotus">❀</div>

      <div class="spinner-title">Naalayira Divya Prabandham</div>

      <div class="spinner-msg">
        Loading all 4000 Pasurams &amp; Index&hellip;
      </div>

      <div class="spinner-bar-track">
        <div class="spinner-bar-fill" id="spinnerBarFill"></div>
      </div>

      <div class="spinner-sub">
        Honoring the 12 Azhwars &amp; their divine compositions
      </div>

    </div>
  `;

  // Animate progress bar over 16s — safe buffer before data arrives at ~13s remaining
  animateProgressBar("spinnerBarFill", 16000);

  // Wait for actual data then proceed
  await loadPromise;

  showFinalScreen(loadPromise, thousandName);
}


// =========================
// 🔥 SMOOTH PROGRESS BAR
// Fills to 95% over durationMs, jumps to 100% when data is ready
// =========================
function animateProgressBar(id, durationMs) {

  const fill  = document.getElementById(id);
  if (!fill) return;

  const start = Date.now();

  function step() {
    const elapsed = Date.now() - start;
    const pct     = Math.min((elapsed / durationMs) * 95, 95);

    const el = document.getElementById(id);
    if (el) el.style.width = pct + "%";

    if (elapsed < durationMs && document.getElementById(id)) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}


// =========================
// 🔥 FINAL SCREEN
// Shown after slideshow (1000s) or after spinner (full 4000)
// "Take me to Index" button only appears when data is confirmed ready
// =========================
async function showFinalScreen(loadPromise, thousandName) {

  const slideshow  = document.getElementById("cover-slideshow");
  const spinnerBox = document.getElementById("cover-spinner");
  const textBox    = document.getElementById("cover-text");

  slideshow.style.display  = "none";
  spinnerBox.style.display = "none";
  textBox.classList.remove("hidden");

  // Guarantee data is ready before showing button
  const html = await loadPromise;

  // Complete progress bar if spinner was shown
  const fill = document.getElementById("spinnerBarFill");
  if (fill) fill.style.width = "100%";

  textBox.innerHTML = `
    <div class="cover-final">

      <div class="line1">
        மயர்வற மதிநலம் அருளப்பெற்ற ஆழ்வார்களின் அருளிச்செயலான
      </div>

      <div class="line2">
        நாலாயிர திவ்யப்பிரபந்தம்
      </div>

      <div class="line3">
        ${thousandName}
      </div>

      <button id="enterBtn">Take me to Index</button>

    </div>
  `;

  document.getElementById("enterBtn").onclick = () => {
    const cover = document.querySelector(".cover");
    cover.style.opacity   = "0";
    cover.style.transition = "opacity 0.5s ease";

    setTimeout(() => {
      document.getElementById("app").innerHTML = html;
    }, 500);
  };
}
