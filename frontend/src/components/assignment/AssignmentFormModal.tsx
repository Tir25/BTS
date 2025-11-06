import React from 'react';

interface AssignmentFormData {
  driver_id: string;
  bus_id: string;
  route_id: string;
  shift_id?: string;
  notes: string;
  status: 'active' | 'inactive' | 'pending';
}

interface AssignmentData {
  id: string;
  driver_id: string;
  bus_id: string;
  route_id: string;
  assigned_by: string;
  notes?: string;
  assigned_at: string;
  status: 'active' | 'inactive' | 'pending';
}

interface AssignmentFormModalProps {
  show: boolean;
  loading: boolean;
  drivers: any[];
  buses: any[];
  routes: any[];
  shifts: any[];
  formData: AssignmentFormData;
  editingAssignment: AssignmentData | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({
  show,
  loading,
  drivers,
  buses,
  routes,
  shifts,
  formData,
  editingAssignment,
  onInputChange,
  onSubmit,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Driver *</label>
              <select
                name="driver_id"
                value={formData.driver_id}
                onChange={onInputChange}
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
              <label className="block text-sm font-medium text-white/80 mb-1">Bus *</label>
              <select
                name="bus_id"
                value={formData.bus_id}
                onChange={onInputChange}
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
              <label className="block text-sm font-medium text-white/80 mb-1">Route *</label>
              <select
                name="route_id"
                value={formData.route_id}
                onChange={onInputChange}
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
              <label className="block text-sm font-medium text-white/80 mb-1">Shift *</label>
              <select
                name="shift_id"
                value={(formData as any).shift_id}
                onChange={onInputChange}
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                style={{ color: 'white' }}
              >
                <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Select Shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                    {shift.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={onInputChange}
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
            <label className="block text-sm font-medium text-white/80 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={onInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
              placeholder="Optional assignment notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/70 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors">
              {loading ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentFormModal;


