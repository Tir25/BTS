import React from 'react';
import { BusInfo, DriverHeaderProps } from '../../types/driver';

const DriverHeader: React.FC<DriverHeaderProps> = ({
  busInfo,
  connectionStatus,
  onSignOut,
  onRetryConnection,
  onRefreshAssignment,
  reconnectAttempts = 0,
  lastHeartbeat = 0,
}) => {
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-400';
      case 'disconnected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢 Connected';
      case 'connecting':
        return '🟡 Connecting...';
      case 'reconnecting':
        return '🟡 Reconnecting...';
      case 'disconnected':
        return '🔴 Disconnected';
      default:
        return '⚪ Unknown';
    }
  };

  const getHeartbeatStatus = () => {
    if (lastHeartbeat === 0) return '';
    
    const now = Date.now();
    const timeSinceHeartbeat = now - lastHeartbeat;
    const secondsSinceHeartbeat = Math.floor(timeSinceHeartbeat / 1000);
    
    if (secondsSinceHeartbeat < 60) {
      return `💓 ${secondsSinceHeartbeat}s ago`;
    } else if (secondsSinceHeartbeat < 300) {
      return `💓 ${Math.floor(secondsSinceHeartbeat / 60)}m ago`;
    } else {
      return '💓 No heartbeat';
    }
  };

  return (
    <div className="card-glass p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 truncate">
              🚌 Driver Dashboard
            </h1>
            <div className="space-y-2">
              <p className="text-white/80 text-sm sm:text-base">
                Welcome,{' '}
                <span className="font-semibold text-white break-words">
                  {busInfo?.driver_name || 'Driver'}
                </span>
              </p>
              <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4 text-sm">
                <span className="text-blue-300 truncate">
                  🚌 Bus:{' '}
                  <span className="font-semibold text-white">
                    {busInfo?.bus_number || 'N/A'}
                  </span>
                </span>
                <span className="text-green-300 truncate">
                  🛣️ Route:{' '}
                  <span className="font-semibold text-white">
                    {busInfo?.route_name || 'N/A'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status and Controls Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Connection Status */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getConnectionStatusColor()} truncate`}>
                {getConnectionStatusText()}
              </span>
            </div>
            {connectionStatus === 'connected' && getHeartbeatStatus() && (
              <span className="text-xs text-white/60 truncate">
                {getHeartbeatStatus()}
              </span>
            )}
            {reconnectAttempts > 0 && (
              <span className="text-xs text-yellow-300 truncate">
                Retry {reconnectAttempts}/10
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {connectionStatus === 'connected' && onRefreshAssignment && (
              <button
                onClick={onRefreshAssignment}
                className="flex-1 sm:flex-none px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium min-h-[44px] touch-friendly"
                title="Refresh assignment data"
              >
                <span className="flex items-center justify-center gap-1">
                  <span>🔄</span>
                  <span className="hidden xs:inline">Refresh</span>
                </span>
              </button>
            )}
            {connectionStatus === 'disconnected' && onRetryConnection && (
              <button
                onClick={onRetryConnection}
                className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium min-h-[44px] touch-friendly"
              >
                <span className="flex items-center justify-center gap-1">
                  <span>🔄</span>
                  <span className="hidden xs:inline">Retry</span>
                </span>
              </button>
            )}
            <button
              onClick={onSignOut}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium min-h-[44px] touch-friendly"
            >
              <span className="flex items-center justify-center gap-1">
                <span>🚪</span>
                <span className="hidden xs:inline">Sign Out</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverHeader;
