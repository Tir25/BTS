// Service Worker for Bus Tracking System
const CACHE_NAME = 'bus-tracking-v1';
const TILE_CACHE_NAME = 'map-tiles-v1';

// Cache map tiles for better performance
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip development server requests (localhost:5173)
  if (url.hostname === 'localhost' && url.port === '5173') {
    // Don't intercept development server requests
    return;
  }
  
  // Skip Cloudflare cookie requests to prevent domain issues
  if (url.pathname.includes('__cf_bm') || url.pathname.includes('cf_clearance')) {
    return;
  }
  
  // Skip all WebSocket connections - let the browser handle them directly
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || 
      url.pathname.includes('socket.io') || 
      url.pathname.includes('websocket')) {
    console.log('[ServiceWorker] Skipping WebSocket request:', url.toString());
    return;
  }
  
  // Skip SSE connections
  if (url.pathname.includes('/sse')) {
    console.log('[ServiceWorker] Skipping SSE request:', url.toString());
    return;
  }
  
  // Cache OpenStreetMap tiles
  if (url.hostname === 'tile.openstreetmap.org') {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((networkResponse) => {
            // Cache successful tile responses
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a placeholder for failed tile requests
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }
  
  // Handle CSS files and other static assets (only in production)
  if (url.hostname !== 'localhost' && (
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image' ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js'))) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((error) => {
            console.error('Service Worker fetch failed:', error);
            // Return a fallback response for failed requests
            return new Response('', { 
              status: 404,
              statusText: 'Not Found'
            });
          });
        });
      })
    );
    return;
  }
  
  // For all other requests, just pass through to network
  // This prevents the Service Worker from intercepting requests it shouldn't handle
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
