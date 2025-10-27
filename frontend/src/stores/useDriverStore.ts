import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { DriverBusAssignment } from '../services/authService';
import { logger } from '../utils/logger';

// Driver authentication and assignment state
interface DriverAuthState {
  // Authentication
  isAuthenticated: boolean;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Driver data
  driverId: string | null;
  driverEmail: string | null;
  driverName: string | null;
  busAssignment: DriverBusAssignment | null;
  
  // WebSocket connection
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  
  // UI state
  isInitializing: boolean;
  initializationError: string | null;
  showTestMode: boolean;
}

// Driver actions
interface DriverActions {
  // Authentication actions
  setAuthState: (state: Partial<Pick<DriverAuthState, 'isAuthenticated' | 'isDriver' | 'isLoading' | 'error'>>) => void;
  setDriverData: (data: {
    driverId?: string | null;
    driverEmail?: string | null;
    driverName?: string | null;
    busAssignment?: DriverBusAssignment | null;
  }) => void;
  
  // Connection actions
  setConnectionState: (state: {
    isWebSocketConnected?: boolean;
    isWebSocketAuthenticated?: boolean;
  }) => void;
  
  // UI actions
  setInitializationState: (state: {
    isInitializing?: boolean;
    initializationError?: string | null;
  }) => void;
  toggleTestMode: () => void;
  clearError: () => void;
  clearInitializationError: () => void;
  
  // Assignment actions
  updateBusAssignment: (assignment: DriverBusAssignment | null) => void;
  clearAssignment: () => void;
  
  // Reset actions
  resetAuth: () => void;
  resetAll: () => void;
}

// Combined store type
type DriverStore = DriverAuthState & DriverActions;

// Initial state
const initialState: DriverAuthState = {
  // Authentication
  isAuthenticated: false,
  isDriver: false,
  isLoading: true,
  error: null,
  
  // Driver data
  driverId: null,
  driverEmail: null,
  driverName: null,
  busAssignment: null,
  
  // WebSocket connection
  isWebSocketConnected: false,
  isWebSocketAuthenticated: false,
  
  // UI state
  isInitializing: true,
  initializationError: null,
  showTestMode: false,
};

// Create the store
export const useDriverStore = create<DriverStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Authentication actions
      setAuthState: (state) => {
        set((prev) => ({
          ...prev,
          ...state,
        }));
        
        logger.debug('Driver auth state updated', 'driver-store', state);
      },

      setDriverData: (data) => {
        set((prev) => ({
          ...prev,
          ...data,
        }));
        
        logger.debug('Driver data updated', 'driver-store', data);
      },

      // Connection actions
      setConnectionState: (state) => {
        set((prev) => ({
          ...prev,
          ...state,
        }));
        
        logger.debug('Connection state updated', 'driver-store', state);
      },

      // UI actions
      setInitializationState: (state) => {
        set((prev) => ({
          ...prev,
          ...state,
        }));
        
        logger.debug('Initialization state updated', 'driver-store', state);
      },

      toggleTestMode: () => {
        set((prev) => ({
          showTestMode: !prev.showTestMode,
        }));
        
        logger.debug('Test mode toggled', 'driver-store');
      },

      clearError: () => {
        set({ error: null });
        logger.debug('Error cleared', 'driver-store');
      },

      clearInitializationError: () => {
        set({ initializationError: null });
        logger.debug('Initialization error cleared', 'driver-store');
      },

      // Assignment actions
      updateBusAssignment: (assignment) => {
        set({ busAssignment: assignment });
        logger.info('Bus assignment updated', 'driver-store', {
          hasAssignment: !!assignment,
          busNumber: assignment?.bus_number,
          routeName: assignment?.route_name,
        });
      },

      clearAssignment: () => {
        set({ busAssignment: null });
        logger.debug('Bus assignment cleared', 'driver-store');
      },

      // Reset actions
      resetAuth: () => {
        set({
          isAuthenticated: false,
          isDriver: false,
          isLoading: false,
          error: null,
          driverId: null,
          driverEmail: null,
          driverName: null,
          busAssignment: null,
          isWebSocketConnected: false,
          isWebSocketAuthenticated: false,
        });
        logger.info('Driver auth reset', 'driver-store');
      },

      resetAll: () => {
        set(initialState);
        logger.info('Driver store reset to initial state', 'driver-store');
      },
    })),
    {
      name: 'driver-store',
      partialize: (state: DriverStore) => ({
        // Only persist essential auth state
        isAuthenticated: state.isAuthenticated,
        driverId: state.driverId,
        driverEmail: state.driverEmail,
        busAssignment: state.busAssignment,
      }),
    }
  )
);

