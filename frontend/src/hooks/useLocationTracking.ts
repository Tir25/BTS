import { useState, useRef, useCallback } from 'react';

import { logger } from '../utils/logger';

interface LocationTrackingState {
  isTracking: boolean;
  currentLocation: GeolocationPosition | null;
  locationError: string | null;
  lastUpdateTime: string | null;
  updateCount: number;
}

interface LocationTrackingActions {
  startTracking: () => void;
  stopTracking: () => void;
  clearError: () => void;
}

export const useLocationTracking = (): LocationTrackingState & LocationTrackingActions => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (isTracking) return;

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      setCurrentLocation(position);
      setLastUpdateTime(new Date().toISOString());
      setUpdateCount(prev => prev + 1);
      setLocationError(null);
    };

    const handleError = (error: GeolocationPositionError) => {
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
      logger.info('📍 Location tracking started', 'component');
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
      setLocationError('Failed to start location tracking');
      setIsTracking(false);
    }
  }, [isTracking]);

  const stopTracking = useCallback(() => {
    if (!isTracking) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    logger.info('📍 Location tracking stopped', 'component');
  }, [isTracking]);

  const clearError = useCallback(() => {
    setLocationError(null);
  }, []);

  return {
    isTracking,
    currentLocation,
    locationError,
    lastUpdateTime,
    updateCount,
    startTracking,
    stopTracking,
    clearError,
  };
};
