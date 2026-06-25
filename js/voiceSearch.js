/**
 * voiceSearch.js — Complete Voice Search Brain
 * நாலாயிர திவ்யப்பிரபந்தம்
 *
 * Covers ALL features:
 *  - All 27 sections by name + spoken aliases + pathu number
 *  - நம்மாழ்வார் → all 4 works
 *  - anchor_map thirumozhi title search (வாடினேன், ஆராவமுதே etc.)
 *  - Pathu-beginning ambiguity (first thirumozhi = full pathu option)
 *  - All 108 Divyadesams — name + DB aliases from /voice/desam-aliases
 *  - Special groups: Thirunangur, Nava Thiruppathi, Irattai
 *  - Global pasuram number (நாலாயிரம் 1234)
 *  - Per-thousand views (முதலாயிரம் etc.) + Full 4000
 *  - All top-level: Nithyanusandhanam, Sattrumurai, Munnadi Pinnadi,
 *    Dual recital, Thaniyans, Azhwars, Koil Thirumozhi/Thiruvaimozhi
 *  - Vazhi Thirunamam → routes via Nithyanusandhanam
 *  - Off-topic filter (anything not matching returns [])
 */

const API_VOICE = "https://cdnaalayiram-api.kanchitrust.workers.dev/voice";

// ═══════════════════════════════════════════════════════
// SECTION MASTER
// ═══════════════════════════════════════════════════════

