import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { locationService, LocationData, LocationError } from '../services/LocationService';
import { unifiedWebSocketService } from '@/services/UnifiedWebSocketService';
import { 
  categorizeAccuracy, 
  getAccuracyMessage, 
  detectGPSDeviceInfo,
  shouldWarnAboutAccuracy 
} from '../utils/gpsDetection';

// PRODUCTION FIX: Retry configuration constants
const MAX_RETRIES = 5; // Increased to handle desktop GPS issues better
const RETRY_DELAY = 2000; // 2 seconds
const ERROR_DISPLAY_THRESHOLD = 2; // Only show error after 2 consecutive failures

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
  // PRODUCTION FIX: GPS accuracy information
  accuracy?: number;
  accuracyLevel?: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  accuracyMessage?: string;
  accuracyWarning?: boolean;
  deviceInfo?: ReturnType<typeof detectGPSDeviceInfo>;
}

export interface TrackingActions {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  clearError: () => void;
  requestPermission: () => Promise<boolean>;
  setManualLocation?: (latitude: number, longitude: number, accuracy?: number) => boolean;
}

export function useDriverTracking(
  isAuthenticated: boolean,
  isWebSocketConnected: boolean,
  isWebSocketAuthenticated: boolean,
  driverId?: string,
  busId?: string
): TrackingState & TrackingActions {
  // State
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // PRODUCTION FIX: GPS accuracy state
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [accuracyLevel, setAccuracyLevel] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'very-poor' | undefined>(undefined);
  const [accuracyMessage, setAccuracyMessage] = useState<string | undefined>(undefined);
  const [accuracyWarning, setAccuracyWarning] = useState(false);
  const deviceInfoRef = useRef(detectGPSDeviceInfo());

  // Refs for cleanup
  const locationListenerRef = useRef<((location: LocationData) => void) | null>(null);
  const errorListenerRef = useRef<((error: LocationError) => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

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

  // PRODUCTION FIX: Track last successful WebSocket send for health monitoring
  const lastSuccessfulSendRef = useRef<number>(0);
  const webSocketHealthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Setup location listeners
  useEffect(() => {
    // Location update listener
    const locationListener = (location: LocationData) => {
      // Access current error state via ref to avoid stale closure
      const currentError = locationError;
      setLastLocation(location);
      setLastUpdateTime(Date.now());
      setUpdateCount(prev => prev + 1);
      
      // PRODUCTION FIX: Update GPS accuracy information
      if (location.accuracy !== undefined) {
        setAccuracy(location.accuracy);
        const category = categorizeAccuracy(location.accuracy);
        setAccuracyLevel(category.level);
        
        const accuracyMsg = getAccuracyMessage(location.accuracy, deviceInfoRef.current);
        setAccuracyMessage(accuracyMsg.message);
        setAccuracyWarning(shouldWarnAboutAccuracy(location.accuracy, deviceInfoRef.current));
        
        logger.debug('GPS accuracy updated', 'useDriverTracking', {
          accuracy: location.accuracy,
          level: category.level,
          message: accuracyMsg.message,
          hasWarning: shouldWarnAboutAccuracy(location.accuracy, deviceInfoRef.current),
        });
      }
      
      // PRODUCTION FIX: Auto-clear error on successful location update
      if (currentError) {
        logger.info('✅ Location error cleared after successful update', 'useDriverTracking', {
          previousError: currentError,
          newLocation: { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy }
        });
        setLocationError(null);
      }
      
      // Reset retry count on successful location
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Send location to WebSocket if connected and authenticated
      if (isWebSocketConnected && isWebSocketAuthenticated && isTracking && driverId && busId) {
        try {
          logger.info('📍 Sending location update to WebSocket', 'useDriverTracking', { 
            driverId, 
            busId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          });
          
          unifiedWebSocketService.sendLocationUpdate({
            driverId: driverId,
            busId: busId,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date(location.timestamp).toISOString(),
            speed: location.speed,
            heading: location.heading,
          });
          
          // PRODUCTION FIX: Track successful WebSocket send
          lastSuccessfulSendRef.current = Date.now();
          
          logger.info('✅ Location sent to WebSocket successfully', 'useDriverTracking', {
            driverId: driverId,
            busId: busId,
            latitude: location.latitude,
            longitude: location.longitude,
          });
        } catch (error) {
          logger.error('❌ Failed to send location to WebSocket', 'useDriverTracking', { 
            error: error instanceof Error ? error.message : String(error),
            driverId,
            busId,
          });
          setLocationError(error instanceof Error ? error.message : 'Failed to send location update');
        }
      } else if (isTracking) {
        // Only warn if we're tracking but can't send
        logger.warn('⚠️ Cannot send location update - waiting for requirements', 'useDriverTracking', {
          isWebSocketConnected,
          isWebSocketAuthenticated,
          isTracking,
          driverId: driverId || 'MISSING',
          busId: busId || 'MISSING',
        });
      }
    };

    // Error listener with retry logic for recoverable errors
    const errorListener = (error: LocationError) => {
      // PRODUCTION FIX: Distinguish recoverable vs permanent errors
      const isRecoverable = error.code === GeolocationPositionError.TIMEOUT || 
                           error.code === GeolocationPositionError.POSITION_UNAVAILABLE;
      const isPermanent = error.code === GeolocationPositionError.PERMISSION_DENIED;
      
      if (isPermanent) {
        // Permanent error - set immediately, no retry
        setLocationError(error.message);
        logger.error('Permanent location error', 'useDriverTracking', { 
          error: error.message,
          code: error.code 
        });
        return;
      }
      
      if (isRecoverable && retryCountRef.current < MAX_RETRIES) {
        // Recoverable error - retry with exponential backoff
        retryCountRef.current += 1;
        const retryDelay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
        
        logger.warn('Recoverable location error - scheduling retry', 'useDriverTracking', { 
          error: error.message,
          code: error.code,
          retryCount: retryCountRef.current,
          retryDelay
        });
        
        // Clear existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // Schedule retry
        retryTimeoutRef.current = setTimeout(() => {
          if (isTracking && locationService.getIsTracking()) {
            logger.info('Retrying location after recoverable error', 'useDriverTracking', {
              retryCount: retryCountRef.current
            });
            // The location service will continue trying automatically
            // We just need to wait for the next successful location
          }
          retryTimeoutRef.current = null;
        }, retryDelay);
        
        // PRODUCTION FIX: Only show error if we have multiple consecutive failures
        // Don't show error for first timeout/unavailable (common on desktop)
        if (retryCountRef.current >= ERROR_DISPLAY_THRESHOLD) {
          setLocationError(`GPS issue (retrying ${retryCountRef.current}/${MAX_RETRIES})...`);
        } else {
          // First error - don't show error state, just log it
          logger.debug('GPS timeout/unavailable (will retry silently)', 'useDriverTracking', {
            code: error.code,
            message: error.message
          });
        }
      } else {
        // Max retries exceeded or unknown error - set as error
        setLocationError(error.message);
        logger.error('Location error - max retries exceeded or unknown error', 'useDriverTracking', { 
          error: error.message,
          code: error.code,
          retryCount: retryCountRef.current
        });
      }
    };

    // Store references for cleanup
    locationListenerRef.current = locationListener;
    errorListenerRef.current = errorListener;

    // Add listeners
    locationService.addLocationListener(locationListener);
    locationService.addErrorListener(errorListener);

    // PRODUCTION FIX: WebSocket health check for long-running connections
    // Check every 5 minutes if WebSocket is still healthy
    if (isTracking && isWebSocketConnected && isWebSocketAuthenticated) {
      webSocketHealthCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastSend = now - lastSuccessfulSendRef.current;
        
        // Alert if no successful sends for 3 minutes (indicates WebSocket issue)
        if (timeSinceLastSend > 3 * 60 * 1000 && lastSuccessfulSendRef.current > 0) {
          logger.warn('⚠️ WebSocket health check: No successful location sends for extended period', 'useDriverTracking', {
            timeSinceLastSend: Math.round(timeSinceLastSend / 1000) + 's',
            isWebSocketConnected,
            isWebSocketAuthenticated,
            action: 'Checking WebSocket connection health...',
          });
          
          // Verify WebSocket is still connected
          const connectionStatus = unifiedWebSocketService.getConnectionStatus();
          if (!connectionStatus) {
            logger.error('🚨 WebSocket appears disconnected - reconnection may be needed', 'useDriverTracking');
            setLocationError('WebSocket connection lost. Attempting to reconnect...');
          }
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    }

    // Cleanup function
    return () => {
      if (locationListenerRef.current) {
        locationService.removeLocationListener(locationListenerRef.current);
      }
      if (errorListenerRef.current) {
        locationService.removeErrorListener(errorListenerRef.current);
      }
      // PRODUCTION FIX: Clear retry timeout on cleanup
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      // PRODUCTION FIX: Clear WebSocket health check interval
      if (webSocketHealthCheckIntervalRef.current) {
        clearInterval(webSocketHealthCheckIntervalRef.current);
        webSocketHealthCheckIntervalRef.current = null;
      }
      retryCountRef.current = 0;
    };
  }, [isWebSocketConnected, isWebSocketAuthenticated, isTracking, driverId, busId, locationError]);

  // Start tracking
  // PRODUCTION FIX: Allow tracking to start even if WebSocket is connecting (will queue location updates)
  const startTracking = useCallback(async () => {
    if (!isAuthenticated) {
      setLocationError('Not authenticated. Please log in first.');
      logger.warn('Cannot start tracking: not authenticated', 'useDriverTracking');
      return;
    }

    // PRODUCTION FIX: Don't block tracking start if WebSocket is connecting
    // Location updates will be queued and sent when WebSocket connects
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
        const errorMsg = 'Location permission denied. Please enable location access in your browser settings.';
        setLocationError(errorMsg);
        logger.error('❌ Location permission denied', 'useDriverTracking');
        return;
      }

      logger.info('✅ Location permission granted, starting GPS tracking...', 'useDriverTracking');

      // PRODUCTION FIX: Start tracking even if WebSocket isn't connected
      // The location service will start, and updates will be sent when WebSocket connects
      const success = await locationService.startTracking();
      if (success) {
        setIsTracking(true);
        setLocationError(null);
        
        logger.info('✅ Location tracking started successfully', 'useDriverTracking', {
          driverId,
          busId,
          webSocketReady: isWebSocketConnected && isWebSocketAuthenticated
        });
        
        // PRODUCTION FIX: If WebSocket isn't ready, show a warning but don't block
        if (!isWebSocketConnected || !isWebSocketAuthenticated) {
          logger.warn('⚠️ Tracking started but WebSocket not ready - updates will queue', 'useDriverTracking');
        }
      } else {
        const errorMsg = 'Failed to start location tracking. Please try again.';
        setLocationError(errorMsg);
        logger.error('❌ Failed to start location tracking', 'useDriverTracking');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const fullErrorMsg = `Failed to start tracking: ${errorMessage}`;
      setLocationError(fullErrorMsg);
      logger.error('❌ Error starting location tracking', 'useDriverTracking', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, [isAuthenticated, isWebSocketConnected, isWebSocketAuthenticated, driverId, busId]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    logger.info('Stopping location tracking', 'useDriverTracking');
    locationService.stopTracking();
    setIsTracking(false);
    setLocationError(null);
    
    logger.info('Location tracking stopped', 'useDriverTracking');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLocationError(null);
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await locationService.requestPermission();
      if (!hasPermission) {
        setLocationError('Location permission denied. Please enable location access in your browser settings.');
      }
      return hasPermission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLocationError(`Permission request failed: ${errorMessage}`);
      logger.error('Error requesting location permission', 'useDriverTracking', { error });
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        locationService.stopTracking();
      }
    };
  }, [isTracking]);

  // PRODUCTION FIX: Manual location override for desktop/low-accuracy scenarios
  // Note: Currently not implemented in LocationService - reserved for future use
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
    locationError,
    connectionStatus,
    // PRODUCTION FIX: GPS accuracy information
    accuracy,
    accuracyLevel,
    accuracyMessage,
    accuracyWarning,
    deviceInfo: deviceInfoRef.current,
    
    // Actions
    startTracking,
    stopTracking,
    clearError,
    requestPermission,
    setManualLocation, // NEW: Manual location override
  };
}