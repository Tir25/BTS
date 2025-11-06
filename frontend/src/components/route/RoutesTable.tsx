import React from 'react';

interface RouteRow {
  id: string;
  name: string;
  description?: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  city?: string;
  is_active?: boolean;
}

interface RoutesTableProps {
  routes: RouteRow[];
  onEdit: (route: RouteRow) => void;
  onManageStops: (routeId: string) => void;
  onDelete: (routeId: string) => void;
}

const RoutesTable: React.FC<RoutesTableProps> = ({ routes, onEdit, onManageStops, onDelete }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Route Details</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Distance & Duration</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {routes.map((route) => (
              <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-slate-900 font-medium">{route.name}</div>
                    {route.description && <div className="text-slate-600 text-sm mt-1">{route.description}</div>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-600 text-sm">
                    <div>{route.distance_km} km</div>
                    <div>{route.estimated_duration_minutes} minutes</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-600 text-sm">{route.city || 'No city specified'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${route.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {route.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onEdit(route)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Edit</button>
                    <button onClick={() => onManageStops(route.id)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Manage Stops</button>
                    <button onClick={() => onDelete(route.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors min-h-[36px] touch-friendly">Delete</button>
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

export default RoutesTable;