const SECTIONS = [
  { id:1,  name:"திருப்பல்லாண்டு",         hasPathu:false,
    aliases:["thiruppallandu","திருப்பல்லாண்டு","pallandu","பல்லாண்டு","periyazhwar pallandu"] },
  { id:2,  name:"பெரியாழ்வார் திருமொழி",  hasPathu:true,
    aliases:["periyazhwar thirumozhi","பெரியாழ்வார் திருமொழி","periyazhwar","பெரியாழ்வார்","pazhazhwar"] },
  { id:3,  name:"திருப்பாவை",              hasPathu:false,
    aliases:["thiruppavai","திருப்பாவை","pavai","பாவை","andal thiruppavai","ஆண்டாள் திருப்பாவை"] },
  { id:4,  name:"நாச்சியார் திருமொழி",    hasPathu:false, isStandalone:true,
    aliases:["nachiyar thirumozhi","நாச்சியார் திருமொழி","nachiyar","நாச்சியார்","andal nachiyar"] },
  { id:5,  name:"பெருமாள் திருமொழி",      hasPathu:false, isStandalone:true,
    aliases:["perumal thirumozhi","பெருமாள் திருமொழி","kulasekhara","குலசேகர","kulasekharan"] },
  { id:6,  name:"திருச்சந்தவிருத்தம்",    hasPathu:false,
    aliases:["thiruchandavirutham","திருச்சந்தவிருத்தம்","chandavirutham","சந்தவிருத்தம்","thirumazhisai","திருமழிசை"] },
  { id:7,  name:"திருமாலை",               hasPathu:false,
    aliases:["thirumaalai","திருமாலை","maalai","மாலை","thondaradippodi","தொண்டரடிப்பொடி"] },
  { id:8,  name:"திருப்பள்ளியெழுச்சி",   hasPathu:false,
    aliases:["thiruppalliyeluchi","திருப்பள்ளியெழுச்சி","palliyezhuchi","பள்ளியெழுச்சி"] },
  { id:9,  name:"அமலனாதிபிரான்",         hasPathu:false,
    aliases:["amalanadipiran","அமலனாதிபிரான்","amalan","thiruppaan","திருப்பாண்","thiruppanazhwar"] },
  { id:10, name:"கண்ணிநுண்சிறுத்தாம்பு", hasPathu:false,
    aliases:["kanninunsirutthambu","கண்ணிநுண்சிறுத்தாம்பு","kanninu","கண்ணி","madhurakavi","மதுரகவி"] },
  { id:11, name:"பெரிய திருமொழி",         hasPathu:true,
    aliases:["periya thirumozhi","பெரிய திருமொழி","thirumangai","திருமங்கை","thirumangai azhwar","kaliyan","களியன்"] },
  { id:12, name:"திருகுறுந்தாண்டகம்",    hasPathu:false,
    aliases:["thirukurunthantakam","திருகுறுந்தாண்டகம்","kurunthantakam","குறுந்தாண்டகம்"] },
  { id:13, name:"திருநெடுந்தாண்டகம்",    hasPathu:false,
    aliases:["thirunedunthantakam","திருநெடுந்தாண்டகம்","nedunthantakam","நெடுந்தாண்டகம்"] },
  { id:14, name:"முதல்‌ திருவந்தாதி",    hasPathu:false,
    aliases:["mudal thiruvandhathi","முதல் திருவந்தாதி","first thiruvandhathi","poigai azhwar","பொய்கை ஆழ்வார்","poigai"] },
  { id:15, name:"இரண்டாம்‌ திருவந்தாதி", hasPathu:false,
    aliases:["irandaam thiruvandhathi","இரண்டாம் திருவந்தாதி","second thiruvandhathi","bhoothathazhwar","பூதத்தாழ்வார்"] },
  { id:16, name:"மூன்றாம்‌ திருவந்தாதி", hasPathu:false,
    aliases:["moondraam thiruvandhathi","மூன்றாம் திருவந்தாதி","third thiruvandhathi","peyazhwar","பேயாழ்வார்"] },
  { id:17, name:"நான்முகன்‌திருவந்தாதி", hasPathu:false,
    aliases:["nanmugan thiruvandhathi","நான்முகன் திருவந்தாதி","nanmugan","நான்முகன்","thirumalisai","திருமழிசை"] },
  { id:18, name:"திருவிருத்தம்",          hasPathu:false,
    aliases:["thiruviruttham","திருவிருத்தம்","viruttham","விருத்தம்"] },
  { id:19, name:"திருவாசிரியம்",          hasPathu:false,
    aliases:["thiruvasiriyam","திருவாசிரியம்","vasiriyam","ஆசிரியம்"] },
  { id:20, name:"பெரியதிருவந்தாதி",      hasPathu:false,
    aliases:["periya thiruvandhathi","பெரியதிருவந்தாதி","periya vandhathi"] },
  { id:21, name:"திருவெழுகூற்றிருக்கை",  hasPathu:false, isSpecial:true,
    aliases:["thiruvezhukootrarikkai","திருவெழுகூற்றிருக்கை","vezhukootrarikkai","எழுகூற்றிருக்கை",
             "kootrarikkai","vezhukootru","எழுகூற்று","thiruvezhukootru","திருவெழுகூற்று"] },
  { id:22, name:"சிறியதிருமடல்",         hasPathu:false, isSpecial:true,
    aliases:["siriya thirumadal","சிறியதிருமடல்","siriya madal","சிறிய மடல்","small madal","சிறிய திருமடல்"] },
  { id:23, name:"பெரியதிருமடல்",         hasPathu:false, isSpecial:true,
    aliases:["periya thirumadal","பெரியதிருமடல்","periya madal","பெரிய மடல்","big madal","பெரிய திருமடல்"] },
  { id:24, name:"இராமாநுச நூற்றந்தாதி",  hasPathu:false,
    aliases:["ramanuja nurrandhadhi","இராமாநுச நூற்றந்தாதி","ramanuja","இராமாநுசர்","nurrandhadhi","நூற்றந்தாதி","thiruvarangathamudanar"] },
  { id:25, name:"உபதேசரத்தினமாலை",      hasPathu:false,
    aliases:["upadesarathinamalai","உபதேசரத்தினமாலை","upadesa","உபதேச","manavala mamunigal","மணவாளமாமுனிகள்"] },
  { id:26, name:"திருவாய்மொழி",           hasPathu:true,
    aliases:["thiruvaimozhi","திருவாய்மொழி","vaimozhi","வாய்மொழி","satagopan","சடகோபன்"] },
  { id:27, name:"திருவாய்மொழி நூற்றந்தாதி", hasPathu:false,
    aliases:["thiruvaimozhi nurrandhadhi","திருவாய்மொழி நூற்றந்தாதி","vaimozhi nurrandhadhi"] }
];

// ═══════════════════════════════════════════════════════
// NAMMAZHWAR — all 4 works kept separate
// ═══════════════════════════════════════════════════════

const NAMMAZHWAR_ALIASES = [
  "nammazhwar","நம்மாழ்வார்","nammaazhvaar",
  "sadagopan","சடகோபன்","satagopan","shatakopan"
];

const NAMMAZHWAR_WORKS = [
  { id:18, name:"திருவிருத்தம்",     sublabel:"நம்மாழ்வார் — 100 பாசுரங்கள்" },
  { id:19, name:"திருவாசிரியம்",     sublabel:"நம்மாழ்வார் — 7 பாசுரங்கள்" },
  { id:20, name:"பெரியதிருவந்தாதி", sublabel:"நம்மாழ்வார் — 87 பாசுரங்கள்" },
  { id:26, name:"திருவாய்மொழி",      sublabel:"நம்மாழ்வார் — 1102 பாசுரங்கள்" }
];

// ═══════════════════════════════════════════════════════
// THOUSANDS
// ═══════════════════════════════════════════════════════

