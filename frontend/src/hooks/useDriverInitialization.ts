import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (mode !== 'dashboard') return;

    let targetPhase: string = 'idle';
    let phaseMessage = '';

    // PRODUCTION FIX: Improved phase detection with better timeout handling
    // Don't get stuck at authenticating if we're authenticated but loading assignment
    if (driverState.isLoading && !driverState.isAuthenticated) {
      targetPhase = 'authenticating';
      phaseMessage = 'Authenticating driver...';
    } else if (driverState.isAuthenticated && !driverState.busAssignment && driverState.isLoading) {
      // PRODUCTION FIX: Show assignment loading phase even if authenticated
      targetPhase = 'loading_assignment';
      phaseMessage = 'Loading bus assignment...';
    } else if (driverState.isAuthenticated && !driverState.busAssignment && !driverState.isLoading) {
      // PRODUCTION FIX: If authenticated but no assignment and not loading, still show ready
      // Don't block dashboard access if assignment fetch failed
      targetPhase = 'ready';
      phaseMessage = 'Dashboard ready';
    } else if (driverState.isAuthenticated && driverState.busAssignment && !driverState.isWebSocketConnected) {
      targetPhase = 'connecting_websocket';
      phaseMessage = 'Connecting to real-time service...';
    } else if (driverState.isWebSocketConnected && !driverState.isWebSocketAuthenticated) {
      targetPhase = 'authenticating_websocket';
      phaseMessage = 'Authenticating connection...';
    } else if (
      driverState.isAuthenticated &&
      driverState.isWebSocketConnected &&
      driverState.isWebSocketAuthenticated &&
      !driverState.isLoading &&
      !driverState.isInitializing
    ) {
      // PRODUCTION FIX: Allow ready state even without assignment
      targetPhase = 'ready';
      phaseMessage = 'Dashboard ready';
    } else if (driverState.error || driverState.initializationError) {
      if (currentPhaseRef.current !== 'error') {
        loadingStateRef.current.setError(driverState.error || driverState.initializationError || 'An error occurred');
        currentPhaseRef.current = 'error';
      }
      return;
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


