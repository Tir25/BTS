/**
 * Error component for driver interface
 */
import React from 'react';

export interface DriverInterfaceErrorProps {
  error: string;
  onRetry?: () => void;
  onRetryConnection?: () => void;
  onSignOut?: () => void;
}

/**
 * Displays error state with retry options
 */
export const DriverInterfaceError: React.FC<DriverInterfaceErrorProps> = ({
  error,
  onRetry,
  onRetryConnection,
  onSignOut,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Error Loading Interface
          </h3>
          <p className="text-red-800 mb-4">{error}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {onRetry && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly"
              >
                Retry
              </button>
            )}
            {onRetryConnection && (
              <button
                onClick={onRetryConnection}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly"
              >
                Retry Connection
              </button>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverInterfaceError;

