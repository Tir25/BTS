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
  
  // Clear browser cache for this domain
  if ('storage' in navigator && 'clear' in navigator.storage) {
    await navigator.storage.clear();
    console.log('✅ Cleared storage');
  }
  
  console.log('🎉 Cache clearing complete! Refresh the page.');
}

// Auto-run if this script is loaded
clearServiceWorkerCache();
