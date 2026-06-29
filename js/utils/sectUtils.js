// ═══════════════════════════════════════════════════════════════
//  js/utils/sectUtils.js
//  Central sect utility — all sect-aware constants and helpers
//  Import this wherever sect-based content selection is needed
// ═══════════════════════════════════════════════════════════════

// ── User sect preference ──────────────────────────────────────
export function getUserSect() {
  return localStorage.getItem('sect') || 'T';
}

export function isVadagalai() {
  return getUserSect() === 'V';
}

// ── Koil Thirumozhi pathu lists ───────────────────────────────
// These are used for INDEX NAVIGATION only (scroll-to links)
// Actual content filtering uses DB entity tags in koil.js

export const KOIL_THIRUMOZHI_T = [
  { label: "முதற்பத்து — முதல் திருமொழி — வாடினேன்",                  pathuId: 44  },
  { label: "முதற்பத்து — ஏழாம் திருமொழி — அங்கண் ஞாலம்",             pathuId: 50  },
  { label: "முதற்பத்து — ஒன்பதாம் திருமொழி — தாயே தந்தை",            pathuId: 52  },
  { label: "இரண்டாம் பத்து — மூன்றாம் திருமொழி — விற்பெரு",          pathuId: 56  },
  { label: "இரண்டாம் பத்து — நான்காம் திருமொழி — அன்று ஆயர்",        pathuId: 57  },
  { label: "இரண்டாம் பத்து — ஆறாம் திருமொழி — நண்ணாத",              pathuId: 59  },
  { label: "இரண்டாம் பத்து — ஏழாம் திருமொழி — திவளும்",              pathuId: 60  },
  { label: "மூன்றாம் பத்து — ஆறாம் திருமொழி — தூவிரிய",              pathuId: 69  },
  { label: "நான்காம் பத்து — ஒன்பதாம் திருமொழி — நும்மை",            pathuId: 82  },
  { label: "ஐந்தாம் பத்து — எட்டாம் திருமொழி — ஏழை ஏதலன்",          pathuId: 91  },
  { label: "ஆறாம் பத்து — ஒன்பதாம் திருமொழி — பெடை அடர்த்த",        pathuId: 102 },
  { label: "ஏழாம் பத்து — நான்காம் திருமொழி — கண்சோர",               pathuId: 107 },
  { label: "எட்டாம் பத்து — இரண்டாம் திருமொழி — தெள்ளியீர்",        pathuId: 115 },
  { label: "ஒன்பதாம் பத்து — ஒன்பதாம் திருமொழி — மூவரில்",          pathuId: 132 },
  { label: "பத்தாம் பத்து — எட்டாம் திருமொழி — காதில் கடிப்பிட்டு",  pathuId: 141 },
  { label: "பதினொன்றாம் பத்து — எட்டாம் திருமொழி — மாற்றம் உள",     pathuId: 151 },
];

export const KOIL_THIRUMOZHI_V = [
  { label: "முதற்பத்து — முதல் திருமொழி — வாடினேன்",                  pathuId: 44  },
  { label: "முதற்பத்து — ஒன்பதாம் திருமொழி — தாயே தந்தை",            pathuId: 52  },
  { label: "இரண்டாம் பத்து — ஆறாம் திருமொழி — நண்ணாத",              pathuId: 59  },
  { label: "மூன்றாம் பத்து — ஆறாம் திருமொழி — தூவிரிய",              pathuId: 69  },
  { label: "நான்காம் பத்து — ஒன்பதாம் திருமொழி — நும்மை",            pathuId: 82  },
  { label: "ஐந்தாம் பத்து — நான்காம் திருமொழி — உந்திமேல்",          pathuId: 87  },
  { label: "ஆறாம் பத்து — மூன்றாம் திருமொழி — துறப்பேன் அல்லேன்",   pathuId: 96  },
  { label: "ஏழாம் பத்து — முதல் திருமொழி — கறவா மடநாகு",             pathuId: 104 },
  { label: "எட்டாம் பத்து — இரண்டாம் திருமொழி — தெள்ளியீர்",        pathuId: 115 },
  { label: "ஒன்பதாம் பத்து — ஆறாம் திருமொழி — அக்கும்",             pathuId: 129 },
  { label: "பத்தாம் பத்து — எட்டாம் திருமொழி — காதில் கடிப்பிட்டு",  pathuId: 141 },
  { label: "பதினொன்றாம் பத்து — எட்டாம் திருமொழி — நீள் நாகம்",     pathuId: 150 },
  { label: "பதினொன்றாம் பத்து — எட்டாம் திருமொழி — மாற்றம் உள",     pathuId: 151 },
];

