// Performance monitoring utility for Web Vitals
// This can be used to track Core Web Vitals in production

export const initPerformanceMonitoring = () => {
  // Only run in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Lazy load web-vitals to avoid bundle size impact
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    // Cumulative Layout Shift (CLS)
    getCLS((metric) => {
      console.log('CLS:', metric.value);
      // Send to analytics service here
    });

    // First Input Delay (FID)
    getFID((metric) => {
      console.log('FID:', metric.value);
      // Send to analytics service here
    });

    // First Contentful Paint (FCP)
    getFCP((metric) => {
      console.log('FCP:', metric.value);
      // Send to analytics service here
    });

    // Largest Contentful Paint (LCP)
    getLCP((metric) => {
      console.log('LCP:', metric.value);
      // Send to analytics service here
    });

    // Time to First Byte (TTFB)
    getTTFB((metric) => {
      console.log('TTFB:', metric.value);
      // Send to analytics service here
    });
  }).catch((error) => {
    console.warn('Web Vitals monitoring not available:', error);
  });
};

// Performance observer for custom metrics
export const observePerformance = () => {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Navigation timing:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              domInteractive: navEntry.domInteractive,
              domComplete: navEntry.domComplete,
            });
          }
        }
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            // Log slow resources
            if (resourceEntry.duration > 1000) {
              console.warn('Slow resource:', resourceEntry.name, resourceEntry.duration);
            }
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance observer not available:', error);
    }
  }
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    try {
      const memory = (performance as any).memory;
      console.log('Memory usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
      });
    } catch (error) {
      console.warn('Memory monitoring not available:', error);
    }
  }
};

// Network information monitoring
export const monitorNetworkInfo = () => {
  if ('connection' in navigator) {
    try {
      const connection = (navigator as any).connection;
      console.log('Network info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink + ' Mbps',
        rtt: connection.rtt + ' ms',
      });
    } catch (error) {
      console.warn('Network monitoring not available:', error);
    }
  }
};

// Initialize all performance monitoring
export const initAllPerformanceMonitoring = () => {
  try {
    initPerformanceMonitoring();
    observePerformance();
    
    // Monitor memory usage periodically
    setInterval(monitorMemoryUsage, 30000); // Every 30 seconds
    
    // Monitor network info on page load
    monitorNetworkInfo();
  } catch (error) {
    console.warn('Performance monitoring initialization failed:', error);
  }
};
