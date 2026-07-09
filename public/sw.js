// Service Worker for caching static, long-lived assets.
//
// Scope is intentionally narrow: fonts, images, and pinned CDN libs (KaTeX,
// Mermaid) get a Cache-First strategy since they're immutable or slow-
// changing. Documents/scripts/styles are left to the network + Vercel's CDN,
// which already serves hashed `_astro/*` assets as immutable and revalidates
// HTML on every request — a Network-First SW layer on top only added latency
// and a second, harder-to-invalidate place for stale content to hide.

const CACHE_VERSION = 'tyndall-v3';
const FONT_CACHE = `${CACHE_VERSION}-fonts`;
const CDN_CACHE = `${CACHE_VERSION}-cdn`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Cache duration (in seconds)
const CACHE_DURATION = {
    fonts: 30 * 24 * 60 * 60, // 30 days
    cdn: 7 * 24 * 60 * 60,     // 7 days
    images: 7 * 24 * 60 * 60,  // 7 days
};

self.addEventListener('install', () => {
    self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        // Delete old cache versions
                        if (key.startsWith('tyndall-') && !key.startsWith(CACHE_VERSION)) {
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle http/https requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Determine caching strategy based on request type
    if (
        request.destination === 'font' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com'
    ) {
        // Fonts (local + external fallback) - Cache First
        event.respondWith(cacheFirst(request, FONT_CACHE, CACHE_DURATION.fonts));
    } else if (url.hostname === 'cdn.jsdelivr.net') {
        // CDN resources (Mermaid, KaTeX, etc.) - Cache First
        event.respondWith(cacheFirst(request, CDN_CACHE, CACHE_DURATION.cdn));
    } else if (request.destination === 'image') {
        // Images - Cache First
        event.respondWith(cacheFirst(request, IMAGE_CACHE, CACHE_DURATION.images));
    }
    // Documents/scripts/styles/API calls: don't intercept. Vercel's CDN
    // already serves hashed _astro/* assets as immutable and revalidates
    // HTML per-request, so a SW cache layer here only risks staleness.
});

/**
 * Cache First strategy: Try cache first, fall back to network
 */
async function cacheFirst(request, cacheName, maxAge) {
    try {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);

        if (cached) {
            // Check if cache is still fresh
            const cachedTime = new Date(cached.headers.get('sw-cached-time'));
            const now = new Date();
            const age = (now - cachedTime) / 1000; // in seconds

            if (age < maxAge) {
                return cached;
            }
        }

        // Fetch from network
        const response = await fetch(request);

        // Cache successful responses
        if (response.ok) {
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-time', new Date().toISOString());

            const modifiedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            cache.put(request, modifiedResponse);
        }

        return response;
    } catch (error) {
        // Try to return cached version even if expired
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}
