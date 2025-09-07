import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BusLocation, BusInfo, Route } from '../types';

// Spatial clustering interface
interface BusCluster {
  id: string;
  center: [number, number];
  buses: BusInfo[];
  count: number;
  bounds: [[number, number], [number, number]];
}

// Spatial viewport interface
interface Viewport {
  bounds: [[number, number], [number, number]];
  zoom: number;
  center: [number, number];
}

// Spatial query interface
interface SpatialQuery {
  bounds?: [[number, number], [number, number]];
  radius?: number;
  center?: [number, number];
  zoom?: number;
}

interface MapState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  connectionStatus:
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'reconnecting';

  // Data state
  buses: BusInfo[];
  routes: Route[];
  selectedRoute: string;
  lastBusLocations: { [busId: string]: BusLocation };

  // Spatial optimization state
  viewport: Viewport;
  busClusters: BusCluster[];
  spatialIndex: Map<string, BusInfo>;
  visibleBuses: BusInfo[];
  visibleRoutes: Route[];

  // Performance state
  isLoading: boolean;
  isNavbarCollapsed: boolean;
  isRouteFilterOpen: boolean;
  isActiveBusesOpen: boolean;
  isClusteringEnabled: boolean;
  isHeatmapEnabled: boolean;

  // Actions
  setConnectionState: (state: {
    isConnected?: boolean;
    connectionError?: string | null;
    connectionStatus?:
      | 'connected'
      | 'connecting'
      | 'disconnected'
      | 'reconnecting';
  }) => void;

  setBuses: (buses: BusInfo[]) => void;
  updateBusLocation: (location: BusLocation) => void;
  removeBus: (busId: string) => void;

  setRoutes: (routes: Route[]) => void;
  setSelectedRoute: (routeId: string) => void;

  setLoading: (loading: boolean) => void;
  setNavbarCollapsed: (collapsed: boolean) => void;
  setRouteFilterOpen: (open: boolean) => void;
  setActiveBusesOpen: (open: boolean) => void;

  // Spatial actions
  setViewport: (viewport: Viewport) => void;
  updateSpatialIndex: () => void;
  calculateClusters: () => void;
  querySpatialData: (query: SpatialQuery) => void;
  toggleClustering: () => void;
  toggleHeatmap: () => void;

  // Computed values
  getActiveBuses: () => BusInfo[];
  getBusesByRoute: (routeId: string) => BusInfo[];
  getFilteredBuses: () => BusInfo[];
  getBusesInViewport: () => BusInfo[];
  getRoutesInViewport: () => Route[];
  getBusClusters: () => BusCluster[];
}

