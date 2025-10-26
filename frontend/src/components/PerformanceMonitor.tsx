import React, { useEffect, useState, useCallback } from 'react';

import { logger } from '../utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  componentCount: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  logToConsole?: boolean;
  showUI?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = true,
  showUI = false,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    componentCount: 0,
  });

  const [isVisible, setIsVisible] = useState(showUI);

  // Measure render performance
  const measureRenderTime = useCallback(() => {
    const start = performance.now();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const end = performance.now();
      const renderTime = end - start;
      
      setMetrics(prev => ({ ...prev, renderTime }));
      
      if (logToConsole) {
        logger.debug('Debug info', 'component', { data: `⏱️ Render time: ${renderTime.toFixed(2)}ms` });
      }
    });
  }, [logToConsole]);

  // Monitor memory usage
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      
      setMetrics(prev => ({ ...prev, memoryUsage: usedMB }));
      
      if (logToConsole && usedMB > 50) { // Log if memory usage is high
        logger.warn('🧠 High memory usage', 'component', { data: `${usedMB}MB` });
      }
    }
  }, [logToConsole]);

  // Monitor bundle size (approximate)
  const monitorBundleSize = useCallback(() => {
    // This is a rough estimate - in production you'd use webpack-bundle-analyzer
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('assets')) {
        // Estimate based on file name patterns
        totalSize += 100; // Rough estimate
      }
    });
    
    setMetrics(prev => ({ ...prev, bundleSize: totalSize }));
  }, []);

  // Count React components
  const countComponents = useCallback(() => {
    const reactElements = document.querySelectorAll('[data-reactroot]');
    setMetrics(prev => ({ ...prev, componentCount: reactElements.length }));
  }, []);

  // Performance observer for long tasks
  useEffect(() => {
    if (!enabled) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'longtask') {
          logger.warn('🐌 Long task detected', 'component', { data: `${entry.duration}ms` });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      logger.warn('Warning', 'component', { data: 'Performance Observer not supported:', error });
    }

    return () => observer.disconnect();
  }, [enabled]);

  // Monitor performance metrics
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      measureRenderTime();
      monitorMemory();
      monitorBundleSize();
      countComponents();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [enabled, measureRenderTime, monitorMemory, monitorBundleSize, countComponents]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!enabled || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Render Time:</span>
          <span className={metrics.renderTime > 16 ? 'text-red-400' : 'text-green-400'}>
            {metrics.renderTime.toFixed(1)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className={metrics.memoryUsage > 100 ? 'text-red-400' : 'text-green-400'}>
            {metrics.memoryUsage}MB
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Components:</span>
          <span className="text-blue-400">{metrics.componentCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Bundle Size:</span>
          <span className="text-yellow-400">~{metrics.bundleSize}KB</span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600 text-gray-400">
        <div>Press Ctrl+Shift+P to toggle</div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
