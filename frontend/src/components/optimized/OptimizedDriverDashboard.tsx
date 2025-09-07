// frontend/src/components/optimized/OptimizedDriverDashboard.tsx

import React, {
  useEffect,
  useRef,
  useMemo,
  memo,
} from 'react';
import { useNavigate } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
import { Map, Marker } from 'maplibre-gl';
import { supabase } from '../../config/supabase';
import { websocketService } from '../../services/websocket';
import { authService } from '../../services/authService';
import GlassyCard from '../ui/GlassyCard';
import {
  useDebounce,
  useThrottle,
  useStableCallback,
  useRenderPerformance,
  useBatchedState,
  withPerformanceTracking,
} from '../../utils/performanceOptimization';

interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
}

interface LocationData {
  driverId: string;
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

// Memoized location display component
const LocationDisplay = memo<{
  currentLocation: GeolocationPosition | null;
  locationError: string | null;
  lastUpdateTime: string | null;
  updateCount: number;
}>(({ currentLocation, locationError, lastUpdateTime, updateCount }) => {
  const locationInfo = useMemo(() => {
    if (locationError) {
      return { status: 'error', message: locationError };
    }
    if (!currentLocation) {
      return { status: 'no-location', message: 'No location data available' };
    }
    return {
      status: 'success',
      message: `Lat: ${currentLocation.coords.latitude.toFixed(6)}, Lng: ${currentLocation.coords.longitude.toFixed(6)}`,
    };
  }, [currentLocation, locationError]);

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-white mb-2">Current Location</h3>
      <div className={`p-3 rounded-lg ${
        locationInfo.status === 'error' 
          ? 'bg-red-500/20 border border-red-500/50' 
          : locationInfo.status === 'success'
          ? 'bg-green-500/20 border border-green-500/50'
          : 'bg-yellow-500/20 border border-yellow-500/50'
      }`}>
        <div className="text-white text-sm">{locationInfo.message}</div>
        {lastUpdateTime && (
          <div className="text-white/70 text-xs mt-1">
            Last update: {lastUpdateTime} (Updates: {updateCount})
          </div>
        )}
      </div>
    </div>
  );
});

