import React from 'react';

interface RouteFormData {
  name: string;
  description: string;
  distance_km: number;
  estimated_duration_minutes: number;
  is_active: boolean;
  city: string;
  coordinates?: [number, number][];
}

interface RouteFormModalProps {
  show: boolean;
  loading: boolean;
  editing: boolean;
  formData: RouteFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCoordinatesChange?: (coordinates: [number, number][]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const RouteFormModal: React.FC<RouteFormModalProps> = ({ 
  show, 
  loading, 
  editing, 
  formData, 
  onInputChange, 
  onCoordinatesChange,
  onSubmit, 
  onClose 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">{editing ? 'Edit Route' : 'Add New Route'}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/80 mb-1">Route Name *</label>
              <input type="text" name="name" value={formData.name} onChange={onInputChange} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="e.g., Route A - University to Downtown" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/80 mb-1">Description</label>
              <textarea name="description" value={formData.description} onChange={onInputChange} rows={3} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="Describe the route details..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Distance (km) *</label>
              <input type="number" name="distance_km" value={formData.distance_km} onChange={onInputChange} required min={0} step={0.1} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="15.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Duration (minutes) *</label>
              <input type="number" name="estimated_duration_minutes" value={formData.estimated_duration_minutes} onChange={onInputChange} required min={0} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="45" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">City *</label>
              <input type="text" name="city" value={formData.city} onChange={onInputChange} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="Ahmedabad" />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={onInputChange} className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500" />
              <label className="text-sm text-white/80">Active Route</label>
            </div>
          </div>
          
          {/* Route Path Drawer - Under Development */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Route Path (Optional)
            </label>
            <div className="relative">
              <div className="bg-white/5 border border-white/20 rounded-lg p-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-2xl mb-2">🚧</div>
                  <p className="text-sm font-medium text-white/90">Under Development</p>
                  <p className="text-xs text-white/60">
                    Route path drawing feature is currently under development and will be available soon.
                  </p>
                </div>
              </div>
              {/* Disabled overlay to prevent interaction */}
              <div className="absolute inset-0 bg-black/20 rounded-lg cursor-not-allowed" />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/70 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors">{loading ? 'Saving...' : editing ? 'Update Route' : 'Create Route'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteFormModal;


