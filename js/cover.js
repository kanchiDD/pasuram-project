
let coverAudio;

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

        <!-- 🔥 IMAGE AREA -->
        <div id="cover-slideshow" class="cover-slideshow"></div>

        <!-- 🔥 TEXT AREA -->
        <div id="cover-text" class="cover-text hidden"></div>

      </div>

    </div>
  `;

  startCoverAnimation(type, thousandName);
};


async function startCoverAnimation(type, thousandName) {

  // =========================
  // 🔥 EXACT ORDER (EDIT ONLY HERE)
  // =========================
  const images = [
  { src: "assets/images/first.png", name: "ஸ்ரீ பெரிய பெருமாள்  ஸ்ரீ பெரிய பிராட்டியார்" },
  { src: "assets/images/top.png", name: "ஸ்ரீ நம்மாழ்வார்" },
  { src: "assets/images/poigai.png", name: "ஸ்ரீ பொய்கை ஆழ்வார்" },
  { src: "assets/images/bootham.png", name: "ஸ்ரீ பூதத்தாழ்வார்" },
  { src: "assets/images/pei.png", name: "ஸ்ரீ பேயாழ்வார்" },
  { src: "assets/images/thirumazhisai.png", name: "ஸ்ரீ திருமழிசை ஆழ்வார்" },
  { src: "assets/images/mathurakavi.png", name: "ஸ்ரீ மதுரகவி ஆழ்வார்" },
  { src: "assets/images/periyazhwar.png", name: "ஸ்ரீ பெரியாழ்வார்" },
  { src: "assets/images/andal.png", name: "ஸ்ரீ ஆண்டாள்" },
  { src: "assets/images/kulasekara.png", name: "ஸ்ரீ குலசேகராழ்வார்" },
  { src: "assets/images/thondar.png", name: "ஸ்ரீ தொண்டரடிப்பொடி ஆழ்வார்" },
  { src: "assets/images/thiruppanar.png", name: "ஸ்ரீ திருப்பாணாழ்வார்" },
  { src: "assets/images/bottom.png", name: "ஸ்ரீ திருமங்கை ஆழ்வார்" },
  { src: "assets/images/left.png", name: "ஸ்ரீ எம்பெருமானார்" },
  { src: "assets/images/right.png", name: "ஸ்ரீ மணவாளமாமுனிகள்" }
];


  const slideshow = document.getElementById("cover-slideshow");

  // =========================
  // 🔊 AUDIO (SAFE START)
  // =========================
  try {
  coverAudio = new Audio("assets/audio/srisailesa.mp3");
  coverAudio.volume = 0.6;
  coverAudio.play().catch(() => {});
} catch (e) {
  console.warn("Audio not loaded");
}

  // =========================
  // 🔥 START DATA LOAD
  // =========================
  const { testFullThousand } = await import("/js/test_fullThousand.js");

  const loadPromise =
    type === "full"
      ? testFullThousand(null)
      : testFullThousand(type);

  // =========================
  // 🔥 SLIDESHOW LOOP
  // =========================
  let index = 0;

  function showNext() {

    if (index >= images.length) {

      showFinalScreen(loadPromise, thousandName);
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

    setTimeout(showNext, 3500); // 🔥 slower (good feel)
  }

  showNext();
}

async function showFinalScreen(loadPromise, thousandName) {

  const textBox = document.getElementById("cover-text");
  const slideshow = document.getElementById("cover-slideshow");

  // 🔥 clear slideshow
  slideshow.style.display = "none";   // 🔥 hide slideshow completely

  // 🔥 show text container
  textBox.classList.remove("hidden");

  // 🔥 wait for data + small delay
  const [html] = await Promise.all([
    loadPromise,
    new Promise(r => setTimeout(r, 800))
  ]);

  // 🔥 render final content
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

  // 🔥 button action
  document.getElementById("enterBtn").onclick = () => {

  if (coverAudio) {
    coverAudio.pause();
    coverAudio.currentTime = 0;
  }

  const cover = document.querySelector(".cover");

  cover.style.opacity = 0;

  setTimeout(() => {
    document.getElementById("app").innerHTML = html;
  }, 500);
};
}


