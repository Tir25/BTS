import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import { adminApiService } from '../services/adminApiService';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon
const busIcon = L.divIcon({
  className: 'custom-bus-icon',
  html: '<div style="background-color: #3B82F6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">🚌</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Custom driver icon
// Driver icon removed as it's not being used

interface Bus {
  id: string;
  number_plate: string;
  capacity: number;
  model?: string;
  assigned_driver_id?: string;
  route_id?: string;
  is_active?: boolean;
  bus_image_url?: string;
  current_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

interface Route {
  id: string;
  name: string;
  description: string;
  stops: GeoJSON.LineString;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
  route_map_url?: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Map controller component for auto-refresh
function MapController({ onRefresh }: { onRefresh: () => void }) {
  // Map reference removed as it's not being used

  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [onRefresh]);

  return null;
}

export default function LiveMap() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [mapCenter] = useState<[number, number]>([72.5714, 23.0225]); // Ahmedabad
  const [zoom, setZoom] = useState(12);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showBuses, setShowBuses] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [busesResult, routesResult, driversResult] = await Promise.all([
        adminApiService.getAllBuses(),
        adminApiService.getAllRoutes(),
        adminApiService.getAllDrivers(),
      ]);

      if (busesResult.success && busesResult.data) {
        if (busesResult.data) {
          setBuses(busesResult.data as Bus[]);
        }
      }

      if (routesResult.success && routesResult.data) {
        setRoutes(routesResult.data);
      }

      if (driversResult.success && driversResult.data) {
        setDrivers(driversResult.data);
      }

      if (
        !busesResult.success ||
        !routesResult.success ||
        !driversResult.success
      ) {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('❌ Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Not assigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return 'Not assigned';
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown';
  };

  const getActiveBuses = () => {
    return buses.filter(bus => bus.is_active);
  };

  const getBusesOnRoute = (routeId: string) => {
    return buses.filter(bus => bus.route_id === routeId && bus.is_active);
  };

  const getSelectedRouteData = () => {
    return routes.find(route => route.id === selectedRoute);
  };

  // getSelectedBusData removed as it's not being used

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getRouteCoordinates = (route: Route) => {
    try {
      if (route.stops && route.stops.coordinates) {
        return route.stops.coordinates.map(
          coord => [coord[1], coord[0]] as [number, number]
        );
      }
    } catch (err) {
      console.error('Error parsing route coordinates:', err);
    }
    return [];
  };

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
  };

  const centerOnBus = (bus: Bus) => {
    if (bus.current_location && mapRef.current) {
      mapRef.current.setView(
        [bus.current_location.latitude, bus.current_location.longitude],
        15
      );
    }
  };

  const centerOnRoute = (route: Route) => {
    const coordinates = getRouteCoordinates(route);
    if (coordinates.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(coordinates);
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading live map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Live Bus Tracking Map
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">
                    Active Buses: {getActiveBuses().length}
                  </span>
                </div>
                <button
                  onClick={loadData}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Filters and Controls */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Route
                </label>
                <select
                  value={selectedRoute}
                  onChange={e => setSelectedRoute(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Routes</option>
                  {routes.map(route => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Bus
                </label>
                <select
                  value={selectedBus}
                  onChange={e => setSelectedBus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Buses</option>
                  {buses.map(bus => (
                    <option key={bus.id} value={bus.id}>
                      {bus.number_plate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Map Zoom
                </label>
                <select
                  value={zoom}
                  onChange={e => setZoom(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value={8}>City Level</option>
                  <option value={10}>District Level</option>
                  <option value={12}>Neighborhood Level</option>
                  <option value={14}>Street Level</option>
                  <option value={16}>Building Level</option>
                </select>
              </div>

              <div className="flex items-end space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={e => setShowRoutes(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Show Routes
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showBuses}
                    onChange={e => setShowBuses(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show Buses</span>
                </label>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="mb-6">
              <div
                className="bg-gray-100 rounded-lg overflow-hidden"
                style={{ height: '500px' }}
              >
                <MapContainer
                  center={mapCenter}
                  zoom={zoom}
                  style={{ height: '100%', width: '100%' }}
                  whenCreated={handleMapReady}
                >
                  <MapController onRefresh={loadData} />

                  {/* OpenStreetMap Tiles */}
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />

                  {/* Route Lines */}
                  {showRoutes &&
                    routes.map(route => {
                      const coordinates = getRouteCoordinates(route);
                      const isSelected = selectedRoute === route.id;

                      return coordinates.length > 0 ? (
                        <Polyline
                          key={route.id}
                          positions={coordinates}
                          color={isSelected ? '#EF4444' : '#3B82F6'}
                          weight={isSelected ? 4 : 2}
                          opacity={0.8}
                          eventHandlers={{
                            click: () => centerOnRoute(route),
                          }}
                        >
                          <Popup>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {route.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {route.description}
                              </p>
                              <p className="text-sm text-gray-600">
                                Distance: {route.distance_km} km | Duration:{' '}
                                {route.estimated_duration_minutes} min
                              </p>
                              <p className="text-sm text-gray-600">
                                Buses on route:{' '}
                                {getBusesOnRoute(route.id).length}
                              </p>
                            </div>
                          </Popup>
                        </Polyline>
                      ) : null;
                    })}

                  {/* Bus Markers */}
                  {showBuses &&
                    buses
                      .filter(bus => bus.is_active && bus.current_location)
                      .filter(bus => !selectedBus || bus.id === selectedBus)
                      .filter(
                        bus => !selectedRoute || bus.route_id === selectedRoute
                      )
                      .map(bus => (
                        <Marker
                          key={bus.id}
                          position={[
                            bus.current_location!.latitude,
                            bus.current_location!.longitude,
                          ]}
                          icon={busIcon}
                          eventHandlers={{
                            click: () => centerOnBus(bus),
                          }}
                        >
                          <Popup>
                            <div className="min-w-[200px]">
                              <h3 className="font-medium text-gray-900 mb-2">
                                {bus.number_plate}
                              </h3>
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="font-medium">Driver:</span>{' '}
                                  {getDriverName(bus.assigned_driver_id)}
                                </p>
                                <p>
                                  <span className="font-medium">Route:</span>{' '}
                                  {getRouteName(bus.route_id)}
                                </p>
                                <p>
                                  <span className="font-medium">Capacity:</span>{' '}
                                  {bus.capacity}
                                </p>
                                {bus.model && (
                                  <p>
                                    <span className="font-medium">Model:</span>{' '}
                                    {bus.model}
                                  </p>
                                )}
                                <p>
                                  <span className="font-medium">
                                    Last Update:
                                  </span>{' '}
                                  {formatTime(bus.current_location!.timestamp)}
                                </p>
                                <p>
                                  <span className="font-medium">Location:</span>{' '}
                                  {bus.current_location!.latitude.toFixed(4)},{' '}
                                  {bus.current_location!.longitude.toFixed(4)}
                                </p>
                              </div>
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                </MapContainer>
              </div>
            </div>

            {/* Live Bus Status */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Active Buses */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Active Buses
                </h3>
                {getActiveBuses().length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No active buses found.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {getActiveBuses().map(bus => (
                      <div
                        key={bus.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {bus.number_plate}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Driver: {getDriverName(bus.assigned_driver_id)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Route: {getRouteName(bus.route_id)}
                            </p>
                            {bus.current_location && (
                              <p className="text-sm text-gray-600">
                                Last Update:{' '}
                                {formatTime(bus.current_location.timestamp)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-600">
                              Active
                            </span>
                          </div>
                        </div>
                        {bus.current_location && (
                          <div className="mt-2 text-xs text-gray-500">
                            Location: {bus.current_location.latitude.toFixed(4)}
                            , {bus.current_location.longitude.toFixed(4)}
                          </div>
                        )}
                        <button
                          onClick={() => centerOnBus(bus)}
                          className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          Center on Map
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Route Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Route Information
                </h3>
                {selectedRoute ? (
                  <div>
                    {(() => {
                      const route = getSelectedRouteData();
                      const busesOnRoute = getBusesOnRoute(selectedRoute);
                      return route ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {route.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {route.description}
                          </p>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                Distance:
                              </span>
                              <span className="text-sm text-gray-900 ml-2">
                                {route.distance_km} km
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                Duration:
                              </span>
                              <span className="text-sm text-gray-900 ml-2">
                                {route.estimated_duration_minutes} min
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              Buses on route:
                            </span>
                            <div className="mt-1">
                              {busesOnRoute.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {busesOnRoute.map(bus => (
                                    <span
                                      key={bus.id}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {bus.number_plate}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  No buses currently on this route
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => centerOnRoute(route)}
                            className="mt-3 text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition-colors"
                          >
                            Center Route on Map
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-500">Route not found.</p>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-500 text-center">
                      Select a route to view details
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                System Status
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Buses:</span>
                  <span className="text-blue-900 ml-2">{buses.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Active Buses:</span>
                  <span className="text-blue-900 ml-2">
                    {getActiveBuses().length}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Routes:</span>
                  <span className="text-blue-900 ml-2">{routes.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Drivers:</span>
                  <span className="text-blue-900 ml-2">{drivers.length}</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
