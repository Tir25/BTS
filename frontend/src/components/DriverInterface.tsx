import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../config/supabase';

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

const DriverInterface: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Initialize Supabase auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await authenticateWithSocket(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setBusInfo(null);
          disconnectSocket();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const authenticateWithSocket = async (token: string) => {
    try {
      // Create socket connection
      const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
      socketRef.current = socket;

      // Handle socket events
      socket.on('connect', () => {
        console.log('🔌 Connected to WebSocket server');
        setSocketError(null);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket server');
        setSocketError('Disconnected from server');
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        setSocketError(error.message || 'Socket error occurred');
      });

      socket.on('driver:authenticated', (data: { driverId: string; busId: string; busInfo: BusInfo }) => {
        console.log('✅ Driver authenticated:', data);
        setIsAuthenticated(true);
        setBusInfo(data.busInfo);
        setSocketError(null);
      });

      socket.on('driver:locationConfirmed', (data) => {
        console.log('📍 Location confirmed:', data);
        setLastUpdateTime(new Date().toLocaleTimeString());
        setUpdateCount(prev => prev + 1);
      });

      // Authenticate with the server
      socket.emit('driver:authenticate', { token });

    } catch (error) {
      console.error('❌ Authentication error:', error);
      setSocketError('Failed to authenticate with server');
    }
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position);
        setLocationError(null);
        sendLocationUpdate(position);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setLocationError(`Location error: ${error.message}`);
      },
      options
    );

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation(position);
        setLocationError(null);
        sendLocationUpdate(position);
      },
      (error) => {
        console.error('❌ Geolocation watch error:', error);
        setLocationError(`Location error: ${error.message}`);
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
      heading: position.coords.heading || undefined
    };

    socketRef.current.emit('driver:locationUpdate', locationData);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
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
              <h1 className="text-2xl font-bold text-gray-900">🚌 Driver Login</h1>
              <p className="text-gray-600 mt-2">Sign in to start tracking your bus</p>
            </div>

            {socketError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">{socketError}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚌 Driver Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome, {busInfo?.driver_name} | Bus: {busInfo?.bus_number} | Route: {busInfo?.route_name}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${socketError ? 'bg-red-500' : 'bg-green-500'}`}></div>
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
              <div className={`w-3 h-3 rounded-full mr-3 ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
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
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📍 Current Location</h2>
            
            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">{locationError}</p>
              </div>
            )}

            {currentLocation ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-mono">{currentLocation.coords.latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-mono">{currentLocation.coords.longitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span>{currentLocation.coords.accuracy?.toFixed(1)}m</span>
                </div>
                {currentLocation.coords.speed && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Speed:</span>
                    <span>{(currentLocation.coords.speed * 3.6).toFixed(1)} km/h</span>
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
                  <span className="text-sm">{new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No location data available</p>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🎮 Controls</h2>
            
            <div className="space-y-4">
              {!isTracking ? (
                <button
                  onClick={startLocationTracking}
                  disabled={!!socketError}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  🚀 Start Tracking
                </button>
              ) : (
                <button
                  onClick={stopLocationTracking}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  ⏹️ Stop Tracking
                </button>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Click "Start Tracking" to begin sending location updates</li>
                  <li>• Your location will be sent every few seconds</li>
                  <li>• Students and admin can see your bus location in real-time</li>
                  <li>• Make sure to allow location access when prompted</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverInterface;
