import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { websocketService, BusLocation } from '../services/websocket';
import { busService, BusInfo } from '../services/busService';
import './StudentMap.css';

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
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastBusLocations, setLastBusLocations] = useState<{ [busId: string]: BusLocation }>({});
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Utility function to calculate distance between coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }, []);

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
          'osm': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [72.571, 23.025], // Default center (Ahmedabad, India)
      zoom: 12,
      bearing: 0, // Explicitly set to 0 to prevent rotation
      pitch: 0,   // Explicitly set to 0 to prevent 3D tilting
      attributionControl: true,
      maxZoom: 19,
      minZoom: 1,
      preserveDrawingBuffer: false,
      antialias: true,
      dragRotate: false // Disable drag rotation
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle map load event - runs only once
    map.current.once('load', () => {
      console.log('✅ Map loaded successfully');
      setIsLoading(false);
      
      // Disable rotation features after map loads
      if (map.current) {
        map.current.dragRotate.disable();
        map.current.touchZoomRotate.disableRotation();
        console.log('🔄 Rotation features disabled');
      }
    });

    // Handle map errors
    map.current.on('error', (e: any) => {
      console.error('❌ Map error:', e);
      if (e.error && e.error.message && !e.error.message.includes('tile')) {
        setConnectionError('Failed to load map');
      }
    });

    // Track user interaction to prevent automatic movements during user interaction
    map.current.on('movestart', () => {
      setIsUserInteracting(true);
    });

    map.current.on('moveend', () => {
      // Small delay to ensure user interaction is complete
      setTimeout(() => {
        setIsUserInteracting(false);
      }, 100);
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        isMapInitialized.current = false;
      }
    };
  }, []); // Empty dependency array ensures this runs only once

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
  }, []);

  // Handle bus location updates with distance threshold
  const handleBusLocationUpdate = useCallback((location: BusLocation) => {
    const { busId, latitude, longitude } = location;
    
    // Check if location has changed significantly (more than 10 meters)
    const lastLocation = lastBusLocations[busId];
    const DISTANCE_THRESHOLD = 0.01; // 10 meters in kilometers
    
    if (lastLocation) {
      const distance = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        latitude,
        longitude
      );
      
      // Skip update if distance is too small
      if (distance < DISTANCE_THRESHOLD) {
        console.log(`📍 Bus ${busId} location change too small (${(distance * 1000).toFixed(1)}m), skipping update`);
        return;
      }
    }

    // Update bus service
    busService.updateBusLocation(location);
    setBuses(busService.getAllBuses());
    
    // Update last known location
    setLastBusLocations(prev => ({
      ...prev,
      [busId]: location
    }));

    // Update marker on map
    updateBusMarker(location);
  }, [lastBusLocations, calculateDistance]);

  // Update bus marker on map
  const updateBusMarker = useCallback((location: BusLocation) => {
    if (!map.current) return;

    const { busId, latitude, longitude, speed } = location;
    const bus = busService.getBus(busId);
    
    if (!bus) return;

    // Create or update marker
    if (!markers.current[busId]) {
      // Create new marker
      const el = document.createElement('div');
      el.className = 'bus-marker';
      el.innerHTML = `
        <div class="bus-marker-content">
          <div class="bus-number">${bus.busNumber}</div>
          <div class="bus-speed">${speed ? `${speed} km/h` : 'N/A'}</div>
          <div class="bus-eta">${bus.eta ? `ETA: ${bus.eta} min` : 'ETA: N/A'}</div>
        </div>
      `;
      
      const marker = new maplibregl.Marker({
        element: el,
        rotationAlignment: 'map'
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);
      
      // Add popup
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div class="bus-popup">
          <h3>${bus.busNumber}</h3>
          <p><strong>Route:</strong> ${bus.routeName}</p>
          <p><strong>Driver:</strong> ${bus.driverName}</p>
          <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
          <p><strong>ETA:</strong> ${bus.eta ? `${bus.eta} minutes` : 'N/A'}</p>
          <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
        </div>
      `);
      
      marker.setPopup(popup);
      markers.current[busId] = marker;
      
      console.log(`📍 Created marker for bus ${busId}`);
    } else {
      // Update existing marker position smoothly
      markers.current[busId].setLngLat([longitude, latitude]);
      
      // Update popup content
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div class="bus-popup">
          <h3>${bus.busNumber}</h3>
          <p><strong>Route:</strong> ${bus.routeName}</p>
          <p><strong>Driver:</strong> ${bus.driverName}</p>
          <p><strong>Speed:</strong> ${speed ? `${speed} km/h` : 'N/A'}</p>
          <p><strong>ETA:</strong> ${bus.eta ? `${bus.eta} minutes` : 'N/A'}</p>
          <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleTimeString()}</p>
        </div>
      `);
      
      markers.current[busId].setPopup(popup);
      
      console.log(`📍 Updated marker for bus ${busId}`);
    }
  }, []);

  // Handle driver connection
  const handleDriverConnected = useCallback((data: { driverId: string; busId: string; timestamp: string }) => {
    console.log(`✅ Driver ${data.driverId} connected for bus ${data.busId}`);
  }, []);

  // Handle driver disconnection
  const handleDriverDisconnected = useCallback((data: { driverId: string; busId: string; timestamp: string }) => {
    console.log(`❌ Driver ${data.driverId} disconnected from bus ${data.busId}`);
    busService.removeBus(data.busId);
    setBuses(busService.getAllBuses());
    removeBusMarker(data.busId);
  }, []);

  // Remove bus marker
  const removeBusMarker = useCallback((busId: string) => {
    if (markers.current[busId]) {
      markers.current[busId].remove();
      delete markers.current[busId];
      console.log(`🗑️ Removed marker for bus ${busId}`);
    }
  }, []);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setConnectionError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Only move map if user is not interacting
        if (map.current && !isUserInteracting) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setConnectionError('Failed to get your location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [isUserInteracting]);

  // Reset map view
  const resetMapView = useCallback(() => {
    if (map.current) {
      map.current.flyTo({
        center: [72.571, 23.025],
        zoom: 12,
        duration: 1000
      });
    }
  }, []);

  // Filter buses by route
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

  // Get buses near user location
  const busesNearUser = useMemo(() => {
    if (!userLocation) return [];
    return busService.getBusesNearLocation(userLocation.lat, userLocation.lng, 5);
  }, [userLocation, buses]);

  return (
    <div className={`relative ${className}`}>
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
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{connectionError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Controls panel */}
      <div className="controls-panel">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Bus Controls</h3>
          
          {/* Route filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Route
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Routes</option>
              {availableRoutes.map((route: string) => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>

          {/* User location button */}
          <button
            onClick={getUserLocation}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📍 Get My Location
          </button>

          {/* Reset map view button */}
          <button
            onClick={resetMapView}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            🏠 Reset View
          </button>

          {/* Bus count */}
          <div className="text-sm text-gray-600">
            <p>Active Buses: {filteredBuses.length}</p>
            {userLocation && (
              <p>Near You: {busesNearUser.length}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bus list */}
      <div className="bus-list">
        <h3 className="font-semibold text-gray-900 mb-3">Active Buses</h3>
        {filteredBuses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No buses currently active</p>
        ) : (
          <div className="space-y-2">
            {filteredBuses.map((bus: BusInfo) => (
              <div key={bus.busId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{bus.busNumber}</p>
                  <p className="text-sm text-gray-600">{bus.routeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {bus.currentLocation.speed ? `${bus.currentLocation.speed} km/h` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {bus.eta ? `ETA: ${bus.eta} min` : 'ETA: N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="map-container"
      />
    </div>
  );
};

export default StudentMap;
