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
import { Route } from '../types';

interface StudentMapProps {
  className?: string;
}

const StudentMap: React.FC<StudentMapProps> = ({ className = '' }) => {
  // Map references - using useRef to prevent re-initialization
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
      console.log('🔄 Loading routes from backend API...');
      const response = await apiService.getRoutes();
      if (response.success && response.data) {
        console.log('✅ Routes loaded from backend:', response.data.length, 'routes');
        setRoutes(response.data as unknown as Route[]);
        
        // Log route details for debugging
        response.data.forEach((route: Route) => {
          console.log(`📍 Route: ${route.name} (ID: ${route.id}) - Active: ${route.is_active}`);
        });
      } else {
        console.error('❌ Failed to load routes:', response);
      }
    } catch (error) {
      console.error('❌ Error loading routes:', error);
    }
  }, []);

  // Remove routes from map
  const removeRoutesFromMap = useCallback(() => {
    if (!map.current) return;

    routes.forEach((route) => {
      const routeId = `route-${route.id}`;

      try {
        // Remove layer if it exists
        if (map.current!.getLayer(routeId)) {
          map.current!.removeLayer(routeId);
        }

        // Remove source if it exists
        if (map.current!.getSource(routeId)) {
          map.current!.removeSource(routeId);
        }

        // Remove from tracking set
        addedRoutes.current.delete(routeId);
      } catch (error) {
        console.warn(`⚠️ Error removing route ${route.name}:`, error);
      }
    });
  }, [routes]);

  // Add routes to map
  const addRoutesToMap = useCallback(() => {
    if (!map.current || routes.length === 0) return;

    console.log('🗺️ Adding routes to map:', routes.length, 'routes');

    routes.forEach((route, index) => {
      const routeId = `route-${route.id}`;

      // Check if route has already been added to prevent duplicates
      if (addedRoutes.current.has(routeId) || map.current!.getSource(routeId)) {
        console.log(`🗺️ Route ${routeId} already exists, skipping...`);
        return;
      }

      try {
        // Add route source
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

        // Add route line layer
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

        console.log(`🗺️ Added route ${route.name} to map`);
        // Add to tracking set
        addedRoutes.current.add(routeId);
      } catch (error) {
        console.warn(`⚠️ Error adding route ${route.name}:`, error);
      }
    });
  }, [routes]);

  // Update bus marker on map
  const updateBusMarker = useCallback((location: BusLocation) => {
    if (!map.current) return;

    const { busId, latitude, longitude, speed } = location;
    const bus = busService.getBus(busId);

    if (!bus) return;

    // Create or update marker
    if (!markers.current[busId]) {
      // Create new marker with enhanced styling
      const el = document.createElement('div');
      el.className = 'bus-marker';
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

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      // Add enhanced popup with user-friendly information
      const popup = new maplibregl.Popup({
        offset: 25,
        className: 'bus-popup-container',
      }).setHTML(`
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

      marker.setPopup(popup);
      markers.current[busId] = marker;
    } else {
      // Update existing marker position
      markers.current[busId].setLngLat([longitude, latitude]);
      
      // Update popup content
      const popup = markers.current[busId].getPopup();
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
  }, [isConnected]);

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
      // Single bus - center on it with zoom
      map.current.flyTo({
        center: coordinates[0],
        zoom: 16,
        duration: 2000,
      });
    } else if (coordinates.length > 1) {
      // Multiple buses - fit bounds
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
      console.log('📍 Bus location update:', location);
      
      // Update last known location
      setLastBusLocations((prev) => ({
        ...prev,
        [location.busId]: location,
      }));

      // Update marker on map
      updateBusMarker(location);
    },
    [updateBusMarker]
  );

  const handleDriverConnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      console.log('🚌 Driver connected:', data);
    },
    []
  );

  const handleDriverDisconnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      console.log('🚌 Driver disconnected:', data);
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
      console.log('🚌 Bus arriving:', data);
    },
    []
  );

  // Initialize map - runs only once
  useEffect(() => {
    if (isMapInitialized.current || !mapContainer.current) {
      return;
    }

    console.log('🗺️ Initializing map...');
    isMapInitialized.current = true;

    // Create map with stable configuration
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
      center: [72.571, 23.025], // Default center (Ahmedabad, India)
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

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle map load event
    map.current.once('load', () => {
      console.log('🗺️ Map loaded successfully');
      setIsLoading(false);
      loadRoutes();
    });

    // Handle map errors
    map.current.on('error', (e) => {
      console.error('❌ Map error:', e);
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        isMapInitialized.current = false;
        addedRoutes.current.clear();
        markers.current = {};
      }
    };
  }, [loadRoutes]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let statusInterval: NodeJS.Timeout;

    const connectWebSocket = async () => {
      try {
        setConnectionError(null);
        setConnectionStatus('connecting');
        await websocketService.connect();
        setIsConnected(true);
        setConnectionStatus('connected');

        // Set up event listeners
        websocketService.onBusLocationUpdate(handleBusLocationUpdate);
        websocketService.onDriverConnected(handleDriverConnected);
        websocketService.onDriverDisconnected(handleDriverDisconnected);
        websocketService.onStudentConnected(() => {
          console.log('✅ Student connected to WebSocket');
        });
        websocketService.onBusArriving(handleBusArriving);

        // Monitor connection status
        const checkConnectionStatus = () => {
          const status = websocketService.getConnectionStatus();
          if (!status && connectionStatus === 'connected') {
            setConnectionStatus('disconnected');
            setIsConnected(false);
          }
        };

        statusInterval = setInterval(checkConnectionStatus, 10000);

        // Load initial bus data after WebSocket connection
        const loadBuses = async () => {
          try {
            while (!authService.isInitialized()) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const response = await apiService.getAllBuses();
            if (response.success && response.data) {
              console.log('📊 Initial bus data from API:', response.data.length, 'buses');

              response.data.forEach((apiBus: any) => {
                const busId = apiBus.bus_id || apiBus.id;
                if (busId) {
                  busService.syncBusFromAPI(busId, apiBus);
                }
              });

              const updatedBuses = busService.getAllBuses();
              setBuses(updatedBuses);
              console.log('✅ Initial buses loaded and synced:', response.data.length);
            }
          } catch (error) {
            console.error('❌ Error loading initial buses:', error);
          }
        };

        loadBuses();
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setConnectionError('Failed to connect to real-time updates');
        setIsConnected(false);
        setConnectionStatus('disconnected');

        reconnectTimeout = setTimeout(() => {
          console.log('🔄 Retrying WebSocket connection...');
          setConnectionStatus('reconnecting');
          connectWebSocket();
        }, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      websocketService.disconnect();
    };
  }, [handleBusArriving, handleBusLocationUpdate, handleDriverConnected, handleDriverDisconnected]);

  // Get filtered buses based on selected route
  const filteredBuses = useMemo(() => {
    if (selectedRoute === 'all') {
      return buses;
    }
    
    // Filter buses by route ID
    return buses.filter((bus) => {
      const busRoute = routes.find((route) => route.name === bus.routeName);
      return busRoute && busRoute.id === selectedRoute;
    });
  }, [buses, selectedRoute, routes]);

  // Get unique routes for filter
  const availableRoutes = useMemo(() => {
    return routes.map((route: Route) => ({
      id: route.id,
      name: route.name,
      description: route.description,
    }));
  }, [routes]);

  // Add routes to map when routes are loaded
  useEffect(() => {
    if (routes.length > 0 && map.current && map.current.isStyleLoaded()) {
      removeRoutesFromMap();
      addRoutesToMap();
    }

    return () => {
      if (map.current) {
        removeRoutesFromMap();
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
        <GlassyCard
          variant="premium"
          glow={true}
          className="w-80 max-h-[calc(100vh-2rem)] overflow-hidden"
        >
          {/* Navbar Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Student Live Tracking
              </h2>
            </div>
            <button
              onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
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
          </div>

          {/* Navbar Content */}
          <div className="p-4 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-sm text-white/80">
                  {isConnected ? 'Live Connected' : 'Offline'}
                </span>
              </div>
              <span className="text-xs text-white/60">
                {filteredBuses.length} buses
              </span>
            </div>

            {/* Route Filter Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90">Route Filter</h3>
                <button
                  onClick={() => setIsRouteFilterOpen(!isRouteFilterOpen)}
                  className="p-1 hover:bg-white/10 rounded transition-colors duration-200"
                >
                  <svg
                    className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
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
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
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
                      className="w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded-lg text-blue-200 hover:text-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <h3 className="text-sm font-semibold text-white/90">Active Buses</h3>
                <button
                  onClick={() => setIsActiveBusesOpen(!isActiveBusesOpen)}
                  className="p-1 hover:bg-white/10 rounded transition-colors duration-200"
                >
                  <svg
                    className={`w-4 h-4 text-white/70 transition-transform duration-200 ${
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
                        <div className="text-white/40 text-2xl mb-2">🚌</div>
                        <p className="text-white/60 text-sm">No buses tracking</p>
                        <p className="text-white/40 text-xs mt-1">
                          Check connection status
                        </p>
                      </div>
                    ) : (
                      filteredBuses.map((bus) => {
                        const location = lastBusLocations[bus.busId];
                        return (
                          <motion.div
                            key={bus.busId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all duration-200"
                            onClick={() => {
                              const location = lastBusLocations[bus.busId];
                              if (location && map.current) {
                                map.current.flyTo({
                                  center: [location.longitude, location.latitude],
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
                                <span className="font-medium text-sm text-white/90">
                                  {bus.busNumber}
                                </span>
                                <span className="text-xs text-blue-300 opacity-75">
                                  👆
                                </span>
                              </div>
                              <div className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                                {bus.eta ? `${bus.eta} min` : 'ETA: --'}
                              </div>
                            </div>

                            {/* Bus Details */}
                            <div className="space-y-1">
                              <div className="text-xs text-white/70">
                                📍 Route: {bus.routeName}
                              </div>
                              <div className="text-xs text-white/70">
                                👨‍💼 Driver: {bus.driverName}
                              </div>
                              {location && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-green-300">
                                    🕐{' '}
                                    {new Date(location.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-blue-300">
                                    {location.speed ? `${location.speed} km/h` : 'Speed: --'}
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

export default StudentMap;
