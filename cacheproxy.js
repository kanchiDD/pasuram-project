// ═══════════════════════════════════════════════════════════════════
//  cacheProxy.js — Arulicheyal Cache Proxy Worker  (fixed v3)
//
//  Uses Service Bindings instead of fetch() to call backend workers.
//  This bypasses the Cloudflare 1042 error (workers.dev inter-worker block).
//
//  Required bindings (set in Cloudflare dashboard):
//    CDN     → cdnaalayiram-api
//    RECITAL → recitalworker
//    TREE    → pasuram-api
// ═══════════════════════════════════════════════════════════════════

const TTL = 60 * 60 * 24;

const CACHE_RULES = [
  { prefix: '/api/thousand',                ttl: TTL },
  { prefix: '/api/section',                 ttl: TTL },
  { prefix: '/api/thaniyan',                ttl: 0   },
  { prefix: '/api/pasuram-display',         ttl: 0   },  // 0 min — update to 3600 once DB is stable
  { prefix: '/api/pasuram',                 ttl: 0   },  // 0 min — update to 3600 once DB is stable
  { prefix: '/api/divyadesam',              ttl: TTL },
  { prefix: '/api/sattrumurai',             ttl: TTL },
  { prefix: '/api/full',                    ttl: TTL },
  { prefix: '/api/nithyanusandhanam',       ttl: TTL },
  { prefix: '/api/munnadi-pinnadi',         ttl: TTL },
  { prefix: '/api/star-pasuram',            ttl: TTL },
  { prefix: '/api/azhwar-recital',          ttl: TTL },
  { prefix: '/api/custom-recital-entities', ttl: TTL },
  { prefix: '/api/madal',                   ttl: TTL },
  { prefix: '/api/koil-pathus',             ttl: TTL },
  { prefix: '/api/kootrirukkai',            ttl: TTL },
  { prefix: '/api/anchor-map',              ttl: TTL },
  { prefix: '/api/entity-search',           ttl: TTL },
  { prefix: '/api/index',                   ttl: TTL },
  { prefix: '/api/thirumozhi',              ttl: TTL },
  { prefix: '/api/vedam',                   ttl: TTL },
  { prefix: '/voice/',                      ttl: TTL },
  { prefix: '/recital/catalog',             ttl: TTL },
  { prefix: '/recital/pasuram-lookup',      ttl: TTL },
  { prefix: '/recital/pasuram-lines',       ttl: TTL },
  { prefix: '/recital/rettai',              ttl: TTL },
  { prefix: '/tree',                        ttl: TTL },
];

const PURGE_SECRET = 'kanchi2026purge';
const BASE_URL     = 'https://cacheproxy.kanchitrust.workers.dev';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Purge-All',
};

