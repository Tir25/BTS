import { useState, useEffect } from 'react';
import { adminApiService } from '../services/adminApiService';

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

interface Bus {
  id: string;
  number_plate: string;
  assigned_driver_id?: string;
}

export default function RouteManagement() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState<Partial<Route>>({
    name: '',
    description: '',
    distance_km: 0,
    estimated_duration_minutes: 0,
    is_active: true,
    stops: {
      type: 'LineString',
      coordinates: [],
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [routesResult, busesResult] = await Promise.all([
        adminApiService.getAllRoutes(),
        adminApiService.getAllBuses(),
      ]);

      if (routesResult.success && routesResult.data) {
        setRoutes(routesResult.data);
      }

      if (busesResult.success && busesResult.data) {
        if (busesResult.data) {
          setBuses(busesResult.data as Bus[]);
        }
      }

      if (!routesResult.success || !busesResult.success) {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('❌ Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async () => {
    if (
      !formData.name ||
      !formData.description ||
      !formData.distance_km ||
      !formData.estimated_duration_minutes
    ) {
      setError('Name, description, distance, and duration are required');
      return;
    }

    try {
      const routeData = {
        name: formData.name,
        description: formData.description,
        coordinates: formData.stops?.coordinates || [],
        distance_km: formData.distance_km,
        estimated_duration_minutes: formData.estimated_duration_minutes,
      };

      const result = await adminApiService.createRoute({
        ...routeData,
        coordinates: routeData.coordinates as [number, number][],
      });

      if (result.success && result.data) {
        setSuccess('Route created successfully!');
        setRoutes([...routes, result.data]);
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          distance_km: 0,
          estimated_duration_minutes: 0,
          is_active: true,
          stops: {
            type: 'LineString',
            coordinates: [],
          },
        });
      } else {
        setError(result.error || 'Failed to create route');
      }
    } catch (err) {
      setError('Failed to create route');
      console.error('❌ Create route error:', err);
    }
  };

  const handleUpdateRoute = async () => {
    if (
      !editingRoute?.id ||
      !formData.name ||
      !formData.description ||
      !formData.distance_km ||
      !formData.estimated_duration_minutes
    ) {
      setError('Name, description, distance, and duration are required');
      return;
    }

    try {
      const routeData = {
        name: formData.name,
        description: formData.description,
        coordinates: formData.stops?.coordinates || [],
        distance_km: formData.distance_km,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        is_active: formData.is_active,
      };

      const result = await adminApiService.updateRoute(editingRoute.id, {
        ...routeData,
        coordinates: routeData.coordinates as [number, number][],
      });

      if (result.success && result.data) {
        setSuccess('Route updated successfully!');
        if (result.data) {
          setRoutes(
            routes.map(route =>
              route.id === editingRoute.id ? result.data! : route
            )
          );
        }
        setEditingRoute(null);
        setFormData({
          name: '',
          description: '',
          distance_km: 0,
          estimated_duration_minutes: 0,
          is_active: true,
          stops: {
            type: 'LineString',
            coordinates: [],
          },
        });
      } else {
        setError(result.error || 'Failed to update route');
      }
    } catch (err) {
      setError('Failed to update route');
      console.error('❌ Update route error:', err);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) {
      return;
    }

    try {
      const result = await adminApiService.deleteRoute(routeId);

      if (result.success) {
        setSuccess('Route deleted successfully!');
        setRoutes(routes.filter(route => route.id !== routeId));
      } else {
        setError(result.error || 'Failed to delete route');
      }
    } catch (err) {
      setError('Failed to delete route');
      console.error('❌ Delete route error:', err);
    }
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description,
      distance_km: route.distance_km,
      estimated_duration_minutes: route.estimated_duration_minutes,
      is_active: route.is_active,
      stops: route.stops,
    });
  };

  const handleCancelEdit = () => {
    setEditingRoute(null);
    setShowCreateForm(false);
    setFormData({
      name: '',
      description: '',
      distance_km: 0,
      estimated_duration_minutes: 0,
      is_active: true,
      stops: {
        type: 'LineString',
        coordinates: [],
      },
    });
  };

  const getBusesOnRoute = (routeId: string) => {
    return buses.filter(bus => (bus as any).route_id === routeId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading route management...</p>
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
                Route Management
              </h1>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Add New Route
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-700">{success}</p>
              </div>
            )}

            {/* Create/Edit Form */}
            {(showCreateForm || editingRoute) && (
              <div className="mb-6 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRoute ? 'Edit Route' : 'Add New Route'}
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Route Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Ahmedabad to Gandhinagar"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance (km) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.distance_km}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          distance_km: parseFloat(e.target.value),
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="25.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_duration_minutes}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          estimated_duration_minutes: parseInt(e.target.value),
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="45"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Route description including major stops and landmarks..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Active Route
                      </span>
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Route Coordinates (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(
                        formData.stops?.coordinates || [],
                        null,
                        2
                      )}
                      onChange={e => {
                        try {
                          const coords = JSON.parse(e.target.value);
                          setFormData({
                            ...formData,
                            stops: {
                              type: 'LineString',
                              coordinates: coords,
                            },
                          });
                        } catch (err) {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                      placeholder="[[72.5714, 23.0225], [72.6369, 23.2156]]"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Format: Array of [longitude, latitude] coordinates
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={
                      editingRoute ? handleUpdateRoute : handleCreateRoute
                    }
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {editingRoute ? 'Update Route' : 'Create Route'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Routes List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                All Routes
              </h3>

              {routes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No routes found.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {routes.map(route => {
                    const busesOnRoute = getBusesOnRoute(route.id);
                    return (
                      <div
                        key={route.id}
                        className="bg-white border border-gray-200 rounded-lg p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {route.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {route.description}
                            </p>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              route.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {route.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
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
                              {formatDuration(route.estimated_duration_minutes)}
                            </span>
                          </div>
                        </div>

                        {route.route_map_url && (
                          <div className="mb-4">
                            <img
                              src={route.route_map_url}
                              alt={`Route map for ${route.name}`}
                              className="w-full h-32 object-cover rounded-md"
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Buses on this route:
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
                                No buses assigned
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditRoute(route)}
                            className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(route.id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() =>
                              window.open(
                                `/admin/map?route=${route.id}`,
                                '_blank'
                              )
                            }
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View on Map
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
