import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '../utils/logger';
import { locationService, LocationData, LocationError } from '../services/LocationService';

// Location tracking state
interface LocationState {
  // Tracking status
  isTracking: boolean;
  isPermissionGranted: boolean;
  
  // Current location data
  currentLocation: GeolocationPosition | null;
  locationError: GeolocationPositionError | null;
  
  // Tracking metrics
  lastUpdateTime: string | null;
  updateCount: number;
  trackingStartTime: number | null;
  
  // Location accuracy
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  
  // Error handling
  permissionError: string | null;
  trackingError: string | null;
  
  // Geolocation watch ID
  watchId: number | null;
}

// Location actions
interface LocationActions {
  // Tracking control
  startTracking: () => void;
  stopTracking: () => void;
  requestPermission: () => Promise<boolean>;
  
  // Location updates
  updateLocation: (position: GeolocationPosition) => void;
  setLocationError: (error: GeolocationPositionError) => void;
  
  // Error handling
  clearError: () => void;
  clearPermissionError: () => void;
  clearTrackingError: () => void;
  
  // Metrics
  incrementUpdateCount: () => void;
  resetMetrics: () => void;
  
  // Reset
  resetAll: () => void;
}

// Combined store type
type LocationStore = LocationState & LocationActions;

// Initial state
const initialState: LocationState = {
  // Tracking status
  isTracking: false,
  isPermissionGranted: false,
  
  // Current location data
  currentLocation: null,
  locationError: null,
  
  // Tracking metrics
  lastUpdateTime: null,
  updateCount: 0,
  trackingStartTime: null,
  
  // Location accuracy
  accuracy: null,
  heading: null,
  speed: null,
  
  // Error handling
  permissionError: null,
  trackingError: null,
  
  // Geolocation watch ID
  watchId: null,
};

// Create the store
export const useLocationStore = create<LocationStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Tracking control
      // FIXED: Now uses LocationService singleton instead of duplicate watchPosition
      // This prevents duplicate GPS tracking that caused 16ms duplicate updates
      startTracking: async () => {
        const state = get();
        if (state.isTracking) {
          logger.warn('Location tracking already active', 'location-store');
          return;
        }

        // Request permission if not already granted
        if (!state.isPermissionGranted) {
          logger.info('Permission not granted, requesting permission...', 'location-store');
          const permissionGranted = await get().requestPermission();
          if (!permissionGranted) {
            const error = 'Location permission not granted';
            set({ 
              trackingError: error,
              isTracking: false,
            });
            logger.error('Location permission not granted', 'location-store', { error });
            return;
          }
        }

        // Use LocationService singleton instead of duplicate watchPosition
        // LocationService already handles GPS tracking, we just listen to updates
        const success = await locationService.startTracking();
        
        if (!success) {
          const error = 'Failed to start location tracking';
          set({ 
            trackingError: error,
            isTracking: false,
          });
          logger.error('Failed to start location tracking', 'location-store', { error });
          return;
        }

        // Set up listeners to LocationService (single source of GPS updates)
        const locationListener = (location: LocationData) => {
          // Convert LocationData to GeolocationPosition format for store compatibility
          const position = {
            coords: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              altitude: null,
              altitudeAccuracy: null,
              heading: location.heading || null,
              speed: location.speed || null,
            },
            timestamp: location.timestamp,
          } as GeolocationPosition;
          
          get().updateLocation(position);
          
          logger.debug('Location update received from LocationService', 'location-store', {
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy,
          });
        };

        const errorListener = (error: LocationError) => {
          // Convert LocationError to GeolocationPositionError format
          const geoError = {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError;
          
          get().setLocationError(geoError);
          logger.error('Location error from LocationService', 'location-store', {
            code: error.code,
            message: error.message,
          });
        };

        // Register listeners with LocationService
        locationService.addLocationListener(locationListener);
        locationService.addErrorListener(errorListener);

        // Store listeners for cleanup
        (get() as any)._locationListener = locationListener;
        (get() as any)._errorListener = errorListener;

        set({
          isTracking: true,
          trackingStartTime: Date.now(),
          trackingError: null,
          watchId: 1, // Dummy ID since LocationService manages the actual watchId
        });
        
        logger.info('Location tracking started via LocationService (single source)', 'location-store');
      },

      stopTracking: () => {
        const state = get();
        if (!state.isTracking) {
          logger.warn('Location tracking not active', 'location-store');
          return;
        }

        // Remove listeners from LocationService
        const locationListener = (state as any)._locationListener;
        const errorListener = (state as any)._errorListener;
        
        if (locationListener) {
          locationService.removeLocationListener(locationListener);
        }
        if (errorListener) {
          locationService.removeErrorListener(errorListener);
        }

        // Stop LocationService tracking (but keep it available for other components)
        // Only stop if no other components are using it
        // Note: LocationService manages its own tracking state
        locationService.stopTracking();

        set({
          isTracking: false,
          trackingStartTime: null,
          watchId: null,
        });
        
        logger.info('Location tracking stopped', 'location-store', {
          totalUpdates: state.updateCount,
          duration: state.trackingStartTime ? Date.now() - state.trackingStartTime : 0,
        });
      },

      requestPermission: async () => {
        try {
          if (!navigator.geolocation) {
            const error = 'Geolocation is not supported by this browser';
            set({ permissionError: error });
            logger.error('Geolocation not supported', 'location-store', { error });
            return false;
          }

          // Check if permission is already granted
          if (navigator.permissions) {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            if (permission.state === 'granted') {
              set({ 
                isPermissionGranted: true,
                permissionError: null,
              });
              logger.info('Geolocation permission already granted', 'location-store');
              return true;
            }
          }

          // Request permission by getting current position
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                set({
                  isPermissionGranted: true,
                  permissionError: null,
                  currentLocation: position,
                  accuracy: position.coords.accuracy,
                  heading: position.coords.heading || null,
                  speed: position.coords.speed || null,
                });
                logger.info('Geolocation permission granted', 'location-store');
                resolve(true);
              },
              (error) => {
                const errorMessage = `Permission denied: ${error.message}`;
                set({
                  isPermissionGranted: false,
                  permissionError: errorMessage,
                });
                logger.error('Geolocation permission denied', 'location-store', { error: errorMessage });
                resolve(false);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000,
              }
            );
          });
        } catch (error) {
          const errorMessage = `Permission request failed: ${error}`;
          set({ permissionError: errorMessage });
          logger.error('Geolocation permission request failed', 'location-store', { error: errorMessage });
          return false;
        }
      },

      // Location updates
      updateLocation: (position) => {
        const now = new Date().toISOString();
        set((prev) => ({
          currentLocation: position,
          lastUpdateTime: now,
          updateCount: prev.updateCount + 1,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || null,
          speed: position.coords.speed || null,
          locationError: null,
          trackingError: null,
        }));
        
        logger.debug('Location updated', 'location-store', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updateCount: get().updateCount,
        });
      },

      setLocationError: (error) => {
        set({
          locationError: error,
          trackingError: error.message,
        });
        
        logger.error('Location error occurred', 'location-store', {
          code: error.code,
          message: error.message,
        });
      },

      // Error handling
      clearError: () => {
        set({
          locationError: null,
          trackingError: null,
        });
        logger.debug('Location errors cleared', 'location-store');
      },

      clearPermissionError: () => {
        set({ permissionError: null });
        logger.debug('Permission error cleared', 'location-store');
      },

      clearTrackingError: () => {
        set({ trackingError: null });
        logger.debug('Tracking error cleared', 'location-store');
      },

      // Metrics
      incrementUpdateCount: () => {
        set((prev) => ({ updateCount: prev.updateCount + 1 }));
      },

      resetMetrics: () => {
        set({
          updateCount: 0,
          lastUpdateTime: null,
          trackingStartTime: null,
        });
        logger.debug('Location metrics reset', 'location-store');
      },

      // Reset
      resetAll: () => {
        const state = get();
        
        // Remove listeners from LocationService
        const locationListener = (state as any)._locationListener;
        const errorListener = (state as any)._errorListener;
        
        if (locationListener) {
          locationService.removeLocationListener(locationListener);
        }
        if (errorListener) {
          locationService.removeErrorListener(errorListener);
        }
        
        set(initialState);
        logger.info('Location store reset to initial state', 'location-store');
      },
    })),
    {
      name: 'location-store',
      partialize: (state: LocationStore) => ({
        // Persist permission status and basic metrics
        isPermissionGranted: state.isPermissionGranted,
        updateCount: state.updateCount,
        lastUpdateTime: state.lastUpdateTime,
      }),
    }
  )
);