const THOUSANDS = [
  { id:1, name:"முதலாயிரம்",
    aliases:["mudalaayiram","முதலாயிரம்","first thousand","1st thousand","முதல் ஆயிரம்","muthal aayiram","முதல் ஆயிரம்"] },
  { id:2, name:"இரண்டாமாயிரம்",
    aliases:["irandaamaayiram","இரண்டாமாயிரம்","second thousand","2nd thousand","இரண்டாம் ஆயிரம்"] },
  { id:3, name:"மூன்றாமாயிரம்",
    aliases:["moondraamaayiram","மூன்றாமாயிரம்","third thousand","3rd thousand","மூன்றாம் ஆயிரம்","iyarpa","இயற்பா"] },
  { id:4, name:"நான்காமாயிரம்",
    aliases:["naangaamaayiram","நான்காமாயிரம்","fourth thousand","4th thousand","நான்காம் ஆயிரம்"] }
];

// ═══════════════════════════════════════════════════════
// SPECIAL DESTINATIONS
// ═══════════════════════════════════════════════════════

const SPECIAL_DESTINATIONS = [
  {
    label:"Nithyaanusandanam", sublabel:"நித்யாநுஸந்தானம் — Full sequence",
    fn:"openNithyanusandhanam", args:[],
    aliases:["nithyanusandhanam","நித்யாநுஸந்தானம்","nithyam","daily recital","நித்ய",
             "nithyanusanthanam","நித்யானுசந்தானம்","nithya anusandhanam"]
  },
  {
    // Vazhi Thirunamam lives inside Nithyanusandhanam — no separate page
    label:"Vazhi Thirunamam", sublabel:"வாழி திருநாமம் — நித்யாநுஸந்தானம் இல்",
    fn:"openNithyanusandhanam", args:[],
    aliases:["vazhi thirunamam","வாழி திருநாமம்","vazhi","வாழி","thirunamam","திருநாமம்",
             "vazhithirunamam","வாழி திருநாமங்கள்"]
  },
  {
    label:"Koil Thirumozhi", sublabel:"சாற்றுமுறை — கோயில் திருமொழி",
    fn:"openKoil", args:["THIRUMOZHI"],
    aliases:["koil thirumozhi","கோயில் திருமொழி","koil mozhi","srirangam thirumozhi",
             "கோவில் திருமொழி"]
  },
  {
    label:"Koil Thiruvaimozhi", sublabel:"சாற்றுமுறை — கோயில் திருவாய்மொழி",
    fn:"openKoil", args:["THIRUVAIMOZHI"],
    aliases:["koil thiruvaimozhi","கோயில் திருவாய்மொழி","koil vaimozhi","srirangam thiruvaimozhi",
             "கோவில் திருவாய்மொழி"]
  },
  {
    label:"Munnadi Pinnadi", sublabel:"முன்னடி பின்னடி — Full 4000",
    fn:"openMunnadiPinnadi", args:[null],
    aliases:["munnadi pinnadi","முன்னடி பின்னடி","munnadi","முன்னடி","pinnadi","பின்னடி"]
  },
  {
    label:"Rettai / Star Pasurams", sublabel:"இரட்டை பாசுரங்கள் — Dual recital",
    fn:"openDualRecital", args:[null],
    aliases:["rettai pasuram","இரட்டை பாசுரம்","star pasuram","dual recital","rettai","இரட்டை",
             "double pasuram","இரட்டை திருமொழி","நட்சத்திர பாசுரம்"]
  },
  {
    label:"Nallayira Thaniyangal", sublabel:"திரு தனியன்கள் — Full 4000",
    fn:"openFullThaniyans", args:[null],
    aliases:["thaniyangal","தனியன்கள்","thaniyan","தனியன்","nallayira thaniyan","நாலாயிர தனியன்",
             "திரு தனியன்"]
  },
  {
    label:"Azhwars", sublabel:"ஆழ்வார்கள் — All 12 Azhwars",
    fn:"openAzhwars", args:[null],
    aliases:["azhwars","ஆழ்வார்கள்","azhwar","ஆழ்வார்","12 azhwars","twelve azhwars",
             "பன்னிரு ஆழ்வார்கள்","panniru azhwargal"]
  },
  {
    label:"Divyadesam", sublabel:"திவ்யதேசங்கள் — 108 Divyadesams",
    fn:"openDivyadesam", args:[null],
    aliases:["divyadesam","திவ்யதேசம்","divyadesamgal","திவ்யதேசங்கள்",
             "108 divyadesam","108 திவ்யதேசம்"]
  },
  {
    label:"Sattrumurai", sublabel:"சாற்றுமுறை — Full sequence",
    fn:"openSattrumurai", args:[null],
    aliases:["sattrumurai","சாற்றுமுறை","sattru","சாற்று","satru murai","சாற்றுமுறைகள்"]
  },
  {
    label:"Full Naalayiram", sublabel:"நாலாயிர திவ்யப்பிரபந்தம் — முழுமை",
    fn:"showFullNaalayiram", args:[],
    aliases:["full 4000","நாலாயிரம்","naalayiram","naalayira","4000","full naalayiram",
             "முழு நாலாயிரம்","naalayira divya prabandham","நாலாயிர திவ்யப்பிரபந்தம்"]
  },
  // ── Special Divyadesam Groups ──
  {
    label:"Thirunangur Divya Desams", sublabel:"திருநாங்கூர் 11 திவ்யதேசங்கள்",
    fn:"_openSpecialGroup", args:["thirunangur"],
    aliases:["thirunangur","திருநாங்கூர்","nangur","நாங்கூர்","thirunangur desams",
             "திருநாங்கூர் திவ்யதேசம்","11 desams"]
  },
  {
    label:"Nava Thiruppathi", sublabel:"நவ திருப்பதிகள் — 9 திவ்யதேசங்கள்",
    fn:"_openSpecialGroup", args:["navathiruppathi"],
    aliases:["navathiruppathi","நவதிருப்பதி","nava thiruppathi","9 thiruppathi",
             "நவ திருப்பதி","navathirupathi","நவதிருப்பதிகள்"]
  },
  {
    label:"Irattai Thiruppathi", sublabel:"இரட்டை திருப்பதிகள் — 2 திவ்யதேசங்கள்",
    fn:"_openSpecialGroup", args:["irattai"],
    aliases:["irattai thiruppathi","இரட்டை திருப்பதி","twin temples",
             "இரட்டை திருப்பதிகள்","irattai desam"]
  }
];

