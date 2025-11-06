import React from 'react';

interface BusRow {
  id: string;
  bus_number?: string;
  vehicle_no?: string;
  capacity?: number;
  model?: string;
  year?: number;
  driver_full_name?: string;
  driver_email?: string;
  route_name?: string;
  is_active?: boolean;
}

interface BusTableProps {
  buses: BusRow[];
  onEdit: (bus: BusRow) => void;
  onDelete: (busId: string) => void;
}

const BusTable: React.FC<BusTableProps> = ({ buses, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Bus Details</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Route</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {buses.map((bus) => (
              <tr key={bus.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-slate-900 font-medium">{bus.bus_number}</div>
                    <div className="text-slate-600 text-sm">{bus.vehicle_no}</div>
                    <div className="text-slate-600 text-sm">{bus.capacity} seats • {bus.model} • {bus.year}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {bus.driver_full_name ? (
                    <div>
                      <div className="text-slate-900">{bus.driver_full_name}</div>
                      <div className="text-slate-600 text-sm">{bus.driver_email}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {bus.route_name ? (
                    <span className="text-slate-900">{bus.route_name}</span>
                  ) : (
                    <span className="text-slate-400">No route</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bus.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {bus.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button onClick={() => onEdit(bus)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Edit</button>
                    <button onClick={() => onDelete(bus.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Delete</button>
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

export default BusTable;


