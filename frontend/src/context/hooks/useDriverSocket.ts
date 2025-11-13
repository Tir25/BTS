/**
 * useDriverSocket Hook
 * Handles WebSocket connection, events, and cleanup for driver authentication
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedWebSocketService } from '../../services/UnifiedWebSocketService';
import { logger } from '../../utils/logger';

interface UseDriverSocketReturn {
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  isWebSocketInitializing: boolean;
  retryConnection: () => Promise<void>;
  cleanup: () => void;
  setIsWebSocketConnected: (value: boolean) => void;
  setIsWebSocketAuthenticated: (value: boolean) => void;
  setIsWebSocketInitializing: (value: boolean) => void;
}

interface UseDriverSocketParams {
  isAuthenticated: boolean;
  isDriver: boolean;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook for managing WebSocket connection state and operations
 */
export function useDriverSocket({
  isAuthenticated,
  isDriver,
  setIsLoading,
  setError,
}: UseDriverSocketParams): UseDriverSocketReturn {
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isWebSocketAuthenticated, setIsWebSocketAuthenticated] = useState(false);
  const [isWebSocketInitializing, setIsWebSocketInitializing] = useState(false);

  const retryConnection = useCallback(async () => {
    // PRODUCTION FIX: Prevent duplicate retry attempts
    if (isConnectingRef.current) {
      logger.debug('WebSocket retry already in progress, skipping duplicate attempt', 'driver-socket');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    try {
      if (isAuthenticated && isDriver) {
        logger.info('🔄 Retrying WebSocket connection...', 'driver-socket');
        isConnectingRef.current = true;
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        
        // CRITICAL FIX: Set client type BEFORE disconnecting/connecting
        unifiedWebSocketService.setClientType('driver');
        
        // CRITICAL FIX: Always disconnect first to ensure clean reconnection
        unifiedWebSocketService.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // CRITICAL FIX: Check if already connected after disconnect (shouldn't be, but safety check)
        const connectionStatus = unifiedWebSocketService.getConnectionStatus();
        if (connectionStatus) {
          logger.warn('⚠️ WebSocket still connected after disconnect, skipping retry', 'driver-socket');
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(true);
          const stats = unifiedWebSocketService.getConnectionStats();
          setIsWebSocketAuthenticated(stats.isAuthenticated || false);
          isConnectingRef.current = false;
          return;
        }
        
        await unifiedWebSocketService.connect();
        
        // CRITICAL FIX: Wait for socket to be fully connected before initializing
        // The connect() promise resolves when connection starts, but socket might not be connected yet
        let isConnected = unifiedWebSocketService.getConnectionStatus();
        if (!isConnected) {
          // Wait for connection to be established (max 5 seconds)
          let attempts = 0;
          const maxAttempts = 50; // 50 * 100ms = 5 seconds
          const { connectionManager } = await import('../../services/websocket/connectionManager');
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            isConnected = connectionManager.getConnectionStatus();
            if (isConnected) {
              logger.info('✅ WebSocket connection confirmed', 'driver-socket');
              break;
            }
            attempts++;
          }
          
          if (!isConnected) {
            logger.error('❌ WebSocket connection timeout - socket not connected after 5 seconds', 'driver-socket');
            throw new Error('WebSocket connection timeout');
          }
        }
        
        // Now initialize as driver
        const initResult = await unifiedWebSocketService.initializeAsDriver();
        if (initResult) {
          setIsWebSocketConnected(true);
          setIsWebSocketAuthenticated(true);
          setIsWebSocketInitializing(false);
          logger.info('✅ WebSocket connection retried successfully', 'driver-socket');
        } else {
          logger.warn('⚠️ WebSocket driver initialization returned false', 'driver-socket');
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
        }
      } else {
        logger.warn('⚠️ Cannot retry WebSocket: not authenticated or not a driver', 'driver-socket');
        setError('Not authenticated as driver');
      }
    } catch (err) {
      // PRODUCTION FIX: Don't log error here - already logged in connectionManager
      // Just update state and set user-facing error
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to reconnect: ${errorMessage}`);
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    } finally {
      isConnectingRef.current = false;
      setIsLoading(false);
    }
  }, [isAuthenticated, isDriver, setIsLoading, setError]);

  // Handle WebSocket connection when authenticated
  // CRITICAL FIX: Use ref to prevent duplicate connection attempts
  const connectionAttemptRef = useRef<Promise<void> | null>(null);
  const isConnectingRef = useRef(false);
  
  useEffect(() => {
    let isMounted = true;
    const connectWebSocket = async () => {
      // CRITICAL FIX: Prevent duplicate connection attempts
      if (isConnectingRef.current) {
        logger.debug('WebSocket connection already in progress, skipping duplicate attempt', 'driver-socket');
        return;
      }
      
      // CRITICAL FIX: Check if already connected with correct client type
      const connectionStatus = unifiedWebSocketService.getConnectionStatus();
      if (connectionStatus) {
        logger.info('✅ WebSocket already connected for driver', 'driver-socket');
        setIsWebSocketInitializing(false);
        setIsWebSocketConnected(true);
        // Check authentication state
        const stats = unifiedWebSocketService.getConnectionStats();
        setIsWebSocketAuthenticated(stats.isAuthenticated || false);
        return;
      }
      
      if (!isMounted) return;
      
      try {
        isConnectingRef.current = true;
        setIsWebSocketInitializing(true);
        setIsWebSocketConnected(false);
        setIsWebSocketAuthenticated(false);
        
        // CRITICAL FIX: Set client type BEFORE connecting to prevent race conditions
        unifiedWebSocketService.setClientType('driver');
        
        // CRITICAL FIX: Store connection promise to prevent duplicates
        const connectionPromise = unifiedWebSocketService.connect();
        connectionAttemptRef.current = connectionPromise;
        
        await connectionPromise;
        
        // CRITICAL FIX: Wait for socket to be fully connected before initializing
        // The connect() promise resolves when connection starts, but socket might not be connected yet
        // IMPORTANT: For drivers, getConnectionStatus() requires authentication, so we check connectionManager directly
        const { connectionManager } = await import('../../services/websocket/connectionManager');
        let isConnected = connectionManager.getConnectionStatus();
        if (!isConnected) {
          // Wait for connection to be established (max 5 seconds)
          let attempts = 0;
          const maxAttempts = 50; // 50 * 100ms = 5 seconds
          while (attempts < maxAttempts && isMounted) {
            await new Promise(resolve => setTimeout(resolve, 100));
            isConnected = connectionManager.getConnectionStatus();
            if (isConnected) {
              logger.info('✅ WebSocket connection confirmed', 'driver-socket');
              break;
            }
            attempts++;
          }
          
          if (!isConnected && isMounted) {
            logger.error('❌ WebSocket connection timeout - socket not connected after 5 seconds', 'driver-socket');
            throw new Error('WebSocket connection timeout');
          }
        }
        
        if (!isMounted) return;
        
        // Now initialize as driver
        const initResult = await unifiedWebSocketService.initializeAsDriver();
        if (isMounted) {
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(true);
          setIsWebSocketAuthenticated(initResult);
          if (initResult) {
            logger.info('✅ WebSocket connected and authenticated as driver', 'driver-socket');
          } else {
            // PRODUCTION FIX: Log initialization failure with details
            logger.error('❌ WebSocket driver initialization failed', 'driver-socket', {
              isConnected: unifiedWebSocketService.getConnectionStatus(),
              clientType: 'driver',
              suggestion: 'Check if driver has a bus assignment in the database'
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          // PRODUCTION FIX: Don't log error here - already logged in connectionManager
          // But check error type to provide better user feedback
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorCode = (err as any)?.code || '';
          const isAuthError = (err as any)?.isAuthError || false;
          const isNetworkError = (err as any)?.isNetworkError || false;
          
          // Set user-friendly error message based on error type
          if (isAuthError) {
            setError('Authentication failed. Please log out and log in again.');
          } else if (isNetworkError) {
            setError('Cannot connect to server. Please ensure the backend server is running.');
          } else {
            setError(`Connection failed: ${errorMessage}`);
          }
          
          setIsWebSocketInitializing(false);
          setIsWebSocketConnected(false);
          setIsWebSocketAuthenticated(false);
        }
      } finally {
        isConnectingRef.current = false;
        connectionAttemptRef.current = null;
      }
    };

    // Subscribe to connection state changes
    let unsubscribeConnectionState: (() => void) | null = null;
    try {
      unsubscribeConnectionState = unifiedWebSocketService.onConnectionStateChange((state) => {
        try {
          if (!isMounted) return;
          setIsWebSocketInitializing(state.connectionState === 'connecting' || state.connectionState === 'reconnecting');
          setIsWebSocketConnected(state.isConnected);
          setIsWebSocketAuthenticated(state.isAuthenticated);
        } catch (error) {
          logger.error('Error updating WebSocket state in useDriverSocket', 'driver-socket', { error });
        }
      });
    } catch (error) {
      logger.error('Error subscribing to WebSocket connection state', 'driver-socket', { error });
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    }
    
    if (isAuthenticated && isDriver) {
      connectWebSocket();
    } else {
      // PRODUCTION FIX: Only disconnect if we were previously connected
      // This prevents unnecessary disconnect calls during component initialization
      const wasConnected = unifiedWebSocketService.getConnectionStatus();
      if (wasConnected) {
        unifiedWebSocketService.disconnect();
      }
      setIsWebSocketInitializing(false);
      setIsWebSocketConnected(false);
      setIsWebSocketAuthenticated(false);
    }
    
    return () => {
      isMounted = false;
      isConnectingRef.current = false;
      connectionAttemptRef.current = null;
      try {
        if (unsubscribeConnectionState) {
          unsubscribeConnectionState();
        }
      } catch (error) {
        logger.warn('Error unsubscribing from connection state', 'driver-socket', { error });
      }
      // CRITICAL FIX: Only disconnect if we're not authenticated anymore
      // This prevents disconnecting when component re-renders but user is still authenticated
      if (!isAuthenticated || !isDriver) {
        try {
          unifiedWebSocketService.disconnect();
        } catch (error) {
          logger.warn('Error disconnecting WebSocket', 'driver-socket', { error });
        }
      }
    };
  }, [isAuthenticated, isDriver]);

  // Expose cleanup function for logout
  const cleanup = useCallback(() => {
    unifiedWebSocketService.disconnect();
    setIsWebSocketInitializing(false);
    setIsWebSocketConnected(false);
    setIsWebSocketAuthenticated(false);
  }, []);

  return {
    isWebSocketConnected,
    isWebSocketAuthenticated,
    isWebSocketInitializing,
    retryConnection,
    setIsWebSocketConnected,
    setIsWebSocketAuthenticated,
    setIsWebSocketInitializing,
    cleanup,
  };
}

