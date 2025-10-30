import React from 'react';

type Stop = { id: string; name?: string; sequence: number };

export default function DriverStops({
  completed,
  remaining,
  next,
  onReachStop,
  disabled,
  onRefresh,
}: {
  completed: Stop[];
  remaining: Stop[];
  next: Stop | null;
  onReachStop: (stopId: string) => void;
  disabled?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🛑</span>
          Route Stops
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 text-sm"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-white/80 font-medium mb-2">Next Stop</h4>
          {next ? (
            <button
              className={`w-full text-left px-4 py-3 rounded-lg border transition ${disabled ? 'bg-gray-700/50 text-white/40 border-gray-600' : 'bg-blue-500/10 text-blue-100 border-blue-400/30 hover:bg-blue-500/20'}`}
              onClick={() => onReachStop(next.id)}
              disabled={disabled}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{next.name || `Stop #${next.sequence}`}</span>
                <span className="text-xs opacity-80">Tap when reached</span>
              </div>
            </button>
          ) : (
            <div className="px-4 py-3 rounded-lg bg-green-500/10 text-green-100 border border-green-400/30">All stops completed. List will reset on next reach.</div>
          )}
        </div>

        <div>
          <h4 className="text-white/80 font-medium mb-2">Remaining Stops</h4>
          <div className="space-y-2">
            {remaining.length === 0 && <div className="text-white/60 text-sm">No remaining stops.</div>}
            {remaining.map((s) => (
              <button
                key={s.id}
                className={`w-full text-left px-4 py-2 rounded border bg-white/5 text-white/90 border-white/10 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                onClick={() => onReachStop(s.id)}
                disabled={disabled}
              >
                {s.sequence}. {s.name || `Stop #${s.sequence}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white/80 font-medium mb-2">Completed</h4>
          <div className="space-y-1">
            {completed.length === 0 && <div className="text-white/60 text-sm">None yet.</div>}
            {completed.map((s) => (
              <div key={s.id} className="px-4 py-2 rounded bg-white/5 text-white/60 line-through">
                {s.sequence}. {s.name || `Stop #${s.sequence}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


