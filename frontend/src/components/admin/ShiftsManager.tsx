import { useEffect, useMemo, useState } from 'react';
import adminApiService from '../../services/adminApiService';

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
  const [editing, setEditing] = useState<EditableShift | null>(null);

  const defaultShiftOptions = useMemo(() => [
    { name: 'Day', is_active: true },
    { name: 'Afternoon', is_active: true }
  ], []);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await adminApiService.getShifts();
    if (res.success && Array.isArray(res.data)) {
      setShifts(res.data as Shift[]);
    } else {
      setError(res.error || 'Failed to load shifts');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!editing) return;
    setLoading(true);
    const defaultStart = '08:00';
    const defaultEnd = '14:00';
    const payload = {
      name: editing.name?.trim(),
      start_time: (editing.start_time && editing.start_time.trim()) || defaultStart,
      end_time: (editing.end_time && editing.end_time.trim()) || defaultEnd,
      description: editing.description,
      is_active: editing.is_active ?? true,
    };
    const res = editing.id
      ? await adminApiService.updateShift(editing.id, payload)
      : await adminApiService.createShift(payload);
    if (!res.success) setError(res.error || 'Failed to save shift');
    setEditing(null);
    await load();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shift?')) return;
    setLoading(true);
    const res = await adminApiService.deleteShift(id);
    if (!res.success) setError(res.error || 'Failed to delete shift');
    await load();
    setLoading(false);
  }

  async function ensureDefaults() {
    if (shifts.length > 0) return;
    setLoading(true);
    await adminApiService.createShift({ name: 'Day', is_active: true, start_time: '08:00', end_time: '14:00' });
    await adminApiService.createShift({ name: 'Afternoon', is_active: true, start_time: '14:00', end_time: '20:00' });
    await load();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-slate-900">Shifts</h3>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto"
            onClick={() => setEditing({ name: '', is_active: true })}
          >
            Add Shift
          </button>
          <button
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly w-full sm:w-auto"
            onClick={ensureDefaults}
          >
            Add Defaults
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">{error}</div>
      )}

      {loading && (
        <div className="text-slate-600">Loading...</div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Start</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">End</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.start_time || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.end_time || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition-colors min-h-[36px] touch-friendly" onClick={() => setEditing(s)}>Edit</button>
                    <button className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-900 rounded-lg transition-colors min-h-[36px] touch-friendly" onClick={() => handleDelete(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-600 text-center" colSpan={5}>No shifts yet. Click "Add Shift" to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold text-slate-900">{editing.id ? 'Edit Shift' : 'Add Shift'}</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...(editing as EditableShift), name: e.target.value })}
                  placeholder="Day or Afternoon"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start (HH:MM)</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={editing.start_time || ''}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), start_time: e.target.value })}
                    placeholder="08:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End (HH:MM)</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={editing.end_time || ''}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), end_time: e.target.value })}
                    placeholder="14:00"
                  />
                </div>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-slate-900 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...(editing as EditableShift), description: e.target.value })}
                  placeholder="Optional details"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-colors text-sm font-medium min-h-[44px] touch-friendly" onClick={() => setEditing(null)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm touch-friendly" onClick={handleSave} disabled={!editing.name?.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


