import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleFilter } from './utils/consoleFilter';
import './utils/apiInterceptor';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { serviceWorkerManager } from './services/ServiceWorkerManager';
import { logger } from './utils/logger';

// Import Service Worker cache clearer for development
if (import.meta.env.DEV) {
  // Dynamically load the cache clearer script
  const script = document.createElement('script');
  script.src = '/clear-sw-cache.js';
  script.onload = () => logger.info('Service Worker cache clearer loaded', 'main');
  script.onerror = () =>
    logger.warn('Service Worker cache clearer not available', 'main');
  document.head.appendChild(script);
}

// Setup console filter to suppress expected warnings in development
setupConsoleFilter();

// Enhanced Service Worker registration with comprehensive security checks
const browserCompatibility = serviceWorkerManager.detectBrowserCompatibility();
logger.info('Browser compatibility check', 'main', {
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
      await serviceWorkerManager.registerServiceWorker('/sw.js');
    } catch (error) {
      logger.warn(
        'Service Worker registration failed in production',
        'main',
        { error: String(error) }
      );
    }
  });
} else if (import.meta.env.DEV) {
  // Development: Unregister any existing service workers
  window.addEventListener('load', async () => {
    try {
      await serviceWorkerManager.unregisterAllServiceWorkers();
    } catch (error) {
      logger.warn(
        'Failed to unregister Service Workers in development',
        'main',
        { error: String(error) }
      );
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
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap&font-display=swap';
document.head.appendChild(fontLink);

// Ensure proper rendering
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ThemeProvider>
  </React.StrictMode>
);
