import React from 'react';

interface StopItem {
  id: string;
  name?: string;
  sequence: number;
}

interface RouteStatus {
  tracking_active: boolean;
  stops: { completed: StopItem[]; next: StopItem | null; remaining: StopItem[] };
}

interface RouteStatusPanelProps {
  selectedRoute: string;
  selectedShift: '' | 'Day' | 'Afternoon';
  routeStatus: RouteStatus | null;
  routeStops: StopItem[];
  onRefresh: () => Promise<void> | void;
  onCenterOnBus?: () => void;
  hasBusForRoute?: boolean;
}

const RouteStatusPanel: React.FC<RouteStatusPanelProps> = ({
  selectedRoute,
  selectedShift,
  routeStatus,
  routeStops,
  onRefresh,
  onCenterOnBus,
  hasBusForRoute = false,
}) => {
  if (!selectedRoute || selectedRoute === 'all') return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-10">
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-slate-900 font-semibold">🛑 Route Stops</h3>
          <div className="flex items-center space-x-2">
            {/* PRODUCTION FIX: Center on Bus button - always show when route is selected */}
            {onCenterOnBus && (
              <button
                className={`text-xs px-3 py-1 rounded-lg border transition-colors flex items-center space-x-1 font-medium shadow-sm ${
                  hasBusForRoute
                    ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                    : 'bg-gray-400 text-white border-gray-500 cursor-not-allowed opacity-60'
                }`}
                onClick={() => {
                  if (hasBusForRoute) {
                    onCenterOnBus();
                  }
                }}
                disabled={!hasBusForRoute}
                title={hasBusForRoute ? "Center map on bus for this route" : "No active bus available for this route"}
                aria-label="Center on bus"
              >
                <span>🎯</span>
                <span>COB</span>
              </button>
            )}
            <button
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-200 transition-colors"
              onClick={() => void onRefresh()}
            >
              Refresh
            </button>
          </div>
        </div>

        {!routeStatus?.tracking_active ? (
          <div className="space-y-3">
            <div className="text-slate-700 text-sm">Tracking is not active for this route{selectedShift ? ` (${selectedShift})` : ''}.</div>
            <div>
              <div className="text-slate-700 text-sm mb-1 font-medium">All Stops</div>
              <div className="flex flex-wrap gap-2">
                {routeStops.map((s: any) => (
                  <div key={s.id} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {s.sequence}. {s.name || `Stop #${s.sequence}`}
                  </div>
                ))}
                {routeStops.length === 0 && (
                  <div className="text-slate-500 text-sm">No stops available</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-slate-700 text-sm mb-1 font-medium">Next Stop</div>
              <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-medium">
                {routeStatus?.stops.next?.name || `Stop #${routeStatus?.stops.next?.sequence || '-'}`}
              </div>
            </div>
            <div>
              <div className="text-slate-700 text-sm mb-1 font-medium">Remaining</div>
              <div className="flex flex-wrap gap-2">
                {(routeStatus?.stops.remaining || []).map((s: any) => (
                  <div key={s.id} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {s.sequence}. {s.name || `Stop #${s.sequence}`}
                  </div>
                ))}
                {routeStatus?.stops.remaining?.length === 0 && <div className="text-slate-500 text-sm">None</div>}
              </div>
            </div>
            <div>
              <div className="text-slate-700 text-sm mb-1 font-medium">Completed</div>
              <div className="flex flex-wrap gap-2">
                {(routeStatus?.stops.completed || []).map((s: any) => (
                  <div key={s.id} className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-400 line-through border border-slate-200">
                    {s.sequence}. {s.name || `Stop #${s.sequence}`}
                  </div>
                ))}
                {routeStatus?.stops.completed?.length === 0 && <div className="text-slate-500 text-sm">None</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteStatusPanel;


