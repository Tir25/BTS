import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../services/adminApiService';
import { logger } from '../utils/logger';
import { Bus, BusData, BusFormData } from '../types';

interface BusManagementPanelProps {
  className?: string;
}

export default function BusManagementPanel({ className = '' }: BusManagementPanelProps) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [formData, setFormData] = useState<BusFormData>({
    bus_number: '',
    vehicle_no: '',
    capacity: 0,
    model: '',
    year: new Date().getFullYear(),
    bus_image_url: '',
    assigned_driver_profile_id: '',
    route_id: '',
    is_active: true
  });

  // Load all data with optimized API calls to prevent rate limiting
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load buses first (most important for this panel)
      const busesResult = await adminApiService.getAllBuses();
      if (busesResult.success && busesResult.data) {
        const busesWithId = busesResult.data.map((bus: BusData): Bus => ({
          ...bus,
          id: bus.id || '',
          created_at: bus.created_at || new Date().toISOString(),
          updated_at: bus.updated_at || new Date().toISOString()
        }));
        setBuses(busesWithId);
      }

      // Add small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load drivers
      const driversResult = await adminApiService.getAllDrivers();
      if (driversResult.success && driversResult.data) {
        setDrivers(driversResult.data);
      }

      // Add small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load routes
      const routesResult = await adminApiService.getAllRoutes();
      if (routesResult.success && routesResult.data) {
        setRoutes(routesResult.data);
      }

      logger.info('Bus management data loaded successfully', 'bus-management');
    } catch (err) {
      const errorMessage = 'Failed to load bus management data';
      setError(errorMessage);
      logger.error('Failed to load bus management data', 'bus-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const resetForm = () => {
    setFormData({
      bus_number: '',
      vehicle_no: '',
      capacity: 0,
      model: '',
      year: new Date().getFullYear(),
      bus_image_url: '',
      assigned_driver_profile_id: '',
      route_id: '',
      is_active: true
    });
    setEditingBus(null);
    setShowForm(false);
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      bus_number: bus.bus_number || '',
      vehicle_no: bus.vehicle_no || '',
      capacity: bus.capacity || 0,
      model: bus.model || '',
      year: bus.year || new Date().getFullYear(),
      bus_image_url: bus.bus_image_url || '',
      assigned_driver_profile_id: bus.assigned_driver_profile_id || bus.driver_id || '',
      route_id: bus.route_id || '',
      is_active: bus.is_active !== false
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      // Convert BusFormData to the format expected by the API
      const apiData = {
        bus_number: formData.bus_number,  // Fixed: send bus_number as bus_number
        vehicle_no: formData.vehicle_no,  // Fixed: send vehicle_no as vehicle_no
        capacity: formData.capacity,
        model: formData.model,
        year: formData.year,
        bus_image_url: formData.bus_image_url,
        assigned_driver_profile_id: formData.assigned_driver_profile_id || undefined,
        route_id: formData.route_id || undefined,
        is_active: formData.is_active !== false // Ensure is_active is true unless explicitly false
      };
      
      if (editingBus) {
        result = await adminApiService.updateBus(editingBus.id, apiData);
      } else {
        result = await adminApiService.createBus(apiData);
      }

      if (result.success) {
        setSuccessMessage(editingBus ? 'Bus updated successfully!' : 'Bus created successfully!');
        resetForm();
        loadAllData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError('An error occurred while saving bus');
      logger.error('Error saving bus', 'bus-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteBus(busId);
      if (result.success) {
        setSuccessMessage('Bus deleted successfully!');
        loadAllData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete bus');
      }
    } catch (err) {
      setError('An error occurred while deleting bus');
      logger.error('Error deleting bus', 'bus-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  if (loading && buses.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading buses...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Bus Management</h2>
          <p className="text-white/70">Manage your bus fleet</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Add New Bus
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-green-300">{successMessage}</p>
        </div>
      )}

      {/* Bus Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingBus ? 'Edit Bus' : 'Add New Bus'}
              </h3>
              <button
                onClick={resetForm}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Bus Number *
                  </label>
                  <input
                    type="text"
                    name="bus_number"
                    value={formData.bus_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., BUS001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    name="vehicle_no"
                    value={formData.vehicle_no}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., GJ-01-AB-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Tata Starbus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Driver
                  </label>
                  <select
                    name="assigned_driver_profile_id"
                    value={formData.assigned_driver_profile_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Driver</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Route
                  </label>
                  <select
                    name="route_id"
                    value={formData.route_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    name="bus_image_url"
                    value={formData.bus_image_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com/bus-image.jpg"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                />
                <label className="text-sm text-white/80">Active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Saving...' : editingBus ? 'Update Bus' : 'Create Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bus Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Bus Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {buses.map((bus) => (
                <tr key={bus.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-white font-medium">{bus.bus_number}</div>
                      <div className="text-white/70 text-sm">{bus.vehicle_no}</div>
                      <div className="text-white/70 text-sm">
                        {bus.capacity} seats • {bus.model} • {bus.year}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {bus.driver_full_name ? (
                      <div>
                        <div className="text-white">{bus.driver_full_name}</div>
                        <div className="text-white/70 text-sm">{bus.driver_email}</div>
                      </div>
                    ) : (
                      <span className="text-white/50">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {bus.route_name ? (
                      <span className="text-white">{bus.route_name}</span>
                    ) : (
                      <span className="text-white/50">No route</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      bus.is_active 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {bus.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(bus)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(bus.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
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
      </div>
    </div>
  );
}
