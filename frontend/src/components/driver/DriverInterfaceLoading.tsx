/**
 * Loading component for driver interface
 */
import React from 'react';

export interface DriverInterfaceLoadingProps {
  loadingState: {
    isLoading: boolean;
    progress: number;
    message?: string;
    phase?: string;
    canRetry?: boolean;
  };
  initializationError?: string | null;
  error?: string | null;
  onRetry?: () => void;
  onDismissError?: () => void;
}

/**
 * Displays loading state with progress indication
 */
export const DriverInterfaceLoading: React.FC<DriverInterfaceLoadingProps> = ({
  loadingState,
  initializationError,
  error,
  onRetry,
  onDismissError,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center max-w-md w-full px-4">
        {/* Loading spinner */}
        <div className="loading-spinner mx-auto mb-6" />
        
        {/* Progress bar */}
        {loadingState.progress > 0 && (
          <div className="mb-4">
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
            <p className="text-slate-600 text-xs mt-1">{loadingState.progress}%</p>
          </div>
        )}
        
        {/* Loading message */}
        <p className="text-slate-900 text-lg font-medium mb-2">
          {loadingState.message || 'Loading driver interface...'}
        </p>
        
        {/* Phase-specific message */}
        {loadingState.phase && loadingState.phase !== 'idle' && (
          <p className="text-slate-600 text-sm">
            {loadingState.phase === 'authenticating' && 'Verifying your credentials...'}
            {loadingState.phase === 'loading_assignment' && 'Fetching your bus assignment...'}
            {loadingState.phase === 'connecting_websocket' && 'Establishing real-time connection...'}
            {loadingState.phase === 'authenticating_websocket' && 'Securing connection...'}
          </p>
        )}
        
        {/* Error notification */}
        {(initializationError || error) && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-300">
            <p className="text-yellow-900 text-sm">
              {initializationError || error}
            </p>
            {(onRetry || onDismissError) && (
              <button
                onClick={() => {
                  if (onDismissError) onDismissError();
                  if (loadingState.canRetry && onRetry) {
                    onRetry();
                  }
                }}
                className="mt-2 text-yellow-700 hover:text-yellow-800 text-xs underline font-medium"
              >
                {loadingState.canRetry ? 'Retry' : 'Dismiss'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverInterfaceLoading;

