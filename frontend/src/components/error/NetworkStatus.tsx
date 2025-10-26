import React, { useState, useEffect } from 'react';
import { logError } from '../../utils/errorHandler';

interface NetworkStatusProps {
  showOfflineMessage?: boolean;
  onNetworkChange?: (isOnline: boolean) => void;
}

interface NetworkInfo {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showOfflineMessage = true,
  onNetworkChange,
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: navigator.onLine,
  });
  const [showBanner, setShowBanner] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());

  useEffect(() => {
    const updateNetworkInfo = () => {
      const isOnline = navigator.onLine;
      const newNetworkInfo: NetworkInfo = { isOnline };

      // Get additional network information if available
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          newNetworkInfo.effectiveType = conn.effectiveType;
          newNetworkInfo.downlink = conn.downlink;
          newNetworkInfo.rtt = conn.rtt;
          newNetworkInfo.saveData = conn.saveData;
        }
      }

      setNetworkInfo(newNetworkInfo);

      // Handle network state changes
      if (isOnline) {
        setLastOnlineTime(Date.now());
        setShowBanner(false);

        // Only log network restoration if we were previously offline
        if (!networkInfo.isOnline) {
          logError(
            'Network connection restored',
            'NetworkStatus'
          );
        }
      } else {
        setShowBanner(true);

        // Only log network loss if we were previously online
        if (networkInfo.isOnline) {
          logError(
            'Network connection lost',
            'NetworkStatus'
          );
        }
      }

      // Call callback if provided
      if (onNetworkChange) {
        onNetworkChange(isOnline);
      }
    };

    // Initial network info
    updateNetworkInfo();

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    // Listen for network information changes
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        conn.addEventListener('change', updateNetworkInfo);
      }
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);

      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          conn.removeEventListener('change', updateNetworkInfo);
        }
      }
    };
  }, [onNetworkChange]);

  // Auto-hide offline banner after 5 seconds
  useEffect(() => {
    if (showBanner && !networkInfo.isOnline) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showBanner, networkInfo.isOnline]);

  // Don't render anything if online and not showing offline message
  if (networkInfo.isOnline && !showOfflineMessage) {
    return null;
  }

  // Offline banner
  if (!networkInfo.isOnline && showBanner) {
    const offlineDuration = Math.floor((Date.now() - lastOnlineTime) / 1000);

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"
              />
            </svg>
            <div>
              <p className="font-medium">You're offline</p>
              <p className="text-sm opacity-90">
                Offline for {offlineDuration}s • Some features may be limited
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-white hover:text-red-200 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Online indicator (optional)
  if (networkInfo.isOnline && showOfflineMessage) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Online</span>
          {networkInfo.effectiveType && (
            <span className="text-xs opacity-75">
              ({networkInfo.effectiveType})
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default NetworkStatus;
