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

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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

  // Add routes to map
  const addRoutesToMap = useCallback(() => {
    if (!map.current || routes.length === 0) return;

    routes.forEach((route, index) => {
      const routeId = `route-${route.id}`;

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

      // Add enhanced popup with location details
      const popup = new maplibregl.Popup({
        offset: 25,
        className: 'bus-popup-container',
      }).setHTML(`
        <div class="bus-popup">
          <h3>🚌 ${bus.busNumber}</h3>
          <p><strong>Route:</strong> ${bus.routeName}</p>
          <p><strong>Driver:</strong> ${bus.driverName}</p>
          <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
          <p><strong>ETA:</strong> ${bus.eta ? `${bus.eta} minutes` : 'N/A'}</p>
          <p><strong>Status:</strong> <span style="color: #059669;">Active</span></p>
          <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
          <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
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
            <h3>🚌 ${bus.busNumber}</h3>
            <p><strong>Route:</strong> ${bus.routeName}</p>
            <p><strong>Driver:</strong> ${bus.driverName}</p>
            <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
            <p><strong>ETA:</strong> ${bus.eta ? `${bus.eta} minutes` : 'N/A'}</p>
            <p><strong>Status:</strong> <span style="color: #059669;">Active</span></p>
            <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
            <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
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
      locations.forEach(location => {
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
          .then(response => {
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
          .catch(error => {
            console.error(`❌ Failed to sync bus ${busId} data:`, error);
          });
      }

      // Get updated bus list from service
      const updatedBuses = busService.getAllBuses();
      setBuses(updatedBuses);

      // Update last known location
      setLastBusLocations(prev => ({
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
    map.current.on('error', e => {
      console.error('❌ Map error:', e);
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        isMapInitialized.current = false;
      }
    };
  }, [loadRoutes]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = async () => {
      try {
        setConnectionError(null);
        await websocketService.connect();
        setIsConnected(true);

        // Set up event listeners
        websocketService.onBusLocationUpdate(handleBusLocationUpdate);
        websocketService.onDriverConnected(handleDriverConnected);
        websocketService.onDriverDisconnected(handleDriverDisconnected);
        websocketService.onStudentConnected(() => {
          console.log('✅ Student connected to WebSocket');
        });
        websocketService.onBusArriving(handleBusArriving);

        // Load initial bus data after WebSocket connection
        const loadBuses = async () => {
          try {
            // Wait for auth service to be initialized before making API calls
            let attempts = 0;
            while (!authService.isInitialized() && attempts < 50) {
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
            }
            
            const response = await apiService.getAllBuses();
            if (response.success && response.data) {
              console.log('📊 Initial bus data from API:', response.data);

              // Sync each bus with the bus service
              response.data.forEach(
                (apiBus: {
                  bus_id?: string;
                  id?: string;
                  driver_id?: string;
                  number_plate?: string;
                  bus_number?: string;
                  route_name?: string;
                  routes?: { name: string };
                  driver_name?: string;
                  driver?: { first_name?: string; last_name?: string };
                }) => {
                  const busId = apiBus.bus_id || apiBus.id; // Handle both backend and frontend data structures
                  if (busId) {
                    const existingBus = busService.getBus(busId);
                    if (existingBus) {
                      busService.syncBusFromAPI(busId, apiBus);
                    } else {
                      // Create new bus entry if it doesn't exist
                      busService.updateBusLocation({
                        busId,
                        driverId: apiBus.driver_id || '',
                        latitude: 0,
                        longitude: 0,
                        timestamp: new Date().toISOString(),
                      });
                      busService.syncBusFromAPI(busId, apiBus);
                    }
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

        // Retry connection after 5 seconds
        reconnectTimeout = setTimeout(() => {
          console.log('🔄 Retrying WebSocket connection...');
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
    return busService.getBusesByRoute(selectedRoute);
  }, [buses, selectedRoute]);

  // Get unique routes for filter
  const availableRoutes = useMemo(() => {
    const routes = [...new Set(buses.map((bus: BusInfo) => bus.routeName))];
    return routes.filter((route: string) => route !== 'Route TBD');
  }, [buses]);

  // Add routes to map when routes are loaded
  useEffect(() => {
    if (routes.length > 0 && map.current && map.current.isStyleLoaded()) {
      addRoutesToMap();
    }
  }, [routes, addRoutesToMap]);

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

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Route filter */}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Route
          </label>
          <select
            value={selectedRoute}
            onChange={e => setSelectedRoute(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Routes</option>
            {availableRoutes.map(route => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
        </div>

        {/* Connection status */}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span className="text-sm text-gray-700">
              {isConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
            </span>
          </div>
          {connectionError && (
            <div className="mt-1 text-xs text-red-600">{connectionError}</div>
          )}
        </div>

        {/* Bus count */}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Active Buses:</span>{' '}
            {filteredBuses.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Center on buses button */}
        {filteredBuses.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <button
              onClick={() => {
                console.log('🗺️ Center on Buses button clicked');
                console.log('📍 Current bus locations:', lastBusLocations);
                console.log('🚌 Filtered buses:', filteredBuses);

                // Force a small delay to ensure state is updated
                setTimeout(() => {
                  centerMapOnBuses();
                }, 50);
              }}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              🗺️ Center on Buses ({Object.keys(lastBusLocations).length})
            </button>
            {Object.keys(lastBusLocations).length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                <div className="font-medium">📍 Current Locations:</div>
                {Object.entries(lastBusLocations)
                  .slice(0, 2)
                  .map(([busId, location]) => {
                    const bus = busService.getBus(busId);
                    return (
                      <div key={busId} className="mt-1">
                        {bus?.busNumber || `Bus ${busId}`}:{' '}
                        {location.latitude.toFixed(4)},{' '}
                        {location.longitude.toFixed(4)}
                      </div>
                    );
                  })}
                {Object.keys(lastBusLocations).length > 2 && (
                  <div className="text-gray-500">
                    ... and {Object.keys(lastBusLocations).length - 2} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bus list overlay */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm max-h-64 overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            🚌 Active Buses ({filteredBuses.length})
          </h3>
          {filteredBuses.length === 0 ? (
            <p className="text-gray-500 text-sm">No buses available</p>
          ) : (
            <div className="space-y-2">
              {filteredBuses.map(bus => {
                const location = lastBusLocations[bus.busId];
                return (
                  <div
                    key={bus.busId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-blue-600">
                        {bus.busNumber}
                      </div>
                      <div className="text-xs text-gray-600">
                        {bus.routeName}
                      </div>
                      {location && (
                        <div className="text-xs text-green-600 mt-1">
                          📍 {location.latitude.toFixed(4)},{' '}
                          {location.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {bus.eta ? `${bus.eta} min` : 'N/A'}
                      </div>
                      {location && (
                        <div className="text-xs text-gray-400">
                          {new Date(location.timestamp).toLocaleTimeString()}
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

      {/* Location indicator panel */}
      {Object.keys(lastBusLocations).length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              📍 Live Locations
            </h3>
            <div className="space-y-2">
              {Object.entries(lastBusLocations).map(([busId, location]) => {
                const bus = busService.getBus(busId);
                return (
                  <div
                    key={busId}
                    className="p-2 bg-blue-50 rounded border border-blue-200"
                  >
                    <div className="font-medium text-sm text-blue-800">
                      {bus?.busNumber || `Bus ${busId}`}
                    </div>
                    <div className="text-xs text-blue-600">
                      📍 {location.latitude.toFixed(6)},{' '}
                      {location.longitude.toFixed(6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      🕒 {new Date(location.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMap;