// Memoized bus info component
const BusInfoDisplay = memo<{
  busInfo: BusInfo | null;
  isLoading: boolean;
}>(({ busInfo, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Bus Information</h3>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="animate-pulse">
            <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!busInfo) {
    return (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Bus Information</h3>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
          <div className="text-white text-sm">No bus information available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-white mb-2">Bus Information</h3>
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
        <div className="text-white text-sm space-y-1">
          <div><strong>Bus Number:</strong> {busInfo.bus_number}</div>
          <div><strong>Route:</strong> {busInfo.route_name}</div>
          <div><strong>Driver:</strong> {busInfo.driver_name}</div>
        </div>
      </div>
    </div>
  );
});

// Memoized tracking controls component
const TrackingControls = memo<{
  isTracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  isAuthenticated: boolean;
}>(({ isTracking, onStartTracking, onStopTracking, isAuthenticated }) => {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-white mb-2">Location Tracking</h3>
      <div className="space-y-2">
        {!isAuthenticated ? (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
            <div className="text-white text-sm">Please log in to start tracking</div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={onStartTracking}
              disabled={isTracking}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                isTracking
                  ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                  : 'bg-green-500/80 hover:bg-green-500 text-white'
              }`}
            >
              {isTracking ? 'Tracking...' : 'Start Tracking'}
            </button>
            <button
              onClick={onStopTracking}
              disabled={!isTracking}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                !isTracking
                  ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
            >
              Stop Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const OptimizedDriverDashboard: React.FC = () => {
  // Performance tracking
  const endRender = useRenderPerformance('OptimizedDriverDashboard');

  const navigate = useNavigate();

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const eventListenersRef = useRef<Record<string, any>>({});

  // State management with batching
  const [trackingState, setTrackingState] = useBatchedState({
    isTracking: false,
    currentLocation: null as GeolocationPosition | null,
    locationError: null as string | null,
    lastUpdateTime: null as string | null,
    updateCount: 0,
  });

  const [authState, setAuthState] = useBatchedState({
    isAuthenticated: false,
    busInfo: null as BusInfo | null,
    isLoading: false,
  });

  const [socketState, setSocketState] = useBatchedState({
    socketError: null as string | null,
    isConnected: false,
  });

  // Debounced location updates to prevent excessive WebSocket calls
  const debouncedLocation = useDebounce(trackingState.currentLocation, 1000);

  // Throttled location sending to prevent spam
  const throttledSendLocation = useThrottle(async (location: GeolocationPosition) => {
    if (!authState.isAuthenticated || !authState.busInfo) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const locationData: LocationData = {
        driverId: user.id,
        busId: authState.busInfo.bus_id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };

      websocketService.sendLocationUpdate(locationData);
      
      setTrackingState(prev => ({
        ...prev,
        lastUpdateTime: new Date().toLocaleTimeString(),
        updateCount: prev.updateCount + 1,
      }));
    } catch (error) {
      console.error('❌ Error sending location update:', error);
      setSocketState(prev => ({
        ...prev,
        socketError: error instanceof Error ? error.message : 'Failed to send location',
      }));
    }
  }, 2000); // Send location every 2 seconds max

  // Stable callbacks
  const fetchBusInfoFromAPI = useStableCallback(async (userId: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const data = await authService.getDriverBusAssignment(userId);

      if (!data) {
        console.error('❌ Error fetching bus info: No assignment found');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      const busInfo: BusInfo = {
        bus_id: data.bus_id,
        bus_number: data.bus_number,
        route_id: data.route_id,
        route_name: data.route_name,
        driver_id: userId,
        driver_name: data.driver_name,
      };

      setAuthState(prev => ({
        ...prev,
        busInfo,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('❌ Error in fetchBusInfoFromAPI:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  const initializeMap = useStableCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log('🗺️ Initializing optimized driver map...');

    mapRef.current = new Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [77.2090, 28.6139], // Delhi coordinates
      zoom: 15,
      maxZoom: 18,
      minZoom: 10,
    });

    // Store event listeners for proper cleanup
    const handleWebGLContextLost = () => {
      console.warn('⚠️ WebGL context lost');
    };

    const handleWebGLContextRestored = () => {
      console.log('✅ WebGL context restored');
    };

    const handleError = (e: any) => {
      console.error('❌ Map error:', e);
    };

    const handleLoad = () => {
      console.log('✅ Map loaded successfully');
    };

    mapRef.current.on('webglcontextlost', handleWebGLContextLost);
    mapRef.current.on('webglcontextrestored', handleWebGLContextRestored);
    mapRef.current.on('error', handleError);
    mapRef.current.on('load', handleLoad);

    // Store event listeners for cleanup
    eventListenersRef.current = {
      webglcontextlost: handleWebGLContextLost,
      webglcontextrestored: handleWebGLContextRestored,
      error: handleError,
      load: handleLoad,
    };
  }, []);

  const updateMapMarker = useStableCallback((location: GeolocationPosition) => {
    if (!mapRef.current) return;

    const { latitude, longitude } = location.coords;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.innerHTML = `
        <div class="driver-marker-pin">
          <div class="driver-marker-icon">🚗</div>
          <div class="driver-marker-pulse"></div>
        </div>
      `;

      markerRef.current = new Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    // Center map on current location
    mapRef.current.setCenter([longitude, latitude]);
  }, []);

  const startLocationTracking = useStableCallback(() => {
    if (!navigator.geolocation) {
      setTrackingState(prev => ({
        ...prev,
        locationError: 'Geolocation is not supported by this browser',
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setTrackingState(prev => ({
          ...prev,
          currentLocation: position,
          locationError: null,
        }));

        updateMapMarker(position);
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setTrackingState(prev => ({
          ...prev,
          locationError: errorMessage,
        }));
      },
      options
    );

    setTrackingState(prev => ({
      ...prev,
      isTracking: true,
      locationError: null,
    }));

    // Store watch ID for cleanup
    (navigator.geolocation as any).watchId = watchId;
  }, [updateMapMarker]);

  const stopLocationTracking = useStableCallback(() => {
    if ((navigator.geolocation as any).watchId) {
      navigator.geolocation.clearWatch((navigator.geolocation as any).watchId);
      (navigator.geolocation as any).watchId = null;
    }

    setTrackingState(prev => ({
      ...prev,
      isTracking: false,
    }));
  }, []);

  const cleanupMap = useStableCallback(() => {
    try {
      if (mapRef.current) {
        // Remove all event listeners
        Object.entries(eventListenersRef.current).forEach(([event, handler]) => {
          mapRef.current!.off(event, handler);
        });

        eventListenersRef.current = {};

        // Remove the map
        mapRef.current.remove();
        mapRef.current = null;
      }

      markerRef.current = null;
      console.log('🗺️ Map cleanup completed');
    } catch (error) {
      console.error('❌ Error during map cleanup:', error);
    }
  }, []);

  const handleLogout = useStableCallback(async () => {
    try {
      await authService.logout();
      navigate('/driver-login');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, [navigate]);

  // Initialize authentication and bus info
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isAuthenticated = await authService.isAuthenticated();
        setAuthState(prev => ({ ...prev, isAuthenticated }));

        if (isAuthenticated) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await fetchBusInfoFromAPI(user.id);
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
      }
    };

    initializeAuth();
  }, [fetchBusInfoFromAPI]);

  // Initialize map
  useEffect(() => {
    initializeMap();

    return () => {
      cleanupMap();
    };
  }, [initializeMap, cleanupMap]);

  // Send location updates when location changes
  useEffect(() => {
    if (debouncedLocation && trackingState.isTracking) {
      throttledSendLocation(debouncedLocation);
    }
  }, [debouncedLocation, trackingState.isTracking, throttledSendLocation]);

  // WebSocket connection management
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await websocketService.connect();
        setSocketState(prev => ({
          ...prev,
          isConnected: true,
          socketError: null,
        }));
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setSocketState(prev => ({
          ...prev,
          isConnected: false,
          socketError: error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    };

    if (authState.isAuthenticated) {
      connectWebSocket();
    }

    return () => {
      websocketService.disconnect();
    };
  }, [authState.isAuthenticated]);

  // Log render performance
  useEffect(() => {
    const renderTime = endRender();
    if (renderTime > 16) {
      console.warn(`🐌 OptimizedDriverDashboard render took ${renderTime.toFixed(2)}ms`);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:w-1/3">
            <GlassyCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Driver Dashboard</h1>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>

              <BusInfoDisplay
                busInfo={authState.busInfo}
                isLoading={authState.isLoading}
              />

              <LocationDisplay
                currentLocation={trackingState.currentLocation}
                locationError={trackingState.locationError}
                lastUpdateTime={trackingState.lastUpdateTime}
                updateCount={trackingState.updateCount}
              />

              <TrackingControls
                isTracking={trackingState.isTracking}
                onStartTracking={startLocationTracking}
                onStopTracking={stopLocationTracking}
                isAuthenticated={authState.isAuthenticated}
              />

              {socketState.socketError && (
                <div className="mb-4">
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <div className="text-white text-sm">
                      WebSocket Error: {socketState.socketError}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-white/70 text-sm">
                Status: {socketState.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            </GlassyCard>
          </div>

          {/* Right Panel - Map */}
          <div className="lg:w-2/3">
            <GlassyCard className="p-4">
              <div className="h-96 lg:h-[600px] rounded-lg overflow-hidden">
                <div
                  ref={mapContainerRef}
                  className="w-full h-full"
                />
              </div>
            </GlassyCard>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export with performance tracking
export default withPerformanceTracking(OptimizedDriverDashboard, 'OptimizedDriverDashboard');

