// ── Chunk helper: splits any IN() query into safe batches of 99 ──
async function _inQuery(env, ids, sql, extraBinds = []) {
  if (!ids.length) return [];
  const CHUNK = 99;
  const all = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const ph    = chunk.map(() => "?").join(",");
    const res   = await env.db.prepare(sql.replace("__IN__", ph))
                    .bind(...extraBinds, ...chunk).all();
    all.push(...(res.results || []));
  }
  return all;
}


// ── Script-aware fallback: batched text_script lookup for one column,
// falling back to the original Tamil for any row with no converted text
// yet. No-op (returns rows untouched) when no script is requested. ──
async function applyScript(env, script, srcTable, srcCol, rows, idOf, field) {
  if (!script) return rows;
  const ids = [...new Set(rows.map(idOf).filter(v => v != null).map(String))];
  if (!ids.length) return rows;
  const overrides = await _inQuery(env, ids,
    `SELECT src_key, text FROM text_script
     WHERE src_table='${srcTable}' AND src_col='${srcCol}' AND script=? AND src_key IN (__IN__)`,
    [script]
  );
  const map = {};
  for (const r of overrides) map[r.src_key] = r.text;
  return rows.map(r => ({ ...r, [field]: map[String(idOf(r))] ?? r[field] }));
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    /* 🟢 UI CONTENT STRINGS — literals that live in the renderers rather than
       in content tables (முற்றிற்று, இதர பிரபந்தங்கள், the cover captions, the
       31 ceremonial section titles). Returns { ui_key: text }.
       With ?script= the converted text; without it the Tamil originals.
       This route exists only in the i18n worker, so the Tamil path never
       calls it — the renderers keep their own Tamil literals as the default. */
    if (url.pathname === "/api/ui-text") {
      try {
        const script = url.searchParams.get("script");
        const res = await env.db.prepare(
          `SELECT ui_key, text_tamil FROM ui_text_master`
        ).all();

        const rows = script
          ? await applyScript(env, script, 'ui_text_master', 'text_tamil',
              res.results || [], r => r.ui_key, 'text_tamil')
          : (res.results || []);

        const out = {};
        for (const r of rows) out[r.ui_key] = r.text_tamil;

        // Section short names, straight from section_master. The book index
        // must label sections that have no anchor_map section row (2, 4, 5,
        // 11, 26) and those names are already converted, so there is no point
        // duplicating them into ui_text_master.
        const secs = await env.db.prepare(
          `SELECT section_id, section_name FROM section_master`
        ).all();
        const secRows = script
          ? await applyScript(env, script, 'section_master', 'section_name',
              secs.results || [], r => r.section_id, 'section_name')
          : (secs.results || []);
        for (const r of secRows) {
          if (r.section_name) out["sec.name." + r.section_id] = r.section_name;
        }

        // Azhwar names and birth month/star, from author_master. The Azhwars
        // view carries these as Tamil literals keyed by the same ids, so
        // serving them converted avoids duplicating 39 strings into
        // ui_text_master.
        const auth = await env.db.prepare(
          `SELECT author_id, canonical_name, birth_month, birth_star FROM author_master`
        ).all();
        let aRows = auth.results || [];
        if (script) {
          for (const col of ["canonical_name", "birth_month", "birth_star"]) {
            if (!aRows.some(r => r[col])) continue;
            aRows = await applyScript(env, script, 'author_master', col,
              aRows, r => r.author_id, col);
          }
        }
        for (const r of aRows) {
          if (r.canonical_name) out["azh.name."  + r.author_id] = r.canonical_name;
          if (r.birth_month)    out["azh.month." + r.author_id] = r.birth_month;
          if (r.birth_star)     out["azh.star."  + r.author_id] = r.birth_star;
        }

        return new Response(JSON.stringify(out), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        // Never break a page over these: an empty map just means the
        // renderers fall back to their built-in Tamil literals.
        return new Response(JSON.stringify({}), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    /* 🟢 BUILD MARKER — exists only in the i18n worker, never in production.
       Hit /api/i18n-build to confirm which build is actually deployed. */
    if (url.pathname === "/api/i18n-build") {
      return new Response(JSON.stringify({
        build: "2026-09-18-b",
        wired: ["thousand", "section", "pasuram", "thaniyan", "pasuram-display", "madal", "kootrirukkai", "anchor-map", "thousand+closing", "ui-text", "divyadesam", "munnadi-pinnadi", "sattrumurai", "nithyanusandhanam", "star-pasuram", "azhwar-recital"]
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (url.pathname.startsWith("/voice/")) {
  return handleVoice(request, env);
}

if (url.pathname === "/voice/entity-tags") {
  return handleVoiceEntityTags(request, env);
}

    if (url.searchParams.get("view") === "4000") {
  return handleFullAPI(url, env);
}

    if (url.pathname.includes("/api/anchor-map")) {
  return handleAnchorMap(request, env);
}

    if (url.pathname.includes("/api/koil-pathus")) {
  return handleKoilPathus(request, env);
}

    if (url.pathname.includes("/api/entity-search")) {
  return handleEntitySearch(request, env);
}


    if (url.pathname.includes("/api/index")) {
  return handleIndex(request, env);
}

if (url.pathname.includes("/api/thousand")) {
  return handleThousand(request, env);
}
if (url.pathname.includes("/api/section")) {
  return handleSection(request, env);
}
if (url.pathname.includes("/api/pasuram-display")) {
  return handlePasuramDisplay(request, env);
}

if (url.pathname.includes("/api/pasuram-line-editor")) {
  return handlePasuramLineEditor(request, env);
}

if (url.pathname.includes("/api/pasuram")) {
  return handlePasuram(request, env);
}
if (url.pathname.includes("/api/thaniyan")) {
  return handleThaniyan(request, env);
}
if (url.pathname.includes("/api/madal")) {
  return handleMadal(request, env);
}
if (url.pathname.includes("/api/kootrirukkai")) {
  return handleKootrirukkai(request, env);
}
if (url.pathname === "/api/full") {
  return handleFullAPI(url, env);
}

if (url.pathname.includes("/api/divyadesam")) {
  return handleDivyadesam(request, env);
}

if (url.pathname.includes("/api/nithyanusandhanam")) {
  return handleNithyanusandhanam(request, env);
}

if (url.pathname.includes("/api/munnadi-pinnadi")) {
  return handleMunnadiPinnadi(request, env);
}

if (url.pathname.includes("/api/sattrumurai/list")) {
    return handleSattrumuraiList(request, env);
  }
 
  if (url.pathname.includes("/api/sattrumurai/")) {
    const id = url.pathname.split("/api/sattrumurai/")[1];
    const satSect = url.searchParams.get("sect") || "T";
    return handleSattrumurai(id, env, satSect, url.searchParams.get("script"));
  }

  if (url.pathname.includes("/api/star-pasuram")) {
  return handleStarPasuram(request, env);
}
  if (url.pathname.includes("/api/azhwar-recital")) {
  return handleAzhwarRecital(request, env);
}
  if (url.pathname.includes("/api/custom-recital-entities")) {
  try {
    return handleCustomRecitalEntities(env);
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" }
    });
  }
}
   if (url.pathname.includes("/auth/register")) {
  return handleAuthRegister(request, env);
}

if (url.pathname.includes("/api/vedam")) {
  return handleVedam(request, env);
}

if (url.pathname.includes("/api/vazhi-thaniyan")) {
  return handleVazhiThaniyan(request, env);
}

if (url.pathname.includes("/api/munnadi-editor")) {
  return handleMunnadiEditor(request, env);
}

if (url.pathname.includes("/api/suggest")) {
  return handleSuggest(request, env);
}

if (url.pathname.includes("/api/puzzle/try")) {
  return handlePuzzleTry(request, env);
}

if (url.pathname.includes("/api/notation-lines")) {
  return handleNotationLines(request, env);
}
if (url.pathname.includes("/api/notation-refs")) {
  return handleNotationRefs(request, env);
}


    return new Response("Not Found", { status: 404 });
  }
};

async function handleIndex(request, env) {
  const url = new URL(request.url);

  // DEFAULT LANGUAGE (IMPORTANT)
  const lang = url.searchParams.get("lang") || "ta";

  try {

    const result = await env.db.prepare(`
      SELECT section, content_order, content_text
      FROM page_content_master
      WHERE page_name = 'index' AND lang = ?
      ORDER BY 
        CASE section
          WHEN 'intro' THEN 1
          WHEN 'signature' THEN 2
          WHEN 'credits_heading' THEN 3
          WHEN 'credits' THEN 4
        END,
        content_order
    `).bind(lang).all();

    // STRUCTURED RESPONSE
    const data = {
      intro: [],
      signature: [],
      credits_heading: [],
      credits: []
    };

    result.results.forEach(row => {
      if (!data[row.section]) {
        data[row.section] = [];
      }
      data[row.section].push(row.content_text);
    });

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "DB error",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
}
async function handleThousand(request, env) {
  try {

    const script = new URL(request.url).searchParams.get("script");

    const result = await env.db.prepare(`
      SELECT thousand_id as id, canonical_name as name
      FROM thousands_master
      ORDER BY sequence_no
    `).all();

    // src_key is thousand_id — the SELECT aliases it to `id`, so that is
    // what keys the lookup. No-op when no ?script= is present.
    let rows = result.results;
    if (script) {
      rows = await applyScript(env, script, 'thousands_master', 'canonical_name',
        rows, r => r.id, 'name');

      // closing_text is attached ONLY on the script path, so the no-script
      // response stays byte-identical to production. The Full-4000 renderer
      // keeps its own Tamil fallbacks for that case.
      const closings = await env.db.prepare(`
        SELECT thousand_id, closing_text FROM thousands_master
      `).all();
      const cRows = await applyScript(env, script, 'thousands_master', 'closing_text',
        closings.results || [], r => r.thousand_id, 'closing_text');
      const cMap = {};
      for (const c of cRows) cMap[String(c.thousand_id)] = c.closing_text;
      rows = rows.map(r => ({ ...r, closing_text: cMap[String(r.id)] ?? null }));
    }

    return new Response(JSON.stringify(rows), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "DB error",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
}
async function handleSection(request, env) {
  try {

    const url = new URL(request.url);
    const thousand_id = url.searchParams.get("thousand_id");
    const sect = url.searchParams.get("sect") || "T";
    const script = url.searchParams.get("script");

    const result = await env.db.prepare(`
  SELECT
    section_id as id,
    section_name as name,
    thaniyan_display_mode
    FROM section_master
    WHERE thousand_id = ?
    AND (sect = ? OR sect = 'B')
    ORDER BY section_id
`).bind(thousand_id, sect).all();

    let rows = result.results;

    // Script-aware: this worker's whole purpose. Fall back to Tamil
    // per-row whenever no converted row exists yet for this script.
    if (script) {
      const ids = rows.map(r => String(r.id));
      const overrides = await _inQuery(env, ids,
        `SELECT src_key, text FROM text_script
         WHERE src_table='section_master' AND src_col='section_name'
           AND script=? AND src_key IN (__IN__)`,
        [script]
      );
      const map = {};
      for (const r of overrides) map[r.src_key] = r.text;
      rows = rows.map(r => ({ ...r, name: map[String(r.id)] ?? r.name }));
    }

    return new Response(JSON.stringify(rows), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "DB error",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });

  }
}
async function handlePasuram(request, env) {
  try {

    const url = new URL(request.url);
    const section_id = url.searchParams.get("section_id");
    const script = url.searchParams.get("script");

    const result = await env.db.prepare(`
      SELECT
        p.global_no,
        p.local_pasuram_no,
        p.section_id,
        p.pathu_id,
        p.thirumozhi_id,
        p.double_recital,   -- ✅ ADD THIS LINE
        p.has_audio,
        /* ✅ NAMES */
        s.section_name,

        pm.pathu_name,
        pm.pathu_subunit_name,
        pm.thirumozhi_heading AS pathu_thirumozhi_heading,  -- 🔥 KEY FIX

        tm.thirumozhi_name,
        tm.thirumozhi_heading,

        l.id AS line_id,
        l.line_no,
        l.line_text,
        l.recital_group

      FROM pasuram_master p

      LEFT JOIN section_master s
        ON p.section_id = s.section_id

      LEFT JOIN pathu_master pm
        ON p.pathu_id = pm.pathu_id

      LEFT JOIN thirumozhi_master tm
        ON p.thirumozhi_id = tm.thirumozhi_id

      JOIN pasuram_line_master l
        ON p.global_no = l.global_no

      WHERE p.section_id = ?

      ORDER BY p.global_no ASC, l.line_no ASC
    `).bind(section_id).all();

    let rows = result.results;

    // Script-aware: each call is a no-op when `script` is absent, so the
    // Tamil (no-param) response path below never differs from today.
    if (script) {
      rows = await applyScript(env, script, 'section_master', 'section_name', rows, r => r.section_id, 'section_name');
      rows = await applyScript(env, script, 'pathu_master', 'pathu_name', rows, r => r.pathu_id, 'pathu_name');
      rows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name', rows, r => r.pathu_id, 'pathu_subunit_name');
      rows = await applyScript(env, script, 'pathu_master', 'thirumozhi_heading', rows, r => r.pathu_id, 'pathu_thirumozhi_heading');
      rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name', rows, r => r.thirumozhi_id, 'thirumozhi_name');
      rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading', rows, r => r.thirumozhi_id, 'thirumozhi_heading');
      rows = await applyScript(env, script, 'pasuram_line_master', 'line_text', rows, r => r.line_id, 'line_text');
    }

    const grouped = {};

    for (const row of rows) {

      if (!grouped[row.global_no]) {

        grouped[row.global_no] = {
          global_no: row.global_no,
          local_no: row.local_pasuram_no,

          /* ✅ IDs */
          section_id: row.section_id,
          pathu_id: row.pathu_id,
          thirumozhi_id: row.thirumozhi_id,

          /* ✅ NAMES */
          section_name: row.section_name,
          pathu_name: row.pathu_name,
          pathu_subunit_name: row.pathu_subunit_name,
          thirumozhi_name: row.thirumozhi_name,

          double_recital: row.double_recital,   // ✅ ADDED
          has_audio: row.has_audio || 0,

          /* 🔥 FINAL FIX (SMART FALLBACK) */
          thirumozhi_heading:
            row.pathu_thirumozhi_heading || row.thirumozhi_heading || "",

          lines: []
        };
      }

      grouped[row.global_no].lines.push({
        text: row.line_text,
        group: row.recital_group
      });
    }

    return new Response(JSON.stringify(Object.values(grouped)), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "DB error",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
}

async function handleThaniyan(request, env) {
  try {

    const url = new URL(request.url);
    const section_id = url.searchParams.get("section_id");
    const sect = url.searchParams.get("sect") || "T";
    const subsect = url.searchParams.get("subsect") || "";
    const script = url.searchParams.get("script");

    /* 🟢 SECT SOURCE — thaniyan follows the SECTION, not the caller.
       section_master.sect is B / T / V. For a T or V section the thaniyan
       must use the SECTION's sect (this is what makes a cross-sect voice
       fetch — a T user pulling a V section — return the V global + V section
       thaniyan instead of the caller's T). A 'B' section (the shared 4000)
       has no cross-sect case, so it keeps the caller's sect — unchanged
       behaviour for the list/recital path.
       Sections 52 & 53 (Ahobila Madam works) always take the Kesavarya
       pothu when resolved to V — the Kesavarya thaniyan lives ONLY in
       fixed_text_line_master (fixed_id 8); that path below is untouched. */
    let effectiveSect = sect;
    let effSubsect    = subsect;
    try {
      const secRow = await env.db
        .prepare(`SELECT sect FROM section_master WHERE section_id = ?`)
        .bind(section_id).first();
      if (secRow && (secRow.sect === "T" || secRow.sect === "V")) effectiveSect = secRow.sect;
    } catch (e) { /* fall back to caller sect */ }
    if (effectiveSect === "V" && (String(section_id) === "52" || String(section_id) === "53")) {
      effSubsect = "madam";
    }

    /* 🟢 GLOBAL THANIYAN */
    const globalRes = await env.db.prepare(`
      SELECT
        tm.thaniyan_id,
        tm.canonical_name,
        tm.section_id,
        tl.line_id,
        tl.line_no,
        tl.line_text,
        tl.line_role,
        tl.line_group,
        tl.prosody_id
      FROM thaniyan_master tm
      JOIN thaniyan_line_master tl
        ON tl.thaniyan_ref = 'global'
        AND (tl.sect = ? OR tl.sect = 'B')
      WHERE tm.thaniyan_type = 'global'
        AND (tm.thaniyan_id = 1 OR tm.thaniyan_id = 33)
        AND (
          (? = 'T' AND tm.thaniyan_id = 1)
          OR
          (? = 'V' AND tm.thaniyan_id = 33)
        )
      ORDER BY tm.thaniyan_id, tl.line_no
    `).bind(effectiveSect, effectiveSect, effectiveSect).all();

    /* 🟢 MADAM (Ahobila) — Kesavarya pothu thaniyan FIRST, then
       Ramanuja Dayapatram (id 33). Synthetic thaniyan_id 0 so the
       group() object (ascending integer keys) keeps it before 33. */
    if (effectiveSect === "V" && effSubsect === "madam") {
      const kes = await env.db.prepare(
        `SELECT line_no, line_text FROM fixed_text_line_master
         WHERE fixed_id = 8 ORDER BY line_no`
      ).all();

      // Both the title and the subhead read the same underlying label —
      // fixed_text_master.name for fixed_id=8 — already converted by the
      // offline sweep. The two verse lines come from fixed_text_line_master
      // (composite key fixed_id|line_no).
      let kesName = "பொது தனியன் அஹோபிலமடம்";
      let kesLines = kes.results || [];
      if (script) {
        const nameRows = await applyScript(env, script, 'fixed_text_master', 'name',
          [{ fixed_id: 8, name: kesName }], r => r.fixed_id, 'name');
        kesName = nameRows[0].name;

        kesLines = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
          kesLines, r => `8|${r.line_no}`, 'line_text');
      }

      // Heading line + verse lines with real line_role — the renderer only
      // outputs rows whose line_role is title/subhead/line (a null role is skipped).
      const kesRows = [{
        thaniyan_id:    0,
        canonical_name: kesName,
        section_id:     null,
        line_no:        0,
        line_text:      kesName,
        line_role:      "subhead",
        line_group:     1,
        prosody_id:     null
      }, ...kesLines.map(r => ({
        thaniyan_id:    0,
        canonical_name: kesName,
        section_id:     null,
        line_no:        r.line_no,
        line_text:      r.line_text,
        line_role:      "line",
        line_group:     1,
        prosody_id:     null
      }))];
      globalRes.results = [...kesRows, ...(globalRes.results || [])];
    }

    /* 🟢 SECTION THANIYAN */
    const sectionRes = await env.db.prepare(`
      SELECT
        tm.thaniyan_id,
        tm.canonical_name,
        tm.section_id,
        tl.line_id,
        tl.line_no,
        tl.line_text,
        tl.line_role,
        tl.line_group,
        tl.prosody_id
      FROM thaniyan_master tm
      JOIN thaniyan_line_master tl
        ON tl.thaniyan_ref = ?
        AND (tl.sect = ? OR tl.sect = 'B')
      WHERE tm.section_id = ?
      ORDER BY tm.thaniyan_id, tl.line_no
    `).bind("section_" + section_id, effectiveSect, section_id).all();

    /* 🟢 PROSODY */
    const prosodyRes = await env.db.prepare(`
      SELECT prosody_id, canonical_name_tamil
      FROM prosody_master
    `).all();

    let prosodyRows = prosodyRes.results;

    /* 🟢 SCRIPT-AWARE TEXT — global/section thaniyan names + lines, prosody names.
       No-op (rows pass through unchanged) when no ?script= param is present. */
    if (script) {
      globalRes.results  = await applyScript(env, script, 'thaniyan_master', 'canonical_name', globalRes.results,  r => r.thaniyan_id, 'canonical_name');
      globalRes.results  = await applyScript(env, script, 'thaniyan_line_master', 'line_text',  globalRes.results,  r => r.line_id,     'line_text');
      sectionRes.results = await applyScript(env, script, 'thaniyan_master', 'canonical_name', sectionRes.results, r => r.thaniyan_id, 'canonical_name');
      sectionRes.results = await applyScript(env, script, 'thaniyan_line_master', 'line_text',  sectionRes.results, r => r.line_id,     'line_text');
      prosodyRows        = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil', prosodyRows,   r => r.prosody_id,  'canonical_name_tamil');
    }

    const prosodyMap = {};
    for (const row of prosodyRows) {
      prosodyMap[String(row.prosody_id)] = row.canonical_name_tamil;
    }

    /* 🟢 GROUP WITH TYPE */
    function group(rows, type) {
      const grouped = {};
      for (const row of rows) {
        const key = row.thaniyan_id;
        if (!grouped[key]) {
          grouped[key] = {
            thaniyan_id: row.thaniyan_id,
            section_id:  row.section_id,
            title: row.canonical_name,
            lines: [],
            type: type
          };
        }
        grouped[key].lines.push({
          line_no:   row.line_no,
          line_text: row.line_text,
          line_role: row.line_role,
          line_group: row.line_group,
          prosody_id: row.prosody_id
        });
      }
      return Object.values(grouped);
    }

    const finalData = [
      ...group(globalRes.results, "global"),
      ...group(sectionRes.results, "section")
    ];

    // Section-thaniyan audio is one file per section (thaniyan_{section_id}.mp3),
    // shared across all sects. Audio availability is a pure section fact —
    // flag every section-type group when the section has audio, sect-blind.
    // (Global thaniyans stay 0 for now; they'll flag by thaniyan_id when their
    //  own recordings are added later.)
    const audioFlags = await env.db.prepare(
      `SELECT has_audio FROM thaniyan_master WHERE section_id = ?`
    ).bind(section_id).all();
    const sectionHasAudio = (audioFlags.results || []).some(r => r.has_audio);
    for (const t of finalData) {
      t.has_audio = (t.type === "section" && sectionHasAudio) ? 1 : 0;
    }

    return new Response(JSON.stringify({
      thaniyan:   finalData,
      prosodyMap: prosodyMap
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error:   "DB error",
      details: err.message,
      stack:   err.stack
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

async function handlePasuramDisplay(request, env) {
  try {
    const url = new URL(request.url);
    const section_id = url.searchParams.get("section_id");
    const script = url.searchParams.get("script");

    /* 🟢 STEP 1 — FETCH DISPLAY DATA (CORRECT FILTERING) */
    const result = await env.db.prepare(`
      SELECT
        id,
        entity_type,
        entity_id,
        meta_key,          -- tag: adivaravu / thalam_pun / song_reference ...
        meta_value,
        sequence_no
      FROM entity_master
      WHERE display_flag = 1
      AND (

        -- 🟢 PASURAM (global range)
        (entity_type = 'pasuram' AND entity_id BETWEEN 
          (SELECT global_no_start FROM section_master WHERE section_id = ?)
          AND
          (SELECT global_no_end FROM section_master WHERE section_id = ?)
        )

        OR

        -- 🟢 PATHU
        (entity_type = 'pathu' AND entity_id IN (
          SELECT pathu_id FROM pathu_master WHERE section_id = ?
        ))

        OR

        -- 🟢 THIRUMOZHI
        (entity_type = 'thirumozhi' AND entity_id IN (
          SELECT thirumozhi_id FROM thirumozhi_master WHERE section_id = ?
        ))

        OR

        -- 🟢 SECTION
        (entity_type = 'section' AND entity_id = ?)

      )
      ORDER BY entity_type, entity_id, sequence_no
    `).bind(
      section_id,
      section_id,
      section_id,
      section_id,
      section_id
    ).all();

    /* 🟢 STEP 2 — THIRUMOZHI → PATHU MAP */
    const thiruRes = await env.db.prepare(`
      SELECT thirumozhi_id, pathu_id
      FROM thirumozhi_master
      WHERE section_id = ?
    `).bind(section_id).all();

    const thirumozhiToPathuMap = {};

    for (const row of thiruRes.results) {
      if (row.pathu_id) {
        thirumozhiToPathuMap[String(row.thirumozhi_id)] = String(row.pathu_id);
      }
    }

    /* 🟢 STEP 3 — FINAL STRUCTURE */
    const map = {
      section: [],
      pathu: {},
      thirumozhi: {},
      pasuram: {}
    };

    // entity_master's own PK is `id` (that is what the display rows are
    // keyed by in text_script). No-op when no ?script= is present.
    const displayRows = script
      ? await applyScript(env, script, 'entity_master', 'meta_value',
          result.results, r => r.id, 'meta_value')
      : result.results;

    // meta_key is attached ONLY on the script path, so the no-script response
    // stays byte-identical. The renderers need it because their adivaravu test
    // matches the Tamil word, which can never match converted text.
    const tag = row => (script ? { meta_key: row.meta_key } : {});

    for (const row of displayRows) {

      const text = row.meta_value;
      if (!text || text.trim() === "") continue;

      /* ================= SECTION ================= */
      if (row.entity_type === "section") {
        map.section.push({
          text,
          order: row.sequence_no,
          ...tag(row)
        });
      }

      /* ================= PATHU ================= */
      else if (row.entity_type === "pathu") {
        const pathuId = String(row.entity_id);

        if (!map.pathu[pathuId]) {
          map.pathu[pathuId] = [];
        }

        map.pathu[pathuId].push({
          text,
          order: row.sequence_no,
          ...tag(row)
        });
      }

      /* ================= THIRUMOZHI ================= */
      else if (row.entity_type === "thirumozhi") {

        const thiruId = String(row.entity_id);
        const pathuId = thirumozhiToPathuMap[thiruId] || null;

        if (!map.thirumozhi[thiruId]) {
          map.thirumozhi[thiruId] = {
            items: [],
            pathu_id: pathuId
          };
        }

        map.thirumozhi[thiruId].items.push({
          text,
          order: row.sequence_no,
          ...tag(row)
        });
      }

      /* ================= PASURAM ================= */
      else if (row.entity_type === "pasuram") {
        const key = String(row.entity_id);

        if (!map.pasuram[key]) {
          map.pasuram[key] = [];
        }

        map.pasuram[key].push({
          text,
          order: row.sequence_no,
          ...tag(row)
        });
      }
    }

    /* 🟢 STEP 4 — PROSODY (SAFE ADDITION ONLY) */
    const prosodyScope = await env.db.prepare(`
      SELECT prosody_id, start_global_no, end_global_no
      FROM prosody_scope_map
    `).all();

    const prosodyMaster = await env.db.prepare(`
      SELECT prosody_id, canonical_name_tamil
      FROM prosody_master
    `).all();

    /* 🟢 STEP 5 — ✅ SECTION CLOSING (NEW — SAFE ADD) */
    const sectionClosing = await env.db.prepare(`
      SELECT section_id, closing_text
      FROM section_closing_master
      WHERE section_id = ?
    `).bind(section_id).all();

    /* 🟢 SCRIPT-AWARE TEXT — prosody names and the section closing line.
       (prosody_scope_map carries no text, only ranges, so it is left alone.) */
    let prosodyMasterRows = prosodyMaster.results;
    let sectionClosingRows = sectionClosing.results || [];
    if (script) {
      prosodyMasterRows = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil',
        prosodyMasterRows, r => r.prosody_id, 'canonical_name_tamil');
      sectionClosingRows = await applyScript(env, script, 'section_closing_master', 'closing_text',
        sectionClosingRows, r => r.section_id, 'closing_text');
    }

    /* 🟢 RESPONSE (WRAPPED — NO BREAKAGE) */
    return new Response(JSON.stringify({
      ...map,
      prosodyScope: prosodyScope.results,
      prosodyMaster: prosodyMasterRows,

      // ✅ NEW FIELD
      sectionClosing: sectionClosingRows

    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "DB error",
      details: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
async function handleMadal(request, env) {

  try {

    const url = new URL(request.url);
    const section_id = parseInt(url.searchParams.get("section_id"));

    /* 🔥 MAP SECTION → MADAL */
    let madal_id;

    if (section_id == 22 || section_id == 2673) {
      madal_id = 1; // சிறிய திருமடல்
    } 
    else if (section_id == 23 || section_id == 2674) {
      madal_id = 2; // பெரிய திருமடல்
    } 
    else {
      return new Response(JSON.stringify({
        error: "Invalid madal section"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    /* 🔥 FETCH MADAL UNITS */
    const units = await env.db.prepare(`
      SELECT *
      FROM madal_unit_master
      WHERE madal_id = ?
      ORDER BY couplet_no
    `).bind(madal_id).all();

    /* 🔥 FETCH RECITAL RULES */
    const rules = await env.db.prepare(`
      SELECT *
      FROM madal_recital_rule
      WHERE madal_id = ?
    `).bind(madal_id).all();

    /* 🔥 ✅ ADD THIS BLOCK (DISPLAY + PROSODY + CLOSING) */
    const displayRes = await env.db.prepare(`
      SELECT
        id,
        entity_type,
        entity_id,
        meta_key,          -- tag: adivaravu / thalam_pun / song_reference ...
        meta_value,
        sequence_no
      FROM entity_master
      WHERE display_flag = 1
      AND entity_type = 'section'
      AND entity_id = ?
      ORDER BY sequence_no
    `).bind(section_id).all();

    const prosodyScope = await env.db.prepare(`
      SELECT prosody_id, start_global_no, end_global_no
      FROM prosody_scope_map
    `).all();

    const prosodyMaster = await env.db.prepare(`
      SELECT prosody_id, canonical_name_tamil
      FROM prosody_master
    `).all();

    const sectionClosing = await env.db.prepare(`
      SELECT section_id, closing_text
      FROM section_closing_master
      WHERE section_id = ?
    `).bind(section_id).all();

    /* 🟢 SCRIPT-AWARE TEXT — couplet lines, display lines, prosody, closing.
       madal_unit_master keys on `id` and holds the verse across line_1..line_8;
       most couplets use only the first two, so empty columns are skipped rather
       than queried. madal_recital_rule carries no Tamil text, so it is untouched. */
    const script = url.searchParams.get("script");
    let unitRows          = units.results || [];
    let displayRows       = displayRes.results || [];
    let prosodyMasterRows = prosodyMaster.results || [];
    let sectionClosingRows = sectionClosing.results || [];
    if (script) {
      for (const col of ["line_1","line_2","line_3","line_4","line_5","line_6","line_7","line_8"]) {
        if (!unitRows.some(r => r[col])) continue;
        unitRows = await applyScript(env, script, 'madal_unit_master', col,
          unitRows, r => r.id, col);
      }
      displayRows = await applyScript(env, script, 'entity_master', 'meta_value',
        displayRows, r => r.id, 'meta_value');
      prosodyMasterRows = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil',
        prosodyMasterRows, r => r.prosody_id, 'canonical_name_tamil');
      sectionClosingRows = await applyScript(env, script, 'section_closing_master', 'closing_text',
        sectionClosingRows, r => r.section_id, 'closing_text');
    }

    /* 🔥 RESPONSE (EXTENDED — SAFE) */
    return new Response(JSON.stringify({
      type: "madal",
      madal_id: madal_id,
      has_audio: await env.db.prepare(
        `SELECT has_audio FROM madal_master WHERE madal_id = ?`
      ).bind(madal_id).first().then(r => r?.has_audio || 0),
      units: unitRows,
      rules: rules.results,

      /* ✅ NEW (same structure style) */
      section: displayRows,
      prosodyScope: prosodyScope.results || [],
      prosodyMaster: prosodyMasterRows,
      sectionClosing: sectionClosingRows

    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "MADAL API ERROR",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
}
async function handleKootrirukkai(request, env) {

  try {

    const url = new URL(request.url);
    const section_id = parseInt(url.searchParams.get("section_id"));

    if (section_id != 21 && section_id != 2672) {
      return new Response(JSON.stringify({
        error: "Invalid section"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    /* 🔥 FETCH LINES */
    const res = await env.db.prepare(`
      SELECT *
      FROM thiruvezhukootrarikkai_master
      ORDER BY line_no
    `).all();

    /* 🔥 ✅ SAME ADDITIONS */
    const displayRes = await env.db.prepare(`
      SELECT
        id,
        entity_type,
        entity_id,
        meta_key,          -- tag: adivaravu / thalam_pun / song_reference ...
        meta_value,
        sequence_no
      FROM entity_master
      WHERE display_flag = 1
      AND entity_type = 'section'
      AND entity_id = ?
      ORDER BY sequence_no
    `).bind(section_id).all();

    const prosodyScope = await env.db.prepare(`
      SELECT prosody_id, start_global_no, end_global_no
      FROM prosody_scope_map
    `).all();

    const prosodyMaster = await env.db.prepare(`
      SELECT prosody_id, canonical_name_tamil
      FROM prosody_master
    `).all();

    const sectionClosing = await env.db.prepare(`
      SELECT section_id, closing_text
      FROM section_closing_master
      WHERE section_id = ?
    `).bind(section_id).all();

    /* 🟢 SCRIPT-AWARE TEXT — verse lines, display lines, prosody, closing. */
    const script = url.searchParams.get("script");
    let lineRows           = res.results || [];
    let displayRows        = displayRes.results || [];
    let prosodyMasterRows  = prosodyMaster.results || [];
    let sectionClosingRows = sectionClosing.results || [];
    if (script) {
      lineRows = await applyScript(env, script, 'thiruvezhukootrarikkai_master', 'line_text',
        lineRows, r => r.id, 'line_text');
      displayRows = await applyScript(env, script, 'entity_master', 'meta_value',
        displayRows, r => r.id, 'meta_value');
      prosodyMasterRows = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil',
        prosodyMasterRows, r => r.prosody_id, 'canonical_name_tamil');
      sectionClosingRows = await applyScript(env, script, 'section_closing_master', 'closing_text',
        sectionClosingRows, r => r.section_id, 'closing_text');
    }

    return new Response(JSON.stringify({
      type: "kootrirukkai",
      has_audio: await env.db.prepare(
        `SELECT has_audio FROM thiruvezhukootrarikkai_master
         WHERE global_no = 2672 LIMIT 1`
      ).first().then(r => r?.has_audio || 0),
      lines: lineRows,

      /* ✅ NEW */
      section: displayRows,
      prosodyScope: prosodyScope.results || [],
      prosodyMaster: prosodyMasterRows,
      sectionClosing: sectionClosingRows

    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "KOOTRIRUKKAI API ERROR",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
}
async function handleFullAPI(url, env) {
  try {

    const view = url.searchParams.get("view");
    const thousandParam = url.searchParams.get("thousand");
    const treeSect = url.searchParams.get("sect") || "T"; // must be declared early — used in multiple queries

    const thRes = await env.db.prepare(`
      SELECT 
        thousand_id AS id,
        canonical_name AS name,
        sequence_no,
        closing_text
      FROM thousands_master
      ORDER BY sequence_no
    `).all();

     // 🔥 STEP 1: GET PROSODY MASTER
const prosodyMasterRes = await env.db.prepare(`
  SELECT prosody_id, canonical_name_tamil
  FROM prosody_master
`).all();

// 🔥 PROSODY SCOPE (ADD HERE)
const prosodyScopeRes = await env.db.prepare(`
  SELECT prosody_id, start_global_no, end_global_no
  FROM prosody_scope_map
`).all();



      // 🟢 GLOBAL THANIYAN (SAFE — DOES NOT AFFECT ANYTHING)
const globalThaniyanRes = await env.db.prepare(`
  SELECT 
    tm.thaniyan_id,
    tm.canonical_name,
    tl.line_no,
    tl.line_text,
    tl.line_role,
    tl.line_group,
    tl.prosody_id
  FROM thaniyan_master tm
  JOIN thaniyan_line_master tl
    ON tl.thaniyan_ref = 'global'
    AND (tl.sect = ? OR tl.sect = 'B')
  WHERE tm.thaniyan_type = 'global'
    AND (
      (? = 'T' AND tm.thaniyan_id = 1)
      OR
      (? = 'V' AND tm.thaniyan_id = 33)
    )
  ORDER BY tm.thaniyan_id, tl.line_no
`).bind(treeSect, treeSect, treeSect).all();

    // 🟢 STEP 2 (PUT THIS RIGHT HERE)
const globalThaniyan = groupThaniyan(globalThaniyanRes.results);

    const secRes = await env.db.prepare(`
      SELECT 
        section_id AS id,
        section_name AS name,
        thousand_id,
        thaniyan_display_mode
      FROM section_master
      WHERE (sect = ? OR sect = 'B')
      ORDER BY thousand_id, section_id
    `).bind(treeSect).all();

    const thousands = thRes.results || [];
    const sections = secRes.results || [];

    const result = {
  global_thaniyan: globalThaniyan,
  thousands: [],
  prosodyMaster: prosodyMasterRes.results,
  prosodyScope: prosodyScopeRes.results   // 🔥 ADD THIS LINE
};

    for (const th of thousands) {

      if (view !== "4000" && thousandParam && th.id != thousandParam) continue;

      const thObj = {
        id: th.id,
        name: th.name,
        sections: []
      };

      const thSections = sections.filter(s => s.thousand_id === th.id);

      for (const sec of thSections) {

       // 🟢 SECTION THAN IYAN (ADD THIS EXACTLY HERE)
const sectionThaniyanRes = await env.db.prepare(`
  SELECT 
    tm.thaniyan_id,
    tm.canonical_name,
    tl.line_no,
    tl.line_text,
    tl.line_role,
    tl.line_group,
    tl.prosody_id
  FROM thaniyan_master tm
  JOIN thaniyan_line_master tl
    ON tl.thaniyan_ref = ?
  WHERE tm.section_id = ?
  ORDER BY tm.thaniyan_id, tl.line_no
`).bind("section_" + sec.id, sec.id).all();

   // ✅ ADD THIS LINE
  const sectionThaniyan = groupThaniyan(sectionThaniyanRes.results);


        const pasuramRes = await env.db.prepare(`
  SELECT 
  p.global_no,
  p.local_pasuram_no,
  p.section_id,
  p.pathu_id,
  p.thirumozhi_id,
  p.double_recital,
  p.has_audio,

  -- ✅ PATHU (PRIMARY)
  pm.pathu_name,
  pm.pathu_subunit_name,
  pm.thirumozhi_heading AS pathu_thirumozhi_heading,
  pm.sub_unit_no,

  -- ✅ STANDALONE (SAFE FALLBACK)
  tm.thirumozhi_name,
  tm.thirumozhi_heading AS standalone_heading,
  0 AS standalone_subunit_no,

  -- ✅ LINES
  l.line_no,
  l.line_text,
  l.recital_group

FROM pasuram_master p

LEFT JOIN pathu_master pm
  ON p.pathu_id = pm.pathu_id

LEFT JOIN thirumozhi_master tm
  ON p.thirumozhi_id = tm.thirumozhi_id

JOIN pasuram_line_master l
  ON p.global_no = l.global_no

WHERE p.global_no BETWEEN
  (SELECT global_no_start FROM section_master WHERE section_id = ?)
  AND
  (SELECT global_no_end FROM section_master WHERE section_id = ?)

ORDER BY 
  p.global_no,
  l.line_no
`).bind(sec.id, sec.id).all();

 // 🔥 ADD THIS BLOCK HERE (IMPORTANT)
const pasurams = (pasuramRes.results || []).map(row => {

  const heading =
    row.pathu_thirumozhi_heading ||
    row.standalone_heading ||
    row.pathu_subunit_name ||
    "";

  const subUnit =
    row.sub_unit_no ||
    row.standalone_subunit_no ||
    0;

  return {
    ...row,

    // ✅ STANDARDIZED FIELDS (RENDERER DEPENDS ON THIS)
    thirumozhi_heading: heading,
    sub_unit_no: subUnit
  };
});

console.log("PASURAM SAMPLE:", pasurams[0]);
// 🟢 DISPLAY (reuse your working logic)
const displayRes = await env.db.prepare(`
  SELECT 
    entity_type,
    entity_id,
    meta_key,          -- tag: adivaravu / thalam_pun / song_reference ...
    meta_value,
    sequence_no
  FROM entity_master
  WHERE display_flag = 1
AND (
  entity_type = 'pasuram'
  OR
  (entity_type = 'pathu' AND entity_id IN (
    SELECT pathu_id FROM pathu_master WHERE section_id = ?
  ))
  OR
  (entity_type = 'thirumozhi' AND entity_id IN (
    SELECT thirumozhi_id FROM thirumozhi_master WHERE section_id = ?
  ))
  OR
  (entity_type = 'section' AND entity_id = ?)
)
`).bind(
  sec.id,
  sec.id,
  sec.id
).all();

     const displayMap = {};

displayRes.results.forEach(item => {
  const key = `${item.entity_type}_${item.entity_id}`;
  if (!displayMap[key]) displayMap[key] = [];
  displayMap[key].push(item);
});

function getDisplay(entityType, entityId) {
  return displayMap[`${entityType}_${entityId}`] || [];
}


// 🟢 PROSODY
const prosodyScope = await env.db.prepare(`
  SELECT prosody_id, start_global_no, end_global_no
  FROM prosody_scope_map
`).all();

const prosodyMaster = await env.db.prepare(`
  SELECT prosody_id, canonical_name_tamil
  FROM prosody_master
`).all();


// 🟢 SECTION CLOSING
const sectionClosing = await env.db.prepare(`
  SELECT section_id, closing_text
  FROM section_closing_master
  WHERE section_id = ?
`).bind(sec.id).all();

        const secObj = {
  id: sec.id,
  name: sec.name,
  thaniyan_mode: sec.thaniyan_display_mode || 0,

  thaniyan: sectionThaniyan,   // ✅ ADD THIS LINE

  pasuram: pasurams,

  display: displayRes.results || [],
  prosodyScope: prosodyScope.results || [],
  prosodyMaster: prosodyMaster.results || [],
  sectionClosing: sectionClosing.results || []
};

        thObj.sections.push(secObj);
      }

      result.thousands.push(thObj);
    }
    
     // 🟢 GROUP THAN IYAN FUNCTION (ADD HERE)
function groupThaniyan(rows) {

  const grouped = {};

  for (const row of rows) {

    const key = row.thaniyan_id;

    if (!grouped[key]) {
      grouped[key] = {
        thaniyan_id: row.thaniyan_id,
        section_id:  row.section_id,
        title: row.canonical_name,
        has_audio: row.has_audio || 0,
        lines: []
      };
    }

    grouped[key].lines.push({
      line_no: row.line_no,
      line_text: row.line_text,
      line_role: row.line_role,
      line_group: row.line_group,
      prosody_id: row.prosody_id
    });
  }

  return Object.values(grouped);
}

    // 🔥 MADAL
const madal = await env.db.prepare(`
  SELECT * FROM madal_unit_master
  ORDER BY madal_id, couplet_no
`).all();

// 🔥 KOOTRIRUKKAI
const kootrirukkai = await env.db.prepare(`
  SELECT * FROM thiruvezhukootrarikkai_master
  ORDER BY line_no
`).all();

// ✅ ADD THESE 2 LINES RIGHT HERE
result.madal = madal.results || [];
result.kootrirukkai = kootrirukkai.results || [];


    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

async function handleAnchorMap(request, env) {
  try {

    const url = new URL(request.url);
    const thousand_id = url.searchParams.get("thousand_id") || 1;

    const script = url.searchParams.get("script");

    const result = await env.db.prepare(`
      SELECT
        id,                      -- keys the text_script lookup
        section_id,              -- 🔥 REQUIRED
        type,
        ref_id,
        canonical_text,
        pathu_name,
        subunit_name,
        thirumozhi_heading,
        thousand_id,             -- 🔥 useful for future
        thousand_anchor_no,
        global_anchor_no
      FROM anchor_map
      WHERE thousand_id = ?
      ORDER BY global_anchor_no   -- 🔥 IMPORTANT FIX
    `)
    .bind(thousand_id)
    .all();

    // anchor_map is a real table keyed on its own `id`. All four text columns
    // feed the book index and the section headings. No-op without ?script=.
    let rows = result.results;
    if (script) {
      for (const col of ["canonical_text", "pathu_name", "subunit_name", "thirumozhi_heading"]) {
        if (!rows.some(r => r[col])) continue;
        rows = await applyScript(env, script, 'anchor_map', col, rows, r => r.id, col);
      }
    }

    return new Response(JSON.stringify(rows), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {

    return new Response(JSON.stringify({
      error: "ANCHOR MAP ERROR",
      details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
}
// ── Koil pathu list — single source of truth for all surfaces ──────
// Same flag-free tag query recitalworker and azhwar-recital use.
// Deliberately NOT via handleEntitySearch: the வடகலை koil tags carry
// search_flag=0 / meta_category='koil' so they never pollute voice
// search, and entity-search would therefore never return them.
// sect: T (base tag) | V (வடகலை tag) | ALL (union — combined koil).
async function handleKoilPathus(request, env) {
  const hdrs = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  try {
    const url  = new URL(request.url);
    const sub  = (url.searchParams.get("sub") || "THIRUMOZHI").toUpperCase();
    const sect = (url.searchParams.get("sect") || "T").toUpperCase();

    const base = sub === "THIRUVAIMOZHI" ? "கோயில் திருவாய்மொழி" : "கோயில் திருமொழி";
    const groupsWanted =
      sect === "ALL" ? ["T", "V"] : (sect === "V" ? ["V"] : ["T"]);

    // Per-sect groups with names + canonical position — feeds the
    // setup checkbox modals directly (no extra lookup needed there).
    const groups = {};
    for (const g of groupsWanted) {
      const tag = g === "V" ? "வடகலை " + base : base;
      const res = await env.db.prepare(
        `SELECT em.entity_id AS pathu_id,
                pm.pathu_name, pm.pathu_subunit_name, pm.thirumozhi_heading,
                pm.section_id,
                MIN(pm.global_no_start) AS global_no_start,
                MAX(pm.global_no_end)   AS global_no_end,
                (SELECT MIN(p2.pathu_id) FROM pathu_master p2
                 WHERE p2.section_id = pm.section_id
                   AND p2.pathu_no   = pm.pathu_no) AS parent_pathu_id
         FROM entity_master em
         JOIN pathu_master pm ON pm.pathu_id = em.entity_id
         WHERE em.entity_type='pathu' AND em.meta_key='tag' AND em.meta_value=?
         GROUP BY em.entity_id
         ORDER BY MIN(pm.global_no_start)`
      ).bind(tag).all();
      groups[g] = (res.results || []).map(r => {
        // People know koil thirumozhis by their heading (first-line name),
        // so it leads; canonical numbering follows (mandatory reference).
        const num = [r.pathu_name, r.pathu_subunit_name].filter(Boolean).join(" — ");
        return {
          pathu_id:        Number(r.pathu_id),
          // Parent pathu group id (MIN pathu_id of the pathu_no group) —
          // same key full-pathu selections use, so parent/child conflict
          // rules in the setup UIs can see koil children.
          parent_pathu_id: Number(r.parent_pathu_id),
          label:           r.thirumozhi_heading ? `${r.thirumozhi_heading} — ${num}` : num,
          section_id:      r.section_id,
          global_no_start: r.global_no_start,
          global_no_end:   r.global_no_end
        };
      });
    }

    const idSet = new Set();
    for (const g of groupsWanted)
      for (const p of groups[g]) idSet.add(p.pathu_id);

    return new Response(JSON.stringify({
      sub, sect,
      section_id: sub === "THIRUVAIMOZHI" ? 26 : 11,
      pathu_ids:  [...idSet].sort((a, b) => a - b),
      groups
    }), { headers: hdrs });

  } catch (err) {
    return new Response(JSON.stringify({ error: "DB error", details: err.message }),
      { status: 500, headers: hdrs });
  }
}

async function handleEntitySearch(request, env) {
  try {
    const url  = new URL(request.url);
    const tag  = url.searchParams.get("tag");
    const type = url.searchParams.get("type");

    // ── Star pasuram lookup: ?tag=அஸ்வினி நட்சத்திர பாசுரங்கள்&type=pathu ──
    if (tag && type) {
      const res = await env.db.prepare(`
        SELECT em.entity_id,
               pm.section_id,
               pm.pathu_name,
               pm.pathu_subunit_name,
               s.section_name
        FROM   entity_master em
        JOIN   pathu_master pm   ON em.entity_id   = pm.pathu_id
        JOIN   section_master s  ON pm.section_id  = s.section_id
        WHERE  em.entity_type = ?
          AND  em.meta_value  = ?
          AND  em.meta_key    = 'tag'
          AND  (em.search_flag = 1 OR em.meta_category = 'search')
        ORDER  BY pm.section_id, pm.pathu_id
      `).bind(type, tag).all();

      return new Response(JSON.stringify(res.results || []), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // ── Original behaviour: return all search tags ──
    const result = await env.db.prepare(`
      SELECT entity_type, entity_id, meta_key, meta_value
      FROM   entity_master
      WHERE  meta_category = 'search'
        AND  search_flag   = 1
        AND  meta_key      = 'tag'
    `).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "DB error", details: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}


// ── Star Pasuram: returns ALL entity types for a star ────────
async function handleStarPasuram(request, env) {
  try {
    const url  = new URL(request.url);
    /* `star` is matched against entity_master.meta_value, which is stored in
       Tamil, so this parameter must ALWAYS arrive in Tamil — the renderer keeps
       the Tamil name as each <option>'s value and converts only its label. */
    const star   = url.searchParams.get("star");
    const script = url.searchParams.get("script");

    if (!star) {
      const res = await env.db.prepare(`
        SELECT DISTINCT meta_value AS star
        FROM   entity_master
        WHERE  entity_type  = 'pathu'
          AND  meta_key     = 'tag'
          AND  meta_category = 'search'
        ORDER  BY meta_value
      `).all();
      return new Response(JSON.stringify(res.results || []), {
        headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" }
      });
    }

    const tag = star + " நட்சத்திர பாசுரங்கள்";

    // ── pathu level ──────────────────────────────────────────
    const pathuRes = await env.db.prepare(`
      SELECT em.entity_id AS id,
             pm.section_id, pm.pathu_name, s.section_name
      FROM   entity_master em
      JOIN   pathu_master pm  ON em.entity_id  = pm.pathu_id
      JOIN   section_master s ON pm.section_id = s.section_id
      WHERE  em.entity_type = 'pathu'
        AND  em.meta_key    = 'tag'
        AND  em.meta_value  = ?
        AND  em.meta_category = 'search'
      ORDER  BY pm.section_id, pm.pathu_id
    `).bind(tag).all();

    // ── section level (full section) ─────────────────────────
    const secRes = await env.db.prepare(`
      SELECT em.entity_id AS section_id, s.section_name
      FROM   entity_master em
      JOIN   section_master s ON em.entity_id = s.section_id
      WHERE  em.entity_type = 'section'
        AND  em.meta_key    = 'tag'
        AND  em.meta_value  = ?
        AND  em.meta_category = 'search'
      ORDER  BY em.entity_id
    `).bind(tag).all();

    // ── thirumozhi level ─────────────────────────────────────
    const thiruRes = await env.db.prepare(`
      SELECT em.entity_id AS thirumozhi_id,
             tm.section_id, tm.thirumozhi_name,
             tm.thirumozhi_heading, s.section_name
      FROM   entity_master em
      JOIN   thirumozhi_master tm ON em.entity_id  = tm.thirumozhi_id
      JOIN   section_master s     ON tm.section_id = s.section_id
      WHERE  em.entity_type = 'thirumozhi'
        AND  em.meta_key    = 'tag'
        AND  em.meta_value  = ?
        AND  em.meta_category = 'search'
      ORDER  BY tm.section_id, tm.thirumozhi_id
    `).bind(tag).all();

    // ── individual pasuram level ─────────────────────────────
    const pasuramRes = await env.db.prepare(`
      SELECT em.entity_id AS global_no,
             pm.section_id, s.section_name
      FROM   entity_master em
      JOIN   pasuram_master pm ON em.entity_id  = pm.global_no
      JOIN   section_master s  ON pm.section_id = s.section_id
      WHERE  em.entity_type = 'pasuram'
        AND  em.meta_key    = 'tag'
        AND  em.meta_value  = ?
        AND  em.meta_category = 'search'
      ORDER  BY pm.section_id, pm.global_no
    `).bind(tag).all();

    let pathus     = pathuRes.results   || [];
    let sections   = secRes.results     || [];
    let thirumozhi = thiruRes.results   || [];
    let pasurams   = pasuramRes.results || [];

    if (script) {
      const sec = (rows) => applyScript(env, script, 'section_master', 'section_name',
        rows, r => r.section_id, 'section_name');
      pathus     = await sec(pathus);
      sections   = await sec(sections);
      thirumozhi = await sec(thirumozhi);
      pasurams   = await sec(pasurams);

      pathus     = await applyScript(env, script, 'pathu_master', 'pathu_name',
        pathus, r => r.id, 'pathu_name');
      thirumozhi = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',
        thirumozhi, r => r.thirumozhi_id, 'thirumozhi_name');
      thirumozhi = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading',
        thirumozhi, r => r.thirumozhi_id, 'thirumozhi_heading');
    }

    return new Response(JSON.stringify({
      pathus, sections, thirumozhi, pasurams
    }), {
      headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error:"DB error", details:err.message }), {
      status: 500,
      headers: { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" }
    });
  }
}

// ====================================================================

const KOIL_SECTION_MAP = {
  "koil_thirumozhi":    11,
  "koil_thiruvaimozhi": 26
};

// =============================================================
// COMPLETE handleAzhwarRecital — replace existing in worker.js
// Display structure matches handlePasuramDisplay exactly:
//   s.display = { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
// Sections 21/22/23 handled as madal/kootrirukkai
// Pasuram display_items = pasuram level only (NOT merged)
// =============================================================

// =============================================================
// COMPLETE handleAzhwarRecital — replace existing in worker.js
// Display structure matches handlePasuramDisplay exactly:
//   s.display = { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
// Sections 21/22/23 handled as madal/kootrirukkai
// Pasuram display_items = pasuram level only (NOT merged)
// =============================================================

async function handleAzhwarRecital(request, env) {
  try {
    const url      = new URL(request.url);
    const authorId = url.searchParams.get("author_id");
    const sect     = url.searchParams.get("sect") || "T";
    const script   = url.searchParams.get("script");
    const hdrs     = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (!authorId) return new Response(JSON.stringify([]), { headers: hdrs });

    // ── MASTER ───────────────────────────────────────────────
    let master = await env.db.prepare(`
      SELECT recital_id, tamil_name, notes
      FROM   author_birth_recital_master
      WHERE  author_id = ?
    `).bind(authorId).first();

    if (!master) return new Response(JSON.stringify([]), { headers: hdrs });

    if (script) {
      master = (await applyScript(env, script, 'author_birth_recital_master', 'tamil_name',
        [master], r => r.recital_id, 'tamil_name'))[0];
    }

    // ── SEQUENCE ─────────────────────────────────────────────
    const seqRes = await env.db.prepare(`
      SELECT sequence_no, entity_type, entity_id, is_dual_recital, is_optional, sect, phase, recurrence
      FROM   author_birth_recital_sequence
      WHERE  recital_id = ?
      ORDER  BY sequence_no
    `).bind(master.recital_id).all();

    const seqRowsAll = seqRes.results || [];

    // Filter by sect FIRST — this is the actual gate on which sequence
    // rows apply to this user at all. 'ALL' rows always pass through
    // regardless of the requested sect.
    const seqRows = seqRowsAll.filter(r => r.sect === sect || r.sect === "ALL");

    const pasuramIds  = [...new Set(seqRows.filter(r => r.entity_type === "pasuram")           .map(r => r.entity_id))];
    const thaniyanIds = [...new Set(seqRows.filter(r => r.entity_type === "thaniyan")          .map(r => r.entity_id))];
    const sectionIds  = [...new Set(seqRows.filter(r => r.entity_type === "section")           .map(r => r.entity_id))];
    const fixedIds    = [...new Set(seqRows.filter(r => r.entity_type === "fixed_text")        .map(r => r.entity_id))];
    // Madam viewers: Kesavarya (fixed_id 8) is injected before every
    // Vadagalai pothu thaniyan (thaniyan_id 33) — ensure 8 is hydrated.
    const subsectParam = url.searchParams.get("subsect") || "";
    if (subsectParam === "madam" && !fixedIds.includes(8)) fixedIds.push(8);
    const vazhiIds    = [...new Set(seqRows.filter(r => r.entity_type === "vazhi_thirunamam")  .map(r => r.entity_id))];
    const madalIds    = [...new Set(seqRows.filter(r => r.entity_type === "madal_sattrumurai") .map(r => r.entity_id))];
    const pathuIds    = [...new Set(seqRows.filter(r => r.entity_type === "pathu")             .map(r => r.entity_id))];
    const thiruIds    = [...new Set(seqRows.filter(r => r.entity_type === "thirumozhi")        .map(r => r.entity_id))];

    // ── PROSODY MASTER + SCOPE ───────────────────────────────
    const prosodyMasterRes = await env.db.prepare(
      `SELECT prosody_id, canonical_name_tamil FROM prosody_master`
    ).all();
    let prosodyMasterRows = prosodyMasterRes.results || [];
    if (script) {
      prosodyMasterRows = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil',
        prosodyMasterRows, r => r.prosody_id, 'canonical_name_tamil');
    }
    const prosodyMaster = {};
    for (const r of prosodyMasterRows)
      prosodyMaster[r.prosody_id] = r.canonical_name_tamil;

    const prosodyScopes = (await env.db.prepare(
      `SELECT prosody_id, start_global_no, end_global_no FROM prosody_scope_map`
    ).all()).results || [];

    function getProsodyName(globalNo) {
      const n = Number(globalNo);
      const s = prosodyScopes.find(s =>
        n >= Number(s.start_global_no) && n <= Number(s.end_global_no)
      );
      return s ? (prosodyMaster[s.prosody_id] || "") : "";
    }

    // ── HELPER: buildDisplayMap — identical to handlePasuramDisplay ──
    // Returns { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
    async function buildDisplayMap(sid) {
      const result = await env.db.prepare(`
        SELECT id, entity_type, entity_id, meta_key, meta_value, sequence_no
        FROM entity_master
        WHERE display_flag = 1 AND (
          (entity_type = 'pasuram' AND entity_id BETWEEN
            (SELECT global_no_start FROM section_master WHERE section_id = ?)
            AND (SELECT global_no_end FROM section_master WHERE section_id = ?))
          OR (entity_type = 'pathu' AND entity_id IN (
            SELECT pathu_id FROM pathu_master WHERE section_id = ?))
          OR (entity_type = 'thirumozhi' AND entity_id IN (
            SELECT thirumozhi_id FROM thirumozhi_master WHERE section_id = ?))
          OR (entity_type = 'section' AND entity_id = ?)
        )
        ORDER BY entity_type, entity_id, sequence_no
      `).bind(sid, sid, sid, sid, sid).all();

      const thiruRes = await env.db.prepare(
        `SELECT thirumozhi_id, pathu_id FROM thirumozhi_master WHERE section_id = ?`
      ).bind(sid).all();
      const t2p = {};
      for (const r of thiruRes.results || [])
        if (r.pathu_id) t2p[String(r.thirumozhi_id)] = String(r.pathu_id);

      // entity_master's own PK is `id` — that is what text_script keys these on.
      let dispAll = result.results || [];
      if (script) {
        dispAll = await applyScript(env, script, 'entity_master', 'meta_value',
          dispAll, r => r.id, 'meta_value');
      }

      const map = { section: [], pathu: {}, thirumozhi: {}, pasuram: {} };
      for (const row of dispAll) {
        const text = row.meta_value;
        if (!text || !text.trim()) continue;
        /* meta_key rides along ONLY on the script path, so the Tamil response
           stays byte-identical. The renderer needs it because its adivaravu
           test matches the Tamil word, which cannot match converted text. */
        const mk = script ? { meta_key: row.meta_key } : null;
        if (row.entity_type === "section") {
          map.section.push({ text, order: row.sequence_no, ...(mk || {}) });
        } else if (row.entity_type === "pathu") {
          const k = String(row.entity_id);
          if (!map.pathu[k]) map.pathu[k] = [];
          map.pathu[k].push({ text, order: row.sequence_no, ...(mk || {}) });
        } else if (row.entity_type === "thirumozhi") {
          const k = String(row.entity_id);
          if (!map.thirumozhi[k]) map.thirumozhi[k] = { items: [], pathu_id: t2p[k] || null };
          map.thirumozhi[k].items.push({ text, order: row.sequence_no, ...(mk || {}) });
        } else if (row.entity_type === "pasuram") {
          const k = String(row.entity_id);
          if (!map.pasuram[k]) map.pasuram[k] = [];
          map.pasuram[k].push({ text, order: row.sequence_no, ...(mk || {}) });
        }
      }
      return map;
    }

    // ── PASURAM MAP (standalone pasurams in sequence) ────────
    const pasuramMap = {};

    if (pasuramIds.length) {
      const pmRows = await _inQuery(env, pasuramIds,
        `SELECT global_no, local_pasuram_no, section_id,
                pathu_id, thirumozhi_id, double_recital
         FROM pasuram_master WHERE global_no IN (__IN__)`);

      let linesRows = await _inQuery(env, pasuramIds,
        `SELECT id AS line_id, global_no, line_no, line_text, recital_group
         FROM pasuram_line_master WHERE global_no IN (__IN__)
         ORDER BY global_no, line_no`);

      let dispRows = await _inQuery(env, pasuramIds,
        `SELECT id, entity_id, meta_key, meta_value, sequence_no
         FROM entity_master
         WHERE entity_type='pasuram' AND display_flag=1 AND entity_id IN (__IN__)
         ORDER BY entity_id, sequence_no`);

      if (script) {
        linesRows = await applyScript(env, script, 'pasuram_line_master', 'line_text',
          linesRows, r => r.line_id, 'line_text');
        dispRows  = await applyScript(env, script, 'entity_master', 'meta_value',
          dispRows, r => r.id, 'meta_value');
      }

      const uniqueSectionIds = [...new Set(pmRows.map(r => r.section_id))];
      const sectionEndRows   = await _inQuery(env, uniqueSectionIds,
        `SELECT section_id, global_no_end FROM section_master WHERE section_id IN (__IN__)`);
      const sectionEndMap = {};
      for (const r of sectionEndRows) sectionEndMap[r.section_id] = Number(r.global_no_end);

      let closingRows = await _inQuery(env, uniqueSectionIds,
        `SELECT section_id, closing_text FROM section_closing_master WHERE section_id IN (__IN__)`);
      if (script) {
        closingRows = await applyScript(env, script, 'section_closing_master', 'closing_text',
          closingRows, r => r.section_id, 'closing_text');
      }
      const closingMap = {};
      for (const r of closingRows) closingMap[r.section_id] = r.closing_text || "";

      const linesMap = {};
      for (const l of linesRows) {
        if (!linesMap[l.global_no]) linesMap[l.global_no] = [];
        linesMap[l.global_no].push({ text: l.line_text, group: l.recital_group });
      }
      const dispMap = {};
      for (const d of dispRows) {
        if (!dispMap[d.entity_id]) dispMap[d.entity_id] = [];
        dispMap[d.entity_id].push({ key: d.meta_key, text: d.meta_value });
      }

      for (const pm of pmRows) {
        const isLast = Number(pm.global_no) === sectionEndMap[pm.section_id];
        pasuramMap[pm.global_no] = {
          global_no:      pm.global_no,
          local_no:       pm.local_pasuram_no,
          section_id:     pm.section_id,
          pathu_id:       pm.pathu_id,
          thirumozhi_id:  pm.thirumozhi_id,
          double_recital: pm.double_recital,
          lines:          linesMap[pm.global_no] || [],
          display_items:  dispMap[pm.global_no]  || [],  // pasuram level only
          prosody:        getProsodyName(pm.global_no),
          closing_text:   isLast ? (closingMap[pm.section_id] || "") : ""
        };
      }
    }

    // ── THANIYAN MAP ─────────────────────────────────────────
    const thaniyanMap = {};

    if (thaniyanIds.length) {
      // Fixed: derive thaniyan_ref from thaniyan_master.thaniyan_type/section_id directly,
      // not via arithmetic (thaniyan_id - 1) which broke once Vadagalai thaniyan_ids
      // (33 = global, 34-53 = Desika sections) were added — they don't follow the old
      // sequential 1:1 mapping with section_id.
      let tmRows = await _inQuery(env, thaniyanIds,
        `SELECT thaniyan_id, canonical_name, thaniyan_type, section_id
         FROM thaniyan_master WHERE thaniyan_id IN (__IN__)`);
      if (script) {
        tmRows = await applyScript(env, script, 'thaniyan_master', 'canonical_name',
          tmRows, r => r.thaniyan_id, 'canonical_name');
      }

      const REF_MAP = {};
      for (const t of tmRows)
        REF_MAP[t.thaniyan_id] = t.thaniyan_type === 'global'
          ? 'global'
          : `section_${t.section_id}`;

      const refs   = Object.values(REF_MAP);
      let tlRowsAll = await _inQuery(env, refs,
        `SELECT line_id, thaniyan_ref, line_no, line_text, line_role, line_group, prosody_id, sect
         FROM thaniyan_line_master WHERE thaniyan_ref IN (__IN__)
         ORDER BY thaniyan_ref, line_no`);
      if (script) {
        tlRowsAll = await applyScript(env, script, 'thaniyan_line_master', 'line_text',
          tlRowsAll, r => r.line_id, 'line_text');
      }
      const tlRows = tlRowsAll.filter(r => r.sect === sect || r.sect === 'B');

      const linesByRef = {};
      for (const l of tlRows) {
        if (!linesByRef[l.thaniyan_ref]) linesByRef[l.thaniyan_ref] = [];
        linesByRef[l.thaniyan_ref].push(l);
      }
      for (const tm of tmRows) {
        const ref = REF_MAP[tm.thaniyan_id];
        thaniyanMap[tm.thaniyan_id] = {
          thaniyan_id: tm.thaniyan_id,
          title:       tm.canonical_name || "",
          ref,
          lines: (linesByRef[ref] || []).map(l => ({
            ...l,
            prosody_name: l.prosody_id ? (prosodyMaster[l.prosody_id] || "") : ""
          }))
        };
      }
    }

    // ── SECTION MAP ──────────────────────────────────────────
    const sectionMap = {};

    if (sectionIds.length) {
      let smRows = await _inQuery(env, sectionIds,
        `SELECT section_id, section_name, global_no_start, global_no_end
         FROM section_master WHERE section_id IN (__IN__)`);
      if (script) {
        smRows = await applyScript(env, script, 'section_master', 'section_name',
          smRows, r => r.section_id, 'section_name');
      }

      for (const sm of smRows) {
        const sid = sm.section_id;

        // ── Section 21: திருவெழுகூற்றிருக்கை ──
        if (sid === 21) {
          const lines  = await env.db.prepare(
            `SELECT id, line_no, line_text, dual_recital
             FROM thiruvezhukootrarikkai_master ORDER BY line_no`
          ).all();
          let kLines = lines.results || [];
          const dispMap = await buildDisplayMap(sid);
          const closing = await env.db.prepare(
            `SELECT section_id, closing_text FROM section_closing_master WHERE section_id=?`
          ).bind(sid).first();
          let closingText = closing?.closing_text || "";
          if (script) {
            kLines = await applyScript(env, script, 'thiruvezhukootrarikkai_master', 'line_text',
              kLines, r => r.id, 'line_text');
            if (closing) {
              closingText = (await applyScript(env, script, 'section_closing_master', 'closing_text',
                [closing], r => r.section_id, 'closing_text'))[0].closing_text || "";
            }
          }
          sectionMap[sid] = {
            section_id:   sid, display_name: sm.section_name,
            section_type: "kootrirukkai",
            display:      dispMap,
            closing_text: closingText,
            lines:        kLines
          };
          continue;
        }

        // ── Sections 22/23: சிறிய/பெரிய திருமடல் ──
        if (sid === 22 || sid === 23) {
          const madalId = sid === 22 ? 1 : 2;
          const units   = await env.db.prepare(
            `SELECT * FROM madal_unit_master WHERE madal_id=? ORDER BY couplet_no`
          ).bind(madalId).all();
          const rules   = await env.db.prepare(
            `SELECT * FROM madal_recital_rule WHERE madal_id=?`
          ).bind(madalId).all();
          const dispMap = await buildDisplayMap(sid);
          const closing = await env.db.prepare(
            `SELECT section_id, closing_text FROM section_closing_master WHERE section_id=?`
          ).bind(sid).first();
          let mUnits = units.results || [];
          let closingText = closing?.closing_text || "";
          if (script) {
            // madal_unit_master holds eight line columns on one row, keyed by id
            for (const col of ["line_1","line_2","line_3","line_4","line_5","line_6","line_7","line_8"]) {
              if (!mUnits.some(r => r[col])) continue;
              mUnits = await applyScript(env, script, 'madal_unit_master', col, mUnits, r => r.id, col);
            }
            if (closing) {
              closingText = (await applyScript(env, script, 'section_closing_master', 'closing_text',
                [closing], r => r.section_id, 'closing_text'))[0].closing_text || "";
            }
          }
          sectionMap[sid] = {
            section_id:   sid, display_name: sm.section_name,
            section_type: "madal", madal_id: madalId,
            display:      dispMap,
            closing_text: closingText,
            units:        mUnits,
            rules:        rules.results || []
          };
          continue;
        }

        // ── Normal sections ──
        const dispMap = await buildDisplayMap(sid);
        const closing = await env.db.prepare(
          `SELECT closing_text FROM section_closing_master WHERE section_id=?`
        ).bind(sid).first();

        const pasuramsRes = await env.db.prepare(`
          SELECT p.global_no, p.local_pasuram_no, p.section_id,
                 p.pathu_id, p.thirumozhi_id, p.double_recital, p.has_audio,
                 pm.pathu_name, pm.pathu_subunit_name,
                 pm.thirumozhi_heading AS pathu_thirumozhi_heading,
                 tm.thirumozhi_heading AS tm_thirumozhi_heading,
                 tm.thirumozhi_name
          FROM pasuram_master p
          LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id
          LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
          WHERE p.section_id=? ORDER BY p.global_no
        `).bind(sid).all();

        let secRows = pasuramsRes.results || [];
        const secPasuramIds = secRows.map(r => r.global_no);
        let pasurams = [];

        let secClosingText = closing?.closing_text || "";
        if (script && closing) {
          secClosingText = (await applyScript(env, script, 'section_closing_master', 'closing_text',
            [{ section_id: sid, closing_text: secClosingText }],
            r => r.section_id, 'closing_text'))[0].closing_text || "";
        }

        if (secPasuramIds.length) {
          let secLinesRows = await _inQuery(env, secPasuramIds,
            `SELECT id AS line_id, global_no, line_no, line_text, recital_group
             FROM pasuram_line_master WHERE global_no IN (__IN__)
             ORDER BY global_no, line_no`);

          if (script) {
            secLinesRows = await applyScript(env, script, 'pasuram_line_master', 'line_text',
              secLinesRows, r => r.line_id, 'line_text');
            secRows = await applyScript(env, script, 'pathu_master', 'pathu_name',
              secRows, r => r.pathu_id, 'pathu_name');
            secRows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name',
              secRows, r => r.pathu_id, 'pathu_subunit_name');
            secRows = await applyScript(env, script, 'pathu_master', 'thirumozhi_heading',
              secRows, r => r.pathu_id, 'pathu_thirumozhi_heading');
            secRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading',
              secRows, r => r.thirumozhi_id, 'tm_thirumozhi_heading');
            secRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',
              secRows, r => r.thirumozhi_id, 'thirumozhi_name');
          }

          const secLinesMap = {};
          for (const l of secLinesRows) {
            if (!secLinesMap[l.global_no]) secLinesMap[l.global_no] = [];
            secLinesMap[l.global_no].push({ text: l.line_text, group: l.recital_group });
          }

          pasurams = secRows.map(p => ({
            global_no:           p.global_no,
            local_no:            p.local_pasuram_no,
            section_id:          p.section_id,
            pathu_id:            p.pathu_id,
            thirumozhi_id:       p.thirumozhi_id,
            double_recital:      p.double_recital,
            pathu_name:          p.pathu_name          || "",
            pathu_subunit_name:  p.pathu_subunit_name  || "",
          /* COALESCE hides which table a heading came from, and the two are
             converted separately in text_script — so both are selected and the
             fallback is applied in JS instead. `??` reproduces COALESCE exactly
             (an empty string is a value, not a miss). */
          thirumozhi_heading:  (p.pathu_thirumozhi_heading ?? p.tm_thirumozhi_heading) || "",
            thirumozhi_name:     p.thirumozhi_name     || "",
            lines:               secLinesMap[p.global_no] || [],
            prosody:             getProsodyName(p.global_no),
            closing_text:        Number(p.global_no) === Number(sm.global_no_end)
                                   ? secClosingText : ""
          }));
        }

        sectionMap[sid] = {
          section_id:   sid,
          display_name: sm.section_name || "",
          section_type: "normal",
          closing_text: secClosingText,
          display:      dispMap,  // { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
          pasurams
        };
      }
    }

    // ── PATHU + THIRUMOZHI MAPS ──────────────────────────────
    // First-class pathu/thirumozhi sequence items (admin data entry:
    // one row per pathu/thirumozhi instead of individual global numbers).
    // Content shape is IDENTICAL to a normal section so the frontend
    // renders it through the existing section branch unchanged.
    // Ruling: subset recitals show adivaravu only — closing_text is
    // always "" (no "முற்றிற்று" for a pathu/thirumozhi subset).
    async function _buildUnitContent(whereCol, unitId, sectionId, unitName) {
      let sm = await env.db.prepare(
        `SELECT section_id, section_name FROM section_master WHERE section_id = ?`
      ).bind(sectionId).first();
      if (!sm) return null;
      if (script) {
        sm = (await applyScript(env, script, 'section_master', 'section_name',
          [sm], r => r.section_id, 'section_name'))[0];
      }

      const dispMap = await buildDisplayMap(sectionId);

      const pasuramsRes = await env.db.prepare(`
        SELECT p.global_no, p.local_pasuram_no, p.section_id,
               p.pathu_id, p.thirumozhi_id, p.double_recital, p.has_audio,
               pm.pathu_name, pm.pathu_subunit_name,
               pm.thirumozhi_heading AS pathu_thirumozhi_heading,
               tm.thirumozhi_heading AS tm_thirumozhi_heading,
               tm.thirumozhi_name
        FROM pasuram_master p
        LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id
        LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
        WHERE p.${whereCol} = ? ORDER BY p.global_no
      `).bind(unitId).all();

      let unitRows = pasuramsRes.results || [];
      const unitPasuramIds = unitRows.map(r => r.global_no);
      let pasurams = [];

      if (unitPasuramIds.length) {
        let unitLinesRows = await _inQuery(env, unitPasuramIds,
          `SELECT id AS line_id, global_no, line_no, line_text, recital_group
           FROM pasuram_line_master WHERE global_no IN (__IN__)
           ORDER BY global_no, line_no`);

        if (script) {
          unitLinesRows = await applyScript(env, script, 'pasuram_line_master', 'line_text',
            unitLinesRows, r => r.line_id, 'line_text');
          unitRows = await applyScript(env, script, 'pathu_master', 'pathu_name',
            unitRows, r => r.pathu_id, 'pathu_name');
          unitRows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name',
            unitRows, r => r.pathu_id, 'pathu_subunit_name');
          unitRows = await applyScript(env, script, 'pathu_master', 'thirumozhi_heading',
            unitRows, r => r.pathu_id, 'pathu_thirumozhi_heading');
          unitRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading',
            unitRows, r => r.thirumozhi_id, 'tm_thirumozhi_heading');
          unitRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',
            unitRows, r => r.thirumozhi_id, 'thirumozhi_name');
        }

        const unitLinesMap = {};
        for (const l of unitLinesRows) {
          if (!unitLinesMap[l.global_no]) unitLinesMap[l.global_no] = [];
          unitLinesMap[l.global_no].push({ text: l.line_text, group: l.recital_group });
        }

        pasurams = unitRows.map(p => ({
          global_no:           p.global_no,
          local_no:            p.local_pasuram_no,
          section_id:          p.section_id,
          pathu_id:            p.pathu_id,
          thirumozhi_id:       p.thirumozhi_id,
          double_recital:      p.double_recital,
          pathu_name:          p.pathu_name          || "",
          pathu_subunit_name:  p.pathu_subunit_name  || "",
          thirumozhi_heading:  (p.pathu_thirumozhi_heading ?? p.tm_thirumozhi_heading) || "",
          thirumozhi_name:     p.thirumozhi_name     || "",
          lines:               unitLinesMap[p.global_no] || [],
          prosody:             getProsodyName(p.global_no),
          closing_text:        ""
        }));
      }

      return {
        section_id:   sm.section_id,
        display_name: sm.section_name || "",
        unit_name:    unitName || "",
        section_type: "normal",
        closing_text: "",
        display:      dispMap,
        pasurams
      };
    }

    const pathuMap = {};
    if (pathuIds.length) {
      let pmRows = await _inQuery(env, pathuIds,
        `SELECT pathu_id, section_id, pathu_name, pathu_subunit_name
         FROM pathu_master WHERE pathu_id IN (__IN__)`);
      if (script) {
        pmRows = await applyScript(env, script, 'pathu_master', 'pathu_name',
          pmRows, r => r.pathu_id, 'pathu_name');
        pmRows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name',
          pmRows, r => r.pathu_id, 'pathu_subunit_name');
      }
      for (const pm of pmRows) {
        const unitName = [pm.pathu_name, pm.pathu_subunit_name].filter(Boolean).join(" — ");
        const content  = await _buildUnitContent("pathu_id", pm.pathu_id, pm.section_id, unitName);
        if (content) pathuMap[pm.pathu_id] = { pathu_id: pm.pathu_id, ...content };
      }
    }

    const thiruMap = {};
    if (thiruIds.length) {
      let tmRows = await _inQuery(env, thiruIds,
        `SELECT tm.thirumozhi_id, tm.section_id, tm.pathu_id,
                tm.thirumozhi_name, tm.thirumozhi_heading,
                pm.pathu_name, pm.pathu_subunit_name
         FROM thirumozhi_master tm
         LEFT JOIN pathu_master pm ON tm.pathu_id = pm.pathu_id
         WHERE tm.thirumozhi_id IN (__IN__)`);
      if (script) {
        tmRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',
          tmRows, r => r.thirumozhi_id, 'thirumozhi_name');
        tmRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading',
          tmRows, r => r.thirumozhi_id, 'thirumozhi_heading');
        tmRows = await applyScript(env, script, 'pathu_master', 'pathu_name',
          tmRows, r => r.pathu_id, 'pathu_name');
        tmRows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name',
          tmRows, r => r.pathu_id, 'pathu_subunit_name');
      }
      for (const tm of tmRows) {
        const unitName = [
          [tm.pathu_name, tm.pathu_subunit_name].filter(Boolean).join(" — "),
          tm.thirumozhi_name || tm.thirumozhi_heading || ""
        ].filter(Boolean).join(" — ");
        const content = await _buildUnitContent("thirumozhi_id", tm.thirumozhi_id, tm.section_id, unitName);
        if (content) thiruMap[tm.thirumozhi_id] = { thirumozhi_id: tm.thirumozhi_id, ...content };
      }
    }

    // ── FIXED TEXT MAP ───────────────────────────────────────
    const fixedMap = {};

    if (fixedIds.length) {
      let fmRows = await _inQuery(env, fixedIds,
        `SELECT fixed_id, name FROM fixed_text_master WHERE fixed_id IN (__IN__)`);
      let flRowsAll = await _inQuery(env, fixedIds,
        `SELECT fixed_id, line_no, line_text, sect FROM fixed_text_line_master
         WHERE fixed_id IN (__IN__) ORDER BY fixed_id, line_no`);
      if (script) {
        fmRows = await applyScript(env, script, 'fixed_text_master', 'name',
          fmRows, r => r.fixed_id, 'name');
        // fixed_text_line_master is keyed on the pair fixed_id|line_no
        flRowsAll = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
          flRowsAll, r => `${r.fixed_id}|${r.line_no}`, 'line_text');
      }
      const flRows = flRowsAll.filter(r => r.sect === sect || r.sect === 'B');
      const fixedLinesMap = {};
      for (const l of flRows) {
        if (!fixedLinesMap[l.fixed_id]) fixedLinesMap[l.fixed_id] = [];
        fixedLinesMap[l.fixed_id].push(l.line_text);
      }
      for (const fm of fmRows) {
        fixedMap[fm.fixed_id] = {
          fixed_id: fm.fixed_id, name: fm.name,
          lines:    fixedLinesMap[fm.fixed_id] || []
        };
      }
    }

    // ── VAZHI MAP ────────────────────────────────────────────
    const vazhiMap = {};

    if (vazhiIds.length) {
      let vmRows = await _inQuery(env, vazhiIds,
        `SELECT v.vazhi_id, v.entity_id, a.canonical_name
         FROM vazhi_thirunamam_master v
         LEFT JOIN author_master a ON a.author_id = v.entity_id
         WHERE v.vazhi_id IN (__IN__)`);
      let vlRows = await _inQuery(env, vazhiIds,
        `SELECT vazhi_id, vazhi_group, line_no, line_text
         FROM vazhi_thirunamam_line_master WHERE vazhi_id IN (__IN__)
         ORDER BY vazhi_id, vazhi_group, line_no`);

      /* The ஸ்ரீ test below has to run on the RAW Tamil name, so the raw name is
         kept here before conversion; a converted name would never match the
         test and would get a Tamil ஸ்ரீ glued to the front of it. */
      const vazhiRawName = {};
      for (const vm of vmRows) vazhiRawName[vm.vazhi_id] = vm.canonical_name || "";
      let sriWord = "ஸ்ரீ";
      if (script) {
        vmRows = await applyScript(env, script, 'author_master', 'canonical_name',
          vmRows, r => r.entity_id, 'canonical_name');
        // composite key: vazhi_id|vazhi_group|line_no
        vlRows = await applyScript(env, script, 'vazhi_thirunamam_line_master', 'line_text',
          vlRows, r => `${r.vazhi_id}|${r.vazhi_group}|${r.line_no}`, 'line_text');
        const sriRow = await env.db.prepare(
          `SELECT text FROM text_script
           WHERE src_table='ui_text_master' AND src_col='text_tamil'
             AND src_key='common.sri' AND script=?`
        ).bind(script).first();
        if (sriRow && sriRow.text) sriWord = sriRow.text;
      }
      const vazhiLinesMap = {};
      for (const l of vlRows) {
        if (!vazhiLinesMap[l.vazhi_id]) vazhiLinesMap[l.vazhi_id] = {};
        if (!vazhiLinesMap[l.vazhi_id][l.vazhi_group])
          vazhiLinesMap[l.vazhi_id][l.vazhi_group] = [];
        vazhiLinesMap[l.vazhi_id][l.vazhi_group].push(l.line_text);
      }
      for (const vm of vmRows) {
        const rawName   = vm.canonical_name || "";
        const hasSri    = (vazhiRawName[vm.vazhi_id] || "").startsWith("ஸ்ரீ");
        const vazhiName = hasSri ? rawName : sriWord + " " + rawName;
        vazhiMap[vm.vazhi_id] = {
          vazhi_id: vm.vazhi_id, vazhi_name: vazhiName,
          groups: Object.entries(vazhiLinesMap[vm.vazhi_id] || {}).map(([g, lines]) => ({
            group_no: Number(g), lines
          }))
        };
      }
    }

    // ── MADAL SATTRUMURAI MAP ────────────────────────────────
    const madalSattrumuraiMap = {};

    if (madalIds.length) {
      let mmRows = await _inQuery(env, madalIds,
        `SELECT madal_sattrumurai_id, title
         FROM madal_sattrumurai_master WHERE madal_sattrumurai_id IN (__IN__)`);
      let mlRows = await _inQuery(env, madalIds,
        `SELECT madal_sattrumurai_id, line_no, line_text, is_dual_recital
         FROM madal_sattrumurai_line_master
         WHERE madal_sattrumurai_id IN (__IN__)
         ORDER BY madal_sattrumurai_id, line_no`);
      if (script) {
        mmRows = await applyScript(env, script, 'madal_sattrumurai_master', 'title',
          mmRows, r => r.madal_sattrumurai_id, 'title');
        mlRows = await applyScript(env, script, 'madal_sattrumurai_line_master', 'line_text',
          mlRows, r => `${r.madal_sattrumurai_id}|${r.line_no}`, 'line_text');
      }
      const madalLinesMap = {};
      for (const l of mlRows) {
        if (!madalLinesMap[l.madal_sattrumurai_id]) madalLinesMap[l.madal_sattrumurai_id] = [];
        madalLinesMap[l.madal_sattrumurai_id].push({
          line_no: l.line_no, text: l.line_text, is_dual_recital: l.is_dual_recital
        });
      }
      for (const mm of mmRows) {
        madalSattrumuraiMap[mm.madal_sattrumurai_id] = {
          madal_sattrumurai_id: mm.madal_sattrumurai_id,
          title: mm.title,
          lines: madalLinesMap[mm.madal_sattrumurai_id] || []
        };
      }
    }

    // ── CUSTOM MAP ───────────────────────────────────────────
    const customMap = {};
    const customSeqRows = seqRows.filter(r => r.entity_type === "custom");

    if (customSeqRows.length) {
      const allCustomRes = await env.db.prepare(
        `SELECT custom_id, custom_key, tamil_name FROM custom_recital_entity ORDER BY custom_id`
      ).all();
      let allCustomRows = allCustomRes.results || [];
      if (script) {
        allCustomRows = await applyScript(env, script, 'custom_recital_entity', 'tamil_name',
          allCustomRows, r => r.custom_id, 'tamil_name');
      }

      for (const ce of allCustomRows) {
        if (!customSeqRows.find(r => r.entity_id === ce.custom_id)) continue;
        const sectionId = KOIL_SECTION_MAP[ce.custom_key];
        if (!sectionId) {
          customMap[ce.custom_id] = {
            custom_id: ce.custom_id, custom_key: ce.custom_key, tamil_name: ce.tamil_name,
            pasurams: [], display: { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
          };
          continue;
        }

        let sm = await env.db.prepare(
          `SELECT section_id, section_name, global_no_start, global_no_end
           FROM section_master WHERE section_id = ?`
        ).bind(sectionId).first();
        if (!sm) continue;

        const dispMap    = await buildDisplayMap(sectionId);
        const koilClose  = await env.db.prepare(
          `SELECT section_id, closing_text FROM section_closing_master WHERE section_id=?`
        ).bind(sectionId).first();
        let koilCloseText = koilClose?.closing_text || "";
        if (script) {
          sm = (await applyScript(env, script, 'section_master', 'section_name',
            [sm], r => r.section_id, 'section_name'))[0];
          if (koilClose) {
            koilCloseText = (await applyScript(env, script, 'section_closing_master', 'closing_text',
              [koilClose], r => r.section_id, 'closing_text'))[0].closing_text || "";
          }
        }

        // ── Koil pathu_ids — fetched from entity_master by sect-aware tag ──
        // Ghoshti (this worker): fetch combined T+V tags for both sects
        // Recital (recitalworker): fetches sect-specific tag separately
        const koilBaseTitle = ce.custom_key === "koil_thirumozhi"
          ? "கோயில் திருமொழி" : "கோயில் திருவாய்மொழி";
        const koilVadagalaiTitle = "வடகலை " + koilBaseTitle;

        // Fetch both T and V tags — union for ghoshti combined display
        const [koilTRows, koilVRows] = await Promise.all([
          env.db.prepare(`SELECT entity_id FROM entity_master WHERE entity_type='pathu' AND meta_key='tag' AND meta_value=?`).bind(koilBaseTitle).all(),
          env.db.prepare(`SELECT entity_id FROM entity_master WHERE entity_type='pathu' AND meta_key='tag' AND meta_value=?`).bind(koilVadagalaiTitle).all()
        ]);
        const koilPathuSet = new Set([
          ...(koilTRows.results||[]).map(r=>Number(r.entity_id)),
          ...(koilVRows.results||[]).map(r=>Number(r.entity_id))
        ]);
        const koilPathuArr = [...koilPathuSet].sort((a,b)=>a-b);

        if (koilPathuArr.length === 0) {
          customMap[ce.custom_id] = {
            custom_id: ce.custom_id, custom_key: ce.custom_key,
            tamil_name: ce.tamil_name, display_name: sm.section_name,
            closing_text: koilCloseText,
            display: dispMap, pasurams: []
          };
          continue;
        }
        let koilRows = await _inQuery(env, koilPathuArr,
          `SELECT p.global_no, p.local_pasuram_no, p.section_id,
                  p.pathu_id, p.thirumozhi_id, p.double_recital, p.has_audio,
                  pm.pathu_name, pm.pathu_subunit_name,
                  pm.thirumozhi_heading AS pathu_thirumozhi_heading,
                  tm.thirumozhi_heading AS tm_thirumozhi_heading,
                  tm.thirumozhi_name
           FROM pasuram_master p
           LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id
           LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
           WHERE p.pathu_id IN (__IN__) ORDER BY p.global_no`);

        const secPasuramIds = koilRows.map(r => r.global_no);
        let secLinesRows  = await _inQuery(env, secPasuramIds,
          `SELECT id AS line_id, global_no, line_no, line_text, recital_group
           FROM pasuram_line_master WHERE global_no IN (__IN__)
           ORDER BY global_no, line_no`);

        if (script) {
          secLinesRows = await applyScript(env, script, 'pasuram_line_master', 'line_text',
            secLinesRows, r => r.line_id, 'line_text');
          koilRows = await applyScript(env, script, 'pathu_master', 'pathu_name',
            koilRows, r => r.pathu_id, 'pathu_name');
          koilRows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name',
            koilRows, r => r.pathu_id, 'pathu_subunit_name');
          koilRows = await applyScript(env, script, 'pathu_master', 'thirumozhi_heading',
            koilRows, r => r.pathu_id, 'pathu_thirumozhi_heading');
          koilRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading',
            koilRows, r => r.thirumozhi_id, 'tm_thirumozhi_heading');
          koilRows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',
            koilRows, r => r.thirumozhi_id, 'thirumozhi_name');
        }

        const secLinesMap = {};
        for (const l of secLinesRows) {
          if (!secLinesMap[l.global_no]) secLinesMap[l.global_no] = [];
          secLinesMap[l.global_no].push({ text: l.line_text, group: l.recital_group });
        }

        customMap[ce.custom_id] = {
          custom_id:    ce.custom_id, custom_key: ce.custom_key, tamil_name: ce.tamil_name,
          display_name: sm.section_name,
          closing_text: koilCloseText,
          display:      dispMap,
          pasurams: koilRows.map(p => ({
            global_no:          p.global_no, local_no: p.local_pasuram_no,
            section_id:         p.section_id, pathu_id: p.pathu_id,
            thirumozhi_id:      p.thirumozhi_id, double_recital: p.double_recital,
            pathu_name:         p.pathu_name         || "",
            pathu_subunit_name: p.pathu_subunit_name || "",
            thirumozhi_heading: (p.pathu_thirumozhi_heading ?? p.tm_thirumozhi_heading) || "",
            thirumozhi_name:    p.thirumozhi_name    || "",
            lines:              secLinesMap[p.global_no] || [],
            prosody:            getProsodyName(p.global_no),
            closing_text:       ""
          }))
        };
      }
    }

    // ── FINAL SEQUENCE ────────────────────────────────────────
    const sequence = seqRows.map(row => {
      let content = null;
      if      (row.entity_type === "pasuram")           content = pasuramMap[row.entity_id]           || null;
      else if (row.entity_type === "thaniyan")          content = thaniyanMap[row.entity_id]          || null;
      else if (row.entity_type === "section")           content = sectionMap[row.entity_id]           || null;
      else if (row.entity_type === "fixed_text")        content = fixedMap[row.entity_id]             || null;
      else if (row.entity_type === "vazhi_thirunamam")  content = vazhiMap[row.entity_id]             || null;
      else if (row.entity_type === "madal_sattrumurai") content = madalSattrumuraiMap[row.entity_id]  || null;
      else if (row.entity_type === "custom")            content = customMap[row.entity_id]            || null;
      else if (row.entity_type === "pathu")             content = pathuMap[row.entity_id]             || null;
      else if (row.entity_type === "thirumozhi")        content = thiruMap[row.entity_id]             || null;
      return {
        sequence_no: row.sequence_no, entity_type: row.entity_type,
        entity_id: row.entity_id, is_dual_recital: row.is_dual_recital,
        is_optional: row.is_optional, sect: row.sect, phase: row.phase,
        recurrence: row.recurrence, content
      };
    });

    // ── MADAM (Ahobila) injection ─────────────────────────────
    // For Madam viewers, Kesavarya (fixed_id 8) precedes EVERY
    // occurrence of the Vadagalai pothu thaniyan (thaniyan_id 33),
    // inheriting that occurrence's phase/recurrence/sect so the
    // monthly/yearly and recital/sattrumurai filters keep them
    // together. No sequence data entry needed per recital.
    let finalSequence = sequence;
    if (subsectParam === "madam" && fixedMap[8]) {
      finalSequence = [];
      for (const item of sequence) {
        if (item.entity_type === "thaniyan" && Number(item.entity_id) === 33) {
          finalSequence.push({
            sequence_no: item.sequence_no, entity_type: "fixed_text",
            entity_id: 8, is_dual_recital: 0, is_optional: 0,
            sect: item.sect, phase: item.phase,
            recurrence: item.recurrence, content: fixedMap[8]
          });
        }
        finalSequence.push(item);
      }
    }

    return new Response(JSON.stringify({ recital: master, sequence: finalSequence }), { headers: hdrs });

  } catch (err) {
    return new Response(JSON.stringify({ error: "DB error", details: err.message, stack: err.stack }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}




// =============================================================
// 📜 sattrumurai.js  — Cloudflare Worker route handler
// =============================================================

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json;charset=UTF-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
function err(msg, status = 400) {
  return json({ success: false, error: msg }, status);
}

// =============================================================
//  GET /api/sattrumurai/list?thousand_id=1
//  Returns sattrumurais filtered by thousand_id
//  If no thousand_id param, returns all
// =============================================================
export async function handleSattrumuraiList(request, env) {
  const url = new URL(request.url);
  const thousandId = url.searchParams.get("thousand_id");
  const script     = url.searchParams.get("script");

  let results;

  if (thousandId) {
    const res = await env.db.prepare(`
      SELECT sattrumurai_id, name, tamil_name, thousand_id
      FROM   sattrumurai_master
      WHERE  thousand_id = ?
      ORDER  BY sattrumurai_id
    `).bind(thousandId).all();
    results = res.results;
  } else {
    const res = await env.db.prepare(`
      SELECT sattrumurai_id, name, tamil_name, thousand_id
      FROM   sattrumurai_master
      ORDER  BY sattrumurai_id
    `).all();
    results = res.results;
  }

  if (script) {
    results = await applyScript(env, script, 'sattrumurai_master', 'tamil_name',
      results, r => r.sattrumurai_id, 'tamil_name');
  }

  return json({ success: true, data: results });
}

// =============================================================
//  GET /api/sattrumurai/1  (or /2, /3 ...)
// =============================================================
export async function handleSattrumurai(id, env, sect = "T", script = null) {

  if (!id || isNaN(Number(id))) return err("Invalid sattrumurai_id");

  // ── 1. Master row ─────────────────────────────────────────
  let master = await env.db.prepare(`
    SELECT sattrumurai_id, name, tamil_name, thousand_id
    FROM   sattrumurai_master
    WHERE  sattrumurai_id = ?
  `).bind(id).first();

  if (!master) return err("Sattrumurai not found", 404);

  if (script) {
    master = (await applyScript(env, script, 'sattrumurai_master', 'tamil_name',
      [master], r => r.sattrumurai_id, 'tamil_name'))[0];
  }

  // ── 2. Sequence rows ──────────────────────────────────────
  const { results: seqRows } = await env.db.prepare(`
    SELECT sequence_no, entity_type, entity_id, is_dual_recital
    FROM   sattrumurai_sequence
    WHERE  sattrumurai_id = ?
    ORDER  BY sequence_no
  `).bind(id).all();

  if (!seqRows.length) {
    return json({ success: true, sattrumurai: master, sequence: [] });
  }

  // ── 3. Split by type ──────────────────────────────────────
  const pasuramIds = seqRows.filter(r => r.entity_type === "pasuram").map(r => r.entity_id);
  const fixedIds   = seqRows.filter(r => r.entity_type === "fixed_text").map(r => r.entity_id);
  const vazhiIds   = seqRows.filter(r => r.entity_type === "vazhi").map(r => r.entity_id);

  // ── 4. Fetch pasurams ─────────────────────────────────────
  const pasuramMap = {};

  for (const gno of pasuramIds) {

    const pm = await env.db.prepare(`
      SELECT global_no, section_id, double_recital
      FROM   pasuram_master
      WHERE  global_no = ?
    `).bind(gno).first();

    if (!pm) continue;

    // Section 21: திருவெழுகூற்றிருக்கை
    if (pm.section_id === 21) {
      let { results: kLines } = await env.db.prepare(`
        SELECT id, line_no, line_text, dual_recital
        FROM   thiruvezhukootrarikkai_master
        WHERE  section_id = 21
        ORDER  BY line_no ASC
      `).all();

      if (script) {
        kLines = await applyScript(env, script, 'thiruvezhukootrarikkai_master', 'line_text',
          kLines, r => r.id, 'line_text');
      }

      pasuramMap[gno] = {
        global_no:  pm.global_no,
        section_id: pm.section_id,
        lines: kLines.map(l => ({ text: l.line_text, group: 1 })),
      };
      continue;
    }

    // Section 22: சிறியதிருமடல் (madal_id=1)
    if (pm.section_id === 22) {
      let { results: mLines } = await env.db.prepare(`
        SELECT id, couplet_no, line_1, line_2, line_3, line_4,
               line_5, line_6, line_7, line_8
        FROM   madal_unit_master
        WHERE  madal_id = 1
        ORDER  BY couplet_no ASC
      `).all();

      if (script) {
        for (const col of ["line_1","line_2","line_3","line_4","line_5","line_6","line_7","line_8"]) {
          if (!mLines.some(r => r[col])) continue;
          mLines = await applyScript(env, script, 'madal_unit_master', col, mLines, r => r.id, col);
        }
      }

      const lines = [];
      for (const row of mLines) {
        for (let i = 1; i <= 8; i++) {
          const t = row[`line_${i}`];
          if (t) lines.push({ text: t, group: 1 });
        }
      }
      pasuramMap[gno] = { global_no: pm.global_no, section_id: pm.section_id, lines };
      continue;
    }

    // Section 23: பெரியதிருமடல் (madal_id=2)
    if (pm.section_id === 23) {
      let { results: mLines } = await env.db.prepare(`
        SELECT id, couplet_no, line_1, line_2, line_3, line_4,
               line_5, line_6, line_7, line_8
        FROM   madal_unit_master
        WHERE  madal_id = 2
        ORDER  BY couplet_no ASC
      `).all();

      if (script) {
        for (const col of ["line_1","line_2","line_3","line_4","line_5","line_6","line_7","line_8"]) {
          if (!mLines.some(r => r[col])) continue;
          mLines = await applyScript(env, script, 'madal_unit_master', col, mLines, r => r.id, col);
        }
      }

      const lines = [];
      for (const row of mLines) {
        for (let i = 1; i <= 8; i++) {
          const t = row[`line_${i}`];
          if (t) lines.push({ text: t, group: 1 });
        }
      }
      pasuramMap[gno] = { global_no: pm.global_no, section_id: pm.section_id, lines };
      continue;
    }

    // Normal pasuram — join pasuram_line_master
    let { results: rows } = await env.db.prepare(`
      SELECT id AS line_id, line_no, line_text, recital_group
      FROM   pasuram_line_master
      WHERE  global_no = ?
      ORDER  BY line_no ASC
    `).bind(gno).all();

    if (script) {
      rows = await applyScript(env, script, 'pasuram_line_master', 'line_text',
        rows, r => r.line_id, 'line_text');
    }

    pasuramMap[gno] = {
      global_no:      pm.global_no,
      section_id:     pm.section_id,
      double_recital: pm.double_recital,
      lines: rows.map(l => ({ text: l.line_text, group: l.recital_group })),
    };
  }

  // ── 5. Fetch fixed_text ───────────────────────────────────
  const fixedMap = {};

  for (const fid of fixedIds) {
    let fm = await env.db.prepare(`
      SELECT fixed_id, name
      FROM   fixed_text_master
      WHERE  fixed_id = ?
    `).bind(fid).first();

    if (!fm) continue;

    let { results: fLines } = await env.db.prepare(`
      SELECT line_no, line_text
      FROM   fixed_text_line_master
      WHERE  fixed_id = ?
      ORDER  BY line_no ASC
    `).bind(fid).all();

    if (script) {
      fm = (await applyScript(env, script, 'fixed_text_master', 'name',
        [fm], r => r.fixed_id, 'name'))[0];
      // fixed_text_line_master is keyed on the pair fixed_id|line_no
      fLines = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
        fLines, r => `${fid}|${r.line_no}`, 'line_text');
    }

    fixedMap[fid] = {
      fixed_id: fm.fixed_id,
      name:     fm.name,
      lines:    fLines.map(r => r.line_text),
    };
  }

  // ── 6. Fetch vazhi_thirunamam ─────────────────────────────
  // entity_id in vazhi_thirunamam_master = author_id in author_master
  const vazhiMap = {};

  for (const vid of vazhiIds) {
    const vm = await env.db.prepare(`
      SELECT vazhi_id, entity_id
      FROM   vazhi_thirunamam_master
      WHERE  vazhi_id = ?
    `).bind(vid).first();

    if (!vm) continue;

    const author = await env.db.prepare(`
      SELECT canonical_name
      FROM   author_master
      WHERE  author_id = ?
    `).bind(vm.entity_id).first();

    const rawName = author?.canonical_name || "";

    /* The ஸ்ரீ test has to run on the RAW Tamil name. Testing the converted
       name would never match, and a Telugu name would get a Tamil ஸ்ரீ glued
       to the front of it. So: decide here, convert the name separately, and
       prefix with the converted ஸ்ரீ (ui_text_master key common.sri). */
    let displayName = rawName;
    let sriPrefix   = rawName.startsWith("ஸ்ரீ") ? "" : "ஸ்ரீ ";

    if (script) {
      displayName = (await applyScript(env, script, 'author_master', 'canonical_name',
        [{ author_id: vm.entity_id, canonical_name: rawName }],
        r => r.author_id, 'canonical_name'))[0].canonical_name;

      if (sriPrefix) {
        const sri = await env.db.prepare(
          `SELECT text FROM text_script
           WHERE src_table='ui_text_master' AND src_col='text_tamil'
             AND src_key='common.sri' AND script=?`
        ).bind(script).first();
        sriPrefix = ((sri && sri.text) ? sri.text : "ஸ்ரீ") + " ";
      }
    }

    const vazhiName = sriPrefix + displayName;

    let { results: vLines } = await env.db.prepare(`
      SELECT vazhi_group, line_no, line_text
      FROM   vazhi_thirunamam_line_master
      WHERE  vazhi_id = ?
      ORDER  BY vazhi_group ASC, line_no ASC
    `).bind(vid).all();

    if (!vLines.length) continue;

    if (script) {
      // composite key: vazhi_id|vazhi_group|line_no
      vLines = await applyScript(env, script, 'vazhi_thirunamam_line_master', 'line_text',
        vLines, r => `${vid}|${r.vazhi_group}|${r.line_no}`, 'line_text');
    }

    const groupsObj = {};
    for (const l of vLines) {
      if (!groupsObj[l.vazhi_group]) groupsObj[l.vazhi_group] = [];
      groupsObj[l.vazhi_group].push(l.line_text);
    }

    vazhiMap[vid] = {
      vazhi_id:   vid,
      vazhi_name: vazhiName,
      groups: Object.entries(groupsObj)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([group_no, lines]) => ({ group_no: Number(group_no), lines })),
    };
  }

  // ── 7. Assemble sequence ──────────────────────────────────
  const sequence = seqRows.map(row => {
    let content = null;
    if (row.entity_type === "pasuram")    content = pasuramMap[row.entity_id] || null;
    if (row.entity_type === "fixed_text") content = fixedMap[row.entity_id]   || null;
    if (row.entity_type === "vazhi")      content = vazhiMap[row.entity_id]   || null;

    return {
      sequence_no:     row.sequence_no,
      entity_type:     row.entity_type,
      entity_id:       row.entity_id,
      is_dual_recital: row.is_dual_recital,
      content,
    };
  });

  return json({ success: true, sattrumurai: master, sequence });
}


// =============================================================
// handleNithyanusandhanam — paste into index.js
// Add route: if (url.pathname.includes("/api/nithyanusandhanam")) {
//              return handleNithyanusandhanam(request, env);
//            }
// =============================================================

async function handleNithyanusandhanam(request, env) {
  const url = new URL(request.url);
  const sub = url.searchParams.get("sub") || "sequence";
  const script = url.searchParams.get("script");
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  // ── Sequence table ──────────────────────────────────────────
  if (sub === "sequence") {
    const sect    = url.searchParams.get("sect") || "T";
    const subsect = url.searchParams.get("subsect") || "";
    const isMadam = sect === "V" && subsect === "madam";
    // 'B' = shared. 'M' rows are Madam-only (Ahobila Madam extras such as
    // the adaikkalappathu sections) — included ONLY for V + subsect=madam,
    // and excluded for plain Vadagalai. Rows tagged 'T'/'V' behave as before.
    const res = await env.db.prepare(
      `SELECT id, seq_no, item_type, display_label, ref_type, ref_value,
              group_key, show_in_index, is_active, notes
       FROM nithyanusandhanam_sequence
       WHERE (sect = ? OR sect = 'B' OR (? = 1 AND sect = 'M'))
       ORDER BY seq_no`
    ).bind(sect, isMadam ? 1 : 0).all();

    let seqRows = res.results || [];
    if (script) {
      seqRows = await applyScript(env, script, 'nithyanusandhanam_sequence', 'display_label',
        seqRows, r => r.id, 'display_label');
    }
    return new Response(JSON.stringify(seqRows), { headers });
  }

  // ── Fixed text (eyal saathu / sattrumuran) ──────────────────
  if (sub === "fixed") {
    const id = url.searchParams.get("id");
    const sect = url.searchParams.get("sect") || "T";
    const lines = await env.db.prepare(
      `SELECT line_no, line_text FROM fixed_text_line_master
       WHERE fixed_id = ?
       AND (sect = ? OR sect = 'B')
       ORDER BY line_no`
    ).bind(id, sect).all();

    let fixedLines = lines.results || [];
    if (script) {
      // fixed_text_line_master is keyed on the pair fixed_id|line_no
      fixedLines = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
        fixedLines, r => `${id}|${r.line_no}`, 'line_text');
    }
    return new Response(JSON.stringify({ lines: fixedLines }), { headers });
  }

  // =============================================================
// ALSO FIX the vazhi sub — replace the existing loop with single JOIN:
// =============================================================

  // ── Vazhi thirunamam (FAST — single JOIN query) ─────────────────────────────
  if (sub === "vazhi") {
    const sect = url.searchParams.get("sect") || "T";
    // Thenkalai: include 24,25 (Manavala Mamunigal), exclude 38 (Desikan)
    // Vadagalai: include 38 (Desikan naalpattu), exclude 24,25
    // Use explicit conditions instead of dynamic SQL (D1 safe)
    const vazhiWhereClause = sect === 'V'
      ? "v.vazhi_id NOT IN (24, 25)"
      : "v.vazhi_id NOT IN (38)";

    const mastersSql = `SELECT v.vazhi_id, v.entity_id,
              COALESCE(a.canonical_name, 'வாழி திருநாமம்') as name
       FROM vazhi_thirunamam_master v
       LEFT JOIN author_master a ON v.entity_id = a.author_id
       WHERE ${vazhiWhereClause}
       ORDER BY v.vazhi_id`;
    const masters = await env.db.prepare(mastersSql).all();

    const linesSql = `SELECT vazhi_id, line_no, line_text, vazhi_group
       FROM vazhi_thirunamam_line_master
       WHERE ${vazhiWhereClause.replace('v.vazhi_id', 'vazhi_id')}
       ORDER BY vazhi_id, vazhi_group, line_no`;
    const allLines = await env.db.prepare(linesSql).all();

    // Group lines by vazhi_id
    const lineMap = {};
    for (const l of allLines.results) {
      if (!lineMap[l.vazhi_id]) lineMap[l.vazhi_id] = [];
      lineMap[l.vazhi_id].push(l);
    }

    let masterRows = masters.results || [];
    if (script) {
      // `name` is author_master.canonical_name, keyed by author_id (= entity_id)
      masterRows = await applyScript(env, script, 'author_master', 'canonical_name',
        masterRows, r => r.entity_id, 'name');
      // composite key: vazhi_id|vazhi_group|line_no
      for (const vid of Object.keys(lineMap)) {
        lineMap[vid] = await applyScript(env, script, 'vazhi_thirunamam_line_master', 'line_text',
          lineMap[vid], r => `${r.vazhi_id}|${r.vazhi_group}|${r.line_no}`, 'line_text');
      }
    }

    const result = masterRows.map(m => ({
      vazhi_id:  m.vazhi_id,
      entity_id: m.entity_id,
      name:      m.name,
      lines:     lineMap[m.vazhi_id] || []
    }));

    return new Response(JSON.stringify(result), { headers });
  }


    // =============================================================
// ADD THIS TO handleNithyanusandhanam in index.js
// New sub = "prefetch" — returns ALL data needed for NNC in ONE call
// This eliminates ~100 individual API calls during rendering
//
// Add this block BEFORE the final "Unknown sub" return:
// =============================================================

  // ── Prefetch: all pasurams + display data for all NNC sections ──────────────
  if (sub === "prefetch") {

    // All section_ids used in NNC sequence
    const NNC_SECTIONS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 18, 22, 23, 24, 25, 26];

    // Fetch ALL pasurams for all sections in parallel
    const pasuramPromises = NNC_SECTIONS.map(secId =>
      env.db.prepare(`
        SELECT
          p.global_no, p.local_pasuram_no AS local_no,
          p.section_id, p.pathu_id, p.thirumozhi_id,
          p.double_recital, p.has_audio,
          s.section_name,
          pm.pathu_name, pm.pathu_subunit_name,
          pm.thirumozhi_heading AS pathu_thirumozhi_heading,
          tm.thirumozhi_name, tm.thirumozhi_heading,
          l.line_no, l.line_text, l.recital_group
        FROM pasuram_master p
        LEFT JOIN section_master s ON p.section_id = s.section_id
        LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id
        LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
        JOIN pasuram_line_master l ON p.global_no = l.global_no
        WHERE p.section_id = ?
        ORDER BY p.global_no ASC, l.line_no ASC
      `).bind(secId).all()
    );

    // Fetch ALL display data for all sections in parallel
    const displayPromises = NNC_SECTIONS.map(secId =>
      env.db.prepare(`
        SELECT entity_type, entity_id, meta_key, meta_value, sequence_no
        FROM entity_master
        WHERE display_flag = 1
        AND (
          (entity_type = 'pasuram' AND entity_id BETWEEN
            (SELECT global_no_start FROM section_master WHERE section_id = ?)
            AND
            (SELECT global_no_end FROM section_master WHERE section_id = ?))
          OR (entity_type = 'pathu' AND entity_id IN
            (SELECT pathu_id FROM pathu_master WHERE section_id = ?))
          OR (entity_type = 'thirumozhi' AND entity_id IN
            (SELECT thirumozhi_id FROM thirumozhi_master WHERE section_id = ?))
          OR (entity_type = 'section' AND entity_id = ?)
        )
        ORDER BY entity_type, entity_id, sequence_no
      `).bind(secId, secId, secId, secId, secId).all()
    );

    // Fetch thaniyan data for all sections
    const thaniyanPromises = NNC_SECTIONS.map(secId =>
      env.db.prepare(`
        SELECT
          tm.thaniyan_id, tm.canonical_name, tm.section_id, tm.thaniyan_type,
          tl.line_no, tl.line_text, tl.line_role, tl.line_group, tl.prosody_id
        FROM thaniyan_master tm
        JOIN thaniyan_line_master tl
          ON (tl.thaniyan_ref = 'section_' || ? OR tl.thaniyan_ref = 'global')
        WHERE tm.section_id = ? OR tm.thaniyan_type = 'global'
        ORDER BY tm.thaniyan_id, tl.line_no
      `).bind(secId, secId).all()
    );

    // Prosody data (same for all)
    const prosodyScope = await env.db.prepare(
      `SELECT prosody_id, start_global_no, end_global_no FROM prosody_scope_map`
    ).all();

    const prosodyMaster = await env.db.prepare(
      `SELECT prosody_id, canonical_name_tamil FROM prosody_master`
    ).all();

    // Section closing for all sections
    const sectionClosing = await env.db.prepare(
      `SELECT section_id, closing_text FROM section_closing_master
       WHERE section_id IN (${NNC_SECTIONS.join(",")})`
    ).all();

    // Vazhi thirunamam — single query with JOIN (replaces N sequential queries)
    const vazhiMasters = await env.db.prepare(
      `SELECT v.vazhi_id, v.entity_id,
              COALESCE(a.canonical_name, 'வாழி திருநாமம்') as name
       FROM vazhi_thirunamam_master v
       LEFT JOIN author_master a ON v.entity_id = a.author_id
       ORDER BY v.vazhi_id`
    ).all();

    const vazhiLines = await env.db.prepare(
      `SELECT vazhi_id, line_no, line_text, vazhi_group
       FROM vazhi_thirunamam_line_master
       ORDER BY vazhi_id, vazhi_group, line_no`
    ).all();

    // Wait for all parallel fetches
    const [pasuramResults, displayResults, thaniyanResults] = await Promise.all([
      Promise.all(pasuramPromises),
      Promise.all(displayPromises),
      Promise.all(thaniyanPromises)
    ]);

    // Group pasurams by section_id and process lines
    const pasuramsBySection = {};
    for (let i = 0; i < NNC_SECTIONS.length; i++) {
      const secId = NNC_SECTIONS[i];
      const rows = pasuramResults[i].results || [];
      const grouped = {};
      for (const row of rows) {
        if (!grouped[row.global_no]) {
          grouped[row.global_no] = {
            global_no: row.global_no,
            local_no: row.local_no,
            section_id: row.section_id,
            pathu_id: row.pathu_id,
            thirumozhi_id: row.thirumozhi_id,
            section_name: row.section_name,
            pathu_name: row.pathu_name,
            pathu_subunit_name: row.pathu_subunit_name,
            thirumozhi_name: row.thirumozhi_name,
            double_recital: row.double_recital,
            thirumozhi_heading: row.pathu_thirumozhi_heading || row.thirumozhi_heading || "",
            lines: []
          };
        }
        grouped[row.global_no].lines.push({
          text: row.line_text,
          group: row.recital_group
        });
      }
      pasuramsBySection[secId] = Object.values(grouped);
    }

    // Group display data by section_id
    const displayBySection = {};
    for (let i = 0; i < NNC_SECTIONS.length; i++) {
      const secId = NNC_SECTIONS[i];
      displayBySection[secId] = displayResults[i].results || [];
    }

    // Group thaniyan by section_id
    const thaniyanBySection = {};
    for (let i = 0; i < NNC_SECTIONS.length; i++) {
      const secId = NNC_SECTIONS[i];
      thaniyanBySection[secId] = thaniyanResults[i].results || [];
    }

    // Group vazhi lines by vazhi_id
    const vazhiLineMap = {};
    for (const l of vazhiLines.results) {
      if (!vazhiLineMap[l.vazhi_id]) vazhiLineMap[l.vazhi_id] = [];
      vazhiLineMap[l.vazhi_id].push(l);
    }
    const vazhi = vazhiMasters.results.map(m => ({
      vazhi_id: m.vazhi_id,
      entity_id: m.entity_id,
      name: m.name,
      lines: vazhiLineMap[m.vazhi_id] || []
    }));

    return new Response(JSON.stringify({
      pasurams:       pasuramsBySection,
      display:        displayBySection,
      thaniyan:       thaniyanBySection,
      prosodyScope:   prosodyScope.results,
      prosodyMaster:  prosodyMaster.results,
      sectionClosing: sectionClosing.results,
      vazhi
    }), { headers });
  }


  return new Response(
    JSON.stringify({ error: "Unknown sub" }),
    { status: 400, headers }
  );
}




// =============================================================
// STEP 1: Add this line to your worker router (before the 404):
//
//   if (url.pathname.includes("/api/divyadesam")) {
//     return handleDivyadesam(request, env);
//   }
//
// STEP 2: Paste everything below this comment at the bottom
//         of your existing worker index.js
// =============================================================

// section_id → author chronological id (matches fullAzhwars.js)
const SECTION_AUTHOR = {
  1:7,2:7,3:8,4:8,5:9,6:4,7:10,8:10,9:11,10:5,
  11:12,12:12,13:12,14:1,15:2,16:3,17:4,
  18:6,19:6,20:6,21:12,22:12,23:12,24:13,26:6
};

function ddJson(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

/* Divyadesam name + deity name conversion. Shared by every sub-endpoint
   that returns desam rows. No-op without ?script=, so the Tamil response
   stays byte-identical. */
async function ddApplyDesamFields(env, script, rows) {
  if (!script || !rows || !rows.length) return rows;
  let out = await applyScript(env, script, 'divyadesam_master', 'canonical_name',
                              rows, r => r.divyadesam_id, 'canonical_name');
  out = await applyScript(env, script, 'divyadesam_deity_master', 'perumal_name',
                          out, r => r.divyadesam_id, 'perumal_name');
  out = await applyScript(env, script, 'divyadesam_deity_master', 'thayar_name',
                          out, r => r.divyadesam_id, 'thayar_name');
  return out;
}

async function ddMadalLineMap(url, env) {
  const section_id = url.searchParams.get("section_id");
  const desam_id   = url.searchParams.get("desam_id");
  const res = await env.db.prepare(
    `SELECT couplet_no, line_no 
     FROM madal_divyadesam_line_map
     WHERE section_id = ? AND divyadesam_id = ?`
  ).bind(section_id, desam_id).all();
  return ddJson(res.results);
}


async function handleDivyadesam(request, env) {
  const url = new URL(request.url);
  const sub = url.searchParams.get("sub") || "list";
  const script = url.searchParams.get("script");
  try {
    if (sub === "list")       return await ddList(env, script);
    if (sub === "debug-map")  {
      const did = url.searchParams.get("desam_id");
      const r = await env.db.prepare(
        `SELECT global_no FROM pasuram_divyadesam_map WHERE divyadesam_id = ? ORDER BY global_no`
      ).bind(did).all();
      const gnos = r.results.map(x => Number(x.global_no));
      return ddJson({ total: gnos.length, has2673: gnos.includes(2673), has2674: gnos.includes(2674), sample_last5: gnos.slice(-5) });
    }
    if (sub === "by-desam")   return await ddByDesam(url, env);
    if (sub === "by-desam-full") return await ddByDesamFull(url, env, script);
    if (sub === "by-azhwar-full") return await ddByAzhwarFull(url, env, script);
    if (sub === "by-azhwar")  return await ddByAzhwar(url, env);
    if (sub === "by-region")  return await ddByFilter("traditional_region", url.searchParams.get("region"), env, script);
    if (sub === "by-state")   return await ddByFilter("state", url.searchParams.get("state"), env, script);
    if (sub === "by-district") return await ddByFilter("district", url.searchParams.get("district"), env, script);
    if (sub === "special")    return await ddSpecial(url, env);
    if (sub === "filters")    return await ddFilters(env);
    if (sub === "madal-line-map") return await ddMadalLineMap(url, env);

    // ── ADD THIS BLOCK ──────────────────────────────────────────
    if (sub === "aliases") {
      const rows = await env.db.prepare(
        `SELECT entity_id, alias_text 
         FROM search_alias 
         WHERE entity_type = 'divyadesam'
         ORDER BY entity_id`
      ).all();
      return ddJson(rows.results);
    }
    // ────────────────────────────────────────────────────────────
    if (sub === "archanai") {
  const res = await env.db.prepare(`
    SELECT dm.divyadesam_id,
           dm.canonical_name,
           dm.canonical_name_hi, dm.canonical_name_te, dm.canonical_name_kn, dm.canonical_name_ml,
           dd.perumal_name,
           dd.perumal_name_hi, dd.perumal_name_te, dd.perumal_name_kn, dd.perumal_name_ml,
           dd.thayar_name,
           dd.thayar_name_hi, dd.thayar_name_te, dd.thayar_name_kn, dd.thayar_name_ml,
           dd.archana_namavalli,
           dd.archana_namavalli_hi, dd.archana_namavalli_te, dd.archana_namavalli_kn, dd.archana_namavalli_ml
    FROM   divyadesam_master dm
    LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
    ORDER  BY dm.divyadesam_id
  `).all();
  return ddJson(res.results);
}

if (sub === "aliases") {
  const rows = await env.db.prepare(
    `SELECT entity_id, alias FROM search_alias
     WHERE entity_type = 'divyadesam'
     ORDER BY entity_id`
  ).all();
  return ddJson(rows.results);
}



    return ddJson({ error: "Unknown sub" });
  } catch (err) {
    return ddJson({ error: err.message });
  }
}

// ── 1. Full list of all divyadesams ──────────────────────────────────────────
async function ddList(env, script) {
  const dm = await env.db.prepare(
    `SELECT divyadesam_id, canonical_name, traditional_region, state, district
     FROM divyadesam_master ORDER BY divyadesam_id`
  ).all();

  const deity = await env.db.prepare(
    `SELECT divyadesam_id, perumal_name, thayar_name FROM divyadesam_deity_master`
  ).all();

  const deityMap = {};
  for (const d of deity.results) deityMap[d.divyadesam_id] = d;

  // Derive azhwar ownership from pasuram_divyadesam_map + pasuram_master section_id
  // (author_divyadesam_map may be empty; this is always accurate)
  const secAzhwarMap = {
    1:7,2:7,3:8,4:8,5:9,6:4,7:10,8:10,9:11,10:5,
    11:12,12:12,13:12,14:1,15:2,16:3,17:4,
    18:6,19:6,20:6,21:12,22:12,23:12,24:13,26:6
  };
  const secThousandMap = {
    1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,
    11:2,12:2,13:2,
    14:3,15:3,16:3,17:3,18:3,19:3,20:3,21:3,22:3,23:3,24:3,
    26:4
  };

  // get section_id per desam from pasuram_divyadesam_map + pasuram_master
  const secRes = await env.db.prepare(
    `SELECT pdm.divyadesam_id, pm.section_id, COUNT(*) as cnt
     FROM pasuram_divyadesam_map pdm
     JOIN pasuram_master pm ON pdm.global_no = pm.global_no
     GROUP BY pdm.divyadesam_id, pm.section_id`
  ).all();

  const azhwarIds = {};        // divyadesam_id -> [author_ids]
  const azhwarCnts = {};       // divyadesam_id -> { author_id: count }
  const thousandSets = {};     // divyadesam_id -> Set of thousand_ids
  for (const r of secRes.results) {
    const aid = secAzhwarMap[r.section_id];
    const tid = secThousandMap[r.section_id];
    if (!aid) continue;
    if (!azhwarIds[r.divyadesam_id]) { azhwarIds[r.divyadesam_id] = []; }
    if (!azhwarIds[r.divyadesam_id].includes(aid)) azhwarIds[r.divyadesam_id].push(aid);
    if (!azhwarCnts[r.divyadesam_id]) azhwarCnts[r.divyadesam_id] = {};
    azhwarCnts[r.divyadesam_id][aid] = (azhwarCnts[r.divyadesam_id][aid] || 0) + r.cnt;
    if (!thousandSets[r.divyadesam_id]) thousandSets[r.divyadesam_id] = new Set();
    if (tid) thousandSets[r.divyadesam_id].add(tid);
  }

  // thousand_ids and azhwar_ids derived from pasuram data above
  const listOut = dm.results.map(d => {
    const aids = azhwarIds[d.divyadesam_id] || [];
    const tids = thousandSets[d.divyadesam_id] ? [...thousandSets[d.divyadesam_id]].sort() : [];
    const azhwarCounts = azhwarCnts[d.divyadesam_id] || {};
    const totalPasurams = Object.values(azhwarCounts).reduce((s,v) => s+v, 0);
    return {
      ...d,
      perumal_name:   deityMap[d.divyadesam_id]?.perumal_name || "",
      thayar_name:    deityMap[d.divyadesam_id]?.thayar_name  || "",
      azhwar_ids:     aids,
      thousand_ids:   tids,
      total_pasurams: totalPasurams,
      azhwar_counts:  azhwarCounts  // { "7": 5, "12": 10 } azhwar_id -> count
    };
  });
  return ddJson(await ddApplyDesamFields(env, script, listOut));
}

// ── 2. All pasurams for ONE desam, grouped by azhwar ─────────────────────────
async function ddByDesam(url, env) {
  const desam_id = url.searchParams.get("desam_id");

  const desam = await env.db.prepare(
    `SELECT dm.*, dd.perumal_name, dd.thayar_name
     FROM divyadesam_master dm
     LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
     WHERE dm.divyadesam_id = ?`
  ).bind(desam_id).first();

  const mapRes = await env.db.prepare(
    `SELECT global_no, notes, annotation FROM pasuram_divyadesam_map
     WHERE divyadesam_id = ? ORDER BY global_no`
  ).bind(desam_id).all();

  if (!mapRes.results.length) return ddJson({ desam, azhwars: [] });

  const globalNos = mapRes.results.map(r => Number(r.global_no));
  const notesMap = {};
  for (const r of mapRes.results) notesMap[Number(r.global_no)] = r;

  // batch to avoid D1 "too many SQL variables" — max 50 at a time
  // Handle special global_nos 2672/2673/2674 (sections 21/22/23)
  // Their lines are not in pasuram_line_master — fetch metadata only
  const SPECIAL_GNO = [2672, 2673, 2674];
  const specialGnos = globalNos.filter(n => SPECIAL_GNO.includes(n));
  const normalGnos  = globalNos.filter(n => !SPECIAL_GNO.includes(n));

  const normalPasurams = await ddFetchPasuramsBatched(env, normalGnos);
  // Special gnos are NOT in pasuram_master — build synthetic objects
  const SPECIAL_META = {
    2672: { section_id:21, section_name:"திருவெழுகூற்றிருக்கை" },
    2673: { section_id:22, section_name:"சிறியதிருமடல்" },
    2674: { section_id:23, section_name:"பெரியதிருமடல்" }
  };
  const specialPasurams = specialGnos.map(gno => ({
    global_no: gno, local_no: 1,
    section_id: SPECIAL_META[gno].section_id,
    section_name: SPECIAL_META[gno].section_name,
    pathu_id: null, thirumozhi_id: null,
    double_recital: 0, pathu_name: null,
    pathu_subunit_name: null, thirumozhi_name: null,
    thirumozhi_heading: "", lines: []
  }));

  const pasurams = [...normalPasurams, ...specialPasurams]
    .sort((a, b) => a.global_no - b.global_no);

  const displayMap = await ddFetchDisplayBatched(env, globalNos);

  // group by azhwar chronological order
  const groups = {};
  for (const p of pasurams) {
    const aid = SECTION_AUTHOR[p.section_id] || 0;
    if (!groups[aid]) groups[aid] = [];
    groups[aid].push({
      ...p,
      display:    displayMap[p.global_no]   || [],
      notes:      notesMap[p.global_no]?.notes      || "",
      annotation: notesMap[p.global_no]?.annotation || ""
    });
  }

  const azhwars = Object.entries(groups)
    .sort(([a],[b]) => Number(a) - Number(b))
    .map(([aid, pas]) => ({ author_id: Number(aid), pasurams: pas }));

  return ddJson({ desam, azhwars });
}

// ── 3. All desams + pasurams for ONE azhwar ───────────────────────────────────
// Uses pasuram_divyadesam_map + section_id (author_divyadesam_map may be empty)
async function ddByAzhwar(url, env) {
  const author_id = Number(url.searchParams.get("author_id"));

  // sections belonging to this azhwar (static map)
  const authorSections = Object.entries(SECTION_AUTHOR)
    .filter(([,aid]) => Number(aid) === author_id)
    .map(([sid]) => Number(sid));
  if (!authorSections.length) return ddJson({ author_id, desams: [] });

  // get all divyadesam_ids where this azhwar has pasurams
  // by joining pasuram_divyadesam_map with pasuram_master on section_id
  const ph = authorSections.map(() => "?").join(",");
  // Special global_nos not in pasuram_master — add them via UNION
  // section 21→2672, 22→2673, 23→2674
  const SPECIAL_SECTION_GNO = { 21:2672, 22:2673, 23:2674 };
  const specialGnosForAzhwar = authorSections
    .filter(s => SPECIAL_SECTION_GNO[s])
    .map(s => SPECIAL_SECTION_GNO[s]);

  // Normal desams via pasuram_master join
  const desamRes = await env.db.prepare(
    `SELECT DISTINCT pdm.divyadesam_id
     FROM pasuram_divyadesam_map pdm
     JOIN pasuram_master pm ON pdm.global_no = pm.global_no
     WHERE pm.section_id IN (${ph})
     ORDER BY pdm.divyadesam_id`
  ).bind(...authorSections).all();

  // Special desams via direct global_no lookup (bypass pasuram_master)
  let specialDesamIds = [];
  if (specialGnosForAzhwar.length) {
    const sph = specialGnosForAzhwar.map(() => "?").join(",");
    const sRes = await env.db.prepare(
      `SELECT DISTINCT divyadesam_id FROM pasuram_divyadesam_map
       WHERE global_no IN (${sph}) ORDER BY divyadesam_id`
    ).bind(...specialGnosForAzhwar).all();
    specialDesamIds = sRes.results.map(r => r.divyadesam_id);
  }

  // Merge and deduplicate desam ids
  const allDesamIds = [...new Set([
    ...desamRes.results.map(r => r.divyadesam_id),
    ...specialDesamIds
  ])].sort((a,b) => a-b);

  // Replace desamRes.results with merged list for the loop below
  const mergedDesamResults = allDesamIds.map(id => ({ divyadesam_id: id }));

  const desams = [];
  for (const { divyadesam_id } of mergedDesamResults) {
    const desam = await env.db.prepare(
      `SELECT dm.*, dd.perumal_name, dd.thayar_name
       FROM divyadesam_master dm
       LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
       WHERE dm.divyadesam_id = ?`
    ).bind(divyadesam_id).first();

    // get only this azhwar's pasurams for this desam
    // Normal pasurams via pasuram_master join
    const mapRes = await env.db.prepare(
      `SELECT pdm.global_no, pdm.notes, pdm.annotation
       FROM pasuram_divyadesam_map pdm
       JOIN pasuram_master pm ON pdm.global_no = pm.global_no
       WHERE pdm.divyadesam_id = ? AND pm.section_id IN (${ph})
       ORDER BY pdm.global_no`
    ).bind(divyadesam_id, ...authorSections).all();

    // Special pasurams not in pasuram_master — fetch directly
    let specialMapRes = { results: [] };
    if (specialGnosForAzhwar.length) {
      const sph2 = specialGnosForAzhwar.map(() => "?").join(",");
      specialMapRes = await env.db.prepare(
        `SELECT global_no, notes, annotation FROM pasuram_divyadesam_map
         WHERE divyadesam_id = ? AND global_no IN (${sph2})
         ORDER BY global_no`
      ).bind(divyadesam_id, ...specialGnosForAzhwar).all();
    }

    // Merge both result sets
    const allMapResults = [
      ...mapRes.results,
      ...specialMapRes.results
    ].sort((a,b) => Number(a.global_no) - Number(b.global_no));

    if (!mapRes.results.length) continue;

    const gnos = allMapResults.map(r => Number(r.global_no));
    const notesMap = {};
    for (const r of allMapResults) notesMap[Number(r.global_no)] = r;

    // Special global_nos NOT in pasuram_master — build synthetic objects
    const SPECIAL_GNO = [2672, 2673, 2674];
    const specialGnos = gnos.filter(n => SPECIAL_GNO.includes(n));
    const normalGnos  = gnos.filter(n => !SPECIAL_GNO.includes(n));

    const normalPasurams = await ddFetchPasuramsBatched(env, normalGnos);

    const SPECIAL_META2 = {
      2672: { section_id:21, section_name:"திருவெழுகூற்றிருக்கை" },
      2673: { section_id:22, section_name:"சிறியதிருமடல்" },
      2674: { section_id:23, section_name:"பெரியதிருமடல்" }
    };
    const specialPasurams = specialGnos.map(gno => ({
      global_no: gno, local_no: 1,
      section_id: SPECIAL_META2[gno].section_id,
      section_name: SPECIAL_META2[gno].section_name,
      pathu_id: null, thirumozhi_id: null,
      double_recital: 0, pathu_name: null,
      pathu_subunit_name: null, thirumozhi_name: null,
      thirumozhi_heading: "", lines: []
    }));

    const pasurams = [...normalPasurams, ...specialPasurams]
      .sort((a, b) => a.global_no - b.global_no);

    const displayMap = await ddFetchDisplayBatched(env, gnos);

    if (!pasurams.length) continue;

    desams.push({
      ...desam,
      pasurams: pasurams.map(p => ({
        ...p,
        display:    displayMap[p.global_no] || [],
        notes:      notesMap[p.global_no]?.notes || "",
        annotation: notesMap[p.global_no]?.annotation || ""
      }))
    });
  }

  return ddJson({ author_id, desams });
}

// ── 4/5/6. By region / state / district ──────────────────────────────────────
async function ddByFilter(field, value, env, script) {
  const res = await env.db.prepare(
    `SELECT dm.divyadesam_id, dm.canonical_name, dm.traditional_region,
            dm.state, dm.district, dd.perumal_name, dd.thayar_name
     FROM divyadesam_master dm
     LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
     WHERE dm.${field} = ? ORDER BY dm.divyadesam_id`
  ).bind(value).all();
  return ddJson(await ddApplyDesamFields(env, script, res.results));
}

// ── 7. Special groups (Thirunangur / Navathiruppathi / Irattai) ───────────────
async function ddSpecial(url, env) {
  const group = url.searchParams.get("group");
  if (!group) return ddJson({ error: "group required" });

  // Try multiple search strategies in order:
  // 1. entity_master with entity_type='divyadesam' and meta_category='group'
  // 2. divyadesam_alias_master alias columns
  // 3. traditional_region field
  // 4. canonical_name partial match

  // Terms matched to actual entity_master tag values:
  // Thirunangur: pathu tags contain "திருநாங்கூர்த்திருப்பதி 1..11"
  // Irattai: pathu 68-70 tagged "திருவாலி -திருநகரி" (note the space)
  // Navathiruppathi: no single tag — fallback to traditional_region/canonical_name
  const groupMeta = {
    thirunangur:     ["திருநாங்கூர்த்திருப்பதி", "திருநாங்கூர்"],
    navathiruppathi: ["நவதிருப்பதி", "navathiruppathi"],
    irattai:         ["திருவாலி -திருநகரி", "திருவாலி-திருநகரி", "இரட்டை"]
  };
  const terms = groupMeta[group];
  if (!terms) return ddJson({ error: "Unknown group" });

  let desamIds = [];

  // Strategy 1: entity_master pathu tags (e.g. "திருநாங்கூர்த்திருப்பதி 1")
  // pathu_ids -> global_nos -> divyadesam_ids via pasuram_divyadesam_map
  for (const term of terms) {
    const pathuRes = await env.db.prepare(
      `SELECT DISTINCT entity_id FROM entity_master
       WHERE entity_type='pathu' AND meta_value LIKE ? LIMIT 50`
    ).bind("%" + term + "%").all();
    if (pathuRes.results.length) {
      const pathuIds = pathuRes.results.map(x => x.entity_id);
      const ph = pathuIds.map(() => "?").join(",");
      const ddRes = await env.db.prepare(
        `SELECT DISTINCT pdm.divyadesam_id
         FROM pasuram_divyadesam_map pdm
         JOIN pasuram_master pm ON pdm.global_no = pm.global_no
         WHERE pm.pathu_id IN (${ph})`
      ).bind(...pathuIds).all();
      if (ddRes.results.length) { desamIds = ddRes.results.map(x => x.divyadesam_id); break; }
    }
  }

  // Strategy 2: divyadesam_alias_master (confirmed for Nava/Irattai)
  if (!desamIds.length) {
    for (const term of terms) {
      const r = await env.db.prepare(
        `SELECT DISTINCT divyadesam_id FROM divyadesam_alias_master
         WHERE alias_1 LIKE ? OR alias_2 LIKE ? OR alias_3 LIKE ?
            OR alias_4 LIKE ? OR alias_5 LIKE ? OR alias_6 LIKE ?
            OR alias_7 LIKE ? OR alias_8 LIKE ? OR alias_9 LIKE ?
            OR alias_10 LIKE ? LIMIT 20`
      ).bind(...Array(10).fill("%" + term + "%")).all();
      if (r.results.length) { desamIds = r.results.map(x => x.divyadesam_id); break; }
    }
  }

  // Strategy 3: entity_master with entity_type='divyadesam'
  if (!desamIds.length) {
    for (const term of terms) {
      const r = await env.db.prepare(
        `SELECT DISTINCT entity_id FROM entity_master
         WHERE entity_type='divyadesam' AND meta_value LIKE ? LIMIT 20`
      ).bind("%" + term + "%").all();
      if (r.results.length) { desamIds = r.results.map(x => x.entity_id); break; }
    }
  }

  // Strategy 4: traditional_region or canonical_name
  if (!desamIds.length) {
    for (const term of terms) {
      const r = await env.db.prepare(
        `SELECT divyadesam_id FROM divyadesam_master
         WHERE traditional_region LIKE ? OR canonical_name LIKE ?
         ORDER BY divyadesam_id LIMIT 20`
      ).bind("%" + term + "%", "%" + term + "%").all();
      if (r.results.length) { desamIds = r.results.map(x => x.divyadesam_id); break; }
    }
  }

  const desams = [];
  for (const did of desamIds) {
    const d = await env.db.prepare(
      `SELECT dm.*, dd.perumal_name, dd.thayar_name
       FROM divyadesam_master dm
       LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
       WHERE dm.divyadesam_id = ?`
    ).bind(did).first();
    if (d) desams.push(d);
  }

  // Hardcoded fallback based on verified desam_ids from canonical name mapping
  if (!desamIds.length) {
    const FALLBACK = {
      thirunangur:     [30,31,32,33,34,35,36,37,38,39,40],
      navathiruppathi: [57,58,67,68,69,70,71,72,73],
      irattai:         [18]
    };
    desamIds = FALLBACK[group] || [];
  }

  if (!desamIds.length) {
    return ddJson({ group, desams: [], note: "No data found for this group." });
  }

  return ddJson({ group, desams });
}

// ── 8. Distinct filter values ─────────────────────────────────────────────────
async function ddFilters(env) {
  const [r, s, d] = await Promise.all([
    env.db.prepare(`SELECT DISTINCT traditional_region v FROM divyadesam_master WHERE traditional_region != '' ORDER BY traditional_region`).all(),
    env.db.prepare(`SELECT DISTINCT state v FROM divyadesam_master WHERE state != '' ORDER BY state`).all(),
    env.db.prepare(`SELECT DISTINCT district v FROM divyadesam_master WHERE district IS NOT NULL AND district != '' ORDER BY district`).all()
  ]);
  return ddJson({
    regions:   r.results.map(x => x.v),
    states:    s.results.map(x => x.v),
    districts: d.results.map(x => x.v)
  });
}

// ── Shared: fetch pasurams by global_nos list ─────────────────────────────────
// Split in two so a ?script= pass can run over the FLAT rows once, for the
// whole desam, instead of once per 50-pasuram chunk.
async function ddFetchPasuramRows(env, globalNos) {
  if (!globalNos.length) return [];
  const ph = globalNos.map(() => "?").join(",");
  const res = await env.db.prepare(
    `SELECT p.global_no, p.local_pasuram_no, p.section_id, p.pathu_id,
            p.thirumozhi_id, p.double_recital, p.has_audio,
            s.section_name,
            pm.pathu_name, pm.pathu_subunit_name,
            pm.thirumozhi_heading AS pathu_thiru_heading,
            tm.thirumozhi_name, tm.thirumozhi_heading,
            l.id AS line_id, l.line_no, l.line_text, l.recital_group
     FROM pasuram_master p
     LEFT JOIN section_master s    ON p.section_id    = s.section_id
     LEFT JOIN pathu_master pm     ON p.pathu_id      = pm.pathu_id
     LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
     JOIN pasuram_line_master l    ON p.global_no     = l.global_no
     WHERE p.global_no IN (${ph})
     ORDER BY p.global_no, l.line_no`
  ).bind(...globalNos).all();
  return res.results || [];
}

function ddGroupPasuramRows(rows, globalNos) {
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.global_no]) {
      grouped[row.global_no] = {
        global_no:          row.global_no,
        local_no:           row.local_pasuram_no,
        section_id:         row.section_id,
        pathu_id:           row.pathu_id,
        thirumozhi_id:      row.thirumozhi_id,
        double_recital:     row.double_recital,
        section_name:       row.section_name,
        pathu_name:         row.pathu_name,
        pathu_subunit_name: row.pathu_subunit_name,
        thirumozhi_name:    row.thirumozhi_name,
        thirumozhi_heading: row.pathu_thiru_heading || row.thirumozhi_heading || "",
        lines: []
      };
    }
    grouped[row.global_no].lines.push({ text: row.line_text, group: row.recital_group });
  }
  return globalNos.map(n => grouped[n]).filter(Boolean);
}

async function ddFetchPasurams(env, globalNos) {
  return ddGroupPasuramRows(await ddFetchPasuramRows(env, globalNos), globalNos);
}

// ── Shared: fetch per-pasuram display items ───────────────────────────────────
async function ddFetchDisplay(env, globalNos) {
  if (!globalNos.length) return {};
  const ph = globalNos.map(() => "?").join(",");
  const res = await env.db.prepare(
    `SELECT entity_id, meta_key, meta_value, sequence_no FROM entity_master
     WHERE display_flag=1 AND entity_type='pasuram' AND entity_id IN (${ph})
     ORDER BY entity_id, sequence_no`
  ).bind(...globalNos).all();
  const map = {};
  for (const row of res.results) {
    if (!map[row.entity_id]) map[row.entity_id] = [];
    map[row.entity_id].push({ text: row.meta_value, order: row.sequence_no });
  }
  return map;
}

// ── Batched wrappers (avoid D1 "too many SQL variables" limit of ~100) ────────
async function ddFetchPasuramsBatched(env, globalNos, script) {
  if (!globalNos.length) return [];
  const CHUNK = 50;
  let rows = [];
  for (let i = 0; i < globalNos.length; i += CHUNK) {
    rows.push(...await ddFetchPasuramRows(env, globalNos.slice(i, i + CHUNK)));
  }
  if (script) {
    rows = await applyScript(env, script, 'pasuram_line_master', 'line_text',       rows, r => r.line_id,       'line_text');
    rows = await applyScript(env, script, 'section_master',      'section_name',    rows, r => r.section_id,    'section_name');
    rows = await applyScript(env, script, 'pathu_master',        'pathu_name',      rows, r => r.pathu_id,      'pathu_name');
    rows = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name',     rows, r => r.pathu_id,      'pathu_subunit_name');
    rows = await applyScript(env, script, 'pathu_master', 'thirumozhi_heading',     rows, r => r.pathu_id,      'pathu_thiru_heading');
    rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',   rows, r => r.thirumozhi_id, 'thirumozhi_name');
    rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading', rows, r => r.thirumozhi_id, 'thirumozhi_heading');
  }
  const all = ddGroupPasuramRows(rows, globalNos);
  const map = {};
  for (const p of all) map[p.global_no] = p;
  return globalNos.map(n => map[n]).filter(Boolean);
}

async function ddFetchDisplayBatched(env, globalNos) {
  if (!globalNos.length) return {};
  const CHUNK = 50;
  const combined = {};
  for (let i = 0; i < globalNos.length; i += CHUNK) {
    Object.assign(combined, await ddFetchDisplay(env, globalNos.slice(i, i + CHUNK)));
  }
  return combined;
}

// =============================================================
// HANDLER: by-desam-full — everything in ONE response
// Returns desam + azhwars + pasurams + thaniyan + display + prosody + closing
// Frontend renders directly — zero extra fetches needed
// =============================================================
async function ddByDesamFull(url, env, script) {
  const desam_id = url.searchParams.get("desam_id");

  // 1. Desam info
  let desam = await env.db.prepare(
    `SELECT dm.*, dd.perumal_name, dd.thayar_name
     FROM divyadesam_master dm
     LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
     WHERE dm.divyadesam_id = ?`
  ).bind(desam_id).first();
  if (script && desam) desam = (await ddApplyDesamFields(env, script, [desam]))[0];

  // 2. All global_nos for this desam
  const mapRes = await env.db.prepare(
    `SELECT global_no, notes, annotation FROM pasuram_divyadesam_map
     WHERE divyadesam_id = ? ORDER BY global_no`
  ).bind(desam_id).all();

  if (!mapRes.results.length) return ddJson({ desam, azhwars: [] });

  const globalNos = mapRes.results.map(r => Number(r.global_no));
  const notesMap = {};
  for (const r of mapRes.results) notesMap[Number(r.global_no)] = r;

  // 3. Special gnos (not in pasuram_master)
  const SPECIAL_GNO = [2672, 2673, 2674];
  const specialGnos = globalNos.filter(n => SPECIAL_GNO.includes(n));
  const normalGnos  = globalNos.filter(n => !SPECIAL_GNO.includes(n));

  const normalPasurams = await ddFetchPasuramsBatched(env, normalGnos, script);
  const SPECIAL_META = {
    2672: { section_id:21, section_name:"திருவெழுகூற்றிருக்கை" },
    2673: { section_id:22, section_name:"சிறியதிருமடல்" },
    2674: { section_id:23, section_name:"பெரியதிருமடல்" }
  };
  const specialPasurams = specialGnos.map(gno => ({
    global_no: gno, local_no: 1,
    section_id: SPECIAL_META[gno].section_id,
    section_name: SPECIAL_META[gno].section_name,
    pathu_id: null, thirumozhi_id: null,
    double_recital: 0, lines: []
  }));

  const allPasurams = [...normalPasurams, ...specialPasurams]
    .sort((a, b) => a.global_no - b.global_no);

  // 4. Get unique section_ids
  const sectionIds = [...new Set(allPasurams.map(p => p.section_id))];

  // 5. Fetch thaniyan for all sections in parallel
  const thaniyanMap = {};
  const SKIP_THANIYAN = [2, 12, 13];
  await Promise.all(sectionIds.map(async (sid) => {
    if (SKIP_THANIYAN.includes(sid)) { thaniyanMap[sid] = { thaniyan: [], prosodyMap: {} }; return; }
    const globalRes = await env.db.prepare(
      `SELECT tm.thaniyan_id, tm.canonical_name, tl.line_id, tl.line_no, tl.line_text,
              tl.line_role, tl.line_group, tl.prosody_id
       FROM thaniyan_master tm
       JOIN thaniyan_line_master tl ON tl.thaniyan_ref = ?
       WHERE tm.section_id = ? ORDER BY tm.thaniyan_id, tl.line_no`
    ).bind("section_" + sid, sid).all();
    const prosodyRes = await env.db.prepare(
      `SELECT prosody_id, canonical_name_tamil FROM prosody_master`
    ).all();
    let thnRows = globalRes.results || [];
    let prsRows = prosodyRes.results || [];
    if (script) {
      thnRows = await applyScript(env, script, 'thaniyan_master', 'canonical_name', thnRows, r => r.thaniyan_id, 'canonical_name');
      thnRows = await applyScript(env, script, 'thaniyan_line_master', 'line_text', thnRows, r => r.line_id, 'line_text');
      prsRows = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil', prsRows, r => r.prosody_id, 'canonical_name_tamil');
    }
    const prosodyMap = {};
    for (const r of prsRows) prosodyMap[String(r.prosody_id)] = r.canonical_name_tamil;
    const grouped = {};
    for (const r of thnRows) {
      if (!grouped[r.thaniyan_id]) grouped[r.thaniyan_id] = { title: r.canonical_name, lines: [], type: "section" };
      grouped[r.thaniyan_id].lines.push({ line_no: r.line_no, line_text: r.line_text, line_role: r.line_role, line_group: r.line_group, prosody_id: r.prosody_id });
    }
    thaniyanMap[sid] = { thaniyan: Object.values(grouped), prosodyMap };
  }));

  // 6. Fetch display data for all sections in parallel
  const displayMap = {};
  await Promise.all(sectionIds.map(async (sid) => {
    const secMaster = await env.db.prepare(
      `SELECT global_no_start, global_no_end FROM section_master WHERE section_id = ?`
    ).bind(sid).first();
    if (!secMaster) return;

    const dispRes = await env.db.prepare(
      `SELECT id, entity_type, entity_id, meta_key, meta_value, sequence_no
       FROM entity_master WHERE display_flag = 1 AND (
         (entity_type='pasuram' AND entity_id BETWEEN ? AND ?) OR
         (entity_type='pathu' AND entity_id IN (SELECT pathu_id FROM pathu_master WHERE section_id=?)) OR
         (entity_type='thirumozhi' AND entity_id IN (SELECT thirumozhi_id FROM thirumozhi_master WHERE section_id=?)) OR
         (entity_type='section' AND entity_id=?)
       ) ORDER BY entity_type, entity_id, sequence_no`
    ).bind(secMaster.global_no_start, secMaster.global_no_end, sid, sid, sid).all();

    const prosodyScope = await env.db.prepare(
      `SELECT prosody_id, start_global_no, end_global_no FROM prosody_scope_map`
    ).all();
    const prosodyMaster = await env.db.prepare(
      `SELECT prosody_id, canonical_name_tamil FROM prosody_master`
    ).all();
    const closing = await env.db.prepare(
      `SELECT closing_text FROM section_closing_master WHERE section_id = ?`
    ).bind(sid).all();

    let dispRows    = dispRes.results || [];
    let prsMaster   = prosodyMaster.results || [];
    let closingRows = closing.results || [];
    if (script) {
      dispRows    = await applyScript(env, script, 'entity_master', 'meta_value', dispRows, r => r.id, 'meta_value');
      prsMaster   = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil', prsMaster, r => r.prosody_id, 'canonical_name_tamil');
      // section_closing_master is keyed by section_id; the row itself does not
      // carry it here, so the section id in scope is the key.
      closingRows = await applyScript(env, script, 'section_closing_master', 'closing_text', closingRows, () => sid, 'closing_text');
    }

    const dm = { section:[], pathu:{}, thirumozhi:{}, pasuram:{},
                 prosodyScope: prosodyScope.results,
                 prosodyMaster: prsMaster,
                 sectionClosing: closingRows };

    const thiruRes = await env.db.prepare(
      `SELECT thirumozhi_id, pathu_id FROM thirumozhi_master WHERE section_id=?`
    ).bind(sid).all();
    const t2p = {};
    for (const r of thiruRes.results) if (r.pathu_id) t2p[String(r.thirumozhi_id)] = String(r.pathu_id);

    for (const row of dispRows) {
      const text = row.meta_value;
      if (!text?.trim()) continue;
      if (row.entity_type === "section") { dm.section.push({ text, key: row.meta_key, order: row.sequence_no }); }
      else if (row.entity_type === "pathu") {
        const k = String(row.entity_id);
        if (!dm.pathu[k]) dm.pathu[k] = [];
        dm.pathu[k].push({ text, key: row.meta_key, order: row.sequence_no });
      } else if (row.entity_type === "thirumozhi") {
        const k = String(row.entity_id);
        if (!dm.thirumozhi[k]) dm.thirumozhi[k] = { items:[], pathu_id: t2p[k]||null };
        dm.thirumozhi[k].items.push({ text, key: row.meta_key, order: row.sequence_no });
      } else if (row.entity_type === "pasuram") {
        const k = String(row.entity_id);
        if (!dm.pasuram[k]) dm.pasuram[k] = [];
        dm.pasuram[k].push({ text, key: row.meta_key, order: row.sequence_no });
      }
    }
    displayMap[sid] = dm;
  }));

  // 7. Group pasurams by azhwar
  const groups = {};
  for (const p of allPasurams) {
    const aid = SECTION_AUTHOR[p.section_id] || 0;
    if (!groups[aid]) groups[aid] = [];
    groups[aid].push({
      ...p,
      display: displayMap[p.global_no] || [],
      notes: notesMap[p.global_no]?.notes || "",
      annotation: notesMap[p.global_no]?.annotation || ""
    });
  }

  const azhwars = Object.entries(groups)
    .sort(([a],[b]) => Number(a)-Number(b))
    .map(([aid, pas]) => ({ author_id: Number(aid), pasurams: pas }));

  return ddJson({ desam, azhwars, thaniyanMap, displayMap });
}

// =============================================================
// HANDLER: by-azhwar-full — all desams for one azhwar, pre-fetched
// =============================================================
async function ddByAzhwarFull(url, env, script) {
  const author_id = Number(url.searchParams.get("author_id"));

  const authorSections = Object.entries(SECTION_AUTHOR)
    .filter(([,aid]) => Number(aid) === author_id)
    .map(([sid]) => Number(sid));
  if (!authorSections.length) return ddJson({ author_id, desams: [] });

  const SPECIAL_SECTION_GNO = { 21:2672, 22:2673, 23:2674 };
  const specialGnosForAzhwar = authorSections
    .filter(s => SPECIAL_SECTION_GNO[s])
    .map(s => SPECIAL_SECTION_GNO[s]);

  // Get desam ids for this azhwar
  const ph = authorSections.map(() => "?").join(",");
  const desamRes = await env.db.prepare(
    `SELECT DISTINCT pdm.divyadesam_id
     FROM pasuram_divyadesam_map pdm
     JOIN pasuram_master pm ON pdm.global_no = pm.global_no
     WHERE pm.section_id IN (${ph}) ORDER BY pdm.divyadesam_id`
  ).bind(...authorSections).all();

  let specialDesamIds = [];
  if (specialGnosForAzhwar.length) {
    const sph = specialGnosForAzhwar.map(() => "?").join(",");
    const sRes = await env.db.prepare(
      `SELECT DISTINCT divyadesam_id FROM pasuram_divyadesam_map
       WHERE global_no IN (${sph})`
    ).bind(...specialGnosForAzhwar).all();
    specialDesamIds = sRes.results.map(r => r.divyadesam_id);
  }

  const allDesamIds = [...new Set([
    ...desamRes.results.map(r => r.divyadesam_id),
    ...specialDesamIds
  ])].sort((a,b)=>a-b);

  // Fetch thaniyan per section (once, shared across desams)
  const sectionIds = authorSections;
  const thaniyanMap = {};
  const SKIP_THANIYAN = [2,12,13];
  await Promise.all(sectionIds.map(async (sid) => {
    if (SKIP_THANIYAN.includes(sid)) { thaniyanMap[sid] = { thaniyan:[], prosodyMap:{} }; return; }
    const r = await env.db.prepare(
      `SELECT tm.thaniyan_id, tm.canonical_name, tl.line_id, tl.line_no, tl.line_text,
              tl.line_role, tl.line_group, tl.prosody_id
       FROM thaniyan_master tm
       JOIN thaniyan_line_master tl ON tl.thaniyan_ref = ?
       WHERE tm.section_id = ? ORDER BY tm.thaniyan_id, tl.line_no`
    ).bind("section_" + sid, sid).all();
    const pm = await env.db.prepare(`SELECT prosody_id, canonical_name_tamil FROM prosody_master`).all();
    let thnRows = r.results || [];
    let prsRows = pm.results || [];
    if (script) {
      thnRows = await applyScript(env, script, 'thaniyan_master', 'canonical_name', thnRows, x => x.thaniyan_id, 'canonical_name');
      thnRows = await applyScript(env, script, 'thaniyan_line_master', 'line_text', thnRows, x => x.line_id, 'line_text');
      prsRows = await applyScript(env, script, 'prosody_master', 'canonical_name_tamil', prsRows, x => x.prosody_id, 'canonical_name_tamil');
    }
    const prosodyMap = {};
    for (const p of prsRows) prosodyMap[String(p.prosody_id)] = p.canonical_name_tamil;
    const grouped = {};
    for (const row of thnRows) {
      if (!grouped[row.thaniyan_id]) grouped[row.thaniyan_id] = { title: row.canonical_name, lines:[], type:"section" };
      grouped[row.thaniyan_id].lines.push({ line_no:row.line_no, line_text:row.line_text, line_role:row.line_role, line_group:row.line_group, prosody_id:row.prosody_id });
    }
    thaniyanMap[sid] = { thaniyan: Object.values(grouped), prosodyMap };
  }));

  // Fetch pasurams per desam
  const desams = [];
  for (const divyadesam_id of allDesamIds) {
    let desam = await env.db.prepare(
      `SELECT dm.*, dd.perumal_name, dd.thayar_name
       FROM divyadesam_master dm
       LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
       WHERE dm.divyadesam_id = ?`
    ).bind(divyadesam_id).first();
    if (script && desam) desam = (await ddApplyDesamFields(env, script, [desam]))[0];

    const mapRes = await env.db.prepare(
      `SELECT pdm.global_no, pdm.notes, pdm.annotation
       FROM pasuram_divyadesam_map pdm
       JOIN pasuram_master pm ON pdm.global_no = pm.global_no
       WHERE pdm.divyadesam_id = ? AND pm.section_id IN (${ph})
       ORDER BY pdm.global_no`
    ).bind(divyadesam_id, ...authorSections).all();

    let specialMapRes = { results: [] };
    if (specialGnosForAzhwar.length) {
      const sph2 = specialGnosForAzhwar.map(()=>"?").join(",");
      specialMapRes = await env.db.prepare(
        `SELECT global_no, notes, annotation FROM pasuram_divyadesam_map
         WHERE divyadesam_id = ? AND global_no IN (${sph2})`
      ).bind(divyadesam_id, ...specialGnosForAzhwar).all();
    }

    const allMap = [...mapRes.results, ...specialMapRes.results]
      .sort((a,b) => Number(a.global_no)-Number(b.global_no));
    if (!allMap.length) continue;

    const gnos = allMap.map(r => Number(r.global_no));
    const notesMap = {};
    for (const r of allMap) notesMap[Number(r.global_no)] = r;

    const SPECIAL_GNO = [2672,2673,2674];
    const SPECIAL_META = {
      2672:{section_id:21,section_name:"திருவெழுகூற்றிருக்கை"},
      2673:{section_id:22,section_name:"சிறியதிருமடல்"},
      2674:{section_id:23,section_name:"பெரியதிருமடல்"}
    };
    const normalGnos = gnos.filter(n=>!SPECIAL_GNO.includes(n));
    const specGnos   = gnos.filter(n=>SPECIAL_GNO.includes(n));
    const normalPas  = await ddFetchPasuramsBatched(env, normalGnos, script);
    const specPas    = specGnos.map(gno=>({ global_no:gno, local_no:1,
      section_id:SPECIAL_META[gno].section_id,
      section_name:SPECIAL_META[gno].section_name,
      pathu_id:null, thirumozhi_id:null, lines:[] }));
    const pasurams = [...normalPas,...specPas]
      .sort((a,b)=>a.global_no-b.global_no)
      .map(p=>({ ...p, notes:notesMap[p.global_no]?.notes||"", annotation:notesMap[p.global_no]?.annotation||"" }));

    if (!pasurams.length) continue;
    desams.push({ ...desam, pasurams });
  }

  return ddJson({ author_id, desams, thaniyanMap });
}

// ─── Munnadi Pinnadi Handler ───────────────────────────────────────────────

const EXCLUDED_SECTIONS = [19, 21, 22, 23];

const THOUSANDS = {
  1: { name: 'முதலாயிரம்',     sections: [1,2,3,4,5,6,7,8,9,10] },
  2: { name: 'இரண்டாமாயிரம்', sections: [11,12,13] },
  3: { name: 'மூன்றாமாயிரம்', sections: [14,15,16,17,18,20,24] },
  4: { name: 'நான்காமாயிரம்', sections: [26] },
};

const SECTION_ORDER_FULL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,20,24,26];

const SECTION_META = {
  1:  { name: 'திருப்பல்லாண்டு',          type: 'simple'     },
  2:  { name: 'பெரியாழ்வார் திருமொழி',    type: 'pathu'      },
  3:  { name: 'திருப்பாவை',               type: 'simple'     },
  4:  { name: 'நாச்சியார் திருமொழி',      type: 'thirumozhi' },
  5:  { name: 'பெருமாள் திருமொழி',        type: 'thirumozhi' },
  6:  { name: 'திருச்சந்தவிருத்தம்',      type: 'simple'     },
  7:  { name: 'திருமாலை',                 type: 'simple'     },
  8:  { name: 'திருப்பள்ளியெழுச்சி',     type: 'simple'     },
  9:  { name: 'அமலனாதிபிரான்',           type: 'simple'     },
  10: { name: 'கண்ணிநுண்சிறுத்தாம்பு',  type: 'simple'     },
  11: { name: 'பெரிய திருமொழி',           type: 'pathu'      },
  12: { name: 'திருகுறுந்தாண்டகம்',      type: 'simple'     },
  13: { name: 'திருநெடுந்தாண்டகம்',      type: 'simple'     },
  14: { name: 'முதல் திருவந்தாதி',       type: 'simple'     },
  15: { name: 'இரண்டாம் திருவந்தாதி',   type: 'simple'     },
  16: { name: 'மூன்றாம் திருவந்தாதி',   type: 'simple'     },
  17: { name: 'நான்முகன்திருவந்தாதி',   type: 'simple'     },
  18: { name: 'திருவிருத்தம்',           type: 'simple'     },
  20: { name: 'பெரியதிருவந்தாதி',       type: 'simple'     },
  24: { name: 'இராமாநுச நூற்றந்தாதி',   type: 'simple'     },
  26: { name: 'திருவாய்மொழி',            type: 'pathu'      },
};

const CORS_HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, max-age=300',
};

export async function handleMunnadiPinnadi(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // ── TEMP DEBUG — remove after fixing ──
  const url = new URL(request.url);
  if (url.pathname === '/api/debug-th') {
    const { results: tm } = await env.db.prepare(
      `SELECT thaniyan_id, section_id, canonical_name FROM thaniyan_master LIMIT 10`
    ).all();
    const { results: tl } = await env.db.prepare(
      `SELECT thaniyan_ref, line_no, line_text FROM thaniyan_line_master LIMIT 10`
    ).all();
    return new Response(JSON.stringify({tm, tl}), { headers: CORS_HEADERS });
  }

  try {
    const url    = new URL(request.url);
    const scope  = url.searchParams.get('scope') || 'full';
    const part   = parseInt(url.searchParams.get('part') || '0');
    const script = url.searchParams.get('script');

    let sectionFilter = '';
    let sectionOrder  = SECTION_ORDER_FULL;
    let thousandName  = 'நாலாயிர திவ்யப்பிரபந்தம்';

    if (scope === '1000' && THOUSANDS[part]) {
      const { sections, name } = THOUSANDS[part];
      sectionFilter = `AND p.section_id IN (${sections.join(',')})`;
      sectionOrder  = sections;
      thousandName  = name;
    } else {
      sectionFilter = `AND p.section_id NOT IN (${EXCLUDED_SECTIONS.join(',')})`;
    }

    /* The thousand name is a worker-side constant, so it has no content row of
       its own. On the script path take the converted name from the tables that
       do hold it: thousands_master for one thousand, ui_text_master's
       common.naalayiram for the whole 4000. */
    if (script) {
      if (scope === '1000' && THOUSANDS[part]) {
        const tn = await applyScript(env, script, 'thousands_master', 'canonical_name',
          [{ thousand_id: part, canonical_name: thousandName }],
          r => r.thousand_id, 'canonical_name');
        thousandName = tn[0].canonical_name;
      } else {
        const ut = await env.db.prepare(
          `SELECT text FROM text_script
           WHERE src_table='ui_text_master' AND src_col='text_tamil'
             AND src_key='common.naalayiram' AND script=?`
        ).bind(script).first();
        if (ut && ut.text) thousandName = ut.text;
      }
    }

    const sql = `
      SELECT
        m.id AS mp_id, m.global_no, m.line_1, m.line_2,
        p.section_id, p.double_recital, p.has_audio,
        pt.pathu_id, pt.pathu_name, pt.pathu_subunit_name, pt.thirumozhi_heading,
        tm.thirumozhi_id, tm.thirumozhi_name, tm.thirumozhi_heading AS tm_heading
      FROM munnadi_pinnadi_master m
      JOIN pasuram_master p ON p.global_no = m.global_no
      LEFT JOIN pathu_master pt
        ON pt.section_id = p.section_id
        AND m.global_no BETWEEN pt.global_no_start AND pt.global_no_end
      LEFT JOIN thirumozhi_master tm
        ON tm.section_id = p.section_id
        AND m.global_no BETWEEN tm.global_no_start AND tm.global_no_end
      WHERE 1=1 ${sectionFilter}
      ORDER BY m.global_no ASC
    `;

    let { results } = await env.db.prepare(sql).all();

    /* ── SCRIPT PASS ── run before the Pallandu merge, so the merged row
       copies already-converted text. No-op without ?script=. */
    if (script) {
      results = await applyScript(env, script, 'munnadi_pinnadi_master', 'line_1', results, r => r.mp_id,         'line_1');
      results = await applyScript(env, script, 'munnadi_pinnadi_master', 'line_2', results, r => r.mp_id,         'line_2');
      results = await applyScript(env, script, 'pathu_master', 'pathu_name',         results, r => r.pathu_id,      'pathu_name');
      results = await applyScript(env, script, 'pathu_master', 'pathu_subunit_name', results, r => r.pathu_id,      'pathu_subunit_name');
      results = await applyScript(env, script, 'pathu_master', 'thirumozhi_heading', results, r => r.pathu_id,      'thirumozhi_heading');
      results = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',    results, r => r.thirumozhi_id, 'thirumozhi_name');
      results = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading', results, r => r.thirumozhi_id, 'tm_heading');
    }

    // ── Pallandu merge ──
    // global_no 1: munnadi of verse 1 → displayed in line_1 of merged row
    // global_no 2: munnadi of verse 2 → used as pinnadi (line_2) of merged row
    // pallandu2 is marked _skip so it is excluded from the pasuram loop entirely.
    // IMPORTANT: even though pallandu2 is skipped from output, we still need to
    // count it in localSeq so that subsequent pasurams get the correct local_no.
    // We handle this by NOT skipping the localSeq increment — see loop below.
    const pallandu1 = results.find(r => r.global_no === 1);
    const pallandu2 = results.find(r => r.global_no === 2);
    if (pallandu1 && pallandu2) {
      pallandu1.line_2  = pallandu2.line_1;  // verse 2 munnadi = pinnadi of merged row
      pallandu1._merged = true;
      pallandu2._skip   = true;
    }

    // ── Section display mode ──
    const sectionIds = [...new Set(results.map(r => r.section_id))];
    const sectionDisplayMode = {};
    const sectionNameById    = {};   // converted section names (script path only)
    const sectionClosingById = {};   // converted closing lines (script path only)
    if (sectionIds.length > 0) {
      const { results: smR } = await env.db.prepare(
        `SELECT section_id, section_name, thaniyan_display_mode FROM section_master WHERE section_id IN (${sectionIds.join(',')})`
      ).all();
      for (const s of smR) sectionDisplayMode[s.section_id] = s.thaniyan_display_mode;

      if (script) {
        const named = await applyScript(env, script, 'section_master', 'section_name',
          smR, r => r.section_id, 'section_name');
        for (const s of named) sectionNameById[s.section_id] = s.section_name;

        /* The renderer keeps its own Tamil closing lines. Sending the converted
           one lets it use that instead, without touching the Tamil path. */
        const { results: scR } = await env.db.prepare(
          `SELECT section_id, closing_text FROM section_closing_master WHERE section_id IN (${sectionIds.join(',')})`
        ).all();
        const closed = await applyScript(env, script, 'section_closing_master', 'closing_text',
          scR, r => r.section_id, 'closing_text');
        for (const s of closed) sectionClosingById[s.section_id] = s.closing_text;
      }
    }

    // ── Thaniyans — thaniyan_ref stores "section_1", "section_2" etc ──
const thaniyans = {};
if (sectionIds.length > 0) {
  const sectionRefs = sectionIds.map(id => `'section_${id}'`).join(',');
  let { results: tlR } = await env.db.prepare(
     `SELECT l.line_id, l.thaniyan_ref, l.line_no, l.line_text, l.line_role, l.line_group,
             t.thaniyan_id, t.canonical_name
     FROM thaniyan_line_master l
     JOIN thaniyan_master t ON t.section_id = CAST(REPLACE(l.thaniyan_ref,'section_','') AS INTEGER)
     WHERE l.thaniyan_ref IN (${sectionRefs})
     ORDER BY l.thaniyan_ref, l.line_no`
  ).all();

  if (script) {
    tlR = await applyScript(env, script, 'thaniyan_line_master', 'line_text', tlR, r => r.line_id,     'line_text');
    tlR = await applyScript(env, script, 'thaniyan_master', 'canonical_name', tlR, r => r.thaniyan_id, 'canonical_name');
  }

  for (const row of tlR) {
    const sid = parseInt(row.thaniyan_ref.replace('section_', ''));
    if (!thaniyans[sid]) thaniyans[sid] = [{ name: row.canonical_name || '', lines: [] }];
   thaniyans[sid][0].lines.push({ text: row.line_text, role: row.line_role, group: row.line_group });
  }
}

    // ── Group pasurams into sections ──
    const sectionsMap = new Map();
    const localSeq    = {};

    for (const row of results) {
      const sid = row.section_id;

      // Initialise section on first encounter (before any skip check,
      // so section_id=1 is created even if pallandu1 comes first)
      if (!sectionsMap.has(sid)) {
        localSeq[sid] = 0;
        sectionsMap.set(sid, {
          section_id:            sid,
          section_name:          (script && sectionNameById[sid]) || SECTION_META[sid]?.name || '',
          section_type:          SECTION_META[sid]?.type || 'simple',
          thaniyan_display_mode: sectionDisplayMode[sid] ?? 1,
          thaniyans:             thaniyans[sid] || [],
          groups:                new Map(),
          pasurams:              [],
        });
      }

      // Always increment localSeq — even for _skip rows (pallandu2).
      // This keeps local_no correct for every subsequent pasuram.
      // e.g. pallandu1→local_no=1(merged), pallandu2→counted but skipped,
      // next pasuram→local_no=3 which matches its actual position.
      localSeq[sid]++;

      // Now skip output for _skip rows
      if (row._skip) continue;

      const sec  = sectionsMap.get(sid);
      const meta = SECTION_META[sid];

      const pasuram = {
        global_no:      row.global_no,
        local_no:       localSeq[sid],
        line_1:         row.line_1 || '',
        line_2:         row.line_2 || '',
        double_recital: row.double_recital === 1,
        merged:         row._merged || false,
      };

      if (meta?.type === 'pathu' && row.pathu_id) {
        const key = row.pathu_id;
        if (!sec.groups.has(key)) {
          sec.groups.set(key, {
            pathu_id: row.pathu_id, pathu_name: row.pathu_name,
            subunit_name: row.pathu_subunit_name, thirumozhi_heading: row.thirumozhi_heading,
            pasurams: [],
          });
        }
        sec.groups.get(key).pasurams.push(pasuram);
      } else if (meta?.type === 'thirumozhi' && row.thirumozhi_id) {
        const key = row.thirumozhi_id;
        if (!sec.groups.has(key)) {
          sec.groups.set(key, {
            thirumozhi_id: row.thirumozhi_id, thirumozhi_name: row.thirumozhi_name,
            thirumozhi_heading: row.tm_heading, pasurams: [],
          });
        }
        sec.groups.get(key).pasurams.push(pasuram);
      } else {
        sec.pasurams.push(pasuram);
      }
    }

    // ── Serialise sections in defined order ──
    const sections = [];
    for (const sid of sectionOrder) {
      if (!sectionsMap.has(sid)) continue;
      const sec    = sectionsMap.get(sid);
      const groups = [...sec.groups.values()];
      // closing_text is added ONLY on the script path, so the Tamil response
      // stays byte-identical and the renderer keeps its own Tamil closings.
      const extra  = (script && sectionClosingById[sid])
        ? { closing_text: sectionClosingById[sid] } : {};
      sections.push({ ...sec, groups, ...extra });
    }

    // ── Build index ──
    const index = sections.map(sec => {
      const entry = {
        section_id:   sec.section_id,
        section_name: sec.section_name,
        section_type: sec.section_type,
        groups:       [],
      };
      if (sec.section_type === 'pathu') {
        const pathuMap = new Map();
        for (const g of sec.groups) {
          const pname = g.pathu_name;
          if (!pathuMap.has(pname)) {
            pathuMap.set(pname, { id: g.pathu_id, pathu_name: pname, children: [] });
          }
          pathuMap.get(pname).children.push({
            id: g.pathu_id,
            label: [g.subunit_name, g.thirumozhi_heading].filter(Boolean).join(' — '),
          });
        }
        for (const [, p] of pathuMap) {
          entry.groups.push({ type: 'pathu', id: p.id, label: p.pathu_name, children: p.children });
        }
      } else if (sec.section_type === 'thirumozhi') {
        for (const g of sec.groups) {
          entry.groups.push({
            type:  'thirumozhi',
            id:    g.thirumozhi_id,
            label: g.thirumozhi_name,
            sub:   g.thirumozhi_heading || '',
          });
        }
      }
      return entry;
    });

    return new Response(JSON.stringify({
      scope:         scope === '1000' ? `1000-${part}` : 'full',
      thousand_name: thousandName,
      total:         results.length,
      index,
      sections,
    }), { headers: CORS_HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
}

// =============================================================
// VOICE ROUTES — paste this block into your existing worker.js
//
// STEP 1: Add this route check in the main fetch handler,
//         BEFORE the existing routes (after the opening lines):
//
//   if (url.pathname.startsWith("/voice/")) {
//     return handleVoice(request, env);
//   }
//
// STEP 2: Paste the entire block below at the bottom of worker.js
//
// Zero changes to any existing handler.
// All queries are read-only SELECTs on the same `db` binding.
// =============================================================

async function handleVoice(request, env) {
  const url  = new URL(request.url);
  const path = url.pathname; // e.g. "/voice/desam-aliases"

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=3600"  // 1hr cache — this data rarely changes
  };

  function ok(data) {
    return new Response(JSON.stringify(data), { headers });
  }
  function fail(msg, status = 400) {
    return new Response(JSON.stringify({ error: msg }), { status, headers });
  }

  try {

    // ── OPTIONS preflight ──────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // ==========================================================
    // GET /voice/desam-aliases
    // Returns all 108 divyadesams with canonical_name,
    // perumal_name, thayar_name + all aliases from search_alias
    // Shape: [ { id, name, perumal, thayar, aliases: [str] } ]
    // ==========================================================
    if (path === "/voice/desam-aliases") {

      const [desamRes, aliasRes] = await Promise.all([
        env.db.prepare(`
          SELECT dm.divyadesam_id AS id,
                 dm.canonical_name AS name,
                 dd.perumal_name   AS perumal,
                 dd.thayar_name    AS thayar
          FROM   divyadesam_master dm
          LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
          ORDER  BY dm.divyadesam_id
        `).all(),

        env.db.prepare(`
          SELECT entity_id AS id, alias AS alias_text
          FROM   search_alias
          WHERE  entity_type = 'divyadesam'
          ORDER  BY entity_id
        `).all()
      ]);

      // Build alias map: id → [alias, alias, ...]
      const aliasMap = {};
      for (const row of aliasRes.results) {
        if (!aliasMap[row.id]) aliasMap[row.id] = [];
        aliasMap[row.id].push(row.alias_text);
      }

      const result = desamRes.results.map(d => ({
        id:      d.id,
        name:    d.name    || "",
        perumal: d.perumal || "",
        thayar:  d.thayar  || "",
        aliases: aliasMap[d.id] || []
      }));

      return ok(result);
    }

    // ==========================================================
    // GET /voice/anchor-map
    // Returns all anchor_map rows across ALL thousands
    // Used for thirumozhi heading search (வாடினேன், ஆராவமுதே etc.)
    // Shape: [ { section_id, type, canonical_text,
    //            pathu_name, subunit_name, thirumozhi_heading,
    //            thousand_id, thousand_anchor_no, global_anchor_no } ]
    // ==========================================================
    if (path === "/voice/anchor-map") {

      const res = await env.db.prepare(`
        SELECT section_id,
               type,
               canonical_text,
               pathu_name,
               subunit_name,
               thirumozhi_heading,
               thousand_id,
               thousand_anchor_no,
               global_anchor_no
        FROM   anchor_map
        ORDER  BY thousand_id, global_anchor_no
      `).all();

      return ok(res.results);
    }

    // ==========================================================
    // GET /voice/by-global?no=1234
    // Returns section_id for a given global pasuram number
    // Shape: { global_no, section_id, section_name }
    // ==========================================================
    if (path === "/voice/by-global") {

      const no = url.searchParams.get("no");
      if (!no || isNaN(Number(no))) return fail("no= param required");

      const row = await env.db.prepare(`
        SELECT p.global_no,
               p.section_id,
               s.section_name
        FROM   pasuram_master p
        LEFT JOIN section_master s ON p.section_id = s.section_id
        WHERE  p.global_no = ?
        LIMIT  1
      `).bind(Number(no)).first();

      if (!row) return fail("Pasuram not found", 404);
      return ok(row);
    }

    // ==========================================================
    // GET /voice/entity-tags
    // Returns all search tags from entity_master
    // Used for star-wise / thirunatchathra / special group search
    // Shape: [ { entity_type, entity_id, meta_value } ]
    // ==========================================================
    if (path === "/voice/entity-tags") {

      const res = await env.db.prepare(`
        SELECT entity_type,
               entity_id,
               meta_key,
               meta_value
        FROM   entity_master
        WHERE  meta_category = 'search'
          AND  search_flag   = 1
        ORDER  BY entity_type, entity_id
      `).all();

      return ok(res.results);
    }

    // ==========================================================
    // GET /voice/first-lines
    // Returns first line (munnadi) of ALL 4000 pasurams
    // Source: munnadi_pinnadi_master.line_1 — already exists
    // Used for spoken pasuram first-line search
    // Shape: [ { global_no, section_id, line_1 } ]
    // ==========================================================
    if (path === "/voice/first-lines") {

      const res = await env.db.prepare(`
        SELECT m.global_no,
               p.section_id,
               m.line_1
        FROM   munnadi_pinnadi_master m
        JOIN   pasuram_master p ON p.global_no = m.global_no
        WHERE  m.line_1 IS NOT NULL AND m.line_1 != ''
        ORDER  BY m.global_no
      `).all();

      return ok(res.results);
    }

    // ==========================================================
    // GET /voice/special-groups
    // Returns the 3 special divyadesam group keys + labels
    // Shape: [ { key, label_ta, desam_ids: [int] } ]
    // ==========================================================
    if (path === "/voice/special-groups") {

      // Fetch desam_ids for each group from divyadesam_alias_master
      // which has group membership data, falling back to known IDs
      return ok([
        {
          key:      "thirunangur",
          label_ta: "திருநாங்கூர் திவ்யதேசங்கள்",
          label_en: "Thirunangur Divya Desams (11)",
          sub:      "ஸ்ரீ திருமங்கை ஆழ்வார்"
        },
        {
          key:      "navathiruppathi",
          label_ta: "நவ திருப்பதிகள்",
          label_en: "Nava Thiruppathi (9)",
          sub:      "9 திருப்பதிகள்"
        },
        {
          key:      "irattai",
          label_ta: "இரட்டை திருப்பதிகள்",
          label_en: "Irattai Thiruppathi (2)",
          sub:      "2 இரட்டை திருப்பதிகள்"
        }
      ]);
    }

    return fail("Unknown voice route", 404);

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
}

// ── Fix 1: handleCustomRecitalEntities ───────────────────────
// Replace your existing handleCustomRecitalEntities with this:

async function handleCustomRecitalEntities(env) {
  try {
    const res = await env.db.prepare(
      `SELECT custom_id, custom_key, tamil_name
       FROM custom_recital_entity ORDER BY custom_id`
    ).all();
    return new Response(JSON.stringify(res.results || []), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

async function handleAuthRegister(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const body = await request.json();
    const { name, mobile, prefix, sect, sub_sect, googleEmail, googleId, googleName } = body;

    if (!mobile || !name) {
      return new Response(JSON.stringify({ error: "mobile and name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ── Duplicate-mobile guard ─────────────────────────────────
    // Same mobile may re-register (acts as sign-in / details update)
    // ONLY under the same sampradayam. Registering the same mobile
    // under a different sect or sub-sect is rejected.
    const existing = await env.db.prepare(
      `SELECT sect, sub_sect FROM user_master WHERE mobile = ?`
    ).bind(mobile).first();

    if (existing && existing.sect) {
      const sameSampradayam =
        (existing.sect || null) === (sect || null) &&
        (existing.sub_sect || null) === (sub_sect || null);
      if (!sameSampradayam) {
        return new Response(JSON.stringify({
          success: false,
          error: "This mobile number is already registered under a different sampradayam. Please sign in with your original selection."
        }), {
          status: 409,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    await env.db.prepare(`
      INSERT INTO user_master (mobile, name, prefix, sect, sub_sect, google_email, google_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(mobile) DO UPDATE SET
        name         = excluded.name,
        prefix       = excluded.prefix,
        sect         = excluded.sect,
        sub_sect     = excluded.sub_sect,
        google_email = excluded.google_email,
        google_id    = excluded.google_id,
        updated_at   = datetime('now')
    `).bind(
      mobile,
      name,
      prefix       || null,
      sect         || null,
      sub_sect     || null,
      googleEmail  || null,
      googleId     || null
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

async function handleVedam(request, env) {

  try {

    const { results } = await env.db.prepare(`
      SELECT
  vm.veda_id,
  vm.veda_name,
  va.audio_id,
  va.title,
  va.audio_url,
  va.duration_minutes,
  va.display_order
  FROM veda_master vm
  LEFT JOIN veda_audio_master va
  ON vm.veda_id = va.veda_id
   ORDER BY vm.veda_id,
         va.display_order
    `).all();

    return new Response(
      JSON.stringify(results),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );

  }
}

async function handleVazhiThaniyan(request, env) {

  try {

    // Sect (T = Tenkalai, V = Vadakalai) — appended to every worker call by layout.js
    const url  = new URL(request.url);
    const sect = url.searchParams.get("sect") === "V" ? "V" : "T";

    // Lineage tab: no param = main guru parampara; lineage=VMM = Vanamamalai mutt (in pattam order)
    const lineage = url.searchParams.get("lineage") === "VMM" ? "VMM" : "";

    // Script (?script=te|kn|ml|deva|iast|gu|bn) — text from text_script, made offline by
    // transliterate_db.py. Lines are keyed "parent id|line_no", acharya_master by acharya_id.
    // Tamil (no param) reads nothing extra; a line with no conversion stays Tamil.
    let sc = (url.searchParams.get("script") || "ta").toLowerCase();
    if (sc === "hi") sc = "deva";
    if (!["ta", "deva", "te", "kn", "ml", "bn", "gu", "iast"].includes(sc)) sc = "ta";
    async function scriptLines(rows, table, idKey) {
      if (sc === "ta" || !rows.length) return rows;
      // One query per table: all its converted lines in this script (a few thousand rows at most)
      const got = await env.db.prepare(
        `SELECT src_key, text FROM text_script
         WHERE src_table = ?1 AND src_col = 'line_text' AND script = ?2`
      ).bind(table, sc).all();
      const map = {};
      for (const g of (got.results || [])) map[g.src_key] = g.text;
      return rows.map(r => ({ ...r, line_text: map[r[idKey] + "|" + r.line_no] ?? r.line_text }));
    }

    // Tenkalai: acharya_id order.  Vadakalai: sort_v order (prapatti), rows without sort_v after them.
    const acharyas = await env.db.prepare(`
      SELECT
        acharya_id,
        canonical_name,
        tamil_month,
        star,
        tamil_month_v,
        star_v,
        sort_v,
        pattam_no,
        alias_name,
        see_lineage
      FROM acharya_master
      WHERE COALESCE(lineage, '') = ?2
      ORDER BY
        CASE WHEN ?2 <> '' THEN COALESCE(pattam_no, 0)
             WHEN ?1 = 'V' THEN COALESCE(sort_v, 1000000 + acharya_id)
             ELSE acharya_id END
    `).bind(sect, lineage).all();

    const thaniyan = await env.db.prepare(`
      SELECT
        m.acharya_id,
        m.thaniyan_id,
        m.title,
        l.line_no,
        l.line_text
      FROM acharya_thaniyan_master m
      JOIN acharya_thaniyan_line_master l
        ON m.thaniyan_id = l.thaniyan_id
      WHERE m.sect IS NULL OR m.sect = ?1
      ORDER BY
        m.acharya_id,
        m.thaniyan_id,
        l.line_no
    `).bind(sect).all();

    const vazhi = await env.db.prepare(`
      SELECT
        m.acharya_id,
        m.vazhi_id,
        m.title,
        l.line_no,
        l.line_text
      FROM acharya_vazhi_thirunamam_master m
      JOIN acharya_vazhi_thirunamam_line_master l
        ON m.vazhi_id = l.vazhi_id
      WHERE m.sect IS NULL OR m.sect = ?1
      ORDER BY
        m.acharya_id,
        m.vazhi_id,
        l.line_no
    `).bind(sect).all();

    const naalpattu = await env.db.prepare(`
      SELECT
        m.acharya_id,
        m.naalpattu_id,
        m.title,
        l.line_no,
        l.line_text
      FROM acharya_naalpattu_master m
      JOIN acharya_naalpattu_line_master l
        ON m.naalpattu_id = l.naalpattu_id
      WHERE m.sect IS NULL OR m.sect = ?1
      ORDER BY
        m.acharya_id,
        m.naalpattu_id,
        l.line_no
    `).bind(sect).all();

    const thongal = await env.db.prepare(`
      SELECT
        m.acharya_id,
        m.thongal_id,
        m.title,
        l.line_no,
        l.line_text
      FROM acharya_thongal_master m
      JOIN acharya_thongal_line_master l
        ON m.thongal_id = l.thongal_id
      WHERE m.sect IS NULL OR m.sect = ?1
      ORDER BY
        m.acharya_id,
        m.thongal_id,
        l.line_no
    `).bind(sect).all();

    // Group flat rows into nested { acharya_id: { id: { title, lines[] } } }
    function groupById(rows, idKey) {
      const map = {};
      rows.forEach(r => {
        if (!map[r.acharya_id]) map[r.acharya_id] = {};
        if (!map[r.acharya_id][r[idKey]])
          map[r.acharya_id][r[idKey]] = { title: r.title, lines: [] };
        map[r.acharya_id][r[idKey]].lines.push(r.line_text);
      });
      return map;
    }

    const thanMap    = groupById(await scriptLines(thaniyan.results  || [], "acharya_thaniyan_line_master",         "thaniyan_id"),  "thaniyan_id");
    const vazhiMap   = groupById(await scriptLines(vazhi.results     || [], "acharya_vazhi_thirunamam_line_master", "vazhi_id"),     "vazhi_id");
    const naalMap    = groupById(await scriptLines(naalpattu.results || [], "acharya_naalpattu_line_master",        "naalpattu_id"), "naalpattu_id");
    const thongalMap = groupById(await scriptLines(thongal.results   || [], "acharya_thongal_line_master",          "thongal_id"),   "thongal_id");

    // Names, months and stars in the chosen script
    const nameMap = {};
    if (sc !== "ta") {
      const got = await env.db.prepare(
        `SELECT src_key, src_col, text FROM text_script
         WHERE src_table = 'acharya_master' AND script = ?1`
      ).bind(sc).all();
      for (const g of (got.results || [])) nameMap[g.src_key + "|" + g.src_col] = g.text;
    }
    const nm = (a, col) => nameMap[a.acharya_id + "|" + col] ?? a[col];

    const result = (acharyas.results || []).map(a => {
      // Vadakalai thirunakshatram where it differs (tamil_month_v / star_v), else the common one
      const useV = sect === "V" && a.tamil_month_v;
      return {
        acharya_id:     a.acharya_id,
        canonical_name: nm(a, "canonical_name"),
        tamil_month:    useV ? nm(a, "tamil_month_v") : nm(a, "tamil_month"),
        star:           useV ? nm(a, "star_v")        : nm(a, "star"),
        pattam_no:      a.pattam_no,
        alias_name:     a.alias_name ? nm(a, "alias_name") : null,
        see_lineage:    a.see_lineage,
        thaniyans:      Object.values(thanMap[a.acharya_id]    || {}),
        vazhis:         Object.values(vazhiMap[a.acharya_id]   || {}),
        naalpattu:      Object.values(naalMap[a.acharya_id]    || {}),
        thongal:        Object.values(thongalMap[a.acharya_id] || {}),
      };
    })
    // An acharya with nothing for this sect is left out, so the page numbering stays continuous
    .filter(a => a.thaniyans.length || a.vazhis.length || a.naalpattu.length || a.thongal.length);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=900"
        }
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: err.message,
        stack: err.stack
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );

  }
}
// ── /voice/entity-tags — NEW ADDITION ──────────────────
// Called by voiceSearch.js to fetch all searchable entity tags
async function handleVoiceEntityTags(request, env) {
  try {
    const rows = await env.db.prepare(`
      SELECT entity_type, entity_id, meta_value as tag
      FROM entity_master
      WHERE search_flag = 1
      AND meta_category = 'search'
      ORDER BY entity_type, entity_id
    `).all();

    return new Response(JSON.stringify(rows.results || []), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

async function handleMunnadiEditor(request, env) {

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {

    // ==========================
    // LOAD
    // GET /api/munnadi-editor?global_no=2675
    // ==========================
    if (request.method === "GET") {

      const url = new URL(request.url);
      const global_no = parseInt(url.searchParams.get("global_no"));

      if (!global_no) {
        return new Response(
          JSON.stringify({ error: "global_no required" }),
          { status: 400, headers }
        );
      }

      const row = await env.db.prepare(`
        SELECT
          global_no,
          line_1,
          line_2
        FROM munnadi_pinnadi_master
        WHERE global_no = ?
      `)
      .bind(global_no)
      .first();

      return new Response(
        JSON.stringify(row || {}),
        { headers }
      );
    }

    // ==========================
    // SAVE
    // POST /api/munnadi-editor
    // ==========================
    if (request.method === "POST") {

      const body = await request.json();

      const global_no = parseInt(body.global_no);

      await env.db.prepare(`
        UPDATE munnadi_pinnadi_master
        SET
          line_1 = ?,
          line_2 = ?
        WHERE global_no = ?
      `)
      .bind(
        body.line_1 || "",
        body.line_2 || "",
        global_no
      )
      .run();

      return new Response(
        JSON.stringify({
          success: true,
          global_no: global_no
        }),
        { headers }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );

  }
  catch(err) {

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500,
        headers
      }
    );

  }

}

async function handlePasuramLineEditor(request, env) {

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {

    // =====================================
    // LOAD
    // GET /api/pasuram-line-editor?global_no=756
    // =====================================
    if (request.method === "GET") {

      const url = new URL(request.url);
      const global_no = parseInt(url.searchParams.get("global_no"));

      if (!global_no) {
        return new Response(
          JSON.stringify({ error: "global_no required" }),
          { status: 400, headers }
        );
      }

      const result = await env.db.prepare(`
        SELECT
          line_no,
          line_text,
          recital_group
        FROM pasuram_line_master
        WHERE global_no = ?
        ORDER BY line_no
      `)
      .bind(global_no)
      .all();

      return new Response(
        JSON.stringify({
          global_no,
          lines: result.results || []
        }),
        { headers }
      );

    }

    // =====================================
// SAVE
// POST /api/pasuram-line-editor
// =====================================
if (request.method === "POST") {

    const body = await request.json();

    const global_no = parseInt(body.global_no);

    if (!global_no) {
        return new Response(
            JSON.stringify({ error: "global_no required" }),
            { status: 400, headers }
        );
    }

    // Delete all existing lines for this pasuram
    await env.db.prepare(`
        DELETE FROM pasuram_line_master
        WHERE global_no = ?
    `)
    .bind(global_no)
    .run();

    // Insert all current lines
    for (const row of body.lines || []) {

        await env.db.prepare(`
            INSERT INTO pasuram_line_master
            (
                global_no,
                line_no,
                line_text,
                recital_group
            )
            VALUES (?, ?, ?, ?)
        `)
        .bind(
            global_no,
            parseInt(row.line_no),
            row.line_text || "",
            parseInt(row.recital_group) || 1
        )
        .run();

    }

    return new Response(
        JSON.stringify({
            success: true,
            global_no
        }),
        { headers }
    );

}

    return new Response(
      JSON.stringify({
        error: "Method not allowed"
      }),
      {
        status: 405,
        headers
      }
    );

  }
  catch (err) {

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500,
        headers
      }
    );

  }

}

/* =====================================================================
   SUGGEST — predictive search for arulicheyal.org
   ---------------------------------------------------------------------
   PASTE THIS INTO  worker-i18n.js  (the i18n DUPLICATE worker only).
   NEVER add it to the production worker.

   Then add ONE line to the router, next to the other /api/ routes:

       if (path === "/api/suggest") return handleSuggest(request, env);

   Endpoint:
       GET /api/suggest?q=<what the user typed>&script=ta|te|kn|ml|deva|iast|gu|bn&limit=8

   Reads only:  search_sugg_names, search_sugg_lines,
                search_entity, pasuram_line_master, text_script
   Writes:      nothing
   ===================================================================== */

const SUGG_SCRIPTS = ["ta", "te", "kn", "ml", "deva", "iast", "gu", "bn"];
const SUGG_POOL    = 150;   // candidate rows pulled from FTS before ranking

/* ---------- small helpers ---------- */

function suggCorsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60"
  };
}

function suggJson(data) {
  return new Response(JSON.stringify(data), { status: 200, headers: suggCorsHeaders() });
}

/* Remove every combining mark: Tamil/Telugu/Kannada/Malayalam/Devanagari
   vowel signs and viramas, and Latin diacritics after NFD decomposition.
   This mirrors exactly what the FTS5 unicode61 tokenizer does to the
   indexed text, so comparisons line up. */
function suggStripMarks(s) {
  try { return String(s == null ? "" : s).normalize("NFD").replace(/\p{M}/gu, ""); }
  catch (e) { return String(s == null ? "" : s); }
}

/* True when nothing Indic was typed — i.e. the reader is on a Latin
   keyboard. The range covers Devanagari through Malayalam, which is
   every script this site renders. */
function suggIsLatin(s) {
  return !/[\u0900-\u0DFF]/.test(String(s || ""));
}

/* Fold everyday Tamil romanisation into the shape the IAST rows hold
   after diacritics are stripped:
       thiruppavai -> tiruppavai
       nammazhwar  -> nammalvar
       divyadesam  -> tivyatecam
   Doubled consonants are deliberately NOT collapsed, because the IAST
   rows keep them (tiruppavai, not tirupavai). */
function suggRomanFold(s) {
  let t = suggStripMarks(s).toLowerCase();
  t = t.replace(/[^a-z0-9\s]+/g, " ");
  t = t.replace(/zh/g, "l");
  t = t.replace(/ch/g, "c").replace(/sh/g, "s");
  t = t.replace(/th/g, "t").replace(/dh/g, "t").replace(/ph/g, "p")
       .replace(/bh/g, "p").replace(/kh/g, "k").replace(/gh/g, "k");
  t = t.replace(/d/g, "t").replace(/g/g, "k").replace(/b/g, "p")
       .replace(/j/g, "c").replace(/w/g, "v").replace(/f/g, "p")
       .replace(/z/g, "c").replace(/q/g, "k").replace(/x/g, "k");
  t = t.replace(/ee/g, "i").replace(/oo/g, "u").replace(/aa/g, "a");
  return t.replace(/\s+/g, " ").trim();
}

/* Split into at most 6 words and strip characters FTS5 treats as syntax. */
function suggWords(q) {
  return String(q || "")
    .replace(/["'()*:^\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

/* Build the MATCH expression: script token AND each word, last one a prefix. */
function suggMatchExpr(scriptToken, words) {
  const parts = words.map(function (w, i) {
    return '"' + w + '"' + (i === words.length - 1 ? "*" : "");
  });
  return '"' + scriptToken + '" AND ' + parts.join(" AND ");
}

function suggEscapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Rank a candidate against what was actually typed.

   FTS5 strips the vowel signs, so it cannot tell a correctly spelled
   match from a near miss — that judgement happens here, against the
   real text with all its marks intact.

     starts with, exactly ...................... 100
     word inside starts with, exactly ...........  80
     appears anywhere, exactly ..................  55
     starts with, ignoring vowel signs ..........  40
     word inside starts with, ignoring signs ....  30
     appears anywhere, ignoring signs ...........  15

   Canonical names outrank aliases; shorter text edges out longer,
   so "திருப்பாவை" sits above a line that happens to contain it. */
function suggScore(rowText, cmp, kind) {
  const t = String(rowText || "");

  // The row has to be reduced the same way the query was, or the tiers
  // cannot tell good spelling from bad.
  //   Indic typing : exact keeps the vowel signs, loose drops them
  //   Roman typing : exact drops the IAST diacritics, loose also folds
  //                  th/dh/zh/g/b and friends
  const tExact = cmp.latin ? suggStripMarks(t).toLowerCase() : t.toLowerCase();
  const tLoose = cmp.latin ? suggRomanFold(t) : suggStripMarks(t).toLowerCase();

  const qe = cmp.exact;
  const ql = cmp.loose;

  let s = -1;
  if      (qe && tExact.startsWith(qe))                                 s = 100;
  else if (qe && new RegExp("(^|\\s)" + suggEscapeRe(qe)).test(tExact)) s = 80;
  else if (qe && tExact.indexOf(qe) !== -1)                             s = 55;
  else if (ql && tLoose.startsWith(ql))                                 s = 40;
  else if (ql && new RegExp("(^|\\s)" + suggEscapeRe(ql)).test(tLoose)) s = 30;
  else if (ql && tLoose.indexOf(ql) !== -1)                             s = 15;

  // A single typed word that appears nowhere in this row is FTS noise from
  // the stripped-mark index — drop it. Multi-word queries are left alone,
  // because FTS matches their words anywhere in the text while the check
  // above looks for the phrase, so a real hit can legitimately score zero.
  if (s < 0) return cmp.single ? -1 : 0;

  if      (kind === "name")  s += 12;
  else if (kind === "alias") s += 6;

  s -= Math.min(10, t.length * 0.05);
  return s;
}

/* ---------- main handler ---------- */

async function handleSuggest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: suggCorsHeaders() });
  }

  const url  = new URL(request.url);
  const qRaw = (url.searchParams.get("q") || "").trim();

  let script = (url.searchParams.get("script") || "").trim().toLowerCase();
  if (SUGG_SCRIPTS.indexOf(script) === -1) script = "ta";

  let limit = parseInt(url.searchParams.get("limit") || "8", 10);
  if (!isFinite(limit) || limit < 1) limit = 8;
  if (limit > 20) limit = 20;

  const qBare = suggStripMarks(qRaw).toLowerCase().replace(/\s+/g, " ").trim();

  // Stripping the vowel signs collapses short queries onto a huge part of
  // the corpus, so nothing is returned below three base letters.
  if (qBare.replace(/\s/g, "").length < 3) {
    return suggJson({ script: script, q: qRaw, results: [] });
  }

  const latin     = suggIsLatin(qRaw);
  const searchTok = latin ? "zziast" : "zz" + script;
  const words     = latin ? suggWords(suggRomanFold(qRaw)) : suggWords(qRaw);

  if (!words.length) {
    return suggJson({ script: script, q: qRaw, results: [] });
  }

  const matchExpr = suggMatchExpr(searchTok, words);
  const cmp = {
    latin: latin,
    single: words.length === 1,
    exact: latin ? suggStripMarks(qRaw).toLowerCase() : qRaw.toLowerCase(),
    loose: latin ? suggRomanFold(qRaw) : qBare
  };

  let picked = [];

  /* --- names and aliases first: small table, and this is what people
         usually mean when they type two or three letters --- */
  try {
    const r = await env.db.prepare(
      "SELECT txt, etype, eid, kind FROM search_sugg_names " +
      "WHERE search_sugg_names MATCH ? LIMIT " + SUGG_POOL
    ).bind(matchExpr).all();

    const rows = (r && r.results) || [];
    const best = new Map();

    // One entity can carry several aliases; keep only its strongest hit.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = row.etype + "|" + row.eid;
      const sc  = suggScore(row.txt, cmp, row.kind);
      if (sc < 0) continue;
      const prev = best.get(key);
      if (!prev || sc > prev.score) {
        best.set(key, {
          kind:  "entity",
          etype: row.etype,
          eid:   row.eid,
          txt:   row.txt,
          via:   row.kind,
          score: sc
        });
      }
    }

    picked = Array.from(best.values());
    picked.sort(function (a, b) { return b.score - a.score; });
    picked = picked.slice(0, limit);
  } catch (e) {
    picked = [];
  }

  /* --- top up from pasuram lines only if names left room --- */
  if (picked.length < limit) {
    try {
      const r2 = await env.db.prepare(
        "SELECT txt, gno, lno FROM search_sugg_lines " +
        "WHERE search_sugg_lines MATCH ? LIMIT " + SUGG_POOL
      ).bind(matchExpr).all();

      const rows2 = ((r2 && r2.results) || []).map(function (row) {
        return {
          kind:  "line",
          gno:   row.gno,
          lno:   row.lno,
          txt:   row.txt,
          score: suggScore(row.txt, cmp, "line")
        };
      });

      const kept = rows2.filter(function (r) { return r.score >= 0; });
      kept.sort(function (a, b) { return b.score - a.score; });

      const seenLine = new Set();
      for (let i = 0; i < kept.length && picked.length < limit; i++) {
        const key = String(kept[i].txt);
        if (seenLine.has(key)) continue;
        seenLine.add(key);
        picked.push(kept[i]);
      }
    } catch (e) { /* lines are a bonus; names alone are still a valid answer */ }
  }

  /* --- typed in Roman but reading in another script: swap the labels --- */
  if (latin && script !== "iast") {
    try { await suggLocalise(env, script, picked, "txt"); } catch (e) {}
  }

  /* --- every result also carries its Tamil name, which is what the page
         hands to the existing voiceSearch resolver when it needs to work
         out where a tap should land --- */
  /* That name is a lookup key, so it keeps the stored canonical name even
     where the label shown is a friendlier Tamil alias (a region reads
     சோழநாடு, but the resolver knows it as chola_nadu_divyadesam). */
  if (script === "ta") {
    try { await suggLocalise(env, "ta", picked, "ta", true); } catch (e) {}
    for (let i = 0; i < picked.length; i++) if (!picked[i].ta) picked[i].ta = picked[i].txt;
  } else {
    try { await suggLocalise(env, "ta", picked, "ta", true); } catch (e) {}
  }

  /* Source text carries stray whitespace here and there, and two different
     entities can share an identical label once localised — a dropdown
     showing the same words twice just looks broken. Keep the stronger. */
  const finalSeen = new Set();
  const results = [];
  for (let i = 0; i < picked.length; i++) {
    const it = picked[i];
    delete it._done;
    it.txt = String(it.txt || "").replace(/\s+/g, " ").trim();
    it.ta  = String(it.ta  || "").replace(/\s+/g, " ").trim() || it.txt;
    if (!it.txt || finalSeen.has(it.txt)) continue;
    finalSeen.add(it.txt);
    results.push(it);
  }

  return suggJson({ script: script, q: qRaw, results: results });
}

/* Replace the IAST display text with the reader's own script.
   Tamil comes straight from the source tables (text_script holds only
   the five converted scripts, never Tamil). */
async function suggLocalise(env, script, items, field, asKey) {
  const ents  = items.filter(function (i) { return i.kind === "entity"; });
  const lines = items.filter(function (i) { return i.kind === "line"; });

  if (ents.length) {
    const cond  = ents.map(function () { return "(se.entity_type = ? AND se.entity_id = ?)"; }).join(" OR ");
    const binds = [];
    for (let i = 0; i < ents.length; i++) { binds.push(ents[i].etype, ents[i].eid); }

    /* A canonical name with no Tamil in it is an internal key (the regions
       are chola_nadu_divyadesam ...), not something to show a reader. For a
       label those are left to the alias fallback below, which finds a Tamil
       alias; asKey (the name handed to the resolver) keeps the key itself. */
    const tamilOnly = asKey ? "" : " AND se.canonical_name GLOB '*[\u0b80-\u0bff]*'";
    const sql = (script === "ta")
      ? "SELECT se.entity_type AS et, se.entity_id AS ei, se.canonical_name AS txt " +
        "FROM search_entity se WHERE (" + cond + ")" + tamilOnly
      : "SELECT se.entity_type AS et, se.entity_id AS ei, ts.text AS txt " +
        "FROM search_entity se " +
        "JOIN text_script ts ON ts.src_table = 'search_entity' " +
        " AND ts.src_col = 'canonical_name' " +
        " AND ts.src_key = CAST(se.rowid AS TEXT) AND ts.script = ? " +
        "WHERE " + cond;

    const args = (script === "ta") ? binds : [script].concat(binds);
    const r = await env.db.prepare(sql).bind(...args).all();

    const map = new Map();
    const rows = (r && r.results) || [];
    for (let i = 0; i < rows.length; i++) map.set(rows[i].et + "|" + rows[i].ei, rows[i].txt);
    for (let i = 0; i < ents.length; i++) {
      const t = map.get(ents[i].etype + "|" + ents[i].eid);
      if (t) { ents[i][field] = t; ents[i]._done = true; }
    }

    /* Some entity types (pasuram, for one) live only in search_alias and
       have no canonical row in search_entity, so nothing was found above.
       Fall back to that entity's first alias in the reader's script. */
    const left = ents.filter(function (e) { return !e._done; });
    for (let i = 0; i < ents.length; i++) delete ents[i]._done;
    if (left.length) {
      const cond2  = left.map(function () { return "(sa.entity_type = ? AND sa.entity_id = ?)"; }).join(" OR ");
      const binds2 = [];
      for (let i = 0; i < left.length; i++) { binds2.push(left[i].etype, left[i].eid); }

      const sql2 = (script === "ta")
        ? "SELECT sa.entity_type AS et, sa.entity_id AS ei, sa.alias AS txt, MIN(sa.rowid) AS r " +
          "FROM search_alias sa WHERE (" + cond2 + ")" +
          (asKey ? " " : " AND sa.alias GLOB '*[\u0b80-\u0bff]*' ") +
          "GROUP BY sa.entity_type, sa.entity_id"
        : "SELECT sa.entity_type AS et, sa.entity_id AS ei, ts.text AS txt, MIN(sa.rowid) AS r " +
          "FROM search_alias sa " +
          "JOIN text_script ts ON ts.src_table = 'search_alias' " +
          " AND ts.src_col = 'alias' " +
          " AND ts.src_key = CAST(sa.rowid AS TEXT) AND ts.script = ? " +
          "WHERE " + cond2 + " GROUP BY sa.entity_type, sa.entity_id";

      const args2 = (script === "ta") ? binds2 : [script].concat(binds2);
      const r2 = await env.db.prepare(sql2).bind(...args2).all();

      const map2 = new Map();
      const rows2 = (r2 && r2.results) || [];
      for (let i = 0; i < rows2.length; i++) map2.set(rows2[i].et + "|" + rows2[i].ei, rows2[i].txt);
      for (let i = 0; i < left.length; i++) {
        const t = map2.get(left[i].etype + "|" + left[i].eid);
        if (t) left[i][field] = t;
      }
    }
  }

  if (lines.length) {
    const cond  = lines.map(function () { return "(pl.global_no = ? AND pl.line_no = ?)"; }).join(" OR ");
    const binds = [];
    for (let i = 0; i < lines.length; i++) { binds.push(lines[i].gno, lines[i].lno); }

    const sql = (script === "ta")
      ? "SELECT pl.global_no AS g, pl.line_no AS l, pl.line_text AS txt " +
        "FROM pasuram_line_master pl WHERE " + cond
      : "SELECT pl.global_no AS g, pl.line_no AS l, ts.text AS txt " +
        "FROM pasuram_line_master pl " +
        "JOIN text_script ts ON ts.src_table = 'pasuram_line_master' " +
        " AND ts.src_col = 'line_text' " +
        " AND ts.src_key = CAST(pl.id AS TEXT) AND ts.script = ? " +
        "WHERE " + cond;

    const args = (script === "ta") ? binds : [script].concat(binds);
    const r = await env.db.prepare(sql).bind(...args).all();

    const map = new Map();
    const rows = (r && r.results) || [];
    for (let i = 0; i < rows.length; i++) map.set(rows[i].g + "|" + rows[i].l, rows[i].txt);
    for (let i = 0; i < lines.length; i++) {
      const t = map.get(lines[i].gno + "|" + lines[i].lno);
      if (t) lines[i][field] = t;
    }
  }
}

/* =====================================================================
   puzzleValidator.js — proves a mix puzzle has exactly one solution
   ---------------------------------------------------------------------
   The rule is NOT "each tile may belong to only one group". That is far
   stricter than the game needs, and it throws away the tempting tiles
   that make the puzzle worth playing — a verse that appeals to several
   divyadesams, a sthalam that is also a desam.

   The rule is: the sixteen tiles must admit exactly ONE way of splitting
   into four groups of four, where a group is any four tiles sharing at
   least one fact.

   Facts are strings like "author:6", "section:14", "desam:1",
   "region:chola_nadu", "prosody:12", "star:22", "pasuram:300".
   A tile carries every fact that is true of it.
   ===================================================================== */

/* Every 4-tile subset whose members share at least one fact.
   C(16,4) = 1820, so this is exhaustive and instant. */
function candidateGroups(tiles) {
  const n = tiles.length, out = [];
  for (let a = 0; a < n - 3; a++)
    for (let b = a + 1; b < n - 2; b++)
      for (let c = b + 1; c < n - 1; c++)
        for (let d = c + 1; d < n; d++) {
          const shared = intersect4(tiles[a].facts, tiles[b].facts, tiles[c].facts, tiles[d].facts);
          if (shared.length) out.push({ idx: [a, b, c, d], shared: shared });
        }
  return out;
}

function intersect4(A, B, C, D) {
  const sb = new Set(B), sc = new Set(C), sd = new Set(D);
  return A.filter(f => sb.has(f) && sc.has(f) && sd.has(f));
}

/* Exact cover: every way to tile all 16 with four candidate groups.
   Always extends from the lowest uncovered tile, so each partition is
   generated once and the search stays small. */
function allPartitions(tiles, cands, limit) {
  const n = tiles.length;
  const byLowest = new Map();
  for (const g of cands) {
    const k = g.idx[0];
    if (!byLowest.has(k)) byLowest.set(k, []);
    byLowest.get(k).push(g);
  }

  const found = [];
  const used = new Array(n).fill(false);
  const stack = [];

  function firstFree() { for (let i = 0; i < n; i++) if (!used[i]) return i; return -1; }

  function walk() {
    if (found.length >= (limit || 50)) return;
    const f = firstFree();
    if (f === -1) { found.push(stack.map(g => ({ idx: g.idx.slice(), shared: g.shared.slice() }))); return; }
    const opts = byLowest.get(f) || [];
    for (const g of opts) {
      if (g.idx.some(i => used[i])) continue;
      g.idx.forEach(i => { used[i] = true; });
      stack.push(g);
      walk();
      stack.pop();
      g.idx.forEach(i => { used[i] = false; });
      if (found.length >= (limit || 50)) return;
    }
  }

  walk();
  return found;
}

/* The verdict. sound === true means exactly one solution exists. */
function validate(tiles) {
  const cands = candidateGroups(tiles);
  const parts = allPartitions(tiles, cands, 20);
  return {
    tiles: tiles.length,
    candidateGroups: cands.length,
    solutions: parts.length,
    sound: parts.length === 1,
    partitions: parts.map(p => p.map(g => ({
      by: g.shared[0],
      also: g.shared.slice(1),
      members: g.idx.map(i => tiles[i].text)
    })))
  };
}

/* =====================================================================
   puzzleGenerator.js — builds a candidate "mix" board and proves it
   ---------------------------------------------------------------------
   PASTE INTO worker-i18n.js (the i18n duplicate only), BELOW the
   validator block. Drop any module.exports line.

   Route:
       if (url.pathname.includes("/api/puzzle/try")) {
         return handlePuzzleTry(request, env);
       }

       GET /api/puzzle/try?seed=2026-09-22&tries=40

   Generates candidate boards until one proves unique, and returns it
   with the rejected attempts and the reason each was thrown out.
   Reads only. Writes nothing. Stores nothing yet.

   Tiles are returned as ids plus their Tamil text. Rendering into the
   reader's script happens later, at serve time, from text_script — the
   stored puzzle will never hold text.
   ===================================================================== */

/* Which bodies of work a verse may be drawn from. B is the four thousand
   itself; T the works that follow it; V the Desika prabandham, within
   which sections 52 and 53 are the VM pair. A section is picked first and
   a verse inside it second, so every work gets its turn rather than
   Thiruvaimozhi's eleven hundred verses swamping the shorter ones. To
   weight by size instead, pick gno across the whole range at once. */
const PZ_SECTS = ["B", "T", "V"];
const PZ_MIN_INTEREST = 8;   // fewest near-miss groupings a board may have
const PZ_REGIONS  = ["chola_nadu_divyadesam", "thondai_nadu_divyadesam",
                     "pandiya_nadu_divyadesam", "malai_nadu_divyadesam",
                     "vada_nadu_divyadesam"];   // the five with 4+ desams

/* Deterministic PRNG, so a given date always yields the same puzzle
   and a regenerated day is identical rather than merely similar. */
function pzRand(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  let x = h || 123456789;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}
function pzPick(rnd, arr)  { return arr[Math.floor(rnd() * arr.length)]; }
function pzSome(rnd, arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a.slice(0, n);
}
function pzRows(r) { return (r && r.results) || []; }

/* ── ithara prabandhams ───────────────────────────────────────────────
   Option A, agreed with Seechu (14 Nov 2026): one board for everyone, and
   on an ithara day exactly one of the four groups comes from the works
   that follow the four thousand. T (the Thenkalai works) and V (the Desika
   prabandham) take turns evenly, whatever their size, so neither
   sampradayam's works crowd out the other's. On every other day the board
   is drawn from the four thousand alone.

   The day's plan comes from the date, not from the attempt, so every
   retry on a day looks for a sound board of the same kind. Two forms:
     verse — four lines of one ithara verse (the pasuram group)
     work  — four lines from four verses of one ithara work (in place of
             the thaniyan group)
   ──────────────────────────────────────────────────────────────────── */
const PZ_ITHARA_SHARE = 0.5;          // share of days that carry one ithara group
const PZ_ITHARA_SECTS = ["T", "V"];
/* Boards before this date stay exactly as they were first served, so a
   reader's saved progress and the archive ticks still match their board. */
const PZ_ITHARA_FROM  = "2026-11-15";

function pzDayPlan(seed) {
  if (String(seed) < PZ_ITHARA_FROM) return { ithara: false, legacy: true };
  const r = pzRand(seed + "#plan");
  const ithara = r() < PZ_ITHARA_SHARE;
  const sect = pzPick(r, PZ_ITHARA_SECTS);
  const form = r() < 0.5 ? "verse" : "work";
  return ithara ? { ithara: true, sect: sect, form: form } : { ithara: false };
}

/* ── facts ────────────────────────────────────────────────────────────
   Every fact the database knows about a verse. One query, left joins
   only: D1 caps the number of terms in a compound SELECT well below
   standard SQLite, so unions are avoided throughout.
   ──────────────────────────────────────────────────────────────────── */
async function pzVerseFacts(env, gnos) {
  const facts = new Map();
  if (!gnos.length) return facts;
  const marks = gnos.map(() => "?").join(",");

  const r = await env.db.prepare(
    "SELECT pl.global_no AS g, s.section_id AS sec, s.thousand_id AS th, " +
    "       pa.author_id AS au, m.divyadesam_id AS dd, d.traditional_region AS rg, " +
    "       p.prosody_id AS pr " +
    "FROM (SELECT DISTINCT global_no FROM pasuram_line_master WHERE global_no IN (" + marks + ")) pl " +
    "LEFT JOIN section_master        s  ON pl.global_no BETWEEN s.global_no_start AND s.global_no_end " +
    "LEFT JOIN pasuram_author_map    pa ON pa.global_no = pl.global_no " +
    "LEFT JOIN pasuram_divyadesam_map m ON m.global_no = pl.global_no " +
    "LEFT JOIN divyadesam_master     d  ON d.divyadesam_id = m.divyadesam_id " +
    "LEFT JOIN prosody_scope_map     p  ON pl.global_no BETWEEN p.start_global_no AND p.end_global_no"
  ).bind(...gnos).all();

  const authors = new Map();          // to catch a verse claimed by two authors
  for (const row of pzRows(r)) {
    if (!facts.has(row.g)) facts.set(row.g, new Set(["pasuram:" + row.g]));
    const f = facts.get(row.g);
    if (row.sec != null) f.add("section:"  + row.sec);
    if (row.th  != null) f.add("thousand:" + row.th);
    if (row.au  != null) {
      f.add("author:" + row.au);
      if (!authors.has(row.g)) authors.set(row.g, new Set());
      authors.get(row.g).add(row.au);
    }
    if (row.dd != null) f.add("desam:"   + row.dd);
    if (row.rg != null) f.add("region:"  + row.rg);
    if (row.pr != null) f.add("prosody:" + row.pr);
  }

  // A pasuram cannot have two authors. If the data says otherwise, the
  // verse is unusable — we refuse to publish a claim we cannot trust.
  for (const [g, set] of authors) if (set.size > 1) facts.delete(g);

  return facts;
}

/* A line may only be a tile if its text appears exactly once in the
   corpus. Refrains such as ஏலோர் எம்பாவாய் close thirty verses and
   belong to no single pasuram. */
async function pzUniqueLines(env, texts) {
  const keep = new Set();
  if (!texts.length) return keep;
  const marks = texts.map(() => "?").join(",");
  const r = await env.db.prepare(
    "SELECT line_text AS t, COUNT(*) AS n FROM pasuram_line_master " +
    "WHERE line_text IN (" + marks + ") GROUP BY line_text"
  ).bind(...texts).all();
  for (const row of pzRows(r)) if (row.n === 1) keep.add(row.t);
  return keep;
}

/* A thaniyan almost always names the work it introduces, which hands the
   solver that group for free — "\u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0bbf\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0ba4\u0bcd\u0ba4\u0bc1 \u0b93\u0bb0\u0b9f\u0bbf\u0b95\u0bb1\u0bcd\u0bb1\u0bbf\u0bb0\u0bc0\u0bb0\u0bcd" under a group
   answering to \u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0bbf\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bae\u0bcd. Comparison is on base letters with the vowel
   signs stripped, so inflected forms are caught too. */
function pzBase(t) {
  try { return String(t || "").normalize("NFD").replace(/\p{M}/gu, ""); }
  catch (e) { return String(t || ""); }
}
function pzNamesItsWork(lineText, sectionName) {
  const ln = pzBase(lineText).replace(/\s+/g, "");
  const sn = pzBase(sectionName).replace(/\s+/g, "");
  if (sn.length < 5) return false;
  for (let i = 0; i + 5 <= sn.length; i++)
    if (ln.indexOf(sn.substr(i, 5)) !== -1) return true;
  return false;
}

/* ── group templates ─────────────────────────────────────────────── */

/* Four lines of one verse, from anywhere in PZ_SECTS. A Periyazhwar
   Thirumozhi pasuram runs to eight lines, so four are shown and four stay
   hidden; a venba has exactly four and all of them appear. */
async function pzGroupOnePasuram(env, rnd, sects) {
  sects = sects && sects.length ? sects : PZ_SECTS;
  const pr = await env.db.prepare(
    "SELECT section_id AS sid, global_no_start AS a, global_no_end AS b " +
    "FROM section_master " +
    "WHERE sect IN (" + sects.map(() => "?").join(",") + ") " +
    "  AND global_no_end >= global_no_start"
  ).bind(...sects).all();
  const pool = pzRows(pr);
  if (!pool.length) return null;

  /* More attempts than before: a section's numbering can be sparse, so a
     pick inside its range may land on no verse at all. A miss is cheap. */
  for (let attempt = 0; attempt < 20; attempt++) {
    const sec = pzPick(rnd, pool);
    const gno = sec.a + Math.floor(rnd() * (sec.b - sec.a + 1));
    const r = await env.db.prepare(
      "SELECT line_no, line_text FROM pasuram_line_master WHERE global_no = ? ORDER BY line_no"
    ).bind(gno).all();
    const lines = pzRows(r);
    if (lines.length < 4) continue;

    const chosen = pzSome(rnd, lines, 4);
    const uniq = await pzUniqueLines(env, chosen.map(l => l.line_text));
    if (chosen.some(l => !uniq.has(l.line_text))) continue;

    /* Where the verse sits, for the reveal. During play a tile says
       nothing about its origin — that would hand the group over. Once the
       group is solved the opposite is true: "Lines of one pasuram" leaves
       the reader with four lines and no way to go and find them.

       pasuram_master carries thirumozhi_id and pathu_id outright, so this
       is a join rather than a hunt through ranges. Everything found is
       passed to the page, which decides what to show for which section —
       wording can then change without redeploying the worker. */
    const cr = await env.db.prepare(
      "SELECT p.section_id AS sid, p.local_pasuram_no AS lno, " +
      "       IFNULL(p.is_annex,0) AS annex, " +
      "       s.section_name AS sname, " +
      "       th.thirumozhi_no AS tno, th.thirumozhi_name AS tname, " +
      "       th.thirumozhi_heading AS thead, " +
      "       pa.pathu_no AS pno, pa.pathu_name AS pname, " +
      "       pa.sub_unit_no AS suno, pa.pathu_subunit_name AS suname " +
      "FROM pasuram_master p " +
      "LEFT JOIN section_master s    ON s.section_id = p.section_id " +
      "LEFT JOIN thirumozhi_master th ON th.thirumozhi_id = p.thirumozhi_id " +
      "LEFT JOIN pathu_master pa     ON pa.pathu_id = p.pathu_id " +
      "WHERE p.global_no = ?"
    ).bind(gno).all();
    const c = pzRows(cr)[0] || {};
    if (c.annex) continue;        /* an appendix, not a verse to send anyone to */

    return {
      axis: "pasuram:" + gno,
      label: {
        kind: "pasuram",
        gno: gno,
        sid: c.sid != null ? c.sid : null,
        sname: c.sname || null,
        lno: c.lno != null ? c.lno : null,
        pathu: c.pname ? { no: c.pno, name: c.pname,
                           suno: c.suno, suname: c.suname } : null,
        thiru: (c.thead || c.tname) ? { no: c.tno, name: c.tname,
                                        heading: c.thead } : null
      },
      tiles: chosen.map(l => ({ kind: "line", gno: gno, line_no: l.line_no, text: l.line_text }))
    };
  }
  return null;
}

/* Four divyadesams of one traditional region. */
async function pzGroupRegion(env, rnd, avoidRegions) {
  const pool = PZ_REGIONS.filter(r => !avoidRegions.has(r));
  if (!pool.length) return null;
  const region = pzPick(rnd, pool);
  const r = await env.db.prepare(
    "SELECT divyadesam_id AS id, canonical_name AS name FROM divyadesam_master " +
    "WHERE traditional_region = ? ORDER BY divyadesam_id"
  ).bind(region).all();
  const all = pzRows(r);
  if (all.length < 4) return null;
  const four = pzSome(rnd, all, 4);
  return {
    axis: "region:" + region,
    label: { kind: "region", region: region },
    tiles: four.map(d => ({ kind: "desam", id: d.id, text: d.name, region: region }))
  };
}

/* One azhwar, four kinds of evidence: birth star, avatara sthalam,
   one of their works, one of their verses. */
async function pzGroupAzhwar(env, rnd, avoidAuthors) {
  const ar = await env.db.prepare(
    "SELECT author_id AS id, canonical_name AS name, birth_star_no AS star, notes AS sthalam " +
    "FROM author_master WHERE author_type = 'azhwar' AND birth_star_no IS NOT NULL " +
    "AND notes IS NOT NULL AND notes <> ''"
  ).all();
  const azhwars = pzRows(ar).filter(x => !avoidAuthors.has(x.id));
  if (!azhwars.length) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const a = pzPick(rnd, azhwars);

    const wr = await env.db.prepare(
      "SELECT DISTINCT s.section_id AS sid, s.section_name AS name, s.thousand_id AS th " +
      "FROM section_master s JOIN pasuram_author_map pa " +
      "  ON pa.global_no BETWEEN s.global_no_start AND s.global_no_end " +
      "WHERE pa.author_id = ? AND s.sect = 'B'"
    ).bind(a.id).all();
    const works = pzRows(wr);
    if (!works.length) continue;
    const work = pzPick(rnd, works);

    // A window rather than the whole of an azhwar's output: Nammazhwar
    // alone would return over a thousand rows. The offset moves with the
    // seed, so the window is different each day rather than always the
    // opening verses.
    const off = Math.floor(rnd() * 900);
    const vr = await env.db.prepare(
      "SELECT l.global_no AS g, l.line_text AS t FROM pasuram_line_master l " +
      "JOIN pasuram_author_map pa ON pa.global_no = l.global_no " +
      "WHERE pa.author_id = ? AND l.line_no = 1 " +
      "ORDER BY l.global_no LIMIT 60 OFFSET ?"
    ).bind(a.id, off).all();
    let verses = pzRows(vr);
    if (!verses.length) {
      const vr2 = await env.db.prepare(
        "SELECT l.global_no AS g, l.line_text AS t FROM pasuram_line_master l " +
        "JOIN pasuram_author_map pa ON pa.global_no = l.global_no " +
        "WHERE pa.author_id = ? AND l.line_no = 1 ORDER BY l.global_no LIMIT 60"
      ).bind(a.id).all();
      verses = pzRows(vr2);
    }
    if (!verses.length) continue;
    const verse = pzPick(rnd, verses);

    const uniq = await pzUniqueLines(env, [verse.t]);
    if (!uniq.has(verse.t)) continue;

    // The sthalam is often a divyadesam too; if so the tile carries that
    // fact as well, which is how ஶ்ரீவில்லிபுத்தூர் gets caught when both
    // Periyazhwar and Andal are in play.
    const dr = await env.db.prepare(
      "SELECT divyadesam_id AS id, traditional_region AS rg FROM divyadesam_master " +
      "WHERE REPLACE(canonical_name, ' ', '') = REPLACE(?, ' ', '')"
    ).bind(a.sthalam).all();
    const asDesam = pzRows(dr)[0] || null;

    const sr = await env.db.prepare(
      "SELECT author_id AS id FROM author_master WHERE birth_star_no = ?"
    ).bind(a.star).all();
    const starAuthors = pzRows(sr).map(x => x.id);

    // The star tile needs its own name to be displayable. Tamil comes from
    // ui_text_master; the other scripts come from star.name.<script>.<no>
    // at serve time, so the star reads natively rather than transliterated.
    const nr = await env.db.prepare(
      "SELECT text_tamil AS t FROM ui_text_master WHERE ui_key = ?"
    ).bind("star.name." + a.star).all();
    const starName = (pzRows(nr)[0] || {}).t;
    if (!starName) continue;

    const hr = await env.db.prepare(
      "SELECT author_id AS id FROM author_master " +
      "WHERE REPLACE(notes, ' ', '') = REPLACE(?, ' ', '')"
    ).bind(a.sthalam).all();
    const sthalamAuthors = pzRows(hr).map(x => x.id);

    return {
      axis: "author:" + a.id,
      label: { kind: "author", id: a.id, name: a.name },
      tiles: [
        { kind: "star",    star_no: a.star,   authors: starAuthors, text: starName },
        { kind: "sthalam", text: a.sthalam,   authors: sthalamAuthors, desam: asDesam },
        { kind: "work",    sid: work.sid, text: work.name, author: a.id, thousand: work.th },
        { kind: "line",    gno: verse.g, line_no: 1, text: verse.t }
      ]
    };
  }
  return null;
}

/* Two lines of a work's thaniyan and two lines from the work itself. */
async function pzGroupThaniyan(env, rnd, avoidSections, avoidAuthors) {
  const sr = await env.db.prepare(
    "SELECT s.section_id AS sid, s.section_name AS name, " +
    "       s.global_no_start AS a, s.global_no_end AS b, " +
    "       (SELECT pa.author_id FROM pasuram_author_map pa " +
    "         WHERE pa.global_no = s.global_no_start) AS au " +
    "FROM section_master s WHERE s.sect = 'B' AND s.global_no_end > s.global_no_start"
  ).all();
  const sections = pzRows(sr).filter(x =>
    !avoidSections.has(x.sid) && !(x.au != null && avoidAuthors.has(x.au)));
  if (!sections.length) return null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const s = pzPick(rnd, sections);

    const tr = await env.db.prepare(
      "SELECT line_text AS t FROM thaniyan_line_master " +
      "WHERE thaniyan_ref = ? AND line_role = 'line' ORDER BY line_no"
    ).bind("section_" + s.sid).all();
    const tl = pzRows(tr).filter(x => !pzNamesItsWork(x.t, s.name));
    if (tl.length < 2) continue;
    const twoT = pzSome(rnd, tl, 2);

    const gno = s.a + Math.floor(rnd() * (s.b - s.a + 1));
    const vr = await env.db.prepare(
      "SELECT line_no, line_text FROM pasuram_line_master WHERE global_no = ? ORDER BY line_no"
    ).bind(gno).all();
    const vl = pzRows(vr);
    if (vl.length < 2) continue;
    const twoV = pzSome(rnd, vl, 2);

    const uniq = await pzUniqueLines(env, twoV.map(l => l.line_text));
    if (twoV.some(l => !uniq.has(l.line_text))) continue;

    return {
      axis: "section:" + s.sid,
      label: { kind: "section", sid: s.sid, name: s.name },
      tiles: [
        { kind: "thaniyan", sid: s.sid, text: twoT[0].t },
        { kind: "thaniyan", sid: s.sid, text: twoT[1].t },
        { kind: "line", gno: gno, line_no: twoV[0].line_no, text: twoV[0].line_text },
        { kind: "line", gno: gno, line_no: twoV[1].line_no, text: twoV[1].line_text }
      ]
    };
  }
  return null;
}

/* Four lines of one ithara work, each from a different verse: the solver
   has to know the work, not the verse. Lines that name the work are left
   out, as in the thaniyan group, and so are appendix verses. */
async function pzGroupItharaWork(env, rnd, sect) {
  const sr = await env.db.prepare(
    "SELECT section_id AS sid, section_name AS name, " +
    "       global_no_start AS a, global_no_end AS b " +
    "FROM section_master WHERE sect = ? AND global_no_end - global_no_start >= 3"
  ).bind(sect).all();
  const pool = pzRows(sr);
  if (!pool.length) return null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const s = pzPick(rnd, pool);

    /* A handful of verses rather than the whole work, so a long work costs
       no more than a short one. Numbering can be sparse, hence eight. */
    const span = s.b - s.a + 1;
    const want = Math.min(8, span);
    const picked = new Set();
    for (let k = 0; picked.size < want && k < want * 6; k++)
      picked.add(s.a + Math.floor(rnd() * span));
    const gnos = [...picked];
    const marks = gnos.map(() => "?").join(",");

    const lr = await env.db.prepare(
      "SELECT l.global_no AS g, l.line_no AS no, l.line_text AS t " +
      "FROM pasuram_line_master l " +
      "LEFT JOIN pasuram_master p ON p.global_no = l.global_no " +
      "WHERE l.global_no IN (" + marks + ") AND IFNULL(p.is_annex,0) = 0 " +
      "ORDER BY l.global_no, l.line_no"
    ).bind(...gnos).all();

    const byVerse = new Map();
    for (const row of pzRows(lr)) {
      if (pzNamesItsWork(row.t, s.name)) continue;
      if (!byVerse.has(row.g)) byVerse.set(row.g, []);
      byVerse.get(row.g).push(row);
    }
    const verses = [...byVerse.keys()];
    if (verses.length < 4) continue;

    const four = pzSome(rnd, verses, 4).map(g => pzPick(rnd, byVerse.get(g)));
    const uniq = await pzUniqueLines(env, four.map(l => l.t));
    if (four.some(l => !uniq.has(l.t))) continue;

    return {
      axis: "section:" + s.sid,
      label: { kind: "section", sid: s.sid, name: s.name },
      tiles: four.map(l => ({ kind: "line", gno: l.g, line_no: l.no, text: l.t }))
    };
  }
  return null;
}

/* ── facts for every tile kind ───────────────────────────────────── */
async function pzAttachFacts(env, tiles) {
  const gnos = [...new Set(tiles.filter(t => t.kind === "line").map(t => t.gno))];
  const vf = await pzVerseFacts(env, gnos);

  for (const t of tiles) {
    const f = new Set();
    if (t.kind === "line") {
      const got = vf.get(t.gno);
      if (!got) return null;                    // unusable verse — abandon the board
      for (const x of got) f.add(x);
    } else if (t.kind === "desam") {
      f.add("desam:" + t.id);
      f.add("region:" + t.region);
    } else if (t.kind === "star") {
      f.add("star:" + t.star_no);
      for (const a of t.authors) f.add("author:" + a);
    } else if (t.kind === "sthalam") {
      for (const a of t.authors) f.add("author:" + a);
      if (t.desam) { f.add("desam:" + t.desam.id); f.add("region:" + t.desam.rg); }
    } else if (t.kind === "work") {
      f.add("section:" + t.sid);
      f.add("author:" + t.author);
      f.add("thousand:" + t.thousand);
    } else if (t.kind === "thaniyan") {
      f.add("section:" + t.sid);
    }
    t.facts = [...f];
  }
  return tiles;
}

/* ── build and prove ─────────────────────────────────────────────── */
async function pzBuildBoard(env, rnd, plan) {
  plan = plan || { ithara: false };
  /* Groups are drawn in an order that lets each one exclude what the
     earlier ones already used. Two groups sharing a spare axis — the
     same author, the same section — is what makes tiles swappable and
     a board ambiguous, so it is cheaper to prevent than to retry. */

  /* At most one ithara group: the verse form takes the pasuram group, the
     work form the thaniyan group, and the other stays in the four thousand. */
  const g1sects = plan.legacy ? PZ_SECTS
                : plan.ithara && plan.form === "verse" ? [plan.sect] : ["B"];
  const g1 = await pzGroupOnePasuram(env, rnd, g1sects);
  if (!g1) return { ok: false, why: "no pasuram group" };

  const f1 = await pzVerseFacts(env, [g1.tiles[0].gno]);
  const s1 = f1.get(g1.tiles[0].gno);
  if (!s1) return { ok: false, why: "pasuram had no usable facts" };

  const badAuthors  = new Set();
  const badSections = new Set();
  const badRegions  = new Set();
  for (const f of s1) {
    if (f.startsWith("author:"))  badAuthors.add(Number(f.slice(7)));
    if (f.startsWith("section:")) badSections.add(Number(f.slice(8)));
    if (f.startsWith("region:"))  badRegions.add(f.slice(7));
  }

  const g3 = await pzGroupAzhwar(env, rnd, badAuthors);
  if (!g3) return { ok: false, why: "no azhwar group" };
  const azhwarId = Number(g3.axis.slice(7));
  badAuthors.add(azhwarId);

  /* Block every section the azhwar group reaches into — the work it names
     and the section its verse sits in. Excluding his author id is not
     enough: his verse belongs to one of his works, and if that work is
     also the thaniyan group, the two verse tiles trade places. */
  for (const t of g3.tiles) if (t.kind === "work") badSections.add(t.sid);
  const g3lines = g3.tiles.filter(t => t.kind === "line").map(t => t.gno);
  const f3 = await pzVerseFacts(env, [...new Set(g3lines)]);
  for (const set of f3.values())
    for (const f of set) if (f.startsWith("section:")) badSections.add(Number(f.slice(8)));

  let g4;
  if (plan.ithara && plan.form === "work") {
    g4 = await pzGroupItharaWork(env, rnd, plan.sect);
    if (!g4) return { ok: false, why: "no ithara work group" };
  } else {
    g4 = await pzGroupThaniyan(env, rnd, badSections, badAuthors);
    if (!g4) return { ok: false, why: "no thaniyan group" };
  }

  // The region group avoids anywhere the other three already point:
  // the azhwar's sthalam, and any desam their verses are sung at.
  const sth = g3.tiles.find(t => t.kind === "sthalam");
  if (sth && sth.desam) badRegions.add(sth.desam.rg);
  const others = [];
  for (const g of [g3, g4]) for (const t of g.tiles) if (t.kind === "line") others.push(t.gno);
  const fo = await pzVerseFacts(env, [...new Set(others)]);
  for (const set of fo.values()) for (const f of set) if (f.startsWith("region:")) badRegions.add(f.slice(7));

  const g2 = await pzGroupRegion(env, rnd, badRegions);
  if (!g2) return { ok: false, why: "no region group" };

  const groups = [g1, g2, g3, g4];
  const tiles = [];
  groups.forEach((g, gi) => g.tiles.forEach(t => { t.group = gi; tiles.push(t); }));
  if (tiles.length !== 16) return { ok: false, why: "not sixteen tiles" };

  const withFacts = await pzAttachFacts(env, tiles);
  if (!withFacts) return { ok: false, why: "a verse had no usable facts" };

  const seen = new Set();
  for (const t of tiles) {
    const k = String(t.text || "");
    if (!k || seen.has(k)) return { ok: false, why: "two tiles read the same" };
    seen.add(k);
  }

  const verdict = validate(tiles.map(t => ({ text: t.text, facts: t.facts })));
  if (!verdict.sound) {
    return { ok: false, why: verdict.solutions + " solutions", groups: groups, verdict: verdict };
  }
  /* Sound, but is it interesting? A board with no near-misses has nothing
     to tempt the solver, and temptation is the game. This is a preference,
     not a requirement — see the fallback in the handler. */
  return {
    ok: true,
    dull: verdict.candidateGroups < PZ_MIN_INTEREST,
    why: null, groups: groups, tiles: tiles, verdict: verdict
  };
}

async function handlePuzzleTry(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: suggCorsHeaders() });

  const url   = new URL(request.url);
  const seed  = url.searchParams.get("seed") || new Date().toISOString().slice(0, 10);
  let tries   = parseInt(url.searchParams.get("tries") || "40", 10);
  if (!isFinite(tries) || tries < 1) tries = 40;
  if (tries > 120) tries = 120;

  const rejected = [];
  const plan = pzDayPlan(seed);

  const got = await pzRunPlan(env, seed, tries, plan, rejected);
  if (got) return got;

  /* An ithara day that turned up no sound board at all falls back to a
     board from the four thousand, so the day still has a puzzle. Its
     attempts are numbered after the ithara ones, so the seed stays fixed. */
  if (plan.ithara) {
    const plain = await pzRunPlan(env, seed, tries, { ithara: false }, rejected, tries);
    if (plain) return plain;
  }

  return suggJson({ seed: seed, found: false, plan: plan, rejected: rejected });
}

async function pzRunPlan(env, seed, tries, plan, rejected, from) {
  from = from || 0;
  let fallback = null;
  for (let i = from; i < from + tries; i++) {
    const rnd = pzRand(seed + "#" + i);
    let board;
    try { board = await pzBuildBoard(env, rnd, plan); }
    catch (e) { rejected.push({ attempt: i, why: "error: " + (e && e.message) }); continue; }

    if (board.ok && !board.dull) return pzReply(seed, i, rejected, board, false, plan);
    if (board.ok && board.dull) {
      if (!fallback) fallback = { board: board, attempt: i };
      rejected.push({ attempt: i, why: "sound but flat \u2014 only " +
                      board.verdict.candidateGroups + " possible groupings" });
      continue;
    }

    rejected.push({
      attempt: i,
      why: board.why,
      // When a board fails on ambiguity, show the rival reading. This is
      // the log worth watching: it says what the data let a solver do.
      alternatives: board.verdict
        ? board.verdict.partitions.slice(1, 3).map(p => p.map(g => ({ by: g.by, members: g.members })))
        : undefined
    });
  }

  // Nothing lively turned up, so publish the best sound board rather than
  // nothing at all. A flat puzzle is a weak day; no puzzle is a broken one.
  if (fallback) return pzReply(seed, fallback.attempt, rejected, fallback.board, true, plan);
  return null;
}

function pzReply(seed, attempt, rejected, board, flat, plan) {
  return suggJson({
    seed: seed, attempt: attempt, flat: flat, plan: plan || { ithara: false }, rejected: rejected,
    candidateGroups: board.verdict.candidateGroups,
    groups: board.groups.map(g => ({
      axis: g.axis, label: g.label,
      tiles: g.tiles.map(t => ({ kind: t.kind, text: t.text, facts: t.facts }))
    }))
  });
}

/* =====================================================================
   thaniyanLinesHandler.js — read-only listing for the notation editor
   ---------------------------------------------------------------------
   PASTE INTO worker-i18n.js (the i18n duplicate only).

   Route — the names avoid "thaniyan" on purpose. The router matches with
   .includes(), so /api/thaniyan-lines would be caught by the existing
   /api/thaniyan route and never reach here.

       if (url.pathname.includes("/api/notation-lines")) {
         return handleNotationLines(request, env);
       }
       if (url.pathname.includes("/api/notation-refs")) {
         return handleNotationRefs(request, env);
       }

       GET /api/notation-lines
             ?ref=section_16      one thaniyan, or 'global', or omit for all
             &q=<text>            lines containing this Tamil
             &sanskrit=1          only lines carrying grantha letters
             &limit=200

   Returns each line with its Tamil and whatever conversions exist, so the
   editor can show what is currently wrong beside what it came from.

   READS ONLY. It cannot write, and the editor it serves produces SQL for
   you to run rather than saving anything itself.
   ===================================================================== */

async function handleNotationLines(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: suggCorsHeaders() });
  }

  const url = new URL(request.url);
  const ref = (url.searchParams.get("ref") || "").trim();
  const q   = (url.searchParams.get("q") || "").trim();
  const onlySanskrit = url.searchParams.get("sanskrit") === "1";

  let limit = parseInt(url.searchParams.get("limit") || "200", 10);
  if (!isFinite(limit) || limit < 1) limit = 200;
  if (limit > 600) limit = 600;

  // Applied inside the subquery, where the source table is aliased m.
  const where = ["m.line_role = 'line'"];
  const binds = [];

  if (ref) { where.push("m.thaniyan_ref = ?"); binds.push(ref); }
  if (q)   { where.push("m.line_text LIKE ?"); binds.push("%" + q + "%"); }

  // Sanskrit written in Tamil script usually carries the grantha letters,
  // which is the only signal available without reading the words. But being
  // Sanskrit is a property of the THANIYAN, not of each line: the fourth
  // line of the Thiruppalliyezhuchchi thaniyan, \u0baa\u0b95\u0bcd\u0ba4\u0bbe\u0b99\u0bcd\u0b95\u0bcd\u0bb0\u0bbf\u0bb0\u0bc7\u0ba3\u0bc1\u0bae\u0bcd
  // \u0baa\u0b95\u0bb5\u0ba8\u0bcd\u0ba4\u0bae\u0bc0\u0b9f\u0bc7, holds no grantha letter at all. Testing line by line dropped
  // it silently and left a four-line verse looking three lines long \u2014 the
  // worst kind of filter, one that hides work rather than refusing it. So
  // ask whether ANY line of the same thaniyan carries one, and return the
  // whole verse or none of it.
  if (onlySanskrit) {
    where.push(
      "EXISTS (SELECT 1 FROM thaniyan_line_master g " +
      "         WHERE g.thaniyan_ref = m.thaniyan_ref " +
      "           AND g.line_role = 'line' " +
      "           AND (g.line_text LIKE '%\u0b9c%' OR g.line_text LIKE '%\u0bb6%' " +
      "             OR g.line_text LIKE '%\u0bb7%' OR g.line_text LIKE '%\u0bb8%' " +
      "             OR g.line_text LIKE '%\u0bb9%'))");
  }

  const sql =
    "SELECT t.line_id AS id, t.thaniyan_ref AS ref, t.line_no AS no, " +
    "       t.line_text AS ta, ts.script AS sc, ts.text AS conv " +
    "FROM (SELECT m.line_id, m.thaniyan_ref, m.line_no, m.line_text " +
    "      FROM thaniyan_line_master m " +
    "      WHERE " + where.join(" AND ") +
    "      ORDER BY m.line_id LIMIT " + limit + ") t " +
    "LEFT JOIN text_script ts " +
    "  ON ts.src_table = 'thaniyan_line_master' " +
    " AND ts.src_col   = 'line_text' " +
    " AND ts.src_key   = CAST(t.line_id AS TEXT) " +
    "ORDER BY t.line_id, ts.script";

  let rows;
  try {
    const r = binds.length
      ? await env.db.prepare(sql).bind(...binds).all()
      : await env.db.prepare(sql).all();
    rows = (r && r.results) || [];
  } catch (e) {
    return suggJson({ error: String(e && e.message || e), lines: [] });
  }

  // One entry per line, with its conversions gathered underneath.
  const byId = new Map();
  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, { id: row.id, ref: row.ref, no: row.no, ta: row.ta, conv: {} });
    }
    if (row.sc) byId.get(row.id).conv[row.sc] = row.conv;
  }

  return suggJson({ count: byId.size, lines: [...byId.values()] });
}

/* The list of thaniyans, so the editor can offer a chooser rather than
   asking anyone to remember that it is spelled 'section_16'. */
async function handleNotationRefs(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: suggCorsHeaders() });
  }
  try {
    const r = await env.db.prepare(
      "SELECT tl.thaniyan_ref AS ref, COUNT(*) AS n, " +
      "       (SELECT s.section_name FROM section_master s " +
      "         WHERE 'section_' || s.section_id = tl.thaniyan_ref) AS name " +
      "FROM thaniyan_line_master tl WHERE tl.line_role = 'line' " +
      "GROUP BY tl.thaniyan_ref ORDER BY tl.thaniyan_ref"
    ).all();
    return suggJson({ refs: (r && r.results) || [] });
  } catch (e) {
    return suggJson({ error: String(e && e.message || e), refs: [] });
  }
}