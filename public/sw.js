// 혜화 안심경로 PWA 서비스 워커 (수동 작성 - Next.js 14 App Router는 next-pwa 계열
// 플러그인의 webpack 통합이 불안정한 사례가 많아, 캐시 전략을 직접 제어할 수 있는
// 순정 서비스 워커를 택했다).

// v2: 지도 타일 제공자를 OSM -> CartoDB Positron으로 교체하면서 이전 타일 캐시를 정리하기 위해 버전을 올렸다.
const CACHE_VERSION = "v2";
const PRECACHE = `precache-${CACHE_VERSION}`;
const TILE_CACHE = `tiles-${CACHE_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const KNOWN_CACHES = [PRECACHE, TILE_CACHE, SHELL_CACHE];

// 경로 계산에 필요한 정적 데이터 - 오프라인에서도 반드시 있어야 하므로 설치 시점에 미리 캐시한다.
const PRECACHE_URLS = [
  "/data/graph.json",
  "/data/cctv.geojson",
  "/data/lights.geojson",
  "/data/police.geojson",
  "/data/stats.json",
];

// 지도 타일을 CartoDB Positron(basemaps.cartocdn.com)으로 교체했으므로 이 패턴도 함께 바꿔야 한다.
const TILE_HOST_PATTERN = /(^|\.)basemaps\.cartocdn\.com$/;
const MAX_TILE_ENTRIES = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Cache API의 keys()는 추가된 순서를 유지하므로, 앞쪽(가장 오래된 항목)부터 지운다.
  while (keys.length > maxEntries) {
    await cache.delete(keys.shift());
  }
}

/** 지도 타일: 캐시가 있으면 즉시 응답하되 백그라운드로 최신 타일을 받아 캐시를 갱신한다. */
async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
        if (maxEntries) trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await networkFetch) || Response.error();
}

/** 앱 셸: 온라인이면 항상 최신을 받아오고, 실패할 때만 캐시로 대체한다. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/** 정적 데이터(그래프/geojson): 설치 시 미리 캐시해둔 값을 우선 사용해 오프라인에서도 즉시 응답한다. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (TILE_HOST_PATTERN.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, TILE_CACHE, MAX_TILE_ENTRIES));
    return;
  }

  if (url.origin === self.location.origin) {
    if (PRECACHE_URLS.includes(url.pathname)) {
      event.respondWith(cacheFirst(request, PRECACHE));
      return;
    }

    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});
