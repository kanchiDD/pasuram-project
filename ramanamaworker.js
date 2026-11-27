// =============================================================
//  ramanamaworker.js — Sri Rama Nama Voice Bank (separate worker)
//  Registration, voice upload, moderation, random player list,
//  play counting. Uses the same D1 (pasuram_db) with its own rn_*
//  tables; touches nothing of the 4000 / stotra workers.
// =============================================================
//
//  ── ONE-TIME CLOUDFLARE SETUP (dashboard) ──
//  1) R2 → Create bucket  "ramanama-pending"   (keep it PRIVATE: no public
//     access, no custom domain). Recordings wait here until moderated.
//  2) Workers & Pages → Create → Worker, name it  ramanamaworker,
//     paste this file, Deploy.
//  3) Worker → Settings → Bindings:
//        D1 database   variable  db       → pasuram_db
//        R2 bucket     variable  PENDING  → ramanama-pending
//        R2 bucket     variable  AUDIO    → arulicheyal-audio   (the public one)
//  4) Worker → Settings → Variables and Secrets:
//        Secret  RESEND_API_KEY   = the same Resend key the contact worker uses
//        Text    ADMIN_EMAIL      = your Google email (the only admin)
//        Text    GOOGLE_CLIENT_ID = 49899300551-sqg7tbbfkficni6q806p851s9j1pphuu.apps.googleusercontent.com
//     Optional:
//        Text    ALLOW_ORIGIN     = https://arulicheyal.org,https://www.arulicheyal.org
//        Text    AUDIO_BASE       = https://audio.arulicheyal.org
//        Text    FROM_EMAIL       = Sri Rama Nama Voice Bank <ramanama@mail.arulicheyal.org>
//        Text    SITE_URL         = https://arulicheyal.org/ramanama.html
// =============================================================

const BUILD = "rn-2026-11-17-c";

const DEFAULTS = {
  ALLOW_ORIGIN: "https://arulicheyal.org,https://www.arulicheyal.org",
  AUDIO_BASE:   "https://audio.arulicheyal.org",
  FROM_EMAIL:   "Sri Rama Nama Voice Bank <ramanama@mail.arulicheyal.org>",
  SITE_URL:     "https://arulicheyal.org/ramanama.html"
};
const CONSENT_VERSION = "v1";
const COUNTS = [18, 36, 108];
const MAX_BYTES = 3 * 1024 * 1024;     // 108 ராம at 32 kbps is ~0.5 MB
const MIN_BYTES = 4 * 1024;

const cfg = (env, k) => env[k] || DEFAULTS[k];

// ── CORS ─────────────────────────────────────────────────────
function corsFor(request, env) {
  const allowed = cfg(env, "ALLOW_ORIGIN").split(",").map(s => s.trim());
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(body, status, cors, extra = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors, ...extra }
  });
}
const err = (msg, status, cors) => json({ ok: false, error: msg }, status, cors);

// ── Google sign-in: verify the ID token with Google ──────────
const tokenCache = new Map();   // token -> { p, exp }
async function googleUser(request, env) {
  const h = request.headers.get("Authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const now = Date.now();
  const hit = tokenCache.get(token);
  if (hit && hit.exp > now) return hit.p;
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token));
  if (!r.ok) return null;
  const p = await r.json();
  const okIss = p.iss === "accounts.google.com" || p.iss === "https://accounts.google.com";
  const exp = Number(p.exp) * 1000;
  if (!okIss || p.aud !== env.GOOGLE_CLIENT_ID || !(exp > now) || String(p.email_verified) !== "true") return null;
  const user = { sub: p.sub, email: String(p.email || "").toLowerCase(), name: p.name || "" };
  if (tokenCache.size > 500) tokenCache.clear();
  tokenCache.set(token, { p: user, exp });
  return user;
}

async function modRole(env, email) {
  if (!email) return null;
  if (env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase()) return "admin";
  const r = await env.db.prepare("SELECT 1 FROM rn_moderator WHERE email = ?").bind(email).first();
  return r ? "moderator" : null;
}

// ── small helpers ────────────────────────────────────────────
const contribNo = id => "#" + String(id).padStart(6, "0");
const nowIso = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const today = () => new Date().toISOString().slice(0, 10);
const randKey = () => crypto.getRandomValues(new Uint32Array(1))[0] >>> 1;
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function looksLikeMp3(buf) {
  const b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true;         // "ID3"
  return b[0] === 0xFF && (b[1] & 0xE0) === 0xE0;                            // frame sync
}
function publicUrl(env, key) { return cfg(env, "AUDIO_BASE").replace(/\/$/, "") + "/" + key; }