// Selector hooks for better performance
export const useLocationTracking = () => useLocationStore((state) => ({
  isTracking: state.isTracking,
  isPermissionGranted: state.isPermissionGranted,
  currentLocation: state.currentLocation,
  locationError: state.locationError,
  lastUpdateTime: state.lastUpdateTime,
  updateCount: state.updateCount,
}));

export const useLocationMetrics = () => useLocationStore((state) => ({
  updateCount: state.updateCount,
  lastUpdateTime: state.lastUpdateTime,
  trackingStartTime: state.trackingStartTime,
  accuracy: state.accuracy,
  heading: state.heading,
  speed: state.speed,
}));

export const useLocationErrors = () => useLocationStore((state) => ({
  locationError: state.locationError,
  permissionError: state.permissionError,
  trackingError: state.trackingError,
  hasError: !!(state.locationError || state.permissionError || state.trackingError),
}));

// Action hooks
export const useLocationActions = () => useLocationStore((state) => ({
  startTracking: state.startTracking,
  stopTracking: state.stopTracking,
  requestPermission: state.requestPermission,
  updateLocation: state.updateLocation,
  setLocationError: state.setLocationError,
  clearError: state.clearError,
  clearPermissionError: state.clearPermissionError,
  clearTrackingError: state.clearTrackingError,
  incrementUpdateCount: state.incrementUpdateCount,
  resetMetrics: state.resetMetrics,
  resetAll: state.resetAll,
}));

// Computed selectors
export const useLocationStatus = () => useLocationStore((state) => ({
  canTrack: state.isPermissionGranted && !state.locationError,
  isReady: state.isPermissionGranted && !!state.currentLocation,
  hasLocation: !!state.currentLocation,
  isAccurate: state.accuracy ? state.accuracy < 100 : false, // Less than 100m accuracy
  trackingDuration: state.trackingStartTime ? Date.now() - state.trackingStartTime : 0,
}));

// Store subscription utilities
export const subscribeToLocationChanges = (callback: (state: LocationStore) => void) => {
  return useLocationStore.subscribe(callback as (state: LocationStore) => void);
};

export const subscribeToTrackingStatus = (callback: (isTracking: boolean) => void) => {
  return useLocationStore.subscribe(
    (state: LocationStore) => state.isTracking,
    callback,
    {
      equalityFn: (a: boolean, b: boolean) => a === b,
    }
  );
};

export const subscribeToLocationUpdates = (callback: (location: GeolocationPosition | null) => void) => {
  return useLocationStore.subscribe(
    (state) => state.currentLocation,
    callback,
    {
      equalityFn: (a, b) => 
        a?.coords.latitude === b?.coords.latitude &&
        a?.coords.longitude === b?.coords.longitude &&
        a?.timestamp === b?.timestamp,
    }
  );
};

export default useLocationStore;
