import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '../utils/logger';

// Connection state
interface ConnectionState {
  // WebSocket connection
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  // Connection metrics
  connectionAttempts: number;
  lastConnectionTime: number | null;
  lastDisconnectionTime: number | null;
  connectionDuration: number | null;
  
  // Error handling
  connectionError: string | null;
  authenticationError: string | null;
  
  // Heartbeat
  lastHeartbeat: number | null;
  heartbeatInterval: number | null;
  missedHeartbeats: number;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
  isRetrying: boolean;
}

// Connection actions
interface ConnectionActions {
  // Connection control
  setConnected: (connected: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  
  // Error handling
  setConnectionError: (error: string | null) => void;
  setAuthenticationError: (error: string | null) => void;
  clearErrors: () => void;
  
  // Metrics
  recordConnectionAttempt: () => void;
  recordConnection: () => void;
  recordDisconnection: () => void;
  updateHeartbeat: () => void;
  incrementMissedHeartbeats: () => void;
  resetMissedHeartbeats: () => void;
  
  // Retry logic
  startRetry: () => void;
  stopRetry: () => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  
  // Reset
  resetAll: () => void;
}

// Combined store type
type ConnectionStore = ConnectionState & ConnectionActions;

// Initial state
const initialState: ConnectionState = {
  // WebSocket connection
  isConnected: false,
  isAuthenticated: false,
  connectionStatus: 'disconnected',
  
  // Connection metrics
  connectionAttempts: 0,
  lastConnectionTime: null,
  lastDisconnectionTime: null,
  connectionDuration: null,
  
  // Error handling
  connectionError: null,
  authenticationError: null,
  
  // Heartbeat
  lastHeartbeat: null,
  heartbeatInterval: null,
  missedHeartbeats: 0,
  
  // Retry logic
  retryCount: 0,
  maxRetries: 5,
  retryDelay: 1000,
  isRetrying: false,
};

// Create the store
export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Connection control
      setConnected: (connected) => {
        const state = get();
        const now = Date.now();
        
        set({
          isConnected: connected,
          connectionStatus: connected ? 'connected' : 'disconnected',
          lastConnectionTime: connected ? now : state.lastConnectionTime,
          lastDisconnectionTime: !connected ? now : state.lastDisconnectionTime,
          connectionDuration: connected && state.lastConnectionTime ? now - state.lastConnectionTime : null,
          connectionError: connected ? null : state.connectionError,
        });
        
        logger.debug('Connection status updated', 'connection-store', {
          connected,
          connectionAttempts: state.connectionAttempts,
        });
      },

      setAuthenticated: (authenticated) => {
        set({
          isAuthenticated: authenticated,
          authenticationError: authenticated ? null : get().authenticationError,
        });
        
        logger.debug('Authentication status updated', 'connection-store', { authenticated });
      },

      setConnectionStatus: (status) => {
        set({ connectionStatus: status });
        logger.debug('Connection status changed', 'connection-store', { status });
      },

      // Error handling
      setConnectionError: (error) => {
        set({
          connectionError: error,
          connectionStatus: error ? 'disconnected' : get().connectionStatus,
        });
        
        if (error) {
          logger.error('Connection error set', 'connection-store', { error });
        } else {
          logger.debug('Connection error cleared', 'connection-store');
        }
      },

      setAuthenticationError: (error) => {
        set({
          authenticationError: error,
          isAuthenticated: error ? false : get().isAuthenticated,
        });
        
        if (error) {
          logger.error('Authentication error set', 'connection-store', { error });
        } else {
          logger.debug('Authentication error cleared', 'connection-store');
        }
      },

      clearErrors: () => {
        set({
          connectionError: null,
          authenticationError: null,
        });
        logger.debug('All connection errors cleared', 'connection-store');
      },

      // Metrics
      recordConnectionAttempt: () => {
        set((prev) => ({
          connectionAttempts: prev.connectionAttempts + 1,
          connectionStatus: 'connecting',
        }));
        
        logger.debug('Connection attempt recorded', 'connection-store', {
          attempt: get().connectionAttempts,
        });
      },

      recordConnection: () => {
        const now = Date.now();
        set({
          lastConnectionTime: now,
          connectionAttempts: 0,
          retryCount: 0,
          missedHeartbeats: 0,
          connectionError: null,
          authenticationError: null,
        });
        
        logger.info('Connection recorded', 'connection-store', {
          connectionAttempts: get().connectionAttempts,
          retryCount: get().retryCount,
        });
      },

      recordDisconnection: () => {
        const now = Date.now();
        const state = get();
        const duration = state.lastConnectionTime ? now - state.lastConnectionTime : null;
        
        set({
          lastDisconnectionTime: now,
          connectionDuration: duration,
        });
        
        logger.info('Disconnection recorded', 'connection-store', {
          duration,
          connectionAttempts: state.connectionAttempts,
        });
      },

      updateHeartbeat: () => {
        set({
          lastHeartbeat: Date.now(),
          missedHeartbeats: 0,
        });
        
        logger.debug('Heartbeat updated', 'connection-store');
      },

