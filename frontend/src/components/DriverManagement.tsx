import { useState, useEffect } from 'react';
import { adminApiService } from '../services/adminApiService';

interface Driver {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  assigned_bus_id?: string;
  assigned_bus_plate?: string;
  profile_photo_url?: string;
  is_active?: boolean;
}

interface Bus {
  id: string;
  number_plate: string;
  capacity: number;
  model?: string;
}

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<Partial<Driver>>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [driversResult, busesResult] = await Promise.all([
        adminApiService.getAllDrivers(),
        adminApiService.getAllBuses(),
      ]);

      if (driversResult.success && driversResult.data) {
        setDrivers(driversResult.data);
      }

      if (busesResult.success && busesResult.data) {
        if (busesResult.data) {
          setBuses(busesResult.data as Bus[]);
        }
      }

      if (!driversResult.success || !busesResult.success) {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('❌ Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async () => {
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setError('Email, first name, and last name are required');
      return;
    }

    try {
      const result = await adminApiService.createDriver(
        formData as Omit<Driver, 'id'>
      );

      if (result.success && result.data) {
        setSuccess('Driver created successfully!');
        setDrivers([...drivers, result.data]);
        setShowCreateForm(false);
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          is_active: true,
        });
      } else {
        setError(result.error || 'Failed to create driver');
      }
    } catch (err) {
      setError('Failed to create driver');
      console.error('❌ Create driver error:', err);
    }
  };

  const handleUpdateDriver = async () => {
    if (
      !editingDriver?.id ||
      !formData.email ||
      !formData.first_name ||
      !formData.last_name
    ) {
      setError('Email, first name, and last name are required');
      return;
    }

    try {
      const result = await adminApiService.updateDriver(
        editingDriver.id,
        formData
      );

      if (result.success && result.data) {
        setSuccess('Driver updated successfully!');
        if (result.data) {
          setDrivers(
            drivers.map(driver =>
              driver.id === editingDriver.id ? result.data! : driver
            )
          );
        }
        setEditingDriver(null);
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          is_active: true,
        });
      } else {
        setError(result.error || 'Failed to update driver');
      }
    } catch (err) {
      setError('Failed to update driver');
      console.error('❌ Update driver error:', err);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) {
      return;
    }

    try {
      const result = await adminApiService.deleteDriver(driverId);

      if (result.success) {
        setSuccess('Driver deleted successfully!');
        setDrivers(drivers.filter(driver => driver.id !== driverId));
      } else {
        setError(result.error || 'Failed to delete driver');
      }
    } catch (err) {
      setError('Failed to delete driver');
      console.error('❌ Delete driver error:', err);
    }
  };

  const handleAssignBus = async (driverId: string, busId: string) => {
    try {
      const result = await adminApiService.assignDriverToBus(driverId, busId);

      if (result.success && result.data) {
        setSuccess('Driver assigned to bus successfully!');
        loadData(); // Refresh data to get updated assignments
      } else {
        setError(result.error || 'Failed to assign driver to bus');
      }
    } catch (err) {
      setError('Failed to assign driver to bus');
      console.error('❌ Assign bus error:', err);
    }
  };

  const handleUnassignBus = async (driverId: string) => {
    try {
      const result = await adminApiService.unassignDriverFromBus(driverId);

      if (result.success) {
        setSuccess('Driver unassigned from bus successfully!');
        loadData(); // Refresh data to get updated assignments
      } else {
        setError(result.error || 'Failed to unassign driver from bus');
      }
    } catch (err) {
      setError('Failed to unassign driver from bus');
      console.error('❌ Unassign bus error:', err);
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      email: driver.email,
      first_name: driver.first_name,
      last_name: driver.last_name,
      phone: driver.phone || '',
      is_active: driver.is_active,
    });
  };

  const handleCancelEdit = () => {
    setEditingDriver(null);
    setShowCreateForm(false);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      is_active: true,
    });
  };

  const getBusInfo = (busId?: string) => {
    if (!busId) return 'Not assigned';
    const bus = buses.find(b => b.id === busId);
    return bus ? `${bus.number_plate} (${bus.model || 'N/A'})` : 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading driver management...</p>
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
                Driver Management
              </h1>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Add New Driver
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
            {(showCreateForm || editingDriver) && (
              <div className="mb-6 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="driver@university.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={e =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={e =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Doe"
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
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={
                      editingDriver ? handleUpdateDriver : handleCreateDriver
                    }
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {editingDriver ? 'Update Driver' : 'Create Driver'}
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

            {/* Drivers List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                All Drivers
              </h3>

              {drivers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No drivers found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Bus
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
                      {drivers.map(driver => (
                        <tr key={driver.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {driver.profile_photo_url && (
                                <img
                                  src={driver.profile_photo_url}
                                  alt={`${driver.first_name} ${driver.last_name}`}
                                  className="h-10 w-10 rounded-full mr-3"
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {driver.first_name} {driver.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {driver.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {driver.email}
                            </div>
                            {driver.phone && (
                              <div className="text-sm text-gray-500">
                                {driver.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getBusInfo(driver.assigned_bus_id)}
                            </div>
                            {driver.assigned_bus_id && (
                              <button
                                onClick={() => handleUnassignBus(driver.id)}
                                className="text-xs text-red-600 hover:text-red-900"
                              >
                                Unassign
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                driver.is_active !== false
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {driver.is_active !== false
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col space-y-1">
                              <button
                                onClick={() => handleEditDriver(driver)}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                Edit
                              </button>
                              {!driver.assigned_bus_id && (
                                <select
                                  onChange={e =>
                                    e.target.value &&
                                    handleAssignBus(driver.id, e.target.value)
                                  }
                                  className="text-xs border border-gray-300 rounded px-1 py-1"
                                  defaultValue=""
                                >
                                  <option value="">Assign Bus</option>
                                  {buses.map(bus => (
                                    <option key={bus.id} value={bus.id}>
                                      {bus.number_plate}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={() => handleDeleteDriver(driver.id)}
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
