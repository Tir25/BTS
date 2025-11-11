import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../api';
import { logger } from '../utils/logger';
import AuthenticationGuard from './AuthenticationGuard';
import DriverFormModal from './driver/DriverFormModal';
import DriversTable from './driver/DriversTable';
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
    if (!confirm('Are you sure you want to delete this driver? This will unassign their route from the bus, but the route will remain in the database.')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteDriver(driverId);
      if (result.success) {
        setSuccessMessage('Driver deleted successfully! Route has been unassigned from the bus.');
        loadDrivers();
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('refreshDashboard'));
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
      <DriverFormModal
        show={showForm}
        loading={loading}
        editing={!!editingDriver}
        formData={formData as any}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={resetForm}
      />

      {/* Driver Table */}
      <DriversTable
        drivers={drivers as any}
        onEdit={(d:any) => handleEdit(d as any)}
        onUnassign={(driverId:string, busId:string) => handleUnassign(driverId, busId)}
        onAssignNavigate={(driver:any) => {
          const event = new CustomEvent('navigateToAssignments', { detail: { driverId: driver.id, driverName: `${driver.first_name} ${driver.last_name}` } });
          window.dispatchEvent(event);
        }}
        onDelete={(driverId:string) => handleDelete(driverId)}
      />
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