export function getKoilThirumozhi() {
  return isVadagalai() ? KOIL_THIRUMOZHI_V : KOIL_THIRUMOZHI_T;
}

// ── Koil Thiruvaimozhi pathu lists ───────────────────────────
export const KOIL_THIRUVAIMOZHI_T = [
  { label: "முதற்பத்து — முதல் திருவாய்மொழி — உயர்வற",                      pathuId: 152 },
  { label: "முதற்பத்து — இரண்டாம் திருவாய்மொழி — வீடுமின்",                 pathuId: 153 },
  { label: "இரண்டாம் பத்து — பத்தாம் திருவாய்மொழி — கிளரொளி",              pathuId: 171 },
  { label: "மூன்றாம் பத்து — மூன்றாம் திருவாய்மொழி — ஒழுவில்காலமெல்லாம்", pathuId: 174 },
  { label: "நான்காம் பத்து — முதல் திருவாய்மொழி — ஒருநாயகமாய்",            pathuId: 182 },
  { label: "நான்காம் பத்து — பத்தாம் திருவாய்மொழி — ஒன்றும்தேவும்",        pathuId: 191 },
  { label: "ஐந்தாம் பத்து — எட்டாம் திருவாய்மொழி — ஆராவமுதே",             pathuId: 199 },
  { label: "ஆறாம் பத்து — பத்தாம் திருவாய்மொழி — உலகமுண்ட",               pathuId: 211 },
  { label: "ஏழாம் பத்து — இரண்டாம் திருவாய்மொழி — கங்குலும் பகலும்",      pathuId: 213 },
  { label: "ஏழாம் பத்து — நான்காம் திருவாய்மொழி — ஆழிஎழ",                 pathuId: 215 },
  { label: "எட்டாம் பத்து — பத்தாம் திருவாய்மொழி — நெடுமாற்கடிமை",        pathuId: 231 },
  { label: "ஒன்பதாம் பத்து — பத்தாம் திருவாய்மொழி — மாலைநண்ணி",           pathuId: 241 },
  { label: "பத்தாம் பத்து — ஒன்பதாம் திருவாய்மொழி — சூழ்விசும்பு",        pathuId: 250 },
  { label: "பத்தாம் பத்து — பத்தாம் திருவாய்மொழி — முனியே",                pathuId: 251 },
];

export const KOIL_THIRUVAIMOZHI_V = [
  { label: "முதற்பத்து — முதல் திருவாய்மொழி — உயர்வற",                      pathuId: 152 },
  { label: "முதற்பத்து — இரண்டாம் திருவாய்மொழி — வீடுமின்",                 pathuId: 153 },
  { label: "இரண்டாம் பத்து — பத்தாம் திருவாய்மொழி — கிளரொளி",              pathuId: 171 },
  { label: "மூன்றாம் பத்து — மூன்றாம் திருவாய்மொழி — ஒழுவில்காலமெல்லாம்", pathuId: 174 },
  { label: "நான்காம் பத்து — பத்தாம் திருவாய்மொழி — ஒன்றும்தேவும்",        pathuId: 191 },
  { label: "ஐந்தாம் பத்து — எட்டாம் திருவாய்மொழி — ஆராவமுதே",             pathuId: 199 },
  { label: "ஆறாம் பத்து — பத்தாம் திருவாய்மொழி — உலகமுண்ட",               pathuId: 211 },
  { label: "ஏழாம் பத்து — இரண்டாம் திருவாய்மொழி — கங்குலும் பகலும்",      pathuId: 213 },
  { label: "எட்டாம் பத்து — பத்தாம் திருவாய்மொழி — நெடுமாற்கடிமை",        pathuId: 231 },
  { label: "ஒன்பதாம் பத்து — பத்தாம் திருவாய்மொழி — மாலைநண்ணி",           pathuId: 241 },
  { label: "பத்தாம் பத்து — ஒன்பதாம் திருவாய்மொழி — சூழ்விசும்பு",        pathuId: 250 },
  { label: "பத்தாம் பத்து — பத்தாம் திருவாய்மொழி — முனியே",                pathuId: 251 },
];

