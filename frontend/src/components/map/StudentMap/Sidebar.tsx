import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface RouteOption {
  value: string;
  label: string;
}

interface BusLike {
  id?: string;
  bus_id?: string;
  busNumber?: string;
  routeName?: string;
  driverName?: string;
  eta?: number;
}

interface LocationLike {
  timestamp: string | number;
  speed?: number;
}

interface StudentMapSidebarProps {
  isNavbarCollapsed: boolean;
  setIsNavbarCollapsed: (val: boolean) => void;
  isConnected: boolean;
  busesCount: number;
  activeCount: number;
  selectedShift: 'Day' | 'Afternoon' | '';
  setSelectedShift: (val: 'Day' | 'Afternoon' | '') => void;
  selectedRoute: string;
  setSelectedRoute: (val: string) => void;
  routeOptions: RouteOption[];
  displayBuses: BusLike[];
  lastBusLocations: Record<string, LocationLike | undefined>;
  onCenterOnBus: (busId: string) => void;
  isLoadingRoutes?: boolean;
  onCenterOnBusForRoute?: () => void;
}

const StudentMapSidebar: React.FC<StudentMapSidebarProps> = ({
  isNavbarCollapsed,
  setIsNavbarCollapsed,
  isConnected,
  busesCount,
  activeCount,
  selectedShift,
  setSelectedShift,
  selectedRoute,
  setSelectedRoute,
  routeOptions,
  displayBuses,
  lastBusLocations,
  onCenterOnBus,
  isLoadingRoutes = false,
  onCenterOnBusForRoute,
}) => {
  const [isRouteFilterOpen, setIsRouteFilterOpen] = React.useState(true);

  return (
    <motion.div
      initial={false}
      animate={{
        width: isNavbarCollapsed ? '60px' : '320px',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex-shrink-0 h-full relative z-20"
    >
      <div className="h-full bg-white border-r border-slate-200 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            {!isNavbarCollapsed && (
              <h2 className="text-xl font-bold text-slate-900">🚌 Live Bus Tracking</h2>
            )}
            <button
              onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
              className="text-slate-600 hover:text-slate-900 transition-colors ml-auto"
              title={isNavbarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isNavbarCollapsed ? '▶️' : '◀️'}
            </button>
          </div>

          {!isNavbarCollapsed && (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-slate-900 font-medium">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {busesCount} buses • {activeCount} active
                </p>
              </div>

              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setIsRouteFilterOpen(!isRouteFilterOpen)}
                    className="flex items-center justify-between flex-1 p-2 bg-slate-100 rounded-lg text-slate-900 hover:bg-slate-200 transition-colors"
                  >
                    <span className="font-medium">🛣️ Routes</span>
                    <span>{isRouteFilterOpen ? '▼' : '▶'}</span>
                  </button>
                  {/* PRODUCTION FIX: Center on Bus button - always visible when route is selected */}
                  {selectedRoute && selectedRoute !== 'all' && onCenterOnBusForRoute && (
                    <button
                      className="px-3 py-2 bg-green-600 text-white rounded-lg border border-green-700 hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center space-x-1 font-medium shadow-sm flex-shrink-0 min-w-[60px]"
                      onClick={() => {
                        onCenterOnBusForRoute();
                      }}
                      title="Center map on bus for selected route"
                      aria-label="Center on bus"
                    >
                      <span className="text-sm">🎯</span>
                      <span className="text-xs font-bold">COB</span>
                    </button>
                  )}
                </div>

                {isRouteFilterOpen && (
                  <div className="mt-2 space-y-1">
                    {!selectedShift && (
                      <div className="text-slate-600 text-sm p-2">Select a shift to view active routes.</div>
                    )}
                    {selectedShift && (isLoadingRoutes as any) && (
                      <div className="text-slate-600 text-sm p-2 flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Loading routes...</span>
                      </div>
                    )}
                    {selectedShift && !(isLoadingRoutes as any) && (
                      <>
                        {routeOptions.length === 0 ? (
                          <div className="text-slate-600 text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                            No routes available for {selectedShift} shift.
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedRoute('all')}
                              className={`w-full text-left p-2 rounded text-sm transition-colors flex items-center space-x-2 ${
                                selectedRoute === 'all'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                              <span>All Active Routes ({routeOptions.length})</span>
                            </button>
                            {routeOptions.map((route, index) => {
                              // Generate consistent color for route indicator
                              const routeColors = [
                                '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                                '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
                              ];
                              const hash = route.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                              const routeColor = routeColors[hash % routeColors.length];
                              
                              return (
                                <button
                                  key={route.value}
                                  onClick={() => setSelectedRoute(route.value)}
                                  className={`w-full text-left p-2 rounded text-sm transition-colors flex items-center space-x-2 ${
                                    selectedRoute === route.value
                                      ? 'bg-blue-600 text-white'
                                      : 'text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <span 
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: routeColor }}
                                  ></span>
                                  <span className="truncate">{route.label}</span>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between w-full p-2 bg-slate-100 rounded-lg">
                  <span className="font-medium text-slate-900">⏱️ Shift</span>
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value as any)}
                    className="ml-2 bg-white text-slate-900 text-sm rounded-lg px-3 py-1 border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="" disabled>Select shift</option>
                    <option value="Day">Day</option>
                    <option value="Afternoon">Afternoon</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  <AnimatePresence>
                    {displayBuses.map((bus) => {
                      const busId = (bus as any).id || (bus as any).bus_id;
                      const location = lastBusLocations[busId];
                      return (
                        <motion.div
                          key={busId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => onCenterOnBus(busId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">🚌</span>
                              <span className="font-medium text-slate-900">
                                {(bus as any).busNumber}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {(bus as any).eta ? `${(bus as any).eta} min` : 'ETA: --'}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); onCenterOnBus(busId); }}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                aria-label={`Center map on ${(bus as any).busNumber}`}
                                title={`Center on ${(bus as any).busNumber}`}
                              >
                                🎯
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-slate-600">📍 Route: {(bus as any).routeName}</div>
                            <div className="text-xs text-slate-600">👨‍💼 Driver: {(bus as any).driverName}</div>
                            {location && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-green-600 font-medium">
                                  🕐 {new Date(location.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-blue-600 font-medium">
                                  {location.speed ? `${location.speed} km/h` : 'Speed: --'}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentMapSidebar;


