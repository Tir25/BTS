import React from 'react';

interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
}

interface DriverHeaderProps {
  busInfo: BusInfo | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  onSignOut: () => void;
  onRetryConnection?: () => void;
  reconnectAttempts?: number;
  lastHeartbeat?: number;
}

const DriverHeader: React.FC<DriverHeaderProps> = ({
  busInfo,
  connectionStatus,
  onSignOut,
  onRetryConnection,
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
    <div className="card-glass p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            🚌 Driver Dashboard
          </h1>
          <div className="space-y-1">
            <p className="text-white/80 text-sm sm:text-base">
              Welcome,{' '}
              <span className="font-semibold text-white">
                {busInfo?.driver_name || 'Driver'}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
              <span className="text-blue-300">
                🚌 Bus:{' '}
                <span className="font-semibold text-white">
                  {busInfo?.bus_number || 'N/A'}
                </span>
              </span>
              <span className="text-green-300">
                🛣️ Route:{' '}
                <span className="font-semibold text-white">
                  {busInfo?.route_name || 'N/A'}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
            {connectionStatus === 'connected' && getHeartbeatStatus() && (
              <span className="text-xs text-white/60">
                {getHeartbeatStatus()}
              </span>
            )}
            {reconnectAttempts > 0 && (
              <span className="text-xs text-yellow-300">
                Retry {reconnectAttempts}/10
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {connectionStatus === 'disconnected' && onRetryConnection && (
              <button
                onClick={onRetryConnection}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Retry
              </button>
            )}
            <button
              onClick={onSignOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverHeader;