// Build full list of URLs to purge
function buildPurgeList() {
  const urls = [];

  // pasuram-lines and pasuram-lookup: main range 1-3776
  for (let i = 1; i <= 3776; i++) {
    urls.push(`/recital/pasuram-lines?no=${i}`);
    urls.push(`/recital/pasuram-lookup?no=${i}`);
  }
  // Extended range for thaniyans and special pasurams (24000-32000)
  for (let i = 24000; i <= 32000; i++) {
    urls.push(`/recital/pasuram-lines?no=${i}`);
    urls.push(`/recital/pasuram-lookup?no=${i}`);
  }

  // Section-level API purge for all sections 1-31
  for (let i = 1; i <= 53; i++) {
    urls.push(`/api/pasuram?section_id=${i}`);
    urls.push(`/api/pasuram-display?section_id=${i}`);
    urls.push(`/api/thaniyan?section_id=${i}`);
    urls.push(`/api/madal?section_id=${i}`);
    urls.push(`/api/kootrirukkai?section_id=${i}`);
    urls.push(`/api/sattrumurai?section_id=${i}`);
    urls.push(`/recital/catalog?section_id=${i}`);
  }

  // Top-level entries
  urls.push('/recital/catalog');
  urls.push('/recital/rettai');
  urls.push('/api/thousand');
  urls.push('/api/entity-search');
  urls.push('/api/anchor-map');
  urls.push('/api/index');

  // Sect-specific entries — T, V, B variants
  for (const sect of ['T', 'V', 'B']) {
    urls.push(`/api/section?sect=${sect}`);
    for (let i = 99; i <= 99; i++) {
      urls.push(`/api/section?thousand_id=${i}&sect=${sect}`);
    }
    for (let i = 1; i <= 53; i++) {
      urls.push(`/api/thaniyan?section_id=${i}&sect=${sect}`);
    }
    urls.push(`/api/thaniyan?type=global&sect=${sect}`);
    urls.push(`/api/full?sect=${sect}`);
    urls.push(`/api/full?view=4000&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=sequence&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=fixed&id=1&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=fixed&id=2&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=fixed&id=5&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=fixed&id=6&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=fixed&id=7&sect=${sect}`);
    urls.push(`/api/nithyanusandhanam?sub=vazhi&sect=${sect}`);
    urls.push(`/recital/catalog?sect=${sect}`);
  }

  // Koil pathu lists — 2 subs × 3 sect modes
  for (const sub of ['THIRUMOZHI', 'THIRUVAIMOZHI']) {
    for (const sect of ['T', 'V', 'ALL']) {
      urls.push(`/api/koil-pathus?sub=${sub}&sect=${sect}`);
    }
  }

  // Madam (Ahobila) variants: the fetch interceptor appends
  // &subsect=madam for Madam users, creating parallel cache keys for
  // every sect=V URL. Duplicate those entries so purge-all clears the
  // Madam-variant cache too.
  // Madam cache keys: the fetch interceptor appends &subsect=madam to
  // every worker URL for Madam users, so EVERY cached URL needs a Madam
  // twin — not only sect=V entries. Section thaniyans, pasuram-display,
  // full API etc are all duplicated with the subsect param.
  const withMadam = [];
  for (const u of urls) {
    withMadam.push(u);
    // Generate the Madam variant for any URL that would hit cacheproxy
    // (exclude non-API paths like /tree and /recital/*)
    if (u.startsWith('/api/') || u.startsWith('/voice/')) {
      withMadam.push(`${u}&subsect=madam`);
    }
  }
  return withMadam;
}

async function purgeAllInBackground(cache) {
  const urls = buildPurgeList();
  let deleted = 0;
  for (const path of urls) {
    try {
      const ok = await cache.delete(new Request(`${BASE_URL}${path}`));
      if (ok) deleted++;
    } catch(e) {}
  }
  console.log(`Purge complete: ${deleted} entries deleted out of ${urls.length}`);
}

