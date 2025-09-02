// Service Worker Cache Clearer
// Run this in the browser console to clear Service Worker cache

async function clearServiceWorkerCache() {
  console.log('🧹 Clearing Service Worker cache...');
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Unregistered Service Worker:', registration.scope);
    }
  }
  
  // Clear all caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('✅ Deleted cache:', cacheName);
    }
  }
  
  // Clear browser cache for this site
  if ('caches' in window) {
    try {
      await caches.delete('bus-tracking-v1');
      await caches.delete('map-tiles-v1');
      console.log('✅ Cleared application caches');
    } catch (error) {
      console.log('⚠️ Could not clear some caches:', error);
    }
  }
  
  console.log('✅ Service Worker cache cleared successfully');
  console.log('🔄 Please refresh the page to see the changes');
}

// Auto-run in development
if (window.location.hostname === 'localhost') {
  console.log('🔧 Development mode detected - clearing Service Worker cache...');
  clearServiceWorkerCache();
}

// Export for manual use
window.clearServiceWorkerCache = clearServiceWorkerCache;
