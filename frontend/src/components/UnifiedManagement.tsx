import { useState, useEffect } from 'react';
import { adminApiService } from '../services/adminApiService';

interface Bus {
  id?: string;
  code: string;
  number_plate: string;
  capacity: number;
  model?: string;
  year?: number;
  is_active: boolean;
  assigned_driver_id?: string;
  route_id?: string;
}

interface Driver {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  assigned_bus_id?: string;
}

interface Route {
  id: string;
  name: string;
  description: string;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
}

export default function UnifiedManagement() {
  const [activeTab, setActiveTab] = useState<'buses' | 'drivers' | 'routes'>(
    'buses'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  const [showBusForm, setShowBusForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);

  const [busForm, setBusForm] = useState({
    code: '',
    number_plate: '',
    capacity: 50,
    model: '',
    year: new Date().getFullYear(),
    is_active: true,
  });

  const [driverForm, setDriverForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'driver',
  });

  const [routeForm, setRouteForm] = useState({
    name: '',
    description: '',
    distance_km: 0,
    estimated_duration_minutes: 0,
    is_active: true,
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [busesResult, driversResult, routesResult] = await Promise.all([
        adminApiService.getAllBuses(),
        adminApiService.getAllDrivers(),
        adminApiService.getAllRoutes(),
      ]);

      if (busesResult.success && busesResult.data) setBuses(busesResult.data);
      if (driversResult.success && driversResult.data)
        setDrivers(driversResult.data);
      if (routesResult.success && routesResult.data)
        setRoutes(routesResult.data);

      if (
        !busesResult.success ||
        !driversResult.success ||
        !routesResult.success
      ) {
        setError('Failed to load some data');
      }
    } catch (err) {
      setError('An error occurred while loading data');
      console.error('❌ Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check for duplicates before submitting
    const existingBus = buses.find(
      bus =>
        bus.code === busForm.code || bus.number_plate === busForm.number_plate
    );

    if (existingBus) {
      setError(
        `Bus with code '${busForm.code}' or number plate '${busForm.number_plate}' already exists`
      );
      setLoading(false);
      return;
    }

    try {
      const result = await adminApiService.createBus(busForm);
      if (result.success && result.data) {
        setBuses([...buses, result.data]);
        setBusForm({
          code: '',
          number_plate: '',
          capacity: 50,
          model: '',
          year: new Date().getFullYear(),
          is_active: true,
        });
        setShowBusForm(false);
        setSuccessMessage('Bus created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to create bus');
      }
    } catch (err) {
      setError('An error occurred while creating bus');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBus = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteBus(busId);
      if (result.success) {
        setBuses(buses.filter(bus => bus.id !== busId));
        setSuccessMessage('Bus deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete bus');
      }
    } catch (err) {
      setError('An error occurred while deleting bus');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRouteToBus = async (busId: string, routeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.updateBus(busId, {
        route_id: routeId,
      });
      if (result.success && result.data) {
        setBuses(
          buses.map(bus =>
            bus.id === busId ? { ...bus, route_id: routeId } : bus
          )
        );
        setSuccessMessage('Route assigned to bus successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to assign route to bus');
      }
    } catch (err) {
      setError('An error occurred while assigning route to bus');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.createDriver(driverForm);
      if (result.success && result.data) {
        setDrivers([...drivers, result.data]);
        setDriverForm({
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          role: 'driver',
        });
        setShowDriverForm(false);
        setSuccessMessage('Driver created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to create driver');
      }
    } catch (err) {
      setError('An error occurred while creating driver');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteDriver(driverId);
      if (result.success) {
        setDrivers(drivers.filter(driver => driver.id !== driverId));
        setSuccessMessage('Driver deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete driver');
      }
    } catch (err) {
      setError('An error occurred while deleting driver');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBusToDriver = async (driverId: string, busId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.assignDriverToBus(driverId, busId);
      if (result.success && result.data) {
        setDrivers(
          drivers.map(driver =>
            driver.id === driverId
              ? { ...driver, assigned_bus_id: busId }
              : driver
          )
        );
        setSuccessMessage('Bus assigned to driver successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to assign bus to driver');
      }
    } catch (err) {
      setError('An error occurred while assigning bus to driver');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const routeData = {
        ...routeForm,
        stops: {
          type: 'LineString' as const,
          coordinates: [
            [0, 0],
            [0, 0],
          ],
        },
      };

      const result = await adminApiService.createRoute(routeData);
      if (result.success && result.data) {
        setRoutes([...routes, result.data]);
        setRouteForm({
          name: '',
          description: '',
          distance_km: 0,
          estimated_duration_minutes: 0,
          is_active: true,
        });
        setShowRouteForm(false);
        setSuccessMessage('Route created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to create route');
      }
    } catch (err) {
      setError('An error occurred while creating route');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteRoute(routeId);
      if (result.success) {
        setRoutes(routes.filter(route => route.id !== routeId));
        setSuccessMessage('Route deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete route');
      }
    } catch (err) {
      setError('An error occurred while deleting route');
    } finally {
      setLoading(false);
    }
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return 'Not Assigned';
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown Route';
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Not Assigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver
      ? `${driver.first_name} ${driver.last_name}`
      : 'Unknown Driver';
  };

  const getBusPlate = (busId?: string) => {
    if (!busId) return 'Not Assigned';
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.number_plate : 'Unknown Bus';
  };

  if (
    loading &&
    buses.length === 0 &&
    drivers.length === 0 &&
    routes.length === 0
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading management data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            🚍 Unified System Management
          </h2>
          <button
            onClick={loadAllData}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('buses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'buses'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🚌 Buses ({buses.length})
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drivers'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👨‍💼 Drivers ({drivers.length})
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'routes'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🗺️ Routes ({routes.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Bus Management Tab */}
      {activeTab === 'buses' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Bus Management
              </h3>
              <button
                onClick={() => setShowBusForm(!showBusForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {showBusForm ? '❌ Cancel' : '➕ Add New Bus'}
              </button>
            </div>

            {showBusForm && (
              <form
                onSubmit={handleCreateBus}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number Plate *
                    </label>
                    <input
                      type="text"
                      required
                      value={busForm.number_plate}
                      onChange={e =>
                        setBusForm({ ...busForm, number_plate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., GJ-01-AB-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity *
                    </label>
                    <input
                      type="number"
                      required
                      value={busForm.capacity}
                      onChange={e =>
                        setBusForm({
                          ...busForm,
                          capacity: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={busForm.model}
                      onChange={e =>
                        setBusForm({ ...busForm, model: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mercedes-Benz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      value={busForm.year}
                      onChange={e =>
                        setBusForm({
                          ...busForm,
                          year: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="2000"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={busForm.is_active}
                      onChange={e =>
                        setBusForm({ ...busForm, is_active: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Active</label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Bus'}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bus Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Route
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
                    <tr key={bus.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {bus.number_plate}
                          </div>
                          <div className="text-sm text-gray-500">
                            Capacity: {bus.capacity} | {bus.model} ({bus.year})
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getDriverName(bus.assigned_driver_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getRouteName(bus.route_id)}
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <select
                          onChange={e =>
                            handleAssignRouteToBus(bus.id!, e.target.value)
                          }
                          value={bus.route_id || ''}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Select Route</option>
                          {routes.map(route => (
                            <option key={route.id} value={route.id}>
                              {route.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDeleteBus(bus.id!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Driver Management Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Driver Management
              </h3>
              <button
                onClick={() => setShowDriverForm(!showDriverForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {showDriverForm ? '❌ Cancel' : '➕ Add New Driver'}
              </button>
            </div>

            {showDriverForm && (
              <form
                onSubmit={handleCreateDriver}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.first_name}
                      onChange={e =>
                        setDriverForm({
                          ...driverForm,
                          first_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.last_name}
                      onChange={e =>
                        setDriverForm({
                          ...driverForm,
                          last_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={driverForm.email}
                      onChange={e =>
                        setDriverForm({ ...driverForm, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={driverForm.phone}
                      onChange={e =>
                        setDriverForm({ ...driverForm, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Driver'}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Bus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drivers.map(driver => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {driver.first_name} {driver.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Role: {driver.role}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {driver.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {driver.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getBusPlate(driver.assigned_bus_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <select
                          onChange={e =>
                            handleAssignBusToDriver(driver.id, e.target.value)
                          }
                          value={driver.assigned_bus_id || ''}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Select Bus</option>
                          {buses.map(bus => (
                            <option key={bus.id} value={bus.id}>
                              {bus.number_plate}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Route Management Tab */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Route Management
              </h3>
              <button
                onClick={() => setShowRouteForm(!showRouteForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {showRouteForm ? '❌ Cancel' : '➕ Add New Route'}
              </button>
            </div>

            {showRouteForm && (
              <form
                onSubmit={handleCreateRoute}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={routeForm.name}
                      onChange={e =>
                        setRouteForm({ ...routeForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Downtown Express"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distance (km) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={routeForm.distance_km}
                      onChange={e =>
                        setRouteForm({
                          ...routeForm,
                          distance_km: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      value={routeForm.estimated_duration_minutes}
                      onChange={e =>
                        setRouteForm({
                          ...routeForm,
                          estimated_duration_minutes: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={routeForm.is_active}
                      onChange={e =>
                        setRouteForm({
                          ...routeForm,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Active</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={routeForm.description}
                    onChange={e =>
                      setRouteForm({
                        ...routeForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Route description..."
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Route'}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance & Duration
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
                  {routes.map(route => (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {route.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {route.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {route.distance_km} km
                        </div>
                        <div className="text-sm text-gray-500">
                          {route.estimated_duration_minutes} min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            route.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {route.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