export function getKoilThiruvaimozhi() {
  return isVadagalai() ? KOIL_THIRUVAIMOZHI_V : KOIL_THIRUVAIMOZHI_T;
}

// ── Vazhi Thirunamam lists ────────────────────────────────────
// T: includes Manavala Mamunigal (24, 25)
// V: replaces 24, 25 with Desikan naalpattu (38)

export const VAZHI_CHILDREN_T = [
  { vazhi_id:  1, name: "பெரிய பெருமாள்" },
  { vazhi_id:  2, name: "பெரிய பிராட்டியார்" },
  { vazhi_id:  3, name: "சேனைமுதலியார்" },
  { vazhi_id:  4, name: "நம்மாழ்வார்" },
  { vazhi_id:  5, name: "ஸ்ரீமந்நாதமுனிகள்" },
  { vazhi_id:  6, name: "உய்யக்கொண்டார்" },
  { vazhi_id:  7, name: "மணக்கால்நம்பி" },
  { vazhi_id:  8, name: "ஆளவந்தார்" },
  { vazhi_id:  9, name: "பெரியநம்பிகள்" },
  { vazhi_id: 10, name: "திருக்கச்சிநம்பிகள்" },
  { vazhi_id: 11, name: "எம்பெருமானார்" },
  { vazhi_id: 12, name: "எம்பெருமானார் நாள்பாட்டு" },
  { vazhi_id: 13, name: "கூரத்தாழ்வான்" },
  { vazhi_id: 14, name: "முதலியாண்டான்" },
  { vazhi_id: 15, name: "திருவரங்கத்தமுதனார்" },
  { vazhi_id: 16, name: "எம்பார்" },
  { vazhi_id: 17, name: "பெரியபட்டர்" },
  { vazhi_id: 18, name: "நஞ்சீயர்" },
  { vazhi_id: 19, name: "நம்பிள்ளை" },
  { vazhi_id: 20, name: "வடக்குத் திருவீதிப்பிள்ளை" },
  { vazhi_id: 21, name: "பிள்ளைலோகாசாரியர்" },
  { vazhi_id: 22, name: "கூரகுலோத்தம தாஸர்" },
  { vazhi_id: 23, name: "திருவாய்மொழிப்பிள்ளை" },
  { vazhi_id: 24, name: "மணவாளமாமுனிகள்" },
  { vazhi_id: 25, name: "மணவாளமாமுனிகள் நாள்பாட்டு" },
  { vazhi_id: 26, name: "ஆண்டாள்" },
  { vazhi_id: 27, name: "ஆண்டாள் நாள்பாட்டு" },
  { vazhi_id: 28, name: "பொய்கை ஆழ்வார்" },
  { vazhi_id: 29, name: "பூதத்தாழ்வார்" },
  { vazhi_id: 30, name: "பேயாழ்வார்" },
  { vazhi_id: 31, name: "திருமழிசை ஆழ்வார்" },
  { vazhi_id: 32, name: "மதுரகவி ஆழ்வார்" },
  { vazhi_id: 33, name: "பெரியாழ்வார்" },
  { vazhi_id: 34, name: "குலசேகராழ்வார்" },
  { vazhi_id: 35, name: "தொண்டரடிப்பொடி ஆழ்வார்" },
  { vazhi_id: 36, name: "திருப்பாணாழ்வார்" },
  { vazhi_id: 37, name: "திருமங்கை ஆழ்வார்" },
];

