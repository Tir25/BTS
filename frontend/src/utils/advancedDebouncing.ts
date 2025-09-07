// Advanced Debouncing and Throttling for User Interactions
// Optimized for map interactions, form inputs, and real-time updates

import { useCallback, useRef, useEffect } from 'react';

export interface DebounceConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface ThrottleConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface InteractionConfig {
  // Map interactions
  map: {
    zoom: DebounceConfig;
    pan: ThrottleConfig;
    click: DebounceConfig;
    hover: DebounceConfig;
  };
  
  // Form interactions
  form: {
    input: DebounceConfig;
    search: DebounceConfig;
    validation: DebounceConfig;
  };
  
  // Real-time updates
  realtime: {
    locationUpdate: ThrottleConfig;
    websocketMessage: ThrottleConfig;
    apiCall: DebounceConfig;
  };
  
  // UI interactions
  ui: {
    resize: ThrottleConfig;
    scroll: ThrottleConfig;
    click: DebounceConfig;
  };
}

class AdvancedDebouncer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private lastCallTimes: Map<string, number> = new Map();
  private config: InteractionConfig;

  constructor(config: Partial<InteractionConfig> = {}) {
    this.config = {
      map: {
        zoom: { delay: 300, leading: false, trailing: true },
        pan: { delay: 16, leading: true, trailing: true }, // 60fps
        click: { delay: 200, leading: true, trailing: false },
        hover: { delay: 150, leading: false, trailing: true }
      },
      form: {
        input: { delay: 300, leading: false, trailing: true },
        search: { delay: 500, leading: false, trailing: true },
        validation: { delay: 1000, leading: false, trailing: true }
      },
      realtime: {
        locationUpdate: { delay: 1000, leading: true, trailing: true },
        websocketMessage: { delay: 100, leading: true, trailing: true },
        apiCall: { delay: 200, leading: false, trailing: true }
      },
      ui: {
        resize: { delay: 16, leading: true, trailing: true }, // 60fps
        scroll: { delay: 16, leading: true, trailing: true }, // 60fps
        click: { delay: 100, leading: true, trailing: false }
      },
      ...config
    };
  }

  // Advanced debounce with leading/trailing options
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    config: DebounceConfig
  ): T {
    return ((...args: Parameters<T>) => {
      const { delay, leading = false, trailing = true, maxWait } = config;
      const now = Date.now();
      const lastCallTime = this.lastCallTimes.get(key) || 0;
      
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }
      
      // Check if we should call immediately (leading edge)
      if (leading && now - lastCallTime >= delay) {
        this.lastCallTimes.set(key, now);
        return func(...args);
      }
      
      // Check maxWait constraint
      if (maxWait && now - lastCallTime >= maxWait) {
        this.lastCallTimes.set(key, now);
        return func(...args);
      }
      
      // Set timer for trailing edge
      if (trailing) {
        const timer = setTimeout(() => {
          this.lastCallTimes.set(key, Date.now());
          this.timers.delete(key);
          func(...args);
        }, delay);
        
        this.timers.set(key, timer);
      }
    }) as T;
  }

  // Advanced throttle with leading/trailing options
  throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    config: ThrottleConfig
  ): T {
    return ((...args: Parameters<T>) => {
      const { delay, leading = true, trailing = true } = config;
      const now = Date.now();
      const lastCallTime = this.lastCallTimes.get(key) || 0;
      
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }
      
      // Check if we should call immediately (leading edge)
      if (leading && now - lastCallTime >= delay) {
        this.lastCallTimes.set(key, now);
        return func(...args);
      }
      
      // Set timer for trailing edge
      if (trailing) {
        const timer = setTimeout(() => {
          this.lastCallTimes.set(key, Date.now());
          this.timers.delete(key);
          func(...args);
        }, delay - (now - lastCallTime));
        
        this.timers.set(key, timer);
      }
    }) as T;
  }

  // Cancel a debounced/throttled function
  cancel(key: string): void {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  // Cancel all timers
  cancelAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.lastCallTimes.clear();
  }

  // Get configuration for a specific interaction type
  getConfig(type: keyof InteractionConfig, interaction: string): DebounceConfig | ThrottleConfig {
    return (this.config[type] as any)[interaction];
  }

  // Update configuration
  updateConfig(newConfig: Partial<InteractionConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      map: { ...this.config.map, ...newConfig.map },
      form: { ...this.config.form, ...newConfig.form },
      realtime: { ...this.config.realtime, ...newConfig.realtime },
      ui: { ...this.config.ui, ...newConfig.ui }
    };
  }
}

