/**
 * Main driver tracking hook that coordinates location tracking, WebSocket sync, GPS accuracy, and error handling
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { locationService, LocationData, LocationError } from '../services/LocationService';
import { useGPSAccuracy } from './driverTracking/useGPSAccuracy';
import { useTrackingErrors } from './driverTracking/useTrackingErrors';
import { useWebSocketLocationSync } from './driverTracking/useWebSocketLocationSync';
import { detectDeviceType, getPermissionErrorMessage } from './driverTracking/utils/permissionHelpers';

export interface TrackingState {
  isTracking: boolean;
  isAuthenticated: boolean;
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  lastLocation: LocationData | null;
  lastUpdateTime: number | null;
  updateCount: number;
  locationError: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  accuracy?: number;
  accuracyLevel?: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  accuracyMessage?: string;
  accuracyWarning?: boolean;
  deviceInfo?: ReturnType<typeof import('../utils/gpsDetection').detectGPSDeviceInfo>;
}

export interface TrackingActions {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  clearError: () => void;
  requestPermission: () => Promise<boolean>;
  setManualLocation?: (latitude: number, longitude: number, accuracy?: number) => boolean;
}

/**
 * Main hook for driver location tracking
 * Coordinates GPS accuracy, error handling, and WebSocket sync
 */
