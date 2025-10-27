import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

export type LoadingPhase =
  | 'idle'
  | 'authenticating'
  | 'loading_assignment'
  | 'connecting_websocket'
  | 'authenticating_websocket'
  | 'ready'
  | 'error';

export interface LoadingState {
  phase: LoadingPhase;
  isLoading: boolean;
  progress: number;
  message: string;
  error: string | null;
  canRetry: boolean;
}

interface UseUnifiedLoadingStateOptions {
  onPhaseChange?: (phase: LoadingPhase) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export interface UseUnifiedLoadingStateResult {
  state: LoadingState;
  setPhase: (phase: LoadingPhase, message?: string) => void;
  setError: (error: string) => void;
  reset: () => void;
  retry: () => void;
}

/**
 * Unified loading state management hook
 * Coordinates all loading states across driver interface operations
 * Prevents UI inconsistencies by managing a single source of truth for loading state
 */
export function useUnifiedLoadingState(
  options: UseUnifiedLoadingStateOptions = {}
): UseUnifiedLoadingStateResult {
  const { onPhaseChange, onComplete, onError } = options;

  const [state, setState] = useState<LoadingState>({
    phase: 'idle',
    isLoading: false,
    progress: 0,
    message: '',
    error: null,
    canRetry: false,
  });

  const phaseRef = useRef<LoadingPhase>('idle');

  // Phase transitions with progress tracking
  const phaseConfig: Record<LoadingPhase, { progress: number; message: string }> = {
    idle: { progress: 0, message: 'Ready' },
    authenticating: { progress: 20, message: 'Authenticating driver...' },
    loading_assignment: { progress: 40, message: 'Loading bus assignment...' },
    connecting_websocket: { progress: 60, message: 'Connecting to real-time service...' },
    authenticating_websocket: { progress: 80, message: 'Authenticating connection...' },
    ready: { progress: 100, message: 'Dashboard ready' },
    error: { progress: 0, message: 'Error occurred' },
  };

  const setPhase = useCallback(
    (phase: LoadingPhase, customMessage?: string) => {
      if (phaseRef.current === phase) {
        return; // Avoid redundant state updates
      }

      const config = phaseConfig[phase];
      const isLoading = phase !== 'idle' && phase !== 'ready' && phase !== 'error';

      const newState: LoadingState = {
        phase,
        isLoading,
        progress: config.progress,
        message: customMessage || config.message,
        error: phase === 'error' ? state.error : null,
        canRetry: phase === 'error',
      };

      setState(newState);
      phaseRef.current = phase;

      logger.debug('Loading phase changed', 'useUnifiedLoadingState', {
        phase,
        progress: config.progress,
        message: newState.message,
      });

      if (onPhaseChange) {
        onPhaseChange(phase);
      }

      if (phase === 'ready' && onComplete) {
        onComplete();
      }
    },
    [state.error, onPhaseChange, onComplete]
  );

  const setError = useCallback(
    (error: string) => {
      setState((prev) => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        progress: 0,
        message: 'Error occurred',
        error,
        canRetry: true,
      }));
      phaseRef.current = 'error';

      logger.error('Loading error set', 'useUnifiedLoadingState', { error });

      if (onError) {
        onError(error);
      }
    },
    [onError]
  );

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      isLoading: false,
      progress: 0,
      message: '',
      error: null,
      canRetry: false,
    });
    phaseRef.current = 'idle';

    logger.debug('Loading state reset', 'useUnifiedLoadingState');
  }, []);

  const retry = useCallback(() => {
    if (!state.canRetry) {
      logger.warn('Cannot retry: retry not available', 'useUnifiedLoadingState');
      return;
    }

    setState((prev) => ({
      ...prev,
      phase: 'authenticating',
      isLoading: true,
      progress: 0,
      message: 'Retrying...',
      error: null,
      canRetry: false,
    }));
    phaseRef.current = 'authenticating';

    logger.debug('Retrying from error state', 'useUnifiedLoadingState');
  }, [state.canRetry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      phaseRef.current = 'idle';
    };
  }, []);

  return {
    state,
    setPhase,
    setError,
    reset,
    retry,
  };
}

export default useUnifiedLoadingState;
