// PRPL Pattern Implementation for Performance Optimization
// Push, Render, Pre-cache, Lazy load

import { serviceWorkerManager } from './serviceWorkerManager';
import { preloadImages, preloadImage } from './imageOptimization';

export interface PRPLConfig {
  // Push configuration
  push: {
    criticalResources: string[];
    preloadRoutes: string[];
    preloadImages: string[];
    preloadFonts: string[];
  };
  
  // Render configuration
  render: {
    criticalCSS: string[];
    criticalJS: string[];
    inlineCriticalCSS: boolean;
    deferNonCriticalJS: boolean;
  };
  
  // Pre-cache configuration
  precache: {
    routes: string[];
    assets: string[];
    maxCacheSize: number; // in MB
    cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  };
  
  // Lazy load configuration
  lazyLoad: {
    components: string[];
    images: boolean;
    routes: boolean;
    intersectionThreshold: number;
    rootMargin: string;
  };
}

export interface ResourcePriority {
  critical: string[];
  high: string[];
  medium: string[];
  low: string[];
}

class PRPLManager {
  private config: PRPLConfig;
  private loadedResources: Set<string> = new Set();
  private preloadedRoutes: Set<string> = new Set();
  private performanceMetrics: Map<string, number> = new Map();

  constructor(config: Partial<PRPLConfig> = {}) {
    this.config = {
      push: {
        criticalResources: [
          '/',
          '/index.html',
          '/manifest.json',
          '/sw.js'
        ],
        preloadRoutes: [
          '/student-map',
          '/driver-dashboard',
          '/admin-dashboard'
        ],
        preloadImages: [
          '/icons/bus-icon.png',
          '/icons/map-marker.png'
        ],
        preloadFonts: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        ],
        ...config.push
      },
      render: {
        criticalCSS: [
          '/src/index.css',
          '/src/components/ui/GlassyCard.css'
        ],
        criticalJS: [
          '/src/main.tsx',
          '/src/App.tsx'
        ],
        inlineCriticalCSS: true,
        deferNonCriticalJS: true,
        ...config.render
      },
      precache: {
        routes: [
          '/student-map',
          '/driver-dashboard',
          '/admin-dashboard',
          '/driver-login',
          '/admin-login'
        ],
        assets: [
          '/icons/',
          '/images/',
          '/fonts/'
        ],
        maxCacheSize: 50, // 50MB
        cacheStrategy: 'stale-while-revalidate',
        ...config.precache
      },
      lazyLoad: {
        components: [
          'StreamlinedManagement',
          'MediaManagement',
          'FileUpload'
        ],
        images: true,
        routes: true,
        intersectionThreshold: 0.1,
        rootMargin: '50px',
        ...config.lazyLoad
      }
    };

