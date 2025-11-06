import React from 'react';

interface DriverRow {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  profile_photo_url?: string;
  assigned_bus_id?: string;
  assigned_bus_plate?: string;
  route_name?: string;
  is_active?: boolean;
}

interface DriversTableProps {
  drivers: DriverRow[];
  onEdit: (driver: DriverRow) => void;
  onUnassign: (driverId: string, busId: string) => void;
  onAssignNavigate: (driver: DriverRow) => void;
  onDelete: (driverId: string) => void;
}

const DriversTable: React.FC<DriversTableProps> = ({ drivers, onEdit, onUnassign, onAssignNavigate, onDelete }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Assignment</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {driver.profile_photo_url ? (
                      <img src={driver.profile_photo_url} alt={driver.first_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-700 font-medium">{driver.first_name?.[0]}{driver.last_name?.[0]}</span>
                      </div>
                    )}
                    <div>
                      <div className="text-slate-900 font-medium">{driver.first_name} {driver.last_name}</div>
                      <div className="text-slate-600 text-sm">{driver.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-600 text-sm">{driver.phone || 'No phone number'}</div>
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
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onEdit(driver)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Edit</button>
                    {driver.assigned_bus_id ? (
                      <button onClick={() => onUnassign(driver.id, driver.assigned_bus_id!)} className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Unassign</button>
                    ) : (
                      <button onClick={() => onAssignNavigate(driver)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Assign</button>
                    )}
                    <button onClick={() => onDelete(driver.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Delete</button>
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

export default DriversTable;


