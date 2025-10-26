import React from 'react';

interface DriverControlsProps {
  isTracking: boolean;
  isAuthenticated: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  onStartTracking: () => void;
  onStopTracking: () => void;
  lastUpdateTime: string | null;
  updateCount: number;
  locationError?: string | null;
  onClearError?: () => void;
  onRequestPermission?: () => Promise<boolean>;
}

const DriverControls: React.FC<DriverControlsProps> = ({
  isTracking,
  isAuthenticated,
  connectionStatus,
  onStartTracking,
  onStopTracking,
  lastUpdateTime,
  updateCount,
  locationError,
  onClearError,
  onRequestPermission,
}) => {
  const canStartTracking = isAuthenticated && connectionStatus === 'connected' && !isTracking;
  const canStopTracking = isAuthenticated && isTracking;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎮</span>
        Tracking Controls
      </h3>
      
      <div className="space-y-4">
        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStartTracking}
            disabled={!canStartTracking}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              canStartTracking
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl">▶️</span>
              Start Tracking
            </span>
          </button>
          
          <button
            onClick={onStopTracking}
            disabled={!canStopTracking}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              canStopTracking
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl">⏹️</span>
              Stop Tracking
            </span>
          </button>
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-200 mb-2">📊 Tracking Status</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-100">Status:</span>
                <span className={`font-medium ${
                  isTracking ? 'text-green-300' : 'text-yellow-300'
                }`}>
                  {isTracking ? '🟢 Active' : '🟡 Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Updates:</span>
                <span className="text-blue-200 font-medium">{updateCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-200 mb-2">🕒 Last Update</h4>
            <div className="text-sm">
              {lastUpdateTime ? (
                <div className="space-y-1">
                  <div className="text-green-100">
                    {new Date(lastUpdateTime).toLocaleTimeString()}
                  </div>
                  <div className="text-green-200 text-xs">
                    {new Date(lastUpdateTime).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-green-300">No updates yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4">
          <h4 className="font-semibold text-purple-200 mb-2">🔗 Connection Status</h4>
          <div className="flex items-center justify-between">
            <span className="text-purple-100 text-sm">WebSocket:</span>
            <span className={`text-sm font-medium ${
              connectionStatus === 'connected' ? 'text-green-300' :
              connectionStatus === 'connecting' ? 'text-yellow-300' :
              'text-red-300'
            }`}>
              {connectionStatus === 'connected' ? '🟢 Connected' :
               connectionStatus === 'connecting' ? '🟡 Connecting...' :
               '🔴 Disconnected'}
            </span>
          </div>
        </div>

        {/* Location Error Handling */}
        {locationError && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-200 mb-2">⚠️ Location Error</h4>
            <p className="text-red-100 text-sm mb-3 whitespace-pre-line">{locationError}</p>
            <div className="flex gap-2">
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  Clear Error
                </button>
              )}
              {onRequestPermission && (
                <button
                  onClick={onRequestPermission}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  Request Permission
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverControls;