    this.initializePRPL();
  }

  // Initialize PRPL pattern
  private async initializePRPL(): Promise<void> {
    console.log('🚀 Initializing PRPL pattern...');
    
    try {
      // 1. Push critical resources
      await this.pushCriticalResources();
      
      // 2. Optimize initial render
      this.optimizeInitialRender();
      
      // 3. Start pre-caching
      this.startPrecaching();
      
      // 4. Setup lazy loading
      this.setupLazyLoading();
      
      console.log('✅ PRPL pattern initialized successfully');
    } catch (error) {
      console.error('❌ PRPL initialization failed:', error);
    }
  }

  // 1. PUSH: Push critical resources early
  private async pushCriticalResources(): Promise<void> {
    console.log('📤 Pushing critical resources...');
    
    const startTime = performance.now();
    
    try {
      // Push critical HTML/CSS/JS
      await this.pushCriticalAssets();
      
      // Push critical images
      await this.pushCriticalImages();
      
      // Push critical fonts
      await this.pushCriticalFonts();
      
      // Push critical routes
      await this.pushCriticalRoutes();
      
      const duration = performance.now() - startTime;
      this.performanceMetrics.set('push-duration', duration);
      
      console.log(`✅ Critical resources pushed in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Failed to push critical resources:', error);
    }
  }

  private async pushCriticalAssets(): Promise<void> {
    const criticalAssets = [
      ...this.config.push.criticalResources,
      ...this.config.render.criticalCSS,
      ...this.config.render.criticalJS
    ];

    await Promise.all(
      criticalAssets.map(async (resource) => {
        try {
          await this.preloadResource(resource, 'high');
          this.loadedResources.add(resource);
        } catch (error) {
          console.warn(`⚠️ Failed to preload critical asset: ${resource}`, error);
        }
      })
    );
  }

  private async pushCriticalImages(): Promise<void> {
    if (this.config.push.preloadImages.length > 0) {
      try {
        await preloadImages(this.config.push.preloadImages);
        this.config.push.preloadImages.forEach(img => this.loadedResources.add(img));
      } catch (error) {
        console.warn('⚠️ Failed to preload critical images:', error);
      }
    }
  }

  private async pushCriticalFonts(): Promise<void> {
    await Promise.all(
      this.config.push.preloadFonts.map(async (font) => {
        try {
          await this.preloadResource(font, 'high');
          this.loadedResources.add(font);
        } catch (error) {
          console.warn(`⚠️ Failed to preload font: ${font}`, error);
        }
      })
    );
  }

  private async pushCriticalRoutes(): Promise<void> {
    // Preload route components
    await Promise.all(
      this.config.push.preloadRoutes.map(async (route) => {
        try {
          await this.preloadRoute(route);
          this.preloadedRoutes.add(route);
        } catch (error) {
          console.warn(`⚠️ Failed to preload route: ${route}`, error);
        }
      })
    );
  }

  // 2. RENDER: Optimize initial route rendering
  private optimizeInitialRender(): void {
    console.log('🎨 Optimizing initial render...');
    
    const startTime = performance.now();
    
    try {
      // Inline critical CSS
      if (this.config.render.inlineCriticalCSS) {
        this.inlineCriticalCSS();
      }
      
      // Defer non-critical JavaScript
      if (this.config.render.deferNonCriticalJS) {
        this.deferNonCriticalJS();
      }
      
      // Optimize font loading
      this.optimizeFontLoading();
      
      // Setup resource hints
      this.setupResourceHints();
      
      const duration = performance.now() - startTime;
      this.performanceMetrics.set('render-optimization-duration', duration);
      
      console.log(`✅ Initial render optimized in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Failed to optimize initial render:', error);
    }
  }

  private inlineCriticalCSS(): void {
    // This would typically be done at build time
    // For runtime, we can inject critical CSS
    const criticalCSS = `
      /* Critical CSS for above-the-fold content */
      body { margin: 0; font-family: Inter, sans-serif; }
      .loading-spinner { 
        width: 40px; height: 40px; 
        border: 4px solid #f3f3f3; 
        border-top: 4px solid #3498db; 
        border-radius: 50%; 
        animation: spin 1s linear infinite; 
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);
  }

  private deferNonCriticalJS(): void {
    // Defer non-critical scripts
    const scripts = document.querySelectorAll('script[data-defer]');
    scripts.forEach(script => {
      script.setAttribute('defer', '');
    });
  }

  private optimizeFontLoading(): void {
    // Add font-display: swap to prevent FOIT
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fontLinks.forEach(link => {
      const linkElement = link as HTMLLinkElement;
      if (!linkElement.href.includes('font-display=swap')) {
        linkElement.href += (linkElement.href.includes('?') ? '&' : '?') + 'font-display=swap';
      }
    });
  }

  private setupResourceHints(): void {
    // Add DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'tile.openstreetmap.org'
    ];
    
    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });
  }

  // 3. PRE-CACHE: Pre-cache routes and assets
  private startPrecaching(): void {
    console.log('💾 Starting pre-caching...');
    
    // Use service worker for pre-caching
    if (serviceWorkerManager.getStatus().isSupported) {
      this.precacheWithServiceWorker();
    } else {
      this.precacheWithCacheAPI();
    }
  }

  private async precacheWithServiceWorker(): Promise<void> {
    try {
      const resourcesToCache = [
        ...this.config.precache.routes,
        ...this.config.precache.assets
      ];
      
      await serviceWorkerManager.preloadResources(resourcesToCache);
      console.log('✅ Resources pre-cached with service worker');
    } catch (error) {
      console.error('❌ Service worker pre-caching failed:', error);
    }
  }

  private async precacheWithCacheAPI(): Promise<void> {
    try {
      const cache = await caches.open('prpl-precache');
      const resourcesToCache = [
        ...this.config.precache.routes,
        ...this.config.precache.assets
      ];
      
      await Promise.all(
        resourcesToCache.map(async (resource) => {
          try {
            const response = await fetch(resource);
            if (response.ok) {
              await cache.put(resource, response);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to cache resource: ${resource}`, error);
          }
        })
      );
      
      console.log('✅ Resources pre-cached with Cache API');
    } catch (error) {
      console.error('❌ Cache API pre-caching failed:', error);
    }
  }

  // 4. LAZY LOAD: Setup lazy loading for non-critical resources
  private setupLazyLoading(): void {
    console.log('🔄 Setting up lazy loading...');
    
    // Setup intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Setup route-based lazy loading
    this.setupRouteLazyLoading();
    
    // Setup component lazy loading
    this.setupComponentLazyLoading();
  }

  private setupIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('⚠️ IntersectionObserver not supported, falling back to immediate loading');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const resource = element.dataset.lazyResource;
            
            if (resource) {
              this.loadLazyResource(resource);
              observer.unobserve(element);
            }
          }
        });
      },
      {
        threshold: this.config.lazyLoad.intersectionThreshold,
        rootMargin: this.config.lazyLoad.rootMargin
      }
    );

    // Observe elements with lazy loading attributes
    document.querySelectorAll('[data-lazy-resource]').forEach(element => {
      observer.observe(element);
    });
  }

  private setupRouteLazyLoading(): void {
    // This would integrate with React Router for route-based lazy loading
    // Implementation depends on routing setup
  }

  private setupComponentLazyLoading(): void {
    // Mark components for lazy loading
    this.config.lazyLoad.components.forEach(componentName => {
      const elements = document.querySelectorAll(`[data-component="${componentName}"]`);
      elements.forEach(element => {
        element.setAttribute('data-lazy-resource', `component:${componentName}`);
      });
    });
  }

  // Utility methods
  private async preloadResource(url: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    // Determine resource type
    if (url.endsWith('.css')) {
      link.as = 'style';
    } else if (url.endsWith('.js')) {
      link.as = 'script';
    } else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      link.as = 'image';
    } else if (url.includes('fonts')) {
      link.as = 'font';
      link.crossOrigin = 'anonymous';
    }
    
    // Set priority
    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high');
    }
    
    document.head.appendChild(link);
    
    return new Promise((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload: ${url}`));
    });
  }

  private async preloadRoute(route: string): Promise<void> {
    // Preload route component
    try {
      const response = await fetch(route);
      if (response.ok) {
        // Cache the route
        const cache = await caches.open('route-cache');
        await cache.put(route, response);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to preload route: ${route}`, error);
    }
  }

  private async loadLazyResource(resource: string): Promise<void> {
    const [type, name] = resource.split(':');
    
    switch (type) {
      case 'component':
        await this.loadLazyComponent(name);
        break;
      case 'image':
        await this.loadLazyImage(name);
        break;
      case 'route':
        await this.loadLazyRoute(name);
        break;
      default:
        console.warn(`⚠️ Unknown lazy resource type: ${type}`);
    }
  }

  private async loadLazyComponent(componentName: string): Promise<void> {
    // This would integrate with React.lazy() for component loading
    console.log(`🔄 Loading lazy component: ${componentName}`);
  }

  private async loadLazyImage(imageUrl: string): Promise<void> {
    try {
      await preloadImage(imageUrl);
      console.log(`🔄 Loaded lazy image: ${imageUrl}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load lazy image: ${imageUrl}`, error);
    }
  }

  private async loadLazyRoute(route: string): Promise<void> {
    try {
      await this.preloadRoute(route);
      console.log(`🔄 Loaded lazy route: ${route}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load lazy route: ${route}`, error);
    }
  }

  // Public API
  public getPerformanceMetrics(): Record<string, number> {
    return Object.fromEntries(this.performanceMetrics);
  }

  public getLoadedResources(): string[] {
    return Array.from(this.loadedResources);
  }

  public getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes);
  }

  public updateConfig(newConfig: Partial<PRPLConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      push: { ...this.config.push, ...newConfig.push },
      render: { ...this.config.render, ...newConfig.render },
      precache: { ...this.config.precache, ...newConfig.precache },
      lazyLoad: { ...this.config.lazyLoad, ...newConfig.lazyLoad }
    };
  }

  public async preloadRouteOnHover(route: string): Promise<void> {
    if (!this.preloadedRoutes.has(route)) {
      try {
        await this.preloadRoute(route);
        this.preloadedRoutes.add(route);
      } catch (error) {
        console.warn(`⚠️ Failed to preload route on hover: ${route}`, error);
      }
    }
  }

  public async preloadComponentOnHover(componentName: string): Promise<void> {
    const resource = `component:${componentName}`;
    if (!this.loadedResources.has(resource)) {
      try {
        await this.loadLazyComponent(componentName);
        this.loadedResources.add(resource);
      } catch (error) {
        console.warn(`⚠️ Failed to preload component on hover: ${componentName}`, error);
      }
    }
  }
}

// Export singleton instance
export const prplManager = new PRPLManager();

// React hook for PRPL integration
export const usePRPL = () => {
  return {
    preloadRoute: (route: string) => prplManager.preloadRouteOnHover(route),
    preloadComponent: (component: string) => prplManager.preloadComponentOnHover(component),
    getMetrics: () => prplManager.getPerformanceMetrics(),
    getLoadedResources: () => prplManager.getLoadedResources(),
    getPreloadedRoutes: () => prplManager.getPreloadedRoutes()
  };
};
