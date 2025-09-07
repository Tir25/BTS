/**
 * Validation Status Component
 * Phase 2: Shows validation status and statistics to users
 */

import React, { useState, useEffect } from 'react';
import { validationMiddleware } from '../../middleware/validationMiddleware';
import { dataValidator } from '../../utils/dataValidation';
import { fallbackDataService } from '../../services/fallbackDataService';

interface ValidationStatusProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const ValidationStatus: React.FC<ValidationStatusProps> = ({
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const [stats, setStats] = useState(validationMiddleware.getStats());
  const [cacheStats, setCacheStats] = useState(dataValidator.getCacheStats());
  const [fallbackStats, setFallbackStats] = useState(fallbackDataService.getStats());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(validationMiddleware.getStats());
      setCacheStats(dataValidator.getCacheStats());
      setFallbackStats(fallbackDataService.getStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const successRate = stats.totalProcessed > 0 
    ? Math.round((stats.successful / stats.totalProcessed) * 100) 
    : 0;

  const sanitizationRate = stats.totalProcessed > 0 
    ? Math.round((stats.sanitized / stats.totalProcessed) * 100) 
    : 0;

  const fallbackRate = stats.totalProcessed > 0 
    ? Math.round((stats.fallbackUsed / stats.totalProcessed) * 100) 
    : 0;

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 text-xs ${className}`}>
        <div className={`w-2 h-2 rounded-full ${
          successRate >= 95 ? 'bg-green-500' : 
          successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
        }`}></div>
        <span className="text-gray-600">
          Validation: {successRate}% success
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          <span className="mr-2">🛡️</span>
          Data Validation Status
        </h3>
        {showDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            successRate >= 95 ? 'text-green-600' : 
            successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {successRate}%
          </div>
          <div className="text-xs text-gray-600">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalProcessed}
          </div>
          <div className="text-xs text-gray-600">Total Processed</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-3">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Successful</span>
            <span>{stats.successful}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${successRate}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Sanitized</span>
            <span>{stats.sanitized}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${sanitizationRate}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Fallback Used</span>
            <span>{stats.fallbackUsed}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${fallbackRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      {showDetails && isExpanded && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">Processing Stats</div>
              <div className="space-y-1 text-gray-600">
                <div>Failed: {stats.failed}</div>
                <div>Anomalies: {stats.anomaliesDetected}</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Cache Stats</div>
              <div className="space-y-1 text-gray-600">
                <div>Cache Size: {cacheStats.size}</div>
                <div>Max Age: {Math.round(cacheStats.maxAge / 1000)}s</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium text-gray-700 mb-1 text-xs">Fallback Data</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>Cached: {fallbackStats.cacheSize}</div>
              <div>Last Known: {fallbackStats.lastKnownSize}</div>
              <div>Route Estimates: {fallbackStats.routeEstimatesSize}</div>
              <div>Defaults: {fallbackStats.defaultLocationsSize}</div>
            </div>
          </div>

          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => {
                validationMiddleware.resetStats();
                dataValidator.clearCache();
                setStats(validationMiddleware.getStats());
                setCacheStats(dataValidator.getCacheStats());
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              Reset Stats
            </button>
            <button
              onClick={() => {
                fallbackDataService.cleanupExpiredData();
                setFallbackStats(fallbackDataService.getStats());
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              Cleanup Cache
            </button>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-200">
        <div className={`flex items-center space-x-2 text-xs ${
          successRate >= 95 ? 'text-green-600' : 
          successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            successRate >= 95 ? 'bg-green-500' : 
            successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span>
            {successRate >= 95 ? 'Excellent' : 
             successRate >= 80 ? 'Good' : 'Needs Attention'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ValidationStatus;
