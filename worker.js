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


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/voice/")) {
  return handleVoice(request, env);
}

    if (url.searchParams.get("view") === "4000") {
  return handleFullAPI(url, env);
}

    if (url.pathname.includes("/api/anchor-map")) {
  return handleAnchorMap(request, env);
}

    if (url.pathname.includes("/api/entity-search")) {
  return handleEntitySearch(request, env);
}


    if (url.pathname.includes("/api/index")) {
  return handleIndex(request, env);
}

if (url.pathname.includes("/api/thousand")) {
  return handleThousand(env);
}
if (url.pathname.includes("/api/section")) {
  return handleSection(request, env);
}
if (url.pathname.includes("/api/pasuram-display")) {
  return handlePasuramDisplay(request, env);
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
    return handleSattrumurai(id, env);
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
async function handleThousand(env) {
  try {

    const result = await env.db.prepare(`
      SELECT thousand_id as id, canonical_name as name
      FROM thousands_master
      ORDER BY sequence_no
    `).all();

    return new Response(JSON.stringify(result.results), {
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

    const result = await env.db.prepare(`
  SELECT 
    section_id as id, 
    section_name as name,
    thaniyan_display_mode   -- 🔥 ADD THIS LINE
    FROM section_master
    WHERE thousand_id = ?
    ORDER BY section_id
`).bind(thousand_id).all();

    return new Response(JSON.stringify(result.results), {
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

    const result = await env.db.prepare(`
      SELECT 
        p.global_no,
        p.local_pasuram_no,
        p.section_id,
        p.pathu_id,
        p.thirumozhi_id,
        p.double_recital,   -- ✅ ADD THIS LINE
        /* ✅ NAMES */
        s.section_name,

        pm.pathu_name,
        pm.pathu_subunit_name,
        pm.thirumozhi_heading AS pathu_thirumozhi_heading,  -- 🔥 KEY FIX

        tm.thirumozhi_name,
        tm.thirumozhi_heading,

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

    const grouped = {};

    for (const row of result.results) {

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

    /* 🟢 GLOBAL THANIYAN */
    const globalRes = await env.db.prepare(`
      SELECT 
        tm.thaniyan_id,
        tm.canonical_name,
        tm.section_id,            -- 🔥 ADD
        tl.line_no,
        tl.line_text,
        tl.line_role,
        tl.line_group,
        tl.prosody_id
      FROM thaniyan_master tm
      JOIN thaniyan_line_master tl
        ON tl.thaniyan_ref = 'global'
      WHERE tm.thaniyan_type = 'global'
      ORDER BY tm.thaniyan_id, tl.line_no
    `).all();

    /* 🟢 SECTION THANIYAN */
    const sectionRes = await env.db.prepare(`
      SELECT 
        tm.thaniyan_id,
        tm.canonical_name,
        tm.section_id,            -- 🔥 ADD
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
    `).bind("section_" + section_id, section_id).all();

    /* 🟢 PROSODY */
    const prosodyRes = await env.db.prepare(`
      SELECT prosody_id, canonical_name_tamil
      FROM prosody_master
    `).all();

    const prosodyMap = {};

    for (const row of prosodyRes.results) {
      prosodyMap[String(row.prosody_id)] = row.canonical_name_tamil;
    }

    /* 🟢 GROUP WITH TYPE */
    function group(rows, type) {
      const grouped = {};

      for (const row of rows) {

        const key = row.thaniyan_id;

        if (!grouped[key]) {
          grouped[key] = {
            title: row.canonical_name,
            lines: [],
            type: type   // 🔥 ADD (critical)
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

    /* 🟢 FINAL DATA WITH TYPE */
    const finalData = [
      ...group(globalRes.results, "global"),
      ...group(sectionRes.results, "section")
    ];

    return new Response(JSON.stringify({
      thaniyan: finalData,
      prosodyMap: prosodyMap
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

async function handlePasuramDisplay(request, env) {
  try {
    const url = new URL(request.url);
    const section_id = url.searchParams.get("section_id");

    /* 🟢 STEP 1 — FETCH DISPLAY DATA (CORRECT FILTERING) */
    const result = await env.db.prepare(`
      SELECT 
        entity_type,
        entity_id,
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

    for (const row of result.results) {

      const text = row.meta_value;
      if (!text || text.trim() === "") continue;

      /* ================= SECTION ================= */
      if (row.entity_type === "section") {
        map.section.push({
          text,
          order: row.sequence_no
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
          order: row.sequence_no
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
          order: row.sequence_no
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
          order: row.sequence_no
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

    /* 🟢 RESPONSE (WRAPPED — NO BREAKAGE) */
    return new Response(JSON.stringify({
      ...map,
      prosodyScope: prosodyScope.results,
      prosodyMaster: prosodyMaster.results,

      // ✅ NEW FIELD
      sectionClosing: sectionClosing.results || []

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
        entity_type,
        entity_id,
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

    /* 🔥 RESPONSE (EXTENDED — SAFE) */
    return new Response(JSON.stringify({
      type: "madal",
      madal_id: madal_id,
      units: units.results,
      rules: rules.results,

      /* ✅ NEW (same structure style) */
      section: displayRes.results || [],
      prosodyScope: prosodyScope.results || [],
      prosodyMaster: prosodyMaster.results || [],
      sectionClosing: sectionClosing.results || []

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
        entity_type,
        entity_id,
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

    return new Response(JSON.stringify({
      type: "kootrirukkai",
      lines: res.results,

      /* ✅ NEW */
      section: displayRes.results || [],
      prosodyScope: prosodyScope.results || [],
      prosodyMaster: prosodyMaster.results || [],
      sectionClosing: sectionClosing.results || []

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
  WHERE tm.thaniyan_type = 'global'
  ORDER BY tm.thaniyan_id, tl.line_no
`).all();

    // 🟢 STEP 2 (PUT THIS RIGHT HERE)
const globalThaniyan = groupThaniyan(globalThaniyanRes.results);

    const secRes = await env.db.prepare(`
      SELECT 
        section_id AS id,
        section_name AS name,
        thousand_id,
        thaniyan_display_mode
      FROM section_master
      ORDER BY thousand_id, section_id
    `).all();

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
        title: row.canonical_name,
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

    const result = await env.db.prepare(`
      SELECT 
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

    return new Response(JSON.stringify(result.results), {
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
    const star = url.searchParams.get("star");

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

    return new Response(JSON.stringify({
      pathus:     pathuRes.results   || [],
      sections:   secRes.results     || [],
      thirumozhi: thiruRes.results   || [],
      pasurams:   pasuramRes.results || []
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
    const hdrs     = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (!authorId) return new Response(JSON.stringify([]), { headers: hdrs });

    // ── MASTER ───────────────────────────────────────────────
    const master = await env.db.prepare(`
      SELECT recital_id, tamil_name, notes
      FROM   author_birth_recital_master
      WHERE  author_id = ?
    `).bind(authorId).first();

    if (!master) return new Response(JSON.stringify([]), { headers: hdrs });

    // ── SEQUENCE ─────────────────────────────────────────────
    const seqRes = await env.db.prepare(`
      SELECT sequence_no, entity_type, entity_id, is_dual_recital, is_optional
      FROM   author_birth_recital_sequence
      WHERE  recital_id = ?
      ORDER  BY sequence_no
    `).bind(master.recital_id).all();

    const seqRows = seqRes.results || [];

    const pasuramIds  = [...new Set(seqRows.filter(r => r.entity_type === "pasuram")           .map(r => r.entity_id))];
    const thaniyanIds = [...new Set(seqRows.filter(r => r.entity_type === "thaniyan")          .map(r => r.entity_id))];
    const sectionIds  = [...new Set(seqRows.filter(r => r.entity_type === "section")           .map(r => r.entity_id))];
    const fixedIds    = [...new Set(seqRows.filter(r => r.entity_type === "fixed_text")        .map(r => r.entity_id))];
    const vazhiIds    = [...new Set(seqRows.filter(r => r.entity_type === "vazhi")             .map(r => r.entity_id))];
    const madalIds    = [...new Set(seqRows.filter(r => r.entity_type === "madal_sattrumurai") .map(r => r.entity_id))];

    // ── PROSODY MASTER + SCOPE ───────────────────────────────
    const prosodyMasterRes = await env.db.prepare(
      `SELECT prosody_id, canonical_name_tamil FROM prosody_master`
    ).all();
    const prosodyMaster = {};
    for (const r of prosodyMasterRes.results || [])
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
        SELECT entity_type, entity_id, meta_value, sequence_no
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

      const map = { section: [], pathu: {}, thirumozhi: {}, pasuram: {} };
      for (const row of result.results || []) {
        const text = row.meta_value;
        if (!text || !text.trim()) continue;
        if (row.entity_type === "section") {
          map.section.push({ text, order: row.sequence_no });
        } else if (row.entity_type === "pathu") {
          const k = String(row.entity_id);
          if (!map.pathu[k]) map.pathu[k] = [];
          map.pathu[k].push({ text, order: row.sequence_no });
        } else if (row.entity_type === "thirumozhi") {
          const k = String(row.entity_id);
          if (!map.thirumozhi[k]) map.thirumozhi[k] = { items: [], pathu_id: t2p[k] || null };
          map.thirumozhi[k].items.push({ text, order: row.sequence_no });
        } else if (row.entity_type === "pasuram") {
          const k = String(row.entity_id);
          if (!map.pasuram[k]) map.pasuram[k] = [];
          map.pasuram[k].push({ text, order: row.sequence_no });
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

      const linesRows = await _inQuery(env, pasuramIds,
        `SELECT global_no, line_no, line_text, recital_group
         FROM pasuram_line_master WHERE global_no IN (__IN__)
         ORDER BY global_no, line_no`);

      const dispRows = await _inQuery(env, pasuramIds,
        `SELECT entity_id, meta_key, meta_value, sequence_no
         FROM entity_master
         WHERE entity_type='pasuram' AND display_flag=1 AND entity_id IN (__IN__)
         ORDER BY entity_id, sequence_no`);

      const uniqueSectionIds = [...new Set(pmRows.map(r => r.section_id))];
      const sectionEndRows   = await _inQuery(env, uniqueSectionIds,
        `SELECT section_id, global_no_end FROM section_master WHERE section_id IN (__IN__)`);
      const sectionEndMap = {};
      for (const r of sectionEndRows) sectionEndMap[r.section_id] = Number(r.global_no_end);

      const closingRows = await _inQuery(env, uniqueSectionIds,
        `SELECT section_id, closing_text FROM section_closing_master WHERE section_id IN (__IN__)`);
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
      const tmRows = await _inQuery(env, thaniyanIds,
        `SELECT thaniyan_id, canonical_name FROM thaniyan_master WHERE thaniyan_id IN (__IN__)`);

      const REF_MAP = {};
      for (const t of tmRows)
        REF_MAP[t.thaniyan_id] = t.thaniyan_id === 1 ? "global" : `section_${t.thaniyan_id - 1}`;

      const refs   = Object.values(REF_MAP);
      const tlRows = await _inQuery(env, refs,
        `SELECT thaniyan_ref, line_no, line_text, line_role, line_group, prosody_id
         FROM thaniyan_line_master WHERE thaniyan_ref IN (__IN__)
         ORDER BY thaniyan_ref, line_no`);

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
      const smRows = await _inQuery(env, sectionIds,
        `SELECT section_id, section_name, global_no_start, global_no_end
         FROM section_master WHERE section_id IN (__IN__)`);

      for (const sm of smRows) {
        const sid = sm.section_id;

        // ── Section 21: திருவெழுகூற்றிருக்கை ──
        if (sid === 21) {
          const lines  = await env.db.prepare(
            `SELECT line_no, line_text, dual_recital
             FROM thiruvezhukootrarikkai_master ORDER BY line_no`
          ).all();
          const dispMap = await buildDisplayMap(sid);
          const closing = await env.db.prepare(
            `SELECT closing_text FROM section_closing_master WHERE section_id=?`
          ).bind(sid).first();
          sectionMap[sid] = {
            section_id:   sid, display_name: sm.section_name,
            section_type: "kootrirukkai",
            display:      dispMap,
            closing_text: closing?.closing_text || "",
            lines:        lines.results || []
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
            `SELECT closing_text FROM section_closing_master WHERE section_id=?`
          ).bind(sid).first();
          sectionMap[sid] = {
            section_id:   sid, display_name: sm.section_name,
            section_type: "madal", madal_id: madalId,
            display:      dispMap,
            closing_text: closing?.closing_text || "",
            units:        units.results || [],
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
                 p.pathu_id, p.thirumozhi_id, p.double_recital,
                 pm.pathu_name, pm.pathu_subunit_name,
                 COALESCE(pm.thirumozhi_heading, tm.thirumozhi_heading) AS thirumozhi_heading,
                 tm.thirumozhi_name
          FROM pasuram_master p
          LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id
          LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
          WHERE p.section_id=? ORDER BY p.global_no
        `).bind(sid).all();

        const secPasuramIds = (pasuramsRes.results || []).map(r => r.global_no);
        let pasurams = [];

        if (secPasuramIds.length) {
          const secLinesRows = await _inQuery(env, secPasuramIds,
            `SELECT global_no, line_no, line_text, recital_group
             FROM pasuram_line_master WHERE global_no IN (__IN__)
             ORDER BY global_no, line_no`);

          const secLinesMap = {};
          for (const l of secLinesRows) {
            if (!secLinesMap[l.global_no]) secLinesMap[l.global_no] = [];
            secLinesMap[l.global_no].push({ text: l.line_text, group: l.recital_group });
          }

          pasurams = (pasuramsRes.results || []).map(p => ({
            global_no:           p.global_no,
            local_no:            p.local_pasuram_no,
            section_id:          p.section_id,
            pathu_id:            p.pathu_id,
            thirumozhi_id:       p.thirumozhi_id,
            double_recital:      p.double_recital,
            pathu_name:          p.pathu_name          || "",
            pathu_subunit_name:  p.pathu_subunit_name  || "",
            thirumozhi_heading:  p.thirumozhi_heading  || "",
            thirumozhi_name:     p.thirumozhi_name     || "",
            lines:               secLinesMap[p.global_no] || [],
            prosody:             getProsodyName(p.global_no),
            closing_text:        Number(p.global_no) === Number(sm.global_no_end)
                                   ? (closing?.closing_text || "") : ""
          }));
        }

        sectionMap[sid] = {
          section_id:   sid,
          display_name: sm.section_name || "",
          section_type: "normal",
          closing_text: closing?.closing_text || "",
          display:      dispMap,  // { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
          pasurams
        };
      }
    }

    // ── FIXED TEXT MAP ───────────────────────────────────────
    const fixedMap = {};

    if (fixedIds.length) {
      const fmRows = await _inQuery(env, fixedIds,
        `SELECT fixed_id, name FROM fixed_text_master WHERE fixed_id IN (__IN__)`);
      const flRows = await _inQuery(env, fixedIds,
        `SELECT fixed_id, line_text FROM fixed_text_line_master
         WHERE fixed_id IN (__IN__) ORDER BY fixed_id, line_no`);
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
      const vmRows = await _inQuery(env, vazhiIds,
        `SELECT v.vazhi_id, v.entity_id, a.canonical_name
         FROM vazhi_thirunamam_master v
         LEFT JOIN author_master a ON a.author_id = v.entity_id
         WHERE v.vazhi_id IN (__IN__)`);
      const vlRows = await _inQuery(env, vazhiIds,
        `SELECT vazhi_id, vazhi_group, line_text
         FROM vazhi_thirunamam_line_master WHERE vazhi_id IN (__IN__)
         ORDER BY vazhi_id, vazhi_group, line_no`);
      const vazhiLinesMap = {};
      for (const l of vlRows) {
        if (!vazhiLinesMap[l.vazhi_id]) vazhiLinesMap[l.vazhi_id] = {};
        if (!vazhiLinesMap[l.vazhi_id][l.vazhi_group])
          vazhiLinesMap[l.vazhi_id][l.vazhi_group] = [];
        vazhiLinesMap[l.vazhi_id][l.vazhi_group].push(l.line_text);
      }
      for (const vm of vmRows) {
        const rawName   = vm.canonical_name || "";
        const vazhiName = rawName.startsWith("ஸ்ரீ") ? rawName : "ஸ்ரீ " + rawName;
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
      const mmRows = await _inQuery(env, madalIds,
        `SELECT madal_sattrumurai_id, title
         FROM madal_sattrumurai_master WHERE madal_sattrumurai_id IN (__IN__)`);
      const mlRows = await _inQuery(env, madalIds,
        `SELECT madal_sattrumurai_id, line_no, line_text, is_dual_recital
         FROM madal_sattrumurai_line_master
         WHERE madal_sattrumurai_id IN (__IN__)
         ORDER BY madal_sattrumurai_id, line_no`);
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
      const allCustom = await env.db.prepare(
        `SELECT custom_id, custom_key, tamil_name FROM custom_recital_entity ORDER BY custom_id`
      ).all();

      for (const ce of allCustom.results || []) {
        if (!customSeqRows.find(r => r.entity_id === ce.custom_id)) continue;
        const sectionId = KOIL_SECTION_MAP[ce.custom_key];
        if (!sectionId) {
          customMap[ce.custom_id] = {
            custom_id: ce.custom_id, custom_key: ce.custom_key, tamil_name: ce.tamil_name,
            pasurams: [], display: { section:[], pathu:{}, thirumozhi:{}, pasuram:{} }
          };
          continue;
        }

        const sm = await env.db.prepare(
          `SELECT section_id, section_name, global_no_start, global_no_end
           FROM section_master WHERE section_id = ?`
        ).bind(sectionId).first();
        if (!sm) continue;

        const dispMap    = await buildDisplayMap(sectionId);
        const koilClose  = await env.db.prepare(
          `SELECT closing_text FROM section_closing_master WHERE section_id=?`
        ).bind(sectionId).first();

        // ── Koil pathu_ids — hardcoded from DB (exact match verified) ──
        const KOIL_PATHU_IDS = {
          "koil_thirumozhi":    [44,50,52,56,57,59,60,69,82,91,102,107,115,132,141,151],
          "koil_thiruvaimozhi": [152,153,171,174,182,191,199,211,213,215,231,241,250,251]
        };

        const koilPathuArr = KOIL_PATHU_IDS[ce.custom_key] || [];

        if (koilPathuArr.length === 0) {
          customMap[ce.custom_id] = {
            custom_id: ce.custom_id, custom_key: ce.custom_key,
            tamil_name: ce.tamil_name, display_name: sm.section_name,
            closing_text: koilClose?.closing_text || "",
            display: dispMap, pasurams: []
          };
          continue;
        }
        const pasuramsRes = { results: await _inQuery(env, koilPathuArr,
          `SELECT p.global_no, p.local_pasuram_no, p.section_id,
                  p.pathu_id, p.thirumozhi_id, p.double_recital,
                  pm.pathu_name, pm.pathu_subunit_name,
                  COALESCE(pm.thirumozhi_heading, tm.thirumozhi_heading) AS thirumozhi_heading,
                  tm.thirumozhi_name
           FROM pasuram_master p
           LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id
           LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
           WHERE p.pathu_id IN (__IN__) ORDER BY p.global_no`) };

        const secPasuramIds = (pasuramsRes.results || []).map(r => r.global_no);
        const secLinesRows  = await _inQuery(env, secPasuramIds,
          `SELECT global_no, line_no, line_text, recital_group
           FROM pasuram_line_master WHERE global_no IN (__IN__)
           ORDER BY global_no, line_no`);
        const secLinesMap = {};
        for (const l of secLinesRows) {
          if (!secLinesMap[l.global_no]) secLinesMap[l.global_no] = [];
          secLinesMap[l.global_no].push({ text: l.line_text, group: l.recital_group });
        }

        customMap[ce.custom_id] = {
          custom_id:    ce.custom_id, custom_key: ce.custom_key, tamil_name: ce.tamil_name,
          display_name: sm.section_name,
          closing_text: koilClose?.closing_text || "",
          display:      dispMap,
          pasurams: (pasuramsRes.results || []).map(p => ({
            global_no:          p.global_no, local_no: p.local_pasuram_no,
            section_id:         p.section_id, pathu_id: p.pathu_id,
            thirumozhi_id:      p.thirumozhi_id, double_recital: p.double_recital,
            pathu_name:         p.pathu_name         || "",
            pathu_subunit_name: p.pathu_subunit_name || "",
            thirumozhi_heading: p.thirumozhi_heading || "",
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
      else if (row.entity_type === "vazhi")             content = vazhiMap[row.entity_id]             || null;
      else if (row.entity_type === "madal_sattrumurai") content = madalSattrumuraiMap[row.entity_id]  || null;
      else if (row.entity_type === "custom")            content = customMap[row.entity_id]            || null;
      return {
        sequence_no: row.sequence_no, entity_type: row.entity_type,
        entity_id: row.entity_id, is_dual_recital: row.is_dual_recital,
        is_optional: row.is_optional, content
      };
    });

    return new Response(JSON.stringify({ recital: master, sequence }), { headers: hdrs });

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

  return json({ success: true, data: results });
}

// =============================================================
//  GET /api/sattrumurai/1  (or /2, /3 ...)
// =============================================================
export async function handleSattrumurai(id, env) {

  if (!id || isNaN(Number(id))) return err("Invalid sattrumurai_id");

  // ── 1. Master row ─────────────────────────────────────────
  const master = await env.db.prepare(`
    SELECT sattrumurai_id, name, tamil_name, thousand_id
    FROM   sattrumurai_master
    WHERE  sattrumurai_id = ?
  `).bind(id).first();

  if (!master) return err("Sattrumurai not found", 404);

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
      const { results: kLines } = await env.db.prepare(`
        SELECT line_no, line_text, dual_recital
        FROM   thiruvezhukootrarikkai_master
        WHERE  section_id = 21
        ORDER  BY line_no ASC
      `).all();

      pasuramMap[gno] = {
        global_no:  pm.global_no,
        section_id: pm.section_id,
        lines: kLines.map(l => ({ text: l.line_text, group: 1 })),
      };
      continue;
    }

    // Section 22: சிறியதிருமடல் (madal_id=1)
    if (pm.section_id === 22) {
      const { results: mLines } = await env.db.prepare(`
        SELECT couplet_no, line_1, line_2, line_3, line_4,
               line_5, line_6, line_7, line_8
        FROM   madal_unit_master
        WHERE  madal_id = 1
        ORDER  BY couplet_no ASC
      `).all();

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
      const { results: mLines } = await env.db.prepare(`
        SELECT couplet_no, line_1, line_2, line_3, line_4,
               line_5, line_6, line_7, line_8
        FROM   madal_unit_master
        WHERE  madal_id = 2
        ORDER  BY couplet_no ASC
      `).all();

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
    const { results: rows } = await env.db.prepare(`
      SELECT line_no, line_text, recital_group
      FROM   pasuram_line_master
      WHERE  global_no = ?
      ORDER  BY line_no ASC
    `).bind(gno).all();

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
    const fm = await env.db.prepare(`
      SELECT fixed_id, name
      FROM   fixed_text_master
      WHERE  fixed_id = ?
    `).bind(fid).first();

    if (!fm) continue;

    const { results: fLines } = await env.db.prepare(`
      SELECT line_text
      FROM   fixed_text_line_master
      WHERE  fixed_id = ?
      ORDER  BY line_no ASC
    `).bind(fid).all();

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

    const rawName  = author?.canonical_name || "";
    const vazhiName = rawName.startsWith("ஸ்ரீ") ? rawName : "ஸ்ரீ " + rawName;

    const { results: vLines } = await env.db.prepare(`
      SELECT vazhi_group, line_text
      FROM   vazhi_thirunamam_line_master
      WHERE  vazhi_id = ?
      ORDER  BY vazhi_group ASC, line_no ASC
    `).bind(vid).all();

    if (!vLines.length) continue;

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
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  // ── Sequence table ──────────────────────────────────────────
  if (sub === "sequence") {
    const res = await env.db.prepare(
      `SELECT id, seq_no, item_type, display_label, ref_type, ref_value,
              group_key, show_in_index, is_active, notes
       FROM nithyanusandhanam_sequence ORDER BY seq_no`
    ).all();
    return new Response(JSON.stringify(res.results), { headers });
  }

  // ── Fixed text (eyal saathu / sattrumuran) ──────────────────
  if (sub === "fixed") {
    const id = url.searchParams.get("id");
    const lines = await env.db.prepare(
      `SELECT line_no, line_text FROM fixed_text_line_master
       WHERE fixed_id = ? ORDER BY line_no`
    ).bind(id).all();
    return new Response(JSON.stringify({ lines: lines.results }), { headers });
  }

  // =============================================================
// ALSO FIX the vazhi sub — replace the existing loop with single JOIN:
// =============================================================

  // ── Vazhi thirunamam (FAST — single JOIN query) ─────────────────────────────
  if (sub === "vazhi") {
    const masters = await env.db.prepare(
      `SELECT v.vazhi_id, v.entity_id,
              COALESCE(a.canonical_name, 'வாழி திருநாமம்') as name
       FROM vazhi_thirunamam_master v
       LEFT JOIN author_master a ON v.entity_id = a.author_id
       ORDER BY v.vazhi_id`
    ).all();

    const allLines = await env.db.prepare(
      `SELECT vazhi_id, line_no, line_text, vazhi_group
       FROM vazhi_thirunamam_line_master
       ORDER BY vazhi_id, vazhi_group, line_no`
    ).all();

    // Group lines by vazhi_id
    const lineMap = {};
    for (const l of allLines.results) {
      if (!lineMap[l.vazhi_id]) lineMap[l.vazhi_id] = [];
      lineMap[l.vazhi_id].push(l);
    }

    const result = masters.results.map(m => ({
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
          p.double_recital,
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
        SELECT entity_type, entity_id, meta_value, sequence_no
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
  try {
    if (sub === "list")       return await ddList(env);
    if (sub === "debug-map")  {
      const did = url.searchParams.get("desam_id");
      const r = await env.db.prepare(
        `SELECT global_no FROM pasuram_divyadesam_map WHERE divyadesam_id = ? ORDER BY global_no`
      ).bind(did).all();
      const gnos = r.results.map(x => Number(x.global_no));
      return ddJson({ total: gnos.length, has2673: gnos.includes(2673), has2674: gnos.includes(2674), sample_last5: gnos.slice(-5) });
    }
    if (sub === "by-desam")   return await ddByDesam(url, env);
    if (sub === "by-desam-full") return await ddByDesamFull(url, env);
    if (sub === "by-azhwar-full") return await ddByAzhwarFull(url, env);
    if (sub === "by-azhwar")  return await ddByAzhwar(url, env);
    if (sub === "by-region")  return await ddByFilter("traditional_region", url.searchParams.get("region"), env);
    if (sub === "by-state")   return await ddByFilter("state", url.searchParams.get("state"), env);
    if (sub === "by-district") return await ddByFilter("district", url.searchParams.get("district"), env);
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
           dd.perumal_name,
           dd.thayar_name,
           dd.archana_namavalli
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
async function ddList(env) {
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
  return ddJson(dm.results.map(d => {
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
  }));
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
async function ddByFilter(field, value, env) {
  const res = await env.db.prepare(
    `SELECT dm.divyadesam_id, dm.canonical_name, dm.traditional_region,
            dm.state, dm.district, dd.perumal_name, dd.thayar_name
     FROM divyadesam_master dm
     LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
     WHERE dm.${field} = ? ORDER BY dm.divyadesam_id`
  ).bind(value).all();
  return ddJson(res.results);
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
async function ddFetchPasurams(env, globalNos) {
  if (!globalNos.length) return [];
  const ph = globalNos.map(() => "?").join(",");
  const res = await env.db.prepare(
    `SELECT p.global_no, p.local_pasuram_no, p.section_id, p.pathu_id,
            p.thirumozhi_id, p.double_recital,
            s.section_name,
            pm.pathu_name, pm.pathu_subunit_name,
            pm.thirumozhi_heading AS pathu_thiru_heading,
            tm.thirumozhi_name, tm.thirumozhi_heading,
            l.line_no, l.line_text, l.recital_group
     FROM pasuram_master p
     LEFT JOIN section_master s    ON p.section_id    = s.section_id
     LEFT JOIN pathu_master pm     ON p.pathu_id      = pm.pathu_id
     LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
     JOIN pasuram_line_master l    ON p.global_no     = l.global_no
     WHERE p.global_no IN (${ph})
     ORDER BY p.global_no, l.line_no`
  ).bind(...globalNos).all();

  const grouped = {};
  for (const row of res.results) {
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

// ── Shared: fetch per-pasuram display items ───────────────────────────────────
async function ddFetchDisplay(env, globalNos) {
  if (!globalNos.length) return {};
  const ph = globalNos.map(() => "?").join(",");
  const res = await env.db.prepare(
    `SELECT entity_id, meta_value, sequence_no FROM entity_master
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
async function ddFetchPasuramsBatched(env, globalNos) {
  if (!globalNos.length) return [];
  const CHUNK = 50;
  const all = [];
  for (let i = 0; i < globalNos.length; i += CHUNK) {
    const res = await ddFetchPasurams(env, globalNos.slice(i, i + CHUNK));
    all.push(...res);
  }
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
async function ddByDesamFull(url, env) {
  const desam_id = url.searchParams.get("desam_id");

  // 1. Desam info
  const desam = await env.db.prepare(
    `SELECT dm.*, dd.perumal_name, dd.thayar_name
     FROM divyadesam_master dm
     LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
     WHERE dm.divyadesam_id = ?`
  ).bind(desam_id).first();

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

  const normalPasurams = await ddFetchPasuramsBatched(env, normalGnos);
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
      `SELECT tm.thaniyan_id, tm.canonical_name, tl.line_no, tl.line_text,
              tl.line_role, tl.line_group, tl.prosody_id
       FROM thaniyan_master tm
       JOIN thaniyan_line_master tl ON tl.thaniyan_ref = ?
       WHERE tm.section_id = ? ORDER BY tm.thaniyan_id, tl.line_no`
    ).bind("section_" + sid, sid).all();
    const prosodyRes = await env.db.prepare(
      `SELECT prosody_id, canonical_name_tamil FROM prosody_master`
    ).all();
    const prosodyMap = {};
    for (const r of prosodyRes.results) prosodyMap[String(r.prosody_id)] = r.canonical_name_tamil;
    const grouped = {};
    for (const r of globalRes.results) {
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
      `SELECT entity_type, entity_id, meta_key, meta_value, sequence_no
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

    const dm = { section:[], pathu:{}, thirumozhi:{}, pasuram:{},
                 prosodyScope: prosodyScope.results,
                 prosodyMaster: prosodyMaster.results,
                 sectionClosing: closing.results };

    const thiruRes = await env.db.prepare(
      `SELECT thirumozhi_id, pathu_id FROM thirumozhi_master WHERE section_id=?`
    ).bind(sid).all();
    const t2p = {};
    for (const r of thiruRes.results) if (r.pathu_id) t2p[String(r.thirumozhi_id)] = String(r.pathu_id);

    for (const row of dispRes.results) {
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
async function ddByAzhwarFull(url, env) {
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
      `SELECT tm.thaniyan_id, tm.canonical_name, tl.line_no, tl.line_text,
              tl.line_role, tl.line_group, tl.prosody_id
       FROM thaniyan_master tm
       JOIN thaniyan_line_master tl ON tl.thaniyan_ref = ?
       WHERE tm.section_id = ? ORDER BY tm.thaniyan_id, tl.line_no`
    ).bind("section_" + sid, sid).all();
    const pm = await env.db.prepare(`SELECT prosody_id, canonical_name_tamil FROM prosody_master`).all();
    const prosodyMap = {};
    for (const p of pm.results) prosodyMap[String(p.prosody_id)] = p.canonical_name_tamil;
    const grouped = {};
    for (const row of r.results) {
      if (!grouped[row.thaniyan_id]) grouped[row.thaniyan_id] = { title: row.canonical_name, lines:[], type:"section" };
      grouped[row.thaniyan_id].lines.push({ line_no:row.line_no, line_text:row.line_text, line_role:row.line_role, line_group:row.line_group, prosody_id:row.prosody_id });
    }
    thaniyanMap[sid] = { thaniyan: Object.values(grouped), prosodyMap };
  }));

  // Fetch pasurams per desam
  const desams = [];
  for (const divyadesam_id of allDesamIds) {
    const desam = await env.db.prepare(
      `SELECT dm.*, dd.perumal_name, dd.thayar_name
       FROM divyadesam_master dm
       LEFT JOIN divyadesam_deity_master dd USING(divyadesam_id)
       WHERE dm.divyadesam_id = ?`
    ).bind(divyadesam_id).first();

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
    const normalPas  = await ddFetchPasuramsBatched(env, normalGnos);
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
  'Cache-Control':                'public, max-age=86400',
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
    const url   = new URL(request.url);
    const scope = url.searchParams.get('scope') || 'full';
    const part  = parseInt(url.searchParams.get('part') || '0');

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

    const sql = `
      SELECT
        m.global_no, m.line_1, m.line_2,
        p.section_id, p.double_recital,
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

    const { results } = await env.db.prepare(sql).all();

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
    if (sectionIds.length > 0) {
      const { results: smR } = await env.db.prepare(
        `SELECT section_id, thaniyan_display_mode FROM section_master WHERE section_id IN (${sectionIds.join(',')})`
      ).all();
      for (const s of smR) sectionDisplayMode[s.section_id] = s.thaniyan_display_mode;
    }

    // ── Thaniyans — thaniyan_ref stores "section_1", "section_2" etc ──
const thaniyans = {};
if (sectionIds.length > 0) {
  const sectionRefs = sectionIds.map(id => `'section_${id}'`).join(',');
  const { results: tlR } = await env.db.prepare(
     `SELECT l.thaniyan_ref, l.line_no, l.line_text, l.line_role, l.line_group, t.canonical_name
     FROM thaniyan_line_master l
     JOIN thaniyan_master t ON t.section_id = CAST(REPLACE(l.thaniyan_ref,'section_','') AS INTEGER)
     WHERE l.thaniyan_ref IN (${sectionRefs})
     ORDER BY l.thaniyan_ref, l.line_no`
  ).all();

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
          section_name:          SECTION_META[sid]?.name || '',
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
      sections.push({ ...sec, groups });
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
