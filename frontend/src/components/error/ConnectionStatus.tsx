import React, { useState, useEffect } from 'react';
import WebSocketFallback from './WebSocketFallback';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  onRetry: () => void;
  connectionType?: 'location-updates' | 'driver-auth' | 'admin-updates';
  showOfflineMessage?: boolean;
  className?: string;
  compact?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  onRetry,
  connectionType = 'location-updates',
  showOfflineMessage = true,
  className = '',
  compact = false,
}) => {
  const [lastConnectedTime, setLastConnectedTime] = useState<number | null>(null);
  const [connectionDuration, setConnectionDuration] = useState<number>(0);

  useEffect(() => {
    if (isConnected && !lastConnectedTime) {
      setLastConnectedTime(Date.now());
    } else if (!isConnected && lastConnectedTime) {
      setLastConnectedTime(null);
      setConnectionDuration(0);
    }
  }, [isConnected, lastConnectedTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected && lastConnectedTime) {
      interval = setInterval(() => {
        setConnectionDuration(Date.now() - lastConnectedTime);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, lastConnectedTime]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = () => {
    if (isConnecting) return '🔄';
    if (isConnected) return '🟢';
    return '🔴';
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    return 'text-red-600';
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-lg">{getStatusIcon()}</span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {isConnected && connectionDuration > 0 && (
          <span className="text-xs text-gray-500">
            ({formatDuration(connectionDuration)})
          </span>
        )}
      </div>
    );
  }

  return (
    <WebSocketFallback
      isConnected={isConnected}
      isConnecting={isConnecting}
      onRetry={onRetry}
      onRefresh={() => window.location.reload()}
      connectionType={connectionType}
      showOfflineMessage={showOfflineMessage}
      className={className}
    />
  );
};

export default ConnectionStatus;
