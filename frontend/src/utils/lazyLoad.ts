/**
 * Utility for lazy loading components to improve initial load time
 */
import React, { lazy, Suspense } from 'react';

/**
 * Creates a lazy-loaded component with a fallback
 * @param importFn Function that imports the component
 * @param fallback Optional fallback component to show while loading
 * @returns Lazy-loaded component wrapped in Suspense
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = null
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);

  // Create a wrapper component that uses Suspense
  const Component: React.FC<React.ComponentProps<T>> = (props) => {
    return React.createElement(
      Suspense,
      { fallback },
      React.createElement(LazyComponent, props)
    );
  };

  return Component;
}

export default lazyLoad;
