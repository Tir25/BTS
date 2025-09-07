import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleFilter } from './utils/consoleFilter';
import './utils/apiInterceptor';
import { QueryProvider } from './providers/QueryProvider';
import { serviceWorkerManager } from './utils/serviceWorkerManager';

// Reduce console noise in production: keep warnings/errors only
if (import.meta.env.PROD) {
  const noop = () => {};
  console.debug = noop;
  console.log = noop;
}

// Import Service Worker cache clearer for development
if (import.meta.env.DEV) {
  // Dynamically load the cache clearer script
  const script = document.createElement('script');
  script.src = '/clear-sw-cache.js';
  script.onload = () => console.log('✅ Service Worker cache clearer loaded');
  script.onerror = () =>
    console.log('⚠️ Service Worker cache clearer not available');
  document.head.appendChild(script);
}

// Setup console filter to suppress expected warnings in development
setupConsoleFilter();

// Enhanced Service Worker registration
if (import.meta.env.PROD) {
  // Register service worker for better performance
  window.addEventListener('load', async () => {
    try {
      await serviceWorkerManager.register();
      console.log('✅ Enhanced Service Worker registered successfully');
      
      // Setup network listeners
      serviceWorkerManager.setupNetworkListeners();
      
      // Preload critical resources with PRPL pattern
      const criticalResources = [
        '/',
        '/index.html',
        '/manifest.json',
      ];
      await serviceWorkerManager.preloadResources(criticalResources);
      
      // Pre-cache critical resources
      await serviceWorkerManager.precacheCriticalResources();
      
      // Pre-cache user patterns
      await serviceWorkerManager.precacheUserPatterns();
      
    } catch (error) {
      console.error('❌ Enhanced Service Worker registration failed:', error);
    }
  });

  // Listen for service worker updates
  window.addEventListener('sw-update-available', () => {
    console.log('🔄 Service Worker update available');
    // You can show a notification to the user here
  });

  // Listen for network status changes
  window.addEventListener('network-online', () => {
    console.log('🌐 Network is online');
  });

  window.addEventListener('network-offline', () => {
    console.log('📴 Network is offline');
  });

} else if (import.meta.env.DEV) {
  // Unregister any existing service workers in development
  try {
    await serviceWorkerManager.unregister();
    console.log('🔄 Service Worker unregistered for development');
  } catch (error) {
    console.log('⚠️ No service worker to unregister');
  }
}

// Optimize font loading with proper resource hints
// 1. Preconnect to the domain that will serve the font files
const preconnectLink = document.createElement('link');
preconnectLink.rel = 'preconnect';
preconnectLink.href = 'https://fonts.gstatic.com';
preconnectLink.crossOrigin = 'anonymous';
document.head.appendChild(preconnectLink);

// 2. Add the font stylesheet with proper loading strategy
// Using a direct link element with font-display: swap to prevent FOIT
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap&font-display=swap';
document.head.appendChild(fontLink);

// Ensure proper rendering
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>
);