export const VAZHI_CHILDREN_V = [
  { vazhi_id:  1, name: "பெரிய பெருமாள்" },
  { vazhi_id:  2, name: "பெரிய பிராட்டியார்" },
  { vazhi_id:  3, name: "சேனைமுதலியார்" },
  { vazhi_id:  4, name: "நம்மாழ்வார்" },
  { vazhi_id:  5, name: "ஸ்ரீமந்நாதமுனிகள்" },
  { vazhi_id:  6, name: "உய்யக்கொண்டார்" },
  { vazhi_id:  7, name: "மணக்கால்நம்பி" },
  { vazhi_id:  8, name: "ஆளவந்தார்" },
  { vazhi_id:  9, name: "பெரியநம்பிகள்" },
  { vazhi_id: 10, name: "திருக்கச்சிநம்பிகள்" },
  { vazhi_id: 11, name: "எம்பெருமானார்" },
  { vazhi_id: 12, name: "எம்பெருமானார் நாள்பாட்டு" },
  { vazhi_id: 13, name: "கூரத்தாழ்வான்" },
  { vazhi_id: 14, name: "முதலியாண்டான்" },
  { vazhi_id: 15, name: "திருவரங்கத்தமுதனார்" },
  { vazhi_id: 16, name: "எம்பார்" },
  { vazhi_id: 17, name: "பெரியபட்டர்" },
  { vazhi_id: 18, name: "நஞ்சீயர்" },
  { vazhi_id: 19, name: "நம்பிள்ளை" },
  { vazhi_id: 20, name: "வடக்குத் திருவீதிப்பிள்ளை" },
  { vazhi_id: 21, name: "பிள்ளைலோகாசாரியர்" },
  { vazhi_id: 22, name: "கூரகுலோத்தம தாஸர்" },
  { vazhi_id: 23, name: "திருவாய்மொழிப்பிள்ளை" },
  { vazhi_id: 38, name: "ஸ்ரீ நிகமாந்த மஹாதேசிகன் நாள்பாட்டு" },
  { vazhi_id: 26, name: "ஆண்டாள்" },
  { vazhi_id: 27, name: "ஆண்டாள் நாள்பாட்டு" },
  { vazhi_id: 28, name: "பொய்கை ஆழ்வார்" },
  { vazhi_id: 29, name: "பூதத்தாழ்வார்" },
  { vazhi_id: 30, name: "பேயாழ்வார்" },
  { vazhi_id: 31, name: "திருமழிசை ஆழ்வார்" },
  { vazhi_id: 32, name: "மதுரகவி ஆழ்வார்" },
  { vazhi_id: 33, name: "பெரியாழ்வார்" },
  { vazhi_id: 34, name: "குலசேகராழ்வார்" },
  { vazhi_id: 35, name: "தொண்டரடிப்பொடி ஆழ்வார்" },
  { vazhi_id: 36, name: "திருப்பாணாழ்வார்" },
  { vazhi_id: 37, name: "திருமங்கை ஆழ்வார்" },
];

export function getVazhiChildren() {
  return isVadagalai() ? VAZHI_CHILDREN_V : VAZHI_CHILDREN_T;
}

