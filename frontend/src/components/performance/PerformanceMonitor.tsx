// frontend/src/components/performance/PerformanceMonitor.tsx

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  fps: number;
  componentName: string;
  timestamp: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
  showUI?: boolean;
  logToConsole?: boolean;
  threshold?: number; // Log if render time exceeds this threshold (ms)
}

// Memoized performance metrics display
const PerformanceMetricsDisplay = memo<{
  metrics: PerformanceMetrics[];
  isVisible: boolean;
  onToggle: () => void;
}>(({ metrics, isVisible, onToggle }) => {
  const latestMetric = metrics[metrics.length - 1];
  const averageRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
  const averageFPS = metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={onToggle}
        className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-black/90 transition-colors"
      >
        Perf: {latestMetric?.renderTime.toFixed(1)}ms
      </button>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 right-0 bg-black/90 text-white p-4 rounded-lg min-w-64 font-mono text-xs"
          >
            <div className="mb-2 font-semibold">Performance Metrics</div>
            <div className="space-y-1">
              <div>Component: {latestMetric?.componentName}</div>
              <div>Latest Render: {latestMetric?.renderTime.toFixed(2)}ms</div>
              <div>Average Render: {averageRenderTime.toFixed(2)}ms</div>
              <div>Latest FPS: {latestMetric?.fps.toFixed(1)}</div>
              <div>Average FPS: {averageFPS.toFixed(1)}</div>
              <div>Memory: {(latestMetric?.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
              <div>Samples: {metrics.length}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  enabled = true,
  showUI = false,
  logToConsole = true,
  threshold = 16, // 16ms = 60fps
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isUIVisible, setIsUIVisible] = useState(false);
  const renderStartTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const fpsInterval = useRef<NodeJS.Timeout | null>(null);

  // Measure render time
  const startRenderMeasurement = useCallback(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  }, [enabled]);

  const endRenderMeasurement = useCallback(() => {
    if (!enabled) return;

    const renderTime = performance.now() - renderStartTime.current;
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    const currentFPS = frameCount.current;

    const metric: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      fps: currentFPS,
      componentName,
      timestamp: Date.now(),
    };

    setMetrics(prev => {
      const newMetrics = [...prev, metric];
      // Keep only last 100 metrics to prevent memory leaks
      return newMetrics.slice(-100);
    });

    // Log to console if threshold exceeded
    if (logToConsole && renderTime > threshold) {
      console.warn(
        `🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
      );
    }

    return renderTime;
  }, [enabled, componentName, logToConsole, threshold]);

  // FPS measurement
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCount.current++;
    
    if (now - lastFrameTime.current >= 1000) {
      // Update FPS every second
      lastFrameTime.current = now;
      frameCount.current = 0;
    }
  }, []);

  // Start FPS measurement
  useEffect(() => {
    if (!enabled) return;

    const measureFrame = () => {
      measureFPS();
      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);

    return () => {
      if (fpsInterval.current) {
        clearInterval(fpsInterval.current);
      }
    };
  }, [enabled, measureFPS]);

  // Start render measurement on mount
  useEffect(() => {
    startRenderMeasurement();
    
    return () => {
      endRenderMeasurement();
    };
  }, [startRenderMeasurement, endRenderMeasurement]);

  const toggleUI = useCallback(() => {
    setIsUIVisible(prev => !prev);
  }, []);

  // Performance monitoring is handled internally

  return (
    <>
      {showUI && (
        <PerformanceMetricsDisplay
          metrics={metrics}
          isVisible={isUIVisible}
          onToggle={toggleUI}
        />
      )}
    </>
  );
};

// Higher-order component for automatic performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<PerformanceMonitorProps, 'componentName'> = {}
) {
  const WrappedComponent = React.forwardRef<any, P>((props) => {
    const componentName = Component.displayName || Component.name || 'Unknown';
    
    return (
      <>
        <PerformanceMonitor
          componentName={componentName}
          {...options}
        />
        <Component {...(props as P)} />
      </>
    );
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for manual performance measurement
export function usePerformanceMeasurement(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);

  const startMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endMeasurement = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    const metric: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      fps: 0, // FPS would need separate measurement
      componentName,
      timestamp: Date.now(),
    };

    setMetrics(prev => [...prev.slice(-99), metric]);
    return renderTime;
  }, [componentName]);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  return {
    startMeasurement,
    endMeasurement,
    metrics,
    clearMetrics,
  };
}

export default PerformanceMonitor;

