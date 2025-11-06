import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../api';
import { logger } from '../utils/logger';
import { Route, RouteData } from '../types';
import RouteStopsManager from './admin/RouteStopsManager';
import RouteFormModal from './route/RouteFormModal';
import RoutesTable from './route/RoutesTable';

interface RouteFormData {
  name: string;
  description: string;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
  city: string;
}

interface RouteManagementPanelProps {
  className?: string;
}

export default function RouteManagementPanel({ className = '' }: RouteManagementPanelProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manageStopsRouteId, setManageStopsRouteId] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState<RouteFormData>({
    name: '',
    description: '',
    distance_km: 0,
    estimated_duration_minutes: 0,
    is_active: true,
    city: ''
  });

  // Load routes data
  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.getAllRoutes();
      if (result.success && result.data) {
        // Convert RouteData[] to Route[] by ensuring required fields are present
        const routesWithRequiredFields = result.data.map((route: RouteData): Route => ({
          ...route,
          geom: route.geom || null, // Ensure geom is present
          created_at: route.created_at || new Date().toISOString(),
          updated_at: route.updated_at || new Date().toISOString()
        }));
        setRoutes(routesWithRequiredFields);
        logger.info('Routes loaded successfully', 'route-management');
      } else {
        setError('Failed to load routes');
      }
    } catch (err) {
      const errorMessage = 'Failed to load routes';
      setError(errorMessage);
      logger.error('Failed to load routes', 'route-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      distance_km: 0,
      estimated_duration_minutes: 0,
      is_active: true,
      city: ''
    });
    setEditingRoute(null);
    setShowForm(false);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name || '',
      description: route.description || '',
      distance_km: route.distance_km || 0,
      estimated_duration_minutes: route.estimated_duration_minutes || 0,
      is_active: route.is_active !== false,
      city: route.city || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (editingRoute) {
        result = await adminApiService.updateRoute(editingRoute.id, formData);
      } else {
        result = await adminApiService.createRoute(formData);
      }

      if (result.success) {
        setSuccessMessage(editingRoute ? 'Route updated successfully!' : 'Route created successfully!');
        resetForm();
        loadRoutes();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError('An error occurred while saving route');
      logger.error('Error saving route', 'route-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.deleteRoute(routeId);
      if (result.success) {
        setSuccessMessage('Route deleted successfully!');
        loadRoutes();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to delete route');
      }
    } catch (err) {
      setError('An error occurred while deleting route');
      logger.error('Error deleting route', 'route-management', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  if (loading && routes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading routes...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Route Management</h2>
          <p className="text-slate-600">Manage your bus routes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto"
        >
          Add New Route
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

      <RouteFormModal
        show={showForm}
        loading={loading}
        editing={!!editingRoute}
        formData={formData as any}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={resetForm}
      />

      <RoutesTable
        routes={routes as any}
        onEdit={(r:any) => handleEdit(r as any)}
        onManageStops={(id:string) => setManageStopsRouteId(id)}
        onDelete={(id:string) => handleDelete(id)}
      />

      {manageStopsRouteId && (
        <RouteStopsManager routeId={manageStopsRouteId} onClose={() => setManageStopsRouteId(null)} />
      )}
    </div>
  );
}
