/**
 * MapOverlays Component
 * Renders loading and error overlays for the map
 */

import React from 'react';

interface MapOverlaysProps {
  isLoading: boolean;
  connectionError: string | null;
}

/**
 * MapOverlays - Displays loading and error states over the map
 */
export const MapOverlays: React.FC<MapOverlaysProps> = React.memo(({ 
  isLoading, 
  connectionError 
}) => {
  return (
    <>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-slate-900 text-center">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="font-medium">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {connectionError && (
        <div className="absolute top-4 right-4 z-10">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-900">
                  Connection Error
                </h3>
                <p className="text-sm text-red-700 mt-1">{connectionError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

MapOverlays.displayName = 'MapOverlays';