// ═══════════════════════════════════════════════════════
// PATHU ORDINALS
// ═══════════════════════════════════════════════════════

const PATHU_ORDINALS = [
  { num:1,  keys:["first","1st","முதல்","முதற்","ondraam","ondram","ஒன்றாம்"] },
  { num:2,  keys:["second","2nd","irandaam","இரண்டாம்"] },
  { num:3,  keys:["third","3rd","moondraam","மூன்றாம்"] },
  { num:4,  keys:["fourth","4th","naangaam","நான்காம்"] },
  { num:5,  keys:["fifth","5th","aintham","ஐந்தாம்"] },
  { num:6,  keys:["sixth","6th","aaram","ஆறாம்"] },
  { num:7,  keys:["seventh","7th","ezhaam","ஏழாம்"] },
  { num:8,  keys:["eighth","8th","ettaam","எட்டாம்"] },
  { num:9,  keys:["ninth","9th","onbatham","ஒன்பதாம்","onbadham"] },
  { num:10, keys:["tenth","10th","pattham","பத்தாம்"] },
  { num:11, keys:["eleventh","11th","pathinondram","பதினொன்றாம்"] }
];

// ═══════════════════════════════════════════════════════
// NORMALIZE — Tamil-aware (strips pulli for fuzzy match)
// ═══════════════════════════════════════════════════════

function normalize(text) {
  return (text || "").toLowerCase().trim()
    .replace(/[^a-z0-9\u0B80-\u0BFF\s]/g, " ")
    .replace(/\s+/g, " ");
}

function normTamil(text) {
  return normalize(text).replace(/்/g, "").replace(/\s+/g, " ").trim();
}

function scoreMatch(transcript, aliases) {
  const t  = normalize(transcript);
  const tf = normTamil(transcript);
  let best = 0;
  for (const alias of aliases) {
    const a  = normalize(alias);
    const af = normTamil(alias);
    if (t === a || tf === af)              { best = Math.max(best, 100); continue; }
    if (t.includes(a) || tf.includes(af)) { best = Math.max(best, 80);  continue; }
    if (a.includes(t) || af.includes(tf)) { best = Math.max(best, 60);  continue; }
    const tW = tf.split(" ").filter(w => w.length > 1);
    const aW = af.split(" ").filter(w => w.length > 1);
    const ov = tW.filter(w => aW.includes(w)).length;
    if (ov > 0) { best = Math.max(best, ov * 20); continue; }
    // Partial word match — catches spelling variants and space differences
    const partialMatch = tW.some(w => aW.some(aw =>
      (w.length > 3 && aw.includes(w)) || (aw.length > 3 && w.includes(aw))
    ));
    if (partialMatch) best = Math.max(best, 25);
  }
  return best;
}

function extractPathuNum(t) {
  const tn = normalize(t);
  for (const p of PATHU_ORDINALS) {
    if (p.keys.some(k => tn.includes(normalize(k)))) return p.num;
  }
  return null;
}

