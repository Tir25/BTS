import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

// Query keys for consistent caching
export const queryKeys = {
  health: ['health'],
  routes: ['routes'],
  route: (id: string) => ['route', id],
  routesInViewport: (bounds: [[number, number], [number, number]]) => ['routes', 'viewport', bounds],
  buses: ['buses'],
  bus: (id: string) => ['bus', id],
  busesInViewport: (bounds: [[number, number], [number, number]]) => ['buses', 'viewport', bounds],
  drivers: ['drivers'],
  driver: (id: string) => ['driver', id],
  liveLocations: ['liveLocations'],
  liveLocationsInViewport: (bounds: [[number, number], [number, number]]) => ['liveLocations', 'viewport', bounds],
  busClusters: (bounds: [[number, number], [number, number]], zoom: number) => ['busClusters', bounds, zoom],
} as const;

// Health check query
export const useHealthCheck = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const result = await apiService.getHealth();
      if (!result) {
        throw new Error('Health check returned undefined');
      }
      return result;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: 3,
  });
};

// Routes queries
export const useRoutes = () => {
  return useQuery({
    queryKey: queryKeys.routes,
    queryFn: () => apiService.getRoutes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

// Optimized routes query for viewport
export const useRoutesInViewport = (bounds: [[number, number], [number, number]], enabled = true) => {
  return useQuery({
    queryKey: queryKeys.routesInViewport(bounds),
    queryFn: () => apiService.getRoutesInViewport(bounds),
    enabled: enabled && bounds !== undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes for viewport data
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useRoute = (routeId: string) => {
  return useQuery({
    queryKey: queryKeys.route(routeId),
    queryFn: () => apiService.getRouteInfo(routeId),
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

// Buses queries
export const useBuses = () => {
  return useQuery({
    queryKey: queryKeys.buses,
    queryFn: () => apiService.getAllBuses(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 3,
  });
};

// Optimized buses query for viewport
export const useBusesInViewport = (bounds: [[number, number], [number, number]], enabled = true) => {
  return useQuery({
    queryKey: queryKeys.busesInViewport(bounds),
    queryFn: () => apiService.getBusesInViewport(bounds),
    enabled: enabled && bounds !== undefined,
    staleTime: 15 * 1000, // 15 seconds for viewport data
    refetchInterval: 30 * 1000, // 30 seconds
    retry: 3,
  });
};

export const useBus = (busId: string) => {
  return useQuery({
    queryKey: queryKeys.bus(busId),
    queryFn: () => apiService.getBusInfo(busId),
    enabled: !!busId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
  });
};

// Drivers queries
export const useDrivers = () => {
  return useQuery({
    queryKey: queryKeys.drivers,
    queryFn: () => apiService.getAllDrivers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

export const useDriver = (driverId: string) => {
  return useQuery({
    queryKey: queryKeys.driver(driverId),
    queryFn: () => apiService.getDriverInfo(driverId),
    enabled: !!driverId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

// Live locations query
export const useLiveLocations = () => {
  return useQuery({
    queryKey: queryKeys.liveLocations,
    queryFn: () => apiService.getLiveLocations(),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // 30 seconds
    retry: 3,
  });
};

// Optimized live locations query for viewport
export const useLiveLocationsInViewport = (bounds: [[number, number], [number, number]], enabled = true) => {
  return useQuery({
    queryKey: queryKeys.liveLocationsInViewport(bounds),
    queryFn: () => apiService.getLiveLocationsInViewport(bounds),
    enabled: enabled && bounds !== undefined,
    staleTime: 5 * 1000, // 5 seconds for viewport data
    refetchInterval: 15 * 1000, // 15 seconds
    retry: 3,
  });
};

// Bus clusters query
export const useBusClusters = (bounds: [[number, number], [number, number]], zoom: number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.busClusters(bounds, zoom),
    queryFn: () => apiService.getBusClusters(bounds, zoom),
    enabled: enabled && bounds !== undefined && zoom !== undefined,
    staleTime: 10 * 1000, // 10 seconds for cluster data
    refetchInterval: 20 * 1000, // 20 seconds
    retry: 3,
  });
};

// Mutations
export const useUpdateLiveLocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      busId,
      driverId,
      location,
    }: {
      busId: string;
      driverId: string;
      location: {
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
      };
    }) => apiService.updateLiveLocation(busId, driverId, location),
    
    onSuccess: () => {
      // Invalidate and refetch live locations
      queryClient.invalidateQueries({ queryKey: queryKeys.liveLocations });
    },
    
    onError: (error) => {
      console.error('Failed to update live location:', error);
    },
  });
};
