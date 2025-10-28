/**
 * Production Assignment Panel
 * Unified interface for all assignment operations
 * Industry-grade implementation with comprehensive validation and user experience
 */

import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../services/adminApiService';
import { logger } from '../utils/logger';
import AuthenticationGuard from './AuthenticationGuard';

interface AssignmentData {
  id: string;
  driver_id: string;
  bus_id: string;
  route_id: string;
  assigned_by: string;
  notes?: string;
  assigned_at: string;
  status: 'active' | 'inactive' | 'pending';
  // Display data
  bus_number?: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_email?: string;
  driver_phone?: string;
  route_name?: string;
  route_description?: string;
  route_city?: string;
}

interface AssignmentFormData {
  driver_id: string;
  bus_id: string;
  route_id: string;
  notes: string;
  status: 'active' | 'inactive' | 'pending';
}

interface AssignmentDashboard {
  total_assignments: number;
  active_assignments: number;
  unassigned_drivers: number;
  unassigned_buses: number;
  unassigned_routes: number;
  pending_assignments: number;
  recent_assignments: AssignmentData[];
}

interface ProductionAssignmentPanelProps {
  className?: string;
}

function ProductionAssignmentPanelContent({ className = '' }: ProductionAssignmentPanelProps) {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<AssignmentDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentData | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({
    driver_id: '',
    bus_id: '',
    route_id: '',
    notes: '',
    status: 'active'
  });

  // Handle navigation from driver management
  useEffect(() => {
    const handleNavigateToAssignments = (event: CustomEvent) => {
      const { driverId, driverName } = event.detail;
      setFormData(prev => ({
        ...prev,
        driver_id: driverId
      }));
      setShowForm(true);
      setSuccessMessage(`Pre-selected driver: ${driverName}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    };

    window.addEventListener('navigateToAssignments', handleNavigateToAssignments as EventListener);
    return () => {
      window.removeEventListener('navigateToAssignments', handleNavigateToAssignments as EventListener);
    };
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [assignmentsResult, driversResult, busesResult, routesResult, dashboardResult] = await Promise.all([
        adminApiService.getAllAssignments(),
        adminApiService.getAllDrivers(),
        adminApiService.getAllBuses(),
        adminApiService.getAllRoutes(),
        adminApiService.getAssignmentStatus(),
      ]);

      if (assignmentsResult.success && assignmentsResult.data) {
        setAssignments(assignmentsResult.data);
      }

      if (driversResult.success && driversResult.data) {
        setDrivers(driversResult.data);
      }

      if (busesResult.success && busesResult.data) {
        setBuses(busesResult.data);
      }

      if (routesResult.success && routesResult.data) {
        setRoutes(routesResult.data);
      }

      if (dashboardResult.success && dashboardResult.data) {
        setDashboard(dashboardResult.data);
      }

      logger.info('Production assignment data loaded successfully', 'production-assignment');
    } catch (err) {
      const errorMessage = 'Failed to load assignment data';
      setError(errorMessage);
      logger.error('Failed to load assignment data', 'production-assignment', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const dashboardResult = await adminApiService.getAssignmentStatus();
      if (dashboardResult.success && dashboardResult.data) {
        setDashboard(dashboardResult.data);
      }
    } catch (err) {
      logger.error('Error loading dashboard data', 'production-assignment', { error: String(err) });
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      driver_id: '',
      bus_id: '',
      route_id: '',
      notes: '',
      status: 'active'
    });
    setEditingAssignment(null);
    setShowForm(false);
  };

  const handleEdit = (assignment: AssignmentData) => {
    setEditingAssignment(assignment);
    setFormData({
      driver_id: assignment.driver_id || '',
      bus_id: assignment.bus_id || '',
      route_id: assignment.route_id || '',
      notes: assignment.notes || '',
      status: assignment.status || 'active'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (editingAssignment) {
        result = await adminApiService.updateAssignment(editingAssignment.bus_id, formData);
      } else {
        result = await adminApiService.createAssignment(formData);
      }

      if (result.success) {
        setSuccessMessage(editingAssignment ? 'Assignment updated successfully!' : 'Assignment created successfully!');
        resetForm();
        loadAllData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError('An error occurred while saving assignment');
      logger.error('Error saving assignment', 'production-assignment', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (busId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    setLoading(true);
    setError(null);

    try {
      const result = await adminApiService.removeAssignment(busId);
      if (result.success) {
        setSuccessMessage('Assignment removed successfully!');
        // Optimize: Only reload dashboard data instead of all data
        await loadDashboardData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to remove assignment');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while removing assignment';
      setError(errorMessage);
      logger.error('Error removing assignment', 'production-assignment', { 
        error: String(err),
        busId,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Assignment Management</h2>
          <p className="text-white/70">Unified driver-bus-route assignment system</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Create Assignment
        </button>
      </div>

      {/* Dashboard */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="card-glass p-4">
            <div className="text-sm text-white/70">Total Assignments</div>
            <div className="text-2xl font-bold text-white">{dashboard.total_assignments}</div>
          </div>
          <div className="card-glass p-4">
            <div className="text-sm text-white/70">Active Assignments</div>
            <div className="text-2xl font-bold text-green-400">{dashboard.active_assignments}</div>
          </div>
          <div className="card-glass p-4">
            <div className="text-sm text-white/70">Unassigned Drivers</div>
            <div className="text-2xl font-bold text-yellow-400">{dashboard.unassigned_drivers}</div>
          </div>
          <div className="card-glass p-4">
            <div className="text-sm text-white/70">Unassigned Buses</div>
            <div className="text-2xl font-bold text-orange-400">{dashboard.unassigned_buses}</div>
          </div>
          <div className="card-glass p-4">
            <div className="text-sm text-white/70">Unassigned Routes</div>
            <div className="text-2xl font-bold text-red-400">{dashboard.unassigned_routes}</div>
          </div>
          <div className="card-glass p-4">
            <div className="text-sm text-white/70">Pending</div>
            <div className="text-2xl font-bold text-blue-400">{dashboard.pending_assignments}</div>
          </div>
        </div>
      )}

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

      {/* Assignment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
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
                    Driver *
                  </label>
                  <select
                    name="driver_id"
                    value={formData.driver_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    style={{ color: 'white' }}
                  >
                    <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Driver</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                        {driver.first_name} {driver.last_name} ({driver.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Bus *
                  </label>
                  <select
                    name="bus_id"
                    value={formData.bus_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    style={{ color: 'white' }}
                  >
                    <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Bus</option>
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                        {bus.bus_number} - {bus.vehicle_no}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Route *
                  </label>
                  <select
                    name="route_id"
                    value={formData.route_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    style={{ color: 'white' }}
                  >
                    <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                        {route.name} ({route.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    style={{ color: 'white' }}
                  >
                    <option value="active" style={{ backgroundColor: '#1f2937', color: 'white' }}>Active</option>
                    <option value="inactive" style={{ backgroundColor: '#1f2937', color: 'white' }}>Inactive</option>
                    <option value="pending" style={{ backgroundColor: '#1f2937', color: 'white' }}>Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                  placeholder="Optional assignment notes..."
                />
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
                  {loading ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignments Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Bus
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
                  Assigned At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {assignments.map((assignment) => (
                <tr key={assignment.bus_id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-white font-medium">{assignment.bus_number}</div>
                      <div className="text-white/70 text-sm">{assignment.vehicle_no}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {assignment.driver_name ? (
                      <div>
                        <div className="text-white">{assignment.driver_name}</div>
                        <div className="text-white/70 text-sm">{assignment.driver_email}</div>
                      </div>
                    ) : (
                      <span className="text-white/50">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {assignment.route_name ? (
                      <div>
                        <div className="text-white">{assignment.route_name}</div>
                        <div className="text-white/70 text-sm">{assignment.route_city}</div>
                      </div>
                    ) : (
                      <span className="text-white/50">No route</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.status === 'active'
                        ? 'bg-green-500/20 text-green-300' 
                        : assignment.status === 'inactive'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {assignment.status || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70 text-sm">
                      {assignment.assigned_at 
                        ? new Date(assignment.assigned_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.bus_id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Remove
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

export default function ProductionAssignmentPanel({ className = '' }: ProductionAssignmentPanelProps) {
  return (
    <AuthenticationGuard requiredRole="admin">
      <ProductionAssignmentPanelContent className={className} />
    </AuthenticationGuard>
  );
}