function extractGlobalNo(transcript) {
  const t = transcript.trim();
  const patterns = [
    /(?:pasuram|பாசுரம்|naalayiram|நாலாயிரம்|global)[^\d]*(\d{1,4})/i,
    /(\d{1,4})[^\d]*(?:pasuram|பாசுரம்)/i,
    /^#?(\d{1,4})$/
  ];
  for (const pat of patterns) {
    const m = t.match(pat);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 4000) return n;
    }
  }
  return null;
}

function extractPathuNumFromText(canonical, pathuName) {
  const src = normTamil(pathuName || canonical || "");
  for (const p of PATHU_ORDINALS) {
    if (p.keys.some(k => src.includes(normTamil(k)))) return p.num;
  }
  return null;
}

function getOrdSuffix(n) {
  return n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
}

// ═══════════════════════════════════════════════════════
// DATA LOADERS — pre-warmed, cached, non-fatal on failure
// ═══════════════════════════════════════════════════════

let _ddMap = null, _ddLoading = null;

async function getDDMap() {
  if (_ddMap) return _ddMap;
  if (_ddLoading) return _ddLoading;
  _ddLoading = (async () => {
    try {
      const data = await fetch(`${API_VOICE}/desam-aliases`).then(r => r.json());
      const map = new Map();
      for (const d of (Array.isArray(data) ? data : [])) {
        map.set(d.id, {
          name: d.name,
          aliases: [
            normalize(d.name),
            normTamil(d.name),
            ...(d.perumal ? [normalize(d.perumal), normTamil(d.perumal)] : []),
            ...(d.thayar  ? [normalize(d.thayar),  normTamil(d.thayar)]  : []),
            ...(d.aliases || []).flatMap(a => [normalize(a), normTamil(a)])
          ].filter(Boolean)
        });
      }
      _ddMap = map;
    } catch(e) { _ddMap = new Map(); }
    return _ddMap;
  })();
  return _ddLoading;
}

let _anchorCache = null, _anchorLoading = null;

async function getAnchorMap() {
  if (_anchorCache) return _anchorCache;
  if (_anchorLoading) return _anchorLoading;
  _anchorLoading = (async () => {
    try {
      const data = await fetch(`${API_VOICE}/anchor-map`).then(r => r.json());
      _anchorCache = Array.isArray(data) ? data : [];
    } catch(e) { _anchorCache = []; }
    return _anchorCache;
  })();
  return _anchorLoading;
}

// ── First-line (munnadi) cache ─────────────────────────
// All 4000 pasuram first lines from munnadi_pinnadi_master
let _firstLineCache = null, _firstLineLoading = null;

async function getFirstLines() {
  if (_firstLineCache) return _firstLineCache;
  if (_firstLineLoading) return _firstLineLoading;
  _firstLineLoading = (async () => {
    try {
      const data = await fetch(`${API_VOICE}/first-lines`).then(r => r.json());
      _firstLineCache = Array.isArray(data) ? data : [];
    } catch(e) { _firstLineCache = []; }
    return _firstLineCache;
  })();
  return _firstLineLoading;
}

