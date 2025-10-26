import { useState, useRef, useCallback, useEffect } from 'react';

import { logger } from '../utils/logger';

interface LocationTrackingState {
  isTracking: boolean;
  currentLocation: GeolocationPosition | null;
  locationError: string | null;
  lastUpdateTime: string | null;
  updateCount: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

interface LocationTrackingActions {
  startTracking: () => void;
  stopTracking: () => void;
  clearError: () => void;
  requestPermission: () => Promise<boolean>;
}

interface LocationConfig {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  mobileOptimized?: boolean;
}

export const useEnhancedLocationTracking = (config: LocationConfig = {}): LocationTrackingState & LocationTrackingActions => {
  const {
    enableHighAccuracy = true,
    timeout = 30000,
    maximumAge = 0,
    mobileOptimized = true,
  } = config;

  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const permissionRef = useRef<PermissionState | null>(null);

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Check location permission
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!('permissions' in navigator)) {
      return true; // Assume granted if permissions API not available
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      permissionRef.current = permission.state;
      return permission.state === 'granted';
    } catch (error) {
      logger.warn('Warning', 'component', { data: '⚠️ Permission API not supported:', error });
      return true; // Assume granted if API not supported
    }
  }, []);

  // Request location permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return false;
    }

    try {
      const hasPermission = await checkPermission();
      if (hasPermission) {
        return true;
      }

      // Request permission by attempting to get current position
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationError(null);
            resolve(true);
          },
          (error) => {
            let errorMessage = 'Location permission denied';
            
            if (isMobile) {
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location permission denied. Please enable location access in your device settings.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location unavailable. Please go outdoors or near a window for better GPS signal.';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out. Please try again.';
                  break;
              }
            } else {
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location permission denied. Please allow location access in your browser settings.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information unavailable.';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out. Please try again.';
                  break;
              }
            }
            
            setLocationError(errorMessage);
            resolve(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      setLocationError('Failed to request location permission');
      return false;
    }
  }, [checkPermission, isMobile]);

  // Enhanced location tracking with mobile optimizations
  const startTracking = useCallback(async () => {
    if (isTracking) return;

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    // Request permission first
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    // Mobile-optimized options
    const options: PositionOptions = {
      enableHighAccuracy: enableHighAccuracy && !isMobile, // Reduce battery drain on mobile
      timeout: isMobile ? Math.min(timeout, 15000) : timeout, // Shorter timeout for mobile
      maximumAge: isMobile ? 5000 : maximumAge, // Allow some caching on mobile
    };

    const handleSuccess = (position: GeolocationPosition) => {
      setCurrentLocation(position);
      setLastUpdateTime(new Date().toISOString());
      setUpdateCount(prev => prev + 1);
      setLocationError(null);
      
      // Update additional location data
      setAccuracy(position.coords.accuracy);
      setSpeed(position.coords.speed);
      setHeading(position.coords.heading);
      
      logger.debug('📍 Location update', 'component', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'Unknown location error';
      
      if (isMobile) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please:\n1. Go to Settings\n2. Find this browser app\n3. Enable Location permission\n4. Refresh this page';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Please:\n1. Go outdoors or near a window\n2. Wait 10-15 seconds\n3. Make sure GPS is enabled\n4. Try again';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please:\n1. Go outdoors for better GPS signal\n2. Wait 30 seconds and try again\n3. Check if GPS is enabled';
            break;
        }
      } else {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
      }
      
      setLocationError(errorMessage);
      setIsTracking(false);
    };

    try {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        options
      );
      
      watchIdRef.current = watchId;
      logger.info('📍 Enhanced location tracking started', 'component');
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      setLocationError('Failed to start location tracking');
      setIsTracking(false);
    }
  }, [isTracking, requestPermission, enableHighAccuracy, timeout, maximumAge, isMobile]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (!isTracking) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    logger.info('📍 Enhanced location tracking stopped', 'component');
  }, [isTracking]);

  // Clear error
  const clearError = useCallback(() => {
    setLocationError(null);
  }, []);

  // Monitor permission changes
  useEffect(() => {
    if (!('permissions' in navigator)) return;

    const permission = navigator.permissions.query({ name: 'geolocation' as PermissionName });
    permission.then((result) => {
      result.addEventListener('change', () => {
        permissionRef.current = result.state;
        if (result.state === 'denied' && isTracking) {
          setLocationError('Location permission was revoked. Please refresh the page and allow location access.');
          stopTracking();
        }
      });
    });
  }, [isTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
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
  };
};
