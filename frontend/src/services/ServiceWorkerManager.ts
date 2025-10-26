/**
 * Centralized Service Worker Management
 * Industry-grade implementation with proper lifecycle management
 */

import { logger } from '../utils/logger';

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

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private config: ServiceWorkerConfig;
  private status: ServiceWorkerStatus;
  private eventListeners: Map<string, EventListener[]> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.status = this.getInitialStatus();
    this.setupGlobalEventListeners();
  }

  public static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Get default configuration based on environment
   */
  private getDefaultConfig(): ServiceWorkerConfig {
    const isProduction = import.meta.env.PROD;
    const isSecureContext = window.isSecureContext || false;

    return {
      enabled: isProduction && isSecureContext,
      scope: '/',
      updateViaCache: 'none' as ServiceWorkerUpdateViaCache,
      skipWaiting: true,
      cacheStrategy: 'stale-while-revalidate',
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 50 * 1024 * 1024, // 50MB
    };
  }

  /**
   * Get initial status
   */
  private getInitialStatus(): ServiceWorkerStatus {
    return {
      isRegistered: false,
      isControlling: false,
      registration: null,
      controller: null,
      state: null,
    };
  }

  /**
   * Detect browser compatibility
   */
  public detectBrowserCompatibility(): BrowserCompatibility {
    const userAgent = navigator.userAgent;
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = this.isLocalhost();

    // Extract browser name and version
    const browserInfo = this.parseUserAgent(userAgent);

    return {
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsSecureContext: 'isSecureContext' in window,
      isSecureContext: window.isSecureContext || false,
      isHTTPS,
      isLocalhost,
      userAgent,
      browserName: browserInfo.name,
      version: browserInfo.version,
    };
  }

  /**
   * Check if Service Worker registration is allowed
   */
  public async canRegisterServiceWorker(): Promise<{ allowed: boolean; reason?: string }> {
    const compatibility = this.detectBrowserCompatibility();

    // Check basic support
    if (!compatibility.supportsServiceWorker) {
      return {
        allowed: false,
        reason: 'Service Worker not supported in this browser',
      };
    }

    // Check secure context
    if (!compatibility.isSecureContext) {
      return {
        allowed: false,
        reason: 'Not in a secure context (HTTPS or localhost required)',
      };
    }

    // Check HTTPS or localhost
    if (!compatibility.isHTTPS && !compatibility.isLocalhost) {
      return {
        allowed: false,
        reason: 'Service Worker requires HTTPS or localhost',
      };
    }

    // Browser-specific checks
    const browserCheck = await this.checkBrowserSpecificRequirements(compatibility);
    if (!browserCheck.allowed) {
      return browserCheck;
    }

    return { allowed: true };
  }

  /**
   * Register Service Worker with comprehensive error handling
   */
  public async registerServiceWorker(
    scriptURL: string = '/sw.js',
    customConfig?: Partial<ServiceWorkerConfig>
  ): Promise<ServiceWorkerRegistration | null> {
    try {
      // Check if registration is allowed
      const canRegister = await this.canRegisterServiceWorker();
      if (!canRegister.allowed) {
        logger.warn('Service Worker registration skipped', 'serviceWorker', {
          reason: canRegister.reason,
        });
        return null;
      }

      // Merge configuration
      if (customConfig) {
        this.config = { ...this.config, ...customConfig };
      }

      if (!this.config.enabled) {
        logger.info('Service Worker registration disabled by configuration', 'serviceWorker');
        return null;
      }

      logger.info('Registering Service Worker...', 'serviceWorker', {
        scriptURL,
        config: this.config,
      });

      // Register the service worker
      const registration = await navigator.serviceWorker.register(scriptURL, {
        scope: this.config.scope,
        updateViaCache: this.config.updateViaCache,
      });

      // Update status
      this.status = {
        isRegistered: true,
        isControlling: !!navigator.serviceWorker.controller,
        registration,
        controller: navigator.serviceWorker.controller,
        state: (registration.active?.state as 'installing' | 'installed' | 'activating' | 'activated' | 'redundant' | null) || null,
      };

      // Set up event listeners
      this.setupServiceWorkerEventListeners(registration);

      logger.info('Service Worker registered successfully', 'serviceWorker', {
        scope: registration.scope,
        state: this.status.state,
      });

      return registration;
    } catch (error) {
      this.handleServiceWorkerError(error);
      return null;
    }
  }

  /**
   * Unregister all Service Workers
   */
  public async unregisterAllServiceWorkers(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        await registration.unregister();
        logger.debug('Service Worker unregistered', 'serviceWorker', {
          scope: registration.scope,
        });
      }

      // Update status
      this.status = this.getInitialStatus();

      logger.info('All Service Workers unregistered', 'serviceWorker', {
        count: registrations.length,
      });
    } catch (error) {
      logger.error('Failed to unregister Service Workers', 'serviceWorker', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current Service Worker status
   */
  public getStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  /**
   * Update Service Worker
   */
  public async updateServiceWorker(): Promise<boolean> {
    if (!this.status.registration) {
      return false;
    }

    try {
      await this.status.registration.update();
      logger.info('Service Worker update triggered', 'serviceWorker');
      return true;
    } catch (error) {
      logger.error('Failed to update Service Worker', 'serviceWorker', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Add event listener for Service Worker events
   */
  public addEventListener(
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);

    // Add to actual event target
    if (event === 'message' || event === 'error') {
      navigator.serviceWorker.addEventListener(event, listener, options);
    } else if (this.status.registration) {
      this.status.registration.addEventListener(event, listener, options);
    }
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    // Remove from actual event target
    if (event === 'message' || event === 'error') {
      navigator.serviceWorker.removeEventListener(event, listener);
    } else if (this.status.registration) {
      this.status.registration.removeEventListener(event, listener);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Remove all event listeners
    this.eventListeners.clear();

    // Reset status
    this.status = this.getInitialStatus();

    logger.info('Service Worker Manager destroyed', 'serviceWorker');
  }

  // Private helper methods

  private isLocalhost(): boolean {
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    );
  }

  private parseUserAgent(userAgent: string): { name: string; version: string } {
    // Chrome
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      return {
        name: 'chrome',
        version: match ? match[1] : 'unknown',
      };
    }

    // Firefox
    if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      return {
        name: 'firefox',
        version: match ? match[1] : 'unknown',
      };
    }

    // Safari
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      return {
        name: 'safari',
        version: match ? match[1] : 'unknown',
      };
    }

    // Edge
    if (userAgent.includes('Edge')) {
      const match = userAgent.match(/Edge\/(\d+\.\d+)/);
      return {
        name: 'edge',
        version: match ? match[1] : 'unknown',
      };
    }

    return { name: 'unknown', version: 'unknown' };
  }

  private async checkBrowserSpecificRequirements(
    compatibility: BrowserCompatibility
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Firefox-specific checks
    if (compatibility.browserName === 'firefox') {
      return await this.checkFirefoxRequirements();
    }

    // Safari-specific checks
    if (compatibility.browserName === 'safari') {
      return this.checkSafariRequirements(compatibility);
    }

    return { allowed: true };
  }

  private async checkFirefoxRequirements(): Promise<{ allowed: boolean; reason?: string }> {
    // Check for private browsing mode
    if (typeof navigator.storage !== 'undefined') {
      return navigator.storage
        .estimate()
        .then((estimate) => {
          if (estimate.quota === 0) {
            return {
              allowed: false,
              reason: 'Private browsing mode detected - Service Worker not supported',
            };
          }
          return { allowed: true };
        })
        .catch(() => ({
          allowed: false,
          reason: 'Storage API not available - check Firefox privacy settings',
        }));
    }

    return { allowed: true };
  }

  private checkSafariRequirements(compatibility: BrowserCompatibility): { allowed: boolean; reason?: string } {
    // Safari has some limitations with Service Workers
    const version = parseFloat(compatibility.version);
    if (version < 11.1) {
      return {
        allowed: false,
        reason: 'Safari version too old - Service Worker requires Safari 11.1+',
      };
    }

    return { allowed: true };
  }

  private setupServiceWorkerEventListeners(
    registration: ServiceWorkerRegistration
  ): void {
    // Handle updates
    registration.addEventListener('updatefound', () => {
      logger.info('Service Worker update found', 'serviceWorker');

      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            logger.info('New Service Worker installed, ready to activate', 'serviceWorker');
            // Trigger custom event for app to handle
            this.dispatchCustomEvent('serviceWorkerUpdateAvailable', {
              registration,
              newWorker,
            });
          }
        });
      }
    });

    // Handle state changes
    registration.addEventListener('statechange', () => {
      this.status.state = (registration.active?.state as 'installing' | 'installed' | 'activating' | 'activated' | 'redundant' | null) || null;
      logger.debug('Service Worker state changed', 'serviceWorker', {
        state: this.status.state,
      });
    });

    // Global error handler
    navigator.serviceWorker.addEventListener('error', (event) => {
      logger.error('Service Worker error', 'serviceWorker', { event });
      this.dispatchCustomEvent('serviceWorkerError', { event });
    });

    // Message handler
    navigator.serviceWorker.addEventListener('message', (event) => {
      logger.debug('Service Worker message received', 'serviceWorker', {
        data: event.data,
      });
      this.dispatchCustomEvent('serviceWorkerMessage', { event });
    });
  }

  private setupGlobalEventListeners(): void {
    // Handle online/offline events
    window.addEventListener('online', () => {
      logger.info('Network connection restored', 'serviceWorker');
      this.dispatchCustomEvent('networkOnline', {});
    });

    window.addEventListener('offline', () => {
      logger.info('Network connection lost', 'serviceWorker');
      this.dispatchCustomEvent('networkOffline', {});
    });
  }

  private handleServiceWorkerError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (error instanceof Error) {
      if (error.name === 'SecurityError') {
        logger.warn('Service Worker registration blocked by security policy', 'serviceWorker', {
          message: errorMessage,
        });
      } else if (error.name === 'NotSupportedError') {
        logger.warn('Service Worker not supported in this context', 'serviceWorker', {
          message: errorMessage,
        });
      } else if (
        errorMessage.includes('insecure') ||
        errorMessage.includes('insecure')
      ) {
        logger.warn('Service Worker registration failed: Insecure context detected', 'serviceWorker');
      } else if (errorMessage.includes('DOMException')) {
        logger.warn('Service Worker registration failed: DOM Exception - likely security restriction', 'serviceWorker');
      } else {
        logger.error('Service Worker registration failed', 'serviceWorker', {
          error: errorMessage,
          stack: error.stack,
        });
      }
    } else {
      logger.error('Service Worker registration failed with unknown error', 'serviceWorker', {
        error: errorMessage,
      });
    }

    this.dispatchCustomEvent('serviceWorkerRegistrationFailed', { error });
  }

  private dispatchCustomEvent(eventName: string, detail: unknown): void {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();
export default ServiceWorkerManager;
