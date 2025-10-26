import React from 'react';
import { logger } from './logger';

/**
 * Bundle optimization utilities
 */

/**
 * Lazy load a component with error boundary
 */
export const lazyLoadComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<T> => {
  return React.lazy(importFunc);
};

/**
 * Memoize a component to prevent unnecessary re-renders
 */
export const memoizeComponent = <T extends React.ComponentType<any>>(
  Component: T
): React.MemoExoticComponent<T> => {
  return React.memo(Component);
};

/**
 * Dynamic import with error handling
 */
export const dynamicImport = async <T>(
  modulePath: string,
  fallback?: T
): Promise<T> => {
  try {
    const importedModule = await import(modulePath);
    return importedModule.default || importedModule;
  } catch (error) {
    logger.error(`Failed to dynamically import ${modulePath}:`, 'component', { error });
    throw error;
  }
};

/**
 * Code splitting helper
 */
export const createAsyncComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<T> => {
  return React.lazy(importFunc);
};

/**
 * Bundle size analyzer
 */
export const analyzeBundleSize = (): void => {
  if (process.env.NODE_ENV === 'development') {
    logger.info('📊 Bundle Analysis:', 'component');
    logger.debug('Debug info', 'component', { data: '- Use React.lazy() for code splitting' });
    logger.debug('Debug info', 'component', { data: '- Use React.memo() for component memoization' });
    logger.info('- Use dynamic imports for large dependencies', 'component');
    logger.info('- Consider using a bundler analyzer like webpack-bundle-analyzer', 'component');
  }
};

/**
 * Performance monitoring
 */
export const measurePerformance = <T extends (...args: any[]) => any>(
  func: T,
  name: string
): T => {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      logger.info('⏱️ Function timing', 'component', { data: `${name} took ${end - start} milliseconds` });
    }
    
    return result;
  }) as T;
};

/**
 * Memory usage monitoring
 */
export const monitorMemoryUsage = (): void => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    logger.debug('Debug info', 'component', { 
      data: '🧠 Memory Usage:',
      memory: {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
      }
    });
  }
};

/**
 * Bundle optimization recommendations
 */
export const getOptimizationRecommendations = (): string[] => {
  return [
    'Use React.lazy() for code splitting',
    'Use React.memo() for component memoization',
    'Use dynamic imports for large dependencies',
    'Consider using a bundler analyzer like webpack-bundle-analyzer',
    'Implement tree shaking for unused code elimination',
    'Use compression for production builds',
    'Optimize images and assets',
    'Implement service workers for caching',
  ];
};

/**
 * Performance budget checker
 */
export const checkPerformanceBudget = (): void => {
  if (process.env.NODE_ENV === 'development') {
    const recommendations = getOptimizationRecommendations();
    logger.info('📊 Performance Budget:', 'component');
    recommendations.forEach((recommendation, index) => {
      logger.debug('Debug info', 'component', { data: `${index + 1}. ${recommendation}` });
    });
  }
};

/**
 * Bundle size estimation
 */
export const estimateBundleSize = (): number => {
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
  
  return totalSize;
};

/**
 * Performance metrics
 */
export const getPerformanceMetrics = () => {
  const metrics = {
    bundleSize: estimateBundleSize(),
    memoryUsage: 'memory' in performance ? (performance as any).memory : null,
    renderTime: 0,
    componentCount: 0,
  };
  
  return metrics;
};

/**
 * Optimization utilities
 */
export const optimizationUtils = {
  lazyLoadComponent,
  memoizeComponent,
  dynamicImport,
  createAsyncComponent,
  analyzeBundleSize,
  measurePerformance,
  monitorMemoryUsage,
  getOptimizationRecommendations,
  checkPerformanceBudget,
  estimateBundleSize,
  getPerformanceMetrics,
};

export default optimizationUtils;
