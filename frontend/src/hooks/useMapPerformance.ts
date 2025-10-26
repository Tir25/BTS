import { useState, useEffect, useRef, useCallback } from 'react';

import { logger } from '../utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  longTasks: number;
  frameRate: number;
  lastUpdate: string;
  connectionLatency: number;
  errorRate: number;
}

interface PerformanceConfig {
  enableMonitoring: boolean;
  updateInterval: number;
  memoryThreshold: number;
  renderTimeThreshold: number;
  longTaskThreshold: number;
  frameRateThreshold: number;
}

const defaultConfig: PerformanceConfig = {
  enableMonitoring: true,
  updateInterval: 5000, // 5 seconds
  memoryThreshold: 100, // 100MB
  renderTimeThreshold: 16, // 16ms (60fps)
  longTaskThreshold: 50, // 50ms
  frameRateThreshold: 30, // 30fps minimum
};

export const useMapPerformance = (config: Partial<PerformanceConfig> = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    longTasks: 0,
    frameRate: 0,
    lastUpdate: new Date().toISOString(),
    connectionLatency: 0,
    errorRate: 0,
  });

  const [warnings, setWarnings] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(100);

  const mergedConfig = { ...defaultConfig, ...config };
  const observerRef = useRef<PerformanceObserver | null>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const longTasksRef = useRef(0);
  const errorCountRef = useRef(0);
  const totalOperationsRef = useRef(0);
  const connectionLatencyRef = useRef(0);

  // Measure render time
  const measureRenderTime = useCallback(() => {
    const startTime = performance.now();
    
    return new Promise<number>((resolve) => {
      requestAnimationFrame(() => {
        const endTime = performance.now();
        resolve(endTime - startTime);
      });
    });
  }, []);

  // Get memory usage
  const getMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }, []);

  // Count React components
  const countComponents = useCallback((): number => {
    const elements = document.querySelectorAll('[data-reactroot]');
    return elements.length;
  }, []);

  // Calculate frame rate
  const calculateFrameRate = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    
    if (delta > 0) {
      const fps = 1000 / delta;
      lastFrameTimeRef.current = now;
      frameCountRef.current++;
      return Math.round(fps);
    }
    
    return 0;
  }, []);

  // Monitor long tasks
  const monitorLongTasks = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > mergedConfig.longTaskThreshold) {
            longTasksRef.current++;
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      observerRef.current = observer;
    } catch (error) {
      logger.warn('Warning', 'component', { data: 'Long task monitoring not supported:', error });
    }
  }, [mergedConfig.longTaskThreshold]);

  // Update metrics
  const updateMetrics = useCallback(async () => {
    if (!mergedConfig.enableMonitoring) return;

    const renderTime = await measureRenderTime();
    const memoryUsage = getMemoryUsage();
    const componentCount = countComponents();
    const frameRate = calculateFrameRate();
    const longTasks = longTasksRef.current;
    const errorRate = totalOperationsRef.current > 0 
      ? (errorCountRef.current / totalOperationsRef.current) * 100 
      : 0;

    const newMetrics: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      componentCount,
      longTasks,
      frameRate,
      lastUpdate: new Date().toISOString(),
      connectionLatency: connectionLatencyRef.current,
      errorRate,
    };

    setMetrics(newMetrics);

    // Check for performance warnings
    const newWarnings: string[] = [];
    
    if (memoryUsage > mergedConfig.memoryThreshold) {
      newWarnings.push(`High memory usage: ${memoryUsage}MB`);
    }

    if (renderTime > mergedConfig.renderTimeThreshold) {
      newWarnings.push(`Slow render time: ${renderTime.toFixed(2)}ms`);
    }

    if (frameRate < mergedConfig.frameRateThreshold && frameRate > 0) {
      newWarnings.push(`Low frame rate: ${frameRate}fps`);
    }

    if (longTasks > 5) {
      newWarnings.push(`Too many long tasks: ${longTasks}`);
    }

    if (errorRate > 5) {
      newWarnings.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    setWarnings(newWarnings);

    // Calculate performance score
    let score = 100;

    // Deduct points for issues
    if (memoryUsage > mergedConfig.memoryThreshold) {
      score -= Math.min(30, (memoryUsage - mergedConfig.memoryThreshold) * 2);
    }

    if (renderTime > mergedConfig.renderTimeThreshold) {
      score -= Math.min(40, (renderTime - mergedConfig.renderTimeThreshold) * 2);
    }

    if (frameRate < mergedConfig.frameRateThreshold && frameRate > 0) {
      score -= Math.min(30, (mergedConfig.frameRateThreshold - frameRate) * 2);
    }

    if (longTasks > 5) {
      score -= Math.min(20, longTasks * 2);
    }

    if (errorRate > 5) {
      score -= Math.min(25, errorRate * 2);
    }

    if (warnings.length > 3) {
      score -= 10;
    }

    setPerformanceScore(Math.max(0, score));
  }, [
    mergedConfig,
    measureRenderTime,
    getMemoryUsage,
    countComponents,
    calculateFrameRate,
    warnings.length,
  ]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    monitorLongTasks();

    const interval = setInterval(updateMetrics, mergedConfig.updateInterval);
    
    return () => {
      clearInterval(interval);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isMonitoring, mergedConfig.updateInterval, monitorLongTasks, updateMetrics]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  // Clear warnings
  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  // Record operation (for error rate calculation)
  const recordOperation = useCallback((success: boolean) => {
    totalOperationsRef.current++;
    if (!success) {
      errorCountRef.current++;
    }
  }, []);

  // Record connection latency
  const recordConnectionLatency = useCallback((latency: number) => {
    connectionLatencyRef.current = latency;
  }, []);

  // Get performance recommendations
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (metrics.memoryUsage > mergedConfig.memoryThreshold) {
      recommendations.push('Consider implementing virtual scrolling for large lists');
      recommendations.push('Review component lifecycle and cleanup unused objects');
    }

    if (metrics.renderTime > mergedConfig.renderTimeThreshold) {
      recommendations.push('Use React.memo() to prevent unnecessary re-renders');
      recommendations.push('Implement useCallback and useMemo for expensive operations');
    }

    if (metrics.frameRate < mergedConfig.frameRateThreshold && metrics.frameRate > 0) {
      recommendations.push('Reduce animation complexity or frequency');
      recommendations.push('Consider using CSS transforms instead of layout changes');
    }

    if (metrics.longTasks > 5) {
      recommendations.push('Break down heavy computations into smaller chunks');
      recommendations.push('Use Web Workers for CPU-intensive tasks');
    }

    if (metrics.errorRate > 5) {
      recommendations.push('Implement better error handling and retry mechanisms');
      recommendations.push('Add input validation to prevent invalid operations');
    }

    return recommendations;
  }, [metrics, mergedConfig]);

  // Auto-start monitoring
  useEffect(() => {
    if (mergedConfig.enableMonitoring) {
      const cleanup = startMonitoring();
      return cleanup;
    }
  }, [mergedConfig.enableMonitoring, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    warnings,
    isMonitoring,
    performanceScore,
    startMonitoring,
    stopMonitoring,
    clearWarnings,
    updateMetrics,
    recordOperation,
    recordConnectionLatency,
    getRecommendations,
  };
};

export default useMapPerformance;
