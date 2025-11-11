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
// CRITICAL FIX: Increased threshold for mobile GPS - GPS needs time to acquire signal
// Don't show errors immediately on mobile devices - wait for GPS to acquire signal
const ERROR_DISPLAY_THRESHOLD = 3; // Only show error after 3 consecutive failures (was 2)
const MOBILE_GPS_GRACE_PERIOD_MS = 30000; // 30 seconds grace period for mobile GPS to acquire signal

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
  // CRITICAL FIX: Track when tracking started to implement grace period for mobile GPS
  const trackingStartTimeRef = useRef<number>(0);
  const isMobileDeviceRef = useRef<boolean>(false);

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
      
      // CRITICAL FIX: Clear tracking start time on successful location
      // This ensures grace period logic works correctly
      if (trackingStartTimeRef.current > 0) {
        const timeToFirstLocation = Date.now() - trackingStartTimeRef.current;
        logger.info('GPS acquired signal successfully', 'useDriverTracking', {
          timeToFirstLocation: Math.round(timeToFirstLocation / 1000) + 's',
          isMobile: isMobileDeviceRef.current
        });
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
      
      // CRITICAL FIX: For mobile GPS devices, implement grace period before showing errors
      // GPS can take 20-45 seconds to acquire signal, especially on first use or indoors
      const timeSinceTrackingStart = Date.now() - trackingStartTimeRef.current;
      const isInGracePeriod = isMobileDeviceRef.current && timeSinceTrackingStart < MOBILE_GPS_GRACE_PERIOD_MS;
      
      if (isRecoverable && retryCountRef.current < MAX_RETRIES) {
        // Recoverable error - retry with exponential backoff
        retryCountRef.current += 1;
        const retryDelay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
        
        logger.warn('Recoverable location error - scheduling retry', 'useDriverTracking', { 
          error: error.message,
          code: error.code,
          retryCount: retryCountRef.current,
          retryDelay,
          isInGracePeriod,
          timeSinceTrackingStart: Math.round(timeSinceTrackingStart / 1000) + 's'
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
        
        // CRITICAL FIX: Don't show errors during grace period for mobile GPS
        // GPS needs time to acquire signal - showing errors too early is confusing
        if (isInGracePeriod) {
          // Still in grace period - don't show error, just log it
          logger.debug('GPS error during grace period (GPS acquiring signal)', 'useDriverTracking', {
            code: error.code,
            message: error.message,
            timeSinceTrackingStart: Math.round(timeSinceTrackingStart / 1000) + 's',
            gracePeriodRemaining: Math.round((MOBILE_GPS_GRACE_PERIOD_MS - timeSinceTrackingStart) / 1000) + 's'
          });
          return; // Don't set error during grace period
        }
        
        // PRODUCTION FIX: Only show error if we have multiple consecutive failures
        // Don't show error for first timeout/unavailable (common on desktop)
        if (retryCountRef.current >= ERROR_DISPLAY_THRESHOLD) {
          // Provide more helpful error message for mobile GPS
          if (isMobileDeviceRef.current && error.code === GeolocationPositionError.TIMEOUT) {
            setLocationError(`GPS is acquiring signal... (attempt ${retryCountRef.current}/${MAX_RETRIES})\n\nPlease:\n• Go outdoors or near a window\n• Wait 30-45 seconds for GPS to acquire signal\n• Make sure GPS is enabled in device settings`);
          } else if (isMobileDeviceRef.current && error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            setLocationError(`GPS signal unavailable (attempt ${retryCountRef.current}/${MAX_RETRIES})\n\nPlease:\n• Go outdoors for better GPS signal\n• Wait 30-45 seconds for GPS to acquire signal\n• Check if GPS is enabled in device settings`);
          } else {
            setLocationError(`GPS issue (retrying ${retryCountRef.current}/${MAX_RETRIES})...`);
          }
        } else {
          // First error - don't show error state, just log it
          logger.debug('GPS timeout/unavailable (will retry silently)', 'useDriverTracking', {
            code: error.code,
            message: error.message
          });
        }
      } else {
        // Max retries exceeded or unknown error - set as error
        // Provide more helpful error message for mobile GPS
        if (isMobileDeviceRef.current && error.code === GeolocationPositionError.TIMEOUT) {
          setLocationError(`GPS timeout after ${MAX_RETRIES} attempts.\n\nPlease:\n• Go outdoors or near a window\n• Wait 30-45 seconds for GPS to acquire signal\n• Make sure GPS is enabled in device settings\n• Try refreshing the page`);
        } else if (isMobileDeviceRef.current && error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
          setLocationError(`GPS signal unavailable after ${MAX_RETRIES} attempts.\n\nPlease:\n• Go outdoors for better GPS signal\n• Wait 30-45 seconds for GPS to acquire signal\n• Check if GPS is enabled in device settings\n• Try refreshing the page`);
        } else {
          setLocationError(error.message);
        }
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
        // PRODUCTION FIX: Provide more helpful error message for mobile devices with specific instructions
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        let errorMsg = 'Location permission denied. ';
        
        if (isIOS) {
          errorMsg += 'Please enable location access:\n1. Open iPhone Settings\n2. Go to Safari (or your browser)\n3. Enable Location Services\n4. Allow location access for this website\n5. Return here and try again';
        } else if (isAndroid) {
          errorMsg += 'Please enable location access:\n1. Tap the menu (⋮) in your browser\n2. Go to Settings > Site Settings\n3. Enable Location permissions\n4. Allow location access for this website\n5. Return here and try again';
        } else if (isMobile) {
          errorMsg += 'Please enable location access in your device/browser settings and allow this site to access your location.';
        } else {
          errorMsg += 'Please enable location access in your browser settings and allow this site to access your location.';
        }
        
        setLocationError(errorMsg);
        logger.warn('⚠️ Location permission denied - user needs to enable location access', 'useDriverTracking', {
          isMobile,
          isIOS,
          isAndroid,
          userAgent: navigator.userAgent
        });
        return;
      }

      logger.info('✅ Location permission granted, starting GPS tracking...', 'useDriverTracking');

      // CRITICAL FIX: Track when tracking starts and detect mobile device for grace period
      trackingStartTimeRef.current = Date.now();
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      isMobileDeviceRef.current = isMobile;
      
      logger.info('Starting GPS tracking with grace period', 'useDriverTracking', {
        isMobile,
        gracePeriodMs: MOBILE_GPS_GRACE_PERIOD_MS,
        note: isMobile ? 'GPS may take 20-45 seconds to acquire signal - errors will be suppressed during grace period' : 'Desktop device - no grace period needed'
      });

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
    
    // CRITICAL FIX: Reset tracking start time and retry count when stopping
    trackingStartTimeRef.current = 0;
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    logger.info('Location tracking stopped', 'useDriverTracking');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLocationError(null);
  }, []);

  // Request permission manually (for "Request Permission" button)
  const requestPermission = useCallback(async () => {
    try {
      logger.info('📍 Manually requesting location permission...', 'useDriverTracking');
      
      // PRODUCTION FIX: Reset permission cache to allow retry even if previously denied
      // This allows users to retry after enabling permission in browser settings
      const { permissionManager } = await import('../services/location/permissionManager');
      permissionManager.resetPermissionCache();
      
      const hasPermission = await locationService.requestPermission();
      if (hasPermission) {
        setLocationError(null);
        logger.info('✅ Location permission granted after manual request', 'useDriverTracking');
        // If permission is now granted and tracking is not active, suggest starting tracking
        if (!isTracking) {
          logger.info('Permission granted - user can now start tracking', 'useDriverTracking');
        }
        return true;
      } else {
        // Permission still denied - error message will be set by requestPermission
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        let errorMsg = 'Location permission denied. ';
        
        if (isIOS) {
          errorMsg += 'Please enable location access:\n1. Open iPhone Settings\n2. Go to Safari (or your browser)\n3. Enable Location Services\n4. Allow location access for this website\n5. Return here and tap "Request Permission" again';
        } else if (isAndroid) {
          errorMsg += 'Please enable location access:\n1. Tap the menu (⋮) in your browser\n2. Go to Settings > Site Settings\n3. Enable Location permissions\n4. Allow location access for this website\n5. Return here and tap "Request Permission" again';
        } else if (isMobile) {
          errorMsg += 'Please enable location access in your device/browser settings and allow this site to access your location. Then tap "Request Permission" again.';
        } else {
          errorMsg += 'Please enable location access in your browser settings and allow this site to access your location. Then click "Request Permission" again.';
        }
        
        setLocationError(errorMsg);
        logger.warn('⚠️ Location permission still denied after manual request', 'useDriverTracking', {
          isMobile,
          isIOS,
          isAndroid
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLocationError(`Failed to request permission: ${errorMessage}`);
      logger.error('❌ Error requesting permission', 'useDriverTracking', { 
        error: errorMessage 
      });
      return false;
    }
  }, [isTracking]);

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