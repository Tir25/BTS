import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useMemo } from 'react';
import { useDriverStore } from './useDriverStore';
import { useLocationStore } from './useLocationStore';
import { useConnectionStore } from './useConnectionStore';
import { logger } from '../utils/logger';

// Combined driver interface state
interface DriverInterfaceState {
  // Store references
  driverStore: ReturnType<typeof useDriverStore.getState>;
  locationStore: ReturnType<typeof useLocationStore.getState>;
  connectionStore: ReturnType<typeof useConnectionStore.getState>;
  
  // Computed state
  isReady: boolean;
  canTrackLocation: boolean;
  hasError: boolean;
  isFullyConnected: boolean;
  
  // UI state
  isInitialized: boolean;
  initializationComplete: boolean;
}

// Combined actions
interface DriverInterfaceActions {
  // Initialization
  initializeDriverInterface: () => Promise<void>;
  markInitializationComplete: () => void;
  
  // Error handling
  handleError: (error: Error, context: string) => void;
  clearAllErrors: () => void;
  
  // State synchronization
  syncStores: () => void;
  
  // Reset
  resetAllStores: () => void;
  
  // Cleanup
  cleanup: () => void;
}

// Combined store type
type DriverInterfaceStore = DriverInterfaceState & DriverInterfaceActions;

// Track if we're currently syncing to prevent infinite loops
let isSyncing = false;

