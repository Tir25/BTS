import React from 'react';
import { formatTime } from '../../utils/dateFormatter';

interface DriverStatusCardsProps {
  isWebSocketConnected: boolean;
  isWebSocketAuthenticated: boolean;
  isTracking: boolean;
  updateCount: number;
  lastUpdateTime: string | null;
  locationError: string | null;
}

const DriverStatusCards: React.FC<DriverStatusCardsProps> = ({
  isWebSocketConnected,
  isWebSocketAuthenticated,
  isTracking,
  updateCount,
  lastUpdateTime,
  locationError,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex items-center">
          <div
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 ${
              isWebSocketConnected && isWebSocketAuthenticated
                ? 'bg-green-500'
                : isWebSocketConnected
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">Connection</h3>
            <p className="text-xs text-slate-600 truncate">
              {isWebSocketConnected && isWebSocketAuthenticated ? 'Connected' :
               isWebSocketConnected ? 'Connecting...' : 'Disconnected'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex items-center">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 ${isTracking ? 'bg-green-500' : 'bg-slate-400'}`} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">GPS Tracking</h3>
            <p className="text-xs text-slate-600 truncate">{isTracking ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">Updates Sent</h3>
          <p className="text-lg sm:text-xl font-bold text-blue-600">{updateCount}</p>
          {lastUpdateTime && (
            <p className="text-xs text-slate-600 truncate">Last: {formatTime(lastUpdateTime)}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex items-center">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 sm:mr-3 ${locationError ? 'bg-red-500' : 'bg-green-500'}`} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">Location</h3>
            <p className="text-xs text-slate-600 truncate">{locationError ? 'Error' : 'Available'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverStatusCards;


