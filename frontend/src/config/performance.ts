// frontend/src/config/performance.ts

export interface PerformanceConfig {
  // React performance optimizations
  react: {
    enableMemo: boolean;
    enableCallback: boolean;
    enableStrictMode: boolean;
    enableProfiler: boolean;
  };

  // Bundle optimization
  bundle: {
    enableCodeSplitting: boolean;
    enableTreeShaking: boolean;
    enableMinification: boolean;
    enableCompression: boolean;
    chunkSizeLimit: number; // in KB
  };

  // Image optimization
  images: {
    enableLazyLoading: boolean;
    enableWebP: boolean;
    enableProgressiveLoading: boolean;
    defaultQuality: number; // 0-1
    maxWidth: number;
  };

  // WebSocket optimization
  websocket: {
    enableCompression: boolean;
    enableHeartbeat: boolean;
    heartbeatInterval: number; // in ms
    reconnectAttempts: number;
    reconnectDelay: number; // in ms
  };

  // Caching
  caching: {
    enableServiceWorker: boolean;
    enableMemoryCache: boolean;
    enableLocalStorage: boolean;
    cacheExpiry: number; // in ms
  };

  // Monitoring
  monitoring: {
    enablePerformanceTracking: boolean;
    enableRenderTracking: boolean;
    enableMemoryTracking: boolean;
    logSlowRenders: boolean;
    slowRenderThreshold: number; // in ms
  };

  // Virtualization
  virtualization: {
    enableVirtualScrolling: boolean;
    defaultItemHeight: number;
    overscanCount: number;
    enableInfiniteScroll: boolean;
  };

  // Debouncing and throttling
  timing: {
    defaultDebounceDelay: number; // in ms
    defaultThrottleDelay: number; // in ms
    searchDebounceDelay: number; // in ms
    scrollThrottleDelay: number; // in ms
  };
}

// Default performance configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  react: {
    enableMemo: true,
    enableCallback: true,
    enableStrictMode: process.env.NODE_ENV === 'development',
    enableProfiler: process.env.NODE_ENV === 'development',
  },

  bundle: {
    enableCodeSplitting: true,
    enableTreeShaking: true,
    enableMinification: process.env.NODE_ENV === 'production',
    enableCompression: process.env.NODE_ENV === 'production',
    chunkSizeLimit: 250, // 250KB
  },

  images: {
    enableLazyLoading: true,
    enableWebP: true,
    enableProgressiveLoading: true,
    defaultQuality: 0.8,
    maxWidth: 1920,
  },

  websocket: {
    enableCompression: true,
    enableHeartbeat: true,
    heartbeatInterval: 30000, // 30 seconds
    reconnectAttempts: 10,
    reconnectDelay: 1000, // 1 second
  },

  caching: {
    enableServiceWorker: process.env.NODE_ENV === 'production',
    enableMemoryCache: true,
    enableLocalStorage: true,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
  },

  monitoring: {
    enablePerformanceTracking: process.env.NODE_ENV === 'development',
    enableRenderTracking: process.env.NODE_ENV === 'development',
    enableMemoryTracking: process.env.NODE_ENV === 'development',
    logSlowRenders: true,
    slowRenderThreshold: 16, // 16ms (60fps)
  },

  virtualization: {
    enableVirtualScrolling: true,
    defaultItemHeight: 50,
    overscanCount: 5,
    enableInfiniteScroll: true,
  },

  timing: {
    defaultDebounceDelay: 300,
    defaultThrottleDelay: 100,
    searchDebounceDelay: 500,
    scrollThrottleDelay: 16, // 60fps
  },
};

// Environment-specific configurations
export const getPerformanceConfig = (): PerformanceConfig => {
  const config = { ...defaultPerformanceConfig };

  // Development overrides
  if (process.env.NODE_ENV === 'development') {
    config.monitoring.enablePerformanceTracking = true;
    config.monitoring.enableRenderTracking = true;
    config.monitoring.enableMemoryTracking = true;
    config.react.enableStrictMode = true;
    config.react.enableProfiler = true;
  }

  // Production overrides
  if (process.env.NODE_ENV === 'production') {
    config.bundle.enableMinification = true;
    config.bundle.enableCompression = true;
    config.caching.enableServiceWorker = true;
    config.monitoring.enablePerformanceTracking = false;
    config.monitoring.enableRenderTracking = false;
    config.monitoring.enableMemoryTracking = false;
  }

  // Test overrides
  if (process.env.NODE_ENV === 'test') {
    config.monitoring.enablePerformanceTracking = false;
    config.monitoring.enableRenderTracking = false;
    config.monitoring.enableMemoryTracking = false;
    config.websocket.enableHeartbeat = false;
    config.caching.enableServiceWorker = false;
  }

  return config;
};

