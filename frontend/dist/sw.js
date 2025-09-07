// Enhanced Service Worker for Bus Tracking System
const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `bus-tracking-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bus-tracking-dynamic-${CACHE_VERSION}`;
const TILE_CACHE = `bus-tracking-tiles-${CACHE_VERSION}`;
const API_CACHE = `bus-tracking-api-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other critical static assets here
];

// API endpoints that should be cached
const CACHEABLE_API_ENDPOINTS = [
  '/api/health',
  '/api/routes',
  '/api/buses',
  '/api/drivers',
];

// Map tile providers
const MAP_TILE_PROVIDERS = [
  'tile.openstreetmap.org',
  'api.mapbox.com',
  'tiles.mapbox.com',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip development server requests
  if (url.hostname === 'localhost' && url.port === '5173') {
    return;
  }
  
  // Skip WebSocket and SSE connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || 
      url.pathname.includes('socket.io') || 
      url.pathname.includes('websocket') ||
      url.pathname.includes('/sse')) {
    return;
  }
  
  // Skip Cloudflare and other tracking requests
  if (url.pathname.includes('__cf_bm') || 
      url.pathname.includes('cf_clearance') ||
      url.pathname.includes('_ga') ||
      url.pathname.includes('analytics')) {
    return;
  }
  
  // Handle different types of requests
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(event.request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(event.request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(event.request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(event.request));
  }
});

// Helper functions
function isMapTileRequest(url) {
  return MAP_TILE_PROVIDERS.some(provider => url.hostname.includes(provider)) ||
         url.pathname.includes('/tiles/') ||
         url.pathname.includes('/map/');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('onrender.com') ||
         url.hostname.includes('vercel.app');
}

function isStaticAsset(url) {
  return url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('.json') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.ttf') ||
         url.pathname.endsWith('.eot');
}

function isImageRequest(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
}

// Cache strategies implementation
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Network request failed:', error);
    throw error;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache');
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch from network in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Ignore network errors for background updates
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return fetchPromise;
}

// Request handlers
async function handleMapTileRequest(request) {
  return cacheFirst(request, TILE_CACHE);
}

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Use network-first for real-time data
  if (url.pathname.includes('/live-locations') || 
      url.pathname.includes('/websocket')) {
    return networkFirst(request, API_CACHE);
  }
  
  // Use stale-while-revalidate for other API calls
  return staleWhileRevalidate(request, API_CACHE);
}

async function handleStaticAsset(request) {
  return cacheFirst(request, STATIC_CACHE);
}

async function handleImageRequest(request) {
  return cacheFirst(request, DYNAMIC_CACHE);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Implement background sync logic here
    console.log('[ServiceWorker] Performing background sync');
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Bus Tracking System', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});