async function purgeUrls(cache) {
  // Just purge catalog synchronously for immediate response
  const quick = ['/recital/catalog'];
  for (let i = 1; i <= 31; i++) quick.push(`/recital/catalog?section_id=${i}`);
  const results = [];
  for (const path of quick) {
    const deleted = await cache.delete(new Request(`${BASE_URL}${path}`));
    results.push({ path, deleted });
  }
  return results;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Debug ping ────────────────────────────────────────────────
    if (url.pathname === '/ping') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          proxy: 'cacheProxy v3 (service bindings)',
          bindings: {
            CDN:     !!env.CDN,
            RECITAL: !!env.RECITAL,
            TREE:    !!env.TREE,
          }
        }, null, 2),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // ── Purge all (manual) ────────────────────────────────────────
    if (url.pathname === '/purge-all') {
      if (request.headers.get('X-Purge-All') !== PURGE_SECRET) {
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      }
      const cache = caches.default;
      // Purge section-level API URLs synchronously (immediate effect)
      const syncUrls = [];
      for (let i = 1; i <= 53; i++) {
        syncUrls.push(`/api/pasuram?section_id=${i}`);
        syncUrls.push(`/api/pasuram-display?section_id=${i}`);
        syncUrls.push(`/api/thaniyan?section_id=${i}`);
        syncUrls.push(`/recital/catalog?section_id=${i}`);
      }
      syncUrls.push('/recital/catalog');
      syncUrls.push('/api/thousand');
      syncUrls.push('/api/entity-search');
      // Sect-specific sync purge
      for (const sect of ['T', 'V', 'B']) {
        syncUrls.push(`/api/section?thousand_id=99&sect=${sect}`);
        syncUrls.push(`/api/thaniyan?type=global&sect=${sect}`);
        syncUrls.push(`/api/full?sect=${sect}`);
        syncUrls.push(`/api/nithyanusandhanam?sub=sequence&sect=${sect}`);
        syncUrls.push(`/api/nithyanusandhanam?sub=fixed&id=6&sect=${sect}`);
        syncUrls.push(`/api/nithyanusandhanam?sub=fixed&id=7&sect=${sect}`);
        syncUrls.push(`/api/nithyanusandhanam?sub=vazhi&sect=${sect}`);
        syncUrls.push(`/recital/catalog?sect=${sect}`);
      }
      // Madam variants for the sync purge as well
      const syncWithMadam = [];
      for (const u of syncUrls) {
        syncWithMadam.push(u);
        if (u.startsWith('/api/') || u.startsWith('/voice/')) {
          syncWithMadam.push(`${u}&subsect=madam`);
        }
      }
      const syncResults = [];
      for (const path of syncWithMadam) {
        const deleted = await cache.delete(new Request(`${BASE_URL}${path}`));
        syncResults.push({ path, deleted });
      }
      // Run full pasuram-lines range purge in background
      ctx.waitUntil(purgeAllInBackground(cache));
      return new Response(
        JSON.stringify({ 
          message: 'Section-level cache purged immediately. Pasuram-lines range purge running in background.',
          immediate: syncResults.filter(r => r.deleted).length + ' entries cleared',
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    if (request.method !== 'GET') {
      return forwardLive(request, url, env);
    }

    const rule = CACHE_RULES.find(r => url.pathname.startsWith(r.prefix));

    if (!rule) {
      return forwardLive(request, url, env);
    }

	if (rule.ttl === 0) {
   	 return forwardLive(request, url, env);
	}

    // ── Cache key uses the full URL ───────────────────────────────
    const cacheKey = new Request(request.url);
    const cache    = caches.default;
    const cached = await cache.match(cacheKey);

	if (cached) {
 	 return addCacheHeaders(cached, 'HIT');
	}

    // ── Cache MISS — call backend via service binding ─────────────
    try {
      const resp = await callBackend(request, url, env);

      if (resp.ok) {
        const toCache = new Response(resp.clone().body, resp);
        toCache.headers.set('Cache-Control', `public, max-age=${rule.ttl}`);
        toCache.headers.set('X-Cache', 'MISS');
        toCache.headers.set('Access-Control-Allow-Origin', '*');
        ctx.waitUntil(cache.put(cacheKey, toCache.clone()));
        return addCacheHeaders(toCache, 'MISS');
      }

      return withCors(resp);

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'backend_unavailable', message: err.message }),
        { status: 503, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
  },

  // ── Cron trigger — runs daily at midnight UTC ─────────────────
  async scheduled(event, env, ctx) {
    const cache = caches.default;
    await purgeAllInBackground(cache);
  }
};

// ── Route to correct service binding ─────────────────────────────
function getBinding(url, env) {
  if (url.pathname.startsWith('/tree'))                              return env.TREE;
  if (url.pathname.startsWith('/recital/') ||
      url.pathname.startsWith('/auth/'))                            return env.RECITAL;
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/voice/'))                           return env.CDN;
  return null;
}

// ── Call backend via service binding ─────────────────────────────
async function callBackend(request, url, env) {
  const binding = getBinding(url, env);
  if (!binding) {
    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }
  const backendRequest = new Request(request.url, {
    method:  request.method,
    headers: request.headers,
  });
  return binding.fetch(backendRequest);
}

// ── Forward live (non-cached routes) ─────────────────────────────
async function forwardLive(request, url, env) {
  try {
    const resp = await callBackend(request, url, env);
    return withCors(resp);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'backend_unavailable', message: err.message }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

function withCors(response) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(CORS_HEADERS)) r.headers.set(k, v);
  return r;
}

function addCacheHeaders(response, status) {
  const r = new Response(response.body, response);
  r.headers.set('X-Cache', status);
  for (const [k, v] of Object.entries(CORS_HEADERS)) r.headers.set(k, v);
  return r;
}
