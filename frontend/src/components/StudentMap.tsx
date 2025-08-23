import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import maplibregl from 'maplibre-gl';
import { websocketService, BusLocation } from '../services/websocket';
import { busService, BusInfo } from '../services/busService';
import { apiService } from '../services/api';
import { authService } from '../services/authService';
import './StudentMap.css';

interface Route {
  id: string;
  name: string;
  description: string;
  stops: GeoJSON.LineString;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
}

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

  // Utility function to calculate distance between coordinates (Haversine formula)
  // const calculateDistance = useCallback(
  //   (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  //     const R = 6371; // Earth's radius in kilometers
  //     const dLat = ((lat2 - lat1) * Math.PI) / 180;
  //     const dLng = ((lng2 - lng1) * Math.PI) / 180;
  //     const a =
  //       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //       Math.cos((lat1 * Math.PI) / 180) *
  //         Math.cos((lat2 * Math.PI) / 180) *
  //         Math.sin(dLng / 2) *
  //         Math.sin(dLng / 2);
  //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //     return R * c; // Distance in kilometers
  //   },
  //   []
  // );

  // Load routes from API
  const loadRoutes = useCallback(async () => {
    try {
      const response = await apiService.getRoutes();
      if (response.success && response.data) {
        setRoutes(response.data as unknown as Route[]);
        console.log('✅ Routes loaded:', response.data.length);
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
            <h3>🚌 ${bus.busNumber}</h3>
            <span class="status-badge active">● Live</span>
          </div>
          <div class="bus-popup-content">
            <div class="info-row">
              <span class="label">📍 Route:</span>
              <span class="value">${bus.routeName}</span>
            </div>
            <div class="info-row">
              <span class="label">👨‍💼 Driver:</span>
              <span class="value">${bus.driverName}</span>
            </div>
            <div class="info-row">
              <span class="label">⚡ Speed:</span>
              <span class="value">${speed ? `${speed} km/h` : 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">⏰ ETA:</span>
              <span class="value">${bus.eta ? `${bus.eta} minutes` : 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">🕐 Updated:</span>
              <span class="value">${new Date(location.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          </div>
        </div>
      `);

      marker.setPopup(popup);
      markers.current[busId] = marker;

      console.log(
        `📍 Created enhanced marker for bus ${busId} at [${longitude.toFixed(6)}, ${latitude.toFixed(6)}]`
      );
    } else {
      // Update existing marker position smoothly
      markers.current[busId].setLngLat([longitude, latitude]);

      // Update popup content with current location
      const popup = markers.current[busId].getPopup();
      if (popup) {
        popup.setHTML(`
          <div class="bus-popup">
            <div class="bus-popup-header">
              <h3>🚌 ${bus.busNumber}</h3>
              <span class="status-badge active">● Live</span>
            </div>
            <div class="bus-popup-content">
              <div class="info-row">
                <span class="label">📍 Route:</span>
                <span class="value">${bus.routeName}</span>
              </div>
              <div class="info-row">
                <span class="label">👨‍💼 Driver:</span>
                <span class="value">${bus.driverName}</span>
              </div>
              <div class="info-row">
                <span class="label">⚡ Speed:</span>
                <span class="value">${speed ? `${speed} km/h` : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">⏰ ETA:</span>
                <span class="value">${bus.eta ? `${bus.eta} minutes` : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">🕐 Updated:</span>
                <span class="value">${new Date(location.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>
        `);
      }
    }
  }, []);

  const removeBusMarker = useCallback((busId: string) => {
    if (markers.current[busId]) {
      markers.current[busId].remove();
      delete markers.current[busId];
      console.log(`🗑️ Removed marker for bus ${busId}`);
    }
  }, []);

  // Function to center map on all active buses
  const centerMapOnBuses = useCallback(() => {
    if (!map.current) {
      console.log('🗺️ Map not initialized yet');
      return;
    }

    const locations = Object.values(lastBusLocations);
    console.log(`🗺️ Centering map on ${locations.length} buses:`, locations);

    if (locations.length === 0) {
      console.log('🗺️ No bus locations available');
      return;
    }

    if (locations.length === 1) {
      // Single bus - center on it
      const location = locations[0];
      console.log(
        `🗺️ Centering on single bus: [${location.longitude}, ${location.latitude}]`
      );
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 14,
        duration: 1000,
      });
    } else if (locations.length > 1) {
      // Multiple buses - fit all in view
      const bounds = new maplibregl.LngLatBounds();
      locations.forEach((location) => {
        bounds.extend([location.longitude, location.latitude]);
      });

      console.log(`🗺️ Fitting ${locations.length} buses in view`);
      map.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      });
    }
  }, [lastBusLocations]);

  const handleBusLocationUpdate = useCallback(
    (location: BusLocation) => {
      const { busId, latitude, longitude } = location;

      console.log(`📍 Real-time location update for bus ${busId}:`, {
        latitude,
        longitude,
        speed: location.speed,
        eta: location.eta?.estimated_arrival_minutes,
      });

      // Update bus service with new location
      busService.updateBusLocation(location);

      // Try to get bus details from API if we don't have proper info
      const currentBus = busService.getBus(busId);
      if (
        currentBus &&
        (currentBus.busNumber === `Bus ${busId}` ||
          currentBus.routeName === 'Route TBD')
      ) {
        // Fetch bus details from API
        apiService
          .getBusInfo(busId)
          .then((response) => {
            if (response.success && response.data) {
              busService.syncBusFromAPI(busId, response.data);
              console.log(
                `🔄 Synced bus ${busId} with API data:`,
                response.data
              );

              // Update the buses state to reflect the changes
              const updatedBuses = busService.getAllBuses();
              setBuses(updatedBuses);
            }
          })
          .catch((error) => {
            console.error(`❌ Failed to sync bus ${busId} data:`, error);
          });
      }

      // Get updated bus list from service
      const updatedBuses = busService.getAllBuses();
      setBuses(updatedBuses);

      // Update last known location
      setLastBusLocations((prev) => ({
        ...prev,
        [busId]: location,
      }));

      // Update marker on map
      updateBusMarker(location);

      // Center map on first bus location received
      if (map.current && Object.keys(lastBusLocations).length === 0) {
        console.log(
          `🗺️ Centering map on first bus location: [${longitude}, ${latitude}]`
        );
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 2000,
        });
      } else if (map.current && Object.keys(lastBusLocations).length > 0) {
        // If we already have buses, center on all of them
        setTimeout(() => {
          centerMapOnBuses();
        }, 100); // Small delay to ensure state is updated
      }
    },
    [updateBusMarker, lastBusLocations, centerMapOnBuses]
  );

  const handleDriverConnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      console.log('🚌 Driver connected:', data);
      // Update bus status if needed
    },
    []
  );

  const handleDriverDisconnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      console.log('🚌 Driver disconnected:', data);
      // Remove bus marker when driver disconnects
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
      // Handle bus arrival notification
    },
    []
  );

  // Initialize map - runs only once
  useEffect(() => {
    // Prevent multiple initializations
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
      bearing: 0, // Explicitly set to 0 to prevent rotation
      pitch: 0, // Explicitly set to 0 to prevent 3D tilting
      attributionControl: true,
      maxZoom: 19,
      minZoom: 1,
      preserveDrawingBuffer: false,
      antialias: true,
      dragRotate: false, // Disable drag rotation
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle map load event - runs only once
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
        // Clear tracking sets
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

        // Check connection status every 10 seconds
        statusInterval = setInterval(checkConnectionStatus, 10000);

        // Load initial bus data after WebSocket connection
        const loadBuses = async () => {
          try {
            // Wait for auth service to be initialized before making API calls
            while (!authService.isInitialized()) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const response = await apiService.getAllBuses();
            if (response.success && response.data) {
              console.log('📊 Initial bus data from API:', response.data.length, 'buses');

              // Sync each bus with the bus service
              response.data.forEach(
                (apiBus: {
                  bus_id?: string;
                  id?: string;
                  driver_id?: string;
                  number_plate?: string;
                  bus_number?: string;
                  route_name?: string;
                  route_city?: string;
                  routes?: { name: string };
                  driver_name?: string;
                  driver?: { first_name?: string; last_name?: string };
                }) => {
                  const busId = apiBus.bus_id || apiBus.id; // Handle both backend and frontend data structures
                  if (busId) {
                    // Always sync bus data from API - this will create or update the bus
                    busService.syncBusFromAPI(busId, apiBus);
                  }
                }
              );

              const updatedBuses = busService.getAllBuses();
              setBuses(updatedBuses);
              console.log(
                '✅ Initial buses loaded and synced:',
                response.data.length
              );
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

        // Retry connection after 5 seconds
        reconnectTimeout = setTimeout(() => {
          console.log('🔄 Retrying WebSocket connection...');
          setConnectionStatus('reconnecting');
          connectWebSocket();
        }, 5000);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      websocketService.disconnect();
    };
  }, [
    handleBusArriving,
    handleBusLocationUpdate,
    handleDriverConnected,
    handleDriverDisconnected,
  ]);

  // Get filtered buses based on selected route
  const filteredBuses = useMemo(() => {
    if (selectedRoute === 'all') {
      return buses;
    }
    // Filter buses by route ID instead of route name
    return buses.filter((bus) => {
      // Find the route for this bus
      const busRoute = routes.find((route) => route.name === bus.routeName);
      return busRoute && busRoute.id === selectedRoute;
    });
  }, [buses, selectedRoute, routes]);

  // Get unique routes for filter - use actual routes from admin panel
  const availableRoutes = useMemo(() => {
    // Use routes from the routes state (loaded from admin panel) instead of bus route names
    return routes.map((route: Route) => ({
      id: route.id,
      name: route.name,
      description: route.description
    }));
  }, [routes]);

  // Add routes to map when routes are loaded
  useEffect(() => {
    if (routes.length > 0 && map.current && map.current.isStyleLoaded()) {
      // Remove existing routes first to prevent duplicates
      removeRoutesFromMap();
      // Add new routes
      addRoutesToMap();
    }

    // Cleanup function to remove routes when component unmounts
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

      {/* Main Controls Panel - Top Left */}
      <div className="absolute top-4 left-4 z-20 w-64">
        <div className="controls-panel bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 panel-enter">
          {/* Header with connection status */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-xs font-medium text-gray-700">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {filteredBuses.length} buses
            </div>
          </div>

          {/* Route Filter */}
          <div className="p-3 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Route Filter
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="block w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Routes</option>
              {availableRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="p-3 space-y-2">
            {filteredBuses.length > 0 && (
              <button
                onClick={() => {
                  console.log('🗺️ Center on Buses button clicked');
                  setTimeout(() => {
                    centerMapOnBuses();
                  }, 50);
                }}
                className="btn-primary w-full px-3 py-2 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
              >
                📍 Center on Buses ({Object.keys(lastBusLocations).length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bus Information Panel - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20 w-72">
        <div className="bus-info-panel bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 max-h-80 panel-enter">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              🚌 Active Buses
            </h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {filteredBuses.length}
            </span>
          </div>

          {/* Bus List */}
          <div className="bus-list-container overflow-y-auto max-h-64">
            {filteredBuses.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-gray-400 text-2xl mb-2">🚌</div>
                <p className="text-gray-500 text-sm">No buses tracking</p>
                <p className="text-gray-400 text-xs mt-1">Check connection status</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredBuses.map((bus) => {
                  const location = lastBusLocations[bus.busId];
                  return (
                    <div
                      key={bus.busId}
                      className="bus-card p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                      title="Click to center map and view details"
                      onClick={() => {
                        // Center map on this bus
                        const location = lastBusLocations[bus.busId];
                        if (location && map.current) {
                          map.current.flyTo({
                            center: [location.longitude, location.latitude],
                            zoom: 16,
                            duration: 1000,
                          });
                          // Open the popup for this bus
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
                          <span className="text-xs text-blue-600 opacity-75">👆</span>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
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
                              🕐 {new Date(location.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-blue-600">
                              {location.speed ? `${location.speed} km/h` : 'Speed: --'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default StudentMap;
