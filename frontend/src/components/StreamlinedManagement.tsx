import { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../services/adminApiService';


import MapSelector from './MapSelector';
// import { authService } from '../services/authService';

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
  // Driver information from backend join
  driver_id?: string;
  driver_full_name?: string;
  driver_email?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  // Route information from backend join
  route_name?: string;
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



interface AssignedDriver {
  driver_id: string;
  driver_name: string;
  driver_email: string;
  bus_id: string;
  bus_code: string;
  number_plate: string;
  route_name?: string;
}

interface Route {
  id: string;
  name: string;
  description: string;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
  city?: string;
  origin?: string;
  destination?: string;
  custom_destination?: string;
  custom_origin?: string;
  destination_coordinates?: {
    coordinates: [number, number];
  };
  origin_coordinates?: {
    coordinates: [number, number];
  };
  bus_stops?: Array<{
    name: string;
    coordinates: [number, number];
    address?: string;
  }>;
  current_eta_minutes?: number;
  last_eta_calculation?: string;
  created_at?: string;
  updated_at?: string;
}

export default function StreamlinedManagement() {
  const [activeTab, setActiveTab] = useState<'buses' | 'drivers' | 'routes'>(
    'buses'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [assignedDrivers, setAssignedDrivers] = useState<AssignedDriver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  const [showBusForm, setShowBusForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);

  // Modal states for details and editing
  const [showBusDetails, setShowBusDetails] = useState(false);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [editingBus, setEditingBus] = useState(false);
  const [editingRoute, setEditingRoute] = useState(false);

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
    assigned_bus_id: '',
  });

  const [selectedSupabaseDriver, setSelectedSupabaseDriver] =
    useState<string>('');

  const [routeForm, setRouteForm] = useState({
    name: '',
    description: '',
    distance_km: '',
    estimated_duration_minutes: '',
    is_active: true,
    city: '',
  });

  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSelectorType, setMapSelectorType] = useState<
    'destination' | 'origin'
  >('destination');
  const [selectedDestination, setSelectedDestination] = useState<{
    name: string;
    coordinates: [number, number];
    address?: string;
  } | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<{
    name: string;
    coordinates: [number, number];
    address?: string;
  } | null>(null);

  const loadAllData = useCallback(async () => {
    console.log('🔄 Starting to load all data...');
    setLoading(true);
    setError(null);

    try {
      // Load core data first
      const [busesResult, driversResult, routesResult] = await Promise.all([
        adminApiService.getAllBuses(),
        adminApiService.getAllDrivers(),
        adminApiService.getAllRoutes(),
      ]);

      if (busesResult.success && busesResult.data) setBuses(busesResult.data);
      if (driversResult.success && driversResult.data)
        setDrivers(driversResult.data);
      if (routesResult.success && routesResult.data) {
        console.log('🔍 Routes loaded:', routesResult.data);
        console.log(
          '🔍 Routes with city info:',
          routesResult.data.map((route) => ({
            id: route.id,
            name: route.name,
            city: route.city,
            cityType: typeof route.city,
          }))
        );
        setRoutes(routesResult.data);
      }

      console.log('✅ Core data loaded successfully');

      // Backend API already loaded drivers above, no need for separate Supabase loading
      console.log('✅ Using backend API drivers data');

      // Load assigned drivers
      await loadAssignedDrivers();

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
      console.log('🏁 Finished loading data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const loadAssignedDrivers = async () => {
    try {
      const result = await adminApiService.getAssignedDrivers();
      if (result.success && result.data) {
        setAssignedDrivers(result.data);
        console.log('✅ Assigned drivers loaded:', result.data.length);
      } else {
        console.warn('⚠️ Failed to load assigned drivers:', result.error);
        setAssignedDrivers([]);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load assigned drivers:', error);
      setAssignedDrivers([]);
    }
  };

  // Selection handlers - commented out to fix TypeScript errors
  // const handleSelectAll = (type: 'buses' | 'drivers' | 'routes') => {
  //   // Bulk delete functionality removed
  // };

  // const handleSelectItem = (type: 'buses' | 'drivers' | 'routes', id: string) => {
  //   // Bulk delete functionality removed
  // };

  // // Bulk delete handlers
  // const handleBulkDeleteBuses = async () => {
  //   // Bulk delete functionality removed
  // };

  // const handleBulkDeleteDrivers = async () => {
  //   // Bulk delete functionality removed
  // };

  // const handleBulkDeleteRoutes = async () => {
  //   // Bulk delete functionality removed
  // };

  // Bus Management Functions
  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check for duplicates before submitting
    const existingBus = buses.find(
      (bus) =>
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
        setBuses(buses.filter((bus) => bus.id !== busId));
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
          buses.map((bus) =>
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

  // Driver Management Functions

  // Removed unused handleDeleteDriver function

  const handleAssignBusToDriver = async (driverId: string, busId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.assignDriverToBus(driverId, busId);
      if (result.success && result.data) {
        // Reload all data to get the updated state from the server
        await loadAllData();
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

  const handleUnassignDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to unassign this driver?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.unassignDriverFromBus(driverId);
      if (result.success) {
        // Reload all data to get the updated state from the server
        await loadAllData();
        setSuccessMessage('Driver unassigned successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to unassign driver');
      }
    } catch (err) {
      setError('An error occurred while unassigning driver');
    } finally {
      setLoading(false);
    }
  };

  // Route Management Functions
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!routeForm.name.trim()) {
      setError('Route name is required');
      setLoading(false);
      return;
    }
    if (!routeForm.city.trim()) {
      setError('City is required');
      setLoading(false);
      return;
    }
    if (!routeForm.description.trim()) {
      setError('Route description is required');
      setLoading(false);
      return;
    }

    try {
      const routeData = {
        ...routeForm,
        distance_km: parseFloat(routeForm.distance_km) || 0,
        estimated_duration_minutes:
          parseInt(routeForm.estimated_duration_minutes) || 0,
        custom_destination: selectedDestination?.name,
        custom_destination_coordinates: selectedDestination?.coordinates,
        custom_origin: selectedOrigin?.name,
        custom_origin_coordinates: selectedOrigin?.coordinates,
        bus_stops: [],
      };



      const result = await adminApiService.createRoute(routeData);
      if (result.success && result.data) {
        setRoutes([...routes, result.data]);
        setRouteForm({
          name: '',
          description: '',
          distance_km: '',
          estimated_duration_minutes: '',
          is_active: true,
          city: '',
        });
        setSelectedDestination(null);
        setSelectedOrigin(null);
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
        setRoutes(routes.filter((route) => route.id !== routeId));
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
    const route = routes.find((r) => r.id === routeId);
    if (!route) return 'Unknown Route';

    // Format: City → Destination
    const city = route.city || 'Unknown City';
    const destination = route.destination || 'Ganpat University';
    return `${city} → ${destination}`;
  };

  const handleMapSelectorOpen = (type: 'destination' | 'origin') => {
    setMapSelectorType(type);
    setShowMapSelector(true);
  };

  const handleLocationSelect = (location: {
    name: string;
    coordinates: [number, number];
    address?: string;
  }) => {
    if (mapSelectorType === 'destination') {
      setSelectedDestination(location);
    } else {
      setSelectedOrigin(location);
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Not Assigned';
    const driver = drivers.find((d) => d.id === driverId);
    return driver
      ? `${driver.first_name} ${driver.last_name}`
      : 'Unknown Driver';
  };

  const getDriverNameFromBus = (bus: Bus) => {
    console.log('🔍 Getting driver name for bus:', {
      driver_full_name: bus.driver_full_name,
      driver_first_name: bus.driver_first_name,
      driver_last_name: bus.driver_last_name,
      assigned_driver_id: bus.assigned_driver_id,
    });

    if (bus.driver_full_name) {
      return bus.driver_full_name;
    }
    if (bus.driver_first_name && bus.driver_last_name) {
      return `${bus.driver_first_name} ${bus.driver_last_name}`;
    }
    if (bus.assigned_driver_id) {
      return getDriverName(bus.assigned_driver_id);
    }
    return 'Not Assigned';
  };

  const getBusPlate = (busId?: string) => {
    if (!busId) return 'Not Assigned';
    const bus = buses.find((b) => b.id === busId);
    return bus ? bus.number_plate : 'Unknown Bus';
  };

  // Modal and Edit Handlers
  const handleViewBusDetails = (bus: Bus) => {
    console.log('🔍 Bus details for modal:', bus);
    setSelectedBus(bus);
    setEditingBus(false);
    setShowBusDetails(true);
  };

  const handleEditBus = (bus: Bus) => {
    setSelectedBus(bus);
    setBusForm({
      code: bus.code,
      number_plate: bus.number_plate,
      capacity: bus.capacity,
      model: bus.model || '',
      year: bus.year || new Date().getFullYear(),
      is_active: bus.is_active,
    });
    setEditingBus(true);
    setShowBusDetails(true);
  };

  const handleViewRouteDetails = (route: Route) => {
    setSelectedRoute(route);
    setEditingRoute(false);
    setShowRouteDetails(true);
  };

  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setRouteForm({
      name: route.name,
      description: route.description,
      distance_km: route.distance_km.toString(),
      estimated_duration_minutes: route.estimated_duration_minutes.toString(),
      is_active: route.is_active,
      city: route.city || '',
    });
    setEditingRoute(true);
    setShowRouteDetails(true);
  };

  const handleUpdateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.updateBus(selectedBus.id, busForm);
      if (result.success && result.data) {
        setBuses(
          buses.map((bus) => (bus.id === selectedBus.id ? result.data! : bus))
        );
        setShowBusDetails(false);
        setEditingBus(false);
        setSelectedBus(null);
        setSuccessMessage('Bus updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to update bus');
      }
    } catch (err) {
      setError('An error occurred while updating bus');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute?.id) return;

    setLoading(true);
    setError(null);

    try {
      const routeData = {
        ...routeForm,
        distance_km: parseFloat(routeForm.distance_km) || 0,
        estimated_duration_minutes:
          parseInt(routeForm.estimated_duration_minutes) || 0,
      };

      const result = await adminApiService.updateRoute(
        selectedRoute.id,
        routeData
      );
      if (result.success && result.data) {
        setRoutes(
          routes.map((route) =>
            route.id === selectedRoute.id ? result.data! : route
          )
        );
        setShowRouteDetails(false);
        setEditingRoute(false);
        setSelectedRoute(null);
        setSuccessMessage('Route updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to update route');
      }
    } catch (err) {
      setError('An error occurred while updating route');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading management data...</span>
        <p className="text-sm text-gray-500 mt-2">
          This may take a few moments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🚍 Streamlined System Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage buses, drivers, and routes in one unified interface
            </p>
          </div>
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
              <div className="flex space-x-2">
                {/* {selectedBuses.size > 0 && (
                  <button
                    onClick={handleBulkDeleteBuses}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    🗑️ Delete Selected ({selectedBuses.size})
                  </button>
                )} */}
                <button
                  onClick={() => setShowBusForm(!showBusForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {showBusForm ? '❌ Cancel' : '➕ Add New Bus'}
                </button>
              </div>
            </div>

            {showBusForm && (
              <form
                onSubmit={handleCreateBus}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bus Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={busForm.code}
                      onChange={(e) =>
                        setBusForm({ ...busForm, code: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., BUS-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number Plate *
                    </label>
                    <input
                      type="text"
                      required
                      value={busForm.number_plate}
                      onChange={(e) =>
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
                      onChange={(e) =>
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
                      onChange={(e) =>
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
                      onChange={(e) =>
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
                      onChange={(e) =>
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
                      {/* <input
                        type="checkbox"
                        checked={selectedBuses.size === buses.length && buses.length > 0}
                        onChange={() => handleSelectAll('buses')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      /> */}
                    </th>
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
                      City
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
                  {buses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* <input
                          type="checkbox"
                          checked={selectedBuses.has(bus.id!)}
                          onChange={() => handleSelectItem('buses', bus.id!)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        /> */}
                      </td>
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
                          {getDriverNameFromBus(bus)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {bus.route_name || getRouteName(bus.route_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {bus.route_id
                            ? (() => {
                                const route = routes.find(
                                  (r) => r.id === bus.route_id
                                );
                                return route?.city || 'Not specified';
                              })()
                            : 'No route assigned'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewBusDetails(bus)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View details"
                            >
                              👁️ Details
                            </button>
                            <button
                              onClick={() => handleEditBus(bus)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit bus"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBus(bus.id!)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete bus"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                          <select
                            onChange={(e) =>
                              handleAssignRouteToBus(bus.id!, e.target.value)
                            }
                            value={bus.route_id || ''}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select Route</option>
                            {routes.map((route) => (
                              <option key={route.id} value={route.id}>
                                {route.name}
                              </option>
                            ))}
                          </select>
                        </div>
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
                Driver & Bus Assignment Management
              </h3>
              <div className="flex space-x-2">
                {/* {selectedDrivers.size > 0 && (
                  <button
                    onClick={handleBulkDeleteDrivers}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    🗑️ Delete Selected ({selectedDrivers.size})
                  </button>
                )} */}
                <button
                  onClick={() => setShowDriverForm(!showDriverForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {showDriverForm ? '❌ Cancel' : '🚗 Assign Driver to Bus'}
                </button>
              </div>
            </div>

            {showDriverForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Assign Bus to Driver
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a driver from Supabase authentication and assign them
                    to a bus.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Driver *
                    </label>
                    <select
                      required
                      value={selectedSupabaseDriver}
                      onChange={(e) =>
                        setSelectedSupabaseDriver(e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a driver...</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name} ({driver.email})
                        </option>
                      ))}
                    </select>
                    {drivers.length === 0 && (
                                              <p className="text-sm text-orange-600 mt-1">
                          No drivers found. Please create driver accounts first.
                        </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Bus *
                    </label>
                    <select
                      required
                      value={driverForm.assigned_bus_id || ''}
                      onChange={(e) =>
                        setDriverForm({
                          ...driverForm,
                          assigned_bus_id: e.target.value || '',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a bus...</option>
                      {buses.map((bus) => (
                        <option key={bus.id} value={bus.id}>
                          {bus.number_plate} ({bus.model || 'Unknown Model'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDriverForm(false);
                      setSelectedSupabaseDriver('');
                      setDriverForm({ ...driverForm, assigned_bus_id: '' });
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleAssignBusToDriver(
                        selectedSupabaseDriver,
                        driverForm.assigned_bus_id
                      )
                    }
                    disabled={
                      loading ||
                      !selectedSupabaseDriver ||
                      !driverForm.assigned_bus_id
                    }
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Assigning...' : 'Assign Driver to Bus'}
                  </button>
                </div>
              </div>
            )}

            {/* Available Drivers Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-blue-900">
                  🚗 Available Drivers
                </h4>
                <button
                  onClick={async () => {
                    try {
                      console.log('🔄 Manually refreshing drivers...');
                      const result = await adminApiService.getAllDrivers();
                      if (result.success && result.data) {
                        setDrivers(result.data);
                        console.log(
                          '✅ Manual refresh successful:',
                          result.data.length,
                          'drivers'
                        );
                      } else {
                        console.warn('⚠️ Manual refresh failed:', result.error);
                      }
                    } catch (error) {
                      console.warn('⚠️ Manual refresh failed:', error);
                    }
                  }}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                >
                  🔄 Refresh
                </button>
              </div>
              {drivers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="bg-white p-3 rounded border"
                    >
                      <div className="font-medium text-gray-900">
                        {driver.first_name} {driver.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {driver.email}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Role: {driver.role}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">No available drivers found.</p>
                  <p className="text-sm text-gray-500 mt-1">
                    All drivers are currently assigned to buses, or create new
                    driver accounts in Supabase Auth dashboard.
                  </p>
                  <p className="text-xs text-orange-500 mt-2">
                    💡 If you see this message but expect drivers to be
                    available, try clicking the "Refresh" button above.
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {/* <input
                        type="checkbox"
                        checked={selectedDrivers.size === drivers.length && drivers.length > 0}
                        onChange={() => handleSelectAll('drivers')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      /> */}
                    </th>
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
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* <input
                          type="checkbox"
                          checked={selectedDrivers.has(driver.id)}
                          onChange={() => handleSelectItem('drivers', driver.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        /> */}
                      </td>
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
                          onChange={(e) =>
                            handleAssignBusToDriver(driver.id, e.target.value)
                          }
                          value={driver.assigned_bus_id || ''}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Select Bus</option>
                          {buses.map((bus) => (
                            <option key={bus.id} value={bus.id}>
                              {bus.number_plate}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500 text-sm">
                          Supabase Auth user - Delete from Supabase dashboard
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assigned Drivers Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Currently Assigned Drivers
              </h3>
              <div className="text-sm text-gray-500">
                {assignedDrivers.length} driver
                {assignedDrivers.length !== 1 ? 's' : ''} assigned
              </div>
            </div>

            {assignedDrivers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">🚌</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No Drivers Assigned
                </h4>
                <p className="text-gray-600">
                  No drivers are currently assigned to buses.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Bus
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedDrivers.map((assignedDriver) => (
                      <tr
                        key={assignedDriver.driver_id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assignedDriver.driver_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignedDriver.driver_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assignedDriver.bus_code}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignedDriver.number_plate}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assignedDriver.route_name || 'No route assigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() =>
                              handleUnassignDriver(assignedDriver.driver_id)
                            }
                            disabled={loading}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Unassign driver from bus"
                          >
                            🚫 Unassign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              <div className="flex space-x-2">
                {/* {selectedRoutes.size > 0 && (
                  <button
                    onClick={handleBulkDeleteRoutes}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    🗑️ Delete Selected ({selectedRoutes.size})
                  </button>
                )} */}
                <button
                  onClick={() => setShowRouteForm(!showRouteForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {showRouteForm ? '❌ Cancel' : '➕ Add New Route'}
                </button>
              </div>
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
                      onChange={(e) =>
                        setRouteForm({ ...routeForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Downtown Express"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={routeForm.city}
                      onChange={(e) =>
                        setRouteForm({ ...routeForm, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Ahmedabad"
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
                      onChange={(e) =>
                        setRouteForm({
                          ...routeForm,
                          distance_km: e.target.value,
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
                      onChange={(e) =>
                        setRouteForm({
                          ...routeForm,
                          estimated_duration_minutes: e.target.value,
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
                      onChange={(e) =>
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
                    onChange={(e) =>
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

                {/* Destination and Origin Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        Default: Ganpat University
                      </div>
                      {selectedDestination && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <div className="font-medium text-green-800">
                            {selectedDestination.name}
                          </div>
                          <div className="text-sm text-green-600">
                            {selectedDestination.address}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMapSelectorOpen('destination')}
                        className="w-full px-3 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        🗺️ Set Custom Destination
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Origin (Starting Point)
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        Auto: Driver's live location
                      </div>
                      {selectedOrigin && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                          <div className="font-medium text-blue-800">
                            {selectedOrigin.name}
                          </div>
                          <div className="text-sm text-blue-600">
                            {selectedOrigin.address}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMapSelectorOpen('origin')}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        🗺️ Set Custom Origin (Optional)
                      </button>
                    </div>
                  </div>
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
                      {/* <input
                        type="checkbox"
                        checked={selectedRoutes.size === routes.length && routes.length > 0}
                        onChange={() => handleSelectAll('routes')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      /> */}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
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
                  {routes.map((route) => (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* <input
                          type="checkbox"
                          checked={selectedRoutes.has(route.id)}
                          onChange={() => handleSelectItem('routes', route.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        /> */}
                      </td>
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
                          {route.city || 'Not specified'}
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
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewRouteDetails(route)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View details"
                          >
                            👁️ Details
                          </button>
                          <button
                            onClick={() => handleEditRoute(route)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit route"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(route.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete route"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* Map Selector Modal */}
      {showMapSelector && (
        <MapSelector
          key={`map-selector-${mapSelectorType}`} // Add key to prevent re-rendering issues
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowMapSelector(false)}
          title={
            mapSelectorType === 'destination'
              ? 'Select Destination'
              : 'Select Origin'
          }
          searchPlaceholder={
            mapSelectorType === 'destination'
              ? 'Search for destination...'
              : 'Search for origin...'
          }
        />
      )}

      {/* Bus Details Modal */}
      {showBusDetails && selectedBus && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingBus ? 'Edit Bus Details' : 'Bus Details'}
              </h3>
              <button
                onClick={() => {
                  setShowBusDetails(false);
                  setEditingBus(false);
                  setSelectedBus(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {editingBus ? (
              <form onSubmit={handleUpdateBus} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bus Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={busForm.code}
                      onChange={(e) =>
                        setBusForm({ ...busForm, code: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number Plate *
                    </label>
                    <input
                      type="text"
                      required
                      value={busForm.number_plate}
                      onChange={(e) =>
                        setBusForm({ ...busForm, number_plate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      onChange={(e) =>
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
                      onChange={(e) =>
                        setBusForm({ ...busForm, model: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      value={busForm.year}
                      onChange={(e) =>
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
                      onChange={(e) =>
                        setBusForm({ ...busForm, is_active: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Active</label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingBus(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Bus'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Bus Code
                    </h4>
                    <p className="text-sm text-gray-900">{selectedBus.code}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Number Plate
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedBus.number_plate}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Capacity
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedBus.capacity} passengers
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Model
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedBus.model || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Year
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedBus.year || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Status
                    </h4>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedBus.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedBus.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Assigned Driver
                    </h4>
                    <p className="text-sm text-gray-900">
                      {getDriverNameFromBus(selectedBus)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Assigned Route
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedBus.route_name ||
                        getRouteName(selectedBus.route_id)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={() => setEditingBus(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Route Details Modal */}
      {showRouteDetails && selectedRoute && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingRoute ? 'Edit Route Details' : 'Route Details'}
              </h3>
              <button
                onClick={() => {
                  setShowRouteDetails(false);
                  setEditingRoute(false);
                  setSelectedRoute(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {editingRoute ? (
              <form onSubmit={handleUpdateRoute} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={routeForm.name}
                      onChange={(e) =>
                        setRouteForm({ ...routeForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={routeForm.city}
                      onChange={(e) =>
                        setRouteForm({ ...routeForm, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      onChange={(e) =>
                        setRouteForm({
                          ...routeForm,
                          distance_km: e.target.value,
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
                      onChange={(e) =>
                        setRouteForm({
                          ...routeForm,
                          estimated_duration_minutes: e.target.value,
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
                      onChange={(e) =>
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
                    onChange={(e) =>
                      setRouteForm({
                        ...routeForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingRoute(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Route'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Route Name
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRoute.name}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      City
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRoute.city || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Distance
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRoute.distance_km} km
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Duration
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRoute.estimated_duration_minutes} minutes
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Status
                    </h4>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedRoute.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedRoute.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Created
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRoute.created_at
                        ? new Date(
                            selectedRoute.created_at
                          ).toLocaleDateString()
                        : 'Not available'}
                    </p>
                  </div>
                </div>
                {selectedRoute.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-gray-900">
                      {selectedRoute.description}
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={() => setEditingRoute(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
