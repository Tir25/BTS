import React from 'react';

interface DriverFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_photo_url: string;
  password?: string;
  role: 'driver' | string;
}

interface DriverFormModalProps {
  show: boolean;
  loading: boolean;
  editing: boolean;
  formData: DriverFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const DriverFormModal: React.FC<DriverFormModalProps> = ({ show, loading, editing, formData, onInputChange, onSubmit, onClose }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">{editing ? 'Edit Driver' : 'Add New Driver'}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">First Name *</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={onInputChange} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Last Name *</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={onInputChange} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={onInputChange} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="john.doe@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={onInputChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">{editing ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
              <input type="password" name="password" value={formData.password || ''} onChange={onInputChange} required={!editing} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Profile Photo URL</label>
              <input type="url" name="profile_photo_url" value={formData.profile_photo_url} onChange={onInputChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500" placeholder="https://example.com/photo.jpg" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white/70 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors">{loading ? 'Saving...' : editing ? 'Update Driver' : 'Create Driver'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverFormModal;