// Create the combined store
export const useDriverInterfaceStore = create<DriverInterfaceStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      driverStore: useDriverStore.getState(),
      locationStore: useLocationStore.getState(),
      connectionStore: useConnectionStore.getState(),
      
      // Computed state
      isReady: false,
      canTrackLocation: false,
      hasError: false,
      isFullyConnected: false,
      
      // UI state
      isInitialized: false,
      initializationComplete: false,

      // Initialization with proper cleanup
      initializeDriverInterface: async () => {
        try {
          logger.info('Initializing driver interface stores', 'driver-interface-store');
          
          // Store unsubscribe functions for cleanup
          const unsubscribeFunctions: (() => void)[] = [];
          
          // Temporarily disable automatic store subscriptions to prevent infinite loops
          // TODO: Implement proper subscription management with debouncing
          logger.info('Store subscriptions disabled to prevent infinite loops', 'driver-interface-store');
          
          // Initial sync
          get().syncStores();
          
          set({ 
            isInitialized: true,
            initializationComplete: true,
          });
          
          logger.info('Driver interface stores initialized successfully', 'driver-interface-store');
          
          // Store cleanup functions for later use
          (get() as any).__unsubscribeFunctions = unsubscribeFunctions;
          
        } catch (error) {
          logger.error('Failed to initialize driver interface stores', 'driver-interface-store', { error });
          get().handleError(error as Error, 'initialization');
        }
      },

      markInitializationComplete: () => {
        set({ initializationComplete: true });
        logger.debug('Initialization marked as complete', 'driver-interface-store');
      },

      // Error handling
      handleError: (error: Error, context: string) => {
        logger.error(`Error in ${context}`, 'driver-interface-store', {
          error: error.message,
          stack: error.stack,
          context,
        });
        
        // Update error state in driver store
        useDriverStore.getState().setAuthState({
          error: error.message,
        });
        
        get().syncStores();
      },

      clearAllErrors: () => {
        useDriverStore.getState().clearError();
        useDriverStore.getState().clearInitializationError();
        useLocationStore.getState().clearError();
        useConnectionStore.getState().clearErrors();
        
        get().syncStores();
        logger.debug('All errors cleared', 'driver-interface-store');
      },

      // State synchronization with loop prevention
      syncStores: () => {
        // Prevent infinite loops by checking if we're already syncing
        if (isSyncing) {
          logger.debug('Sync already in progress, skipping', 'driver-interface-store');
          return;
        }
        
        isSyncing = true;
        
        try {
          const driverState = useDriverStore.getState();
          const locationState = useLocationStore.getState();
          const connectionState = useConnectionStore.getState();
          
          // Compute derived state
          const isReady = driverState.isAuthenticated && 
                         driverState.isDriver && 
                         !!driverState.busAssignment && 
                         !driverState.isLoading &&
                         !driverState.isInitializing;
          
          const canTrackLocation = driverState.isAuthenticated && 
                                  driverState.isDriver && 
                                  connectionState.isAuthenticated &&
                                  locationState.isPermissionGranted;
          
          const hasError = !!(driverState.error || 
                             driverState.initializationError ||
                             locationState.locationError ||
                             locationState.permissionError ||
                             locationState.trackingError ||
                             connectionState.connectionError ||
                             connectionState.authenticationError);
          
          const isFullyConnected = connectionState.isConnected && 
                                  connectionState.isAuthenticated;
          
          // Deep comparison to prevent unnecessary updates (using stable values)
          const currentState = get();
          
          // Compare using stable values instead of object references
          const driverChanged = 
            currentState.driverStore.isAuthenticated !== driverState.isAuthenticated ||
            currentState.driverStore.isDriver !== driverState.isDriver ||
            currentState.driverStore.isLoading !== driverState.isLoading ||
            currentState.driverStore.busAssignment?.driver_id !== driverState.busAssignment?.driver_id ||
            currentState.driverStore.error !== driverState.error;
            
          const locationChanged =
            currentState.locationStore.isTracking !== locationState.isTracking ||
            currentState.locationStore.currentLocation?.timestamp !== locationState.currentLocation?.timestamp ||
            currentState.locationStore.locationError !== locationState.locationError;
            
          const connectionChanged =
            currentState.connectionStore.isConnected !== connectionState.isConnected ||
            currentState.connectionStore.isAuthenticated !== connectionState.isAuthenticated;
          
          const computedChanged =
            currentState.isReady !== isReady ||
            currentState.canTrackLocation !== canTrackLocation ||
            currentState.hasError !== hasError ||
            currentState.isFullyConnected !== isFullyConnected;
          
          const valuesChanged = driverChanged || locationChanged || connectionChanged || computedChanged;
          
          if (valuesChanged) {
            set({
              driverStore: driverState,
              locationStore: locationState,
              connectionStore: connectionState,
              isReady,
              canTrackLocation,
              hasError,
              isFullyConnected,
            });
            
            logger.debug('Stores synchronized', 'driver-interface-store', {
              isReady,
              canTrackLocation,
              hasError,
              isFullyConnected,
            });
          }
        } finally {
          isSyncing = false;
        }
      },

      // Reset
      resetAllStores: () => {
        useDriverStore.getState().resetAll();
        useLocationStore.getState().resetAll();
        useConnectionStore.getState().resetAll();
        
        set({
          isReady: false,
          canTrackLocation: false,
          hasError: false,
          isFullyConnected: false,
          isInitialized: false,
          initializationComplete: false,
        });
        
        logger.info('All driver interface stores reset', 'driver-interface-store');
      },

      // Cleanup method to unsubscribe from all stores
      cleanup: () => {
        const unsubscribeFunctions = (get() as any).__unsubscribeFunctions;
        if (unsubscribeFunctions && Array.isArray(unsubscribeFunctions)) {
          unsubscribeFunctions.forEach((unsubscribe: () => void) => {
            try {
              unsubscribe();
            } catch (error) {
              logger.warn('Error during store cleanup', 'driver-interface-store', { error });
            }
          });
          (get() as any).__unsubscribeFunctions = null;
        }
        
        logger.info('Driver interface store cleanup completed', 'driver-interface-store');
      },
    }),
    {
      name: 'driver-interface-store',
    }
  )
);

