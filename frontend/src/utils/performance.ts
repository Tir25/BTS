/**
 * Performance optimization utilities for React components
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Custom hook to debounce a function call
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Clean up the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Custom hook to throttle a function call
 * @param callback Function to throttle
 * @param delay Delay in milliseconds
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCallTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;

      // Store the latest arguments
      lastArgsRef.current = args;

      if (timeSinceLastCall >= delay) {
        // If enough time has passed, call the function immediately
        lastCallTimeRef.current = now;
        callback(...args);
      } else {
        // Otherwise, schedule a call for when the delay has passed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallTimeRef.current = Date.now();
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );

  // Clean up the timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Custom hook to create a stable reference to a value that doesn't trigger re-renders
 * @param value Value to store
 * @returns Ref object with current value
 */
export function useConstant<T>(value: T): { readonly current: T } {
  const ref = useRef<T>(value);
  
  // Update ref if value changes
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref;
}

/**
 * Custom hook to memoize a value with deep comparison
 * @param value Value to memoize
 * @param deps Dependencies array
 * @returns Memoized value
 */
export function useMemoDeep<T>(factory: () => T, deps: any[]): T {
  // Use JSON.stringify for deep comparison
  // Note: This has limitations with circular references and functions
  const depsString = useMemo(() => JSON.stringify(deps), deps);
  
  return useMemo(() => factory(), [depsString]);
}

/**
 * Measures the execution time of a function
 * @param fn Function to measure
 * @param name Name of the function for logging
 * @returns Result of the function
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string = 'Function'
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.debug(`${name} execution time: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

export default {
  useDebounce,
  useThrottle,
  useConstant,
  useMemoDeep,
  measurePerformance,
};