async function devoteeBySub(env, sub) {
  return env.db.prepare("SELECT * FROM rn_devotee WHERE google_sub = ?").bind(sub).first();
}

// ── email (Resend, same account as the contact form) ─────────
async function sendMail(env, to, subject, html, text) {
  if (!env.RESEND_API_KEY || !to) return "skipped";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg(env, "FROM_EMAIL"), to: [to], subject, html, text })
    });
    return r.ok ? "sent" : "failed " + r.status;
  } catch (e) { return "failed"; }
}
// Emails go in the language the devotee registered in (ui_script), with English below.
const MAIL = {
  ta: { hi: "ஸ்ரீ ராம ஜயம்", subA: "உங்கள் ராம நாமக் குரல் வங்கியில் சேர்ந்தது", subR: "தயவுசெய்து ராம நாமத்தை மீண்டும் பதிவு செய்யுங்கள்",
        a: (nm, n, no) => `${nm}, உங்கள் ${n} ராம நாமப் பதிவு (${no}) ஸ்ரீ ராம நாம குரல் வங்கியில் சேர்க்கப்பட்டது. இனி உலகெங்கும் உள்ள பக்தர்களுக்கு இது ஒலிக்கும்.`,
        r: (nm, rs) => `${nm}, உங்கள் பதிவை வங்கியில் சேர்க்க இயலவில்லை.${rs ? " காரணம்: " + rs : ""} தயவுசெய்து மீண்டும் பதிவு செய்யுங்கள் – அதற்கான வசதி இப்போது திறக்கப்பட்டுள்ளது.` },
  deva: { hi: "जय श्री राम", subA: "आपकी राम नाम आवाज़ स्वर बैंक में जुड़ गई", subR: "कृपया राम नाम फिर से रिकॉर्ड करें",
        a: (nm, n, no) => `${nm} जी, आपकी ${n} राम नाम की रिकॉर्डिंग (${no}) श्री राम नाम स्वर बैंक में जोड़ दी गई है। अब यह विश्व भर के भक्तों के लिए बजेगी।`,
        r: (nm, rs) => `${nm} जी, आपकी रिकॉर्डिंग बैंक में नहीं जोड़ी जा सकी।${rs ? " कारण: " + rs : ""} कृपया फिर से रिकॉर्ड करें – इसकी सुविधा अब फिर से खुल गई है।` },
  te: { hi: "శ్రీ రామ జయం", subA: "మీ రామ నామ స్వరం స్వర బ్యాంకులో చేరింది", subR: "దయచేసి రామ నామాన్ని మళ్ళీ రికార్డ్ చేయండి",
        a: (nm, n, no) => `${nm} గారూ, మీ ${n} రామ నామ రికార్డింగ్ (${no}) శ్రీ రామ నామ స్వర బ్యాంకులో చేర్చబడింది. ఇకపై ఇది ప్రపంచవ్యాప్తంగా ఉన్న భక్తులకు వినిపిస్తుంది.`,
        r: (nm, rs) => `${nm} గారూ, మీ రికార్డింగ్‌ను బ్యాంకులో చేర్చలేకపోయాము.${rs ? " కారణం: " + rs : ""} దయచేసి మళ్ళీ రికార్డ్ చేయండి – అందుకు సౌకర్యం ఇప్పుడు మళ్ళీ తెరవబడింది.` },
  kn: { hi: "ಶ್ರೀ ರಾಮ ಜಯಂ", subA: "ನಿಮ್ಮ ರಾಮ ನಾಮ ಧ್ವನಿ ಬ್ಯಾಂಕ್‌ಗೆ ಸೇರಿದೆ", subR: "ದಯವಿಟ್ಟು ರಾಮ ನಾಮವನ್ನು ಮತ್ತೆ ರೆಕಾರ್ಡ್ ಮಾಡಿ",
        a: (nm, n, no) => `${nm}, ನಿಮ್ಮ ${n} ರಾಮ ನಾಮದ ರೆಕಾರ್ಡಿಂಗ್ (${no}) ಶ್ರೀ ರಾಮ ನಾಮ ಧ್ವನಿ ಬ್ಯಾಂಕ್‌ಗೆ ಸೇರ್ಪಡೆಯಾಗಿದೆ. ಇನ್ನು ಮುಂದೆ ಇದು ಜಗತ್ತಿನಾದ್ಯಂತದ ಭಕ್ತರಿಗೆ ಕೇಳಿಸುತ್ತದೆ.`,
        r: (nm, rs) => `${nm}, ನಿಮ್ಮ ರೆಕಾರ್ಡಿಂಗ್ ಅನ್ನು ಬ್ಯಾಂಕ್‌ಗೆ ಸೇರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.${rs ? " ಕಾರಣ: " + rs : ""} ದಯವಿಟ್ಟು ಮತ್ತೆ ರೆಕಾರ್ಡ್ ಮಾಡಿ – ಅದಕ್ಕೆ ಸೌಲಭ್ಯ ಈಗ ಮತ್ತೆ ತೆರೆಯಲಾಗಿದೆ.` },
  ml: { hi: "ശ്രീ രാമ ജയം", subA: "നിങ്ങളുടെ രാമ നാമ ശബ്ദം ബാങ്കിൽ ചേർന്നു", subR: "ദയവായി രാമ നാമം വീണ്ടും റെക്കോർഡ് ചെയ്യുക",
        a: (nm, n, no) => `${nm}, നിങ്ങളുടെ ${n} രാമ നാമ റെക്കോർഡിംഗ് (${no}) ശ്രീ രാമ നാമ ശബ്ദ ബാങ്കിൽ ചേർത്തു. ഇനി ഇത് ലോകമെങ്ങുമുള്ള ഭക്തർക്കായി മുഴങ്ങും.`,
        r: (nm, rs) => `${nm}, നിങ്ങളുടെ റെക്കോർഡിംഗ് ബാങ്കിൽ ചേർക്കാൻ കഴിഞ്ഞില്ല.${rs ? " കാരണം: " + rs : ""} ദയവായി വീണ്ടും റെക്കോർഡ് ചെയ്യുക – അതിനുള്ള സൗകര്യം ഇപ്പോൾ വീണ്ടും തുറന്നിട്ടുണ്ട്.` },
  gu: { hi: "જય શ્રી રામ", subA: "તમારો રામ નામ સ્વર બેંકમાં ઉમેરાયો", subR: "કૃપા કરીને રામ નામ ફરીથી રેકોર્ડ કરો",
        a: (nm, n, no) => `${nm}, તમારું ${n} રામ નામનું રેકોર્ડિંગ (${no}) શ્રી રામ નામ સ્વર બેંકમાં ઉમેરાયું છે. હવે તે વિશ્વભરના ભક્તો માટે વાગશે.`,
        r: (nm, rs) => `${nm}, તમારું રેકોર્ડિંગ બેંકમાં ઉમેરી શકાયું નહીં.${rs ? " કારણ: " + rs : ""} કૃપા કરીને ફરીથી રેકોર્ડ કરો – તેની સુવિધા હવે ફરી ખૂલી ગઈ છે.` },
  bn: { hi: "জয় শ্রী রাম", subA: "আপনার রাম নাম কণ্ঠ স্বর ব্যাংকে যুক্ত হয়েছে", subR: "অনুগ্রহ করে রাম নাম আবার রেকর্ড করুন",
        a: (nm, n, no) => `${nm}, আপনার ${n} রাম নামের রেকর্ডিং (${no}) শ্রী রাম নাম স্বর ব্যাংকে যুক্ত হয়েছে। এখন থেকে এটি সারা বিশ্বের ভক্তদের জন্য বাজবে।`,
        r: (nm, rs) => `${nm}, আপনার রেকর্ডিং ব্যাংকে যুক্ত করা যায়নি।${rs ? " কারণ: " + rs : ""} অনুগ্রহ করে আবার রেকর্ড করুন – সেই সুবিধা এখন আবার খোলা হয়েছে।` },
  iast: { hi: "Sri Rama Jayam", subA: "Your Rama Nama voice is now in the Voice Bank", subR: "Please record your Rama Nama again – Sri Rama Nama Voice Bank",
        a: (nm, n, no) => `${nm}, your recording of ${n} Rama Nama (${no}) has been accepted into the Sri Rama Nama Voice Bank. From now on it will be played to devotees around the world.`,
        r: (nm, rs) => `${nm}, we could not add your recording to the bank.${rs ? " Reason: " + rs : ""} Please record again – recording is open for you once more.` }
};
// the moderator's standard reasons, in each language (other reasons are sent as typed)
const RS_EN = ["Not Rama Nama chanting", "Other voices or talking in the recording", "Only noise or silence", "Recording is not clear"];
const RS = {"ta": ["ராம நாம ஜபம் இல்லை", "பதிவில் வேறு குரல்கள் அல்லது பேச்சு உள்ளது", "இரைச்சல் அல்லது அமைதி மட்டுமே உள்ளது", "பதிவு தெளிவாக இல்லை"], "hi": ["राम नाम जप नहीं है", "रिकॉर्डिंग में दूसरी आवाज़ें या बातचीत है", "केवल शोर या मौन है", "रिकॉर्डिंग स्पष्ट नहीं है"], "te": ["రామ నామ జపం కాదు", "రికార్డింగ్‌లో ఇతర స్వరాలు లేదా మాటలు ఉన్నాయి", "శబ్దం లేదా నిశ్శబ్దం మాత్రమే ఉంది", "రికార్డింగ్ స్పష్టంగా లేదు"], "kn": ["ರಾಮ ನಾಮ ಜಪವಲ್ಲ", "ರೆಕಾರ್ಡಿಂಗ್‌ನಲ್ಲಿ ಇತರ ಧ್ವನಿಗಳು ಅಥವಾ ಮಾತುಕತೆ ಇದೆ", "ಕೇವಲ ಶಬ್ದ ಅಥವಾ ನಿಶ್ಶಬ್ದ ಮಾತ್ರ ಇದೆ", "ರೆಕಾರ್ಡಿಂಗ್ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ"], "ml": ["രാമ നാമ ജപമല്ല", "റെക്കോർഡിംഗിൽ മറ്റു ശബ്ദങ്ങളോ സംസാരമോ ഉണ്ട്", "വെറും ഒച്ചയോ നിശ്ശബ്ദതയോ മാത്രം", "റെക്കോർഡിംഗ് വ്യക്തമല്ല"], "gu": ["રામ નામનો જપ નથી", "રેકોર્ડિંગમાં બીજા અવાજ અથવા વાતચીત છે", "માત્ર ઘોંઘાટ અથવા મૌન છે", "રેકોર્ડિંગ સ્પષ્ટ નથી"], "bn": ["রাম নাম জপ নয়", "রেকর্ডিংয়ে অন্য কণ্ঠ বা কথাবার্তা আছে", "শুধু আওয়াজ বা নীরবতা", "রেকর্ডিং স্পষ্ট নয়"]};
function mailLang(d) { return MAIL[d.ui_script] ? d.ui_script : "ta"; }
function reasonIn(lang, r) {
  const i = RS_EN.indexOf(r); const k = lang === "deva" ? "hi" : lang === "iast" ? "en" : lang;
  return i >= 0 && RS[k] ? RS[k][i] : r;
}
function buildMail(site, lang, parts) {          // parts: [{text, html}] – devotee's language first, then English
  const text = parts.map(p => p.text).join("\n\n") + "\n\n" + site;
  const html = parts.map(p => `<p>${p.html}</p>`).join("\n") + `\n<p><a href="${site}">${site}</a></p>`;
  return { text, html };
}
function mailApproved(env, d, c) {
  const site = cfg(env, "SITE_URL"), lang = mailLang(d), M = MAIL[lang], E = MAIL.iast, no = contribNo(c.contribution_id);
  const parts = [{ text: M.hi, html: esc(M.hi) }, { text: M.a(d.display_name, c.nama_count, no), html: M.a(esc(d.display_name), c.nama_count, no) }];
  if (lang !== "iast") parts.push({ text: E.a(d.display_name, c.nama_count, no), html: E.a(esc(d.display_name), c.nama_count, no) });
  const m = buildMail(site, lang, parts);
  return sendMail(env, d.email, M.subA + " – " + no, m.html, m.text);
}
function mailRejected(env, d, c, reason) {
  const site = cfg(env, "SITE_URL"), lang = mailLang(d), M = MAIL[lang], E = MAIL.iast;
  const stop = (s, l) => !s || /[.!?।]$/.test(s) ? s : s + (l === "deva" || l === "bn" ? "।" : ".");
  const r = stop(reason ? String(reason).trim() : "", "iast"), rl = stop(reasonIn(lang, reason ? String(reason).trim() : ""), lang);
  const parts = [{ text: M.hi, html: esc(M.hi) }, { text: M.r(d.display_name, rl), html: M.r(esc(d.display_name), esc(rl)) }];
  if (lang !== "iast") parts.push({ text: E.r(d.display_name, r), html: E.r(esc(d.display_name), esc(r)) });
  const m = buildMail(site, lang, parts);
  return sendMail(env, d.email, M.subR, m.html, m.text);
}

