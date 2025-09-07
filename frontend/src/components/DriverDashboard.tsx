import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { websocketService } from '../services/websocket';
import { authService } from '../services/authService';
import { environment } from '../config/environment';
import { dataValidator } from '../utils/dataValidation';
import { Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapErrorBoundary from './error/MapErrorBoundary';

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

const DriverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isTracking, setIsTracking] = useState(false);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [currentLocation, setCurrentLocation] =
    useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  // Removed unused isAuthenticated state
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');

  // Monitor busInfo changes for debugging (removed to prevent re-render loop)
  // useEffect(() => {
  //   console.log('🚌 BusInfo state changed:', busInfo);
  // }, [busInfo]);

  const socketRef = useRef<Socket | null>(null);
  // const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<Marker | null>(null);
  const initializationRef = useRef(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Store event listener references to properly remove them later
  const eventListenersRef = useRef<{
    webglcontextlost?: (event: Event) => void;
    webglcontextrestored?: () => void;
    error?: (e: ErrorEvent) => void;
    load?: () => void;
  }>({});

  // Initialize driver data and WebSocket connection when component mounts
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current || isInitialized) {
      console.log('🔄 Driver Dashboard: Already initialized, skipping...');
      return;
    }

    console.log('🚀 Driver Dashboard: Starting initialization...');

    // Check if this is a page refresh
    const isPageRefresh = performance.navigation?.type === 1 || 
                         (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
    
    if (isPageRefresh) {
      console.log('🔄 Page refresh detected, will attempt WebSocket reconnection...');
    }

    // Set initialization flags immediately to prevent multiple calls
    initializationRef.current = true;
    setIsInitialized(true);

    // Set up connection status monitoring
    const updateConnectionStatus = () => {
      if (websocketService.isConnected()) {
        setConnectionStatus('connected');
      } else if (
        websocketService.getConnectionState() === 'connecting' ||
        websocketService.getConnectionState() === 'reconnecting'
      ) {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    // Initial status check
    updateConnectionStatus();

    // Set up periodic status monitoring
    const statusInterval = setInterval(updateConnectionStatus, 2000);
    
    // Enhanced connection monitoring for page refresh scenarios
    const enhancedConnectionMonitor = () => {
      const connectionState = websocketService.getConnectionState();
      const isConnected = websocketService.isConnected();
      
      console.log(`🔍 Connection monitor: State=${connectionState}, Connected=${isConnected}`);
      
      if (!isConnected && connectionState !== 'connecting' && connectionState !== 'reconnecting') {
        console.log('🔄 Connection lost, attempting automatic reconnection...');
        websocketService.connectAs('driver').catch(error => {
          console.warn('⚠️ Automatic reconnection failed:', error);
        });
      } else if (connectionState === 'connecting') {
        // Check if we've been in connecting state for too long (30 seconds)
        // Track connection timeout
        setTimeout(() => {
          if (websocketService.getConnectionState() === 'connecting' && !websocketService.isConnected()) {
            console.log('⚠️ Connection stuck in connecting state, forcing fresh connection...');
            websocketService.forceFreshConnection().catch(error => {
              console.warn('⚠️ Force fresh connection failed:', error);
            });
          }
        }, 30000); // 30 seconds timeout
      }
    };
    
    // Monitor connection every 5 seconds
    const connectionMonitorInterval = setInterval(enhancedConnectionMonitor, 5000);

    const initializeDriverData = async () => {
      try {
        console.log(
          '🚀 Driver Dashboard: Component mounted, starting initialization...'
        );

        // Get current user session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log(
          '🔑 Session check:',
          session ? 'Found' : 'Not found',
          session?.user?.email
        );

        if (session?.user) {
          console.log('🔌 Driver Dashboard: Initializing...');

          // Check for existing bus info first (from DriverLogin)
          const existingAssignment = authService.getCurrentDriverAssignment();
          console.log(
            '🔍 Checking for existing assignment:',
            existingAssignment ? 'Found' : 'Not found'
          );

          if (existingAssignment) {
            console.log(
              '✅ Driver Dashboard: Using existing assignment from DriverLogin:',
              existingAssignment
            );
            setBusInfo({
              bus_id: existingAssignment.bus_id,
              bus_number: existingAssignment.bus_number,
              route_id: existingAssignment.route_id,
              route_name: existingAssignment.route_name,
              driver_id: existingAssignment.driver_id,
              driver_name: existingAssignment.driver_name,
            });
            // Authentication state managed by authService
            console.log(
              '✅ Bus info and authentication state set from existing assignment'
            );
          } else {
            // Validate driver session using auth service as fallback
            console.log(
              '🔍 No existing assignment, validating driver session...'
            );
            const { isValid, assignment } =
              await authService.validateDriverSession();
            console.log('🔍 Validation result:', {
              isValid,
              assignment: assignment ? 'Found' : 'Not found',
            });

            if (isValid && assignment) {
              console.log(
                '✅ Driver Dashboard: Valid session found with assignment:',
                assignment
              );
              setBusInfo({
                bus_id: assignment.bus_id,
                bus_number: assignment.bus_number,
                route_id: assignment.route_id,
                route_name: assignment.route_name,
                driver_id: assignment.driver_id,
                driver_name: assignment.driver_name,
              });
              // Authentication state managed by authService
              console.log(
                '✅ Bus info and authentication state set from validation'
              );
            } else {
              console.log(
                '❌ Driver Dashboard: Invalid session or no assignment found'
              );
              console.log('🔄 Attempting to fetch bus info from API as fallback...');
              
              // Try to fetch bus info from API as fallback
              const apiSuccess = await fetchBusInfoFromAPI(session.user.id);
              if (!apiSuccess) {
                console.log('❌ Driver Dashboard: All validation methods failed');
                return;
              }
            }
          }

          // Connect to WebSocket only if not already connected
          if (!websocketService.isConnected()) {
            console.log('🔌 Driver Dashboard: Connecting to WebSocket as driver...');
            try {
              await websocketService.connectAs('driver');
              console.log('✅ WebSocket connected successfully');
            } catch (error) {
              console.warn(
                '⚠️ WebSocket connection failed, will use API fallback:',
                error
              );
              // Try to connect again after a short delay
              setTimeout(async () => {
                if (!websocketService.isConnected()) {
                  console.log('🔄 Retrying WebSocket connection...');
                  try {
                    await websocketService.connectAs('driver');
                    console.log('✅ WebSocket reconnection successful');
                  } catch (retryError) {
                    console.warn('⚠️ WebSocket reconnection failed:', retryError);
                    
                    // For page refresh scenarios, try force reconnection
                    if (isPageRefresh) {
                      console.log('🔄 Page refresh detected, attempting force reconnection...');
                      try {
                        await websocketService.forceReconnect();
                        console.log('✅ Force reconnection successful');
                      } catch (forceError) {
                        console.warn('⚠️ Force reconnection failed:', forceError);
                      }
                    }
                  }
                }
              }, 2000);
            }
          } else {
            console.log('✅ WebSocket already connected');
          }

          // Set up WebSocket listeners
          websocketService.socket?.on('connect', () => {
            console.log('🔌 Driver Dashboard: Connected to WebSocket server');
            
            // Authenticate as driver after connection
            const currentSession = authService.getCurrentSession();
            if (currentSession?.access_token) {
              console.log('🔐 Driver Dashboard: Authenticating with WebSocket server...');
              websocketService.authenticateAsDriver(currentSession.access_token, {
                onSuccess: (data: any) => {
                  console.log('✅ Driver Dashboard: Authentication successful:', data);
                  if (data.busInfo) {
                    setBusInfo(data.busInfo);
                  }
                },
                onFailure: (error: any) => {
                  console.error('❌ Driver Dashboard: Authentication failed:', error);
                },
                onError: (error: any) => {
                  console.error('❌ Driver Dashboard: Authentication error:', error);
                }
              });
            } else {
              console.error('❌ Driver Dashboard: No access token available for authentication');
            }
          });

          websocketService.socket?.on('disconnect', () => {
            console.log(
              '🔌 Driver Dashboard: Disconnected from WebSocket server'
            );
          });

          websocketService.socket?.on('error', error => {
            console.error('❌ Driver Dashboard: Socket error:', error);
          });

          websocketService.socket?.on(
            'driver:authenticated',
            (data: { driverId: string; busId: string; busInfo: BusInfo }) => {
              console.log(
                '✅ Driver Dashboard: Authentication successful:',
                data
              );
              console.log('🚌 Bus Info received:', data.busInfo);
              setBusInfo(data.busInfo);
              // Authentication state managed by authService
            }
          );

          websocketService.socket?.on('driver:authentication_failed', error => {
            console.error('❌ Driver Dashboard: Authentication failed:', error);
          });

          websocketService.socket?.on('driver:locationConfirmed', () => {
            console.log('📍 Driver Dashboard: Location confirmed');
            setLastUpdateTime(new Date().toLocaleTimeString());
            setUpdateCount(prev => prev + 1);
          });

          // Store socket reference
          socketRef.current = websocketService.socket;

          // Emit driver:connected event to notify the server
          const currentAssignment = authService.getCurrentDriverAssignment();
          if (currentAssignment) {
            websocketService.socket?.emit('driver:connected', {
              driverId: currentAssignment.driver_id,
              busId: currentAssignment.bus_id,
              timestamp: new Date().toISOString(),
            });
          }

          // Enhanced fallback mechanism with retry logic (moved to separate effect)
          // This will be handled by a separate useEffect to prevent re-render loops
        } else {
          console.log(
            '❌ Driver Dashboard: No session found, redirecting to login'
          );
          // Redirect to login if no session
          navigate('/driver-login');
        }
      } catch (error) {
        console.error('❌ Driver Dashboard: Initialization error:', error);
        console.error('Failed to initialize driver data');
      }
    };

    initializeDriverData();

    // Cleanup function
    return () => {
      clearInterval(statusInterval);
      clearInterval(connectionMonitorInterval);

      // Clear fallback timer if it exists
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      // Don't reset initialization flag on cleanup to prevent re-initialization
      // initializationRef.current = false;

      // Clean up WebSocket listeners
      if (websocketService.socket) {
        websocketService.socket.off('connect');
        websocketService.socket.off('disconnect');
        websocketService.socket.off('error');
        websocketService.socket.off('driver:authenticated');
        websocketService.socket.off('driver:authentication_failed');
        websocketService.socket.off('driver:locationConfirmed');
      }

      console.log('🧹 Driver Dashboard: Cleanup completed');
    };
  }, [navigate]); // Removed busInfo and isAuthenticated to prevent infinite loop

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current) return;

    const latitude = 23.0225;
    const longitude = 72.5714;

    // Clean up existing map if it exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      // Create map with optimized settings to prevent WebGL context loss
      mapRef.current = new Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        },
        center: [longitude, latitude],
        zoom: 15,
        attributionControl: false,
        preserveDrawingBuffer: true, // Prevent WebGL context loss
        antialias: true,
        failIfMajorPerformanceCaveat: false, // Allow fallback rendering
        maxPitch: 60, // Limit pitch to improve performance
        localIdeographFontFamily: 'sans-serif', // Improve font rendering
        renderWorldCopies: true, // Improve performance at world edges
      });

      // Handle WebGL context loss
      const handleContextLost = (event: Event) => {
        console.warn('⚠️ WebGL context lost, attempting to restore...');
        // Prevent the default behavior which halts all rendering
        if (event instanceof WebGLContextEvent) {
          event.preventDefault();
        }

        // Attempt to restore the context after a short delay
        setTimeout(() => {
          try {
            if (mapRef.current) {
              mapRef.current.resize();
              console.log('✅ Attempted map context restoration');
            }
          } catch (error) {
            console.error('❌ Failed to restore map context:', error);
          }
        }, 1000);
      };

      // Store the listener reference
      eventListenersRef.current.webglcontextlost = handleContextLost;
      mapRef.current.on('webglcontextlost', handleContextLost);

      const handleContextRestored = () => {
        console.log('✅ WebGL context restored');
        // Redraw the map and marker
        if (mapRef.current && markerRef.current) {
          mapRef.current.resize();
          const currentLngLat = markerRef.current.getLngLat();
          markerRef.current.setLngLat(currentLngLat);
        }
      };

      // Store the listener reference
      eventListenersRef.current.webglcontextrestored = handleContextRestored;
      mapRef.current.on('webglcontextrestored', handleContextRestored);

      // Create marker
      const markerElement = document.createElement('div');
      markerElement.className = 'driver-marker';
      markerElement.innerHTML = `
        <div class="driver-marker-content">
          <div style="font-size: 16px;">🚌</div>
        </div>
      `;

      markerRef.current = new Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);

      // Add error handling for tile loading
      const handleMapError = (e: ErrorEvent) => {
        console.error('❌ Map error:', e);
      };

      // Store the listener reference
      eventListenersRef.current.error = handleMapError;
      mapRef.current.on('error', handleMapError);

      // Optimize performance
      const handleMapLoad = () => {
        console.log('✅ Map loaded successfully');
      };

      // Store the listener reference
      eventListenersRef.current.load = handleMapLoad;
      mapRef.current.on('load', handleMapLoad);
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      // Fallback to a simpler map initialization if the first attempt fails
      try {
        console.log('🔄 Attempting fallback map initialization...');
        if (mapContainerRef.current && !mapRef.current) {
          mapRef.current = new Map({
            container: mapContainerRef.current,
            style: {
              version: 8,
              sources: {
                osm: {
                  type: 'raster',
                  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                  tileSize: 256,
                },
              },
              layers: [
                {
                  id: 'osm-tiles',
                  type: 'raster',
                  source: 'osm',
                  minzoom: 0,
                  maxzoom: 22,
                },
              ],
            },
            center: [longitude, latitude],
            zoom: 15,
            attributionControl: false,
            preserveDrawingBuffer: true,
          });

          // Create simple marker
          const markerElement = document.createElement('div');
          markerElement.className = 'driver-marker';
          markerElement.innerHTML = `<div>🚌</div>`;

          markerRef.current = new Marker({
            element: markerElement,
          })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);

          console.log('✅ Fallback map initialization successful');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback map initialization failed:', fallbackError);
      }
    }
  }, []);

  const updateMapLocation = (latitude: number, longitude: number) => {
    if (!mapRef.current || !markerRef.current) return;

    const newLocation = [longitude, latitude] as [number, number];
    markerRef.current.setLngLat(newLocation);

    mapRef.current.flyTo({
      center: newLocation,
      duration: 1000,
    });
  };

  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const options = {
      enableHighAccuracy: true,
      timeout: isMobile ? 30000 : 60000,
      maximumAge: 0,
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        position => {
          setCurrentLocation(position);
          setLocationError(null);

          if (mapRef.current && markerRef.current) {
            updateMapLocation(
              position.coords.latitude,
              position.coords.longitude
            );
          }

          if (websocketService.socket && websocketService.isConnected()) {
            const rawLocationData = {
              driverId: busInfo?.driver_id || '',
              busId: busInfo?.bus_id || '',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date().toISOString(),
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
            };

            // Validate location data before sending
            const validationResult = dataValidator.validateLocationData(rawLocationData);
            
            if (validationResult.success && validationResult.data) {
              const validatedLocationData: LocationData = {
                driverId: validationResult.data.driverId,
                busId: validationResult.data.busId,
                latitude: validationResult.data.latitude,
                longitude: validationResult.data.longitude,
                timestamp: validationResult.data.timestamp,
                speed: validationResult.data.speed,
                heading: validationResult.data.heading,
              };

              websocketService.socket.emit('driver:locationUpdate', validatedLocationData);
              setLastUpdateTime(new Date().toLocaleTimeString());
              setUpdateCount(prev => prev + 1);

              // Log if data was sanitized
              if (validationResult.sanitized) {
                console.log('✅ Driver location data was sanitized before sending');
              }
            } else {
              console.error('❌ Driver location validation failed:', validationResult.errors);
              setLocationError(`Location validation failed: ${validationResult.errors?.join(', ')}`);
            }
          }
        },
        error => {
          console.error('❌ Location error:', error);
          let errorMessage = '';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
            default:
              errorMessage = 'An unknown error occurred.';
          }

          setLocationError(errorMessage);
          setIsTracking(false);
        },
        options
      );

      setIsTracking(true);
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      setLocationError('Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const cleanupMap = useCallback(() => {
    try {
      // Properly remove all event listeners before removing the map
      if (mapRef.current) {
        // Remove all event listeners using the stored references
        if (eventListenersRef.current.webglcontextlost) {
          mapRef.current.off(
            'webglcontextlost',
            eventListenersRef.current.webglcontextlost
          );
        }
        if (eventListenersRef.current.webglcontextrestored) {
          mapRef.current.off(
            'webglcontextrestored',
            eventListenersRef.current.webglcontextrestored
          );
        }
        if (eventListenersRef.current.error) {
          mapRef.current.off('error', eventListenersRef.current.error);
        }
        if (eventListenersRef.current.load) {
          mapRef.current.off('load', eventListenersRef.current.load);
        }

        // Clear the event listeners
        eventListenersRef.current = {};

        // Remove the map
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Clear marker reference
      markerRef.current = null;

      console.log('🗺️ Map cleanup completed');
    } catch (error) {
      console.error('❌ Error during map cleanup:', error);
    }
  }, []);

  // Initialize map when component mounts
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      console.log('🗺️ Initializing map...');
      initializeMap();
    }

    return () => {
      console.log('🗺️ Cleaning up map...');
      cleanupMap();
    };
  }, []); // Empty dependency array since initializeMap and cleanupMap are stable

  const fetchBusInfoFromAPI = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔄 Fetching bus info for user:', userId);

      // Get current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error('❌ No access token available for API call');
        return false;
      }

      // Make API call to get driver bus info - use the correct endpoint without /api prefix
      const response = await fetch(
        `${environment.api.url}/buses?driver_id=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          // Add timeout handling
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Bus info from API:', data);

        // Handle the response format from the buses endpoint
        if (
          data.success &&
          data.data &&
          Array.isArray(data.data) &&
          data.data.length > 0
        ) {
          const busData = data.data[0]; // Get the first bus assigned to this driver
          setBusInfo({
            bus_id: busData.bus_id || busData.id,
            bus_number:
              busData.bus_number || busData.number_plate || busData.code,
            route_id: busData.route_id || '',
            route_name: busData.route_name || 'Route TBD',
            driver_id: busData.driver_id || busData.assigned_driver_id,
            driver_name:
              busData.driver_name || busData.driver_full_name || 'Driver TBD',
          });
          // Authentication state managed by authService
          return true;
        } else if (data.data?.busInfo) {
          setBusInfo(data.data.busInfo);
          // Authentication state managed by authService
          return true;
        } else if (data.busInfo) {
          setBusInfo(data.busInfo);
          // Authentication state managed by authService
          return true;
        } else {
          console.error('❌ No bus info in response:', data);
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error(
          '❌ Failed to fetch bus info from API:',
          response.status,
          errorText
        );
        console.error(`API Error: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error fetching bus info from API:', error);
      return false;
    }
  };

  const disconnectSocket = () => {
    websocketService.disconnect();
    socketRef.current = null;
  };

  const handleSignOut = async () => {
    try {
      stopLocationTracking();
      disconnectSocket();
      cleanupMap();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  return (
    <MapErrorBoundary
      mapType="driver"
      onMapError={(error, errorInfo) => {
        console.error('Driver dashboard map error:', error, errorInfo);
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 driver-dashboard-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="card-glass p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                🚌 Driver Dashboard
              </h1>
              <div className="space-y-1">
                <p className="text-white/80 text-sm sm:text-base">
                  Welcome,{' '}
                  <span className="font-semibold text-white">
                    {busInfo?.driver_name}
                  </span>
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="text-blue-300">
                    🚌 Bus:{' '}
                    <span className="font-semibold text-white">
                      {busInfo?.bus_number}
                    </span>
                  </span>
                  <span className="text-green-300">
                    🛣️ Route:{' '}
                    <span className="font-semibold text-white">
                      {busInfo?.route_name}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  if (session?.user?.id) {
                    console.log('🔄 Manual refresh: Fetching bus info...');
                    fetchBusInfoFromAPI(session.user.id);
                  }
                }}
                className="btn-primary w-full sm:w-auto"
              >
                🔄 Refresh
              </button>
              
              {/* Debug connection button */}
              <button
                onClick={async () => {
                  console.log('🔧 Manual connection attempt...');
                  try {
                    await websocketService.forceFreshConnection();
                  } catch (error) {
                    console.error('❌ Manual connection failed:', error);
                  }
                }}
                className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors duration-200 text-sm"
                title="Force WebSocket reconnection (Debug)"
              >
                🔧 Reconnect
              </button>
              
              <button
                onClick={handleSignOut}
                className="btn-secondary w-full sm:w-auto"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Connection Status */}
          <div className="card-glass p-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
              ></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">Connection</h3>
                <p className="text-xs text-white/70 truncate">
                  {connectionStatus === 'connected'
                    ? 'Connected'
                    : connectionStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected'}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Status */}
          <div className="card-glass p-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">
                  GPS Tracking
                </h3>
                <p className="text-xs text-white/70 truncate">
                  {isTracking ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          {/* Update Count */}
          <div className="card-glass p-4">
            <div>
              <h3 className="font-semibold text-white text-sm">Updates Sent</h3>
              <p className="text-xl font-bold text-blue-300">{updateCount}</p>
              {lastUpdateTime && (
                <p className="text-xs text-white/70 truncate">
                  Last: {lastUpdateTime}
                </p>
              )}
            </div>
          </div>

          {/* Location Status */}
          <div className="card-glass p-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${locationError ? 'bg-red-500' : currentLocation ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">Location</h3>
                <p className="text-xs text-white/70 truncate">
                  {locationError
                    ? 'Error'
                    : currentLocation
                      ? 'Available'
                      : 'Waiting'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Controls */}
        <div className="card-glass p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            📍 Location Tracking Controls
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {!isTracking ? (
              <>
                <button
                  onClick={startLocationTracking}
                  className="btn-primary flex-1 py-3 px-6 text-lg font-semibold"
                >
                  🚀 Start Tracking
                </button>

                {locationError && (
                  <button
                    onClick={() => {
                      setLocationError(null);
                      startLocationTracking();
                    }}
                    className="btn-secondary w-full py-2 px-4 text-sm"
                  >
                    🔄 Retry Location Permission
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={stopLocationTracking}
                className="btn-primary bg-red-600 hover:bg-red-700 w-full py-3 px-6 text-lg font-semibold"
              >
                ⏹️ Stop Tracking
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="card-glass p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              🗺️ Live Location Map
            </h2>
            <div
              ref={mapContainerRef}
              className="w-full h-64 sm:h-80 lg:h-96 rounded-lg border border-white/20 bg-white/5 driver-map-container"
              style={{ minHeight: '300px' }}
            />

            {locationError && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 mt-4">
                <p className="text-red-200 text-sm mb-3">{locationError}</p>

                {/* Enhanced mobile troubleshooting */}
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
                  <h4 className="font-semibold text-yellow-200 mb-2">
                    📱 Mobile Location Troubleshooting:
                  </h4>

                  {/* Mobile-specific instructions */}
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded p-2 mb-2">
                    <h5 className="font-semibold text-blue-200 text-xs mb-1">
                      📱 For Mobile Devices:
                    </h5>
                    <ul className="text-xs text-blue-100 space-y-1">
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
                  <div className="bg-green-500/20 border border-green-400/30 rounded p-2">
                    <h5 className="font-semibold text-green-200 text-xs mb-1">
                      💻 For Desktop Browsers:
                    </h5>
                    <ul className="text-xs text-green-100 space-y-1">
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
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="btn-secondary text-xs px-3 py-1"
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
                            position => {
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
                            error => {
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
                          alert(
                            'Geolocation is not supported by this browser.'
                          );
                        }
                      }}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      🧪 Test Location
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location Info */}
          <div className="card-glass p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              📍 Current Location Details
            </h2>
            {currentLocation ? (
              <div className="space-y-4 bg-white/10 rounded-lg p-4 border border-white/20">
                {/* Live indicator */}
                <div className="flex items-center justify-center mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm text-green-300 font-medium">
                    📍 Live Location Data
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Latitude:</span>
                    <span className="font-mono text-white font-semibold text-sm">
                      {currentLocation.coords.latitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Longitude:</span>
                    <span className="font-mono text-white font-semibold text-sm">
                      {currentLocation.coords.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Accuracy:</span>
                    <span className="text-white font-semibold text-sm">
                      {currentLocation.coords.accuracy?.toFixed(1)}m
                    </span>
                  </div>
                  {currentLocation.coords.speed && (
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">Speed:</span>
                      <span className="text-white font-semibold text-sm">
                        {(currentLocation.coords.speed * 3.6).toFixed(1)} km/h
                      </span>
                    </div>
                  )}
                  {currentLocation.coords.heading && (
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">Heading:</span>
                      <span className="text-white font-semibold text-sm">
                        {currentLocation.coords.heading.toFixed(1)}°
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Updates Sent:</span>
                    <span className="font-bold text-blue-300 text-sm">
                      {updateCount}
                    </span>
                  </div>
                  {lastUpdateTime && (
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">
                        Last Update:
                      </span>
                      <span className="text-white font-medium text-sm">
                        {lastUpdateTime}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Timestamp:</span>
                    <span className="text-white font-medium text-sm">
                      {new Date(currentLocation.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4 text-center">
                <div className="text-yellow-300 mb-2 text-2xl">📍</div>
                <p className="text-yellow-200 font-medium">
                  No location data available
                </p>
                <p className="text-yellow-100 text-sm mt-1">
                  Click "Start Tracking" to begin location sharing
                </p>
              </div>
            )}

            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-200 mb-2">
                ℹ️ Instructions
              </h3>
              <ul className="text-sm text-blue-100 space-y-1">
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
    </MapErrorBoundary>
  );
};

export default DriverDashboard;