      incrementMissedHeartbeats: () => {
        set((prev) => ({
          missedHeartbeats: prev.missedHeartbeats + 1,
        }));
        
        const missed = get().missedHeartbeats;
        logger.warn('Missed heartbeat', 'connection-store', { missed });
        
        // Consider connection lost after 3 missed heartbeats
        if (missed >= 3) {
          set({
            connectionStatus: 'disconnected',
            isConnected: false,
            isAuthenticated: false,
          });
          logger.error('Connection lost due to missed heartbeats', 'connection-store');
        }
      },

      resetMissedHeartbeats: () => {
        set({ missedHeartbeats: 0 });
        logger.debug('Missed heartbeats reset', 'connection-store');
      },

      // Retry logic
      startRetry: () => {
        set({ isRetrying: true });
        logger.debug('Retry started', 'connection-store');
      },

      stopRetry: () => {
        set({ isRetrying: false });
        logger.debug('Retry stopped', 'connection-store');
      },

      incrementRetryCount: () => {
        set((prev) => ({
          retryCount: prev.retryCount + 1,
        }));
        
        const retryCount = get().retryCount;
        logger.debug('Retry count incremented', 'connection-store', { retryCount });
        
        // Stop retrying after max retries
        if (retryCount >= get().maxRetries) {
          set({
            isRetrying: false,
            connectionError: 'Maximum retry attempts exceeded',
          });
          logger.error('Maximum retry attempts exceeded', 'connection-store');
        }
      },

      resetRetryCount: () => {
        set({ retryCount: 0 });
        logger.debug('Retry count reset', 'connection-store');
      },

      // Reset
      resetAll: () => {
        set(initialState);
        logger.info('Connection store reset to initial state', 'connection-store');
      },
    })),
    {
      name: 'connection-store',
      partialize: (state: ConnectionStore) => ({
        // Persist connection metrics
        connectionAttempts: state.connectionAttempts,
        lastConnectionTime: state.lastConnectionTime,
        retryCount: state.retryCount,
      }),
    }
  )
);

// Selector hooks for better performance
export const useConnectionStatus = () => useConnectionStore((state) => ({
  isConnected: state.isConnected,
  isAuthenticated: state.isAuthenticated,
  connectionStatus: state.connectionStatus,
  isFullyConnected: state.isConnected && state.isAuthenticated,
}));

export const useConnectionMetrics = () => useConnectionStore((state) => ({
  connectionAttempts: state.connectionAttempts,
  lastConnectionTime: state.lastConnectionTime,
  lastDisconnectionTime: state.lastDisconnectionTime,
  connectionDuration: state.connectionDuration,
  retryCount: state.retryCount,
  maxRetries: state.maxRetries,
}));

export const useConnectionErrors = () => useConnectionStore((state) => ({
  connectionError: state.connectionError,
  authenticationError: state.authenticationError,
  hasError: !!(state.connectionError || state.authenticationError),
}));

export const useConnectionHeartbeat = () => useConnectionStore((state) => ({
  lastHeartbeat: state.lastHeartbeat,
  missedHeartbeats: state.missedHeartbeats,
  heartbeatInterval: state.heartbeatInterval,
}));

// Action hooks
export const useConnectionActions = () => useConnectionStore((state) => ({
  setConnected: state.setConnected,
  setAuthenticated: state.setAuthenticated,
  setConnectionStatus: state.setConnectionStatus,
  setConnectionError: state.setConnectionError,
  setAuthenticationError: state.setAuthenticationError,
  clearErrors: state.clearErrors,
  recordConnectionAttempt: state.recordConnectionAttempt,
  recordConnection: state.recordConnection,
  recordDisconnection: state.recordDisconnection,
  updateHeartbeat: state.updateHeartbeat,
  incrementMissedHeartbeats: state.incrementMissedHeartbeats,
  resetMissedHeartbeats: state.resetMissedHeartbeats,
  startRetry: state.startRetry,
  stopRetry: state.stopRetry,
  incrementRetryCount: state.incrementRetryCount,
  resetRetryCount: state.resetRetryCount,
  resetAll: state.resetAll,
}));

// Computed selectors
export const useConnectionHealth = () => useConnectionStore((state) => ({
  isHealthy: state.isConnected && state.isAuthenticated && state.missedHeartbeats < 3,
  needsRetry: !state.isConnected && state.retryCount < state.maxRetries && !state.isRetrying,
  shouldReconnect: state.connectionStatus === 'disconnected' && !state.isRetrying,
  connectionQuality: state.missedHeartbeats === 0 ? 'excellent' : 
                    state.missedHeartbeats < 2 ? 'good' : 
                    state.missedHeartbeats < 3 ? 'poor' : 'critical',
}));

// Store subscription utilities
export const subscribeToConnectionChanges = (callback: (state: ConnectionStore) => void) => {
  return useConnectionStore.subscribe(callback as (state: ConnectionStore) => void);
};

export const subscribeToConnectionStatus = (callback: (status: 'connected' | 'connecting' | 'disconnected') => void) => {
  return useConnectionStore.subscribe(
    (state: ConnectionStore) => state.connectionStatus,
    callback,
    {
      equalityFn: (a: string, b: string) => a === b,
    }
  );
};

export const subscribeToAuthenticationStatus = (callback: (isAuthenticated: boolean) => void) => {
  return useConnectionStore.subscribe(
    (state) => state.isAuthenticated,
    callback,
    {
      equalityFn: (a, b) => a === b,
    }
  );
};

export default useConnectionStore;
