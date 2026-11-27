// ── recitalWorker.js — complete clean worker ──────────────────────────────────

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
// falling back to the original Tamil for any row with no converted text.
// No-op (returns rows untouched) when no script is requested, so the
// Tamil response stays byte-identical to production.
// src_table / src_col are inlined as SQL literals, not bound — that keeps
// each chunk at 99 ids + 1 script = 100, D1's bound-parameter ceiling.
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

// Converted ui_text_master values by key. Returns {} without a script, so
// every caller falls back to its built-in Tamil.
async function uiTextMap(env, script, keys) {
  if (!script || !keys.length) return {};
  const rows = await _inQuery(env, keys,
    `SELECT src_key, text FROM text_script
     WHERE src_table='ui_text_master' AND src_col='text_tamil'
       AND script=? AND src_key IN (__IN__)`,
    [script]
  );
  const m = {};
  for (const r of rows) m[r.src_key] = r.text;
  return m;
}

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    /* Which build is actually deployed. Exists only in this duplicate, so
       hitting it also proves you are talking to the i18n worker and not
       production. */
    if (url.pathname.includes("/recital/i18n-build")) {
      return new Response(JSON.stringify({
        build: "2026-09-18-e",
        wired: ["render", "ghoshti", "ghoshti-sattrumurai", "spinner", "catalog",
                "resolve-labels", "pasuram-lookup", "pasuram-lines", "fixed-text",
                "vazhi-lines", "vazhi-list", "madal-sattrumurai"]
      }), { headers: CORS });
    }
    /* Key-format probe. The sattrumurai rebuild below keys some tables on a
       composite (fixed_id|line_no and the like); if the converter wrote those
       keys in another shape the lines quietly stay Tamil instead of breaking,
       and this is how you see which it is. ?script=te lists, per table, how
       many converted rows exist and three sample keys. */
    if (url.pathname.includes("/recital/i18n-keys")) {
      const sc = url.searchParams.get("script") || "te";
      const tables = ["pasuram_line_master", "fixed_text_line_master",
                      "vazhi_thirunamam_line_master", "madal_sattrumurai_line_master",
                      "madal_sattrumurai_master", "author_master", "ui_text_master"];
      const out = {};
      for (const t of tables) {
        const r = await env.db.prepare(
          `SELECT COUNT(*) AS n FROM text_script WHERE src_table = ? AND script = ?`
        ).bind(t, sc).first();
        const s = await env.db.prepare(
          `SELECT src_col, src_key FROM text_script WHERE src_table = ? AND script = ? LIMIT 3`
        ).bind(t, sc).all();
        out[t] = { rows: r ? r.n : 0, samples: s.results || [] };
      }
      return new Response(JSON.stringify({ script: sc, tables: out }, null, 2), { headers: CORS });
    }
    if (url.pathname.includes("/recital/stotra-catalog")) return handleStotraCatalog(request, env);
    if (url.pathname.includes("/recital/stotra-parts"))   return handleStotraParts(request, env);
    if (url.pathname.includes("/recital/catalog"))        return handleCatalog(request, env);
    if (url.pathname.includes("/recital/pasuram-lookup")) return handlePasuramLookup(request, env);
    if (url.pathname.includes("/recital/pasuram-lines"))  return handlePasuramLines(request, env);
    if (url.pathname.includes("/recital/plan"))           return handlePlan(request, env);
    if (url.pathname.includes("/recital/render"))         return handleRender(request, env);
    if (url.pathname.includes("/recital/panchangam"))      return handlePanchangam(request, env);
    if (url.pathname.includes("/recital/spinner"))        return handleSpinner(request, env);
    if (url.pathname.includes("/recital/ghoshti-sattrumurai")) return handleGhoshtiSattrumurai(request, env);
    if (url.pathname.includes("/recital/madal-sattrumurai"))    return handleMadalSattrumurai(request, env);
    if (url.pathname.includes("/recital/vazhi-list"))           return handleVazhiList(request, env);
    if (url.pathname.includes("/recital/vazhi-lines"))          return handleVazhiLines(request, env);
    if (url.pathname.includes("/recital/fixed-text"))           return handleFixedText(request, env);
    if (url.pathname.includes("/recital/ghoshti"))        return handleGhoshti(request, env);
    if (url.pathname.includes("/auth/register"))          return handleAuthRegister(request, env);
    if (url.pathname.includes("/recital/rettai"))         return handleRettai(request, env);
    if (url.pathname.includes("/recital/resolve-labels")) return handleResolveLabels(request, env);
    return new Response("Not Found", { status: 404, headers: CORS });
  }
};

const PATHU_SECTIONS      = new Set([2, 11, 26]);
const THIRUMOZHI_SECTIONS = new Set([4, 5]);

// ─────────────────────────────────────────────────────────────────────────────
// STHOTHRAM — the list for setup, the parts of a long work, and the blocks a
// plan renders. Same tables and same order as the Sthothram page
// (cdnaalayiram-api /api/stotra). Text comes from the stotra tables' own
// per-script columns, so ?script= works on both recital workers.
//   entity_type "stotra"      entity_id = stotra_id          (whole stotra / kanda / work)
//   entity_type "stotra_part" entity_id = stotra_id*1000+part (one sarga / dasakam)
// ─────────────────────────────────────────────────────────────────────────────
const STOTRA_SCRIPTS = ["ta", "deva", "te", "kn", "ml", "bn", "gu", "iast"];
function stotraScript(url) {
  let s = (url.searchParams.get("script") || "ta").toLowerCase();
  if (s === "hi") s = "deva";
  return STOTRA_SCRIPTS.includes(s) ? s : "ta";
}
// The live user_recital_item table only accepts section / pathu / thirumozhi /
// pasuram / custom / koil (a CHECK constraint). Stotra items are therefore
// stored as entity_type 'custom' with item_opt 'stotra' or 'stotra_part', and
// turned back on every read. No other plan row uses 'custom'.
const STOTRA_TYPES = ["stotra", "stotra_part"];
function itemToDb(item) {
  return STOTRA_TYPES.includes(item.entity_type)
    ? { entity_type: "custom", item_opt: item.entity_type }
    : { entity_type: item.entity_type, item_opt: item.item_opt || null };
}
function itemFromDb(row) {
  if (row && row.entity_type === "custom" && STOTRA_TYPES.includes(row.item_opt))
    return { ...row, entity_type: row.item_opt, item_opt: null };
  return row;
}

function stotraSplit(entity_type, entity_id) {
  const n = Number(entity_id);
  return entity_type === "stotra" ? { sid: n, part: null } : { sid: Math.floor(n / 1000), part: n % 1000 };
}

