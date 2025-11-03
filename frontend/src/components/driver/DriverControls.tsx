import React from 'react';
import { DriverControlsProps } from '../../types/driver';
import { formatLastUpdate } from '../../utils/dateFormatter';
import { categorizeAccuracy } from '../../utils/gpsDetection';

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
  accuracy,
  accuracyLevel,
  accuracyMessage,
  accuracyWarning,
}) => {
  // IMPROVED: More lenient tracking conditions
  const canStartTracking = isAuthenticated && !isTracking;
  const canStopTracking = isAuthenticated && isTracking;
  
  // Show connection status for debugging
  const getConnectionStatusText = () => {
    if (connectionStatus === 'connected') return '🟢 Connected';
    if (connectionStatus === 'connecting') return '🟡 Connecting...';
    if (connectionStatus === 'reconnecting') return '🔄 Reconnecting...';
    return '🔴 Disconnected';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span className="text-2xl">🎮</span>
        Tracking Controls
      </h3>
      
      <div className="space-y-4">
        {/* Control Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onStartTracking}
            disabled={!canStartTracking}
            className={`w-full px-6 py-4 rounded-lg font-medium transition-all duration-200 min-h-[48px] touch-friendly ${
              canStartTracking
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl">▶️</span>
              <span className="text-base sm:text-lg">Start Tracking</span>
            </span>
          </button>
          
          <button
            onClick={onStopTracking}
            disabled={!canStopTracking}
            className={`w-full px-6 py-4 rounded-lg font-medium transition-all duration-200 min-h-[48px] touch-friendly ${
              canStopTracking
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl">⏹️</span>
              <span className="text-base sm:text-lg">Stop Tracking</span>
            </span>
          </button>
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📊 Tracking Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Status:</span>
                <span className={`font-medium ${
                  isTracking ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {isTracking ? '🟢 Active' : '🟡 Inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Updates:</span>
                <span className="text-slate-900 font-medium">{updateCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h4 className="font-semibold text-green-900 mb-2">🕒 Last Update</h4>
            <div className="text-sm">
              {lastUpdateTime ? (() => {
                const updateInfo = formatLastUpdate(lastUpdateTime);
                return (
                  <div className="space-y-1">
                    <div className="text-slate-900">
                      {updateInfo.time}
                    </div>
                    <div className="text-slate-600 text-xs">
                      {updateInfo.relative}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-slate-600">No updates yet</div>
              )}
            </div>
          </div>

          {/* PRODUCTION FIX: GPS Accuracy Display */}
          {accuracy !== undefined && (
            <div className={`border rounded-xl p-4 ${
              accuracyWarning || accuracy > 1000
                ? 'bg-red-50 border-red-200' 
                : accuracyLevel === 'excellent' || accuracyLevel === 'good'
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${
                accuracyWarning || accuracy > 1000
                  ? 'text-red-900' 
                  : accuracyLevel === 'excellent' || accuracyLevel === 'good'
                  ? 'text-green-900'
                  : 'text-yellow-900'
              }`}>
                📍 GPS Accuracy
              </h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className={accuracyWarning || accuracy > 1000 ? 'text-slate-700' : 'text-slate-700'}>
                    Accuracy:
                  </span>
                  <span className={`font-medium ${
                    accuracyWarning || accuracy > 1000
                      ? 'text-red-700' 
                      : accuracyLevel === 'excellent' || accuracyLevel === 'good'
                      ? 'text-green-700'
                      : 'text-yellow-700'
                  }`}>
                    {accuracy > 1000 
                      ? `±${(accuracy / 1000).toFixed(1)}km` 
                      : `±${Math.round(accuracy)}m`}
                  </span>
                </div>
                {accuracyLevel && (
                  <div className="flex justify-between items-center">
                    <span className={accuracyWarning || accuracy > 1000 ? 'text-slate-700' : 'text-slate-700'}>
                      Signal:
                    </span>
                    <span className={`font-medium capitalize ${
                      accuracyWarning || accuracy > 1000
                        ? 'text-red-700' 
                        : accuracyLevel === 'excellent' || accuracyLevel === 'good'
                        ? 'text-green-700'
                        : 'text-yellow-700'
                    }`}>
                      {accuracyLevel}
                    </span>
                  </div>
                )}
                {accuracyMessage && (
                  <div className={`text-xs mt-2 p-2 rounded ${
                    accuracyWarning || accuracy > 1000
                      ? 'bg-red-100 text-red-800 border border-red-300' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {accuracyMessage}
                  </div>
                )}
                {/* CRITICAL WARNING: IP-based positioning detected */}
                {accuracy > 1000 && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-xl">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">⚠️</span>
                      <div className="flex-1">
                        <div className="font-semibold text-red-900 mb-1">
                          Inaccurate Location Detected
                        </div>
                        <div className="text-xs text-red-800 space-y-1">
                          <p>• Your browser is using IP-based positioning (no GPS hardware)</p>
                          <p>• Location shown is approximate city/region level, not your exact position</p>
                          <p>• For accurate tracking, use a mobile device with GPS</p>
                          <p className="mt-2 font-medium">📱 Mobile devices provide ±10-50m accuracy</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-900 mb-2">🔗 Connection Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-700">WebSocket:</span>
              <span className="font-medium text-slate-900">
                {getConnectionStatusText()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-700">Authenticated:</span>
              <span className={`font-medium ${
                isAuthenticated ? 'text-green-700' : 'text-red-700'
              }`}>
                {isAuthenticated ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </div>
        </div>

        {/* Location Error Handling */}
        {locationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="font-semibold text-red-900 mb-2">⚠️ Location Error</h4>
            <p className="text-red-800 text-sm mb-3 whitespace-pre-line break-words">{locationError}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors min-h-[44px] touch-friendly"
                >
                  Clear Error
                </button>
              )}
              {onRequestPermission && (
                <button
                  onClick={onRequestPermission}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors min-h-[44px] touch-friendly"
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