// Performance utilities
export const performanceUtils = {
  // Check if performance monitoring is enabled
  isMonitoringEnabled: (): boolean => {
    const config = getPerformanceConfig();
    return config.monitoring.enablePerformanceTracking;
  },

  // Get slow render threshold
  getSlowRenderThreshold: (): number => {
    const config = getPerformanceConfig();
    return config.monitoring.slowRenderThreshold;
  },

  // Check if WebSocket compression is enabled
  isWebSocketCompressionEnabled: (): boolean => {
    const config = getPerformanceConfig();
    return config.websocket.enableCompression;
  },

  // Get debounce delay for specific use case
  getDebounceDelay: (useCase: 'default' | 'search' | 'scroll'): number => {
    const config = getPerformanceConfig();
    switch (useCase) {
      case 'search':
        return config.timing.searchDebounceDelay;
      case 'scroll':
        return config.timing.scrollThrottleDelay;
      default:
        return config.timing.defaultDebounceDelay;
    }
  },

  // Get throttle delay for specific use case
  getThrottleDelay: (useCase: 'default' | 'scroll' | 'resize'): number => {
    const config = getPerformanceConfig();
    switch (useCase) {
      case 'scroll':
        return config.timing.scrollThrottleDelay;
      case 'resize':
        return config.timing.defaultThrottleDelay;
      default:
        return config.timing.defaultThrottleDelay;
    }
  },

  // Check if virtual scrolling should be enabled
  shouldUseVirtualScrolling: (itemCount: number): boolean => {
    const config = getPerformanceConfig();
    return config.virtualization.enableVirtualScrolling && itemCount > 100;
  },

  // Get optimal chunk size for code splitting
  getOptimalChunkSize: (): number => {
    const config = getPerformanceConfig();
    return config.bundle.chunkSizeLimit;
  },
};

// Performance constants
export const PERFORMANCE_CONSTANTS = {
  // Frame timing
  TARGET_FPS: 60,
  FRAME_DURATION_MS: 16.67, // 1000ms / 60fps
  
  // Memory limits
  MAX_MEMORY_USAGE_MB: 100,
  CACHE_SIZE_LIMIT: 100,
  
  // Network
  REQUEST_TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  
  // Rendering
  MAX_RENDER_TIME_MS: 16,
  SLOW_RENDER_THRESHOLD_MS: 50,
  
  // Bundle
  MAX_BUNDLE_SIZE_KB: 500,
  MAX_CHUNK_SIZE_KB: 250,
  
  // Images
  MAX_IMAGE_SIZE_MB: 5,
  SUPPORTED_IMAGE_FORMATS: ['webp', 'avif', 'jpeg', 'png'],
  
  // WebSocket
  MAX_MESSAGE_SIZE_KB: 64,
  HEARTBEAT_INTERVAL_MS: 30000,
  RECONNECT_DELAY_MS: 1000,
} as const;

// Performance metrics collection
export class PerformanceMetrics {
  private static instance: PerformanceMetrics;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics();
    }
    return PerformanceMetrics.instance;
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values to prevent memory leaks
    if (values.length > 100) {
      values.shift();
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  getMaxMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return Math.max(...values);
  }

  getMinMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return Math.min(...values);
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  getAllMetrics(): Record<string, { average: number; max: number; min: number; count: number }> {
    const result: Record<string, { average: number; max: number; min: number; count: number }> = {};
    
    this.metrics.forEach((values, name) => {
      result[name] = {
        average: this.getAverageMetric(name),
        max: this.getMaxMetric(name),
        min: this.getMinMetric(name),
        count: values.length,
      };
    });
    
    return result;
  }
}

export const performanceMetrics = PerformanceMetrics.getInstance();

