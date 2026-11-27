var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// overlay-worker.js
var UPSTREAM = "https://cdnaalayiram-api.kanchitrust.workers.dev";
var VALID_SCRIPTS = ["te", "ml", "kn", "deva", "iast"];
var TEXT_KEYS = /* @__PURE__ */ new Set([
  "line_text",
  "text",
  "closing_text",
  "canonical_name",
  "canonical_name_tamil",
  "section_name",
  "section_closing",
  "pathu_name",
  "pathu_subunit_name",
  "thirumozhi_name",
  "thirumozhi_heading",
  "pathu_thirumozhi_heading",
  "tamil_name",
  "author_name",
  "display_label",
  "name",
  "line_1",
  "line_2",
  "line_3",
  "line_4",
  "line_5",
  "line_6",
  "line_7",
  "line_8"
]);
var CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
async function sha256_16(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
__name(sha256_16, "sha256_16");
function collect(node, out) {
  if (Array.isArray(node)) {
    for (const v of node) collect(v, out);
  } else if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") {
        if (TEXT_KEYS.has(k) && v.trim()) out.add(v);
      } else {
        collect(v, out);
      }
    }
  }
}
__name(collect, "collect");
function swap(node, map) {
  if (Array.isArray(node)) {
    for (const v of node) swap(v, map);
  } else if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") {
        if (TEXT_KEYS.has(k) && map.has(v)) node[k] = map.get(v);
      } else {
        swap(v, map);
      }
    }
  }
}
__name(swap, "swap");
var overlay_worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    const url = new URL(request.url);
    const script = (url.searchParams.get("script") || "").toLowerCase();
    const path = url.pathname + url.search;
    let upstream;
    try {
      if (env.API && typeof env.API.fetch === "function") {
        const inner = new Request("https://internal" + path, {
          method: request.method,
          headers: request.headers,
          body: request.method === "GET" || request.method === "HEAD" ? void 0 : await request.clone().arrayBuffer()
        });
        upstream = await env.API.fetch(inner);
        console.log("OVERLAY via service binding:", path, "->", upstream.status);
      } else {
        const target = UPSTREAM.replace(/\/+$/, "") + path;
        upstream = await fetch(target, {
          method: request.method,
          headers: request.headers,
          body: request.method === "GET" || request.method === "HEAD" ? void 0 : await request.clone().arrayBuffer()
        });
        console.log(
          "OVERLAY via http:",
          target,
          "->",
          upstream.status,
          upstream.headers.get("content-type")
        );
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "upstream unreachable", detail: String(e) }),
        { status: 502, headers: CORS }
      );
    }
    if (!VALID_SCRIPTS.includes(script)) return upstream;
    const ctype = upstream.headers.get("content-type") || "";
    if (!ctype.includes("json")) {
      console.log("OVERLAY: not json, passing through:", ctype);
      return upstream;
    }
    let data;
    try {
      data = await upstream.clone().json();
    } catch (e) {
      return upstream;
    }
    try {
      const found = /* @__PURE__ */ new Set();
      collect(data, found);
      if (!found.size) return upstream;
      const list = [...found];
      const hashes = await Promise.all(list.map(sha256_16));
      const map = /* @__PURE__ */ new Map();
      const CHUNK = 150;
      for (let i = 0; i < hashes.length; i += CHUNK) {
        const part = hashes.slice(i, i + CHUNK);
        const ph = part.map(() => "?").join(",");
        const res = await env.db.prepare(
          `SELECT ta_text, out_text FROM text_pair
            WHERE script = ? AND ta_hash IN (${ph})`
        ).bind(script, ...part).all();
        for (const r of res.results || []) map.set(r.ta_text, r.out_text);
      }
      console.log("OVERLAY strings:", found.size, "converted:", map.size);
      if (!map.size) return upstream;
      swap(data, map);
      return new Response(JSON.stringify(data), { headers: CORS });
    } catch (e) {
      console.log("OVERLAY lookup failed:", String(e));
      return upstream;
    }
  }
};
export {
  overlay_worker_default as default
};
//# sourceMappingURL=overlay-worker.js.map
