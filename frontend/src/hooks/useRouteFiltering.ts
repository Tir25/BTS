import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../api';
import { Route } from '../types';
import { logger } from '../utils/logger';

interface UseRouteFilteringOptions {
  selectedShift: 'Day' | 'Afternoon' | '';
  onRoutesLoaded?: (routes: Route[]) => void;
  onError?: (error: string) => void;
}

interface UseRouteFilteringReturn {
  routes: Route[];
  isLoading: boolean;
  error: string | null;
  reloadRoutes: () => Promise<void>;
}

/**
 * Custom hook for managing route filtering based on shift selection
 * 
 * Behavior:
 * - When no shift is selected: Loads ALL routes
 * - When a shift is selected: Loads routes filtered by that shift
 * 
 * This hook encapsulates the route loading logic and makes it reusable
 * and testable.
 */
export function useRouteFiltering({
  selectedShift,
  onRoutesLoaded,
  onError,
}: UseRouteFilteringOptions): UseRouteFilteringReturn {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs for callbacks to avoid infinite loops from dependency changes
  const onRoutesLoadedRef = useRef(onRoutesLoaded);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onRoutesLoadedRef.current = onRoutesLoaded;
    onErrorRef.current = onError;
  }, [onRoutesLoaded, onError]);

  /**
   * Load routes based on shift selection
   * - If no shift: Load all routes
   * - If shift selected: Load routes filtered by shift
   */
  const loadRoutes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let routesData: Route[] = [];

      if (!selectedShift) {
        // No shift selected: Load ALL routes
        logger.info('🔄 Loading all routes (no shift selected)', 'useRouteFiltering');
        const response = await apiService.getRoutes();

        if (response && typeof response === 'object') {
          if ('success' in response && response.success && 'data' in response) {
            routesData = Array.isArray(response.data) ? response.data : [];
            logger.info('✅ All routes loaded successfully', 'useRouteFiltering', {
              count: routesData.length,
            });
          } else if (Array.isArray(response)) {
            routesData = response;
            logger.info('✅ All routes loaded as direct array', 'useRouteFiltering', {
              count: routesData.length,
            });
          } else if ('success' in response && !response.success) {
            const errorMsg = String(
              ('error' in response && typeof (response as { error?: unknown }).error === 'string'
                ? (response as { error?: unknown }).error
                : 'Failed to load routes') || 'Unknown error'
            );
            throw new Error(errorMsg);
          }
        }
      } else {
        // Shift selected: Load routes filtered by shift
        logger.info('🔄 Loading routes for shift', 'useRouteFiltering', {
          shiftName: selectedShift,
        });
        const response = await apiService.getRoutesByShift({ shiftName: selectedShift });

        if (response?.success && Array.isArray(response.data)) {
          routesData = response.data as Route[];
          logger.info('✅ Routes loaded for shift', 'useRouteFiltering', {
            shiftName: selectedShift,
            count: routesData.length,
          });
        } else {
          const errorMsg = String(response?.error ?? 'Failed to load routes for shift');
          throw new Error(errorMsg);
        }
      }

      setRoutes(routesData);
      onRoutesLoadedRef.current?.(routesData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred while loading routes';
      logger.error('❌ Failed to load routes', 'useRouteFiltering', {
        error: errorMessage,
        selectedShift,
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(errorMessage);
      setRoutes([]);
      onErrorRef.current?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedShift]); // Only depend on selectedShift to avoid infinite loops

  // Load routes when shift changes
  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  return {
    routes,
    isLoading,
    error,
    reloadRoutes: loadRoutes,
  };
}