async function handleStotraCatalog(request, env) {
  try {
    const sc = stotraScript(new URL(request.url));
    const res = await env.db.prepare(`
      SELECT s.stotra_id,
             COALESCE(pg.group_id, g.group_id)           AS group_id,
             COALESCE(pg.group_name, g.group_name)       AS group_name,
             COALESCE(pg.display_order, g.display_order) AS group_order,
             CASE WHEN pg.group_id IS NULL THEN NULL ELSE g.group_id      END AS sub_group_id,
             CASE WHEN pg.group_id IS NULL THEN NULL ELSE g.group_name    END AS sub_group_name,
             CASE WHEN pg.group_id IS NULL THEN 0    ELSE g.display_order END AS sub_group_order,
             s.name_en,
             COALESCE(s.title_${sc}, s.title_ta) AS title,
             s.part_count, s.item_count, s.display_order, s.by_part
      FROM   stotra_master s
      LEFT JOIN stotra_group_master g  ON g.group_id  = s.group_id
      LEFT JOIN stotra_group_master pg ON pg.group_id = g.parent_group_id
      ORDER  BY group_order, sub_group_order, s.display_order
    `).all();
    return new Response(JSON.stringify({ script: sc, stotras: res.results || [] }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

async function handleStotraParts(request, env) {
  try {
    const url = new URL(request.url);
    const sc  = stotraScript(url);
    const id  = parseInt(url.searchParams.get("id"), 10);
    if (!id) return new Response(JSON.stringify({ error: "id= required" }), { status: 400, headers: CORS });
    const m = await env.db.prepare(`SELECT part_count, by_part FROM stotra_master WHERE stotra_id = ?`).bind(id).first();
    if (!m || !m.by_part) return new Response(JSON.stringify({ parts: [] }), { headers: CORS });
    const total = Math.max(1, Number(m.part_count) || 1);
    const nos = Array.from({ length: total }, (_, i) => i + 1).join(",");
    const heads = await env.db.prepare(`
      SELECT part_no, line_type, COALESCE(text_${sc}, text_ta) AS text
      FROM   stotra_line_master
      WHERE  stotra_id = ? AND part_no IN (${nos}) AND block_no = 0
      ORDER  BY part_no, line_no
    `).bind(id).all();
    const byNo = {};
    for (const r of (heads.results || [])) {
      const p = byNo[r.part_no] || (byNo[r.part_no] = { part_no: r.part_no, title: "", section: null });
      if (r.line_type === "part_title") p.title = r.text;
      else if (r.line_type === "heading") p.section = r.text;
    }
    const parts = Object.values(byNo).sort((a, b) => a.part_no - b.part_no);
    return new Response(JSON.stringify({ script: sc, parts }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// "Title" or "Title — sarga / dasakam title", in the requested script.
async function stotraLabel(env, entity_type, entity_id, sc) {
  const { sid, part } = stotraSplit(entity_type, entity_id);
  const row = await env.db.prepare(`SELECT COALESCE(title_${sc}, title_ta) AS t FROM stotra_master WHERE stotra_id = ?`).bind(sid).first();
  let label = row ? row.t : `stotra ${sid}`;
  if (part) {
    const pr = await env.db.prepare(
      `SELECT COALESCE(text_${sc}, text_ta) AS t FROM stotra_line_master
       WHERE stotra_id = ? AND part_no = ? AND block_no = 0 AND line_type = 'part_title' LIMIT 1`
    ).bind(sid, part).first();
    label += " — " + (pr ? pr.t : part);
  }
  return label;
}

// The stotra blocks of a plan, in the plan's order. Called after every
// pasuram block is placed, so they always come last.
async function stotraBlocks(env, items, sc) {
  const out = [];
  for (const it of items) {
    if (it.entity_type !== "stotra" && it.entity_type !== "stotra_part") continue;
    const { sid, part } = stotraSplit(it.entity_type, it.entity_id);
    const m = await env.db.prepare(`
      SELECT stotra_id, name_en, by_part, part_count, item_count,
             COALESCE(title_${sc}, title_ta) AS title
      FROM stotra_master WHERE stotra_id = ?`).bind(sid).first();
    if (!m) continue;
    const q = `SELECT part_no, block_no, line_no, line_type, sloka_no,
                      COALESCE(text_${sc}, text_ta) AS text
               FROM stotra_line_master WHERE stotra_id = ?`;
    const r = part
      ? await env.db.prepare(q + ` AND part_no = ? ORDER BY block_no, line_no`).bind(sid, part).all()
      : await env.db.prepare(q + ` ORDER BY part_no, block_no, line_no`).bind(sid).all();
    const lines = r.results || [];
    if (!lines.length) continue;
    const pt = part ? lines.find(l => l.line_type === "part_title") : null;
    out.push({
      block_type:  "stotra",
      stotra_id:   sid,
      part_no:     part,
      title:       m.title,
      name_en:     m.name_en,
      by_part:     m.by_part ? 1 : 0,
      part_title:  pt ? pt.text : null,
      sequence_no: it.sequence_no,
      lines
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────────────────────────────────────
async function handleCatalog(request, env) {
  const url = new URL(request.url);
  const script = url.searchParams.get("script");
  try {
    if (!url.searchParams.has("section_id") && !url.searchParams.has("pathu_id") && !url.searchParams.has("pathu_no")) {
      const [thousands, sections] = await Promise.all([
        env.db.prepare(`SELECT thousand_id, canonical_name FROM thousands_master ORDER BY sequence_no`).all(),
        env.db.prepare(`SELECT section_id, section_name, thousand_id, global_no_start FROM section_master ORDER BY section_id`).all()
      ]);
      let thousandRows = thousands.results, sectionRows = sections.results;
      if (script) {
        thousandRows = await applyScript(env, script, 'thousands_master', 'canonical_name',
          thousandRows, r => r.thousand_id, 'canonical_name');
        sectionRows  = await applyScript(env, script, 'section_master', 'section_name',
          sectionRows, r => r.section_id, 'section_name');
      }
      const result = thousandRows.map(t => ({
        thousand_id:   t.thousand_id,
        thousand_name: t.canonical_name,
        sections: sectionRows
          .filter(s => s.thousand_id === t.thousand_id)
          .map(s => ({
            section_id:      s.section_id,
            section_name:    s.section_name,
            has_pathu:       PATHU_SECTIONS.has(s.section_id),
            global_no_start: s.global_no_start || 0
          }))
      }));
      return new Response(JSON.stringify(result), { headers: CORS });
    }

    if (url.searchParams.has("section_id") && !url.searchParams.has("pathu_no")) {
      const section_id = Number(url.searchParams.get("section_id"));
      if (PATHU_SECTIONS.has(section_id)) {
        const result = await env.db.prepare(`
          SELECT MIN(pathu_id) as pathu_id, pathu_name, pathu_no,
                 MIN(global_no_start) as global_no_start
          FROM pathu_master WHERE section_id = ?
          GROUP BY pathu_no, pathu_name ORDER BY pathu_no
        `).bind(section_id).all();
        // MIN(pathu_id) is a real pathu_id, so it keys the converted name.
        let pathuItems = result.results;
        if (script) {
          pathuItems = await applyScript(env, script, 'pathu_master', 'pathu_name',
            pathuItems, r => r.pathu_id, 'pathu_name');
        }
        return new Response(JSON.stringify({ type: "pathu", items: pathuItems }), { headers: CORS });
      } else if (THIRUMOZHI_SECTIONS.has(section_id)) {
        const result = await env.db.prepare(`
          SELECT thirumozhi_id, thirumozhi_name, thirumozhi_no,
                 thirumozhi_heading, global_no_start, global_no_end
          FROM thirumozhi_master WHERE section_id = ? ORDER BY thirumozhi_no
        `).bind(section_id).all();
        let tmItems = result.results;
        if (script) {
          tmItems = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',
            tmItems, r => r.thirumozhi_id, 'thirumozhi_name');
          tmItems = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading',
            tmItems, r => r.thirumozhi_id, 'thirumozhi_heading');
        }
        return new Response(JSON.stringify({ type: "thirumozhi", items: tmItems }), { headers: CORS });
      } else {
        const result = await env.db.prepare(`
          SELECT COUNT(*) as total, MIN(global_no) as global_no_start, MAX(global_no) as global_no_end
          FROM pasuram_master WHERE section_id = ?
        `).bind(section_id).first();
        return new Response(JSON.stringify({ type: "pasuram", total: result.total, global_no_start: result.global_no_start, global_no_end: result.global_no_end }), { headers: CORS });
      }
    }

    if (url.searchParams.has("section_id") && url.searchParams.has("pathu_no")) {
      const section_id = Number(url.searchParams.get("section_id"));
      const pathu_no   = Number(url.searchParams.get("pathu_no"));
      const result = await env.db.prepare(`
        SELECT pathu_id, pathu_name, pathu_no,
               pathu_subunit_name, thirumozhi_heading,
               global_no_start, global_no_end, sub_unit_no
        FROM pathu_master WHERE section_id = ? AND pathu_no = ? ORDER BY sub_unit_no
      `).bind(section_id, pathu_no).all();
      let subItems = result.results;
      if (script) {
        for (const col of ["pathu_name", "pathu_subunit_name", "thirumozhi_heading"]) {
          subItems = await applyScript(env, script, 'pathu_master', col, subItems, r => r.pathu_id, col);
        }
      }
      return new Response(JSON.stringify({ type: "thirumozhi", items: subItems }), { headers: CORS });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASURAM LOOKUP
// ─────────────────────────────────────────────────────────────────────────────
async function handlePasuramLookup(request, env) {
  const url = new URL(request.url);
  const no  = url.searchParams.get("no");
  try {
    if (!no || isNaN(Number(no)))
      return new Response(JSON.stringify({ error: "no= param required" }), { status: 400, headers: CORS });
    const row = await env.db.prepare(`
      SELECT p.global_no, p.local_pasuram_no, p.section_id, p.pathu_id, p.thirumozhi_id,
             s.section_name, pm.pathu_name, pm.pathu_no,
             tm.thirumozhi_name, tm.thirumozhi_no, tm.thirumozhi_heading
      FROM pasuram_master p
      LEFT JOIN section_master s  ON p.section_id    = s.section_id
      LEFT JOIN pathu_master pm   ON p.pathu_id      = pm.pathu_id
      LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id
      WHERE p.global_no = ? LIMIT 1
    `).bind(Number(no)).first();
    if (!row) return new Response(JSON.stringify({ error: "Pasuram not found" }), { status: 404, headers: CORS });
    const lkScript = url.searchParams.get("script");
    if (lkScript) {
      let rows = [row];
      rows = await applyScript(env, lkScript, 'section_master',    'section_name',       rows, r => r.section_id,    'section_name');
      rows = await applyScript(env, lkScript, 'pathu_master',      'pathu_name',         rows, r => r.pathu_id,      'pathu_name');
      rows = await applyScript(env, lkScript, 'thirumozhi_master', 'thirumozhi_name',    rows, r => r.thirumozhi_id, 'thirumozhi_name');
      rows = await applyScript(env, lkScript, 'thirumozhi_master', 'thirumozhi_heading', rows, r => r.thirumozhi_id, 'thirumozhi_heading');
      return new Response(JSON.stringify(rows[0]), { headers: CORS });
    }
    return new Response(JSON.stringify(row), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN
// ─────────────────────────────────────────────────────────────────────────────
async function handlePlan(request, env) {
  const url = new URL(request.url);
  try {
    if (request.method === "GET") {
      const mobile = url.searchParams.get("mobile");
      const day     = url.searchParams.get("day");
      const plan_id = url.searchParams.get("plan_id");
      if (!mobile || (day === null && !plan_id))
        return new Response(JSON.stringify({ error: "mobile= and day= or plan_id= required" }), { status: 400, headers: CORS });
      const plan = plan_id
        ? await env.db.prepare(`
            SELECT plan_id, plan_name, day_of_week, is_active,
                   include_pothu_t, include_pothu_v, include_pothu_m, pothu_order, is_user_ordered, is_temple
            FROM user_recital_plan WHERE plan_id = ? AND mobile = ? LIMIT 1
          `).bind(Number(plan_id), mobile).first()
        : await env.db.prepare(`
            SELECT plan_id, plan_name, day_of_week, is_active,
                   include_pothu_t, include_pothu_v, include_pothu_m, pothu_order, is_user_ordered, is_temple
            FROM user_recital_plan
            WHERE mobile = ? AND day_of_week IN (?, 7) AND is_active = 1
            ORDER BY day_of_week ASC LIMIT 1
          `).bind(mobile, Number(day)).first();
      if (!plan) return new Response(JSON.stringify({ plan: null, items: [] }), { headers: CORS });
      const items = await env.db.prepare(`
        SELECT item_id, sequence_no, entity_type, entity_id,
               is_rettai, global_no_start, pathu_id, section_id, from_koil, item_opt
        FROM user_recital_item WHERE plan_id = ? ORDER BY sequence_no
      `).bind(plan.plan_id).all();
      return new Response(JSON.stringify({ plan, items: (items.results || []).map(itemFromDb) }), { headers: CORS });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const { mobile, day_of_week, plan_name, items,
              include_pothu_t, include_pothu_v, include_pothu_m, pothu_order,
              is_user_ordered,
              is_temple, plan_id: bodyPlanId, ghoshti_new } = body;
      if (!mobile || !items)
        return new Response(JSON.stringify({ error: "mobile and items required" }), { status: 400, headers: CORS });

      let plan_id;
      if (bodyPlanId) {
        // ── EDIT an existing plan (ghoshti) — update in place by plan_id ──
        const owned = await env.db.prepare(
          `SELECT plan_id FROM user_recital_plan WHERE plan_id = ? AND mobile = ?`
        ).bind(Number(bodyPlanId), mobile).first();
        if (!owned)
          return new Response(JSON.stringify({ error: "Plan not found or not authorized" }), { status: 403, headers: CORS });
        await env.db.prepare(`
          UPDATE user_recital_plan
          SET plan_name = ?, is_active = 1, updated_at = datetime('now'),
              include_pothu_t = ?, include_pothu_v = ?, include_pothu_m = ?,
              pothu_order = ?, is_user_ordered = ?, is_temple = ?
          WHERE plan_id = ? AND mobile = ?
        `).bind(plan_name || null,
                include_pothu_t ?? null, include_pothu_v ?? null, include_pothu_m ?? null,
                pothu_order ?? null,
                is_user_ordered ?? 0, is_temple ? 1 : 0, Number(bodyPlanId), mobile).run();
        plan_id = Number(bodyPlanId);

      } else if (ghoshti_new) {
        // ── NEW ghoshti — its OWN plan under a unique day_of_week (>= 8) ──
        // Ghoshti isn't a weekday; slots 8,9,10… keep each ghoshti independent
        // and never collide via the UNIQUE(mobile, day_of_week) constraint.
        const maxRow = await env.db.prepare(
          `SELECT MAX(day_of_week) AS m FROM user_recital_plan WHERE mobile = ? AND day_of_week >= 8`
        ).bind(mobile).first();
        const dow = (maxRow && maxRow.m != null) ? Number(maxRow.m) + 1 : 8;
        await env.db.prepare(`
          INSERT INTO user_recital_plan (mobile, day_of_week, plan_name, is_active, updated_at,
                                         include_pothu_t, include_pothu_v, include_pothu_m,
                                         pothu_order, is_user_ordered, is_temple)
          VALUES (?, ?, ?, 1, datetime('now'), ?, ?, ?, ?, ?, ?)
        `).bind(mobile, dow, plan_name || null,
                include_pothu_t ?? null, include_pothu_v ?? null, include_pothu_m ?? null,
                pothu_order ?? null,
                is_user_ordered ?? 0, is_temple ? 1 : 0).run();
        const row = await env.db.prepare(
          `SELECT plan_id FROM user_recital_plan WHERE mobile = ? AND day_of_week = ?`
        ).bind(mobile, dow).first();
        plan_id = row.plan_id;

      } else {
        // ── WEEKLY recital (days 1–7) — unchanged shared-slot behavior ──
        if (day_of_week === undefined)
          return new Response(JSON.stringify({ error: "day_of_week required" }), { status: 400, headers: CORS });
        await env.db.prepare(`
          INSERT INTO user_recital_plan (mobile, day_of_week, plan_name, is_active, updated_at,
                                         include_pothu_t, include_pothu_v, include_pothu_m,
                                         pothu_order, is_user_ordered)
          VALUES (?, ?, ?, 1, datetime('now'), ?, ?, ?, ?, ?)
          ON CONFLICT(mobile, day_of_week)
          DO UPDATE SET plan_name = excluded.plan_name, is_active = 1, updated_at = datetime('now'),
                        include_pothu_t = excluded.include_pothu_t,
                        include_pothu_v = excluded.include_pothu_v,
                        include_pothu_m = excluded.include_pothu_m,
                        pothu_order = excluded.pothu_order,
                        is_user_ordered = excluded.is_user_ordered
        `).bind(mobile, day_of_week, plan_name || null,
                include_pothu_t ?? null, include_pothu_v ?? null,
                include_pothu_m ?? null, pothu_order ?? null,
                is_user_ordered ?? 0).run();
        const plan = await env.db.prepare(
          `SELECT plan_id FROM user_recital_plan WHERE mobile = ? AND day_of_week = ?`
        ).bind(mobile, day_of_week).first();
        plan_id = plan.plan_id;
      }

      await env.db.prepare(`DELETE FROM user_recital_item WHERE plan_id = ?`).bind(plan_id).run();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let gns = item.global_no_start || 0;
        if (!gns && item.entity_type === "pathu") {
          const pm = await env.db.prepare(
            `SELECT MIN(global_no_start) as gns FROM pathu_master WHERE pathu_id = ? LIMIT 1`
          ).bind(item.entity_id).first();
          gns = pm?.gns || 0;
        } else if (!gns && item.entity_type === "section") {
          const sm = await env.db.prepare(
            `SELECT global_no_start FROM section_master WHERE section_id = ? LIMIT 1`
          ).bind(item.entity_id).first();
          gns = sm?.global_no_start || 0;
        } else if (!gns && item.entity_type === "thirumozhi") {
          const tm = await env.db.prepare(
            `SELECT global_no_start FROM thirumozhi_master WHERE thirumozhi_id = ? LIMIT 1`
          ).bind(item.entity_id).first();
          gns = tm?.global_no_start || 0;
        } else if (item.entity_type === "koil") {
          gns = item.entity_id === 1 ? 948 : 2675;
        }
        await env.db.prepare(`
          INSERT INTO user_recital_item
            (plan_id, sequence_no, entity_type, entity_id,
             is_rettai, global_no_start, pathu_id, section_id, from_koil, item_opt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          plan_id, i + 1,
          itemToDb(item).entity_type, item.entity_id,
          item.is_rettai ? 1 : 0,
          gns,
          item.pathu_id   || null,
          item.section_id || null,
          item.from_koil  ? 1 : 0,
          itemToDb(item).item_opt
        ).run();
      }
      return new Response(JSON.stringify({ success: true, plan_id }), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER  ← enhanced with metadata, display items, prosody, section_closing
// ─────────────────────────────────────────────────────────────────────────────
async function handleRender(request, env) {
  const url     = new URL(request.url);
  const plan_id = url.searchParams.get("plan_id");
  const script  = url.searchParams.get("script");
  try {
    if (!plan_id)
      return new Response(JSON.stringify({ error: "plan_id= required" }), { status: 400, headers: CORS });

    // ── Step 1: fetch plan (for pothu flags), items, global thaniyan, sattrumurai set, section modes ──
    const sect = url.searchParams.get("sect") || "T";
    // Pothu thaniyan: fetch ALL global lines (T/V/B) once; which block(s)
    // render is decided by plan flags in Step 7. Legacy plans (NULL flags)
    // keep the old sect-based single-thaniyan behavior exactly.
    const [planRow, itemRows, globalThaniyanAll, sattrumuraiRows, sectionModeRows] = await Promise.all([
      env.db.prepare(`SELECT include_pothu_t, include_pothu_v, include_pothu_m, pothu_order, is_user_ordered, is_temple FROM user_recital_plan WHERE plan_id = ?`).bind(Number(plan_id)).first(),
      env.db.prepare(`SELECT item_id, sequence_no, entity_type, entity_id, is_rettai, pathu_id, section_id, from_koil, item_opt FROM user_recital_item WHERE plan_id = ? ORDER BY sequence_no`).bind(Number(plan_id)).all(),
      env.db.prepare(`SELECT l.line_id, l.line_no, l.line_text, l.line_type, l.line_role, l.line_group, l.prosody_id, l.sect FROM thaniyan_line_master l WHERE l.thaniyan_ref = 'global' ORDER BY l.line_no`).all(),
      env.db.prepare(`SELECT entity_type, entity_id FROM recital_sattrumurai`).all(),
      env.db.prepare(`SELECT section_id, thaniyan_display_mode FROM section_master`).all()
    ]);

    const items = (itemRows.results || []).map(itemFromDb);
    if (!items.length) return new Response(JSON.stringify({ blocks: [] }), { headers: CORS });

    const sattrumuraiSet = new Set(sattrumuraiRows.results.map(r => `${r.entity_type}:${r.entity_id}`));
    const sectionModeMap = {};
    for (const row of sectionModeRows.results) sectionModeMap[row.section_id] = row.thaniyan_display_mode;

    // ── Step 2: resolve section_id for each item ──
    const sectionIds = new Array(items.length).fill(null);
    await Promise.all(items.map((item, i) => {
      if (item.entity_type === "section")     { sectionIds[i] = item.entity_id; return Promise.resolve(); }
      if (item.entity_type === "koil")        { sectionIds[i] = item.entity_id === 1 ? 11 : 26; return Promise.resolve(); }
      if (item.entity_type === "pathu")       return env.db.prepare(`SELECT section_id FROM pathu_master WHERE pathu_id = ? LIMIT 1`).bind(item.entity_id).first().then(r => { if (r) sectionIds[i] = r.section_id; });
      if (item.entity_type === "thirumozhi")  return env.db.prepare(`SELECT section_id FROM thirumozhi_master WHERE thirumozhi_id = ? LIMIT 1`).bind(item.entity_id).first().then(r => { if (r) sectionIds[i] = r.section_id; });
      if (item.entity_type === "pasuram")     return env.db.prepare(`SELECT section_id FROM pasuram_master WHERE global_no = ? LIMIT 1`).bind(item.entity_id).first().then(r => { if (r) sectionIds[i] = r.section_id; });
      return Promise.resolve();
    }));

    // ── Step 3: section thaniyans ──
    // allSectionIds: all sections in this plan (for display items, closing, prosody)
    // uniqueSectionIds: sections that should show thaniyans
    // thaniyan_display_mode = 0 means "suppress when a preceding section is present"
    // For section 2: mode=0 → suppress thaniyan only when section 1 is also in the plan
    // If section 1 is absent, section 2 thaniyan should show
    const allSectionIds    = [...new Set(sectionIds.filter(Boolean))];
    const uniqueSectionIds = allSectionIds.filter(sid => {
      const mode = sectionModeMap[sid];
      if (mode !== 0) return true;           // mode 1/2 → always show
      // mode 0 → show only if section_id - 1 is NOT in the plan
      // (e.g. section 2 shows thaniyan only when section 1 is absent)
      return !allSectionIds.includes(sid - 1);
    });
    const sectionThaniyans = {};
    await Promise.all(uniqueSectionIds.map(sid =>
      env.db.prepare(`SELECT l.line_id, l.line_no, l.line_text, l.line_type, l.line_role, l.line_group, l.prosody_id FROM thaniyan_line_master l WHERE l.thaniyan_ref = ? ORDER BY l.line_no`).bind(`section_${sid}`).all()
        .then(async rows => {
          if (!rows.results.length) return;
          sectionThaniyans[sid] = script
            ? await applyScript(env, script, 'thaniyan_line_master', 'line_text',
                rows.results, r => r.line_id, 'line_text')
            : rows.results;
        })
    ));

    // ── Step 4: section closing, prosody, display items — per unique section ──
    const sectionClosingMap = {};
    const prosodyScopeAll   = [];
    const prosodyMasterMap  = {};
    // display items: { pathu: {id:[{text,is_adivaravu}]}, thirumozhi: {id:[...]}, pasuram: {id:[...]} }
    const displayMap = { section: {}, pathu: {}, thirumozhi: {}, pasuram: {} };

    if (allSectionIds.length) {
      // Section closing
      const closingRows = await env.db.prepare(
        `SELECT section_id, closing_text FROM section_closing_master WHERE section_id IN (${allSectionIds.map(() => "?").join(",")})`
      ).bind(...allSectionIds).all();
      const closingConv = script
        ? await applyScript(env, script, 'section_closing_master', 'closing_text',
            closingRows.results, r => r.section_id, 'closing_text')
        : closingRows.results;
      for (const r of closingConv) sectionClosingMap[r.section_id] = r.closing_text;

      // Prosody (global — same for all sections)
      const [psScope, psMaster] = await Promise.all([
        env.db.prepare(`SELECT prosody_id, start_global_no, end_global_no FROM prosody_scope_map`).all(),
        env.db.prepare(`SELECT prosody_id, canonical_name_tamil FROM prosody_master`).all()
      ]);
      prosodyScopeAll.push(...psScope.results);
      const psConv = script
        ? await applyScript(env, script, 'prosody_master', 'canonical_name_tamil',
            psMaster.results, r => r.prosody_id, 'canonical_name_tamil')
        : psMaster.results;
      for (const r of psConv) prosodyMasterMap[r.prosody_id] = r.canonical_name_tamil;

      // Display items — fetch for ALL sections (not filtered by thaniyan mode)
      for (const sid of allSectionIds) {
        const dispRows = await env.db.prepare(`
          SELECT id, entity_type, entity_id, meta_value, sequence_no,
                 CASE WHEN LOWER(meta_value) LIKE '%அடிவரவு%' THEN 1 ELSE 0 END as is_adivaravu
          FROM entity_master
          WHERE display_flag = 1
          AND (
            (entity_type = 'pasuram'    AND entity_id BETWEEN (SELECT global_no_start FROM section_master WHERE section_id = ?) AND (SELECT global_no_end FROM section_master WHERE section_id = ?))
            OR (entity_type = 'pathu'       AND entity_id IN (SELECT pathu_id      FROM pathu_master      WHERE section_id = ?))
            OR (entity_type = 'thirumozhi'  AND entity_id IN (SELECT thirumozhi_id FROM thirumozhi_master WHERE section_id = ?))
            OR (entity_type = 'section'     AND entity_id = ?)
          )
          ORDER BY entity_type, entity_id, sequence_no
        `).bind(sid, sid, sid, sid, sid).all();

        // is_adivaravu is computed in SQL from the SOURCE Tamil, so it stays
        // correct after conversion — the flag never has to match converted text.
        const dispConv = script
          ? await applyScript(env, script, 'entity_master', 'meta_value',
              dispRows.results, r => r.id, 'meta_value')
          : dispRows.results;

        for (const r of dispConv) {
          if (!r.meta_value || r.meta_value.trim() === "") continue;
          const key = String(r.entity_id);
          const entry = { text: r.meta_value, is_adivaravu: r.is_adivaravu === 1 };
          if (r.entity_type === "section") {
            if (!displayMap.section[key]) displayMap.section[key] = [];
            displayMap.section[key].push(entry);
          } else if (r.entity_type === "pathu") {
            if (!displayMap.pathu[key]) displayMap.pathu[key] = [];
            displayMap.pathu[key].push(entry);
          } else if (r.entity_type === "thirumozhi") {
            if (!displayMap.thirumozhi[key]) displayMap.thirumozhi[key] = [];
            displayMap.thirumozhi[key].push(entry);
          } else if (r.entity_type === "pasuram") {
            if (!displayMap.pasuram[key]) displayMap.pasuram[key] = [];
            displayMap.pasuram[key].push(entry);
          }
        }
      }
    }

    // ── Step 5: fetch pasurams with full metadata ──
    const pasuramResults = await Promise.all(items.map(item => {
      const q = `
        SELECT p.global_no, p.local_pasuram_no, p.double_recital,
               p.section_id, p.pathu_id, p.thirumozhi_id,
               l.id AS line_id, l.line_no, l.line_text, l.recital_group,
               s.section_name, s.section_closing,
               pm.pathu_name, pm.pathu_subunit_name, pm.pathu_no, pm.sub_unit_no,
               pm.thirumozhi_heading as pathu_thirumozhi_heading,
               tm.thirumozhi_heading, tm.thirumozhi_name, tm.thirumozhi_no
        FROM pasuram_master p
        JOIN pasuram_line_master l    ON p.global_no     = l.global_no
        LEFT JOIN section_master s   ON p.section_id    = s.section_id
        LEFT JOIN pathu_master pm    ON p.pathu_id      = pm.pathu_id
        LEFT JOIN thirumozhi_master tm ON p.thirumozhi_id = tm.thirumozhi_id`;

      if (item.entity_type === "section") {
        const sid = Number(item.entity_id);
        // Sections 21/22/23 use dedicated tables — return sentinel so render knows
        if (sid === 21) return [{ __special: "kootrirukkai", section_id: sid, is_rettai: item.is_rettai ? 1 : 0 }];
        if (sid === 22 || sid === 23) return [{ __special: "madal", section_id: sid, is_rettai: item.is_rettai ? 1 : 0 }];
        const rf = item.is_rettai ? `AND p.double_recital = 1` : ``;
        return env.db.prepare(`${q} WHERE p.section_id = ? ${rf} ORDER BY p.global_no, l.line_no`).bind(item.entity_id).all().then(r => r.results);
      }
      if (item.entity_type === "pathu") {
        const rf = item.is_rettai ? `AND p.double_recital = 1` : ``;
        // Child thirumozhi: item.pathu_id (parent) !== item.entity_id (child) → fetch only this child
        // Full pathu: item.pathu_id === item.entity_id or null → fetch all thirumozhi of pathu_no
        const isChildThiru = item.pathu_id != null;
        if (isChildThiru) {
          return env.db.prepare(
            `${q} WHERE p.pathu_id = ? ${rf} ORDER BY p.global_no, l.line_no`
          ).bind(item.entity_id).all().then(r => r.results);
        }
        return env.db.prepare(
          `SELECT section_id, pathu_no FROM pathu_master WHERE pathu_id = ? LIMIT 1`
        ).bind(item.entity_id).first().then(pm => {
          if (!pm) return [];
          return env.db.prepare(
            `${q} WHERE p.pathu_id IN (SELECT pathu_id FROM pathu_master WHERE section_id = ? AND pathu_no = ?) ${rf} ORDER BY p.global_no, l.line_no`
          ).bind(pm.section_id, pm.pathu_no).all().then(r => r.results);
        });
      }
      if (item.entity_type === "thirumozhi") {
        const rf = item.is_rettai ? `AND p.double_recital = 1` : ``;
        return env.db.prepare(`${q} WHERE p.thirumozhi_id = ? ${rf} ORDER BY p.global_no, l.line_no`).bind(item.entity_id).all().then(r => r.results);
      }
      if (item.entity_type === "pasuram")
        return env.db.prepare(`${q} WHERE p.global_no = ? ORDER BY l.line_no`).bind(item.entity_id).all().then(r => r.results);
      if (item.entity_type === "koil") {
        const sect = url.searchParams.get("sect") || "T";
        // Thenkalai: use standard tag; Vadagalai: use வடகலை tag
        const baseTitle = item.entity_id === 1 ? "கோயில் திருமொழி" : "கோயில் திருவாய்மொழி";
        const koilTitle = sect === 'V' ? 'வடகலை ' + baseTitle : baseTitle;
        return env.db.prepare(`SELECT entity_id FROM entity_master WHERE entity_type = 'pathu' AND meta_key = 'tag' AND meta_value = ?`).bind(koilTitle).all()
          .then(tagRows => {
            const pathuIds = tagRows.results.map(r => Number(r.entity_id));
            if (!pathuIds.length) return [];
            const ph = pathuIds.map(() => "?").join(",");
            return env.db.prepare(`${q} WHERE p.pathu_id IN (${ph}) ORDER BY p.global_no, l.line_no`).bind(...pathuIds).all().then(r => r.results);
          });
      }
      return Promise.resolve([]);
    }));

    /* ── SCRIPT PASS over every pasuram row ──
       Flattened first so each column is one batched lookup for the whole
       plan rather than one per item, then split back into per-item arrays.
       applyScript returns new objects, so the arrays are rebuilt, not mutated. */
    if (script) {
      const flat = [], owner = [];
      pasuramResults.forEach((arr, i) => {
        if (!arr.length || arr[0]?.__special) return;
        arr.forEach(r => { flat.push(r); owner.push(i); });
      });
      if (flat.length) {
        let rows = flat;
        rows = await applyScript(env, script, 'pasuram_line_master', 'line_text',        rows, r => r.line_id,       'line_text');
        rows = await applyScript(env, script, 'section_master',      'section_name',     rows, r => r.section_id,    'section_name');
        rows = await applyScript(env, script, 'section_master',      'section_closing',  rows, r => r.section_id,    'section_closing');
        rows = await applyScript(env, script, 'pathu_master',        'pathu_name',       rows, r => r.pathu_id,      'pathu_name');
        rows = await applyScript(env, script, 'pathu_master',  'pathu_subunit_name',     rows, r => r.pathu_id,      'pathu_subunit_name');
        rows = await applyScript(env, script, 'pathu_master',  'thirumozhi_heading',     rows, r => r.pathu_id,      'pathu_thirumozhi_heading');
        rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',    rows, r => r.thirumozhi_id, 'thirumozhi_name');
        rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading', rows, r => r.thirumozhi_id, 'thirumozhi_heading');
        const rebuilt = pasuramResults.map(() => []);
        rows.forEach((r, k) => rebuilt[owner[k]].push(r));
        rebuilt.forEach((arr, i) => { if (arr.length) pasuramResults[i] = arr; });
      }
    }

    // ── Step 5b: Munnadi Pinnadi ──
    // An item saved with item_opt = 'mp' is recited as munnadi / pinnadi.
    // The block still carries the same pasurams as Full, so the index,
    // thaniyan and sattrumurai treat it as a full recital; the page draws
    // the munnadi rows instead of the verses.
    const munnadiRows = items.map(() => null);
    const mpIdx = items
      .map((it, i) => (it.item_opt === "mp" && pasuramResults[i].length && !pasuramResults[i][0]?.__special) ? i : -1)
      .filter(i => i >= 0);
    if (mpIdx.length) {
      const gnos = [...new Set(mpIdx.flatMap(i => pasuramResults[i].map(r => r.global_no)))];
      let mrows = await _inQuery(env, gnos,
        `SELECT id AS mp_id, global_no, line_1, line_2 FROM munnadi_pinnadi_master WHERE global_no IN (__IN__)`);
      if (script) {
        mrows = await applyScript(env, script, 'munnadi_pinnadi_master', 'line_1', mrows, r => r.mp_id, 'line_1');
        mrows = await applyScript(env, script, 'munnadi_pinnadi_master', 'line_2', mrows, r => r.mp_id, 'line_2');
      }
      const byG = new Map(mrows.map(r => [r.global_no, r]));
      for (const i of mpIdx) {
        const seen = new Set(), out = [];
        for (const r of pasuramResults[i]) {
          if (seen.has(r.global_no)) continue;
          seen.add(r.global_no);
          const m = byG.get(r.global_no);
          out.push({
            global_no: r.global_no, local_pasuram_no: r.local_pasuram_no,
            double_recital: r.double_recital, pathu_id: r.pathu_id, thirumozhi_id: r.thirumozhi_id,
            line_1: m ? m.line_1 : "", line_2: m ? m.line_2 : ""
          });
        }
        // Thiruppallandu 1 and 2 are one row, as on the Munnadi Pinnadi page
        const p1 = out.find(x => x.global_no === 1), p2 = out.find(x => x.global_no === 2);
        if (p1 && p2) { p1.line_2 = p2.line_1; p1.merged = 1; out.splice(out.indexOf(p2), 1); }
        munnadiRows[i] = out;
      }
    }

    // ── Step 6: sattrumurai ──
    const sattrumuraiData = await Promise.all(items.map((item, i) => {
      const key = `${item.entity_type}:${item.entity_id}`;
      if (!sattrumuraiSet.has(key) || !sectionIds[i]) return Promise.resolve(null);
      return env.db.prepare(`
        SELECT ss.sequence_no, ss.entity_type, ss.entity_id, ss.is_dual_recital
        FROM sattrumurai_sequence ss
        JOIN sattrumurai_master sm ON ss.sattrumurai_id = sm.sattrumurai_id
        WHERE sm.thousand_id = (SELECT thousand_id FROM section_master WHERE section_id = ? LIMIT 1)
        ORDER BY ss.sequence_no
      `).bind(sectionIds[i]).all().then(r => r.results.length ? r.results : null);
    }));

    // ── Step 7: assemble blocks ──
    const blocks = [];
    const shownSectionThaniyans = new Set();

    // ── Pothu thaniyan block(s) ──
    // Flags set on the plan (ghoshti setup): render what's ticked — both
    // may appear (mixed-sect gathering), Thenkalai first.
    // Flags NULL (legacy plans + personal recital plans): old behavior —
    // single sect-based block, byte-identical lines to before.
    let gAll = globalThaniyanAll.results || [];
    if (script) {
      gAll = await applyScript(env, script, 'thaniyan_line_master', 'line_text',
        gAll, r => r.line_id, 'line_text');
    }
    const subsect  = url.searchParams.get("subsect") || "";
    const hasFlags = planRow && (planRow.include_pothu_t != null || planRow.include_pothu_v != null);
    const wantT    = hasFlags ? Number(planRow.include_pothu_t) === 1 : sect !== "V";
    const wantV    = hasFlags ? Number(planRow.include_pothu_v) === 1 : sect === "V";
    // Madam (Ahobila): ghoshti plans carry the include_pothu_m flag;
    // legacy/personal plans derive it from the viewer's sub-sect.
    const wantM    = hasFlags ? Number(planRow.include_pothu_m) === 1
                              : (sect === "V" && subsect === "madam");
    const tLines   = gAll.filter(l => l.sect === "T" || l.sect === "B");
    const vLines   = wantT ? gAll.filter(l => l.sect === "V")
                           : gAll.filter(l => l.sect === "V" || l.sect === "B");
    let mLines = [];
    if (wantM) {
      const kes = await env.db.prepare(
        `SELECT line_no, line_text FROM fixed_text_line_master
         WHERE fixed_id = 8 ORDER BY line_no`
      ).all();
      // fixed_text_line_master is keyed on the pair fixed_id|line_no
      const kesRows = script
        ? await applyScript(env, script, 'fixed_text_line_master', 'line_text',
            kes.results || [], r => `8|${r.line_no}`, 'line_text')
        : (kes.results || []);
      mLines = kesRows.map(r => ({
        line_no: r.line_no, line_text: r.line_text,
        line_type: null, line_role: null, line_group: 1, prosody_id: null
      }));
    }
    // Order ruling: தென்கலை → கேஶவார்ய (Madam) → ராமாநுஜ தயாபாத்ரம்
    //
    // A pothu set is: [title] + [sect-specific opening thaniyan] + [common
    // remainder shared by every sect]. When MORE THAN ONE sect is selected
    // (mixed ghoshti), only the OPENING thaniyans stack — the common
    // remainder is recited ONCE at the end, not once per sect.
    //   ஸ்ரீசைலேச… → கேஶவார்ய… → ராமாநுஜ த₃யாபாத்ரம்… → (common remainder)
    // With a single sect selected, output is byte-identical to before.
    const _splitPothu = (rows) => {
      // head = title + opening thaniyan (its subheads and stanza lines);
      // tail = everything from the NEXT thaniyan's subhead onward.
      const head = [], tail = [];
      let seenLine = false, inTail = false;
      for (const r of rows) {
        if (inTail) { tail.push(r); continue; }
        const role = r.line_role;
        if (seenLine && (role === "subhead" || role === "title")) { inTail = true; tail.push(r); continue; }
        if (role === "line") seenLine = true;
        head.push(r);
      }
      return { head, tail };
    };

    const _selCount = (wantT && tLines.length ? 1 : 0)
                    + (wantM && mLines.length ? 1 : 0)
                    + (wantV && vLines.length ? 1 : 0);

    // Opening order: the plan may store its own (e.g. "V,M,T" when the
    // ghoshti wants Vadakalai first). Default stays தென்கலை → மடம் → வடகலை.
    const _defaultOrder = ["T", "M", "V"];
    const _rawOrder = (planRow && planRow.pothu_order) ? String(planRow.pothu_order) : "";
    const _order = _rawOrder
      ? _rawOrder.split(",").map(x => x.trim().toUpperCase()).filter(x => _defaultOrder.includes(x))
      : [];
    // Any sect missing from a stored order is appended in default order,
    // so a partial/garbled value can never silently drop a thaniyan.
    for (const k of _defaultOrder) if (!_order.includes(k)) _order.push(k);

    const _want  = { T: wantT && tLines.length, M: wantM && mLines.length, V: wantV && vLines.length };
    // கேஶவார்ய (Madam) may never follow the Vadakalai thaniyan — an order
    // placing V first denotes a plain Vadakalai gathering, so drop M.
    if (_want.M && _want.V && _order.indexOf("V") < _order.indexOf("M")) _want.M = false;
    /* Block labels. The Tamil below stays the built-in default; with a
       script the converted ui_text_master row is used instead. Until those
       three keys exist these read Tamil, exactly like every other new key. */
    const _lbl = await uiTextMap(env, script,
      ["rec.pothu.label.T", "rec.pothu.label.M", "rec.pothu.label.V"]);
    const _label = {
      T: _lbl["rec.pothu.label.T"] || "பொது தனியன்கள்",
      M: _lbl["rec.pothu.label.M"] || "பொது தனியன் — அஹோபிலமடம்",
      V: _lbl["rec.pothu.label.V"] || "பொது தனியன்கள் (வடகலை)"
    };

    if (_selCount > 1) {
      // Mixed gathering — ONE block: openings in the chosen order, then
      // the common remainder once at the end.
      const _split = { T: _splitPothu(tLines), M: { head: mLines, tail: [] }, V: _splitPothu(vLines) };
      const merged = [];
      let titleUsed = false;
      for (const k of _order) {
        if (!_want[k]) continue;
        let head = _split[k].head;
        // Only the first opening keeps the "பொது தனியன்கள்" title row.
        if (titleUsed) head = head.filter(r => r.line_role !== "title");
        else if (head.some(r => r.line_role === "title")) titleUsed = true;
        merged.push(...head);
      }
      // Common remainder — identical across sects; take whichever is present.
      const commonTail = (_want.T && _split.T.tail.length) ? _split.T.tail : _split.V.tail;
      merged.push(...commonTail);
      if (merged.length)
        blocks.push({ block_type: "global_thaniyan", label: _label.T, lines: merged });
    } else {
      const _lines = { T: tLines, M: mLines, V: vLines };
      for (const k of _order) {
        if (_want[k]) blocks.push({ block_type: "global_thaniyan", label: _label[k], lines: _lines[k] });
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item       = items[i];
      const section_id = sectionIds[i];
      const mode       = section_id ? (sectionModeMap[section_id] ?? 2) : 2;
      // mode=0 means suppress thaniyan only when preceding section is present
      const showThaniyan = mode !== 0 || !allSectionIds.includes(section_id - 1);

      // Section thaniyan — once per section
      if (section_id && showThaniyan && !shownSectionThaniyans.has(section_id)) {
        if (sectionThaniyans[section_id])
          blocks.push({ block_type: "section_thaniyan", section_id, lines: sectionThaniyans[section_id] });
        shownSectionThaniyans.add(section_id);
      }

      // Special block for sections 21/22/23
      if (pasuramResults[i].length === 1 && pasuramResults[i][0]?.__special) {
        const sp = pasuramResults[i][0];
        blocks.push({
          block_type:      sp.__special === "kootrirukkai" ? "kootrirukkai" : "madal",
          section_id:      sp.section_id,
          is_rettai:       sp.is_rettai,
          section_closing: sectionClosingMap[sp.section_id] || null,
          display_items:   displayMap,
          prosody_scope:   prosodyScopeAll,
          prosody_master:  prosodyMasterMap
        });
      }

      // Pasurams block — includes section_closing, display items, prosody
      if (pasuramResults[i].length && !pasuramResults[i][0]?.__special) {
        const firstRow  = pasuramResults[i][0];
        const isChild   = item.entity_type === "pathu" && item.pathu_id != null;
        blocks.push({
          block_type:      "pasurams",
          entity_type:     item.entity_type,
          entity_id:       item.entity_id,
          is_rettai:       item.is_rettai ? 1 : 0,
          is_child_thiru:  isChild ? 1 : 0,
          parent_pathu_id: isChild ? item.pathu_id : null,
          from_koil:       item.from_koil ? 1 : 0,
          sequence_no:     item.sequence_no,
          section_id:      section_id,
          section_name:    firstRow.section_name    || null,
          section_closing: sectionClosingMap[section_id] || firstRow.section_closing || null,
          display_items:   displayMap,
          prosody_scope:   prosodyScopeAll,
          prosody_master:  prosodyMasterMap,
          pasurams:        pasuramResults[i],
          is_munnadi:      munnadiRows[i] ? 1 : 0,
          munnadi:         munnadiRows[i] || undefined
        });
      }

      // Sattrumurai
      if (sattrumuraiData[i])
        blocks.push({ block_type: "sattrumurai", entity_type: item.entity_type, entity_id: item.entity_id, items: sattrumuraiData[i] });
    }

    // Sthothram — always after every pasuram (our sampradayam's pasurams first)
    blocks.push(...await stotraBlocks(env, items, stotraScript(url)));

    return new Response(JSON.stringify({
      plan_id: Number(plan_id), blocks,
      include_pothu_t: planRow ? planRow.include_pothu_t : null,
      include_pothu_v: planRow ? planRow.include_pothu_v : null,
      include_pothu_m: planRow ? planRow.include_pothu_m : null,
      pothu_order:     planRow ? (planRow.pothu_order || null) : null,
      is_temple: planRow ? (planRow.is_temple ? 1 : 0) : 0
    }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GHOSHTI
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// PANCHANGAM
// ─────────────────────────────────────────────────────────────────────────────
async function handlePanchangam(request, env) {
  const url  = new URL(request.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD
  try {
    if (!date)
      return new Response(JSON.stringify({ error: "date= required" }), { status: 400, headers: CORS });
    const row = await env.db.prepare(
      `SELECT p_date, tamil_month_no, tamil_month, star_no, star_name, is_margazhi, is_anadhyayana
       FROM panchangam WHERE p_date = ? LIMIT 1`
    ).bind(date).first();
    if (!row)
      return new Response(JSON.stringify({ error: "Date not found in panchangam", date }), { status: 404, headers: CORS });
    return new Response(JSON.stringify(row), { headers: CORS });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────────────────────
async function handleSpinner(request, env) {
  try {
    const url    = new URL(request.url);
    const script = url.searchParams.get("script");
    const mobile = request.method === "GET"
      ? url.searchParams.get("mobile")
      : (await request.clone().json()).mobile;

    if (!mobile)
      return new Response(JSON.stringify({ error: "mobile required" }), { status: 400, headers: CORS });

    if (request.method === "POST") {
      const body   = await request.json();
      const action = body.action; // "pause" | "resume" | "cancel" | "restart"

      // Get current user state
      const user = await env.db.prepare(
        `SELECT created_at, spinner_paused, spinner_paused_day FROM user_master WHERE mobile = ? LIMIT 1`
      ).bind(mobile).first();
      if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: CORS });

      const epoch   = new Date(user.created_at);
      epoch.setHours(0, 0, 0, 0);
      const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
      const dayNow  = Math.floor((todayMid - epoch) / 86400000);
      const curDay  = user.spinner_paused === 1 ? (user.spinner_paused_day ?? 0) : dayNow;

      if (action === "pause") {
        await env.db.prepare(
          `UPDATE user_master SET spinner_paused = 1, spinner_paused_day = ? WHERE mobile = ?`
        ).bind(curDay, mobile).run();
      } else if (action === "resume") {
        await env.db.prepare(
          `UPDATE user_master SET spinner_paused = 0, spinner_paused_day = NULL WHERE mobile = ?`
        ).bind(mobile).run();
      } else if (action === "cancel") {
        await env.db.prepare(
          `UPDATE user_master SET spinner_paused = -1, spinner_paused_day = NULL WHERE mobile = ?`
        ).bind(mobile).run();
      } else if (action === "restart") {
        // Reset epoch by updating created_at to now so day counter restarts
        await env.db.prepare(
          `UPDATE user_master SET spinner_paused = 0, spinner_paused_day = NULL, created_at = datetime('now') WHERE mobile = ?`
        ).bind(mobile).run();
      }
      return new Response(JSON.stringify({ success: true }), { headers: CORS });
    }

    // GET — fetch today's spinner
    const user = await env.db.prepare(
      `SELECT created_at, spinner_paused, spinner_paused_day FROM user_master WHERE mobile = ? LIMIT 1`
    ).bind(mobile).first();
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: CORS });

    const paused    = user.spinner_paused ?? 0;
    const epoch     = new Date(user.created_at);
    epoch.setHours(0, 0, 0, 0); // normalize to midnight
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const dayNow    = Math.floor((todayMidnight - epoch) / 86400000);
    // test_day param lets you preview any day without changing state
    const testDay   = url.searchParams.get("test_day");
    const spinDay   = testDay !== null ? Number(testDay)
                    : paused === 1 ? (user.spinner_paused_day ?? 0) : dayNow;

    // ── Anadhyayana Kalam: the spinner fully stops (it mixes pasurams not
    //    recited then), and the day-count FREEZES — Anadhyayana days don't
    //    advance it, so it resumes where it left off after Thai. ──
    const MAX_DAY     = 247; // Srirangam count — one full round
    const isoToday    = todayMidnight.toISOString().slice(0, 10);
    const epochIso    = epoch.toISOString().slice(0, 10);
    const anaCheckDate = url.searchParams.get("test_date") || isoToday; // admin preview via test_date
    let isAnadhyayana = false, anaDaysElapsed = 0;
    try {
      const anaRow = await env.db.prepare(
        `SELECT is_anadhyayana FROM panchangam WHERE p_date = ? LIMIT 1`
      ).bind(anaCheckDate).first();
      isAnadhyayana = anaRow?.is_anadhyayana === 1;
      const cnt = await env.db.prepare(
        `SELECT COUNT(*) AS c FROM panchangam WHERE p_date >= ? AND p_date <= ? AND is_anadhyayana = 1`
      ).bind(epochIso, isoToday).first();
      anaDaysElapsed = cnt?.c || 0;
    } catch (e) { /* date not in table → treat as normal */ }

    // Freeze applies to the active (non-paused, non-test) day only.
    const effectiveSpinDay = (testDay === null && paused !== 1)
      ? Math.max(0, dayNow - anaDaysElapsed)
      : spinDay;

    if (isAnadhyayana && testDay === null) {
      return new Response(JSON.stringify({
        anadhyayana: true,
        message: "Adiyen, Divyadesam Spinner will work post Anadhyayanam, as it is a mix of many pasurams which are not recited during Anadhyayana. 🙏",
        spin_day: effectiveSpinDay,
        max_day:  MAX_DAY,
        paused
      }), { headers: CORS });
    }

    // ── Fetch all divyadesams in canonical order ──
    const desams = await env.db.prepare(
      `SELECT divyadesam_id, canonical_name FROM divyadesam_master ORDER BY divyadesam_id`
    ).all();

    // ── For each desam, get today's pasuram ──
    const desamBlocks = await Promise.all(desams.results.map(async d => {
      // Get all pasurams for this desam in global_no order
      const pasurams = await env.db.prepare(
        `SELECT l.id AS line_id, m.global_no, l.line_text, l.line_no, l.recital_group
         FROM pasuram_divyadesam_map m
         JOIN pasuram_line_master l ON m.global_no = l.global_no
         WHERE m.divyadesam_id = ?
         ORDER BY m.global_no, l.line_no`
      ).bind(d.divyadesam_id).all();

      if (!pasurams.results.length) return null;

      // Group lines by global_no
      const pMap = new Map();
      for (const row of pasurams.results) {
        if (!pMap.has(row.global_no)) pMap.set(row.global_no, []);
        pMap.get(row.global_no).push(row);
      }
      const pList = [...pMap.entries()]; // [[global_no, lines[]], ...]

      // Pick today's pasuram by day modulo
      const idx = effectiveSpinDay % pList.length;
      const [global_no, lines] = pList[idx];

      return {
        divyadesam_id:   d.divyadesam_id,
        canonical_name:  d.canonical_name,
        global_no,
        lines
      };
    }));

    let validBlocks = desamBlocks.filter(Boolean);

    /* Every desam fetched its own lines, so converting inside that loop would
       mean one text_script query per desam. Instead the day's lines are
       flattened into a single pass and written back in place. */
    if (script) {
      const flat = [];
      for (const b of validBlocks) for (const l of (b.lines || [])) flat.push(l);
      if (flat.length) {
        const conv = await applyScript(env, script, 'pasuram_line_master', 'line_text',
          flat, r => r.line_id, 'line_text');
        let i = 0;
        for (const b of validBlocks) b.lines = (b.lines || []).map(() => conv[i++]);
      }
      validBlocks = await applyScript(env, script, 'divyadesam_master', 'canonical_name',
        validBlocks, r => r.divyadesam_id, 'canonical_name');
    }

    // ── Global thaniyan ──
    const renderSect = url.searchParams.get("sect") || "T";
    const globalThaniyan = await env.db.prepare(
      `SELECT l.line_id, l.line_no, l.line_text, l.line_role, l.line_group
       FROM thaniyan_line_master l
       WHERE l.thaniyan_ref = 'global'
       AND (l.sect = ? OR l.sect = 'B')
       ORDER BY l.line_no`
    ).bind(renderSect).all();
    /* thaniyan_line_master's own key column is line_id, not id. */
    let globalThaniyanRows = globalThaniyan.results || [];
    if (script) {
      globalThaniyanRows = await applyScript(env, script, 'thaniyan_line_master', 'line_text',
        globalThaniyanRows, r => r.line_id, 'line_text');
    }

    // ── Section thaniyans for sections appearing today ──
    // Dedup: sections sharing a thaniyan group only show once
    // Group rules: 1-2 share, 11-13 share (use lowest section_id as key)
    const THANIYAN_GROUP = { 2:1, 12:11, 13:11 };
    const rawSectionIds = [...new Set(
      (await Promise.all(validBlocks.map(b =>
        env.db.prepare(`SELECT section_id FROM pasuram_master WHERE global_no = ? LIMIT 1`)
          .bind(b.global_no).first()
      ))).filter(Boolean).map(r => r.section_id)
    )];
    // Map each section to its canonical thaniyan ref (deduped)
    const canonicalRefs = [...new Set(rawSectionIds.map(sid => THANIYAN_GROUP[sid] || sid))];

    const sectionThaniyans = {};
    await Promise.all(canonicalRefs.map(async sid => {
      const rows = await env.db.prepare(
        `SELECT l.line_id, l.line_no, l.line_text, l.line_role, l.line_group
         FROM thaniyan_line_master l WHERE l.thaniyan_ref = ? ORDER BY l.line_no`
      ).bind(`section_${sid}`).all();
      if (rows.results.length) sectionThaniyans[sid] = rows.results;
    }));

    // Same flattening as the desam lines: one pass for every section thaniyan.
    if (script) {
      const keys = Object.keys(sectionThaniyans);
      const flatT = [];
      for (const k of keys) flatT.push(...sectionThaniyans[k]);
      if (flatT.length) {
        const convT = await applyScript(env, script, 'thaniyan_line_master', 'line_text',
          flatT, r => r.line_id, 'line_text');
        let j = 0;
        for (const k of keys) sectionThaniyans[k] = sectionThaniyans[k].map(() => convT[j++]);
      }
    }

    return new Response(JSON.stringify({
      spin_day:         effectiveSpinDay,
      max_day:          MAX_DAY,
      paused,
      global_thaniyan:  globalThaniyanRows,
      section_thaniyans: sectionThaniyans,
      desam_blocks:     validBlocks
    }), { headers: CORS });

  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

async function handleGhoshti(request, env) {
  const url = new URL(request.url);
  try {
    if (request.method === "POST") {
      const body = await request.json();
      const { plan_id, mobile, ghoshti_name, start_time } = body;
      if (!plan_id || !mobile || !start_time)
        return new Response(JSON.stringify({ error: "plan_id, mobile, start_time required" }), { status: 400, headers: CORS });
      const plan = await env.db.prepare(`SELECT plan_id FROM user_recital_plan WHERE plan_id = ? AND mobile = ? AND is_active = 1`).bind(Number(plan_id), mobile).first();
      if (!plan)
        return new Response(JSON.stringify({ error: "Plan not found or not authorized" }), { status: 403, headers: CORS });
      const ghoshti_id  = Math.random().toString(36).substring(2, 8);
      const ghoshtiDate = new Date(start_time);
      const nextDay     = new Date(ghoshtiDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0); // midnight of next day = expiry
      const expires_at = nextDay.toISOString(); // expires at 00:00 next day
      await env.db.prepare(`INSERT INTO ghoshti_session (ghoshti_id, plan_id, mobile, ghoshti_name, start_time, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`).bind(ghoshti_id, Number(plan_id), mobile, ghoshti_name || null, start_time, expires_at).run();
      return new Response(JSON.stringify({ success: true, ghoshti_id, link: `https://arulicheyal.org/ghoshti.html?id=${ghoshti_id}`, expires_at }), { headers: CORS });
    }

    if (request.method === "PUT") {
      const body = await request.json();
      const { ghoshti_id, mobile, ghoshti_name, start_time, plan_id } = body;
      if (!ghoshti_id || !mobile)
        return new Response(JSON.stringify({ error: "ghoshti_id and mobile required" }), { status: 400, headers: CORS });
      const session = await env.db.prepare(`SELECT ghoshti_id, mobile, start_time, is_active FROM ghoshti_session WHERE ghoshti_id = ?`).bind(ghoshti_id).first();
      if (!session)
        return new Response(JSON.stringify({ error: "Ghoshti session not found" }), { status: 404, headers: CORS });
      if (session.mobile !== mobile)
        return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: CORS });
      const today = new Date(); const ghoshtiDay = new Date(session.start_time);
      today.setHours(0,0,0,0); ghoshtiDay.setHours(0,0,0,0);
      if (today >= ghoshtiDay)
        return new Response(JSON.stringify({ error: "Editing is not allowed on or after ghoshti day" }), { status: 403, headers: CORS });
      let new_expires_at = null;
      if (start_time) {
        const nd = new Date(start_time); nd.setDate(nd.getDate()+1); nd.setHours(0,0,0,0);
        nd.setHours(0, 0, 0, 0); // midnight
        new_expires_at = nd.toISOString();
      }
      await env.db.prepare(`UPDATE ghoshti_session SET ghoshti_name=COALESCE(?,ghoshti_name), start_time=COALESCE(?,start_time), expires_at=COALESCE(?,expires_at), plan_id=COALESCE(?,plan_id) WHERE ghoshti_id=?`).bind(ghoshti_name||null, start_time||null, new_expires_at, plan_id?Number(plan_id):null, ghoshti_id).run();
      return new Response(JSON.stringify({ success: true, ghoshti_id, expires_at: new_expires_at }), { headers: CORS });
    }

    if (request.method === "DELETE") {
      const body = await request.json();
      const { ghoshti_id, mobile } = body;
      if (!ghoshti_id || !mobile)
        return new Response(JSON.stringify({ error: "ghoshti_id and mobile required" }), { status: 400, headers: CORS });
      const session = await env.db.prepare(`SELECT mobile FROM ghoshti_session WHERE ghoshti_id = ?`).bind(ghoshti_id).first();
      if (!session)
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS });
      if (session.mobile !== mobile)
        return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: CORS });
      await env.db.prepare(`DELETE FROM ghoshti_session WHERE ghoshti_id = ?`).bind(ghoshti_id).run();
      return new Response(JSON.stringify({ success: true }), { headers: CORS });
    }

    if (request.method === "GET") {
      const id     = url.searchParams.get("id");
      const mobile = url.searchParams.get("mobile");
      if (!id && mobile) {
        const sessions = await env.db.prepare(`
          SELECT ghoshti_id, ghoshti_name, start_time, expires_at, is_active, plan_id
          FROM ghoshti_session WHERE mobile = ? ORDER BY start_time DESC
        `).bind(mobile).all();
        return new Response(JSON.stringify({ sessions: sessions.results }), { headers: CORS });
      }
      if (!id)
        return new Response(JSON.stringify({ error: "id= required" }), { status: 400, headers: CORS });
      const session = await env.db.prepare(`SELECT ghoshti_id, plan_id, mobile, ghoshti_name, start_time, expires_at, is_active, sattrumurai_data FROM ghoshti_session WHERE ghoshti_id = ?`).bind(id).first();
      if (!session)
        return new Response(JSON.stringify({ error: "Ghoshti session not found" }), { status: 404, headers: CORS });
      const now = new Date(); const exp = new Date(session.expires_at);
      if (now > exp || !session.is_active)
        return new Response(JSON.stringify({ expired: true, message: "This ghoshti session has ended" }), { headers: CORS });
      const today = new Date(); const ghoshtiDay = new Date(session.start_time);
      today.setHours(0,0,0,0); ghoshtiDay.setHours(0,0,0,0);
      const isCreator    = mobile && mobile === session.mobile;
      const isGhoshtiDay = today >= ghoshtiDay;
      // Anyone with the link can view — no date restriction
      const host = await env.db.prepare(`SELECT name FROM user_master WHERE mobile = ? LIMIT 1`).bind(session.mobile).first();
      const renderUrl = new URL(request.url);
      renderUrl.pathname = "/recital/render";
      const reqSect      = url.searchParams.get("sect");
      const reqSubsect   = url.searchParams.get("subsect");
      const reqScript    = url.searchParams.get("script");
      renderUrl.search   = `?plan_id=${session.plan_id}`
        + (reqSect ? `&sect=${encodeURIComponent(reqSect)}` : "")
        + (reqSubsect ? `&subsect=${encodeURIComponent(reqSubsect)}` : "")
        + (reqScript ? `&script=${encodeURIComponent(reqScript)}` : "");
      const renderResponse = await handleRender(new Request(renderUrl.toString(), { method: "GET" }), env);
      const renderData     = await renderResponse.json();
      /* The saved sattrumurai is a frozen snapshot, so it needs rebuilding
         rather than converting. Without a script it is passed through
         untouched, exactly as production returns it. */
      let satData = session.sattrumurai_data ? JSON.parse(session.sattrumurai_data) : null;
      if (satData && reqScript) {
        try { satData = await convertSattrumuraiData(env, reqScript, satData); }
        catch (e) { /* a failed rebuild must never cost the ghoshti its sattrumurai */ }
      }
      return new Response(JSON.stringify({
        ghoshti_id:  session.ghoshti_id,
        ghoshti_name: session.ghoshti_name,
        start_time:  session.start_time,
        expires_at:  session.expires_at,
        host_name:   host?.name || "",
        is_creator:  isCreator,
        can_edit:    isCreator && !isGhoshtiDay,
        plan_id:     session.plan_id,
        blocks:      renderData.blocks,
        include_pothu_t: renderData.include_pothu_t,
        include_pothu_v: renderData.include_pothu_v,
        include_pothu_m: renderData.include_pothu_m,
        is_temple:       renderData.is_temple ? 1 : 0,
        sattrumurai_data: satData
      }), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH REGISTER
// ─────────────────────────────────────────────────────────────────────────────
async function handleAuthRegister(request, env) {
  if (request.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
  try {
    const body = await request.json();
    const { name, mobile, prefix, googleEmail, googleId } = body;
    if (!mobile || !name)
      return new Response(JSON.stringify({ error: "mobile and name required" }), { status: 400, headers: CORS });
    await env.db.prepare(`
      INSERT INTO user_master (mobile, name, prefix, google_email, google_id, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(mobile) DO UPDATE SET
        name=excluded.name, prefix=excluded.prefix,
        google_email=excluded.google_email, google_id=excluded.google_id,
        updated_at=datetime('now')
    `).bind(mobile, name, prefix||null, googleEmail||null, googleId||null).run();
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASURAM LINES
// ─────────────────────────────────────────────────────────────────────────────
async function handlePasuramLines(request, env) {
  const url = new URL(request.url);
  const no  = url.searchParams.get("no");
  try {
    if (!no || isNaN(Number(no)))
      return new Response(JSON.stringify({ error: "no= required" }), { status: 400, headers: CORS });
    const rows = await env.db.prepare(
      `SELECT id AS line_id, line_no, line_text, recital_group FROM pasuram_line_master WHERE global_no = ? ORDER BY line_no`
    ).bind(Number(no)).all();
    const plScript = url.searchParams.get("script");
    const plLines = plScript
      ? await applyScript(env, plScript, 'pasuram_line_master', 'line_text',
          rows.results || [], r => r.line_id, 'line_text')
      : rows.results;
    return new Response(JSON.stringify({ lines: plLines }), { headers: CORS });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETTAI
// ─────────────────────────────────────────────────────────────────────────────
async function handleRettai(request, env) {
  const url         = new URL(request.url);
  const entity_type = url.searchParams.get("entity_type");
  const entity_id   = Number(url.searchParams.get("entity_id"));
  const is_child    = url.searchParams.get("is_child") === "1";
  try {
    if (!entity_type || !entity_id)
      return new Response(JSON.stringify({ error: "entity_type= and entity_id= required" }), { status: 400, headers: CORS });
    let rows;

    if (entity_type === "section") {
      // Sections 22/23 (திருமடல்) — rettai handled via madal block type, not pasuram list
      // Return a non-empty marker so the popup doesn't say "No Rettai pasurams found"
      // The actual rettai rendering is done by renderMadal(isRettai=true) in recital.html
      if (entity_id === 22 || entity_id === 23)
        return new Response(JSON.stringify({ pasurams: [{ global_no: entity_id === 22 ? 2673 : 2674 }] }), { headers: CORS });
      rows = await env.db.prepare(
        `SELECT global_no FROM pasuram_master WHERE section_id = ? AND double_recital = 1 ORDER BY global_no`
      ).bind(entity_id).all();

    } else if (entity_type === "pathu") {
      const pathuRow = await env.db.prepare(
        `SELECT section_id, pathu_no FROM pathu_master WHERE pathu_id = ? LIMIT 1`
      ).bind(entity_id).first();
      if (!pathuRow) return new Response(JSON.stringify({ pasurams: [] }), { headers: CORS });
      if (is_child) {
        rows = await env.db.prepare(
          `SELECT global_no FROM pasuram_master WHERE pathu_id = ? AND double_recital = 1 ORDER BY global_no`
        ).bind(entity_id).all();
      } else {
        rows = await env.db.prepare(`
          SELECT p.global_no FROM pasuram_master p
          WHERE p.pathu_id IN (SELECT pathu_id FROM pathu_master WHERE section_id = ? AND pathu_no = ?)
          AND p.double_recital = 1 ORDER BY p.global_no
        `).bind(pathuRow.section_id, pathuRow.pathu_no).all();
      }

    } else if (entity_type === "thirumozhi") {
      rows = await env.db.prepare(
        `SELECT global_no FROM pasuram_master WHERE thirumozhi_id = ? AND double_recital = 1 ORDER BY global_no`
      ).bind(entity_id).all();

    } else {
      return new Response(JSON.stringify({ error: "Invalid entity_type" }), { status: 400, headers: CORS });
    }
    return new Response(JSON.stringify({ pasurams: rows.results }), { headers: CORS });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE LABELS
// ─────────────────────────────────────────────────────────────────────────────
async function handleResolveLabels(request, env) {
  try {
    const url   = new URL(request.url);
    const script = url.searchParams.get("script");
    const body  = await request.json();
    const items = body.items;
    if (!items || !items.length)
      return new Response(JSON.stringify({ labels: [] }), { headers: CORS });

    /* Rows are fetched first, converted in one pass per table, then composed.
       Converting inside the per-item loop would mean a text_script query per
       label; this way it is a handful whatever the plan's size. */
    const rowOf = new Map();   // "type:id" -> row
    // Sthothram labels come straight from the stotra tables' script columns
    const stotraLabelOf = new Map();
    await Promise.all(items.filter(it => it.entity_type === "stotra" || it.entity_type === "stotra_part").map(async it => {
      try { stotraLabelOf.set(`${it.entity_type}:${it.entity_id}`, await stotraLabel(env, it.entity_type, it.entity_id, stotraScript(url))); } catch (e) {}
    }));
    await Promise.all(items.map(async item => {
      const { entity_type, entity_id } = item;
      let row = null;
      try {
        if (entity_type === "section") {
          row = await env.db.prepare(`SELECT section_id, section_name FROM section_master WHERE section_id = ? LIMIT 1`).bind(entity_id).first();
        } else if (entity_type === "pathu") {
          row = await env.db.prepare(`SELECT pm.pathu_id, pm.section_id, pm.section_name, pm.pathu_name, pm.pathu_subunit_name, pm.thirumozhi_heading, pm.pathu_no FROM pathu_master pm WHERE pm.pathu_id = ? LIMIT 1`).bind(entity_id).first();
        } else if (entity_type === "thirumozhi") {
          row = await env.db.prepare(`SELECT tm.thirumozhi_id, tm.section_id, tm.thirumozhi_heading, tm.thirumozhi_name, sm.section_name FROM thirumozhi_master tm JOIN section_master sm ON tm.section_id = sm.section_id WHERE tm.thirumozhi_id = ? LIMIT 1`).bind(entity_id).first();
        } else if (entity_type === "pasuram") {
          row = await env.db.prepare(`SELECT p.global_no, p.section_id, p.pathu_id, s.section_name, pm.pathu_name, pm.pathu_subunit_name FROM pasuram_master p JOIN section_master s ON p.section_id = s.section_id LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id WHERE p.global_no = ? LIMIT 1`).bind(entity_id).first();
        }
      } catch (e) {}
      if (row) rowOf.set(`${entity_type}:${entity_id}`, row);
    }));

    let koilUi = {};
    if (script) {
      const byType = { section: [], pathu: [], thirumozhi: [], pasuram: [] };
      for (const [k, v] of rowOf) byType[k.split(":")[0]].push(v);

      const conv = async (rows, table, col, idOf, field) =>
        rows.length ? await applyScript(env, script, table, col, rows, idOf, field || col) : rows;

      // section_name reaches three of the four shapes, so they convert together
      const withSection = [...byType.section, ...byType.pathu, ...byType.thirumozhi, ...byType.pasuram];
      await conv(withSection, 'section_master', 'section_name', r => r.section_id)
        .then(out => out.forEach((r, i) => { withSection[i].section_name = r.section_name; }));

      for (const [rows, table, col, idOf] of [
        [byType.pathu,      'pathu_master',      'pathu_name',         r => r.pathu_id],
        [byType.pathu,      'pathu_master',      'pathu_subunit_name', r => r.pathu_id],
        [byType.pathu,      'pathu_master',      'thirumozhi_heading', r => r.pathu_id],
        [byType.thirumozhi, 'thirumozhi_master', 'thirumozhi_name',    r => r.thirumozhi_id],
        [byType.thirumozhi, 'thirumozhi_master', 'thirumozhi_heading', r => r.thirumozhi_id],
        [byType.pasuram,    'pathu_master',      'pathu_name',         r => r.pathu_id],
        [byType.pasuram,    'pathu_master',      'pathu_subunit_name', r => r.pathu_id],
      ]) {
        const out = await conv(rows, table, col, idOf);
        out.forEach((r, i) => { rows[i][col] = r[col]; });
      }

      koilUi = await uiTextMap(env, script, ["nnc.koil.thirumozhi", "nnc.koil.thiruvaimozhi"]);
    }

    const labels = items.map(item => {
      const { entity_type, entity_id } = item;
      let label = `${entity_type} ${entity_id}`;
      const row = rowOf.get(`${entity_type}:${entity_id}`);
      try {
        if (entity_type === "section") {
          if (row) label = row.section_name;
        } else if (entity_type === "pathu") {
          if (row) {
            // item.pathu_id set = specific thirumozhi → show all parts
            // item.pathu_id null = full pathu → show section — pathu only
            if (item.pathu_id) {
              const parts = [row.section_name, row.pathu_name, row.pathu_subunit_name, row.thirumozhi_heading].filter(Boolean);
              label = parts.join(" — ");
            } else {
              label = `${row.section_name} — ${row.pathu_name}`;
            }
          }
        } else if (entity_type === "thirumozhi") {
          if (row) {
            const parts = [row.section_name, row.thirumozhi_name, row.thirumozhi_heading].filter(Boolean);
            label = parts.join(" — ");
          }
        } else if (entity_type === "pasuram") {
          if (row) {
            label = `Pasuram ${row.global_no} — ${row.section_name}`;
            if (row.pathu_name)         label += ` — ${row.pathu_name}`;
            if (row.pathu_subunit_name) label += ` — ${row.pathu_subunit_name}`;
          }
        } else if (entity_type === "koil") {
          label = entity_id === 1
            ? (koilUi["nnc.koil.thirumozhi"]    || "கோயில் திருமொழி")
            : (koilUi["nnc.koil.thiruvaimozhi"] || "கோயில் திருவாய்மொழி");
        } else if (entity_type === "stotra" || entity_type === "stotra_part") {
          label = stotraLabelOf.get(`${entity_type}:${entity_id}`) || label;
        }
      } catch(e) {}
      return {
        entity_type,
        entity_id,
        label,
        is_rettai:       item.is_rettai       || 0,
        global_no_start: item.global_no_start || 0,
        pathu_id:        item.pathu_id        || null,
        section_id:      item.section_id      || null,
        item_opt:        item.item_opt        || null
      };
    });
    return new Response(JSON.stringify({ labels }), { headers: CORS });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// ── Vazhi list ────────────────────────────────────────────────────
// ── Fixed text lines ─────────────────────────────────────────────
async function handleFixedText(request, env) {
  const url = new URL(request.url);
  const id  = Number(url.searchParams.get("id"));
  if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), { status: 400, headers: CORS });
  try {
    const master = await env.db.prepare(
      `SELECT fixed_id, name FROM fixed_text_master WHERE fixed_id = ?`
    ).bind(id).first();
    if (!master) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404, headers: CORS });
    const lines = await env.db.prepare(
      `SELECT line_no, line_text FROM fixed_text_line_master WHERE fixed_id = ? ORDER BY line_no`
    ).bind(id).all();
    const ftScript = url.searchParams.get("script");
    let ftName = master.name, ftLines = lines.results || [];
    if (ftScript) {
      ftName = (await applyScript(env, ftScript, 'fixed_text_master', 'name',
        [master], r => r.fixed_id, 'name'))[0].name;
      // fixed_text_line_master is keyed on the pair fixed_id|line_no
      ftLines = await applyScript(env, ftScript, 'fixed_text_line_master', 'line_text',
        ftLines, r => `${id}|${r.line_no}`, 'line_text');
    }
    return new Response(JSON.stringify({
      success: true,
      fixed_id: master.fixed_id,
      name: ftName,
      lines: ftLines
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { headers: CORS });
  }
}

// ── Vazhi thirunamam lines ────────────────────────────────────────
async function handleVazhiLines(request, env) {
  const url = new URL(request.url);
  const id  = Number(url.searchParams.get("id"));
  if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), { status: 400, headers: CORS });
  try {
    const master = await env.db.prepare(`
      SELECT v.vazhi_id, v.entity_id, a.canonical_name AS author_name
      FROM vazhi_thirunamam_master v
      LEFT JOIN author_master a ON a.author_id = v.entity_id
      WHERE v.vazhi_id = ?
    `).bind(id).first();
    if (!master) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404, headers: CORS });
    const lines = await env.db.prepare(
      `SELECT line_no, line_text, vazhi_group FROM vazhi_thirunamam_line_master WHERE vazhi_id = ? ORDER BY vazhi_group, line_no`
    ).bind(id).all();
    const vlScript = url.searchParams.get("script");
    let vlName = master.author_name || "", vlLines = lines.results || [];
    if (vlScript) {
      vlName = (await applyScript(env, vlScript, 'author_master', 'canonical_name',
        [{ entity_id: master.entity_id, canonical_name: vlName }],
        r => r.entity_id, 'canonical_name'))[0].canonical_name || "";
      // composite key: vazhi_id|vazhi_group|line_no
      vlLines = await applyScript(env, vlScript, 'vazhi_thirunamam_line_master', 'line_text',
        vlLines, r => `${id}|${r.vazhi_group}|${r.line_no}`, 'line_text');
    }
    return new Response(JSON.stringify({
      success: true,
      vazhi_id: master.vazhi_id,
      author_name: vlName,
      lines: vlLines
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { headers: CORS });
  }
}

async function handleVazhiList(request, env) {
  try {
    const vListScript = new URL(request.url).searchParams.get("script");
    const rows = await env.db.prepare(`
      SELECT v.vazhi_id, v.entity_id, v.display_order,
             a.canonical_name AS author_name,
             (SELECT line_text FROM vazhi_thirunamam_line_master
              WHERE vazhi_id = v.vazhi_id AND line_no = 1 LIMIT 1) AS vazhi_name
      FROM vazhi_thirunamam_master v
      LEFT JOIN author_master a ON a.author_id = v.entity_id
      ORDER BY v.display_order ASC
    `).all();
    let vaazhis = rows.results || [];
    if (vListScript) {
      vaazhis = await applyScript(env, vListScript, 'author_master', 'canonical_name',
        vaazhis, r => r.entity_id, 'author_name');
      // vazhi_name is line 1 of the vazhi, keyed vazhi_id|group|line_no
      vaazhis = await applyScript(env, vListScript, 'vazhi_thirunamam_line_master', 'line_text',
        vaazhis, r => `${r.vazhi_id}|1|1`, 'vazhi_name');
    }
    return new Response(JSON.stringify({ success: true, vaazhis }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { headers: CORS });
  }
}

// ── Madal sattrumurai lines ───────────────────────────────────────
async function handleMadalSattrumurai(request, env) {
  const url = new URL(request.url);
  const id  = Number(url.searchParams.get("id"));
  if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), { status: 400, headers: CORS });
  try {
    const master = await env.db.prepare(`
      SELECT madal_sattrumurai_id, title, notes FROM madal_sattrumurai_master WHERE madal_sattrumurai_id = ?
    `).bind(id).first();
    if (!master) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404, headers: CORS });
    const lines = await env.db.prepare(`
      SELECT line_no, line_text, is_dual_recital FROM madal_sattrumurai_line_master
      WHERE madal_sattrumurai_id = ? ORDER BY line_no ASC
    `).bind(id).all();
    const msScript = url.searchParams.get("script");
    let msTitle = master.title, msLines = lines.results || [];
    if (msScript) {
      msTitle = (await applyScript(env, msScript, 'madal_sattrumurai_master', 'title',
        [master], r => r.madal_sattrumurai_id, 'title'))[0].title;
      msLines = await applyScript(env, msScript, 'madal_sattrumurai_line_master', 'line_text',
        msLines, r => `${id}|${r.line_no}`, 'line_text');
    }
    return new Response(JSON.stringify({
      success: true,
      title:   msTitle,
      notes:   master.notes,
      lines:   msLines,
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { headers: CORS });
  }
}

// ── Ghoshti sattrumurai: rebuild the saved snapshot in the chosen script ──
//
// sattrumurai_data is a frozen JSON blob, written the moment the host saved
// the sattrumurai, so &script= cannot reach it the way it reaches an ordinary
// query. Every piece of it does carry the id it came from, though — global_no
// for a pasuram, madalId + line_no for a madal line, fixed_id + line_no for a
// fixed text, vazhi_id + vazhi_group + line_no for a vazhi line — and each
// heading carries the key it was composed from. So the blob is REBUILT from
// the database here rather than transliterated, which means every line the
// ghoshti recites is the same row the rest of the page is already showing.
//
// Anything whose source cannot be identified — a heading shape we don't know,
// a row the converter hasn't reached — keeps its stored Tamil. The reciter
// gets the right words either way; the worst case is a Tamil line on a Telugu
// page, never a missing or wrong one.
//
// Never called without a script, so the Tamil response is the stored blob,
// byte for byte.

// The heading vocabulary, mirroring ghoshtiSattrumurai.js. These live in
// ui_text_master because they are composed in the browser and so have no
// content row of their own.
const GSAT_SECTION_IDS = [2,3,4,5,6,7,9,10,11,12,13,14,15,16,17,18,20,22,23,26];
const GSAT_EXPLICIT_KEYS = ["ramanusa", "upadesa", "thiruvaimozhi_nootrandhadhi",
  "adaikkalappathu", "adhikara_sangraham", "prabandha_saram", "pillaiyandhadhi",
  "adivan_adaikkalappathu", "lakshmi_adaikkalappathu"];

async function convertSattrumuraiData(env, script, data) {
  if (!script || !data) return data;

  // Work on a copy — the caller still owns the parsed blob.
  const d = JSON.parse(JSON.stringify(data));
  const pasurams = Array.isArray(d.pasurams) ? d.pasurams : [];

  // ── 1. heading vocabulary ────────────────────────────────────────────────
  const uiKeys = ["rec.sattru.heading", "gsat.head.pallandu", "gsat.head.section10",
    "gsat.surnikai.name", "gsat.madhurakavi.1", "gsat.madhurakavi.2",
    "gsat.madhurakavi.3", "gsat.madhurakavi.4"];
  for (let i = 1; i <= 11; i++)        uiKeys.push("gsat.pathu." + i);
  for (const s of GSAT_SECTION_IDS)    uiKeys.push("gsat.section." + s);
  for (const k of GSAT_EXPLICIT_KEYS)  uiKeys.push("gsat.explicit." + k);
  const ui  = await uiTextMap(env, script, uiKeys);
  const SAT = ui["rec.sattru.heading"] || "";

  // ── 2. manual headings — composed from the row the pasuram came from ─────
  const manual = {};
  const manualKeys = [...new Set(pasurams
    .filter(p => p && p.type === "heading" && typeof p.group === "string"
                 && p.group.indexOf("manual_sec_") === 0)
    .map(p => p.group))];
  for (const key of manualKeys) {
    let m;
    if ((m = key.match(/^manual_sec_(\d+)_pathu_(\d+)$/))) {
      const q = await env.db.prepare(
        `SELECT pm.pathu_id, s.section_id, s.section_name, pm.pathu_name,
                pm.pathu_subunit_name, pm.thirumozhi_heading
         FROM   pathu_master pm
         JOIN   section_master s ON s.section_id = pm.section_id
         WHERE  pm.pathu_id = ? LIMIT 1`).bind(Number(m[2])).all();
      let rows = q.results || [];
      if (!rows.length) continue;
      rows = await applyScript(env, script, 'section_master', 'section_name',        rows, r => r.section_id, 'section_name');
      rows = await applyScript(env, script, 'pathu_master',   'pathu_name',          rows, r => r.pathu_id,   'pathu_name');
      rows = await applyScript(env, script, 'pathu_master',   'pathu_subunit_name',  rows, r => r.pathu_id,   'pathu_subunit_name');
      rows = await applyScript(env, script, 'pathu_master',   'thirumozhi_heading',  rows, r => r.pathu_id,   'thirumozhi_heading');
      const r = rows[0];
      const parts = [r.section_name, r.pathu_name, r.pathu_subunit_name].filter(Boolean);
      if (r.thirumozhi_heading) parts.push("(" + r.thirumozhi_heading + ")");
      if (parts.length) manual[key] = parts.join(" \u2014 ");

    } else if ((m = key.match(/^manual_sec_(\d+)_tm_(\d+)$/))) {
      const q = await env.db.prepare(
        `SELECT tm.thirumozhi_id, s.section_id, s.section_name,
                tm.thirumozhi_name, tm.thirumozhi_heading
         FROM   thirumozhi_master tm
         JOIN   section_master s ON s.section_id = tm.section_id
         WHERE  tm.thirumozhi_id = ? LIMIT 1`).bind(Number(m[2])).all();
      let rows = q.results || [];
      if (!rows.length) continue;
      rows = await applyScript(env, script, 'section_master',    'section_name',       rows, r => r.section_id,    'section_name');
      rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_name',    rows, r => r.thirumozhi_id, 'thirumozhi_name');
      rows = await applyScript(env, script, 'thirumozhi_master', 'thirumozhi_heading', rows, r => r.thirumozhi_id, 'thirumozhi_heading');
      const r = rows[0];
      const parts = [r.section_name, r.thirumozhi_name].filter(Boolean);
      if (r.thirumozhi_heading) parts.push("(" + r.thirumozhi_heading + ")");
      if (parts.length) manual[key] = parts.join(" \u2014 ");

    } else if ((m = key.match(/^manual_sec_(\d+)$/))) {
      const q = await env.db.prepare(
        `SELECT section_id, section_name FROM section_master WHERE section_id = ? LIMIT 1`
      ).bind(Number(m[1])).all();
      let rows = q.results || [];
      if (!rows.length) continue;
      rows = await applyScript(env, script, 'section_master', 'section_name', rows, r => r.section_id, 'section_name');
      if (rows[0].section_name) manual[key] = rows[0].section_name;
    }
  }

  // A heading's stored `group` IS the key it was composed from — which is what
  // makes it rebuildable without matching any Tamil text. null means "leave
  // the stored heading alone".
  function headingFor(key) {
    if (!key) return null;
    if (key === "pallandu_heading")  return ui["gsat.head.pallandu"]  || null;
    if (key === "section10_heading") return ui["gsat.head.section10"] || null;
    // Thiruppavai is the one group keyed by name rather than section id,
    // because it is added before the section loop runs.
    if (key === "thiruppavai_heading")
      return (SAT && ui["gsat.section.3"]) ? (ui["gsat.section.3"] + " " + SAT) : null;
    if (manual[key]) return manual[key];
    // every remaining form ends in "சாற்றுமுறை பாசுரங்கள்"
    if (!SAT) return null;
    let m;
    if ((m = key.match(/^(\d+)_(\d+)_heading$/))) {
      const sec = ui["gsat.section." + m[1]], pathu = ui["gsat.pathu." + m[2]];
      return (sec && pathu) ? (sec + " \u2014 " + pathu + " " + SAT) : null;
    }
    if ((m = key.match(/^madal_(\d+)_heading$/))) {
      const sec = ui["gsat.section." + m[1]];
      return sec ? (sec + " " + SAT) : null;
    }
    if ((m = key.match(/^madal_manual_(\d+)$/))) {
      // keyed on the madal's global_no, not its section
      const sid = Number(m[1]) === 2673 ? 22 : Number(m[1]) === 2674 ? 23 : null;
      const sec = sid ? ui["gsat.section." + sid] : null;
      return sec ? (sec + " " + SAT) : null;
    }
    if ((m = key.match(/^explicit_(.+)_heading$/))) {
      const lab = ui["gsat.explicit." + m[1]];
      return lab ? (lab + " " + SAT) : null;
    }
    if ((m = key.match(/^(\d+)_heading$/))) {
      const sec = ui["gsat.section." + m[1]];
      return sec ? (sec + " " + SAT) : null;
    }
    return null;
  }

  // ── 3. pasuram lines — refetched from pasuram_line_master ────────────────
  // The setup screen built these by taking every non-empty line of the
  // global_no in line_no order, so rebuilding the same way reproduces it
  // exactly, and the recital_group that drives the ** marker comes along.
  const gnos = [...new Set(pasurams
    .filter(p => p && p.type === "pasuram" && p.global_no != null)
    .map(p => Number(p.global_no)))];
  const lineMap = {};
  if (gnos.length) {
    let rows = await _inQuery(env, gnos,
      `SELECT id AS line_id, global_no, line_no, line_text, recital_group
       FROM   pasuram_line_master
       WHERE  global_no IN (__IN__)
       ORDER  BY global_no, line_no`);
    rows = await applyScript(env, script, 'pasuram_line_master', 'line_text',
      rows, r => r.line_id, 'line_text');
    for (const r of rows) {
      if (!r.line_text) continue;
      (lineMap[r.global_no] = lineMap[r.global_no] || [])
        .push({ text: r.line_text, group: r.recital_group || 1 });
    }
  }

  // ── 4. madal sattrumurai lines — keyed madal_sattrumurai_id|line_no ──────
  const madalItems = pasurams.filter(p => p && p.type === "madal_lines" && Array.isArray(p.lines));
  if (madalItems.length) {
    const flat = [];
    for (const it of madalItems)
      for (const l of it.lines) flat.push({ __k: it.madalId + "|" + l.line_no, line_text: l.line_text });
    const conv = await applyScript(env, script, 'madal_sattrumurai_line_master', 'line_text',
      flat, r => r.__k, 'line_text');
    let i = 0;
    for (const it of madalItems)
      for (const l of it.lines) l.line_text = conv[i++].line_text;

    const titles = await applyScript(env, script, 'madal_sattrumurai_master', 'title',
      madalItems.map(it => ({ madal_sattrumurai_id: it.madalId, title: it.title })),
      r => r.madal_sattrumurai_id, 'title');
    madalItems.forEach((it, i2) => { it.title = titles[i2].title; });
  }

  // ── 5. headings and the one hardcoded verse ──────────────────────────────
  for (const p of pasurams) {
    if (!p) continue;
    if (p.type === "heading") {
      const h = headingFor(p.group);
      if (h) p.text = h;
    } else if (p.type === "pasuram") {
      const built = lineMap[Number(p.global_no)];
      if (built && built.length) p.lines = built;
    } else if (p.type === "text_block" && p.group === "madhurakavi_verse") {
      // Four lines written into ghoshtiSattrumurai.js rather than fetched,
      // so they have ui_text rows of their own.
      const v = [1, 2, 3, 4].map(n => ui["gsat.madhurakavi." + n]);
      if (v.every(Boolean)) p.lines = v;
    }
  }

  // ── 6. fixed text blocks — keyed on the pair fixed_id|line_no ────────────
  for (const fb of (Array.isArray(d.fixed_blocks) ? d.fixed_blocks : [])) {
    if (!fb || fb.fixed_id == null || !Array.isArray(fb.lines)) continue;
    fb.lines = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
      fb.lines, l => fb.fixed_id + "|" + l.line_no, 'line_text');
  }

  // ── 7. vazhi thirunamam ─────────────────────────────────────────────────
  // Lines are keyed vazhi_id|vazhi_group|line_no; the author name comes from
  // author_master via the vazhi's entity_id — never from the stored string.
  // The சூர்ணிகை block is not a vazhi at all (fixed_id 4), so it takes the
  // fixed-text path and a ui_text name.
  const vBlocks  = Array.isArray(d.vazhi_blocks) ? d.vazhi_blocks : [];
  const vazhiIds = [...new Set(vBlocks.filter(v => v && v.vazhi_id != null).map(v => Number(v.vazhi_id)))];
  const authorOf = {};
  if (vazhiIds.length) {
    let rows = await _inQuery(env, vazhiIds,
      `SELECT v.vazhi_id, v.entity_id, a.canonical_name AS author_name
       FROM   vazhi_thirunamam_master v
       LEFT   JOIN author_master a ON a.author_id = v.entity_id
       WHERE  v.vazhi_id IN (__IN__)`);
    rows = await applyScript(env, script, 'author_master', 'canonical_name',
      rows, r => r.entity_id, 'author_name');
    for (const r of rows) if (r.author_name) authorOf[r.vazhi_id] = r.author_name;
  }
  for (const vb of vBlocks) {
    if (!vb) continue;
    if (vb.vazhi_id != null) {
      if (authorOf[vb.vazhi_id]) vb.author_name = authorOf[vb.vazhi_id];
      if (Array.isArray(vb.lines)) {
        vb.lines = await applyScript(env, script, 'vazhi_thirunamam_line_master', 'line_text',
          vb.lines, l => vb.vazhi_id + "|" + (l.vazhi_group || 1) + "|" + l.line_no, 'line_text');
      }
    } else if (vb.fixed_id != null) {
      if (Number(vb.fixed_id) === 4 && ui["gsat.surnikai.name"]) vb.author_name = ui["gsat.surnikai.name"];
      if (Array.isArray(vb.lines)) {
        vb.lines = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
          vb.lines, l => vb.fixed_id + "|" + l.line_no, 'line_text');
      }
    }
  }

  // ── 8. the three mangalams — fixed_text_line_master ids 3, 7 and 6 ───────
  const MANGALAM = [["muktaka_lines", 3], ["desika_lines", 7], ["adivan_lines", 6]];
  for (const [field, fid] of MANGALAM) {
    if (!Array.isArray(d[field]) || !d[field].length) continue;
    d[field] = await applyScript(env, script, 'fixed_text_line_master', 'line_text',
      d[field], l => fid + "|" + l.line_no, 'line_text');
  }

  return d;
}

// ── Ghoshti sattrumurai save ──────────────────────────────────────
async function handleGhoshtiSattrumurai(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (request.method !== "POST")
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: CORS });

  let body;
  try { body = await request.json(); } catch(e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }

  const { ghoshti_id, pasurams, explicit, vaazhis, fixed_text_1, fixed_text_2, madal, fixed_blocks, vazhi_blocks, muktaka_lines, desika_lines, adivan_lines } = body;
  if (!ghoshti_id)
    return new Response(JSON.stringify({ error: "ghoshti_id required" }), { status: 400, headers: CORS });

  try {
    // Store sattrumurai payload as JSON in ghoshti_session
    const sattrumurai_data = JSON.stringify({
      pasurams:     pasurams     || [],
      explicit:     explicit     || [],
      vaazhis:      vaazhis      || [],
      fixed_text_1: fixed_text_1 !== false,
      fixed_text_2: fixed_text_2 === true,
      madal:        madal        || [],
      fixed_blocks: fixed_blocks || [],
      vazhi_blocks: vazhi_blocks || [],
      muktaka_lines: muktaka_lines || [],
      desika_lines: desika_lines  || [],
      adivan_lines: adivan_lines  || [],
      saved_at:     new Date().toISOString(),
    });

    // Check if column exists — add if not (safe migration)
    await env.db.prepare(`
      UPDATE ghoshti_session SET sattrumurai_data = ? WHERE ghoshti_id = ?
    `).bind(sattrumurai_data, ghoshti_id).run();

    return new Response(JSON.stringify({ success: true, ghoshti_id }), { headers: CORS });
  } catch(e) {
    // Column may not exist yet — return helpful error
    return new Response(JSON.stringify({
      success: false,
      error: e.message,
      hint: "Run: ALTER TABLE ghoshti_session ADD COLUMN sattrumurai_data TEXT"
    }), { status: 500, headers: CORS });
  }
}