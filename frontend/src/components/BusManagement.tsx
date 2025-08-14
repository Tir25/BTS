import { useState, useEffect } from 'react';
import { adminApiService } from '../services/adminApiService';

interface Bus {
  id?: string;
  number_plate: string;
  capacity: number;
  model?: string;
  year?: number;
  assigned_driver_id?: string;
  route_id?: string;
  is_active?: boolean;
  bus_image_url?: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Route {
  id: string;
  name: string;
  description: string;
}

export default function BusManagement() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formData, setFormData] = useState<Partial<Bus>>({
    number_plate: '',
    capacity: 0,
    model: '',
    year: new Date().getFullYear(),
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [busesResult, driversResult, routesResult] = await Promise.all([
        adminApiService.getAllBuses(),
        adminApiService.getAllDrivers(),
        adminApiService.getAllRoutes(),
      ]);

      if (busesResult.success && busesResult.data) {
        setBuses(busesResult.data);
      }

      if (driversResult.success && driversResult.data) {
        setDrivers(driversResult.data);
      }

      if (routesResult.success && routesResult.data) {
        setRoutes(routesResult.data);
      }

      if (
        !busesResult.success ||
        !driversResult.success ||
        !routesResult.success
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

  const handleCreateBus = async () => {
    if (!formData.number_plate || !formData.capacity) {
      setError('Number plate and capacity are required');
      return;
    }

    try {
      const result = await adminApiService.createBus(
        formData as Omit<Bus, 'id'>
      );

      if (result.success && result.data) {
        setSuccess('Bus created successfully!');
        setBuses([...buses, result.data]);
        setShowCreateForm(false);
        setFormData({
          number_plate: '',
          capacity: 0,
          model: '',
          year: new Date().getFullYear(),
          is_active: true,
        });
      } else {
        setError(result.error || 'Failed to create bus');
      }
    } catch (err) {
      setError('Failed to create bus');
      console.error('❌ Create bus error:', err);
    }
  };

  const handleUpdateBus = async () => {
    if (!editingBus?.id || !formData.number_plate || !formData.capacity) {
      setError('Number plate and capacity are required');
      return;
    }

    try {
      const result = await adminApiService.updateBus(editingBus.id, formData);

      if (result.success && result.data) {
        setSuccess('Bus updated successfully!');
        if (result.data) {
          setBuses(
            buses.map(bus => (bus.id === editingBus.id ? result.data! : bus))
          );
        }
        setEditingBus(null);
        setFormData({
          number_plate: '',
          capacity: 0,
          model: '',
          year: new Date().getFullYear(),
          is_active: true,
        });
      } else {
        setError(result.error || 'Failed to update bus');
      }
    } catch (err) {
      setError('Failed to update bus');
      console.error('❌ Update bus error:', err);
    }
  };

  const handleDeleteBus = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) {
      return;
    }

    try {
      const result = await adminApiService.deleteBus(busId);

      if (result.success) {
        setSuccess('Bus deleted successfully!');
        setBuses(buses.filter(bus => bus.id !== busId));
      } else {
        setError(result.error || 'Failed to delete bus');
      }
    } catch (err) {
      setError('Failed to delete bus');
      console.error('❌ Delete bus error:', err);
    }
  };

  const handleEditBus = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      number_plate: bus.number_plate,
      capacity: bus.capacity,
      model: bus.model || '',
      year: bus.year || new Date().getFullYear(),
      is_active: bus.is_active,
      assigned_driver_id: bus.assigned_driver_id,
      route_id: bus.route_id,
    });
  };

  const handleCancelEdit = () => {
    setEditingBus(null);
    setShowCreateForm(false);
    setFormData({
      number_plate: '',
      capacity: 0,
      model: '',
      year: new Date().getFullYear(),
      is_active: true,
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bus management...</p>
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
                Bus Management
              </h1>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Add New Bus
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
            {(showCreateForm || editingBus) && (
              <div className="mb-6 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingBus ? 'Edit Bus' : 'Add New Bus'}
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number Plate *
                    </label>
                    <input
                      type="text"
                      value={formData.number_plate}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          number_plate: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., GJ-01-AB-1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity *
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          capacity: parseInt(e.target.value),
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={e =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Volvo B7R"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          year: parseInt(e.target.value),
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="2020"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Driver
                    </label>
                    <select
                      value={formData.assigned_driver_id || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          assigned_driver_id: e.target.value || undefined,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Route
                    </label>
                    <select
                      value={formData.route_id || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          route_id: e.target.value || undefined,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select Route</option>
                      {routes.map(route => (
                        <option key={route.id} value={route.id}>
                          {route.name}
                        </option>
                      ))}
                    </select>
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
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={editingBus ? handleUpdateBus : handleCreateBus}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {editingBus ? 'Update Bus' : 'Create Bus'}
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

            {/* Buses List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                All Buses
              </h3>

              {buses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No buses found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bus Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {buses.map(bus => (
                        <tr key={bus.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {bus.number_plate}
                              </div>
                              <div className="text-sm text-gray-500">
                                Capacity: {bus.capacity} | Model:{' '}
                                {bus.model || 'N/A'}
                              </div>
                              {bus.year && (
                                <div className="text-sm text-gray-500">
                                  Year: {bus.year}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getDriverName(bus.assigned_driver_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getRouteName(bus.route_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                bus.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {bus.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditBus(bus)}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  bus.id && handleDeleteBus(bus.id)
                                }
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
