/**
 * Optimized Bus Card Component
 * Uses React.memo to prevent unnecessary re-renders
 */

import React from 'react';
import { BusInfo } from '../../contexts/AppContext';

interface BusCardProps {
  bus: BusInfo;
  isSelected?: boolean;
  onSelect?: (busId: string) => void;
  showLocation?: boolean;
}

const BusCard: React.FC<BusCardProps> = React.memo(({
  bus,
  isSelected = false,
  onSelect,
  showLocation = true
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(bus.bus_id);
    }
  };

  const formatLocation = (location: BusInfo['currentLocation']) => {
    if (!location) return 'No location data';
    
    const timestamp = new Date(location.timestamp);
    const timeAgo = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60);
    
    return `Updated ${timeAgo} min ago`;
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-blue-500/20 border-blue-400/50 shadow-lg'
          : 'bg-white/10 border-white/20 hover:bg-white/20'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-white">
          🚌 {bus.bus_number}
        </h3>
        <span className="text-sm text-white/70">
          {bus.route_name}
        </span>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-white/70">Driver:</span>
          <span className="text-white">{bus.driver_name}</span>
        </div>
        
        {showLocation && bus.currentLocation && (
          <div className="flex justify-between">
            <span className="text-white/70">Location:</span>
            <span className="text-white/90 text-xs">
              {formatLocation(bus.currentLocation)}
            </span>
          </div>
        )}
      </div>
      
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="text-xs text-blue-200">
            ✓ Selected
          </div>
        </div>
      )}
    </div>
  );
});

BusCard.displayName = 'BusCard';

export default BusCard;