export const useMapStore = create<MapState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isConnected: false,
      connectionError: null,
      connectionStatus: 'disconnected',
      buses: [],
      routes: [],
      selectedRoute: 'all',
      lastBusLocations: {},
      viewport: {
        bounds: [
          [72.5, 22.8],
          [73.2, 23.4],
        ], // Default Ahmedabad bounds
        zoom: 12,
        center: [72.8777, 23.0225],
      },
      busClusters: [],
      spatialIndex: new Map(),
      visibleBuses: [],
      visibleRoutes: [],
      isLoading: true,
      isNavbarCollapsed: false,
      isRouteFilterOpen: true,
      isActiveBusesOpen: true,
      isClusteringEnabled: true,
      isHeatmapEnabled: false,

      // Actions
      setConnectionState: state =>
        set(prev => ({
          ...prev,
          ...state,
        })),

      setBuses: buses =>
        set(() => {
          // Update spatial index when buses change
          const spatialIndex = new Map();
          buses.forEach(bus => {
            if (bus.currentLocation) {
              const key = `${Math.floor(bus.currentLocation.longitude * 100)},${Math.floor(bus.currentLocation.latitude * 100)}`;
              spatialIndex.set(key, bus);
            }
          });

          return {
            buses,
            spatialIndex,
          };
        }),

      updateBusLocation: location =>
        set(state => {
          const updatedBuses = state.buses.map(bus =>
            bus.busId === location.busId
              ? {
                  ...bus,
                  currentLocation: location,
                  eta: location.eta?.estimated_arrival_minutes,
                }
              : bus
          );

          // Update spatial index
          const spatialIndex = new Map(state.spatialIndex);
          const key = `${Math.floor(location.longitude * 100)},${Math.floor(location.latitude * 100)}`;
          const bus = updatedBuses.find(b => b.busId === location.busId);
          if (bus) {
            spatialIndex.set(key, bus);
          }

          return {
            lastBusLocations: {
              ...state.lastBusLocations,
              [location.busId]: location,
            },
            buses: updatedBuses,
            spatialIndex,
          };
        }),

      removeBus: busId =>
        set(state => {
          const updatedBuses = state.buses.filter(bus => bus.busId !== busId);
          const updatedLocations = Object.fromEntries(
            Object.entries(state.lastBusLocations).filter(
              ([id]) => id !== busId
            )
          );

          // Update spatial index
          const spatialIndex = new Map();
          updatedBuses.forEach(bus => {
            if (bus.currentLocation) {
              const key = `${Math.floor(bus.currentLocation.longitude * 100)},${Math.floor(bus.currentLocation.latitude * 100)}`;
              spatialIndex.set(key, bus);
            }
          });

          return {
            buses: updatedBuses,
            lastBusLocations: updatedLocations,
            spatialIndex,
          };
        }),

      setRoutes: routes => set({ routes }),

      setSelectedRoute: routeId => set({ selectedRoute: routeId }),

      setLoading: loading => set({ isLoading: loading }),

      setNavbarCollapsed: collapsed => set({ isNavbarCollapsed: collapsed }),

      setRouteFilterOpen: open => set({ isRouteFilterOpen: open }),

      setActiveBusesOpen: open => set({ isActiveBusesOpen: open }),

      // Spatial actions
      setViewport: viewport =>
        set(state => {
          // Trigger spatial queries when viewport changes
          const newState = { viewport };

          // Calculate visible buses and routes
          const visibleBuses = state.buses.filter(bus => {
            if (!bus.currentLocation) return false;
            const [minLng, minLat] = viewport.bounds[0];
            const [maxLng, maxLat] = viewport.bounds[1];
            return (
              bus.currentLocation.longitude >= minLng &&
              bus.currentLocation.longitude <= maxLng &&
              bus.currentLocation.latitude >= minLat &&
              bus.currentLocation.latitude <= maxLat
            );
          });

          const visibleRoutes = state.routes.filter(route => {
            // Simple bounds check for routes
            if (!route.stops || !route.stops.coordinates) return false;
            const coords = route.stops.coordinates as [number, number][];
            const [minLng, minLat] = viewport.bounds[0];
            const [maxLng, maxLat] = viewport.bounds[1];

            return coords.some(
              ([lng, lat]) =>
                lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
            );
          });

          return {
            ...newState,
            visibleBuses,
            visibleRoutes,
          };
        }),

      updateSpatialIndex: () =>
        set(state => {
          const spatialIndex = new Map();
          state.buses.forEach(bus => {
            if (bus.currentLocation) {
              const key = `${Math.floor(bus.currentLocation.longitude * 100)},${Math.floor(bus.currentLocation.latitude * 100)}`;
              spatialIndex.set(key, bus);
            }
          });
          return { spatialIndex };
        }),

      calculateClusters: () =>
        set(state => {
          if (!state.isClusteringEnabled || state.visibleBuses.length === 0) {
            return { busClusters: [] };
          }

          const clusters: BusCluster[] = [];
          const clusterRadius = Math.max(
            50,
            1000 / Math.pow(2, state.viewport.zoom - 10)
          );
          const processedBuses = new Set<string>();

          state.visibleBuses.forEach(bus => {
            if (processedBuses.has(bus.busId) || !bus.currentLocation) return;

            const clusterBuses = [bus];
            processedBuses.add(bus.busId);

            // Find nearby buses
            state.visibleBuses.forEach(otherBus => {
              if (
                processedBuses.has(otherBus.busId) ||
                !otherBus.currentLocation
              )
                return;

              const distance =
                Math.sqrt(
                  Math.pow(
                    bus.currentLocation.longitude -
                      otherBus.currentLocation.longitude,
                    2
                  ) +
                    Math.pow(
                      bus.currentLocation.latitude -
                        otherBus.currentLocation.latitude,
                      2
                    )
                ) * 111000; // Convert to meters

              if (distance <= clusterRadius) {
                clusterBuses.push(otherBus);
                processedBuses.add(otherBus.busId);
              }
            });

            if (clusterBuses.length > 1) {
              // Calculate cluster center
              const centerLng =
                clusterBuses.reduce(
                  (sum, b) => sum + b.currentLocation!.longitude,
                  0
                ) / clusterBuses.length;
              const centerLat =
                clusterBuses.reduce(
                  (sum, b) => sum + b.currentLocation!.latitude,
                  0
                ) / clusterBuses.length;

              // Calculate bounds
              const lngs = clusterBuses.map(b => b.currentLocation!.longitude);
              const lats = clusterBuses.map(b => b.currentLocation!.latitude);
              const bounds: [[number, number], [number, number]] = [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ];

              clusters.push({
                id: `cluster-${clusters.length}`,
                center: [centerLng, centerLat],
                buses: clusterBuses,
                count: clusterBuses.length,
                bounds,
              });
            } else {
              // Single bus cluster
              clusters.push({
                id: `cluster-${clusters.length}`,
                center: [
                  bus.currentLocation.longitude,
                  bus.currentLocation.latitude,
                ],
                buses: [bus],
                count: 1,
                bounds: [
                  [bus.currentLocation.longitude, bus.currentLocation.latitude],
                  [bus.currentLocation.longitude, bus.currentLocation.latitude],
                ],
              });
            }
          });

          return { busClusters: clusters };
        }),

      querySpatialData: query =>
        set(state => {
          let filteredBuses = state.buses;

          if (query.bounds) {
            const [minLng, minLat] = query.bounds[0];
            const [maxLng, maxLat] = query.bounds[1];
            filteredBuses = filteredBuses.filter(bus => {
              if (!bus.currentLocation) return false;
              return (
                bus.currentLocation.longitude >= minLng &&
                bus.currentLocation.longitude <= maxLng &&
                bus.currentLocation.latitude >= minLat &&
                bus.currentLocation.latitude <= maxLat
              );
            });
          }

          if (query.center && query.radius) {
            const [centerLng, centerLat] = query.center;
            const radiusDegrees = query.radius / 111000; // Convert meters to degrees
            filteredBuses = filteredBuses.filter(bus => {
              if (!bus.currentLocation) return false;
              const distance = Math.sqrt(
                Math.pow(bus.currentLocation.longitude - centerLng, 2) +
                  Math.pow(bus.currentLocation.latitude - centerLat, 2)
              );
              return distance <= radiusDegrees;
            });
          }

          return { visibleBuses: filteredBuses };
        }),

      toggleClustering: () =>
        set(state => ({ isClusteringEnabled: !state.isClusteringEnabled })),

      toggleHeatmap: () =>
        set(state => ({ isHeatmapEnabled: !state.isHeatmapEnabled })),

      // Computed values
      getActiveBuses: () => {
        const state = get();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return state.buses.filter(bus => {
          if (!bus.currentLocation) return false;
          const lastUpdate = new Date(bus.currentLocation.timestamp);
          return lastUpdate > fiveMinutesAgo;
        });
      },

      getBusesByRoute: routeId => {
        const state = get();
        if (routeId === 'all') return state.buses;
        return state.buses.filter(bus => bus.routeName.includes(routeId));
      },

      getFilteredBuses: () => {
        const state = get();
        return state.getBusesByRoute(state.selectedRoute);
      },

      getBusesInViewport: () => {
        const state = get();
        return state.visibleBuses;
      },

      getRoutesInViewport: () => {
        const state = get();
        return state.visibleRoutes;
      },

      getBusClusters: () => {
        const state = get();
        return state.busClusters;
      },
    }),
    {
      name: 'map-store',
    }
  )
);
