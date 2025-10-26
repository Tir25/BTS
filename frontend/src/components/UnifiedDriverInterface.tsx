import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { authService } from '../services/authService';
import { useEnhancedLocationTracking } from '../hooks/useEnhancedLocationTracking';
import { unifiedWebSocketService } from '../services/UnifiedWebSocketService';
import DriverHeader from './driver/DriverHeader';
import StudentMap from './StudentMap';
import DriverControls from './driver/DriverControls';
import DriverInstructions from './driver/DriverInstructions';
import DriverLogin from './DriverLogin';
import { logger } from '../utils/logger';

import './DriverInterface.css';
import './DriverDashboard.css';

interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
}

interface UnifiedDriverInterfaceProps {
  mode?: 'login' | 'dashboard';
}

const UnifiedDriverInterface: React.FC<UnifiedDriverInterfaceProps> = ({ 
  mode = 'login' 
}) => {
  const navigate = useNavigate();
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializationRef = useRef(false);

  // Enhanced hooks
  const {
    isTracking,
    currentLocation,
    locationError,
    lastUpdateTime,
    updateCount,
    accuracy,
    speed,
    heading,
    startTracking,
    stopTracking,
    clearError,
    requestPermission,
  } = useEnhancedLocationTracking({
    enableHighAccuracy: true,
    timeout: 30000,
    mobileOptimized: true,
  });

  // WebSocket state management
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [wsAuthenticated, setWsAuthenticated] = useState(false);

  // Initialize driver data
  useEffect(() => {
    if (initializationRef.current) return;

    logger.info('🚀 Unified Driver Interface: Starting initialization...', 'component');
    initializationRef.current = true;
    setIsLoading(true);

    const initializeDriverData = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          logger.debug('Debug info', 'component', { data: `🔑 Session found: ${session.user.email}` });

          // Check for existing bus assignment
          const existingAssignment = authService.getCurrentDriverAssignment();
          
          if (existingAssignment) {
            logger.debug('Debug info', 'component', { data: '✅ Using existing assignment:', existingAssignment });
            setBusInfo({
              bus_id: existingAssignment.bus_id,
              bus_number: existingAssignment.bus_number,
              route_id: existingAssignment.route_id,
              route_name: existingAssignment.route_name,
              driver_id: existingAssignment.driver_id,
              driver_name: existingAssignment.driver_name,
            });
            setIsAuthenticated(true);
          } else {
            // Validate driver session
            const { isValid, assignment } = await authService.validateDriverSession();
            
            if (isValid && assignment) {
              logger.debug('Debug info', 'component', { data: '✅ Valid session with assignment:', assignment });
              setBusInfo({
                bus_id: assignment.bus_id,
                bus_number: assignment.bus_number,
                route_id: assignment.route_id,
                route_name: assignment.route_name,
                driver_id: assignment.driver_id,
                driver_name: assignment.driver_name,
              });
              setIsAuthenticated(true);
            } else {
              logger.info('❌ Invalid session or no assignment', 'component');
              setError('No bus assignment found. Please contact your administrator.');
            }
          }

          // Connect to WebSocket
          unifiedWebSocketService.setClientType('driver');
          await unifiedWebSocketService.connect();
          setConnectionStatus('connected');

          // Authenticate with WebSocket
          const authSuccess = await unifiedWebSocketService.authenticateAsDriver(session.access_token);
          if (authSuccess) {
            setWsAuthenticated(true);
          } else {
            setError('Failed to authenticate with server');
          }
        } else {
          logger.info('❌ No session found', 'component');
          if (mode === 'dashboard') {
            navigate('/driver-login');
          }
        }
      } catch (err) {
        logger.error('Error occurred', 'component', { error: '❌ Initialization error:', err });
        setError('Failed to initialize driver interface');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDriverData();
  }, [mode, navigate]);

  // Handle location updates
  useEffect(() => {
    if (isTracking && currentLocation && busInfo && wsAuthenticated) {
      const locationData = {
        driverId: busInfo.driver_id,
        busId: busInfo.bus_id,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date().toISOString(),
        speed: currentLocation.coords.speed || undefined,
        heading: currentLocation.coords.heading || undefined,
      };

      unifiedWebSocketService.sendLocationUpdate(locationData);
    }
  }, [isTracking, currentLocation, busInfo, wsAuthenticated]);

  // Handle tracking controls
  const handleStartTracking = async () => {
    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return;
      }

      startTracking();
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }
  };

  const handleStopTracking = () => {
    stopTracking();
  };

  const handleSignOut = async () => {
    try {
      stopTracking();
      unifiedWebSocketService.disconnect();
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setBusInfo(null);
      navigate('/driver-login');
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }
  };

  const handleRetryConnection = async () => {
    try {
      unifiedWebSocketService.resetState();
      await unifiedWebSocketService.connect();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await unifiedWebSocketService.authenticateAsDriver(session.access_token);
      }
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }
  };

  // Show login if not authenticated
  if (mode === 'login' || (!isAuthenticated && !isLoading)) {
    return <DriverLogin />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-white">Loading driver interface...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="card-glass p-8">
            <h3 className="text-lg font-medium text-red-300 mb-2">
              Error Loading Interface
            </h3>
            <p className="text-red-200 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Retry
              </button>
              <button
                onClick={handleSignOut}
                className="btn-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 driver-dashboard-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <DriverHeader
          busInfo={busInfo}
          connectionStatus={connectionStatus}
          onSignOut={handleSignOut}
          onRetryConnection={handleRetryConnection}
          reconnectAttempts={0}
          lastHeartbeat={Date.now()}
        />

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
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">Connection</h3>
                <p className="text-xs text-white/70 truncate">
                  {connectionStatus === 'connected' ? 'Connected' :
                   connectionStatus === 'connecting' ? 'Connecting...' :
                   'Disconnected'}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Status */}
          <div className="card-glass p-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">GPS Tracking</h3>
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
                className={`w-3 h-3 rounded-full mr-3 ${
                  locationError ? 'bg-red-500' : 
                  currentLocation ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">Location</h3>
                <p className="text-xs text-white/70 truncate">
                  {locationError ? 'Error' :
                   currentLocation ? 'Available' : 'Waiting'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="space-y-6">
            <StudentMap
              config={{
                enableRealTime: true,
                enableClustering: true,
                enableOfflineMode: true,
                enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
                maxBuses: 50,
                updateInterval: 1000,
                enableAccessibility: true,
                enableInternationalization: false,
              }}
            />
          </div>

          {/* Controls Section */}
          <div className="space-y-6">
            <DriverControls
              isTracking={isTracking}
              isAuthenticated={isAuthenticated}
              connectionStatus={connectionStatus}
              onStartTracking={handleStartTracking}
              onStopTracking={handleStopTracking}
              lastUpdateTime={lastUpdateTime}
              updateCount={updateCount}
              locationError={locationError}
              onClearError={clearError}
              onRequestPermission={requestPermission}
            />

            <DriverInstructions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDriverInterface;
