import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleFilter } from './utils/consoleFilter';
import './utils/apiInterceptor';
import { QueryProvider } from './providers/QueryProvider';

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

// Register service worker for better performance (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    })
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
        });
        
        // Handle service worker state changes
        registration.addEventListener('statechange', () => {
          console.log('🔄 Service Worker state changed:', registration.active?.state);
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
  
  // Handle service worker errors
  navigator.serviceWorker.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event);
  });
  
  // Handle service worker message events
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('📨 Service Worker message:', event.data);
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Unregister any existing service workers in development
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('🔄 Service Worker unregistered for development');
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
