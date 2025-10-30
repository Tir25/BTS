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
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Shifts</h3>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={() => setEditing({ name: '', is_active: true })}
          >
            Add Shift
          </button>
          <button
            className="px-3 py-2 bg-slate-700 text-white rounded"
            onClick={ensureDefaults}
          >
            Add Day/Afternoon Defaults
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="text-white/80">Loading...</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Start</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">End</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {shifts.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 text-white">{s.name}</td>
                <td className="px-4 py-2 text-white/80">{s.start_time || '-'}</td>
                <td className="px-4 py-2 text-white/80">{s.end_time || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 text-xs rounded ${s.is_active ? 'bg-green-600/30 text-green-300' : 'bg-slate-600/30 text-slate-300'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button className="px-2 py-1 text-sm bg-slate-700 text-white rounded" onClick={() => setEditing(s)}>Edit</button>
                  <button className="px-2 py-1 text-sm bg-red-700 text-white rounded" onClick={() => handleDelete(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-white/70" colSpan={5}>No shifts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md space-y-4">
            <h4 className="text-lg font-semibold text-white">{editing.id ? 'Edit Shift' : 'Add Shift'}</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">Name</label>
                <input
                  className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...(editing as EditableShift), name: e.target.value })}
                  placeholder="Day or Afternoon"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Start (HH:MM)</label>
                  <input
                    className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                    value={editing.start_time || ''}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), start_time: e.target.value })}
                    placeholder="08:00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">End (HH:MM)</label>
                  <input
                    className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                    value={editing.end_time || ''}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), end_time: e.target.value })}
                    placeholder="14:00"
                  />
                </div>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...(editing as EditableShift), is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...(editing as EditableShift), description: e.target.value })}
                  placeholder="Optional details"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button className="px-3 py-2 bg-slate-600 text-white rounded" onClick={() => setEditing(null)}>Cancel</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={handleSave} disabled={!editing.name?.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


