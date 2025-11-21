import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getRouteColorByValue } from '../../../utils/routeColors';

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
  selectedShift: string;
  setSelectedShift: (val: string) => void;
  availableShifts: Array<{ id: string; name: string; start_time: string | null; end_time: string | null }>;
  isLoadingShifts?: boolean;
  selectedRoute: string;
  setSelectedRoute: (val: string) => void;
  routeOptions: RouteOption[];
  displayBuses: BusLike[];
  lastBusLocations: Record<string, LocationLike | undefined>;
  onCenterOnBus: (busId: string) => void;
  isLoadingRoutes?: boolean;
  onCenterOnBusForRoute?: () => void;
  onSignOut?: () => void;
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
  onSignOut,
  availableShifts = [],
  isLoadingShifts = false,
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
      <div className="h-full bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 flex-1 overflow-y-auto">
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
                    {/* Loading state */}
                    {isLoadingRoutes && (
                      <div className="text-slate-600 text-sm p-2 flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Loading routes...</span>
                      </div>
                    )}
                    
                    {/* Routes list - show when not loading */}
                    {!isLoadingRoutes && (
                      <>
                        {routeOptions.length === 0 ? (
                          <div className="text-slate-600 text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                            {selectedShift
                              ? `No routes available for ${selectedShift} shift.`
                              : 'No routes available.'}
                          </div>
                        ) : (
                          <>
                            {/* Info text when no shift is selected */}
                            {!selectedShift && (
                              <div className="text-slate-600 text-xs p-2 bg-blue-50 border border-blue-200 rounded mb-2">
                                Showing all routes. Select a shift to filter.
                              </div>
                            )}
                            
                            {/* "All Routes" button */}
                            <button
                              onClick={() => setSelectedRoute('all')}
                              className={`w-full text-left p-2 rounded text-sm transition-colors flex items-center space-x-2 ${
                                selectedRoute === 'all'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                              <span>All Routes ({routeOptions.length})</span>
                            </button>
                            
                            {/* Individual route buttons */}
                            {routeOptions.map((route) => {
                              // Use centralized route color utility
                              const routeColor = getRouteColorByValue(route.value);
                              
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
                  {isLoadingShifts ? (
                    <div className="ml-2 flex items-center space-x-2 text-slate-600 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Loading shifts...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value)}
                      className="ml-2 bg-white text-slate-900 text-sm rounded-lg px-3 py-1 border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Shifts</option>
                      {availableShifts.map((shift) => (
                        <option key={shift.id} value={shift.name}>
                          {shift.name}
                          {shift.start_time && shift.end_time 
                            ? ` (${shift.start_time} - ${shift.end_time})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  <AnimatePresence>
                    {displayBuses.map((bus, index) => {
                      // PRODUCTION FIX: Ensure unique key - use busId if available, fallback to index
                      const busId = (bus as any).id || (bus as any).bus_id;
                      const uniqueKey = busId || `bus-${index}-${(bus as any).busNumber || 'unknown'}`;
                      const location = lastBusLocations[busId || ''];
                      return (
                        <motion.div
                          key={uniqueKey}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => busId && onCenterOnBus(busId)}
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
                              {busId && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onCenterOnBus(busId); }}
                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  aria-label={`Center map on ${(bus as any).busNumber || 'bus'}`}
                                  title={`Center on ${(bus as any).busNumber || 'bus'}`}
                                >
                                  🎯
                                </button>
                              )}
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

              {/* Logout Button */}
              {onSignOut && (
                <div className="mt-auto pt-4 border-t border-slate-200">
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Collapsed Logout Button */}
          {isNavbarCollapsed && onSignOut && (
            <div className="absolute bottom-4 left-0 right-0 px-2">
              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentMapSidebar;


