/**
 * Service Worker Type Definitions
 * Comprehensive type safety for Service Worker functionality
 */

export interface ServiceWorkerConfig {
  enabled: boolean;
  scope: string;
  updateViaCache: ServiceWorkerUpdateViaCache;
  skipWaiting: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxCacheAge: number;
  maxCacheSize: number;
}

export interface ServiceWorkerStatus {
  isRegistered: boolean;
  isControlling: boolean;
  registration: ServiceWorkerRegistration | null;
  controller: ServiceWorker | null;
  state: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant' | null;
}

export interface BrowserCompatibility {
  supportsServiceWorker: boolean;
  supportsSecureContext: boolean;
  isSecureContext: boolean;
  isHTTPS: boolean;
  isLocalhost: boolean;
  userAgent: string;
  browserName: string;
  version: string;
}

export interface ServiceWorkerEventDetail {
  registration?: ServiceWorkerRegistration;
  newWorker?: ServiceWorker;
  event?: Event;
  error?: unknown;
}

export interface ServiceWorkerMessage {
  type: string;
  data: unknown;
  timestamp: number;
  source: 'main' | 'serviceWorker';
}

export interface CacheConfig {
  name: string;
  maxAge: number;
  maxSize: number;
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

export interface ServiceWorkerEvents {
  serviceWorkerUpdateAvailable: CustomEvent<ServiceWorkerEventDetail>;
  serviceWorkerError: CustomEvent<ServiceWorkerEventDetail>;
  serviceWorkerMessage: CustomEvent<ServiceWorkerEventDetail>;
  serviceWorkerRegistrationFailed: CustomEvent<ServiceWorkerEventDetail>;
  networkOnline: CustomEvent<ServiceWorkerEventDetail>;
  networkOffline: CustomEvent<ServiceWorkerEventDetail>;
}

// Extend Window interface for custom events
declare global {
  interface Window {
    addEventListener<K extends keyof ServiceWorkerEvents>(
      type: K,
      listener: (this: Window, ev: ServiceWorkerEvents[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof ServiceWorkerEvents>(
      type: K,
      listener: (this: Window, ev: ServiceWorkerEvents[K]) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }
}
