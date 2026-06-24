// ═══════════════════════════════════════════════════════════════
//  Arulicheyal — Service Worker
//  Strategy: Cache-Then-Network for content, Network-First for
//             user-specific data, App Shell cached at install
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v5';
const SHELL_CACHE   = CACHE_VERSION + '-shell';
const CONTENT_CACHE = CACHE_VERSION + '-content';

// ── 1. APP SHELL ─────────────────────────────────────────────
// Cached at install. Served instantly. Always fresh in background.
const APP_SHELL = [
  '/',
  '/index.html',
  '/recital.html',
  '/recital-setup.html',
  '/ghoshti.html',
  '/spinner.html',
  '/naalayiram-tree.html',
  '/tree.html',
  '/book.html',
  '/voice.html',
  '/vedam.html',
  '/register.html',
  '/disclaimer.html',
  '/privacy.html',
  '/terms.html',
  '/header.html',
  '/components/header.html',
  '/components/footer.html',
  '/css/main.css',
  '/js/layout.js',
  '/js/state.js',
  '/js/api.js',
  '/js/navigation.js',
  '/js/index.js',
  '/js/koil.js',
  '/js/cover.js',
  '/js/render/layout.js',
  '/js/render/recitalSetup.js',
  '/js/render/ghoshtiSetup.js',
  '/js/render/options.js',
  '/js/render/pasuram.js',
  '/js/render/pasuram_full.js',
  '/js/render/thaniyan.js',
  '/js/render/pathuSelector.js',
  '/js/render/standaloneSelector.js',
  '/js/render/section.js',
  '/js/render/home.js',
  '/js/render/start.js',
  '/js/render/css.js',
  '/js/render/fullAzhwarThirunatchathra.js',
  '/js/render/fullAzhwars.js',
  '/js/render/fullDivyadesam.js',
  '/js/render/fullDivyadesamArchanai.js',
  '/js/render/fullDualRecital.js',
  '/js/render/fullNithyanusandhanam.js',
  '/js/render/fullSattrumurai.js',
  '/js/render/fullStarPasuram.js',
  '/js/render/fullThaniyans.js',
  '/js/render/munnadiPinnadiRender.js',
  '/js/render/newPasuram.js',
  '/js/render/special.js',
  '/js/render/thousand.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/icon-maskable-192x192.png',
  '/assets/icons/icon-maskable-512x512.png',
  '/manifest.json',
  '/offline.html',
];

// ── 2. ROUTES — what strategy applies where ──────────────────

// NEVER cache — always live (user-specific or real-time)
const NETWORK_ONLY = [
  '/css/main.css', 
  '/recital/render',
  '/recital/plan',
  '/recital/spinner',
  '/recital/ghoshti',
  '/auth/register',
  '/auth/',
  '/recital/resolve-labels',
];

// CACHE THEN NETWORK — serve cache instantly, refresh in background
// TTL: 24 hours — your D1 changes are visible within a day max
const CACHE_THEN_NETWORK = [
  '/api/thousand',
  '/api/section',
  '/api/thaniyan',
  '/api/pasuram',
  '/api/pasuram-display',
  '/api/divyadesam',
  '/api/sattrumurai',
  '/api/full',
  '/api/nithyanusandhanam',
  '/api/munnadi-pinnadi',
  '/api/star-pasuram',
  '/api/azhwar-recital',
  '/api/madal',
  '/api/kootrirukkai',
  '/api/anchor-map',
  '/api/entity-search',
  '/api/index',
  '/api/thirumozhi',
  '/api/vedam',
  '/recital/catalog',
  '/recital/pasuram-lookup',
  '/recital/pasuram-lines',
  '/recital/rettai',
];

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── 3. HELPERS ────────────────────────────────────────────────

function isNetworkOnly(url) {
  return NETWORK_ONLY.some(path => url.pathname.includes(path));
}

function isCacheThenNetwork(url) {
  return CACHE_THEN_NETWORK.some(path => url.pathname.includes(path));
}

function isShellAsset(url) {
  // Same origin static files (HTML, JS, CSS, images)
  return url.origin === self.location.origin;
}

function isFreshEnough(response) {
  if (!response) return false;
  const fetched = response.headers.get('sw-fetched-at');
  if (!fetched) return false;
  return (Date.now() - parseInt(fetched)) < CACHE_TTL_MS;
}

