import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

interface LoadingState {
  state: { isLoading: boolean; message?: string; progress: number; phase: string; canRetry?: boolean };
  setPhase: (phase: 'authenticating' | 'loading_assignment' | 'connecting_websocket' | 'authenticating_websocket' | 'ready', message: string) => void;
  setError: (message: string) => void;
}

interface DriverStateLike {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  busAssignment: any;
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  error?: string | null;
  initializationError?: string | null;
}

export function useDriverInitialization(
  mode: 'login' | 'dashboard',
  driverState: DriverStateLike,
  loadingState: LoadingState
) {
  const currentPhaseRef = useRef<string>('idle');
  const loadingStateRef = useRef(loadingState);
  loadingStateRef.current = loadingState;
  const authenticatingPhaseStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== 'dashboard') return;

    let targetPhase: string = 'idle';
    let phaseMessage = '';

    // PRODUCTION FIX: Improved phase detection with better timeout handling
    // Priority order: error > authenticated ready > loading states
    if (driverState.error || driverState.initializationError) {
      if (currentPhaseRef.current !== 'error') {
        loadingStateRef.current.setError(driverState.error || driverState.initializationError || 'An error occurred');
        currentPhaseRef.current = 'error';
      }
      return;
    }
    
    // PRODUCTION FIX: Timeout protection - if we've been at "authenticating" for too long, progress anyway
    // This prevents getting stuck at 20% when profile loading is slow
    const AUTHENTICATING_TIMEOUT = 8000; // 8 seconds max at authenticating phase
    
    // Track when we enter authenticating phase
    if (currentPhaseRef.current !== 'authenticating' && driverState.isLoading && !driverState.isAuthenticated) {
      authenticatingPhaseStartRef.current = Date.now();
    } else if (currentPhaseRef.current === 'authenticating' && driverState.isAuthenticated) {
      // Clear timer if we've authenticated
      authenticatingPhaseStartRef.current = null;
    }
    
    if (currentPhaseRef.current === 'authenticating' && authenticatingPhaseStartRef.current) {
      const timeAtPhase = Date.now() - authenticatingPhaseStartRef.current;
      if (timeAtPhase > AUTHENTICATING_TIMEOUT && driverState.isAuthenticated) {
        // Force progress if authenticated but stuck at authenticating phase
        logger.warn('⚠️ Forcing progress past authenticating phase due to timeout', 'driver-initialization', {
          timeAtPhase,
          isAuthenticated: driverState.isAuthenticated
        });
        targetPhase = driverState.busAssignment ? 'ready' : 'loading_assignment';
        phaseMessage = driverState.busAssignment ? 'Dashboard ready' : 'Loading bus assignment...';
        if (currentPhaseRef.current !== targetPhase) {
          currentPhaseRef.current = targetPhase;
          loadingStateRef.current.setPhase(targetPhase as any, phaseMessage);
          authenticatingPhaseStartRef.current = null; // Clear timer
        }
        return;
      }
    }
    
    // PRODUCTION FIX: Improved phase detection with priority order and timeout protection
    // Priority: authenticated ready > loading states > fallback ready
    // Critical: Don't get stuck at 20% - if authenticated, always progress
    // PRODUCTION FIX: Check both isAuthenticated and !isLoading to handle edge cases
    // If authenticated OR not loading, we should progress (don't wait for both)
    
    // PRODUCTION FIX: If authenticated, always progress (don't wait for isLoading)
    // This prevents getting stuck at 20% when authentication completes but isLoading hasn't cleared yet
    // Also check if not loading - if not loading, we're past authentication phase
    if (driverState.isAuthenticated || (!driverState.isLoading && !driverState.isInitializing)) {
      // If authenticated with assignment but WebSocket not connected, show connecting
      if (driverState.isAuthenticated && driverState.busAssignment && !driverState.isWebSocketConnected) {
        targetPhase = 'connecting_websocket';
        phaseMessage = 'Connecting to real-time service...';
      }
      // If WebSocket connected but not authenticated, show authenticating WebSocket
      else if (driverState.isWebSocketConnected && !driverState.isWebSocketAuthenticated) {
        targetPhase = 'authenticating_websocket';
        phaseMessage = 'Authenticating connection...';
      }
      // If we have bus assignment, we're ready
      else if (driverState.busAssignment) {
        targetPhase = 'ready';
        phaseMessage = 'Dashboard ready';
      } 
      // If authenticated but no assignment yet, show assignment loading
      else {
        targetPhase = 'loading_assignment';
        phaseMessage = 'Loading bus assignment...';
      }
    } 
    // If loading and not authenticated, show authenticating
    else if (driverState.isLoading && !driverState.isAuthenticated) {
      targetPhase = 'authenticating';
      phaseMessage = 'Authenticating driver...';
    }

    if (currentPhaseRef.current !== targetPhase && targetPhase !== 'idle') {
      currentPhaseRef.current = targetPhase;
      loadingStateRef.current.setPhase(targetPhase as any, phaseMessage);
    }
  }, [
    mode,
    driverState.isAuthenticated,
    driverState.isLoading,
    driverState.isInitializing,
    driverState.busAssignment,
    driverState.isWebSocketConnected,
    driverState.isWebSocketAuthenticated,
    driverState.error,
    driverState.initializationError,
  ]);
}


