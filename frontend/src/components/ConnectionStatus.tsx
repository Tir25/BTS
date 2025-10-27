import React from 'react';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { logger } from '../utils/logger';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { 
    isWebSocketConnected, 
    isWebSocketAuthenticated, 
    error,
    retryConnection 
  } = useDriverAuth();

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isWebSocketConnected && isWebSocketAuthenticated) return 'text-green-500';
    if (isWebSocketConnected && !isWebSocketAuthenticated) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (error) return 'Connection Error';
    if (isWebSocketConnected && isWebSocketAuthenticated) return 'Connected';
    if (isWebSocketConnected && !isWebSocketAuthenticated) return 'Connecting...';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (isWebSocketConnected && isWebSocketAuthenticated) return '✅';
    if (isWebSocketConnected && !isWebSocketAuthenticated) return '🔄';
    return '⚪';
  };

  const handleRetry = async () => {
    try {
      logger.info('🔄 Retrying WebSocket connection...', 'component');
      await retryConnection();
    } catch (error) {
      logger.error('❌ Retry failed', 'component', { error });
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">{getStatusIcon()}</span>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {error && (
        <button
          onClick={handleRetry}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;