// Selector hooks for better performance
export const useDriverAuth = () => useDriverStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  isDriver: state.isDriver,
  isLoading: state.isLoading,
  error: state.error,
  driverId: state.driverId,
  driverEmail: state.driverEmail,
  driverName: state.driverName,
}));

export const useDriverAssignment = () => useDriverStore((state) => ({
  busAssignment: state.busAssignment,
  hasAssignment: !!state.busAssignment,
}));

export const useDriverConnection = () => useDriverStore((state) => ({
  isWebSocketConnected: state.isWebSocketConnected,
  isWebSocketAuthenticated: state.isWebSocketAuthenticated,
  connectionStatus: state.isWebSocketConnected && state.isWebSocketAuthenticated 
    ? 'connected' 
    : state.isWebSocketConnected 
      ? 'connecting' 
      : 'disconnected',
}));

export const useDriverUI = () => useDriverStore((state) => ({
  isInitializing: state.isInitializing,
  initializationError: state.initializationError,
  showTestMode: state.showTestMode,
}));

// Action hooks
export const useDriverActions = () => useDriverStore((state) => ({
  setAuthState: state.setAuthState,
  setDriverData: state.setDriverData,
  setConnectionState: state.setConnectionState,
  setInitializationState: state.setInitializationState,
  toggleTestMode: state.toggleTestMode,
  clearError: state.clearError,
  clearInitializationError: state.clearInitializationError,
  updateBusAssignment: state.updateBusAssignment,
  clearAssignment: state.clearAssignment,
  resetAuth: state.resetAuth,
  resetAll: state.resetAll,
}));

// Computed selectors
export const useDriverStatus = () => useDriverStore((state) => ({
  isReady: state.isAuthenticated && state.isDriver && !!state.busAssignment && !state.isLoading,
  canTrackLocation: state.isAuthenticated && state.isDriver && state.isWebSocketAuthenticated,
  hasError: !!state.error || !!state.initializationError,
  isFullyConnected: state.isWebSocketConnected && state.isWebSocketAuthenticated,
}));

// Store subscription utilities
export const subscribeToDriverChanges = (callback: (state: DriverStore) => void) => {
  return useDriverStore.subscribe(callback as (state: DriverStore) => void);
};

export const subscribeToAuthChanges = (callback: (authState: Pick<DriverStore, 'isAuthenticated' | 'isDriver' | 'isLoading' | 'error'>) => void) => {
  return useDriverStore.subscribe(
    (state: DriverStore) => ({
      isAuthenticated: state.isAuthenticated,
      isDriver: state.isDriver,
      isLoading: state.isLoading,
      error: state.error,
    }),
    callback,
    {
      equalityFn: (a: Pick<DriverStore, 'isAuthenticated' | 'isDriver' | 'isLoading' | 'error'>, b: Pick<DriverStore, 'isAuthenticated' | 'isDriver' | 'isLoading' | 'error'>) => 
        a.isAuthenticated === b.isAuthenticated &&
        a.isDriver === b.isDriver &&
        a.isLoading === b.isLoading &&
        a.error === b.error,
    }
  );
};

export const subscribeToAssignmentChanges = (callback: (assignment: DriverBusAssignment | null) => void) => {
  return useDriverStore.subscribe(
    (state) => state.busAssignment,
    callback,
    {
      equalityFn: (a, b) => 
        a?.driver_id === b?.driver_id &&
        a?.bus_id === b?.bus_id &&
        a?.route_id === b?.route_id,
    }
  );
};

export default useDriverStore;
