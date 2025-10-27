/**
 * Performance Monitoring Hook
 * Tracks component performance and provides optimization insights
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage: number;
  isSlowRender: boolean;
}

interface PerformanceConfig {
  slowRenderThreshold?: number; // milliseconds
  logPerformance?: boolean;
  trackMemory?: boolean;
}

export function usePerformanceMonitor(
  componentName: string,
  config: PerformanceConfig = {}
) {
  const {
    slowRenderThreshold = 16, // 60fps threshold
    logPerformance = process.env.NODE_ENV === 'development',
    trackMemory = false
  } = config;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    memoryUsage: 0,
    isSlowRender: false
  });

  // Track render start - PRODUCTION FIX: Use useLayoutEffect to prevent infinite loops
  useLayoutEffect(() => {
    lastRenderStartRef.current = performance.now();
  });

  // Track render end - PRODUCTION FIX: Optimized to prevent re-render loops
  const rafIdRef = useRef<number | null>(null);
  
  useLayoutEffect(() => {
    // Cancel any pending RAF to prevent accumulation
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Use requestAnimationFrame to defer the state update until after render
    rafIdRef.current = requestAnimationFrame(() => {
      const renderTime = performance.now() - lastRenderStartRef.current;
      renderCountRef.current += 1;
      
      renderTimesRef.current.push(renderTime);
      
      // Keep only last 10 render times for average calculation
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift();
      }

      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      const isSlowRender = renderTime > slowRenderThreshold;

      // OPTIMIZATION: Only update state if metrics actually changed significantly (>5% or new slow render)
      setMetrics(prev => {
        const avgChanged = Math.abs(prev.averageRenderTime - averageRenderTime) > 0.5;
        const renderTimeChanged = Math.abs(prev.lastRenderTime - renderTime) > 0.5;
        const slowRenderChanged = prev.isSlowRender !== isSlowRender;
        
        // Only update if significant change detected
        if (!avgChanged && !renderTimeChanged && !slowRenderChanged && prev.renderCount === renderCountRef.current - 1) {
          return prev; // Return previous value to prevent re-render
        }

        return {
          renderCount: renderCountRef.current,
          averageRenderTime,
          lastRenderTime: renderTime,
          memoryUsage: trackMemory ? (performance as any).memory?.usedJSHeapSize || 0 : 0,
          isSlowRender
        };
      });

      // Log performance issues - throttled to prevent log spam
      if (logPerformance && isSlowRender && renderCountRef.current % 5 === 0) {
        logger.warn(`Slow render detected in ${componentName}`, 'performance-monitor', {
          renderTime: renderTime.toFixed(2),
          threshold: slowRenderThreshold,
          renderCount: renderCountRef.current
        });
      }

      // Log memory usage if tracking is enabled - throttled
      if (trackMemory && (performance as any).memory && renderCountRef.current % 10 === 0) {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          logger.warn(`High memory usage detected in ${componentName}`, 'performance-monitor', {
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          });
        }
      }
      
      rafIdRef.current = null;
    });
    
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  });

  // Performance optimization suggestions
  const getOptimizationSuggestions = (): string[] => {
    const suggestions: string[] = [];

    if (metrics.averageRenderTime > slowRenderThreshold) {
      suggestions.push('Consider using React.memo() to prevent unnecessary re-renders');
    }

    if (metrics.renderCount > 20) {
      suggestions.push('High render count detected - check for unnecessary state updates');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      suggestions.push('High memory usage - consider optimizing data structures');
    }

    return suggestions;
  };

  return {
    metrics,
    getOptimizationSuggestions,
    resetMetrics: () => {
      renderCountRef.current = 0;
      renderTimesRef.current = [];
      setMetrics({
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        memoryUsage: 0,
        isSlowRender: false
      });
    }
  };
}

// Hook for monitoring component mount/unmount performance
export function useComponentLifecycle(componentName: string) {
  const mountTimeRef = useRef<number>(0);
  const [lifecycleMetrics, setLifecycleMetrics] = useState({
    mountTime: 0,
    isMounted: false
  });

  useEffect(() => {
    mountTimeRef.current = performance.now();
    setLifecycleMetrics(prev => ({
      mountTime: mountTimeRef.current,
      isMounted: true
    }));

    return () => {
      const unmountTime = performance.now();
      const totalLifetime = unmountTime - mountTimeRef.current;
      
      logger.info(`Component ${componentName} lifecycle`, 'performance-monitor', {
        mountTime: mountTimeRef.current,
        unmountTime,
        totalLifetime
      });
    };
  }, [componentName]);

  return lifecycleMetrics;
}
