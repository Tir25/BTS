/**
 * Production Assignment Panel
 * Unified interface for all assignment operations
 * Industry-grade implementation with comprehensive validation and user experience
 */

import React, { useState, useEffect, useCallback } from 'react';
import { adminApiService } from '../api';
import { logger } from '../utils/logger';
import AuthenticationGuard from './AuthenticationGuard';
import AssignmentFormModal from './assignment/AssignmentFormModal';
import AssignmentsTable from './assignment/AssignmentsTable';

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
  shift_id?: string;
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
  const [shifts, setShifts] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<AssignmentDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentData | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({
    driver_id: '',
    bus_id: '',
    route_id: '',
    shift_id: '',
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
      const [assignmentsResult, driversResult, busesResult, routesResult, dashboardResult, shiftsResult] = await Promise.all([
        adminApiService.getAllAssignments(),
        adminApiService.getAllDrivers(),
        adminApiService.getAllBuses(),
        adminApiService.getAllRoutes(),
        adminApiService.getAssignmentStatus(),
        adminApiService.getShifts(),
      ]);

      if (assignmentsResult.success && assignmentsResult.data) {
        setAssignments(assignmentsResult.data);
      } else if (!assignmentsResult.success) {
        setError(assignmentsResult.error || 'Failed to load assignments');
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

      if (shiftsResult.success && shiftsResult.data) {
        setShifts(shiftsResult.data);
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
    if (submitting) return; // prevent duplicate submits
    setSubmitting(true);
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
      setSubmitting(false);
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
        // Reload all data immediately to show updated state
        await loadAllData();
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
        <div className="text-slate-600">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assignment Management</h2>
          <p className="text-slate-600">Unified driver-bus-route assignment system</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto"
        >
          Create Assignment
        </button>
      </div>

      {/* Dashboard */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4">
            <div className="text-sm text-slate-600">Total Assignments</div>
            <div className="text-2xl font-bold text-slate-900">{dashboard.total_assignments}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4">
            <div className="text-sm text-slate-600">Active Assignments</div>
            <div className="text-2xl font-bold text-green-700">{dashboard.active_assignments}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4">
            <div className="text-sm text-slate-600">Unassigned Drivers</div>
            <div className="text-2xl font-bold text-yellow-700">{dashboard.unassigned_drivers}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4">
            <div className="text-sm text-slate-600">Unassigned Buses</div>
            <div className="text-2xl font-bold text-orange-700">{dashboard.unassigned_buses}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4">
            <div className="text-sm text-slate-600">Unassigned Routes</div>
            <div className="text-2xl font-bold text-red-700">{dashboard.unassigned_routes}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4">
            <div className="text-sm text-slate-600">Pending</div>
            <div className="text-2xl font-bold text-blue-700">{dashboard.pending_assignments}</div>
          </div>
        </div>
      )}

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

      {/* Assignment Form Modal */}
      <AssignmentFormModal
        show={showForm}
        loading={loading}
        drivers={drivers}
        buses={buses}
        routes={routes}
        shifts={shifts}
        formData={formData as any}
        editingAssignment={editingAssignment as any}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={resetForm}
      />

      {/* Assignments Table */}
      <AssignmentsTable
        assignments={assignments as any}
        onEdit={(a:any) => handleEdit(a)}
        onDelete={(id:string) => handleDelete(id)}
      />
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
