import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { supabase } from '../config/supabase';
import { websocketService } from '../services/websocket';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './DriverInterface.css';

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
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

interface LoginForm {
  email: string;
  password: string;
}

const DriverInterface: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [currentLocation, setCurrentLocation] =
    useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize Supabase auth listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await authenticateWithSocket(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setBusInfo(null);
        disconnectSocket();
        cleanupMap();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Proactively request location permission when component mounts
  useEffect(() => {
    if (isAuthenticated && navigator.geolocation) {
      console.log('🔍 Checking location permission on component mount...');

      // Check current permission state
      if ('permissions' in navigator) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((permission) => {
            console.log('📍 Initial permission state:', permission.state);

            // If permission is granted, we can proceed
            if (permission.state === 'granted') {
              console.log('✅ Location permission already granted');
            } else if (permission.state === 'prompt') {
              console.log('❓ Location permission needs to be requested');
            } else if (permission.state === 'denied') {
              console.log('❌ Location permission denied');
              setLocationError(
                'Location permission is denied. Please enable it in your browser settings.'
              );
            }
          });
      }
    }
  }, [isAuthenticated]);

  // Check location permission on component mount
  useEffect(() => {
    const checkLocationPermission = async () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser');
        return;
      }

      try {
        // Check if permission is already granted
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({
            name: 'geolocation',
          });
          if (permission.state === 'denied') {
            setLocationError(
              'Location permission denied. Please enable location access in your browser settings.'
            );
          }
        }
      } catch (error) {
        console.log(
          'Permission API not supported, will check when user clicks Start Tracking'
        );
      }
    };

    checkLocationPermission();
  }, []);

  const cleanupMap = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  };

  const initializeMap = (latitude: number, longitude: number) => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
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
      center: [longitude, latitude],
      zoom: 15,
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
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle map load event
    mapRef.current.once('load', () => {
      console.log('✅ Driver map loaded successfully');

      // Disable rotation features after map loads
      if (mapRef.current) {
        mapRef.current.dragRotate.disable();
        mapRef.current.touchZoomRotate.disableRotation();
        console.log('🔄 Rotation features disabled');
      }
    });

    // Handle map errors
    mapRef.current.on('error', (e: unknown) => {
      console.error('❌ Driver map error:', e);
    });

    // Create marker for driver location with enhanced styling
    const markerElement = document.createElement('div');
    markerElement.className = 'driver-marker';
    markerElement.innerHTML = `
      <div class="driver-marker-content">
        <div style="font-size: 16px;">🚌</div>
      </div>
    `;

    markerRef.current = new maplibregl.Marker({
      element: markerElement,
      anchor: 'center',
    })
      .setLngLat([longitude, latitude])
      .addTo(mapRef.current);

    // Add popup to marker with enhanced styling
    const popup = new maplibregl.Popup({
      offset: 25,
      className: 'driver-popup',
    }).setHTML(`
        <div class="driver-popup">
          <h3>🚌 Driver Location</h3>
          <p><strong>Bus:</strong> ${busInfo?.bus_number || 'Unknown'}</p>
          <p><strong>Route:</strong> ${busInfo?.route_name || 'Unknown'}</p>
          <p><strong>Driver:</strong> ${busInfo?.driver_name || 'Unknown'}</p>
          <p><strong>Status:</strong> <span style="color: #059669;">Active</span></p>
        </div>
      `);

    markerRef.current.setPopup(popup);
  };

  const updateMapLocation = (latitude: number, longitude: number) => {
    if (!mapRef.current || !markerRef.current) return;

    const newLocation = [longitude, latitude] as [number, number];

    // Update marker position
    markerRef.current.setLngLat(newLocation);

    // Smoothly fly to new location
    mapRef.current.flyTo({
      center: newLocation,
      duration: 1000,
    });

    // Update popup content with enhanced styling
    const popup = new maplibregl.Popup({
      offset: 25,
      className: 'driver-popup',
    }).setHTML(`
        <div class="driver-popup">
          <h3>🚌 Driver Location</h3>
          <p><strong>Bus:</strong> ${busInfo?.bus_number || 'Unknown'}</p>
          <p><strong>Route:</strong> ${busInfo?.route_name || 'Unknown'}</p>
          <p><strong>Driver:</strong> ${busInfo?.driver_name || 'Unknown'}</p>
          <p><strong>Status:</strong> <span style="color: #059669;">Active</span></p>
          <p><strong>Updated:</strong> ${new Date().toLocaleTimeString()}</p>
          <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
        </div>
      `);

    markerRef.current.setPopup(popup);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      // Driver login attempt

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        setLoginError(error.message);
        return;
      }

      if (data.user && data.session) {
        console.log('✅ Login successful:', data.user.email);

        // Authenticate with WebSocket immediately
        await authenticateWithSocket(data.session.access_token);

        // Clear form
        setLoginForm({ email: '', password: '' });
      } else {
        setLoginError('Login failed - no user data received');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setLoginError('An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithSocket = async (token: string) => {
    try {
      console.log('🔌 Driver: Connecting to WebSocket...');

      // Use the WebSocket service
      await websocketService.connect();

      // Handle socket events
      websocketService.socket?.on('connect', () => {
        console.log('🔌 Driver: Connected to WebSocket server');
        setSocketError(null);
      });

      websocketService.socket?.on('disconnect', () => {
        console.log('🔌 Driver: Disconnected from WebSocket server');
        setSocketError('Disconnected from server');
      });

      websocketService.socket?.on('error', (error) => {
        console.error('❌ Driver: Socket error:', error);
        setSocketError(error.message || 'Socket error occurred');
      });

      websocketService.socket?.on(
        'driver:authenticated',
        (data: { driverId: string; busId: string; busInfo: BusInfo }) => {
          console.log('✅ Driver: Authentication successful:', data);
          setIsAuthenticated(true);
          setBusInfo(data.busInfo);
          setSocketError(null);
        }
      );

      websocketService.socket?.on('driver:locationConfirmed', (data) => {
        console.log('📍 Driver: Location confirmed:', data);
        setLastUpdateTime(new Date().toLocaleTimeString());
        setUpdateCount((prev) => prev + 1);
      });

      // Store the socket reference
      socketRef.current = websocketService.socket;

      // Authenticate with the server
      websocketService.authenticateAsDriver(token);
    } catch (error) {
      console.error('❌ Driver: Authentication error:', error);
      setSocketError('Failed to authenticate with server');
    }
  };

  const disconnectSocket = () => {
    websocketService.disconnect();
    socketRef.current = null;
  };

  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    // Enhanced mobile detection
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isFirefox = navigator.userAgent.includes('Firefox');
    const isChrome = navigator.userAgent.includes('Chrome');
    const isSafari =
      navigator.userAgent.includes('Safari') &&
      !navigator.userAgent.includes('Chrome');

    console.log(
      `🌐 Device detected: ${isMobile ? 'Mobile' : 'Desktop'} - ${isFirefox ? 'Firefox' : isChrome ? 'Chrome' : isSafari ? 'Safari' : 'Other'}`
    );

    // Mobile-specific location options
    const options = {
      enableHighAccuracy: true,
      timeout: isMobile ? 30000 : 60000, // Shorter timeout for mobile
      maximumAge: 0, // Force fresh location - no caching
    };

    console.log('📍 Starting location tracking with options:', options);

    // Force location permission request
    try {
      // Clear any cached permissions first
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({
          name: 'geolocation',
        });
        console.log(`🔐 Current permission state: ${permission.state}`);

        if (permission.state === 'denied') {
          const mobileError = isMobile
            ? 'Location permission denied on mobile. Please:\n1. Go to your phone Settings\n2. Find this browser app\n3. Enable Location permission\n4. Refresh this page'
            : 'Location permission denied. Please reset location permissions and try again.';
          setLocationError(mobileError);
          return;
        }
      }
    } catch (error) {
      console.log(
        'Permission API not supported, proceeding with geolocation request'
      );
    }

    console.log('📍 Requesting location permission...');
    setLocationError(
      isMobile
        ? 'Requesting location permission on mobile... Please allow when prompted. If no prompt appears, check your phone settings.'
        : 'Requesting location permission... Please allow when prompted.'
    );

    // Get initial position with enhanced error handling
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Initial position obtained:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toLocaleString(),
        });
        setCurrentLocation(position);
        setLocationError(null);

        // Initialize map with current location
        initializeMap(position.coords.latitude, position.coords.longitude);

        sendLocationUpdate(position);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        let errorMessage = 'Location error: ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            if (isMobile) {
              errorMessage =
                'Mobile location permission denied. Please:\n\n' +
                '1. Go to your phone Settings\n' +
                '2. Find this browser app (Chrome/Firefox/Safari)\n' +
                '3. Tap "Permissions" or "Privacy"\n' +
                '4. Enable "Location" permission\n' +
                '5. Return to this page and refresh\n\n' +
                'Alternative: Try opening this page in a different browser app.';
            } else if (isFirefox) {
              errorMessage +=
                'Firefox location permission issue. Please: 1) Click the lock icon in address bar 2) Set location to "Allow" 3) Refresh the page 4) Try again';
            } else {
              errorMessage +=
                'Permission denied. Please enable location access in your browser settings. On mobile, check your browser permissions and try refreshing the page.';
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = isMobile
              ? 'Location unavailable on mobile. Please:\n1. Go outdoors or near a window\n2. Wait 10-15 seconds\n3. Make sure GPS is enabled in phone settings\n4. Try again'
              : 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = isMobile
              ? 'Location request timed out on mobile. Please:\n1. Go outdoors for better GPS signal\n2. Wait 30 seconds and try again\n3. Check if GPS is enabled in phone settings'
              : 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += error.message;
        }

        setLocationError(errorMessage);
      },
      options
    );

    // Start watching position with same options
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        console.log('📍 Location update received:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toLocaleString(),
        });
        setCurrentLocation(position);
        setLocationError(null);

        // Update map with new location
        updateMapLocation(position.coords.latitude, position.coords.longitude);

        sendLocationUpdate(position);
      },
      (error) => {
        console.error('❌ Geolocation watch error:', error);
        let errorMessage = 'Location tracking error: ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = isMobile
              ? 'Location permission lost on mobile. Please refresh the page and allow location access again.'
              : 'Permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = isMobile
              ? 'GPS signal lost on mobile. Please go outdoors or near a window.'
              : 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = isMobile
              ? 'GPS timeout on mobile. Please check your location and try again.'
              : 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += error.message;
        }

        setLocationError(errorMessage);
      },
      options
    );

    setIsTracking(true);
    console.log('📍 Location tracking started');
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    setIsTracking(false);
    console.log('📍 Location tracking stopped');
  };

  const sendLocationUpdate = (position: GeolocationPosition) => {
    if (!socketRef.current || !busInfo) return;

    const locationData: LocationData = {
      driverId: busInfo.driver_id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: new Date().toISOString(),
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined,
    };

    socketRef.current.emit('driver:locationUpdate', locationData);
  };

  const handleSignOut = async () => {
    try {
      console.log('🔐 Driver: Starting sign out...');

      // Stop tracking if active
      if (isTracking) {
        stopLocationTracking();
      }

      // Disconnect socket
      disconnectSocket();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Driver: Sign out successful');

        // Clear local state
        setIsAuthenticated(false);
        setBusInfo(null);
        setCurrentLocation(null);
        setLocationError(null);
        setSocketError(null);
        setLastUpdateTime(null);
        setUpdateCount(0);

        // Clean up map
        cleanupMap();
      }
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                🚌 Driver Login
              </h1>
              <p className="text-gray-600 mt-2">
                Sign in to start tracking your bus
              </p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Please contact your administrator for login credentials
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🚌 Driver Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome, {busInfo?.driver_name} | Bus: {busInfo?.bus_number} |
                Route: {busInfo?.route_name}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${socketError ? 'bg-red-500' : 'bg-green-500'}`}
              ></div>
              <div>
                <h3 className="font-semibold text-gray-900">Connection</h3>
                <p className="text-sm text-gray-600">
                  {socketError ? 'Disconnected' : 'Connected'}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
              <div>
                <h3 className="font-semibold text-gray-900">GPS Tracking</h3>
                <p className="text-sm text-gray-600">
                  {isTracking ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          {/* Update Count */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div>
              <h3 className="font-semibold text-gray-900">Updates Sent</h3>
              <p className="text-2xl font-bold text-blue-600">{updateCount}</p>
              {lastUpdateTime && (
                <p className="text-sm text-gray-600">Last: {lastUpdateTime}</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-3">
              {!isTracking ? (
                <>
                  <button
                    onClick={startLocationTracking}
                    disabled={!!socketError}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    🚀 Start Tracking
                  </button>

                  <button
                    onClick={() => {
                      // Force location permission request
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            console.log(
                              '✅ Manual location permission granted:',
                              position
                            );
                            setLocationError(null);
                            startLocationTracking();
                          },
                          (error) => {
                            console.error(
                              '❌ Manual location permission denied:',
                              error
                            );
                            setLocationError(
                              'Location permission denied. Please check your browser settings.'
                            );
                          },
                          {
                            enableHighAccuracy: true,
                            timeout: 30000,
                            maximumAge: 0,
                          }
                        );
                      }
                    }}
                    className="w-full mt-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    🔐 Request Location Permission
                  </button>
                  {locationError &&
                    locationError.includes('Permission denied') && (
                      <button
                        onClick={() => {
                          setLocationError(null);
                          startLocationTracking();
                        }}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-2"
                      >
                        🔄 Retry Location Permission
                      </button>
                    )}
                </>
              ) : (
                <button
                  onClick={stopLocationTracking}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  ⏹️ Stop Tracking
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🗺️ Live Location Map
            </h2>

            <div
              ref={mapContainerRef}
              className="w-full h-96 rounded-lg border border-gray-200"
              style={{ minHeight: '400px' }}
            />

            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p className="text-red-700 text-sm mb-3">{locationError}</p>

                {/* Enhanced mobile troubleshooting */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    📱 Mobile Location Troubleshooting:
                  </h4>

                  {/* Mobile-specific instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                    <h5 className="font-semibold text-blue-800 text-xs mb-1">
                      📱 For Mobile Devices:
                    </h5>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>
                        • <strong>Android Chrome:</strong> Settings → Apps →
                        Chrome → Permissions → Location → Allow
                      </li>
                      <li>
                        • <strong>Android Firefox:</strong> Settings → Apps →
                        Firefox → Permissions → Location → Allow
                      </li>
                      <li>
                        • <strong>iPhone Safari:</strong> Settings → Safari →
                        Location → Allow
                      </li>
                      <li>
                        • <strong>iPhone Chrome:</strong> Settings → Chrome →
                        Location → Allow
                      </li>
                      <li>
                        • <strong>Make sure:</strong> GPS/Location Services are
                        ON in phone settings
                      </li>
                      <li>
                        • <strong>Try:</strong> Going outdoors or near a window
                        for better GPS signal
                      </li>
                    </ul>
                  </div>

                  {/* Desktop instructions */}
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <h5 className="font-semibold text-green-800 text-xs mb-1">
                      💻 For Desktop Browsers:
                    </h5>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>
                        • <strong>Chrome:</strong> Click lock icon → Location →
                        Allow → Refresh
                      </li>
                      <li>
                        • <strong>Firefox:</strong> Click lock icon → Location →
                        Allow → Refresh
                      </li>
                      <li>
                        • <strong>Safari:</strong> Safari → Preferences →
                        Websites → Location → Allow
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                  >
                    🔄 Refresh Page & Retry
                  </button>

                  <button
                    onClick={() => {
                      // Test location without starting tracking
                      const isMobile =
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                          navigator.userAgent
                        );

                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const successMsg =
                              `✅ Location Test Successful!\n\n` +
                              `Latitude: ${position.coords.latitude}\n` +
                              `Longitude: ${position.coords.longitude}\n` +
                              `Accuracy: ${position.coords.accuracy}m\n` +
                              `Device: ${isMobile ? 'Mobile' : 'Desktop'}\n\n` +
                              `Location is working! You can now start tracking.`;
                            alert(successMsg);
                            setLocationError(null);
                          },
                          (error) => {
                            const errorMsg =
                              `❌ Location Test Failed\n\n` +
                              `Error Code: ${error.code}\n` +
                              `Error Message: ${error.message}\n` +
                              `Device: ${isMobile ? 'Mobile' : 'Desktop'}\n\n` +
                              `Please check your location permissions.`;
                            alert(errorMsg);
                          },
                          {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0,
                          }
                        );
                      } else {
                        alert('Geolocation is not supported by this browser.');
                      }
                    }}
                    className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 ml-2"
                  >
                    🧪 Test Location
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📍 Current Location Details
            </h2>

            {currentLocation ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-mono">
                    {currentLocation.coords.latitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-mono">
                    {currentLocation.coords.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span>{currentLocation.coords.accuracy?.toFixed(1)}m</span>
                </div>
                {currentLocation.coords.speed && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Speed:</span>
                    <span>
                      {(currentLocation.coords.speed * 3.6).toFixed(1)} km/h
                    </span>
                  </div>
                )}
                {currentLocation.coords.heading && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Heading:</span>
                    <span>{currentLocation.coords.heading.toFixed(1)}°</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="text-sm">
                    {new Date(currentLocation.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No location data available</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                ℹ️ Instructions
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Click "Start Tracking" to begin sending location updates
                </li>
                <li>• Your location will be sent every few seconds</li>
                <li>
                  • Students and admin can see your bus location in real-time
                </li>
                <li>• Make sure to allow location access when prompted</li>
                <li>
                  • The map shows your current position with a blue marker
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverInterface;
