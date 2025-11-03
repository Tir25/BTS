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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-2xl">🛑</span>
          Route Stops
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-slate-900 font-medium mb-2">Next Stop</h4>
          {next ? (
            <button
              className={`w-full text-left px-4 py-3 rounded-xl border transition min-h-[60px] touch-friendly ${disabled ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 active:bg-blue-200'}`}
              onClick={() => onReachStop(next.id)}
              disabled={disabled}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{next.name || `Stop #${next.sequence}`}</span>
                <span className="text-xs opacity-80">Tap when reached</span>
              </div>
            </button>
          ) : (
            <div className="px-4 py-3 rounded-xl bg-green-50 text-green-900 border border-green-300 font-medium">All stops completed. List will reset on next reach.</div>
          )}
        </div>

        <div>
          <h4 className="text-slate-900 font-medium mb-2">Remaining Stops</h4>
          <div className="space-y-2">
            {remaining.length === 0 && <div className="text-slate-600 text-sm">No remaining stops.</div>}
            {remaining.map((s) => (
              <button
                key={s.id}
                className={`w-full text-left px-4 py-3 rounded-xl border min-h-[50px] touch-friendly bg-white text-slate-900 border-slate-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 active:bg-slate-100'}`}
                onClick={() => onReachStop(s.id)}
                disabled={disabled}
              >
                {s.sequence}. {s.name || `Stop #${s.sequence}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-slate-900 font-medium mb-2">Completed</h4>
          <div className="space-y-1">
            {completed.length === 0 && <div className="text-slate-600 text-sm">None yet.</div>}
            {completed.map((s) => (
              <div key={s.id} className="px-4 py-2 rounded-xl bg-slate-50 text-slate-500 line-through border border-slate-200">
                {s.sequence}. {s.name || `Stop #${s.sequence}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


