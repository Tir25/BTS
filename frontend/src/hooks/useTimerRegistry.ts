/**
 * Production-Grade Timer Registry Hook
 * Centralizes timer management to prevent memory leaks
 * Tracks all setTimeout/setInterval calls and ensures proper cleanup
 */

import { useRef, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

interface TimerInfo {
  id: number;
  type: 'timeout' | 'interval';
  handler: NodeJS.Timeout;
  createdAt: number;
  description?: string;
}

export const useTimerRegistry = () => {
  const timersRef = useRef<Map<number, TimerInfo>>(new Map());
  const nextIdRef = useRef(1);

  // Register a timer
  const registerTimer = useCallback((
    handler: NodeJS.Timeout,
    type: 'timeout' | 'interval',
    description?: string
  ): number => {
    const id = nextIdRef.current++;
    timersRef.current.set(id, {
      id,
      type,
      handler,
      createdAt: Date.now(),
      description,
    });
    
    logger.debug('Timer registered', 'useTimerRegistry', {
      id,
      type,
      description,
      totalTimers: timersRef.current.size,
    });
    
    return id;
  }, []);

  // Clear a specific timer
  const clearTimer = useCallback((id: number): boolean => {
    const timer = timersRef.current.get(id);
    if (!timer) {
      logger.warn('Timer not found for clearing', 'useTimerRegistry', { id });
      return false;
    }

    if (timer.type === 'timeout') {
      clearTimeout(timer.handler);
    } else {
      clearInterval(timer.handler);
    }

    timersRef.current.delete(id);
    
    logger.debug('Timer cleared', 'useTimerRegistry', {
      id,
      type: timer.type,
      description: timer.description,
      totalTimers: timersRef.current.size,
    });
    
    return true;
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    const count = timersRef.current.size;
    
    timersRef.current.forEach((timer) => {
      if (timer.type === 'timeout') {
        clearTimeout(timer.handler);
      } else {
        clearInterval(timer.handler);
      }
    });
    
    timersRef.current.clear();
    
    logger.info('All timers cleared', 'useTimerRegistry', {
      clearedCount: count,
    });
  }, []);

  // Get timer count
  const getTimerCount = useCallback((): number => {
    return timersRef.current.size;
  }, []);

  // Get timer info for debugging
  const getTimerInfo = useCallback((): TimerInfo[] => {
    return Array.from(timersRef.current.values());
  }, []);

  // Wrapper for setTimeout
  const setTimeout = useCallback((
    callback: () => void,
    delay: number,
    description?: string
  ): number => {
    const handler = global.setTimeout(() => {
      const timer = timersRef.current.get(id);
      if (timer) {
        timersRef.current.delete(id);
      }
      callback();
    }, delay);
    
    const id = registerTimer(handler, 'timeout', description);
    return id;
  }, [registerTimer]);

  // Wrapper for setInterval
  const setInterval = useCallback((
    callback: () => void,
    delay: number,
    description?: string
  ): number => {
    const handler = global.setInterval(callback, delay);
    return registerTimer(handler, 'interval', description);
  }, [registerTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const count = timersRef.current.size;
      if (count > 0) {
        logger.warn('Cleaning up timers on unmount', 'useTimerRegistry', {
          count,
          timers: getTimerInfo().map(t => ({
            type: t.type,
            description: t.description,
            age: Date.now() - t.createdAt,
          })),
        });
        clearAllTimers();
      }
    };
  }, [clearAllTimers, getTimerInfo]);

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers,
    getTimerCount,
    getTimerInfo,
  };
};

export default useTimerRegistry;

