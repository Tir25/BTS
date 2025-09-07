import React, { ComponentType, lazy, Suspense } from 'react';
import ErrorBoundary from '../components/error/ErrorBoundary';

// Loading component for lazy loading
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
    <div className="text-center">
      <div className="loading-spinner mx-auto mb-4" />
      <p className="text-white text-lg">Loading...</p>
    </div>
  </div>
);

// Error fallback for lazy loading
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
    <div className="text-center">
      <div className="text-red-400 mb-4 text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Component</h2>
      <p className="text-red-200 mb-4">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Enhanced lazy loading wrapper with error boundary and suspense
export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
) => {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => {
    const FallbackComponent = fallback || LoadingFallback;
    return (
      <ErrorBoundary fallback={<ErrorFallback error={new Error('Component failed to load')} />}>
        <Suspense fallback={<FallbackComponent />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
};

// Enhanced preload function with priority-based loading
export const preloadComponent = (
  importFunc: () => Promise<any>,
  priority: 'high' | 'medium' | 'low' = 'medium'
) => {
  const preloadPromise = importFunc();
  
  // Add priority-based loading
  if (priority === 'high') {
    // High priority: load immediately
    return preloadPromise;
  } else if (priority === 'medium') {
    // Medium priority: load when idle
    if ('requestIdleCallback' in window) {
      return new Promise((resolve) => {
        requestIdleCallback(() => {
          preloadPromise.then(resolve);
        });
      });
    }
  } else {
    // Low priority: load with delay
    return new Promise((resolve) => {
      setTimeout(() => {
        preloadPromise.then(resolve);
      }, 1000);
    });
  }
  
  return preloadPromise;
};

// Route-based lazy loading with preloading
export const createLazyRoute = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  preloadTrigger?: () => boolean
) => {
  const LazyComponent = lazy(importFunc);
  
  // Preload on hover or focus
  const preload = () => {
    if (preloadTrigger && preloadTrigger()) {
      importFunc();
    }
  };
  
  return {
    Component: (props: React.ComponentProps<T>) => (
      <ErrorBoundary fallback={<ErrorFallback error={new Error('Component failed to load')} />}>
        <Suspense fallback={<LoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    ),
    preload,
  };
};

// Performance monitoring for lazy loading
export const trackLazyLoadPerformance = (componentName: string) => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`📊 Lazy load performance - ${componentName}: ${loadTime.toFixed(2)}ms`);
    
    // Track in performance API if available
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${componentName}-lazy-load-end`);
      performance.measure(
        `${componentName}-lazy-load`,
        `${componentName}-lazy-load-start`,
        `${componentName}-lazy-load-end`
      );
    }
  };
};

// Intersection Observer for lazy loading optimization
export const useIntersectionObserver = (
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
          callback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );
    
    return () => observer.disconnect();
  }, [callback, hasIntersected, options]);
  
  return { isIntersecting, hasIntersected };
};

// Smart component loader with retry logic
export const createSmartLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    fallback?: ComponentType;
    timeout?: number;
    retryCount?: number;
    preload?: boolean;
    priority?: 'high' | 'medium' | 'low';
  } = {}
) => {
  const {
    fallback,
    timeout = 5000,
    retryCount = 3,
    preload = false,
    priority = 'medium'
  } = options;
  
  let retryAttempts = 0;
  
  const loadComponent = async (): Promise<{ default: T }> => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Component load timeout')), timeout);
      });
      
      const loadPromise = importFunc();
      return await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
      if (retryAttempts < retryCount) {
        retryAttempts++;
        console.warn(`[SmartLazyLoading] Retry attempt ${retryAttempts} for component`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryAttempts));
        return loadComponent();
      }
      throw error;
    }
  };
  
  const LazyComponent = lazy(loadComponent);
  
  // Preload if requested
  if (preload) {
    preloadComponent(importFunc, priority);
  }
  
  return (props: React.ComponentProps<T>) => {
    const FallbackComponent = fallback || LoadingFallback;
    return (
      <ErrorBoundary fallback={<ErrorFallback error={new Error('Component failed to load')} />}>
        <Suspense fallback={<FallbackComponent />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
};

// Batch component loader for multiple components
export const createBatchLazyLoader = <T extends ComponentType<any>>(
  components: Array<{
    name: string;
    importFunc: () => Promise<{ default: T }>;
    priority: 'high' | 'medium' | 'low';
  }>
) => {
  const loadPromises = components.map(({ importFunc, priority }) => 
    preloadComponent(importFunc, priority)
  );
  
  return {
    loadAll: () => Promise.all(loadPromises),
    loadByPriority: (priority: 'high' | 'medium' | 'low') => {
      const filteredComponents = components.filter(c => c.priority === priority);
      return Promise.all(filteredComponents.map(c => preloadComponent(c.importFunc, c.priority)));
    }
  };
};

// Route-based lazy loading with smart preloading
export const createRouteLazyLoader = () => {
  const routeComponents = new Map<string, () => Promise<{ default: ComponentType<any> }>>();
  const loadedRoutes = new Set<string>();
  
  const registerRoute = (route: string, importFunc: () => Promise<{ default: ComponentType<any> }>) => {
    routeComponents.set(route, importFunc);
  };
  
  const preloadRoute = async (route: string) => {
    const importFunc = routeComponents.get(route);
    if (importFunc && !loadedRoutes.has(route)) {
      try {
        await importFunc();
        loadedRoutes.add(route);
        console.log(`[RouteLazyLoader] Preloaded route: ${route}`);
      } catch (error) {
        console.error(`[RouteLazyLoader] Failed to preload route: ${route}`, error);
      }
    }
  };
  
  const preloadAdjacentRoutes = (currentRoute: string) => {
    // Simple adjacency logic - in a real app, you'd use a proper routing graph
    const adjacentRoutes = Array.from(routeComponents.keys()).filter(route => 
      route !== currentRoute && !loadedRoutes.has(route)
    );
    
    // Preload up to 2 adjacent routes
    adjacentRoutes.slice(0, 2).forEach(route => {
      preloadRoute(route);
    });
  };
  
  return {
    registerRoute,
    preloadRoute,
    preloadAdjacentRoutes,
    isRouteLoaded: (route: string) => loadedRoutes.has(route)
  };
};

// Performance monitoring for lazy loading
export const useLazyLoadPerformance = () => {
  const [metrics, setMetrics] = React.useState<{
    totalLoads: number;
    averageLoadTime: number;
    failedLoads: number;
    memoryUsage: number;
  }>({
    totalLoads: 0,
    averageLoadTime: 0,
    failedLoads: 0,
    memoryUsage: 0
  });
  
  const trackLoad = (loadTime: number, success: boolean) => {
    setMetrics(prev => ({
      totalLoads: prev.totalLoads + 1,
      averageLoadTime: (prev.averageLoadTime * prev.totalLoads + loadTime) / (prev.totalLoads + 1),
      failedLoads: success ? prev.failedLoads : prev.failedLoads + 1,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    }));
  };
  
  return { metrics, trackLoad };
};
