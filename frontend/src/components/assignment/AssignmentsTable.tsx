import React from 'react';

interface AssignmentData {
  bus_id: string;
  bus_number?: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_email?: string;
  route_name?: string;
  route_city?: string;
  status: 'active' | 'inactive' | 'pending' | string;
  assigned_at?: string;
}

interface AssignmentsTableProps {
  assignments: AssignmentData[];
  onEdit: (assignment: AssignmentData) => void;
  onDelete: (busId: string) => void;
}

const AssignmentsTable: React.FC<AssignmentsTableProps> = ({ assignments, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Bus</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Route</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Assigned At</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assignments.map((assignment) => (
              <tr key={assignment.bus_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-slate-900 font-medium">{assignment.bus_number}</div>
                    <div className="text-slate-600 text-sm">{assignment.vehicle_no}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {assignment.driver_name ? (
                    <div>
                      <div className="text-slate-900">{assignment.driver_name}</div>
                      <div className="text-slate-600 text-sm">{assignment.driver_email}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {assignment.route_name ? (
                    <div>
                      <div className="text-slate-900">{assignment.route_name}</div>
                      <div className="text-slate-600 text-sm">{assignment.route_city}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">No route</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    assignment.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : assignment.status === 'inactive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {assignment.status || 'Unassigned'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-600 text-sm">
                    {assignment.assigned_at
                      ? new Date(assignment.assigned_at).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onEdit(assignment)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">
                      Edit
                    </button>
                    <button onClick={() => onDelete(assignment.bus_id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">
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
  );
};

export default AssignmentsTable;


