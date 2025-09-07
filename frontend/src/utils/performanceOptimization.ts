// frontend/src/utils/performanceOptimization.ts
// Core performance optimization utilities

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Note: Enhanced debouncing and throttling functions are now available in advancedDebouncing.ts
// These basic versions are kept for backward compatibility

/**
 * Custom hook for debouncing values to prevent excessive re-renders
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttling function calls
 * @param callback The function to throttle
 * @param delay The delay in milliseconds
 * @returns The throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Custom hook for creating a stable reference that doesn't change on re-renders
 * @param value The value to create a stable reference for
 * @returns A stable reference to the value
 */
export function useStableRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
}

/**
 * Custom hook for memoizing expensive calculations with dependency tracking
 * @param factory The function that creates the value
 * @param deps The dependencies array
 * @returns The memoized value
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * Custom hook for creating a callback that's stable across re-renders
 * @param callback The callback function
 * @param deps The dependencies array
 * @returns A stable callback
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Custom hook for batching state updates to prevent multiple re-renders
 * @param initialState The initial state
 * @returns [state, batchedSetState] tuple
 */
export function useBatchedState<T>(
  initialState: T
): [T, (updater: (prevState: T) => T) => void] {
  const [state, setState] = useState<T>(initialState);
  const updateQueue = useRef<((prevState: T) => T)[]>([]);
  const isUpdating = useRef(false);

  const batchedSetState = useCallback((updater: (prevState: T) => T) => {
    updateQueue.current.push(updater);

    if (!isUpdating.current) {
      isUpdating.current = true;
      // Use setTimeout to batch updates in the next tick
      setTimeout(() => {
        setState(prevState => {
          let newState = prevState;
          for (const update of updateQueue.current) {
            newState = update(newState);
          }
          updateQueue.current = [];
          isUpdating.current = false;
          return newState;
        });
      }, 0);
    }
  }, []);

  return [state, batchedSetState];
}

/**
 * Custom hook for measuring component render performance
 * @param componentName The name of the component for logging
 * @returns A function to mark the end of rendering
 */
export function useRenderPerformance(componentName: string) {
  const renderStart = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) { // Log if render takes longer than one frame (16ms)
        console.warn(
          `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
    };
  });

  return () => {
    const renderTime = performance.now() - renderStart.current;
    return renderTime;
  };
}

/**
 * Custom hook for creating a virtualized list with performance optimizations
 * @param items The list of items
 * @param itemHeight The height of each item
 * @param containerHeight The height of the container
 * @returns Virtualized list configuration
 */
export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, 16); // Throttle to 60fps

  return {
    visibleItems,
    handleScroll,
  };
}

/**
 * Utility function to create a memoized component with performance tracking
 * @param Component The component to memoize
 * @param componentName The name for performance tracking
 * @returns A memoized component with performance tracking
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  const MemoizedComponent = React.memo(Component);
  
  return React.forwardRef<any, P>((props, ref) => {
    useRenderPerformance(componentName);
    return React.createElement(MemoizedComponent, { ...props, ref });
  }) as unknown as React.ComponentType<P>;
}

/**
 * Utility function to create a stable object reference
 * @param obj The object to stabilize
 * @returns A stable reference to the object
 */
export function createStableObject<T extends Record<string, any>>(obj: T): T {
  const stableRef = useRef<T>(obj);
  
  // Only update if the object has actually changed
  if (JSON.stringify(stableRef.current) !== JSON.stringify(obj)) {
    stableRef.current = obj;
  }
  
  return stableRef.current;
}

/**
 * Custom hook for managing expensive computations with caching
 * @param computeFn The function to compute the value
 * @param deps The dependencies array
 * @param cacheKey Optional cache key for the computation
 * @returns The computed value
 */
export function useComputedValue<T>(
  computeFn: () => T,
  deps: React.DependencyList,
  cacheKey?: string
): T {
  const cache = useRef<Map<string, T>>(new Map());
  
  return useMemo(() => {
    const key = cacheKey || JSON.stringify(deps);
    
    if (cache.current.has(key)) {
      return cache.current.get(key)!;
    }
    
    const result = computeFn();
    cache.current.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.current.size > 100) {
      const firstKey = cache.current.keys().next().value;
      if (firstKey) cache.current.delete(firstKey);
    }
    
    return result;
  }, deps);
}

// Note: React and useState are already imported at the top

