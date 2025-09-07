import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleFilter } from './utils/consoleFilter';
import './utils/apiInterceptor';
import { QueryProvider } from './providers/QueryProvider';
import { registerServiceWorker, unregisterAllServiceWorkers, detectBrowserCompatibility } from './utils/serviceWorkerUtils';

// Import Service Worker cache clearer for development
if (import.meta.env.DEV) {
  // Dynamically load the cache clearer script
  const script = document.createElement('script');
  script.src = '/clear-sw-cache.js';
  script.onload = () => console.log('✅ Service Worker cache clearer loaded');
  script.onerror = () => console.log('⚠️ Service Worker cache clearer not available');
  document.head.appendChild(script);
}

// Setup console filter to suppress expected warnings in development
setupConsoleFilter();

// Enhanced Service Worker registration with comprehensive security checks
const browserCompatibility = detectBrowserCompatibility();
console.log('🔍 Browser compatibility check:', {
  browser: browserCompatibility.browserName,
  supportsServiceWorker: browserCompatibility.supportsServiceWorker,
  isSecureContext: browserCompatibility.isSecureContext,
  isHTTPS: browserCompatibility.isHTTPS,
  isLocalhost: browserCompatibility.isLocalhost,
});

if (import.meta.env.PROD) {
  // Production: Register Service Worker with enhanced security checks
  window.addEventListener('load', async () => {
    try {
      await registerServiceWorker('/sw.js');
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed in production:', error);
    }
  });
} else if (import.meta.env.DEV) {
  // Development: Unregister any existing service workers
  window.addEventListener('load', async () => {
    try {
      await unregisterAllServiceWorkers();
    } catch (error) {
      console.warn('⚠️ Failed to unregister Service Workers in development:', error);
    }
  });
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
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap&font-display=swap';
document.head.appendChild(fontLink);

// Ensure proper rendering
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>
);