// =============================================================
export default {
  async fetch(request, env) {
    const cors = corsFor(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    try {
      // ---------- public ----------
      if (path === "/rn/version") return json({ ok: true, build: BUILD }, 200, cors);

      if (path === "/rn/stats" && request.method === "GET") {
        const a = await env.db.prepare(
          `SELECT COUNT(*) AS voices, COUNT(DISTINCT d.country_code) AS countries,
                  COALESCE(SUM(c.nama_count),0) AS nama_in_bank,
                  COALESCE(SUM(c.duration_sec),0) AS seconds_in_bank
             FROM rn_contribution c JOIN rn_devotee d ON d.devotee_id = c.devotee_id
            WHERE c.status = 'APPROVED'`).first();
        const t = await env.db.prepare(
          `SELECT COALESCE(SUM(p.plays),0) AS plays_today,
                  COALESCE(SUM(p.plays * c.nama_count),0) AS nama_played_today,
                  COUNT(DISTINCT p.country) AS listener_countries_today
             FROM rn_play_daily p JOIN rn_contribution c ON c.contribution_id = p.contribution_id
            WHERE p.play_date = ?`).bind(today()).first();
        return json({ ok: true, ...a, ...t }, 200, cors, { "Cache-Control": "public, max-age=60" });
      }

      if (path === "/rn/playlist" && request.method === "GET") {
        const after = Math.max(-1, parseInt(url.searchParams.get("after") || "-1", 10) || -1);
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "100", 10) || 100));
        const sel = `SELECT c.contribution_id AS id, c.audio_key, c.nama_count AS count, c.duration_sec AS dur,
                            c.random_key AS k, d.display_name, d.anonymous, d.country_code, d.country_name
                       FROM rn_contribution c JOIN rn_devotee d ON d.devotee_id = c.devotee_id
                      WHERE c.status = 'APPROVED' AND c.random_key `;
        let rows = (await env.db.prepare(sel + "> ? ORDER BY c.random_key LIMIT ?").bind(after, limit).all()).results || [];
        let wrapped = false;
        if (rows.length < limit && after >= 0) {          // wrap round to the start
          const more = (await env.db.prepare(sel + "<= ? ORDER BY c.random_key LIMIT ?").bind(after, limit - rows.length).all()).results || [];
          if (more.length) wrapped = true;
          rows = rows.concat(more);
        }
        const items = rows.map(r => ({
          id: r.id, no: contribNo(r.id), url: publicUrl(env, r.audio_key), count: r.count,
          dur: r.dur, name: r.anonymous ? null : r.display_name,
          country: r.country_name, country_code: r.country_code, k: r.k
        }));
        return json({ ok: true, items, wrapped, next: items.length ? items[items.length - 1].k : -1 },
          200, cors, { "Cache-Control": "public, max-age=60" });
      }

      if (path === "/rn/plays" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const list = Array.isArray(body.plays) ? body.plays.slice(0, 50) : [];
        const country = String((request.cf && request.cf.country) || "XX").slice(0, 2).toUpperCase();
        const day = today();
        const stmts = [];
        for (const p of list) {
          const id = parseInt(p.id, 10), n = Math.min(20, Math.max(0, parseInt(p.n, 10) || 0));
          if (!id || !n) continue;
          stmts.push(env.db.prepare(
            `INSERT INTO rn_play_daily (contribution_id, play_date, country, plays)
             SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM rn_contribution WHERE contribution_id = ? AND status = 'APPROVED')
             ON CONFLICT (contribution_id, play_date, country) DO UPDATE SET plays = plays + excluded.plays`
          ).bind(id, day, country, n, id));
        }
        if (stmts.length) await env.db.batch(stmts);
        return json({ ok: true, counted: stmts.length }, 200, cors);
      }

      // ---------- signed-in devotee ----------
      if (path === "/rn/me" || path === "/rn/register" || path === "/rn/upload" ||
          path === "/rn/my-audio" || path === "/rn/withdraw") {
        const u = await googleUser(request, env);
        if (!u) return err("Please sign in with Google again.", 401, cors);

        if (path === "/rn/me" && request.method === "GET") {
          const d = await devoteeBySub(env, u.sub);
          if (!d) return json({ ok: true, registered: false, google: { email: u.email, name: u.name } }, 200, cors);
          const c = await env.db.prepare("SELECT * FROM rn_contribution WHERE devotee_id = ?").bind(d.devotee_id).first();
          let plays = null;
          if (c && c.status === "APPROVED") {
            plays = await env.db.prepare(
              `SELECT COALESCE(SUM(plays),0) AS total, COUNT(DISTINCT country) AS countries,
                      COALESCE(SUM(CASE WHEN play_date = ? THEN plays END),0) AS today
                 FROM rn_play_daily WHERE contribution_id = ?`).bind(today(), c.contribution_id).first();
            plays.nama = plays.total * c.nama_count;
          }
          return json({
            ok: true, registered: true,
            devotee: {
              display_name: d.display_name, mobile: d.mobile, country_code: d.country_code,
              country_name: d.country_name, anonymous: !!d.anonymous, ui_script: d.ui_script, email: d.email
            },
            contribution: c ? {
              no: contribNo(c.contribution_id), status: c.status, count: c.nama_count,
              dur: c.duration_sec, reason: c.reject_reason, submitted_at: c.submitted_at,
              published_at: c.published_at, can_record: c.status === "REJECTED" || c.status === "WITHDRAWN"
            } : null,
            can_record: !c || c.status === "REJECTED" || c.status === "WITHDRAWN",
            plays
          }, 200, cors);
        }

        if (path === "/rn/register" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const name = clean(b.display_name, 60);
          const mobile = String(b.mobile || "").replace(/[^\d+]/g, "").slice(0, 20);
          const cc = String(b.country_code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
          const cn = clean(b.country_name, 60);
          const anon = b.anonymous ? 1 : 0;
          const script = ["ta", "te", "kn", "ml", "deva", "iast", "gu", "bn"].includes(b.ui_script) ? b.ui_script : "ta";
          if (!name || mobile.replace(/\D/g, "").length < 6 || cc.length !== 2 || !cn)
            return err("Please fill in name, mobile number and country.", 400, cors);
          const d = await devoteeBySub(env, u.sub);
          if (d) {
            await env.db.prepare(
              `UPDATE rn_devotee SET email=?, google_name=?, mobile=?, display_name=?, country_code=?, country_name=?,
                      anonymous=?, ui_script=?, updated_at=CURRENT_TIMESTAMP WHERE devotee_id=?`)
              .bind(u.email, u.name, mobile, name, cc, cn, anon, script, d.devotee_id).run();
          } else {
            await env.db.prepare(
              `INSERT INTO rn_devotee (devotee_id, google_sub, email, google_name, mobile, display_name,
                                       country_code, country_name, anonymous, ui_script)
               VALUES (?,?,?,?,?,?,?,?,?,?)`)
              .bind(crypto.randomUUID(), u.sub, u.email, u.name, mobile, name, cc, cn, anon, script).run();
          }
          return json({ ok: true }, 200, cors);
        }

        if (path === "/rn/upload" && request.method === "POST") {
          const d = await devoteeBySub(env, u.sub);
          if (!d) return err("Please register first.", 400, cors);
          const q = url.searchParams;
          const count = parseInt(q.get("count"), 10);
          if (!COUNTS.includes(count)) return err("Choose 18, 36 or 108.", 400, cors);
          if (q.get("consent") !== CONSENT_VERSION) return err("Please accept the consent.", 400, cors);
          const prev = await env.db.prepare("SELECT * FROM rn_contribution WHERE devotee_id = ?").bind(d.devotee_id).first();
          if (prev && !(prev.status === "REJECTED" || prev.status === "WITHDRAWN"))
            return err("You have already offered your voice. Thank you!", 409, cors);
          const buf = await request.arrayBuffer();
          if (buf.byteLength < MIN_BYTES || buf.byteLength > MAX_BYTES || !looksLikeMp3(buf))
            return err("The recording could not be read. Please record again.", 400, cors);
          const pace = Math.min(3, Math.max(0.5, parseFloat(q.get("pace")) || 0));
          const dur = Math.min(900, Math.max(1, parseFloat(q.get("dur")) || buf.byteLength * 8 / 32000));
          const silent = String(q.get("silent") || "").replace(/[^\d ]/g, "").slice(0, 400);
          const key = "pending/" + d.devotee_id + "/" + crypto.randomUUID() + ".mp3";
          await env.PENDING.put(key, buf, { httpMetadata: { contentType: "audio/mpeg" } });
          try {
            if (prev) {
              await env.db.prepare(
                `UPDATE rn_contribution SET nama_count=?, pace_sec=?, duration_sec=?, size_bytes=?, silent_beats=?,
                        status='PENDING', audio_key=?, attempts=attempts+1, consent_version=?, consent_at=?,
                        submitted_at=CURRENT_TIMESTAMP, reviewed_at=NULL, reviewed_by=NULL, reject_reason=NULL,
                        published_at=NULL, random_key=NULL, email_status=NULL
                  WHERE contribution_id=? AND status IN ('REJECTED','WITHDRAWN')`)
                .bind(count, pace, dur, buf.byteLength, silent, key, CONSENT_VERSION, nowIso(), prev.contribution_id).run();
            } else {
              await env.db.prepare(
                `INSERT INTO rn_contribution (devotee_id, nama_count, pace_sec, duration_sec, size_bytes, silent_beats,
                                              status, audio_key, consent_version, consent_at)
                 VALUES (?,?,?,?,?,?,'PENDING',?,?,?)`)
                .bind(d.devotee_id, count, pace, dur, buf.byteLength, silent, key, CONSENT_VERSION, nowIso()).run();
            }
          } catch (e) {
            await env.PENDING.delete(key).catch(() => {});
            if (String(e).includes("UNIQUE")) return err("You have already offered your voice. Thank you!", 409, cors);
            throw e;
          }
          const c = await env.db.prepare("SELECT contribution_id FROM rn_contribution WHERE devotee_id = ?").bind(d.devotee_id).first();
          return json({ ok: true, no: contribNo(c.contribution_id) }, 200, cors);
        }

        if (path === "/rn/my-audio" && request.method === "GET") {
          const d = await devoteeBySub(env, u.sub);
          const c = d && await env.db.prepare("SELECT status, audio_key FROM rn_contribution WHERE devotee_id = ?").bind(d.devotee_id).first();
          if (!c || !c.audio_key) return err("No recording.", 404, cors);
          if (c.status === "APPROVED") return json({ ok: true, url: publicUrl(env, c.audio_key) }, 200, cors);
          const obj = await env.PENDING.get(c.audio_key);
          if (!obj) return err("No recording.", 404, cors);
          return new Response(obj.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", ...cors } });
        }

        if (path === "/rn/withdraw" && request.method === "POST") {
          const d = await devoteeBySub(env, u.sub);
          const c = d && await env.db.prepare("SELECT * FROM rn_contribution WHERE devotee_id = ?").bind(d.devotee_id).first();
          if (!c || !c.audio_key) return err("Nothing to withdraw.", 400, cors);
          if (c.status === "APPROVED") await env.AUDIO.delete(c.audio_key);
          else await env.PENDING.delete(c.audio_key);
          await env.db.prepare(
            `UPDATE rn_contribution SET status='WITHDRAWN', audio_key=NULL, random_key=NULL WHERE contribution_id=?`)
            .bind(c.contribution_id).run();
          return json({ ok: true }, 200, cors);
        }
        return err("Not found", 404, cors);
      }

      // ---------- moderation ----------
      if (path.startsWith("/rn/mod/")) {
        const u = await googleUser(request, env);
        if (!u) return err("Please sign in with Google again.", 401, cors);
        const role = await modRole(env, u.email);
        if (!role) return err("This Google account is not a moderator.", 403, cors);

        if (path === "/rn/mod/whoami") return json({ ok: true, role, email: u.email }, 200, cors);

        if (path === "/rn/mod/queue" && request.method === "GET") {
          const rows = (await env.db.prepare(
            `SELECT c.contribution_id AS id, c.nama_count AS count, c.pace_sec AS pace, c.duration_sec AS dur,
                    c.silent_beats, c.attempts, c.submitted_at, d.display_name, d.anonymous, d.country_name
               FROM rn_contribution c JOIN rn_devotee d ON d.devotee_id = c.devotee_id
              WHERE c.status = 'PENDING' ORDER BY c.submitted_at LIMIT 100`).all()).results || [];
          const total = await env.db.prepare("SELECT COUNT(*) AS n FROM rn_contribution WHERE status='PENDING'").first();
          return json({ ok: true, total: total.n, items: rows.map(r => ({ ...r, no: contribNo(r.id) })) }, 200, cors);
        }

        if (path === "/rn/mod/audio" && request.method === "GET") {
          const id = parseInt(url.searchParams.get("id"), 10);
          const c = await env.db.prepare("SELECT status, audio_key FROM rn_contribution WHERE contribution_id = ?").bind(id).first();
          if (!c || !c.audio_key) return err("No recording.", 404, cors);
          const obj = c.status === "APPROVED" ? await env.AUDIO.get(c.audio_key) : await env.PENDING.get(c.audio_key);
          if (!obj) return err("No recording.", 404, cors);
          return new Response(obj.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", ...cors } });
        }

        if (path === "/rn/mod/decide" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const id = parseInt(b.id, 10);
          const decision = b.decision === "APPROVE" ? "APPROVE" : b.decision === "REJECT" ? "REJECT" : "";
          const reason = clean(b.reason, 300);
          if (!id || !decision) return err("Bad request.", 400, cors);
          const c = await env.db.prepare("SELECT * FROM rn_contribution WHERE contribution_id = ? AND status = 'PENDING'").bind(id).first();
          if (!c) return err("Already decided or not found.", 409, cors);
          const d = await env.db.prepare("SELECT * FROM rn_devotee WHERE devotee_id = ?").bind(c.devotee_id).first();

          if (decision === "APPROVE") {
            const obj = await env.PENDING.get(c.audio_key);
            if (!obj) return err("Recording file missing.", 500, cors);
            const data = await obj.arrayBuffer();
            const newKey = "ramanama/approved/" + id + "-" + crypto.randomUUID().slice(0, 8) + ".mp3";
            await env.AUDIO.put(newKey, data, {
              httpMetadata: { contentType: "audio/mpeg", cacheControl: "public, max-age=31536000, immutable" }
            });
            const upd = await env.db.prepare(
              `UPDATE rn_contribution SET status='APPROVED', audio_key=?, published_at=CURRENT_TIMESTAMP,
                      random_key=?, reviewed_at=CURRENT_TIMESTAMP, reviewed_by=?
                WHERE contribution_id=? AND status='PENDING'`)
              .bind(newKey, randKey(), u.email, id).run();
            if (!upd.meta || upd.meta.changes !== 1) { await env.AUDIO.delete(newKey).catch(() => {}); return err("Already decided.", 409, cors); }
            await env.PENDING.delete(c.audio_key).catch(() => {});
            const mail = await mailApproved(env, d, c);
            await env.db.prepare("UPDATE rn_contribution SET email_status=? WHERE contribution_id=?").bind("approved " + mail, id).run();
            return json({ ok: true, status: "APPROVED", email: mail }, 200, cors);
          } else {
            const upd = await env.db.prepare(
              `UPDATE rn_contribution SET status='REJECTED', audio_key=NULL, reject_reason=?,
                      reviewed_at=CURRENT_TIMESTAMP, reviewed_by=?
                WHERE contribution_id=? AND status='PENDING'`)
              .bind(reason || null, u.email, id).run();
            if (!upd.meta || upd.meta.changes !== 1) return err("Already decided.", 409, cors);
            await env.PENDING.delete(c.audio_key).catch(() => {});
            const mail = await mailRejected(env, d, c, reason);
            await env.db.prepare("UPDATE rn_contribution SET email_status=? WHERE contribution_id=?").bind("rejected " + mail, id).run();
            return json({ ok: true, status: "REJECTED", email: mail }, 200, cors);
          }
        }

        // take an approved voice off the player (admin only)
        if (path === "/rn/mod/unpublish" && request.method === "POST") {
          if (role !== "admin") return err("Admin only.", 403, cors);
          const b = await request.json().catch(() => ({}));
          const id = parseInt(b.id, 10);
          const c = await env.db.prepare("SELECT * FROM rn_contribution WHERE contribution_id = ? AND status = 'APPROVED'").bind(id).first();
          if (!c) return err("Not found.", 404, cors);
          await env.AUDIO.delete(c.audio_key).catch(() => {});
          await env.db.prepare(
            `UPDATE rn_contribution SET status='REJECTED', audio_key=NULL, random_key=NULL, reject_reason=?,
                    reviewed_at=CURRENT_TIMESTAMP, reviewed_by=? WHERE contribution_id=?`)
            .bind(clean(b.reason, 300) || "Removed by admin", u.email, id).run();
          return json({ ok: true }, 200, cors);
        }

        if (path === "/rn/mod/moderators") {
          if (role !== "admin") return err("Admin only.", 403, cors);
          if (request.method === "POST") {
            const b = await request.json().catch(() => ({}));
            const email = String(b.email || "").trim().toLowerCase();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Enter a valid email.", 400, cors);
            if (b.action === "remove") await env.db.prepare("DELETE FROM rn_moderator WHERE email = ?").bind(email).run();
            else await env.db.prepare("INSERT OR IGNORE INTO rn_moderator (email, added_by) VALUES (?,?)").bind(email, u.email).run();
          }
          const rows = (await env.db.prepare("SELECT email, added_by, added_at FROM rn_moderator ORDER BY added_at").all()).results || [];
          return json({ ok: true, items: rows }, 200, cors);
        }
        return err("Not found", 404, cors);
      }

      return err("Not found", 404, cors);
    } catch (e) {
      console.error(e);
      return err("Server error. Please try again.", 500, cors);
    }
  }
};