// ── Ghoshti vazhi list — always show all three options ───────
// Ghoshti is multi-sect; user selects what they need
// 24/25 = Thenkalai, 38 = Vadagalai — all shown as checkboxes
export const VAZHI_GHOSHTI_ALL = [
  { vazhi_id:  1, author_name: "பெரிய பெருமாள்" },
  { vazhi_id:  2, author_name: "பெரிய பிராட்டியார்" },
  { vazhi_id: 26, author_name: "ஆண்டாள்" },
  { vazhi_id: 27, author_name: "ஆண்டாள் நாள்பாட்டு" },
  { vazhi_id:  3, author_name: "சேனைமுதலியார்" },
  { vazhi_id:  4, author_name: "நம்மாழ்வார்" },
  { vazhi_id: 28, author_name: "பொய்கை ஆழ்வார்" },
  { vazhi_id: 29, author_name: "பூதத்தாழ்வார்" },
  { vazhi_id: 30, author_name: "பேயாழ்வார்" },
  { vazhi_id: 31, author_name: "திருமழிசை ஆழ்வார்" },
  { vazhi_id: 32, author_name: "மதுரகவி ஆழ்வார்" },
  { vazhi_id: 33, author_name: "பெரியாழ்வார்" },
  { vazhi_id: 34, author_name: "குலசேகராழ்வார்" },
  { vazhi_id: 35, author_name: "தொண்டரடிப்பொடி ஆழ்வார்" },
  { vazhi_id: 36, author_name: "திருப்பாணாழ்வார்" },
  { vazhi_id: 37, author_name: "திருமங்கை ஆழ்வார்" },
  { vazhi_id: -4, author_name: "திருமங்கைமன்னன் வடிவழகு சூர்ணிகை", is_fixed: true, fixed_id: 4 },
  { vazhi_id:  5, author_name: "ஸ்ரீமந்நாதமுனிகள்" },
  { vazhi_id:  6, author_name: "உய்யக்கொண்டார்" },
  { vazhi_id:  7, author_name: "மணக்கால்நம்பி" },
  { vazhi_id:  8, author_name: "ஆளவந்தார்" },
  { vazhi_id:  9, author_name: "பெரியநம்பிகள்" },
  { vazhi_id: 10, author_name: "திருக்கச்சிநம்பிகள்" },
  { vazhi_id: 11, author_name: "எம்பெருமானார்" },
  { vazhi_id: 12, author_name: "எம்பெருமானார் நாள்பாட்டு" },
  { vazhi_id: 13, author_name: "கூரத்தாழ்வான்" },
  { vazhi_id: 14, author_name: "முதலியாண்டான்" },
  { vazhi_id: 15, author_name: "திருவரங்கத்தமுதனார்" },
  { vazhi_id: 16, author_name: "எம்பார்" },
  { vazhi_id: 17, author_name: "பெரியபட்டர்" },
  { vazhi_id: 18, author_name: "நஞ்சீயர்" },
  { vazhi_id: 19, author_name: "நம்பிள்ளை" },
  { vazhi_id: 20, author_name: "வடக்குத் திருவீதிப்பிள்ளை" },
  { vazhi_id: 21, author_name: "பிள்ளைலோகாசாரியர்" },
  { vazhi_id: 22, author_name: "கூரகுலோத்தம தாஸர்" },
  { vazhi_id: 23, author_name: "திருவாய்மொழிப்பிள்ளை" },
  { vazhi_id: 24, author_name: "மணவாளமாமுனிகள்" },
  { vazhi_id: 25, author_name: "மணவாளமாமுனிகள் நாள்பாட்டு" },
  { vazhi_id: 38, author_name: "ஸ்ரீ நிகமாந்த மஹாதேசிகன் நாள்பாட்டு" },
];

// ── Ghoshti fixed text (pothu saatru) definitions ────────────
// Both T and V shown as checkboxes in ghoshti
// Pre-select based on user's sect
export const FIXED_DEFS_GHOSHTI = [
  { id: 2, key: "iyal",     label: "இயல் சாத்து" },
  { id: 1, key: "pothu_t",  label: "தென்கலை பொது சாற்றுமுறை" },
  { id: 5, key: "pothu_v",  label: "வடகலை பொது சாற்றுமுறை" },
  { id: 3, key: "muktaka",  label: "முக்தக மங்களம்" },
  { id: 4, key: "surnikai", label: "திருமங்கைமன்னன் வடிவழகு சூர்ணிகை" },
];

// Default fixed text state based on user sect
export function getDefaultFixedTextState() {
  const sect = getUserSect();
  return {
    iyal:     false,
    pothu_t:  sect === 'T',  // pre-checked if Thenkalai
    pothu_v:  sect === 'V',  // pre-checked if Vadagalai
    muktaka:  false,
    surnikai: false,
  };
}