function stampResponse(response) {
  // Clone response and add timestamp header so we know when it was cached
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-at', Date.now().toString());
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── 4. INSTALL — cache app shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => {
        return Promise.allSettled(
          APP_SHELL.map(url =>
            cache.add(url).catch(err =>
              console.warn('[SW] Shell cache miss:', url, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] App shell cached ✅');
        return self.skipWaiting();
      })
  );
});

// ── 5. ACTIVATE — clean old caches ───────────────────────────
self.addEventListener('activate', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== SHELL_CACHE && key !== CONTENT_CACHE)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── 6. FETCH — main routing logic ────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin except our workers
  if (event.request.method !== 'GET') return;

  // Skip browser extension requests
  if (!url.protocol.startsWith('http')) return;

  // ── 6a. NETWORK ONLY (user data, live sessions) ───────────
  if (isNetworkOnly(url)) {
    event.respondWith(
      fetch(event.request, { redirect: 'follow' }).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: 'No network connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // ── 6b. CACHE THEN NETWORK (API content) ──────────────────
  if (isCacheThenNetwork(url)) {
    event.respondWith(cacheThenNetwork(event.request));
    return;
  }

  // ── 6c. SHELL ASSETS (HTML, JS, CSS — same origin) ────────
  if (isShellAsset(url)) {
    event.respondWith(shellAssetStrategy(event.request));
    return;
  }

  // ── 6d. EVERYTHING ELSE — network with cache fallback ─────
  event.respondWith(
    fetch(event.request, { redirect: 'follow' }).catch(() => caches.match(event.request))
  );
});

// ── 7. CACHE THEN NETWORK STRATEGY ───────────────────────────
// Serve cached response instantly if fresh (< 24hrs)
// Always fetch fresh in background to update cache
async function cacheThenNetwork(request) {
  const cache = await caches.open(CONTENT_CACHE);
  const cached = await cache.match(request);

  if (cached && isFreshEnough(cached)) {
    // Serve from cache instantly — update silently in background
    refreshCache(request, cache);
    return cached;
  }

  // Cache stale or missing — fetch fresh
  try {
    const fresh = await fetch(request, { redirect: 'follow' });
    if (fresh.ok) {
      cache.put(request, stampResponse(fresh.clone()));
    }
    return fresh;
  } catch {
    // Network failed — return stale cache if exists (temple mode!)
    if (cached) {
      console.log('[SW] Offline — serving stale cache for:', request.url);
      return cached;
    }
    // Nothing cached either — return offline JSON
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Content not available offline yet. Please open once on a good connection.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Silent background cache refresh
function refreshCache(request, cache) {
  fetch(request, { redirect: 'follow' })
    .then(fresh => {
      if (fresh.ok) cache.put(request, stampResponse(fresh.clone()));
    })
    .catch(() => {
      // Silently ignore — offline
    });
}

// ── 8. SHELL ASSET STRATEGY ───────────────────────────────────
// For HTML/JS/CSS: serve cache first, update in background
// If not cached yet: fetch and cache
async function shellAssetStrategy(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // Serve immediately from cache
    // Refresh in background so next visit gets latest
    refreshCache(request, cache);
    return cached;
  }

  // Not in cache — fetch and cache it
  try {
    const fresh = await fetch(request, { redirect: 'follow' });
    // type 'opaqueredirect' means Cloudflare redirected (http→https etc)
    // Don't cache it — just follow it transparently
    if (fresh.type === 'opaqueredirect') {
      return fetch(request, { redirect: 'follow' });
    }
    if (fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    // Offline and not cached — show offline page
    const offline = await caches.match('/offline.html');
    return offline || new Response(
      '<h2 style="font-family:sans-serif;padding:20px">You are offline. Please connect to the internet and try again.</h2>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ── 9. MESSAGE HANDLER — force purge from app ─────────────────
// Call this from your app: navigator.serviceWorker.controller.postMessage({ type: 'PURGE_CACHE' })
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'PURGE_CACHE') {
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => {
        console.log('[SW] All caches purged ✅');
        event.ports[0]?.postMessage({ success: true });
      });
  }

  // Purge only content cache (keep shell) — for DB fixes
  if (event.data?.type === 'PURGE_CONTENT') {
    caches.delete(CONTENT_CACHE)
      .then(() => {
        console.log('[SW] Content cache purged ✅');
        event.ports[0]?.postMessage({ success: true });
      });
  }
});