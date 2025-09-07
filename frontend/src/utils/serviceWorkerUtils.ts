// Service Worker Utilities for Enhanced Security and Compatibility
import { shouldSkipServiceWorkerInFirefox, displayFirefoxServiceWorkerHelp } from './firefoxServiceWorkerFix';

export interface ServiceWorkerConfig {
  enabled: boolean;
  scope: string;
  updateViaCache: ServiceWorkerUpdateViaCache;
  skipWaiting: boolean;
}

export interface BrowserCompatibility {
  supportsServiceWorker: boolean;
  supportsSecureContext: boolean;
  isSecureContext: boolean;
  isHTTPS: boolean;
  isLocalhost: boolean;
  userAgent: string;
  browserName: string;
}

/**
 * Detect browser compatibility for Service Worker
 */
export function detectBrowserCompatibility(): BrowserCompatibility {
  const userAgent = navigator.userAgent;
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '0.0.0.0';
  
  // Detect browser name
  let browserName = 'unknown';
  if (userAgent.includes('Firefox')) {
    browserName = 'firefox';
  } else if (userAgent.includes('Chrome')) {
    browserName = 'chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'safari';
  } else if (userAgent.includes('Edge')) {
    browserName = 'edge';
  }
  
  return {
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsSecureContext: 'isSecureContext' in window,
    isSecureContext: window.isSecureContext || false,
    isHTTPS,
    isLocalhost,
    userAgent,
    browserName,
  };
}

/**
 * Check if Service Worker registration is allowed
 */
export function canRegisterServiceWorker(): { allowed: boolean; reason?: string } {
  const compatibility = detectBrowserCompatibility();
  
  // Check basic support
  if (!compatibility.supportsServiceWorker) {
    return { allowed: false, reason: 'Service Worker not supported in this browser' };
  }
  
  // Check secure context
  if (!compatibility.isSecureContext) {
    return { allowed: false, reason: 'Not in a secure context (HTTPS or localhost required)' };
  }
  
  // Check HTTPS or localhost
  if (!compatibility.isHTTPS && !compatibility.isLocalhost) {
    return { allowed: false, reason: 'Service Worker requires HTTPS or localhost' };
  }
  
  // Firefox-specific checks
  if (compatibility.browserName === 'firefox') {
    console.log('🔍 Firefox detected - checking privacy settings');
    
    if (shouldSkipServiceWorkerInFirefox()) {
      displayFirefoxServiceWorkerHelp();
      return { allowed: false, reason: 'Firefox privacy settings block Service Worker' };
    }
  }
  
  return { allowed: true };
}

/**
 * Get Service Worker configuration based on environment and browser
 */
export function getServiceWorkerConfig(): ServiceWorkerConfig {
  const compatibility = detectBrowserCompatibility();
  
  return {
    enabled: import.meta.env.PROD && compatibility.isSecureContext,
    scope: '/',
    updateViaCache: 'none' as ServiceWorkerUpdateViaCache,
    skipWaiting: true,
  };
}

/**
 * Register Service Worker with enhanced error handling
 */
export async function registerServiceWorker(
  scriptURL: string = '/sw.js',
  config?: Partial<ServiceWorkerConfig>
): Promise<ServiceWorkerRegistration | null> {
  const canRegister = canRegisterServiceWorker();
  
  if (!canRegister.allowed) {
    console.warn(`⚠️ Service Worker registration skipped: ${canRegister.reason}`);
    return null;
  }
  
  const defaultConfig = getServiceWorkerConfig();
  const finalConfig = { ...defaultConfig, ...config };
  
  if (!finalConfig.enabled) {
    console.log('ℹ️ Service Worker registration disabled by configuration');
    return null;
  }
  
  try {
    console.log('🔄 Attempting to register Service Worker...');
    
    const registration = await navigator.serviceWorker.register(scriptURL, {
      scope: finalConfig.scope,
      updateViaCache: finalConfig.updateViaCache,
    });
    
    console.log('✅ Service Worker registered successfully:', registration.scope);
    
    // Set up event listeners
    setupServiceWorkerEventListeners(registration);
    
    return registration;
  } catch (error) {
    handleServiceWorkerError(error);
    return null;
  }
}

/**
 * Set up Service Worker event listeners
 */
function setupServiceWorkerEventListeners(registration: ServiceWorkerRegistration): void {
  // Handle updates
  registration.addEventListener('updatefound', () => {
    console.log('🔄 Service Worker update found');
    
    const newWorker = registration.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 New Service Worker installed, ready to activate');
          // Optionally show update notification to user
        }
      });
    }
  });
  
  // Handle state changes
  registration.addEventListener('statechange', () => {
    console.log('🔄 Service Worker state changed:', registration.active?.state);
  });
  
  // Global error handler
  navigator.serviceWorker.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event);
  });
  
  // Message handler
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('📨 Service Worker message:', event.data);
  });
}

/**
 * Handle Service Worker registration errors
 */
function handleServiceWorkerError(error: any): void {
  const errorMessage = error.message || error.toString();
  
  if (error.name === 'SecurityError') {
    console.warn('⚠️ Service Worker registration blocked by security policy:', errorMessage);
  } else if (error.name === 'NotSupportedError') {
    console.warn('⚠️ Service Worker not supported in this context:', errorMessage);
  } else if (errorMessage.includes('insecure') || errorMessage.includes('insecure')) {
    console.warn('⚠️ Service Worker registration failed: Insecure context detected');
  } else if (errorMessage.includes('DOMException')) {
    console.warn('⚠️ Service Worker registration failed: DOM Exception - likely security restriction');
  } else {
    console.error('❌ Service Worker registration failed:', error);
  }
}

/**
 * Unregister all Service Workers (useful for development)
 */
export async function unregisterAllServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('🔄 Service Worker unregistered:', registration.scope);
    }
    
    console.log(`✅ Unregistered ${registrations.length} Service Worker(s)`);
  } catch (error) {
    console.error('❌ Failed to unregister Service Workers:', error);
  }
}

/**
 * Check Service Worker status
 */
export async function getServiceWorkerStatus(): Promise<{
  isRegistered: boolean;
  isControlling: boolean;
  registrations: readonly ServiceWorkerRegistration[];
  controller: ServiceWorker | null;
}> {
  if (!('serviceWorker' in navigator)) {
    return {
      isRegistered: false,
      isControlling: false,
      registrations: [],
      controller: null,
    };
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const controller = navigator.serviceWorker.controller;
    
    return {
      isRegistered: registrations.length > 0,
      isControlling: !!controller,
      registrations,
      controller,
    };
  } catch (error) {
    console.error('❌ Failed to get Service Worker status:', error);
    return {
      isRegistered: false,
      isControlling: false,
      registrations: [],
      controller: null,
    };
  }
}
