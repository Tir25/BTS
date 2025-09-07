import React, { useState, useEffect } from 'react';

interface WebSocketFallbackProps {
  isConnected: boolean;
  isConnecting: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  connectionType?: 'location-updates' | 'driver-auth' | 'admin-updates';
  showOfflineMessage?: boolean;
  className?: string;
}

const WebSocketFallback: React.FC<WebSocketFallbackProps> = ({
  isConnected,
  isConnecting,
  onRetry,
  onRefresh,
  connectionType = 'location-updates',
  showOfflineMessage = true,
  className = '',
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isConnected && retryCount > 0) {
      setRetryCount(0);
      setLastRetryTime(null);
    }
  }, [isConnected, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLastRetryTime(Date.now());
    onRetry();
  };

  const getConnectionTypeLabel = () => {
    switch (connectionType) {
      case 'location-updates':
        return 'Real-time Location Updates';
      case 'driver-auth':
        return 'Driver Authentication';
      case 'admin-updates':
        return 'Admin System Updates';
      default:
        return 'WebSocket Connection';
    }
  };

  const getConnectionIcon = () => {
    if (isConnecting) return '🔄';
    if (isConnected) return '✅';
    return '❌';
  };

  const getConnectionStatus = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getConnectionColor = () => {
    if (isConnecting) return 'text-yellow-600';
    if (isConnected) return 'text-green-600';
    return 'text-red-600';
  };

  const getBackgroundColor = () => {
    if (isConnecting) return 'bg-yellow-50 border-yellow-200';
    if (isConnected) return 'bg-green-50 border-green-200';
    return 'bg-red-50 border-red-200';
  };

  // Don't show fallback if connected and not showing offline message
  if (isConnected && !showOfflineMessage) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Connection Status Banner */}
      <div className={`border-l-4 ${getBackgroundColor()} p-4 mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getConnectionIcon()}</span>
            <div>
              <h3 className={`font-medium ${getConnectionColor()}`}>
                {getConnectionStatus()}
              </h3>
              <p className="text-sm text-gray-600">
                {getConnectionTypeLabel()}
              </p>
            </div>
          </div>
          
          {!isConnected && (
            <div className="flex space-x-2">
              <button
                onClick={handleRetry}
                disabled={isConnecting}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Retry'}
              </button>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                {showDetails ? 'Hide' : 'Details'}
              </button>
            </div>
          )}
        </div>

        {/* Retry Information */}
        {retryCount > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <p>
              Retry attempts: {retryCount}
              {lastRetryTime && (
                <span className="ml-2">
                  (Last attempt: {new Date(lastRetryTime).toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Detailed Information */}
      {showDetails && !isConnected && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-800 mb-3">Connection Details</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="text-red-600 font-medium">Disconnected</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Service:</span>
              <span className="text-gray-800">{getConnectionTypeLabel()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Retry Count:</span>
              <span className="text-gray-800">{retryCount}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Last Check:</span>
              <span className="text-gray-800">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h5 className="font-medium text-gray-800">Troubleshooting Steps:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try refreshing the page</li>
              <li>• Clear browser cache and cookies</li>
              <li>• Disable browser extensions temporarily</li>
            </ul>
          </div>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleRetry}
              disabled={isConnecting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Retry Connection'}
            </button>
            
            <button
              onClick={onRefresh}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {/* Offline Message */}
      {!isConnected && showOfflineMessage && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-medium text-orange-800 mb-2">
                Limited Functionality
              </h4>
              <p className="text-sm text-orange-700">
                Real-time updates are currently unavailable. You can still view static information, 
                but live location tracking and real-time notifications are not working.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketFallback;
