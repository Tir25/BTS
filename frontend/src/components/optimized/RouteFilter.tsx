/**
 * Optimized Route Filter Component
 * Uses React.memo and useCallback for performance optimization
 */

import React, { useCallback, useMemo } from 'react';
import { useRoutes } from '../../contexts/AppContext';

interface RouteFilterProps {
  className?: string;
}

const RouteFilter: React.FC<RouteFilterProps> = React.memo(({ className = '' }) => {
  const { routes, selectedRoute, setSelectedRoute } = useRoutes();

  // Memoize filtered routes to prevent unnecessary recalculations
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => route.is_active);
  }, [routes]);

  // Memoize route options to prevent unnecessary re-renders
  const routeOptions = useMemo(() => [
    { id: 'all', name: 'All Routes', count: routes.length },
    ...filteredRoutes.map(route => ({
      id: route.id,
      name: route.name,
      count: 0 // Would need to calculate actual bus count
    }))
  ], [routes, filteredRoutes]);

  // Use useCallback to prevent unnecessary re-renders of child components
  const handleRouteChange = useCallback((routeId: string) => {
    setSelectedRoute(routeId);
  }, [setSelectedRoute]);

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-xl">🛣️</span>
        Route Filter
      </h3>
      
      <div className="space-y-2">
        {routeOptions.map(route => (
          <button
            key={route.id}
            onClick={() => handleRouteChange(route.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
              selectedRoute === route.id
                ? 'bg-blue-500/30 border border-blue-400/50 text-blue-100'
                : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{route.name}</span>
              {route.count > 0 && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  {route.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {filteredRoutes.length === 0 && (
        <div className="text-center py-4 text-white/50">
          No active routes available
        </div>
      )}
    </div>
  );
});

RouteFilter.displayName = 'RouteFilter';

export default RouteFilter;