export function useDriverTracking(
  isAuthenticated: boolean,
  isWebSocketConnected: boolean,
  isWebSocketAuthenticated: boolean,
  driverId?: string,
  busId?: string
): TrackingState & TrackingActions {
  // Core tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>('disconnected');

  // Refs for tracking state
  const locationListenerRef = useRef<((location: LocationData) => void) | null>(null);
  const errorListenerRef = useRef<((error: LocationError) => void) | null>(null);
  const trackingStartTimeRef = useRef<number>(0);
  const isMobileDeviceRef = useRef<boolean>(false);

  // GPS accuracy hook
  const gpsAccuracy = useGPSAccuracy();

  // Tracking errors hook
  const trackingErrors = useTrackingErrors({
    isTracking,
    onRetry: () => {
      // Location service will continue trying automatically
      logger.info('Retrying location after recoverable error', 'useDriverTracking');
    },
  });

  // Update connection status
  useEffect(() => {
    if (isWebSocketConnected && isWebSocketAuthenticated) {
      setConnectionStatus('connected');
    } else if (isWebSocketConnected && !isWebSocketAuthenticated) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isWebSocketConnected, isWebSocketAuthenticated]);

  // WebSocket location sync hook
  useWebSocketLocationSync({
    isTracking,
    isWebSocketConnected,
    isWebSocketAuthenticated,
    driverId,
    busId,
    lastLocation,
    onLocationUpdate: (location) => {
      // Location update callback - GPS accuracy is already updated in location listener
      logger.debug('Location update processed', 'useDriverTracking', {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    },
  });

  // Setup location listeners
  useEffect(() => {
    // Location update listener
    const locationListener = (location: LocationData) => {
      setLastLocation(location);
      setLastUpdateTime(Date.now());
      setUpdateCount(prev => prev + 1);
      
      // Update GPS accuracy
      if (location.accuracy !== undefined) {
        gpsAccuracy.updateAccuracy(location.accuracy);
      }
      
      // Auto-clear error on successful location update
      // Clear error and reset retry on successful location
      trackingErrors.clearError();
      trackingErrors.resetRetry();
      
      logger.info('✅ Location update received', 'useDriverTracking', {
        newLocation: { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy }
      });
      
      // Clear tracking start time on successful location
      if (trackingStartTimeRef.current > 0) {
        const timeToFirstLocation = Date.now() - trackingStartTimeRef.current;
        logger.info('GPS acquired signal successfully', 'useDriverTracking', {
          timeToFirstLocation: `${Math.round(timeToFirstLocation / 1000)  }s`,
          isMobile: isMobileDeviceRef.current
        });
      }
    };

    // Error listener
    const errorListener = (error: LocationError) => {
      trackingErrors.handleError(error, trackingStartTimeRef.current, isMobileDeviceRef.current);
    };

    // Store references for cleanup
    locationListenerRef.current = locationListener;
    errorListenerRef.current = errorListener;

    // Add listeners
    locationService.addLocationListener(locationListener);
    locationService.addErrorListener(errorListener);

    // Cleanup function
    return () => {
      if (locationListenerRef.current) {
        locationService.removeLocationListener(locationListenerRef.current);
      }
      if (errorListenerRef.current) {
        locationService.removeErrorListener(errorListenerRef.current);
      }
    };
  }, [isTracking, gpsAccuracy, trackingErrors]);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!isAuthenticated) {
      trackingErrors.handleError(
        { message: 'Not authenticated. Please log in first.', code: GeolocationPositionError.PERMISSION_DENIED } as LocationError,
        0,
        false
      );
      logger.warn('Cannot start tracking: not authenticated', 'useDriverTracking');
      return;
    }

    // Don't block tracking start if WebSocket is connecting
    if (!isWebSocketConnected && !isWebSocketAuthenticated) {
      logger.warn('⚠️ WebSocket not fully connected, but starting tracking anyway (updates will queue)', 'useDriverTracking', {
        isWebSocketConnected,
        isWebSocketAuthenticated
      });
    }

    try {
      logger.info('🚀 Starting location tracking process', 'useDriverTracking', {
        isAuthenticated,
        isWebSocketConnected,
        isWebSocketAuthenticated,
        hasDriverId: !!driverId,
        hasBusId: !!busId
      });
      
      // Check permission first
      logger.info('📍 Requesting location permission...', 'useDriverTracking');
      const hasPermission = await locationService.requestPermission();
      if (!hasPermission) {
        const deviceInfo = detectDeviceType();
        const errorMsg = getPermissionErrorMessage(deviceInfo, false);
        trackingErrors.handleError(
          { message: errorMsg, code: GeolocationPositionError.PERMISSION_DENIED } as LocationError,
          0,
          deviceInfo.isMobile
        );
        logger.warn('⚠️ Location permission denied - user needs to enable location access', 'useDriverTracking', {
          deviceInfo
        });
        return;
      }

      logger.info('✅ Location permission granted, starting GPS tracking...', 'useDriverTracking');

      // Track when tracking starts and detect mobile device for grace period
      trackingStartTimeRef.current = Date.now();
      const deviceInfo = detectDeviceType();
      isMobileDeviceRef.current = deviceInfo.isMobile;
      
      logger.info('Starting GPS tracking with grace period', 'useDriverTracking', {
        isMobile: deviceInfo.isMobile,
        gracePeriodMs: 30000,
        note: deviceInfo.isMobile ? 'GPS may take 20-45 seconds to acquire signal - errors will be suppressed during grace period' : 'Desktop device - no grace period needed'
      });

      // Start tracking even if WebSocket isn't connected
      const success = await locationService.startTracking();
      if (success) {
        setIsTracking(true);
        trackingErrors.clearError();
        gpsAccuracy.resetAccuracy();
        
        logger.info('✅ Location tracking started successfully', 'useDriverTracking', {
          driverId,
          busId,
          webSocketReady: isWebSocketConnected && isWebSocketAuthenticated
        });
        
        // If WebSocket isn't ready, show a warning but don't block
        if (!isWebSocketConnected || !isWebSocketAuthenticated) {
          logger.warn('⚠️ Tracking started but WebSocket not ready - updates will queue', 'useDriverTracking');
        }
      } else {
        const errorMsg = 'Failed to start location tracking. Please try again.';
        trackingErrors.handleError(
          { message: errorMsg, code: GeolocationPositionError.POSITION_UNAVAILABLE } as LocationError,
          trackingStartTimeRef.current,
          deviceInfo.isMobile
        );
        logger.error('❌ Failed to start location tracking', 'useDriverTracking');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const fullErrorMsg = `Failed to start tracking: ${errorMessage}`;
      const deviceInfo = detectDeviceType();
      trackingErrors.handleError(
        { message: fullErrorMsg, code: GeolocationPositionError.POSITION_UNAVAILABLE } as LocationError,
        trackingStartTimeRef.current,
        deviceInfo.isMobile
      );
      logger.error('❌ Error starting location tracking', 'useDriverTracking', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, [isAuthenticated, isWebSocketConnected, isWebSocketAuthenticated, driverId, busId, trackingErrors, gpsAccuracy]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    logger.info('Stopping location tracking', 'useDriverTracking');
    locationService.stopTracking();
    setIsTracking(false);
    trackingErrors.clearError();
    trackingErrors.resetRetry();
    gpsAccuracy.resetAccuracy();
    
    // Reset tracking start time
    trackingStartTimeRef.current = 0;
    
    logger.info('Location tracking stopped', 'useDriverTracking');
  }, [trackingErrors, gpsAccuracy]);

  // Clear error
  const clearError = useCallback(() => {
    trackingErrors.clearError();
  }, [trackingErrors]);

  // Request permission manually
  const requestPermission = useCallback(async () => {
    try {
      logger.info('📍 Manually requesting location permission...', 'useDriverTracking');
      
      // Reset permission cache to allow retry even if previously denied
      const { permissionManager } = await import('../services/location/permissionManager');
      permissionManager.resetPermissionCache();
      
      const hasPermission = await locationService.requestPermission();
      if (hasPermission) {
        trackingErrors.clearError();
        logger.info('✅ Location permission granted after manual request', 'useDriverTracking');
        // If permission is now granted and tracking is not active, suggest starting tracking
        if (!isTracking) {
          logger.info('Permission granted - user can now start tracking', 'useDriverTracking');
        }
        return true;
      } else {
        // Permission still denied
        const deviceInfo = detectDeviceType();
        const errorMsg = getPermissionErrorMessage(deviceInfo, true);
        trackingErrors.handleError(
          { message: errorMsg, code: GeolocationPositionError.PERMISSION_DENIED } as LocationError,
          0,
          deviceInfo.isMobile
        );
        logger.warn('⚠️ Location permission still denied after manual request', 'useDriverTracking', {
          deviceInfo
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const deviceInfo = detectDeviceType();
      trackingErrors.handleError(
        { message: `Failed to request permission: ${errorMessage}`, code: GeolocationPositionError.POSITION_UNAVAILABLE } as LocationError,
        0,
        deviceInfo.isMobile
      );
      logger.error('❌ Error requesting permission', 'useDriverTracking', { 
        error: errorMessage 
      });
      return false;
    }
  }, [isTracking, trackingErrors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        locationService.stopTracking();
      }
    };
  }, [isTracking]);

  // Manual location override (reserved for future use)
  const setManualLocation = useCallback((latitude: number, longitude: number, accuracy?: number): boolean => {
    logger.warn('Manual location override not yet implemented', 'useDriverTracking', {
      latitude,
      longitude,
      accuracy,
    });
    return false;
  }, []);

  return {
    // State
    isTracking,
    isAuthenticated,
    isWebSocketConnected,
    isWebSocketAuthenticated,
    lastLocation,
    lastUpdateTime,
    updateCount,
    locationError: trackingErrors.locationError,
    connectionStatus,
    // GPS accuracy information
    accuracy: gpsAccuracy.accuracy,
    accuracyLevel: gpsAccuracy.accuracyLevel,
    accuracyMessage: gpsAccuracy.accuracyMessage,
    accuracyWarning: gpsAccuracy.accuracyWarning,
    deviceInfo: gpsAccuracy.deviceInfo,
    
    // Actions
    startTracking,
    stopTracking,
    clearError,
    requestPermission,
    setManualLocation,
  };
}