async function searchFirstLines(transcript) {
  const lines = await getFirstLines();
  if (!lines.length) return [];

  const tf = normTamil(transcript);
  if (tf.length < 3) return [];

  const results = [];

  for (const row of lines) {
    const line = normTamil(row.line_1 || "");
    if (!line) continue;

    let score = 0;
    if (tf === line)                              score = 100;
    else if (line.startsWith(tf) && tf.length > 3) score = 90;
    else if (tf.startsWith(line.slice(0, Math.min(line.length, 8))) && line.length > 5) score = 80;
    else if (line.includes(tf) && tf.length > 4)  score = 75;
    else if (tf.includes(line.slice(0, 6)) && line.length > 5) score = 65;
    else {
      // Word overlap
      const tW = tf.split(" ").filter(w => w.length > 2);
      const lW = line.split(" ").filter(w => w.length > 2);
      const ov = tW.filter(w => lW.includes(w)).length;
      if (ov >= 2) score = ov * 20;
      else if (ov === 1 && tW.length === 1) score = 30;
    }

    if (score < 40) continue;

    const sec = SECTIONS.find(s => s.id === row.section_id);
    const secName = sec?.name || `Section ${row.section_id}`;

    results.push({
      label:    row.line_1,
      sublabel: secName + ` — Pasuram ${row.global_no}`,
      fn:       "_openGlobalPasuram",
      args:     [row.global_no],
      score
    });
  }

  // Return top 3 first-line matches
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ═══════════════════════════════════════════════════════
// ANCHOR MAP SEARCH
// ═══════════════════════════════════════════════════════

async function searchAnchorMap(transcript) {
  const anchors = await getAnchorMap();
  if (!anchors.length) return [];

  const tf = normTamil(transcript);
  const results = [];

  for (const row of anchors) {
    const heading = normTamil(row.thirumozhi_heading || "");
    const canon   = normTamil(row.canonical_text     || "");
    const target  = heading || canon;
    if (!target) continue;

    let score = 0;
    if (tf === target)                               score = 100;
    else if (tf.includes(target) && target.length > 2) score = 85;
    else if (target.includes(tf) && tf.length > 2)     score = 70;
    else {
      const tW = tf.split(" ").filter(w => w.length > 1);
      const aW = target.split(" ").filter(w => w.length > 1);
      const ov = tW.filter(w => aW.includes(w)).length;
      if (ov > 0) score = ov * 25;
    }
    if (score < 50) continue;

    const sec = SECTIONS.find(s => s.id === row.section_id);
    if (!sec) continue;

    const pathuNum = extractPathuNumFromText(row.canonical_text, row.pathu_name);
    const isFirstOfPathu =
      row.type === "pathu" &&
      row.pathu_name &&
      (row.thousand_anchor_no === 1 ||
       normTamil(row.subunit_name || "").includes("முதல") ||
       normTamil(row.subunit_name || "").includes("first"));

    if (isFirstOfPathu && pathuNum) {
      results.push({
        label:    `${sec.name} — ${row.pathu_name}`,
        sublabel: "முழு பத்து (அனைத்து திருமொழிகள்)",
        fn:       "_selectSectionWithPathu",
        args:     [row.section_id, sec.name, pathuNum],
        score:    score + 5
      });
      results.push({
        label:    heading || row.canonical_text,
        sublabel: `${sec.name} — ${row.pathu_name} · முதல் திருமொழி மட்டும்`,
        fn:       "_selectSectionWithThirumozhi",
        args:     [row.section_id, sec.name, pathuNum, heading],
        score
      });
      continue;
    }

    results.push({
      label:    heading || row.canonical_text,
      sublabel: sec.name + (row.pathu_name ? ` — ${row.pathu_name}` : ""),
      fn:       pathuNum ? "_selectSectionWithThirumozhi" : "_selectSection",
      args:     pathuNum
        ? [row.section_id, sec.name, pathuNum, heading]
        : [row.section_id, sec.name],
      score
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════

export async function resolveVoiceQuery(transcript) {
  if (!transcript || !transcript.trim()) return [];

  const t = normalize(transcript);
  const results = [];

  // ── 1. Global pasuram number ──
  const globalNo = extractGlobalNo(transcript);
  if (globalNo !== null) {
    results.push({
      label:    `Pasuram #${globalNo}`,
      sublabel: `நாலாயிரம் — Global No. ${globalNo}`,
      fn: "_openGlobalPasuram", args: [globalNo], score: 95
    });
  }

  // ── 2. Nammazhwar → all 4 works ──
  const nScore = scoreMatch(t, NAMMAZHWAR_ALIASES);
  if (nScore >= 20) {
    for (const w of NAMMAZHWAR_WORKS) {
      results.push({
        label: w.name, sublabel: w.sublabel,
        fn: "_selectSection", args: [w.id, w.name],
        score: nScore - 2
      });
    }
  }

  // ── 3. Thousand-wise views ──
  for (const th of THOUSANDS) {
    const tScore = scoreMatch(t, th.aliases);
    if (tScore >= 40) {
      results.push({
        label: th.name, sublabel: "முழு ஆயிரம் — Full thousand view",
        fn: "showFullByThousand", args: [th.id], score: tScore + 5
      });
      results.push({
        label: th.name + " — பிரிவுகள்", sublabel: "Sections list",
        fn: "_openThousandSections", args: [th.id], score: tScore
      });
    }
  }

  // ── 4. Special destinations ──
  for (const dest of SPECIAL_DESTINATIONS) {
    const score = scoreMatch(t, dest.aliases);
    if (score >= 20) results.push({ ...dest, score });
  }

  // ── 5. Section match ──
  const pathuNum = extractPathuNum(t);
  for (const sec of SECTIONS) {
    const score = scoreMatch(t, [sec.name, ...sec.aliases]);
    if (score < 20) continue;

    if (sec.isSpecial) {
      results.push({
        label: sec.name, sublabel: "Open directly",
        fn: "_selectSection", args: [sec.id, sec.name], score
      });
      continue;
    }
    if (sec.isStandalone) {
      results.push({
        label: sec.name,
        sublabel: pathuNum
          ? `${sec.name} — ${pathuNum}${getOrdSuffix(pathuNum)} Thirumozhi`
          : sec.name,
        fn: "_selectSectionStandalone", args: [sec.id, sec.name, pathuNum], score
      });
      continue;
    }
    if (sec.hasPathu && pathuNum) {
      results.push({
        label: sec.name, sublabel: `${pathuNum}${getOrdSuffix(pathuNum)} பத்து`,
        fn: "_selectSectionWithPathu", args: [sec.id, sec.name, pathuNum],
        score: score + 10
      });
    }
    results.push({
      label: sec.name, sublabel: "Full section",
      fn: "_selectSection", args: [sec.id, sec.name], score
    });
  }

  // ── 6. Divyadesam — all 108, DB-driven ──
  const ddMap = await getDDMap();
  for (const [id, dd] of ddMap) {
    const ddScore = scoreMatch(t, dd.aliases);
    if (ddScore >= 35) {
      results.push({
        label: dd.name, sublabel: "திவ்யதேசம் — அனைத்து பாசுரங்கள்",
        fn: "_openDivyadesamById", args: [id, dd.name], score: ddScore + 10
      });
      results.push({
        label: dd.name + " — ஆழ்வார் வாரியாக", sublabel: "ஆழ்வார் வாரியாக பாசுரங்கள்",
        fn: "_openDivyadesamById", args: [id, dd.name, "azhwar"], score: ddScore
      });
    }
  }

  // ── 7. Anchor map — thirumozhi title search ──
  const hasStrong = results.some(r => r.score >= 70);
  if (!hasStrong || normTamil(t).length > 4) {
    try {
      results.push(...await searchAnchorMap(transcript));
    } catch(e) { /* non-fatal */ }
  }

  // ── 8. First-line (munnadi) search ───────────────────
  // Covers "வாரணம் ஆயிரம்", "ஓங்கி உலகளந்த", "ஆலை நீள்" etc.
  // Only runs when no strong section/desam match found
  const hasStrongAfterAnchor = results.some(r => r.score >= 70);
  if (!hasStrongAfterAnchor) {
    try {
      results.push(...await searchFirstLines(transcript));
    } catch(e) { /* non-fatal */ }
  }

  // ── 8. Sort, deduplicate, limit ──
  const seen = new Set();
  const unique = results
    .sort((a, b) => b.score - a.score)
    .filter(r => {
      const key = `${r.fn}:${JSON.stringify(r.args)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Nammazhwar → 4 results; all others → 3
  return unique.slice(0, nScore >= 20 ? 4 : 3);
}

// ═══════════════════════════════════════════════════════
// PRE-WARM on module import
// ═══════════════════════════════════════════════════════
getDDMap().catch(() => {});
getAnchorMap().catch(() => {});
getFirstLines().catch(() => {});

// ═══════════════════════════════════════════════════════
// ENTITY TAG SEARCH — NEW ADDITION
// Searches entity_master search_flag=1 tags
// Routes to correct destination based on entity_type
// ═══════════════════════════════════════════════════════

let _entityTagCache = null, _entityTagLoading = null;

function getEntityTags() {
  if (_entityTagCache) return Promise.resolve(_entityTagCache);
  if (_entityTagLoading) return _entityTagLoading;
  _entityTagLoading = (async () => {
    try {
      const data = await fetch(`${API_VOICE}/entity-tags`).then(r => r.json());
      _entityTagCache = data || [];
    } catch(e) { _entityTagCache = []; }
    return _entityTagCache;
  })();
  return _entityTagLoading;
}

// Special tag → direct route mapping (no DB needed)
const TAG_ROUTE_MAP = {
  "நித்யாநுஸந்தானம்":    { fn: "openNithyanusandhanam", args: [], label: "நித்யானுஸந்தானம்",   sublabel: "Full Nithyanusandhanam" },
  "நித்யானுஸந்தானம்":    { fn: "openNithyanusandhanam", args: [], label: "நித்யானுஸந்தானம்",   sublabel: "Full Nithyanusandhanam" },
  "நைச்சாநுஸந்தானம்":   { fn: "openNithyanusandhanam", args: [], label: "நைச்சாநுஸந்தானம்",  sublabel: "Nithyanusandhanam section" },
  "சாற்றுமுறை":           { fn: "openSattrumurai",       args: [null], label: "சாற்றுமுறை",     sublabel: "Sattrumurai" },
  "முன்னடி பின்னடி":     { fn: "openMunnadiPinnadi",    args: [null], label: "முன்னடி பின்னடி", sublabel: "Munnadi Pinnadi" },
  "நீராட்டம்":            { fn: "_openNeeratam",   args: [], label: "நீராட்டம்",           sublabel: "பெரியாழ்வார் திருமொழி — நீராட்டம் பாசுரங்கள்" },
  "neerattam":             { fn: "_openNeeratam",   args: [], label: "நீராட்டம்",           sublabel: "பெரியாழ்வார் திருமொழி — நீராட்டம் பாசுரங்கள்" },
  "பூச்சூட்டல்":          { fn: "_openPoochoottal", args: [], label: "பூச்சூட்டல்",         sublabel: "பெரியாழ்வார் திருமொழி 2ம் பத்து 7ம் திருமொழி" },
  "poochoottal":           { fn: "_openPoochoottal", args: [], label: "பூச்சூட்டல்",         sublabel: "பெரியாழ்வார் திருமொழி 2ம் பத்து 7ம் திருமொழி" },
  "காப்பிடல்":            { fn: "_openKappidal",    args: [], label: "காப்பிடல்",           sublabel: "பெரியாழ்வார் திருமொழி 2ம் பத்து 8ம் திருமொழி" },
  "kappidal":              { fn: "_openKappidal",    args: [], label: "காப்பிடல்",           sublabel: "பெரியாழ்வார் திருமொழி 2ம் பத்து 8ம் திருமொழி" },
  "துயில் உணர்த்துதல்":  { fn: "openNithyanusandhanam", args: [], label: "துயில் உணர்த்துதல்", sublabel: "நித்யானுஸந்தானம் — துயில் உணர்த்துதல்" },
  "துயிலுணர்த்துதல்":    { fn: "openNithyanusandhanam", args: [], label: "துயில் உணர்த்துதல்", sublabel: "நித்யானுஸந்தானம் — துயில் உணர்த்துதல்" },
  "திருமஞ்சனம்":          { fn: "openNithyanusandhanam", args: [], label: "திருமஞ்சனம்",         sublabel: "நித்யானுஸந்தானம் — திருமஞ்சனம்" },
};

async function searchEntityTags(transcript) {
  const t = normTamil(transcript);
  const results = [];

  // Check special route tags first — score 110 beats all entity tag matches
  for (const [tag, route] of Object.entries(TAG_ROUTE_MAP)) {
    const tagN = normTamil(tag);
    if (t === tagN || t.includes(tagN) || tagN.includes(t)) {
      results.push({ ...route, score: 110 });
      return results; // exact concept match — no need to search further
    }
  }

  // Search entity tags
  try {
    const tags = await getEntityTags();
    const seen = new Set();

    for (const row of tags) {
      const tag = row.meta_value || "";
      if (!tag.trim()) continue;

      const score = scoreMatch(transcript, [tag]);
      if (score < 55) continue;  // raised from 30 to 55

      const key = `${row.entity_type}:${row.entity_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (row.entity_type === "pasuram") {
        results.push({
          label: tag,
          sublabel: `பாசுரம் ${row.entity_id} — ${tag}`,
          fn: "_openGlobalPasuram",
          args: [row.entity_id],
          score: score + 5
        });
      } else if (row.entity_type === "section") {
        results.push({
          label: tag,
          sublabel: `Section — ${tag}`,
          fn: "_selectSection",
          args: [row.entity_id, tag],
          score
        });
      } else if (row.entity_type === "pathu") {
        // pathu entity_id is pathu_id in periya thirumozhi (section 11)
        // Route to section 11 (பெரிய திருமொழி) with pathu number
        results.push({
          label: tag,
          sublabel: `பெரிய திருமொழி — ${tag}`,
          fn: "_selectSectionWithPathu",
          args: [11, "பெரிய திருமொழி", row.entity_id],
          score
        });
      } else if (row.entity_type === "thirumozhi") {
        results.push({
          label: tag,
          sublabel: `திருமொழி — ${tag}`,
          fn: "_selectSection",
          args: [row.entity_id, tag],
          score
        });
      }
    }
  } catch(e) { /* non-fatal */ }

  return results;
}

// Hook entity tag search into resolveVoiceQuery
// Call this AFTER the existing resolveVoiceQuery to extend results
export async function resolveVoiceQueryExtended(transcript) {
  // Check TAG_ROUTE_MAP FIRST — these are hardcoded concepts that must win
  const t = normTamil(transcript);
  for (const [tag, route] of Object.entries(TAG_ROUTE_MAP)) {
    const tagN = normTamil(tag);
    if (t === tagN || t.includes(tagN) || tagN.includes(t)) {
      return [{ ...route, score: 110 }];
    }
  }

  const [base, entity] = await Promise.all([
    resolveVoiceQuery(transcript),
    searchEntityTags(transcript)
  ]);

  // Merge — entity results only added if no strong base match
  const hasStrong = base.some(r => r.score >= 70);
  const combined = hasStrong
    ? base
    : [...base, ...entity];

  const seen = new Set();
  return combined
    .sort((a, b) => b.score - a.score)
    .filter(r => {
      const key = `${r.fn}:${JSON.stringify(r.args)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

// Pre-warm entity tags
getEntityTags().catch(() => {});