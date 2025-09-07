// Performance Optimization
export {
  useDebounce,
  useThrottle,
  useStableCallback,
  useRenderPerformance,
  useBatchedState,
  useComputedValue,
  withPerformanceTracking,
} from './performanceOptimization';

// Error Handling
export {
  logError,
  getErrorStats,
  getErrorsByService,
  getErrorsBySeverity,
  getCriticalErrors,
  getRetryableErrors,
  clearErrorLog,
  exportErrorLog,
} from './errorHandler';

// Image Optimization
export {
  getOptimalImageFormat,
  useLazyImage,
} from './imageOptimization';

// Lazy Loading
export {
  createLazyComponent,
  trackLazyLoadPerformance,
} from './lazyLoading';

// Service Worker
export { serviceWorkerManager } from './serviceWorkerManager';
