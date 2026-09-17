// =============================================================
// contentStrings.js  →  js/utils/contentStrings.js
//
// Content strings that live in the renderers rather than in a
// content table: முற்றிற்று, இதர பிரபந்தங்கள், the cover captions,
// and the 31 ceremonial section titles.
//
// These are CONTENT, not interface — they transliterate with the
// rest of the scripture, they do not become English. uiStrings.js
// remains the place for interface chrome.
//
// Tamil is the built-in default below, so the Tamil path needs no
// network call at all and behaves exactly as it always has. When a
// script is active, ensureContentStrings() fetches the converted
// set once from /api/ui-text and c() returns those instead.
// =============================================================

const TAMIL = {
  "common.muttrittru": "முற்றிற்று",
  "common.thaniyan": "தனியன்",
  "common.pothu.thaniyan": "பொது தனியன்",
  "thy.page.subtitle": "தனியன்கள் — முழு தொகுப்பு",
  "common.sri": "ஸ்ரீ",
  "azh.index.title": "ஆழ்வார்கள் — அட்டவணை",
  "azh.page.subtitle": "ஆழ்வார்கள் — அருளிச்செயல்",
  "common.naalayiram": "நாலாயிர திவ்யப்பிரபந்தம்",
  "common.ithara": "இதர பிரபந்தங்கள்",
  "cover.line1": "மயர்வற மதிநலம் அருளப்பெற்ற ஆழ்வார்களின் அருளிச்செயலான",
  "cover.img.first": "ஸ்ரீ பெரிய பெருமாள்  ஸ்ரீ பெரிய பிராட்டியார்",
  "cover.img.top": "ஸ்ரீ நம்மாழ்வார்",
  "cover.img.poigai": "ஸ்ரீ பொய்கை ஆழ்வார்",
  "cover.img.bootham": "ஸ்ரீ பூதத்தாழ்வார்",
  "cover.img.pei": "ஸ்ரீ பேயாழ்வார்",
  "cover.img.thirumazhisai": "ஸ்ரீ திருமழிசை ஆழ்வார்",
  "cover.img.mathurakavi": "ஸ்ரீ மதுரகவி ஆழ்வார்",
  "cover.img.periyazhwar": "ஸ்ரீ பெரியாழ்வார்",
  "cover.img.andal": "ஸ்ரீ ஆண்டாள்",
  "cover.img.kulasekara": "ஸ்ரீ குலசேகராழ்வார்",
  "cover.img.thondar": "ஸ்ரீ தொண்டரடிப்பொடி ஆழ்வார்",
  "cover.img.thiruppanar": "ஸ்ரீ திருப்பாணாழ்வார்",
  "cover.img.bottom": "ஸ்ரீ திருமங்கை ஆழ்வார்",
  "cover.img.left": "ஸ்ரீ எம்பெருமானார்",
  "cover.img.right": "ஸ்ரீ மணவாளமாமுனிகள்",
  "sec.title.1": "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த திருப்பல்லாண்டு",
  "sec.title.2": "ஸ்ரீ பெரியாழ்வார் அருளிச்செய்த பெரியாழ்வார் திருமொழி",
  "sec.title.3": "ஸ்ரீ ஆண்டாள் அருளிச்செய்த திருப்பாவை",
  "sec.title.4": "ஸ்ரீ ஆண்டாள் அருளிச்செய்த நாச்சியார் திருமொழி",
  "sec.title.5": "ஸ்ரீ குலசேகர பெருமாள் அருளிச்செய்த பெருமாள் திருமொழி",
  "sec.title.6": "ஸ்ரீ திருமழிசைப்பிரான் அருளிச்செய்த திருச்சந்தவிருத்தம்",
  "sec.title.7": "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருமாலை",
  "sec.title.8": "ஸ்ரீ தொண்டரடிப்பொடியாழ்வார் அருளிச்செய்த திருப்பள்ளியெழுச்சி",
  "sec.title.9": "ஸ்ரீ திருப்பாணாழ்வார் அருளிச்செய்த அமலனாதிபிரான்",
  "sec.title.10": "ஸ்ரீ மதுரகவி ஆழ்வார் அருளிச்செய்த கண்ணிநுண்சிறுத்தாம்பு",
  "sec.title.11": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரிய திருமொழி",
  "sec.title.12": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருகுறுந்தாண்டகம்",
  "sec.title.13": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருநெடுந்தாண்டகம்",
  "sec.title.14": "ஸ்ரீ பொய்கையாழ்வார்‌ அருளிச்செய்த முதல்‌ திருவந்தாதி",
  "sec.title.15": "ஸ்ரீ பூதத்தாழ்வார்‌ அருளிச்செய்த இரண்டாம்‌ திருவந்தாதி",
  "sec.title.16": "ஸ்ரீ பேயாழ்வார்‌ அருளிச்செய்த மூன்றாம்‌ திருவந்தாதி",
  "sec.title.17": "ஸ்ரீ திருமழிசைப்பிரான்‌ அருளிச்செய்த நான்முகன்‌திருவந்தாதி",
  "sec.title.18": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த ருக்வேதஸாரமான திருவிருத்தம்",
  "sec.title.19": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த யஜுர்வேதஸாரமான திருவாசிரியம்",
  "sec.title.20": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த அதர்வணவேத ஸாரமான பெரியதிருவந்தாதி",
  "sec.title.21": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த திருவெழுகூற்றிருக்கை",
  "sec.title.22": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த சிறியதிருமடல்",
  "sec.title.23": "ஸ்ரீ திருமங்கையாழ்வார்‌ அருளிச்செய்த பெரியதிருமடல்",
  "sec.title.24": "ஸ்ரீ திருவரங்கத்தமுதனார்‌ அருளிச்செய்த ப்ரபந்நகாயத்ரி என்னும்‌ இராமாநுச நூற்றந்தாதி",
  "sec.title.25": "ஸ்ரீ பெரியஜீயர் அருளிச்செய்த உபதேசரத்தினமாலை",
  "sec.title.26": "ஸ்ரீ நம்மாழ்வார்‌ அருளிச்செய்த திருவாய்மொழி",
  "sec.title.27": "ஸ்ரீ மணவாள மாமுனிகள் அருளிச்செய்த திருவாய்மொழி நூற்றந்தாதி",
  "sec.title.28": "பரமகாருணிகரான அருளாளப்  பெருமாள் எம்பெருமானார் திருவாய் மலர்ந்தருளிய  ஞானசாரம்",
  "sec.title.29": "பரமகாருணிகரான அருளாளப்  பெருமாள் எம்பெருமானார் திருவாய் மலர்ந்தருளிய ப்ரமேயஸாரம்",
  "sec.title.30": "ஸ்ரீ விலாஞ்சோலைப்பிள்ளை  அருளிச்செய்த  ஸப்தகாதை",
  "sec.title.31": "ஸ்ரீ மணவாள மாமுனிகள் அருளிச்செய்த ஆர்த்தி ப்ரபந்தம்"
};

