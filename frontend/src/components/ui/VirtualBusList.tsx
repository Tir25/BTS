import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BusInfo } from '../../types';
import GlassyCard from './GlassyCard';

interface VirtualBusListProps {
  buses: BusInfo[];
  itemHeight?: number;
  containerHeight?: number;
  onBusSelect?: (bus: BusInfo) => void;
  selectedBusId?: string;
}

const VirtualBusList: React.FC<VirtualBusListProps> = ({
  buses,
  itemHeight = 80,
  containerHeight = 400,
  onBusSelect,
  selectedBusId,
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      buses.length
    );

    return buses.slice(startIndex, endIndex).map((bus, index) => ({
      bus,
      index: startIndex + index,
    }));
  }, [buses, scrollTop, itemHeight, containerHeight]);

  // Calculate total height
  const totalHeight = buses.length * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // Handle bus selection
  const handleBusClick = useCallback((bus: BusInfo) => {
    onBusSelect?.(bus);
  }, [onBusSelect]);

  if (buses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/60">No buses available</p>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: containerHeight }}
    >
      {/* Scrollable container */}
      <div
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Spacer for total height */}
        <div style={{ height: totalHeight }} />
      </div>

      {/* Visible items */}
      <div className="absolute top-0 left-0 right-0">
        <AnimatePresence>
          {visibleItems.map(({ bus, index }) => (
            <motion.div
              key={bus.busId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: index * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              <GlassyCard
                className={`m-2 cursor-pointer transition-all duration-200 ${
                  selectedBusId === bus.busId
                    ? 'ring-2 ring-blue-400 bg-blue-500/20'
                    : 'hover:bg-white/10'
                }`}
                onClick={() => handleBusClick(bus)}
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">🚌</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {bus.busNumber}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {bus.routeName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          bus.currentLocation
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-red-400'
                        }`}
                      />
                      <span className="text-white/60 text-xs">
                        {bus.currentLocation ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {bus.currentLocation && (
                      <p className="text-white/60 text-xs mt-1">
                        {bus.currentLocation.speed
                          ? `${bus.currentLocation.speed} km/h`
                          : 'Speed N/A'}
                      </p>
                    )}
                  </div>
                </div>
              </GlassyCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VirtualBusList;