// Create singleton instance
export const advancedDebouncer = new AdvancedDebouncer();

// React hooks for common debouncing patterns
export const useAdvancedDebounce = <T extends (...args: any[]) => any>(
  func: T,
  config: DebounceConfig,
  deps: React.DependencyList = []
): T => {
  const keyRef = useRef(`debounce_${Math.random().toString(36).substr(2, 9)}`);
  
  return useCallback(
    advancedDebouncer.debounce(keyRef.current, func, config),
    [func, config.delay, config.leading, config.trailing, config.maxWait, ...deps]
  );
};

export const useAdvancedThrottle = <T extends (...args: any[]) => any>(
  func: T,
  config: ThrottleConfig,
  deps: React.DependencyList = []
): T => {
  const keyRef = useRef(`throttle_${Math.random().toString(36).substr(2, 9)}`);
  
  return useCallback(
    advancedDebouncer.throttle(keyRef.current, func, config),
    [func, config.delay, config.leading, config.trailing, ...deps]
  );
};

// Specialized hooks for common use cases
export const useMapInteractionDebounce = <T extends (...args: any[]) => any>(
  func: T,
  interaction: 'zoom' | 'pan' | 'click' | 'hover',
  deps: React.DependencyList = []
): T => {
  const config = advancedDebouncer.getConfig('map', interaction);
  
  if (interaction === 'pan') {
    return useAdvancedThrottle(func, config as ThrottleConfig, deps);
  } else {
    return useAdvancedDebounce(func, config as DebounceConfig, deps);
  }
};

export const useFormDebounce = <T extends (...args: any[]) => any>(
  func: T,
  interaction: 'input' | 'search' | 'validation',
  deps: React.DependencyList = []
): T => {
  const config = advancedDebouncer.getConfig('form', interaction);
  return useAdvancedDebounce(func, config as DebounceConfig, deps);
};

export const useRealtimeThrottle = <T extends (...args: any[]) => any>(
  func: T,
  interaction: 'locationUpdate' | 'websocketMessage' | 'apiCall',
  deps: React.DependencyList = []
): T => {
  const config = advancedDebouncer.getConfig('realtime', interaction);
  
  if (interaction === 'apiCall') {
    return useAdvancedDebounce(func, config as DebounceConfig, deps);
  } else {
    return useAdvancedThrottle(func, config as ThrottleConfig, deps);
  }
};

export const useUIInteractionDebounce = <T extends (...args: any[]) => any>(
  func: T,
  interaction: 'resize' | 'scroll' | 'click',
  deps: React.DependencyList = []
): T => {
  const config = advancedDebouncer.getConfig('ui', interaction);
  
  if (interaction === 'resize' || interaction === 'scroll') {
    return useAdvancedThrottle(func, config as ThrottleConfig, deps);
  } else {
    return useAdvancedDebounce(func, config as DebounceConfig, deps);
  }
};

// Utility functions for batch operations
export const createBatchProcessor = <T>(
  processor: (items: T[]) => void,
  config: DebounceConfig
) => {
  const batch: T[] = [];
  const processBatch = advancedDebouncer.debounce(
    'batch-processor',
    () => {
      if (batch.length > 0) {
        processor([...batch]);
        batch.length = 0;
      }
    },
    config
  );

  return (item: T) => {
    batch.push(item);
    processBatch();
  };
};

// Performance monitoring for debounced functions
export const createMonitoredDebounce = <T extends (...args: any[]) => any>(
  key: string,
  func: T,
  config: DebounceConfig,
  onPerformance?: (metrics: { calls: number; averageDelay: number; maxDelay: number }) => void
): T => {
  let callCount = 0;
  let totalDelay = 0;
  let maxDelay = 0;
  const startTimes: number[] = [];

  const monitoredFunc = ((...args: Parameters<T>) => {
    const startTime = performance.now();
    startTimes.push(startTime);
    callCount++;

    const result = advancedDebouncer.debounce(key, func, config)(...args);

    const endTime = performance.now();
    const delay = endTime - startTime;
    totalDelay += delay;
    maxDelay = Math.max(maxDelay, delay);

    // Report performance metrics periodically
    if (callCount % 10 === 0 && onPerformance) {
      onPerformance({
        calls: callCount,
        averageDelay: totalDelay / callCount,
        maxDelay
      });
    }

    return result;
  }) as T;

  return monitoredFunc;
};

// Cleanup function for component unmount
export const useDebounceCleanup = () => {
  useEffect(() => {
    return () => {
      advancedDebouncer.cancelAll();
    };
  }, []);
};

// Export the debouncer instance for direct use
export { advancedDebouncer as debouncer };
