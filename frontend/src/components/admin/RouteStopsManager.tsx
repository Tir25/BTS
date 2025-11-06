import { useEffect, useMemo, useState } from 'react';
import adminApiService from '../../api/admin';

type RouteStop = { id: string; route_id: string; name?: string; sequence: number; is_active?: boolean };

export default function RouteStopsManager({ routeId, onClose }: { routeId: string; onClose: () => void }) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<RouteStop> | null>(null);

  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.sequence - b.sequence), [stops]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiService.getRouteStops(routeId);
      if (res.success && Array.isArray(res.data)) {
        setStops(res.data as RouteStop[]);
      } else {
        // PRODUCTION FIX: Better error handling for non-array responses
        const errorMessage = res.error || 'Failed to load stops';
        setError(errorMessage);
        setStops([]); // Clear stops on error
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stops';
      setError(errorMessage);
      setStops([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [routeId]);

  async function handleSave() {
    if (!editing || !editing.name) return;
    setLoading(true);
    const isNew = !editing.id;
    const res = isNew
      ? await adminApiService.createRouteStop(routeId, { name: editing.name })
      : await adminApiService.updateRouteStop(String(editing.id), { name: editing.name });
    if (!res.success) setError(res.error || 'Failed to save stop');
    setEditing(null);
    await load();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this stop?')) return;
    setLoading(true);
    const res = await adminApiService.deleteRouteStop(id);
    if (!res.success) setError(res.error || 'Failed to delete stop');
    await load();
    setLoading(false);
  }

  async function handleReorder(up: boolean, id: string) {
    const ordered = [...sortedStops];
    const idx = ordered.findIndex(s => s.id === id);
    if (idx < 0) return;
    const swapIdx = up ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    setStops(ordered.map((s, i) => ({ ...s, sequence: i + 1 })));
    
    // PRODUCTION FIX: Persist reorder with loading state and error handling
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiService.reorderRouteStops(routeId, ordered.map(s => s.id));
      if (!res.success) {
        setError(res.error || 'Failed to reorder stops');
        // Revert on error
        await load();
      } else {
        // Refresh to ensure consistency
        await load();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder stops';
      setError(errorMessage);
      // Revert on error
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Manage Stops</h3>
          <button className="text-white/70" onClick={onClose}>✕</button>
        </div>

        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
        {loading && <div className="text-white/80 mb-2">Loading...</div>}

        <div className="flex items-center gap-2 mb-4">
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setEditing({ name: '' })}>Add Stop</button>
        </div>

        <div className="space-y-2">
          {sortedStops.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="text-white/60">{i + 1}.</div>
                <div className="text-white">{s.name || '(unnamed stop)'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 bg-slate-700 text-white rounded" onClick={() => handleReorder(true, s.id)} disabled={i === 0}>↑</button>
                <button className="px-2 py-1 bg-slate-700 text-white rounded" onClick={() => handleReorder(false, s.id)} disabled={i === sortedStops.length - 1}>↓</button>
                <button className="px-2 py-1 bg-slate-700 text-white rounded" onClick={() => setEditing(s)}>Edit</button>
                <button className="px-2 py-1 bg-red-700 text-white rounded" onClick={() => handleDelete(s.id)}>Delete</button>
              </div>
            </div>
          ))}
          {sortedStops.length === 0 && !loading && (
            <div className="text-white/70">No stops defined for this route.</div>
          )}
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md space-y-4">
              <h4 className="text-lg font-semibold text-white">{editing.id ? 'Edit Stop' : 'Add Stop'}</h4>
              <div>
                <label className="block text-sm text-white/70 mb-1">Name</label>
                <input
                  className="w-full px-3 py-2 rounded bg-slate-700 text-white"
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g., Radhanpur Circle"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button className="px-3 py-2 bg-slate-600 text-white rounded" onClick={() => setEditing(null)}>Cancel</button>
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={handleSave} disabled={!editing.name?.trim()}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


