import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import { websocketService, BusLocation } from '../services/websocket';
import { busService, BusInfo } from '../services/busService';
import { apiService } from '../services/api';
import { authService } from '../services/authService';
import GlassyCard from './ui/GlassyCard';
import './StudentMap.css';
import { Route, Bus } from '../types';
import logger from '../utils/logger';
import performance from '../utils/performance';

// Create a component-specific logger
const log = logger.createLogger('🗺️');

interface EnhancedStudentMapProps {
  className?: string;
}

const EnhancedStudentMap: React.FC<EnhancedStudentMapProps> = ({
  className = '',
}) => {
  // Map references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [busId: string]: maplibregl.Marker }>({});
  const isMapInitialized = useRef(false);
  const addedRoutes = useRef<Set<string>>(new Set());

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  >('disconnected');
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastBusLocations, setLastBusLocations] = useState<{
    [busId: string]: BusLocation;
  }>({});

  // Navbar state
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [isRouteFilterOpen, setIsRouteFilterOpen] = useState(true);
  const [isActiveBusesOpen, setIsActiveBusesOpen] = useState(true);

  // Load routes from API
  const loadRoutes = useCallback(async () => {
    try {
      log.info('Loading routes from backend API...');
      const response = await apiService.getRoutes();
      if (response.success && response.data) {
        log.info(
          `Routes loaded from backend: ${response.data.length} routes`
        );
        setRoutes(response.data as unknown as Route[]);

        // Log route details for debugging
        response.data.forEach((route: Route) => {
          log.debug(
            `Route: ${route.name} (ID: ${route.id}) - Active: ${route.is_active}`
          );
        });
      } else {
        log.error('Failed to load routes:', response);
      }
    } catch (error) {
      log.error('Error loading routes:', error);
    }
  }, []);

  // Remove routes from map
  const removeRoutesFromMap = useCallback(() => {
    if (!map.current) return;

    routes.forEach((route) => {
      const routeId = `route-${route.id}`;

      try {
        if (map.current!.getLayer(routeId)) {
          map.current!.removeLayer(routeId);
        }
        if (map.current!.getSource(routeId)) {
          map.current!.removeSource(routeId);
        }
        addedRoutes.current.delete(routeId);
      } catch (error) {
        log.warn(`Error removing route ${route.name}:`, error);
      }
    });
  }, [routes]);

  // Add routes to map
  const addRoutesToMap = useCallback(() => {
    if (!map.current || routes.length === 0) return;

    log.info(`Adding routes to map: ${routes.length} routes`);

    routes.forEach((route, index) => {
      const routeId = `route-${route.id}`;

      if (addedRoutes.current.has(routeId) || map.current!.getSource(routeId)) {
        log.debug(`Route ${routeId} already exists, skipping...`);
        return;
      }

      try {
        map.current!.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: route.name,
              description: route.description,
              distance: route.distance_km,
              duration: route.estimated_duration_minutes,
            },
            geometry: route.stops,
          },
        });

        map.current!.addLayer({
          id: routeId,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });

        log.debug(`Added route ${route.name} to map`);
        addedRoutes.current.add(routeId);
      } catch (error) {
        log.warn(`Error adding route ${route.name}:`, error);
      }
    });
  }, [routes]);

  // Update bus marker on map with throttling for better performance
  const updateBusMarker = useCallback(
    performance.useThrottle((location: BusLocation) => {
      if (!map.current) return;

      const { busId, latitude, longitude, speed } = location;
      const bus = busService.getBus(busId);

      if (!bus) return;

      // Create marker if it doesn't exist
      if (!markers.current[busId]) {
        // Create marker element with optimized DOM structure
        const el = document.createElement('div');
        el.className = 'bus-marker';
        
        // Use innerHTML once to reduce DOM operations
        el.innerHTML = `
          <div class="bus-marker-pin">
            <div class="bus-marker-icon">🚌</div>
            <div class="bus-marker-pulse"></div>
          </div>
          <div class="bus-marker-content">
            <div class="bus-number">${bus.busNumber}</div>
            <div class="bus-speed">${speed ? `${speed} km/h` : 'N/A'}</div>
            <div class="bus-eta">${location.eta ? `ETA: ${location.eta.estimated_arrival_minutes} min` : 'ETA: N/A'}</div>
          </div>
        `;

        // Create marker with optimized options
        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          // MapLibre doesn't support animate option
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

        // Create popup with memoized content
        const popupContent = `
          <div class="bus-popup">
            <div class="bus-popup-header">
              <h3>🚌 Bus ${bus.busNumber}</h3>
              <div class="bus-status ${isConnected ? 'online' : 'offline'}">
                ${isConnected ? '🟢 Online' : '🔴 Offline'}
              </div>
            </div>
            <div class="bus-popup-content">
              <div class="bus-info">
                <p><strong>Driver:</strong> ${bus.driverName || 'N/A'}</p>
                <p><strong>Route:</strong> ${bus.routeName || 'N/A'}</p>
                <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
                <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        `;
        
        const popup = new maplibregl.Popup({
          offset: 25,
          className: 'bus-popup-container',
          // Limit popup size for better performance
          maxWidth: '300px',
          // Disable close button to reduce DOM elements
          closeButton: false,
        }).setHTML(popupContent);

        marker.setPopup(popup);
        markers.current[busId] = marker;
      } else {
        // Update existing marker - only update position for better performance
        markers.current[busId].setLngLat([longitude, latitude]);

        // Only update popup if it's open to save resources
        const popup = markers.current[busId].getPopup();
        if (popup.isOpen()) {
          popup.setHTML(`
            <div class="bus-popup">
              <div class="bus-popup-header">
                <h3>🚌 Bus ${bus.busNumber}</h3>
                <div class="bus-status ${isConnected ? 'online' : 'offline'}">
                  ${isConnected ? '🟢 Online' : '🔴 Offline'}
                </div>
              </div>
              <div class="bus-popup-content">
                <div class="bus-info">
                  <p><strong>Driver:</strong> ${bus.driverName || 'N/A'}</p>
                  <p><strong>Route:</strong> ${bus.routeName || 'N/A'}</p>
                  <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
                  <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          `);
        }
        
        // Update bus speed display if element exists
        try {
          const markerEl = markers.current[busId].getElement();
          const speedEl = markerEl.querySelector('.bus-speed');
          if (speedEl) {
            speedEl.textContent = speed ? `${speed} km/h` : 'N/A';
          }
          
          // Update ETA display if element exists
          const etaEl = markerEl.querySelector('.bus-eta');
          if (etaEl && location.eta) {
            etaEl.textContent = `ETA: ${location.eta.estimated_arrival_minutes} min`;
          }
        } catch (e) {
          // Silently handle DOM errors
        }
      }
    }, 500), // Throttle updates to 500ms for better performance
    [isConnected]
  );

  // Remove bus marker from map
  const removeBusMarker = useCallback((busId: string) => {
    if (markers.current[busId]) {
      markers.current[busId].remove();
      delete markers.current[busId];
    }
  }, []);

  // Center map on all buses
  const centerMapOnBuses = useCallback(() => {
    if (!map.current || Object.keys(lastBusLocations).length === 0) return;

    const coordinates = Object.values(lastBusLocations).map(
      (location) => [location.longitude, location.latitude] as [number, number]
    );

    if (coordinates.length === 1) {
      map.current.flyTo({
        center: coordinates[0],
        zoom: 16,
        duration: 2000,
      });
    } else if (coordinates.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((coord) => bounds.extend(coord));

      map.current.fitBounds(bounds, {
        padding: 50,
        duration: 2000,
      });
    }
  }, [lastBusLocations]);

  // Handle bus location updates
  const handleBusLocationUpdate = useCallback(
    (location: BusLocation) => {
      log.debug('Bus location update received', {
        busId: location.busId,
        lat: location.latitude,
        lng: location.longitude,
        speed: location.speed
      });

      setLastBusLocations((prev) => ({
        ...prev,
        [location.busId]: location,
      }));

      updateBusMarker(location);
    },
    [updateBusMarker]
  );

  const handleDriverConnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      log.info(`Driver connected: ${data.driverId} with bus ${data.busId}`);
    },
    []
  );

  const handleDriverDisconnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      log.info(`Driver disconnected: ${data.driverId} with bus ${data.busId}`);
      removeBusMarker(data.busId);
    },
    [removeBusMarker]
  );

  const handleBusArriving = useCallback(
    (data: {
      busId: string;
      routeId: string;
      location: [number, number];
      timestamp: string;
    }) => {
      log.info(`Bus ${data.busId} arriving at route ${data.routeId}`);
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (isMapInitialized.current || !mapContainer.current) {
      return;
    }

    log.info('Initializing map...');
    isMapInitialized.current = true;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [72.571, 23.025],
      zoom: 12,
      bearing: 0,
      pitch: 0,
      attributionControl: true,
      maxZoom: 19,
      minZoom: 1,
      preserveDrawingBuffer: false,
      antialias: true,
      dragRotate: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.once('load', () => {
      log.info('Map loaded successfully');
      setIsLoading(false);
      loadRoutes();
    });

    map.current.on('error', (e) => {
      log.error('Map error:', e);
    });

    // Return a proper cleanup function to prevent memory leaks
    return () => {
      // Clean up map markers first
      if (markers.current) {
        Object.values(markers.current).forEach(marker => {
          if (marker) {
            // Remove popup first to prevent memory leaks
            const popup = marker.getPopup();
            if (popup) {
              popup.remove();
            }
            // Then remove the marker
            marker.remove();
          }
        });
        markers.current = {};
      }
      
      // Remove route sources and layers
      if (map.current) {
        // Clean up all added routes
        addedRoutes.current.forEach(routeId => {
          try {
            if (map.current?.getLayer(routeId)) {
              map.current.removeLayer(routeId);
            }
            if (map.current?.getSource(routeId)) {
              map.current.removeSource(routeId);
            }
          } catch (error) {
            console.warn(`⚠️ Error removing route ${routeId}:`, error);
          }
        });
        addedRoutes.current.clear();
        
        // Remove the map instance
        map.current.remove();
        map.current = null;
        isMapInitialized.current = false;
      }
    };
  }, [loadRoutes]);

  // Connect to WebSocket
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let statusInterval: NodeJS.Timeout;
    let busLoadingTimeout: NodeJS.Timeout;
    
    // Track event listeners for proper cleanup
    const eventListeners = new Map<string, Function>();

    const connectWebSocket = async () => {
      try {
        setConnectionError(null);
        setConnectionStatus('connecting');

        // Reset WebSocket service before connecting
        websocketService.reset();
        log.info('Connecting to WebSocket server...');
        await websocketService.connect();
        setIsConnected(true);
        setConnectionStatus('connected');
        log.info('WebSocket connected successfully');

        // Register event listeners and store references for cleanup
        const registerListener = (event: string, callback: Function) => {
          eventListeners.set(event, callback);
          return callback;
        };

        // Register all event listeners
        websocketService.onBusLocationUpdate(
          registerListener('bus:locationUpdate', handleBusLocationUpdate) as any
        );
        
        websocketService.onDriverConnected(
          registerListener('driver:connected', handleDriverConnected) as any
        );
        
        websocketService.onDriverDisconnected(
          registerListener('driver:disconnected', handleDriverDisconnected) as any
        );
        
        // Emit student connection event
        if (websocketService.socket) {
          websocketService.socket.emit('student:connect');
          log.debug('Emitted student:connect event');
        }

        websocketService.onStudentConnected(
          registerListener('student:connected', () => {
            log.info('Student connected to WebSocket');
          }) as any
        );
        
        websocketService.onBusArriving(
          registerListener('bus:arriving', handleBusArriving) as any
        );

        const checkConnectionStatus = () => {
          const status = websocketService.getConnectionStatus();
          if (!status && connectionStatus === 'connected') {
            log.warn('WebSocket connection lost, updating UI state');
            setConnectionStatus('disconnected');
            setIsConnected(false);
          }
        };

        statusInterval = setInterval(checkConnectionStatus, 10000);

        const loadBuses = async () => {
          try {
            // Avoid infinite loop with timeout
            let authInitAttempts = 0;
            const maxAuthAttempts = 50; // 5 seconds max wait
            
            while (!authService.isInitialized() && authInitAttempts < maxAuthAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              authInitAttempts++;
            }

            log.info('Loading initial bus data from API');
            const response = await apiService.getAllBuses();
            if (response.success && response.data) {
              log.info(`Initial bus data from API: ${response.data.length} buses`);

              // Clear existing buses first to prevent stale data
              busService.clearBuses();
              
              // Process bus data
              response.data.forEach((apiBus: Bus) => {
                const busId = apiBus.id;
                if (busId) {
                  busService.syncBusFromAPI(busId, apiBus);
                }
              });

              const updatedBuses = busService.getAllBuses();
              setBuses(updatedBuses);
              log.info(`Initial buses loaded and synced: ${response.data.length}`);
            }
          } catch (error) {
            log.error('Error loading initial buses:', error);
          }
        };

        // Use timeout to prevent memory leaks if component unmounts during async operation
        busLoadingTimeout = setTimeout(() => loadBuses(), 0);
      } catch (error) {
        log.error('WebSocket connection failed:', error);
        setConnectionError('Failed to connect to real-time updates');
        setIsConnected(false);
        setConnectionStatus('disconnected');

        reconnectTimeout = setTimeout(() => {
          log.info('Retrying WebSocket connection...');
          setConnectionStatus('reconnecting');
          connectWebSocket();
        }, 5000);
      }
    };

    connectWebSocket();

    // Comprehensive cleanup function
    return () => {
      // Clear all timeouts and intervals
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      if (busLoadingTimeout) {
        clearTimeout(busLoadingTimeout);
      }
      
      // Remove all registered event listeners
      if (websocketService.socket) {
        eventListeners.forEach((_, event) => {
          websocketService.off(event);
        });
        eventListeners.clear();
      }
      
      // Disconnect WebSocket
      websocketService.disconnect();
    };
  }, [
    handleBusArriving,
    handleBusLocationUpdate,
    handleDriverConnected,
    handleDriverDisconnected,
  ]);

  // Get filtered buses based on selected route with deep memoization
  const filteredBuses: BusInfo[] = performance.useMemoDeep(() => {
    if (selectedRoute === 'all') {
      return buses;
    }

    // Create a route lookup map for faster access
    const routeMap = new Map();
    routes.forEach(route => {
      routeMap.set(route.name, route);
    });

    // Filter buses with optimized lookup
    return buses.filter((bus) => {
      const busRoute = routeMap.get(bus.routeName);
      return busRoute && busRoute.id === selectedRoute;
    });
  }, [buses, selectedRoute, routes]);

  // Get unique routes for filter with optimized memoization
  const availableRoutes = useMemo(() => {
    // Only extract needed properties for better performance
    return routes.map((route: Route) => ({
      id: route.id,
      name: route.name,
      description: route.description,
    }));
  }, [routes]);

  // Add routes to map when routes are loaded
  useEffect(() => {
    // Only add routes when map is fully loaded and routes are available
    if (routes.length > 0 && map.current) {
      // Check if map is loaded, if not wait for it
      if (!map.current.isStyleLoaded()) {
        const onStyleLoad = () => {
          removeRoutesFromMap();
          addRoutesToMap();
          // Remove the event listener after execution
          map.current?.off('styledata', onStyleLoad);
        };
        
        // Add event listener for when the style is loaded
        map.current.on('styledata', onStyleLoad);
      } else {
        // Map is already loaded, add routes immediately
        removeRoutesFromMap();
        addRoutesToMap();
      }
    }

    // Cleanup function
    return () => {
      if (map.current) {
        // Remove all routes from map
        removeRoutesFromMap();
        
        // Remove any pending event listeners
        map.current.off('styledata', () => {});
      }
    };
  }, [routes, addRoutesToMap, removeRoutesFromMap]);

  return (
    <div className={`relative h-screen ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {connectionError && (
        <div className="error-overlay">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Connection Error
                </h3>
                <p className="text-sm text-red-700 mt-1">{connectionError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="map-container rounded-lg" />

      {/* Collapsible Glassmorphic Navbar */}
      <motion.div
        initial={{ x: -400 }}
        animate={{ x: isNavbarCollapsed ? -350 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute top-4 left-4 z-30"
      >
        {/* Collapse/Expand Button (always visible) */}
        <button
          onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
          className="absolute -right-12 top-0 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-200 z-40"
        >
          <svg
            className={`w-5 h-5 text-white transition-transform duration-200 ${
              isNavbarCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <GlassyCard
          variant="premium"
          glow={true}
          className="w-80 max-h-[calc(100vh-2rem)] overflow-hidden"
        >
          {/* Navbar Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-bold text-gray-900">
                Student Live Tracking
              </h2>
            </div>
            <div className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded">
              Live Map
            </div>
          </div>

          {/* Navbar Content */}
          <div className="p-4 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-blue-50/80 rounded-lg border border-blue-200/50">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-sm text-gray-800 font-medium">
                  {isConnected ? 'Live Connected' : 'Offline'}
                </span>
              </div>
              <span className="text-xs text-gray-600 bg-white/70 px-2 py-1 rounded">
                {filteredBuses.length} buses
              </span>
            </div>

            {/* Route Filter Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Route Filter
                </h3>
                <button
                  onClick={() => setIsRouteFilterOpen(!isRouteFilterOpen)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                      isRouteFilterOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              <AnimatePresence>
                {isRouteFilterOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <select
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                    >
                      <option value="all">All Routes ({routes.length})</option>
                      {availableRoutes.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={centerMapOnBuses}
                      disabled={filteredBuses.length === 0}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📍 Center on Buses ({filteredBuses.length})
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Buses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Active Buses
                </h3>
                <button
                  onClick={() => setIsActiveBusesOpen(!isActiveBusesOpen)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                      isActiveBusesOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              <AnimatePresence>
                {isActiveBusesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 max-h-64 overflow-y-auto"
                  >
                    {filteredBuses.length === 0 ? (
                      <div className="text-center py-4">
                        <div className="text-gray-400 text-2xl mb-2">🚌</div>
                        <p className="text-gray-600 text-sm">
                          No buses tracking
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Check connection status
                        </p>
                      </div>
                    ) : (
                      filteredBuses.map((bus: BusInfo) => {
                        const location = lastBusLocations[bus.busId];
                        return (
                          <motion.div
                            key={bus.busId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-all duration-200 shadow-sm"
                            onClick={() => {
                              const location = lastBusLocations[bus.busId];
                              if (location && map.current) {
                                map.current.flyTo({
                                  center: [
                                    location.longitude,
                                    location.latitude,
                                  ],
                                  zoom: 16,
                                  duration: 1000,
                                });
                                const marker = markers.current[bus.busId];
                                if (marker) {
                                  marker.getPopup().addTo(map.current);
                                }
                              }
                            }}
                          >
                            {/* Bus Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-medium text-sm text-gray-800">
                                  {bus.busNumber}
                                </span>
                                <span className="text-xs text-blue-600 opacity-75">
                                  👆
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {bus.eta ? `${bus.eta} min` : 'ETA: --'}
                              </div>
                            </div>

                            {/* Bus Details */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                📍 Route: {bus.routeName}
                              </div>
                              <div className="text-xs text-gray-600">
                                👨‍💼 Driver: {bus.driverName}
                              </div>
                              {location && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-green-600">
                                    🕐{' '}
                                    {new Date(
                                      location.timestamp
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-blue-600">
                                    {location.speed
                                      ? `${location.speed} km/h`
                                      : 'Speed: --'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassyCard>
      </motion.div>
    </div>
  );
};

export default EnhancedStudentMap;
