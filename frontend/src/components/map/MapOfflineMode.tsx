import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { logger } from '../../utils/logger';
import { safeJsonParse } from '../../utils/jsonUtils';

interface OfflineData {
  buses: any[];
  routes: any[];
  lastUpdate: string;
  version: string;
}

interface MapOfflineModeProps {
  isOnline: boolean;
  onDataRequested: () => void;
  onDataCached: (data: OfflineData) => void;
  className?: string;
}

const MapOfflineMode: React.FC<MapOfflineModeProps> = ({
  isOnline,
  onDataRequested,
  onDataCached,
  className = '',
}) => {
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Check if we have cached data
  const checkCachedData = useCallback(() => {
    const cached = localStorage.getItem('map_offline_data');
    if (cached) {
      const parseResult = safeJsonParse(cached, null, 'offline-data-cache');
      if (parseResult.success && parseResult.data) {
        setOfflineData(parseResult.data);
        setLastSync((parseResult.data as any)?.lastUpdate || null);
        setCacheSize(JSON.stringify(parseResult.data).length);
        return true;
      } else {
        logger.warn('Failed to parse cached offline data', 'map-offline', {
          error: parseResult.error,
          cachedData: cached.substring(0, 100)
        });
        // Clear corrupted cache
        localStorage.removeItem('map_offline_data');
      }
    }
    return false;
  }, []);

  // Cache data for offline use
  const cacheData = useCallback(async (data: any) => {
    if (!isOnline) return;

    setIsCaching(true);
    try {
      const offlineData: OfflineData = {
        buses: data.buses || [],
        routes: data.routes || [],
        lastUpdate: new Date().toISOString(),
        version: '1.0.0',
      };

      localStorage.setItem('map_offline_data', JSON.stringify(offlineData));
      setOfflineData(offlineData);
      setLastSync(offlineData.lastUpdate);
      setCacheSize(JSON.stringify(offlineData).length);
      
      onDataCached(offlineData);
      logger.info('💾 Data cached for offline use', 'component');
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    } finally {
      setIsCaching(false);
    }
  }, [isOnline, onDataCached]);

  // Clear cached data
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem('map_offline_data');
      setOfflineData(null);
      setLastSync(null);
      setCacheSize(0);
      logger.info('🗑️ Offline cache cleared', 'component');
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }
  }, []);

  // Request data when online
  const requestData = useCallback(() => {
    if (isOnline) {
      onDataRequested();
    }
  }, [isOnline, onDataRequested]);

  // Check cached data on mount
  useEffect(() => {
    checkCachedData();
  }, [checkCachedData]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      logger.info('🌐 Back online - requesting fresh data', 'component');
      requestData();
    };

    const handleOffline = () => {
      logger.info('📴 Gone offline - using cached data', 'component');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [requestData]);

  // Format cache size
  const formatCacheSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  // Format last sync time
  const formatLastSync = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`offline-mode-container ${className}`}>
      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-orange-100 border border-orange-200 rounded-lg p-3 shadow-lg"
          >
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-orange-800">
                Offline Mode
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caching indicator */}
      <AnimatePresence>
        {isCaching && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-4 z-50 bg-blue-100 border border-blue-200 rounded-lg p-3 shadow-lg"
          >
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-blue-800">
                Caching data...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline data info */}
      {offlineData && (
        <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Offline Data
              </h3>
              <button
                onClick={clearCache}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Buses:</span>
                <span>{offlineData.buses.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Routes:</span>
                <span>{offlineData.routes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Size:</span>
                <span>{formatCacheSize(cacheSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync:</span>
                <span>{lastSync ? formatLastSync(lastSync) : 'Never'}</span>
              </div>
            </div>

            {!isOnline && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Using cached data</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No offline data warning */}
      {!isOnline && !offlineData && (
        <div className="fixed bottom-4 left-4 z-50 bg-red-100 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-red-800">
                No Offline Data
              </h3>
            </div>
            <p className="text-xs text-red-700">
              No cached data available. Connect to internet to load map data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapOfflineMode;
