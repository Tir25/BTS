import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../api';
import { logger } from '../utils/logger';
import { Bus, BusData, BusFormData } from '../types';
import BusFormModal from './bus/BusFormModal';
import BusTable from './bus/BusTable';

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
        <div className="text-slate-600">Loading buses...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bus Management</h2>
          <p className="text-slate-600">Manage your bus fleet</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto"
        >
          Add New Bus
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

      {/* Bus Form Modal */}
      <BusFormModal
        show={showForm}
        loading={loading}
        drivers={drivers}
        routes={routes}
        formData={formData as any}
        editing={!!editingBus}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={resetForm}
      />

      {/* Bus Table */}
      <BusTable
        buses={buses as any}
        onEdit={(b:any) => handleEdit(b as any)}
        onDelete={(id:string) => handleDelete(id)}
      />
    </div>
  );
}