// Convenience hooks that combine all stores
export const useDriverInterface = () => {
  const store = useDriverInterfaceStore();
  
  return useMemo(() => ({
    // Driver state
    isAuthenticated: store.driverStore.isAuthenticated,
    isDriver: store.driverStore.isDriver,
    isLoading: store.driverStore.isLoading,
    error: store.driverStore.error,
    driverId: store.driverStore.driverId,
    driverEmail: store.driverStore.driverEmail,
    driverName: store.driverStore.driverName,
    busAssignment: store.driverStore.busAssignment,
    
    // Location state
    isTracking: store.locationStore.isTracking,
    currentLocation: store.locationStore.currentLocation,
    locationError: store.locationStore.locationError,
    lastUpdateTime: store.locationStore.lastUpdateTime,
    updateCount: store.locationStore.updateCount,
    
    // Connection state
    isWebSocketConnected: store.connectionStore.isConnected,
    isWebSocketAuthenticated: store.connectionStore.isAuthenticated,
    connectionStatus: store.connectionStore.connectionStatus,
    
    // Computed state
    isReady: store.isReady,
    canTrackLocation: store.canTrackLocation,
    hasError: store.hasError,
    isFullyConnected: store.isFullyConnected,
    
    // UI state
    isInitializing: store.driverStore.isInitializing,
    initializationError: store.driverStore.initializationError,
    showTestMode: store.driverStore.showTestMode,
  }), [
    // Use specific state values instead of entire store object to prevent infinite loops
    store.driverStore.isAuthenticated,
    store.driverStore.isDriver,
    store.driverStore.isLoading,
    store.driverStore.error,
    store.driverStore.driverId,
    store.driverStore.driverEmail,
    store.driverStore.driverName,
    store.driverStore.busAssignment?.driver_id, // Use stable ID instead of entire object
    store.driverStore.busAssignment?.bus_id,
    store.driverStore.busAssignment?.bus_number,
    store.locationStore.isTracking,
    store.locationStore.currentLocation?.coords.latitude, // Use stable values instead of object
    store.locationStore.currentLocation?.coords.longitude,
    store.locationStore.currentLocation?.timestamp,
    store.locationStore.locationError?.message,
    store.locationStore.lastUpdateTime,
    store.locationStore.updateCount,
    store.connectionStore.isConnected,
    store.connectionStore.isAuthenticated,
    store.connectionStore.connectionStatus,
    store.isReady,
    store.canTrackLocation,
    store.hasError,
    store.isFullyConnected,
    store.driverStore.isInitializing,
    store.driverStore.initializationError,
    store.driverStore.showTestMode,
  ]);
};

// Action hooks
export const useDriverInterfaceActions = () => {
  const store = useDriverInterfaceStore();
  
  return useMemo(() => ({
    // Driver actions
    setAuthState: store.driverStore.setAuthState,
    setDriverData: store.driverStore.setDriverData,
    setConnectionState: store.driverStore.setConnectionState,
    setInitializationState: store.driverStore.setInitializationState,
    toggleTestMode: store.driverStore.toggleTestMode,
    updateBusAssignment: store.driverStore.updateBusAssignment,
    
    // Location actions
    startTracking: store.locationStore.startTracking,
    stopTracking: store.locationStore.stopTracking,
    requestPermission: store.locationStore.requestPermission,
    updateLocation: store.locationStore.updateLocation,
    setLocationError: store.locationStore.setLocationError,
    clearError: store.locationStore.clearError,
    
    // Connection actions
    setConnected: store.connectionStore.setConnected,
    setAuthenticated: store.connectionStore.setAuthenticated,
    setConnectionStatus: store.connectionStore.setConnectionStatus,
    setConnectionError: store.connectionStore.setConnectionError,
    setAuthenticationError: store.connectionStore.setAuthenticationError,
    
    // Combined actions
    clearAllErrors: store.clearAllErrors,
    handleError: store.handleError,
    resetAllStores: store.resetAllStores,
    cleanup: store.cleanup,
  }), [
    // Store actions are stable references, but we need to include them to ensure
    // the memoized object updates when the store instance changes
    store.driverStore.setAuthState,
    store.driverStore.setDriverData,
    store.driverStore.setConnectionState,
    store.driverStore.setInitializationState,
    store.driverStore.toggleTestMode,
    store.driverStore.updateBusAssignment,
    store.locationStore.startTracking,
    store.locationStore.stopTracking,
    store.locationStore.requestPermission,
    store.locationStore.updateLocation,
    store.locationStore.setLocationError,
    store.locationStore.clearError,
    store.connectionStore.setConnected,
    store.connectionStore.setAuthenticated,
    store.connectionStore.setConnectionStatus,
    store.connectionStore.setConnectionError,
    store.connectionStore.setAuthenticationError,
    store.clearAllErrors,
    store.handleError,
    store.resetAllStores,
    store.cleanup,
  ]);
};

// Status hooks
export const useDriverStatus = () => {
  const store = useDriverInterfaceStore();
  
  return {
    isReady: store.isReady,
    canTrackLocation: store.canTrackLocation,
    hasError: store.hasError,
    isFullyConnected: store.isFullyConnected,
    isInitialized: store.isInitialized,
    initializationComplete: store.initializationComplete,
  };
};

export default useDriverInterfaceStore;
