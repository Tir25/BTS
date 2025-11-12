/**
 * Hook for managing tracking errors and retry logic
 */
import { useState, useRef, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { LocationError } from '../../services/LocationService';

// Retry configuration constants
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds
const ERROR_DISPLAY_THRESHOLD = 3; // Only show error after 3 consecutive failures
const MOBILE_GPS_GRACE_PERIOD_MS = 30000; // 30 seconds grace period for mobile GPS

export interface UseTrackingErrorsProps {
  isTracking: boolean;
  onRetry?: () => void;
}

export interface TrackingErrorsState {
  locationError: string | null;
  retryCount: number;
}

export interface TrackingErrorsActions {
  handleError: (error: LocationError, trackingStartTime: number, isMobile: boolean) => void;
  clearError: () => void;
  resetRetry: () => void;
}

/**
 * Manages location tracking errors with retry logic and grace periods
 */
export function useTrackingErrors({
  isTracking,
  onRetry,
}: UseTrackingErrorsProps): TrackingErrorsState & TrackingErrorsActions {
  const [locationError, setLocationError] = useState<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleError = useCallback((error: LocationError, trackingStartTime: number, isMobile: boolean) => {
    // Distinguish recoverable vs permanent errors
    const isRecoverable = error.code === GeolocationPositionError.TIMEOUT || 
                         error.code === GeolocationPositionError.POSITION_UNAVAILABLE;
    const isPermanent = error.code === GeolocationPositionError.PERMISSION_DENIED;
    
    if (isPermanent) {
      // Permanent error - set immediately, no retry
      setLocationError(error.message);
      logger.error('Permanent location error', 'useTrackingErrors', { 
        error: error.message,
        code: error.code 
      });
      return;
    }
    
    // For mobile GPS devices, implement grace period before showing errors
    const timeSinceTrackingStart = Date.now() - trackingStartTime;
    const isInGracePeriod = isMobile && timeSinceTrackingStart < MOBILE_GPS_GRACE_PERIOD_MS;
    
    if (isRecoverable && retryCountRef.current < MAX_RETRIES) {
      // Recoverable error - retry with exponential backoff
      retryCountRef.current += 1;
      const retryDelay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);
      
      logger.warn('Recoverable location error - scheduling retry', 'useTrackingErrors', { 
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
        if (isTracking && onRetry) {
          logger.info('Retrying location after recoverable error', 'useTrackingErrors', {
            retryCount: retryCountRef.current
          });
          onRetry();
        }
        retryTimeoutRef.current = null;
      }, retryDelay);
      
      // Don't show errors during grace period for mobile GPS
      if (isInGracePeriod) {
        logger.debug('GPS error during grace period (GPS acquiring signal)', 'useTrackingErrors', {
          code: error.code,
          message: error.message,
          timeSinceTrackingStart: Math.round(timeSinceTrackingStart / 1000) + 's',
          gracePeriodRemaining: Math.round((MOBILE_GPS_GRACE_PERIOD_MS - timeSinceTrackingStart) / 1000) + 's'
        });
        return; // Don't set error during grace period
      }
      
      // Only show error if we have multiple consecutive failures
      if (retryCountRef.current >= ERROR_DISPLAY_THRESHOLD) {
        // Provide more helpful error message for mobile GPS
        if (isMobile && error.code === GeolocationPositionError.TIMEOUT) {
          setLocationError(`GPS is acquiring signal... (attempt ${retryCountRef.current}/${MAX_RETRIES})\n\nPlease:\n• Go outdoors or near a window\n• Wait 30-45 seconds for GPS to acquire signal\n• Make sure GPS is enabled in device settings`);
        } else if (isMobile && error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
          setLocationError(`GPS signal unavailable (attempt ${retryCountRef.current}/${MAX_RETRIES})\n\nPlease:\n• Go outdoors for better GPS signal\n• Wait 30-45 seconds for GPS to acquire signal\n• Check if GPS is enabled in device settings`);
        } else {
          setLocationError(`GPS issue (retrying ${retryCountRef.current}/${MAX_RETRIES})...`);
        }
      } else {
        // First error - don't show error state, just log it
        logger.debug('GPS timeout/unavailable (will retry silently)', 'useTrackingErrors', {
          code: error.code,
          message: error.message
        });
      }
    } else {
      // Max retries exceeded or unknown error - set as error
      // Provide more helpful error message for mobile GPS
      if (isMobile && error.code === GeolocationPositionError.TIMEOUT) {
        setLocationError(`GPS timeout after ${MAX_RETRIES} attempts.\n\nPlease:\n• Go outdoors or near a window\n• Wait 30-45 seconds for GPS to acquire signal\n• Make sure GPS is enabled in device settings\n• Try refreshing the page`);
      } else if (isMobile && error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
        setLocationError(`GPS signal unavailable after ${MAX_RETRIES} attempts.\n\nPlease:\n• Go outdoors for better GPS signal\n• Wait 30-45 seconds for GPS to acquire signal\n• Check if GPS is enabled in device settings\n• Try refreshing the page`);
      } else {
        setLocationError(error.message);
      }
      logger.error('Location error - max retries exceeded or unknown error', 'useTrackingErrors', { 
        error: error.message,
        code: error.code,
        retryCount: retryCountRef.current
      });
    }
  }, [isTracking, onRetry]);

  const clearError = useCallback(() => {
    setLocationError(null);
  }, []);

  const resetRetry = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  return {
    locationError,
    retryCount: retryCountRef.current,
    handleError,
    clearError,
    resetRetry,
  };
}

