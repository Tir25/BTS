import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../services/adminApiService';
import { logger } from '../utils/logger';
import AuthenticationGuard from './AuthenticationGuard';
import { Driver, DriverData, DriverFormData } from '../types';

interface DriverManagementPanelProps {
  className?: string;
}

function DriverManagementPanelContent({ className = '' }: DriverManagementPanelProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    profile_photo_url: '',
    password: '',
    role: 'driver'
  });

  // Load drivers data
  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.getAllDrivers();
      if (result.success && result.data) {
        // Convert DriverData[] to Driver[] by ensuring required fields are present
        const driversWithRequiredFields = result.data.map((driver: DriverData): Driver => ({
          ...driver,
          driver_id: driver.driver_id || driver.id,
          created_at: driver.created_at || new Date().toISOString()
        }));
        setDrivers(driversWithRequiredFields);
        logger.info('Drivers loaded successfully', 'driver-management');
      } else {
        setError('Failed to load drivers');
      }
    } catch (err) {
      const errorMessage = 'Failed to load drivers';
      setError(errorMessage);
      logger.error('Failed to load drivers', 'driver-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      profile_photo_url: '',
      password: '',
      role: 'driver'
    });
    setEditingDriver(null);
    setShowForm(false);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      email: driver.email || '',
      first_name: driver.first_name || '',
      last_name: driver.last_name || '',
      phone: driver.phone || '',
      profile_photo_url: driver.profile_photo_url || '',
      password: '', // Don't pre-fill password
      role: 'driver'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (editingDriver) {
        // For updates, only send changed fields
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't send empty password
        }
        result = await adminApiService.updateDriver(editingDriver.id, updateData);
      } else {
        // For new drivers, password is required
        if (!formData.password) {
          setError('Password is required for new drivers');
          setLoading(false);
          return;
        }
        // Ensure password is provided for new drivers
        const createData = { ...formData, password: formData.password || '' };
        result = await adminApiService.createDriver(createData);
      }

      if (result.success) {
        setSuccessMessage(editingDriver ? 'Driver updated successfully!' : 'Driver created successfully!');
        resetForm();
        loadDrivers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError('An error occurred while saving driver');
      logger.error('Error saving driver', 'driver-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteDriver(driverId);
      if (result.success) {
        setSuccessMessage('Driver deleted successfully!');
        loadDrivers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete driver');
      }
    } catch (err) {
      setError('An error occurred while deleting driver');
      logger.error('Error deleting driver', 'driver-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (driverId: string, busId: string) => {
    if (!confirm('Are you sure you want to unassign this driver from their bus?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.removeAssignment(busId, 'Driver unassigned from driver management panel');
      if (result.success) {
        setSuccessMessage('Driver unassigned successfully!');
        loadDrivers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to unassign driver');
      }
    } catch (err) {
      setError('An error occurred while unassigning driver');
      logger.error('Error unassigning driver', 'driver-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  if (loading && drivers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Driver Management</h2>
          <p className="text-slate-600">Manage your driver team</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto"
        >
          Add New Driver
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Driver Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
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
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    {editingDriver ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingDriver}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    name="profile_photo_url"
                    value={formData.profile_photo_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
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
                  {loading ? 'Saving...' : editingDriver ? 'Update Driver' : 'Create Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Assignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {driver.profile_photo_url ? (
                        <img
                          src={driver.profile_photo_url}
                          alt={driver.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-slate-700 font-medium">
                            {driver.first_name?.[0]}{driver.last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-slate-900 font-medium">
                          {driver.first_name} {driver.last_name}
                        </div>
                        <div className="text-slate-600 text-sm">{driver.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 text-sm">
                      {driver.phone || 'No phone number'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {driver.assigned_bus_id ? (
                      <div>
                        <div className="text-slate-900">{driver.assigned_bus_plate}</div>
                        <div className="text-slate-600 text-sm">{driver.route_name}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      driver.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(driver)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly"
                      >
                        Edit
                      </button>
                      {driver.assigned_bus_id ? (
                        <button
                          onClick={() => driver.assigned_bus_id && handleUnassign(driver.id, driver.assigned_bus_id)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly"
                        >
                          Unassign
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // Navigate to assignments tab with pre-selected driver
                            const event = new CustomEvent('navigateToAssignments', { 
                              detail: { driverId: driver.id, driverName: `${driver.first_name} ${driver.last_name}` }
                            });
                            window.dispatchEvent(event);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly"
                        >
                          Assign
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(driver.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly"
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

export default function DriverManagementPanel({ className = '' }: DriverManagementPanelProps) {
  return (
    <AuthenticationGuard requiredRole="admin">
      <DriverManagementPanelContent className={className} />
    </AuthenticationGuard>
  );
}