const I18N_HOST = "https://workeri18n.kanchitrust.workers.dev";
const VALID_SCRIPTS = ["te", "ml", "kn", "deva", "iast"];

function activeScript() {
  try {
    const s = (localStorage.getItem("script") || "ta").toLowerCase();
    return VALID_SCRIPTS.includes(s) ? s : "ta";
  } catch (e) {
    return "ta";
  }
}

let loaded = null;       // converted map, once fetched
let loadedFor = null;    // which script `loaded` belongs to
let inflight = null;

// Await this before rendering anything that uses c(). Cheap after the
// first call: the result is cached for the life of the page.
export async function ensureContentStrings() {
  const sc = activeScript();

  if (sc === "ta") { loaded = null; loadedFor = "ta"; return; }
  if (loadedFor === sc && loaded) return;
  if (inflight) return inflight;

  inflight = fetch(I18N_HOST + "/api/ui-text?script=" + sc)
    .then(r => r.json())
    .then(m => { loaded = (m && typeof m === "object") ? m : null; loadedFor = sc; })
    .catch(() => { loaded = null; loadedFor = sc; })   // fall back to Tamil, never break the page
    .finally(() => { inflight = null; });

  return inflight;
}

// True when no script is chosen. Renderers use this to keep Tamil-only
// label construction (ordinal words, "1ம் திருமொழி") on the Tamil path and
// fall back to the already-converted database name in every other script.
export function isTamilScript() {
  return activeScript() === "ta";
}

// Synchronous lookup for use inside renderers.
export function c(key) {
  if (loaded && loaded[key]) return loaded[key];
  return TAMIL[key] || "";
}

// Ceremonial title for a section, falling back to the section's own
// (already converted) name when there is no ceremonial form — which is
// the case for every section outside 1-31.
export function sectionTitle(sectionId, fallbackName) {
  return c("sec.title." + sectionId) || fallbackName || "";
}