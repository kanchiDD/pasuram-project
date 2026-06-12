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
    if (url.pathname.includes("/recital/catalog"))        return handleCatalog(request, env);
    if (url.pathname.includes("/recital/pasuram-lookup")) return handlePasuramLookup(request, env);
    if (url.pathname.includes("/recital/pasuram-lines"))  return handlePasuramLines(request, env);
    if (url.pathname.includes("/recital/plan"))           return handlePlan(request, env);
    if (url.pathname.includes("/recital/render"))         return handleRender(request, env);
    if (url.pathname.includes("/recital/panchangam"))      return handlePanchangam(request, env);
    if (url.pathname.includes("/recital/spinner"))        return handleSpinner(request, env);
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
// CATALOG
// ─────────────────────────────────────────────────────────────────────────────
async function handleCatalog(request, env) {
  const url = new URL(request.url);
  try {
    if (!url.searchParams.has("section_id") && !url.searchParams.has("pathu_id") && !url.searchParams.has("pathu_no")) {
      const [thousands, sections] = await Promise.all([
        env.db.prepare(`SELECT thousand_id, canonical_name FROM thousands_master ORDER BY sequence_no`).all(),
        env.db.prepare(`SELECT section_id, section_name, thousand_id, global_no_start FROM section_master ORDER BY section_id`).all()
      ]);
      const result = thousands.results.map(t => ({
        thousand_id:   t.thousand_id,
        thousand_name: t.canonical_name,
        sections: sections.results
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
        return new Response(JSON.stringify({ type: "pathu", items: result.results }), { headers: CORS });
      } else if (THIRUMOZHI_SECTIONS.has(section_id)) {
        const result = await env.db.prepare(`
          SELECT thirumozhi_id, thirumozhi_name, thirumozhi_no,
                 thirumozhi_heading, global_no_start, global_no_end
          FROM thirumozhi_master WHERE section_id = ? ORDER BY thirumozhi_no
        `).bind(section_id).all();
        return new Response(JSON.stringify({ type: "thirumozhi", items: result.results }), { headers: CORS });
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
      return new Response(JSON.stringify({ type: "thirumozhi", items: result.results }), { headers: CORS });
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
            SELECT plan_id, plan_name, day_of_week, is_active
            FROM user_recital_plan WHERE plan_id = ? AND mobile = ? LIMIT 1
          `).bind(Number(plan_id), mobile).first()
        : await env.db.prepare(`
            SELECT plan_id, plan_name, day_of_week, is_active
            FROM user_recital_plan
            WHERE mobile = ? AND day_of_week IN (?, 7) AND is_active = 1
            ORDER BY day_of_week ASC LIMIT 1
          `).bind(mobile, Number(day)).first();
      if (!plan) return new Response(JSON.stringify({ plan: null, items: [] }), { headers: CORS });
      const items = await env.db.prepare(`
        SELECT item_id, sequence_no, entity_type, entity_id,
               is_rettai, global_no_start, pathu_id, section_id
        FROM user_recital_item WHERE plan_id = ? ORDER BY sequence_no
      `).bind(plan.plan_id).all();
      return new Response(JSON.stringify({ plan, items: items.results }), { headers: CORS });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const { mobile, day_of_week, plan_name, items } = body;
      if (!mobile || day_of_week === undefined || !items)
        return new Response(JSON.stringify({ error: "mobile, day_of_week, items required" }), { status: 400, headers: CORS });
      await env.db.prepare(`
        INSERT INTO user_recital_plan (mobile, day_of_week, plan_name, is_active, updated_at)
        VALUES (?, ?, ?, 1, datetime('now'))
        ON CONFLICT(mobile, day_of_week)
        DO UPDATE SET plan_name = excluded.plan_name, is_active = 1, updated_at = datetime('now')
      `).bind(mobile, day_of_week, plan_name || null).run();
      const plan = await env.db.prepare(
        `SELECT plan_id FROM user_recital_plan WHERE mobile = ? AND day_of_week = ?`
      ).bind(mobile, day_of_week).first();
      const plan_id = plan.plan_id;
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
             is_rettai, global_no_start, pathu_id, section_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          plan_id, i + 1,
          item.entity_type, item.entity_id,
          item.is_rettai ? 1 : 0,
          gns,
          item.pathu_id   || null,
          item.section_id || null
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
  try {
    if (!plan_id)
      return new Response(JSON.stringify({ error: "plan_id= required" }), { status: 400, headers: CORS });

    // ── Step 1: fetch plan items, global thaniyan, sattrumurai set, section modes ──
    const [itemRows, globalThaniyanRows, sattrumuraiRows, sectionModeRows] = await Promise.all([
      env.db.prepare(`SELECT item_id, sequence_no, entity_type, entity_id, is_rettai, pathu_id, section_id FROM user_recital_item WHERE plan_id = ? ORDER BY sequence_no`).bind(Number(plan_id)).all(),
      env.db.prepare(`SELECT l.line_no, l.line_text, l.line_type, l.line_role, l.line_group, l.prosody_id FROM thaniyan_line_master l WHERE l.thaniyan_ref = 'global' ORDER BY l.line_no`).all(),
      env.db.prepare(`SELECT entity_type, entity_id FROM recital_sattrumurai`).all(),
      env.db.prepare(`SELECT section_id, thaniyan_display_mode FROM section_master`).all()
    ]);

    const items = itemRows.results;
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
      env.db.prepare(`SELECT l.line_no, l.line_text, l.line_type, l.line_role, l.line_group, l.prosody_id FROM thaniyan_line_master l WHERE l.thaniyan_ref = ? ORDER BY l.line_no`).bind(`section_${sid}`).all()
        .then(rows => { if (rows.results.length) sectionThaniyans[sid] = rows.results; })
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
      for (const r of closingRows.results) sectionClosingMap[r.section_id] = r.closing_text;

      // Prosody (global — same for all sections)
      const [psScope, psMaster] = await Promise.all([
        env.db.prepare(`SELECT prosody_id, start_global_no, end_global_no FROM prosody_scope_map`).all(),
        env.db.prepare(`SELECT prosody_id, canonical_name_tamil FROM prosody_master`).all()
      ]);
      prosodyScopeAll.push(...psScope.results);
      for (const r of psMaster.results) prosodyMasterMap[r.prosody_id] = r.canonical_name_tamil;

      // Display items — fetch for ALL sections (not filtered by thaniyan mode)
      for (const sid of allSectionIds) {
        const dispRows = await env.db.prepare(`
          SELECT entity_type, entity_id, meta_value, sequence_no,
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

        for (const r of dispRows.results) {
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
               l.line_no, l.line_text, l.recital_group,
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
        const koilTitle = item.entity_id === 1 ? "கோயில் திருமொழி" : "கோயில் திருவாய்மொழி";
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

    if (globalThaniyanRows.results.length)
      blocks.push({ block_type: "global_thaniyan", lines: globalThaniyanRows.results });

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
          sequence_no:     item.sequence_no,
          section_id:      section_id,
          section_name:    firstRow.section_name    || null,
          section_closing: sectionClosingMap[section_id] || firstRow.section_closing || null,
          display_items:   displayMap,
          prosody_scope:   prosodyScopeAll,
          prosody_master:  prosodyMasterMap,
          pasurams:        pasuramResults[i]
        });
      }

      // Sattrumurai
      if (sattrumuraiData[i])
        blocks.push({ block_type: "sattrumurai", entity_type: item.entity_type, entity_id: item.entity_id, items: sattrumuraiData[i] });
    }

    return new Response(JSON.stringify({ plan_id: Number(plan_id), blocks }), { headers: CORS });
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

    // ── Fetch all divyadesams in canonical order ──
    const desams = await env.db.prepare(
      `SELECT divyadesam_id, canonical_name FROM divyadesam_master ORDER BY divyadesam_id`
    ).all();

    // ── For each desam, get today's pasuram ──
    const MAX_DAY = 247; // Srirangam count — one full round
    const desamBlocks = await Promise.all(desams.results.map(async d => {
      // Get all pasurams for this desam in global_no order
      const pasurams = await env.db.prepare(
        `SELECT m.global_no, l.line_text, l.line_no, l.recital_group
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
      const idx = spinDay % pList.length;
      const [global_no, lines] = pList[idx];

      return {
        divyadesam_id:   d.divyadesam_id,
        canonical_name:  d.canonical_name,
        global_no,
        lines
      };
    }));

    const validBlocks = desamBlocks.filter(Boolean);

    // ── Global thaniyan ──
    const globalThaniyan = await env.db.prepare(
      `SELECT l.line_no, l.line_text, l.line_role, l.line_group
       FROM thaniyan_line_master l WHERE l.thaniyan_ref = 'global' ORDER BY l.line_no`
    ).all();

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
        `SELECT l.line_no, l.line_text, l.line_role, l.line_group
         FROM thaniyan_line_master l WHERE l.thaniyan_ref = ? ORDER BY l.line_no`
      ).bind(`section_${sid}`).all();
      if (rows.results.length) sectionThaniyans[sid] = rows.results;
    }));

    return new Response(JSON.stringify({
      spin_day:         spinDay,
      max_day:          MAX_DAY,
      paused,
      global_thaniyan:  globalThaniyan.results,
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
      nextDay.setHours(0, 0, 0, 0);
      const expires_at = new Date(nextDay.getTime() + 12 * 60 * 60 * 1000).toISOString();
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
        new_expires_at = new Date(nd.getTime()+12*60*60*1000).toISOString();
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
      const session = await env.db.prepare(`SELECT ghoshti_id, plan_id, mobile, ghoshti_name, start_time, expires_at, is_active FROM ghoshti_session WHERE ghoshti_id = ?`).bind(id).first();
      if (!session)
        return new Response(JSON.stringify({ error: "Ghoshti session not found" }), { status: 404, headers: CORS });
      const now = new Date(); const exp = new Date(session.expires_at);
      if (now > exp || !session.is_active)
        return new Response(JSON.stringify({ expired: true, message: "This ghoshti session has ended" }), { headers: CORS });
      const today = new Date(); const ghoshtiDay = new Date(session.start_time);
      today.setHours(0,0,0,0); ghoshtiDay.setHours(0,0,0,0);
      const isCreator   = mobile && mobile === session.mobile;
      const isGhoshtiDay = today >= ghoshtiDay;
      if (!isGhoshtiDay && !isCreator)
        return new Response(JSON.stringify({ error: "This ghoshti is not yet open for viewing" }), { status: 403, headers: CORS });
      const host = await env.db.prepare(`SELECT name FROM user_master WHERE mobile = ? LIMIT 1`).bind(session.mobile).first();
      const renderUrl = new URL(request.url);
      renderUrl.pathname = "/recital/render";
      renderUrl.search   = `?plan_id=${session.plan_id}`;
      const renderResponse = await handleRender(new Request(renderUrl.toString(), { method: "GET" }), env);
      const renderData     = await renderResponse.json();
      return new Response(JSON.stringify({
        ghoshti_id:  session.ghoshti_id,
        ghoshti_name: session.ghoshti_name,
        start_time:  session.start_time,
        expires_at:  session.expires_at,
        host_name:   host?.name || "",
        is_creator:  isCreator,
        can_edit:    isCreator && !isGhoshtiDay,
        plan_id:     session.plan_id,
        blocks:      renderData.blocks
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
      `SELECT line_no, line_text, recital_group FROM pasuram_line_master WHERE global_no = ? ORDER BY line_no`
    ).bind(Number(no)).all();
    return new Response(JSON.stringify({ lines: rows.results }), { headers: CORS });
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
    const body  = await request.json();
    const items = body.items;
    if (!items || !items.length)
      return new Response(JSON.stringify({ labels: [] }), { headers: CORS });
    const labels = await Promise.all(items.map(async item => {
      const { entity_type, entity_id } = item;
      let label = `${entity_type} ${entity_id}`;
      try {
        if (entity_type === "section") {
          const row = await env.db.prepare(`SELECT section_name FROM section_master WHERE section_id = ? LIMIT 1`).bind(entity_id).first();
          if (row) label = row.section_name;
        } else if (entity_type === "pathu") {
          const row = await env.db.prepare(`SELECT pm.section_name, pm.pathu_name, pm.pathu_subunit_name, pm.thirumozhi_heading, pm.pathu_no FROM pathu_master pm WHERE pm.pathu_id = ? LIMIT 1`).bind(entity_id).first();
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
          const row = await env.db.prepare(`SELECT tm.thirumozhi_heading, tm.thirumozhi_name, sm.section_name FROM thirumozhi_master tm JOIN section_master sm ON tm.section_id = sm.section_id WHERE tm.thirumozhi_id = ? LIMIT 1`).bind(entity_id).first();
          if (row) {
            const parts = [row.section_name, row.thirumozhi_name, row.thirumozhi_heading].filter(Boolean);
            label = parts.join(" — ");
          }
        } else if (entity_type === "pasuram") {
          const row = await env.db.prepare(`SELECT p.global_no, s.section_name, pm.pathu_name, pm.pathu_subunit_name FROM pasuram_master p JOIN section_master s ON p.section_id = s.section_id LEFT JOIN pathu_master pm ON p.pathu_id = pm.pathu_id WHERE p.global_no = ? LIMIT 1`).bind(entity_id).first();
          if (row) {
            label = `Pasuram ${row.global_no} — ${row.section_name}`;
            if (row.pathu_name)         label += ` — ${row.pathu_name}`;
            if (row.pathu_subunit_name) label += ` — ${row.pathu_subunit_name}`;
          }
        } else if (entity_type === "koil") {
          label = entity_id === 1 ? "கோயில் திருமொழி" : "கோயில் திருவாய்மொழி";
        }
      } catch(e) {}
      return {
        entity_type,
        entity_id,
        label,
        is_rettai:       item.is_rettai       || 0,
        global_no_start: item.global_no_start || 0,
        pathu_id:        item.pathu_id        || null,
        section_id:      item.section_id      || null
      };
    }));
    return new Response(JSON.stringify({ labels }), { headers: CORS });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
