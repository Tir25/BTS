// Service Worker Manager for enhanced PWA functionality

import React from 'react';

export interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

export interface ServiceWorkerRegistration {
  registration: ServiceWorkerRegistration | null;
  isSupported: boolean;
  isInstalled: boolean;
  isActive: boolean;
  isUpdateAvailable: boolean;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = 'serviceWorker' in navigator;
  private updateAvailable: boolean = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.setupMessageHandlers();
  }

  // Register service worker
  async register(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported) {
      throw new Error('Service Worker not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      }) as any;

      console.log('[ServiceWorkerManager] Service Worker registered:', this.registration);

      // Listen for updates
      (this.registration as any)?.addEventListener('updatefound', () => {
        const newWorker = (this.registration as any)!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[ServiceWorkerManager] Service Worker controller changed');
        window.location.reload();
      });

      return this.registration as any;
    } catch (error) {
      console.error('[ServiceWorkerManager] Registration failed:', error);
      throw error;
    }
  }

  // Unregister service worker
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await (this.registration as any)?.unregister() || false;
      console.log('[ServiceWorkerManager] Service Worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('[ServiceWorkerManager] Unregistration failed:', error);
      return false;
    }
  }

  // Update service worker
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registration found');
    }

    try {
      await (this.registration as any).update();
      console.log('[ServiceWorkerManager] Service Worker update requested');
    } catch (error) {
      console.error('[ServiceWorkerManager] Update failed:', error);
      throw error;
    }
  }

  // Skip waiting and activate new service worker
  async skipWaiting(): Promise<void> {
    if (!this.registration || !(this.registration as any).waiting) {
      throw new Error('No waiting service worker found');
    }

    try {
      (this.registration as any)?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      console.log('[ServiceWorkerManager] Skip waiting message sent');
    } catch (error) {
      console.error('[ServiceWorkerManager] Skip waiting failed:', error);
      throw error;
    }
  }

  // Send message to service worker
  async sendMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker controller');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller?.postMessage(message, [messageChannel.port2]);
    });
  }

  // Get service worker version
  async getVersion(): Promise<string> {
    try {
      const response = await this.sendMessage({ type: 'GET_VERSION' });
      return response.version;
    } catch (error) {
      console.error('[ServiceWorkerManager] Failed to get version:', error);
      return 'unknown';
    }
  }

  // Cache management
  async clearCache(cacheName?: string): Promise<void> {
    try {
      if (cacheName) {
        await caches.delete(cacheName);
        console.log(`[ServiceWorkerManager] Cache cleared: ${cacheName}`);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[ServiceWorkerManager] All caches cleared');
      }
    } catch (error) {
      console.error('[ServiceWorkerManager] Cache clearing failed:', error);
      throw error;
    }
  }

  // Get cache information
  async getCacheInfo(): Promise<{ name: string; size: number }[]> {
    try {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return {
            name,
            size: keys.length,
          };
        })
      );
      return cacheInfo;
    } catch (error) {
      console.error('[ServiceWorkerManager] Failed to get cache info:', error);
      return [];
    }
  }

  // Preload critical resources with PRPL pattern
  async preloadResources(urls: string[]): Promise<void> {
    try {
      const cache = await caches.open('preload-cache');
      await Promise.all(
        urls.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`[ServiceWorkerManager] Preloaded: ${url}`);
            }
          } catch (error) {
            console.warn(`[ServiceWorkerManager] Failed to preload: ${url}`, error);
          }
        })
      );
    } catch (error) {
      console.error('[ServiceWorkerManager] Preloading failed:', error);
    }
  }

  // Pre-cache critical resources with intelligent prioritization
  async precacheCriticalResources(): Promise<void> {
    if (!this.registration) return;

    const criticalResources = [
      '/',
      '/static/js/bundle.js',
      '/static/css/main.css',
      '/manifest.json'
    ];

    try {
      const cache = await caches.open('critical-cache');
      
      // Pre-cache with priority-based loading
      const priorityPromises = criticalResources.map(async (resource, index) => {
        try {
          await cache.add(resource);
          console.log(`[ServiceWorkerManager] Pre-cached critical resource ${index + 1}/${criticalResources.length}: ${resource}`);
        } catch (error) {
          console.warn(`[ServiceWorkerManager] Failed to pre-cache resource: ${resource}`, error);
        }
      });

      await Promise.allSettled(priorityPromises);
      console.log('[ServiceWorkerManager] Critical resources pre-caching completed');
    } catch (error) {
      console.error('[ServiceWorkerManager] Failed to pre-cache critical resources:', error);
    }
  }

  // Intelligent pre-caching based on user patterns
  async precacheUserPatterns(): Promise<void> {
    if (!this.registration) return;

    try {
      const cache = await caches.open('pattern-cache');
      const userPatterns = await this.getUserPatterns();
      
      // Pre-cache based on common user journeys
      const patternResources = [
        '/student-map',
        '/driver-dashboard',
        '/admin-dashboard',
        '/api/buses',
        '/api/routes'
      ];

      // Add resources based on user patterns
      if (userPatterns.includes('student')) {
        patternResources.push('/api/student-location', '/api/bus-locations');
      }
      if (userPatterns.includes('driver')) {
        patternResources.push('/api/driver-location', '/api/route-details');
      }
      if (userPatterns.includes('admin')) {
        patternResources.push('/api/admin-stats', '/api/user-management');
      }

      // Pre-cache with background priority
      const backgroundPromises = patternResources.map(async (resource) => {
        try {
          await cache.add(resource);
          console.log(`[ServiceWorkerManager] Pre-cached pattern resource: ${resource}`);
        } catch (error) {
          console.warn(`[ServiceWorkerManager] Failed to pre-cache pattern resource: ${resource}`, error);
        }
      });

      await Promise.allSettled(backgroundPromises);
      console.log('[ServiceWorkerManager] User pattern pre-caching completed');
    } catch (error) {
      console.error('[ServiceWorkerManager] Failed to pre-cache user patterns:', error);
    }
  }

  // Get user patterns from localStorage or analytics
  private async getUserPatterns(): Promise<string[]> {
    try {
      const patterns = localStorage.getItem('userPatterns');
      if (patterns) {
        return JSON.parse(patterns);
      }
      
      // Default patterns based on common usage
      return ['student', 'driver'];
    } catch (error) {
      console.warn('[ServiceWorkerManager] Failed to get user patterns:', error);
      return ['student'];
    }
  }

  // Update user patterns based on current usage
  async updateUserPatterns(pattern: string): Promise<void> {
    try {
      const currentPatterns = await this.getUserPatterns();
      if (!currentPatterns.includes(pattern)) {
        currentPatterns.push(pattern);
        localStorage.setItem('userPatterns', JSON.stringify(currentPatterns));
      }
    } catch (error) {
      console.warn('[ServiceWorkerManager] Failed to update user patterns:', error);
    }
  }

  // Setup message handlers
  private setupMessageHandlers(): void {
    if (!this.isSupported) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      const handler = this.messageHandlers.get(type);
      
      if (handler) {
        handler(data);
      }
    });
  }

  // Add message handler
  addMessageHandler(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  // Remove message handler
  removeMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  // Notify about update availability
  private notifyUpdateAvailable(): void {
    const event = new CustomEvent('sw-update-available', {
      detail: { registration: this.registration }
    });
    window.dispatchEvent(event);
  }

  // Get registration status
  getStatus(): ServiceWorkerRegistration {
    return {
      registration: this.registration,
      isSupported: this.isSupported,
      isInstalled: !!this.registration,
      isActive: !!navigator.serviceWorker.controller,
      isUpdateAvailable: this.updateAvailable,
    };
  }

  // Check if offline
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // Setup offline/online listeners
  setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[ServiceWorkerManager] Network is online');
      window.dispatchEvent(new CustomEvent('network-online'));
    });

    window.addEventListener('offline', () => {
      console.log('[ServiceWorkerManager] Network is offline');
      window.dispatchEvent(new CustomEvent('network-offline'));
    });
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// React hook for service worker
export const useServiceWorker = () => {
  const [status, setStatus] = React.useState<ServiceWorkerRegistration>(
    serviceWorkerManager.getStatus()
  );

  React.useEffect(() => {
    const updateStatus = () => {
      setStatus(serviceWorkerManager.getStatus());
    };

    // Listen for service worker events
    window.addEventListener('sw-update-available', updateStatus);
    window.addEventListener('network-online', updateStatus);
    window.addEventListener('network-offline', updateStatus);

    // Initial status check
    updateStatus();

    return () => {
      window.removeEventListener('sw-update-available', updateStatus);
      window.removeEventListener('network-online', updateStatus);
      window.removeEventListener('network-offline', updateStatus);
    };
  }, []);

  return {
    ...status,
    register: () => serviceWorkerManager.register(),
    unregister: () => serviceWorkerManager.unregister(),
    update: () => serviceWorkerManager.update(),
    skipWaiting: () => serviceWorkerManager.skipWaiting(),
    clearCache: (cacheName?: string) => serviceWorkerManager.clearCache(cacheName),
    getCacheInfo: () => serviceWorkerManager.getCacheInfo(),
    preloadResources: (urls: string[]) => serviceWorkerManager.preloadResources(urls),
    precacheCriticalResources: () => serviceWorkerManager.precacheCriticalResources(),
    precacheUserPatterns: () => serviceWorkerManager.precacheUserPatterns(),
    updateUserPatterns: (pattern: string) => serviceWorkerManager.updateUserPatterns(pattern),
    isOffline: () => serviceWorkerManager.isOffline(),
  };
};

// Note: React is already imported at the top

