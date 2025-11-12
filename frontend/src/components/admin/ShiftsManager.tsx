import { useEffect, useMemo, useState, useCallback } from 'react';
import adminApiService from '../../api/admin';
import { logger } from '../../utils/logger';

type Shift = {
  id: string;
  name: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  is_active?: boolean;
};

type EditableShift = Omit<Shift, 'id'> & { id?: string };

export default function ShiftsManager() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableShift | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultShiftOptions = useMemo(() => [
    { name: 'Day', is_active: true, start_time: '08:00', end_time: '14:00' },
    { name: 'Afternoon', is_active: true, start_time: '14:00', end_time: '20:00' }
  ], []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiService.getShifts();
      if (res.success && Array.isArray(res.data)) {
        setShifts(res.data as Shift[]);
      } else {
        setError(res.error || res.message || 'Failed to load shifts');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shifts';
      setError(errorMessage);
      logger.error('Error loading shifts', 'shifts-manager', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!editing || submitting) return;
    
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate required fields
      if (!editing.name || !editing.name.trim()) {
        setError('Shift name is required');
        setSubmitting(false);
        return;
      }

      // Prepare payload - only send what's provided
      const payload: any = {
        name: editing.name.trim(),
        is_active: editing.is_active ?? true,
      };

      // Only include times if provided
      if (editing.start_time && editing.start_time.trim()) {
        payload.start_time = editing.start_time.trim();
      }
      if (editing.end_time && editing.end_time.trim()) {
        payload.end_time = editing.end_time.trim();
      }
      if (editing.description !== undefined) {
        payload.description = editing.description?.trim() || null;
      }

      const res = editing.id
        ? await adminApiService.updateShift(editing.id, payload)
        : await adminApiService.createShift(payload);

      if (res.success) {
        setSuccessMessage(editing.id ? 'Shift updated successfully!' : 'Shift created successfully!');
        setEditing(null);
        await load();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // Use backend message if available, otherwise use error
        setError(res.message || res.error || 'Failed to save shift');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving shift';
      setError(errorMessage);
      logger.error('Error saving shift', 'shifts-manager', { error: String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const shift = shifts.find(s => s.id === id);
    const shiftName = shift?.name || 'this shift';
    
    if (!confirm(`Are you sure you want to delete "${shiftName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await adminApiService.deleteShift(id);
      if (res.success) {
        setSuccessMessage(`Shift "${shiftName}" deleted successfully!`);
        await load();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // Use backend message if available
        setError(res.message || res.error || 'Failed to delete shift');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting shift';
      setError(errorMessage);
      logger.error('Error deleting shift', 'shifts-manager', { error: String(err), shiftId: id });
    } finally {
      setLoading(false);
    }
  }

  async function ensureDefaults() {
    // Check if default shifts already exist
    const existingNames = new Set(shifts.map(s => s.name.toLowerCase()));
    const defaultsToCreate = defaultShiftOptions.filter(
      opt => !existingNames.has(opt.name.toLowerCase())
    );

    if (defaultsToCreate.length === 0) {
      setError('Default shifts (Day and Afternoon) already exist');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let createdCount = 0;
      const errors: string[] = [];

      for (const shift of defaultsToCreate) {
        try {
          const res = await adminApiService.createShift(shift);
          if (res.success) {
            createdCount++;
          } else {
            errors.push(`${shift.name}: ${res.message || res.error || 'Failed'}`);
          }
        } catch (err) {
          errors.push(`${shift.name}: ${err instanceof Error ? err.message : 'Failed'}`);
        }
      }

      await load();

      if (createdCount > 0 && errors.length === 0) {
        setSuccessMessage(`Successfully created ${createdCount} default shift(s)!`);
      } else if (createdCount > 0) {
        setSuccessMessage(`Created ${createdCount} shift(s), but ${errors.length} failed`);
        setError(errors.join(', '));
      } else {
        setError(`Failed to create default shifts: ${errors.join(', ')}`);
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create default shifts';
      setError(errorMessage);
      logger.error('Error creating default shifts', 'shifts-manager', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Shifts</h3>
          <p className="text-sm text-slate-600">Manage shift schedules for bus assignments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setEditing({ name: '', is_active: true })}
            disabled={loading || submitting}
          >
            Add Shift
          </button>
          <button
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={ensureDefaults}
            disabled={loading || submitting}
          >
            Add Defaults
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl p-3">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && shifts.length === 0 && (
        <div className="text-slate-600 text-center py-8">Loading shifts...</div>
      )}

      {/* Shifts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Start Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">End Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.start_time || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.end_time || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm max-w-xs truncate" title={s.description || ''}>
                    {s.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      s.is_active !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition-colors min-h-[36px] touch-friendly disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={() => setEditing(s)}
                      disabled={loading || submitting}
                    >
                      Edit
                    </button>
                    <button 
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-900 rounded-lg transition-colors min-h-[36px] touch-friendly disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={() => handleDelete(s.id)}
                      disabled={loading || submitting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-600 text-center" colSpan={6}>
                    No shifts yet. Click "Add Shift" to create one, or "Add Defaults" to create default shifts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold text-slate-900">
              {editing.id ? 'Edit Shift' : 'Add Shift'}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...(editing as EditableShift), name: e.target.value })}
                  placeholder="e.g., Day, Afternoon, Night"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={editing.start_time || ''}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), start_time: e.target.value })}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: HH:MM</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={editing.end_time || ''}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), end_time: e.target.value })}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: HH:MM</p>
                </div>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-slate-900 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    checked={editing.is_active !== false}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), is_active: e.target.checked })}
                  />
                  Active
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-7">Inactive shifts won't appear in assignment dropdowns</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...(editing as EditableShift), description: e.target.value })}
                  placeholder="Optional details about this shift"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => {
                  setEditing(null);
                  setError(null);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleSave} 
                disabled={!editing.name?.trim() || submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
