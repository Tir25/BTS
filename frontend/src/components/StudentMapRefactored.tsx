import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { serviceFactory } from '../services/ServiceFactory';
import { BusLocation } from '../services/interfaces/IWebSocketService';
import { BusInfo } from '../services/interfaces/IBusService';
import { Route } from '../services/DataManager';
import { ConnectionStatus } from '../services/ConnectionManager';
import { authService } from '../services/authService';
import './StudentMap.css';

interface StudentMapProps {
  className?: string;
}

const StudentMapRefactored: React.FC<StudentMapProps> = ({ className = '' }) => {
  // Service dependencies - injected through factory
  const mapService = serviceFactory.getMapService();
  const dataManager = serviceFactory.getDataManager();
  const connectionManager = serviceFactory.getConnectionManager();

  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const isMapInitialized = useRef(false);

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    status: 'disconnected',
    error: null,
  });
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [lastBusLocations, setLastBusLocations] = useState<{
    [busId: string]: BusLocation;
  }>({});

  // Event handlers
  const handleBusLocationUpdate = useCallback(
    (location: BusLocation) => {
      const { busId, latitude, longitude } = location;

      console.log(`📍 Real-time location update for bus ${busId}:`, {
        latitude,
        longitude,
        speed: location.speed,
        eta: location.eta?.estimated_arrival_minutes,
      });

      // Update data manager
      dataManager.updateBusLocation(location);

      // Try to get bus details from API if we don't have proper info
      const currentBus = dataManager.getBus(busId);
      if (
        currentBus &&
        (currentBus.busNumber === `Bus ${busId}` || currentBus.routeName === 'Route TBD')
      ) {
        dataManager.syncBusData(busId).then(() => {
          const updatedBuses = dataManager.getBuses();
          setBuses(updatedBuses);
        });
      }

      // Update buses state
      const updatedBuses = dataManager.getBuses();
      setBuses(updatedBuses);

      // Update last known location
      setLastBusLocations((prev) => ({
        ...prev,
        [busId]: location,
      }));

      // Update marker on map
      mapService.updateBusMarker(busId, location);

      // Center map on first bus location received
      if (mapService.isInitialized() && Object.keys(lastBusLocations).length === 0) {
        console.log(`🗺️ Centering map on first bus location: [${longitude}, ${latitude}]`);
        mapService.centerOnBuses([location]);
      } else if (mapService.isInitialized() && Object.keys(lastBusLocations).length > 0) {
        // If we already have buses, center on all of them
        setTimeout(() => {
          const locations = Object.values(lastBusLocations);
          mapService.centerOnBuses(locations);
        }, 100);
      }
    },
    [dataManager, mapService, lastBusLocations]
  );

  const handleDriverConnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      console.log('🚌 Driver connected:', data);
    },
    []
  );

  const handleDriverDisconnected = useCallback(
    (data: { driverId: string; busId: string; timestamp: string }) => {
      console.log('🚌 Driver disconnected:', data);
      mapService.removeBusMarker(data.busId);
    },
    [mapService]
  );

  const handleBusArriving = useCallback(
    (data: {
      busId: string;
      routeId: string;
      location: [number, number];
      timestamp: string;
    }) => {
      console.log('🚌 Bus arriving:', data);
    },
    []
  );

  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  // Initialize map
  useEffect(() => {
    if (isMapInitialized.current || !mapContainer.current) {
      return;
    }

    console.log('🗺️ Initializing map...');
    isMapInitialized.current = true;

    mapService.initialize(mapContainer.current).then(() => {
      console.log('🗺️ Map initialized successfully');
      setIsLoading(false);
      
      // Load routes after map is ready
      dataManager.loadRoutes().then((loadedRoutes) => {
        setRoutes(loadedRoutes);
        
        // Add routes to map
        loadedRoutes.forEach((route) => {
          mapService.addRoute(`route-${route.id}`, route);
        });
      });
    });

    // Cleanup function
    return () => {
      if (mapService.isInitialized()) {
        mapService.destroy();
        isMapInitialized.current = false;
      }
    };
  }, [mapService, dataManager]);

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Wait for auth service to be initialized
        while (!authService.isInitialized()) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Set up connection callbacks
        connectionManager.setCallbacks({
          onBusLocationUpdate: handleBusLocationUpdate,
          onDriverConnected: handleDriverConnected,
          onDriverDisconnected: handleDriverDisconnected,
          onStudentConnected: () => {
            console.log('✅ Student connected to WebSocket');
          },
          onBusArriving: handleBusArriving,
          onConnectionStatusChange: handleConnectionStatusChange,
        });

        // Connect to WebSocket
        await connectionManager.connect();

        // Load initial bus data after connection
        const initialBuses = await dataManager.loadInitialBuses();
        setBuses(initialBuses);
      } catch (error) {
        console.error('❌ Error initializing connection:', error);
      }
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      connectionManager.disconnect();
    };
  }, [
    connectionManager,
    dataManager,
    handleBusLocationUpdate,
    handleDriverConnected,
    handleDriverDisconnected,
    handleBusArriving,
    handleConnectionStatusChange,
  ]);

  // Add routes to map when routes are loaded
  useEffect(() => {
    if (routes.length > 0 && mapService.isMapReady()) {
      routes.forEach((route) => {
        mapService.addRoute(`route-${route.id}`, route);
      });
    }
  }, [routes, mapService]);

  // Computed values
  const filteredBuses = useMemo(() => {
    return dataManager.getFilteredBuses(selectedRoute);
  }, [dataManager, selectedRoute, buses]);

  const availableRoutes = useMemo(() => {
    return dataManager.getAvailableRoutes();
  }, [dataManager, buses]);

  // Event handlers
  const handleCenterOnBuses = useCallback(() => {
    console.log('🗺️ Center on Buses button clicked');
    console.log('📍 Current bus locations:', lastBusLocations);
    console.log('🚌 Filtered buses:', filteredBuses);

    const locations = Object.values(lastBusLocations);
    setTimeout(() => {
      mapService.centerOnBuses(locations);
    }, 50);
  }, [mapService, lastBusLocations, filteredBuses]);

  const handleRouteFilterChange = useCallback((route: string) => {
    setSelectedRoute(route);
  }, []);

  return (
    <div className={`relative h-screen ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {connectionStatus.error && (
        <div className="error-overlay">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Connection Error
                </h3>
                <p className="text-sm text-red-700 mt-1">{connectionStatus.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="map-container rounded-lg" />

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Route filter */}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Route
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => handleRouteFilterChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Routes</option>
            {availableRoutes.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
        </div>

        {/* Connection status */}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span className="text-sm text-gray-700">
              {connectionStatus.isConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
            </span>
          </div>
          {connectionStatus.error && (
            <div className="mt-1 text-xs text-red-600">{connectionStatus.error}</div>
          )}
        </div>

        {/* Center on buses button */}
        {filteredBuses.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <button
              onClick={handleCenterOnBuses}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              🗺️ Center on Buses ({Object.keys(lastBusLocations).length})
            </button>
            {Object.keys(lastBusLocations).length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                <div className="font-medium">📍 Current Locations:</div>
                {Object.entries(lastBusLocations)
                  .slice(0, 2)
                  .map(([busId, location]) => {
                    const bus = dataManager.getBus(busId);
                    return (
                      <div key={busId} className="mt-1">
                        {bus?.busNumber || `Bus ${busId}`}: {location.latitude.toFixed(4)},{' '}
                        {location.longitude.toFixed(4)}
                      </div>
                    );
                  })}
                {Object.keys(lastBusLocations).length > 2 && (
                  <div className="text-gray-500">
                    ... and {Object.keys(lastBusLocations).length - 2} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bus list overlay */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm max-h-64 overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            🚌 Active Buses ({filteredBuses.length})
          </h3>
          {filteredBuses.length === 0 ? (
            <p className="text-gray-500 text-sm">No buses available</p>
          ) : (
            <div className="space-y-2">
              {filteredBuses.map((bus) => {
                const location = lastBusLocations[bus.busId];
                return (
                  <div
                    key={bus.busId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-blue-600">
                        {bus.busNumber}
                      </div>
                      <div className="text-xs text-gray-600">{bus.routeName}</div>
                      {location && (
                        <div className="text-xs text-green-600 mt-1">
                          📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {bus.eta ? `${bus.eta} min` : 'N/A'}
                      </div>
                      {location && (
                        <div className="text-xs text-gray-400">
                          {new Date(location.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
            connectionStatus.status === 'connected'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : connectionStatus.status === 'connecting'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : connectionStatus.status === 'reconnecting'
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {connectionStatus.status === 'connected' && '🟢 Connected'}
          {connectionStatus.status === 'connecting' && '🟡 Connecting...'}
          {connectionStatus.status === 'reconnecting' && '🟠 Reconnecting...'}
          {connectionStatus.status === 'disconnected' && '🔴 Disconnected'}
        </div>
      </div>
    </div>
  );
};

export default StudentMapRefactored;
