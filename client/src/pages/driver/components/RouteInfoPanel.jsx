/**
 * RouteInfoPanel Component
 * Bottom sheet content showing route, stops, progress, and actions
 */
import { Button } from '@/components/ui';
import { Bus, Play, Coffee, Check, AlertTriangle, PartyPopper } from 'lucide-react';
import './RouteInfoPanel.css';

export function RouteInfoPanel({
    route,
    shift,
    bus,
    isOnDuty,
    isPaused,
    currentStopIndex,
    eta,
    gpsError,
    onBreakToggle,
    onNextStop,
    breakLoading = false,
    hasSchedule = false
}) {
    const stops = route?.stops || [];
    const currentStop = stops[currentStopIndex];
    const nextStop = stops[currentStopIndex + 1];
    const progress = stops.length > 0 ? (currentStopIndex / stops.length) * 100 : 0;
    const isRouteComplete = currentStopIndex >= stops.length;

    return (
        <div className="route-info-panel">
            {/* Route Header */}
            <div className="route-header">
                <h2 className="route-name">{route?.name || 'No Route Assigned'}</h2>
                {shift && <span className="shift-badge">{shift.startTime} - {shift.endTime}</span>}
                {!shift && <span className="shift-badge">Today</span>}
            </div>

            {/* Bus Info */}
            {bus && (
                <div className="bus-info">
                    <Bus size={16} /> {bus.number} • {bus.capacity} seats
                </div>
            )}

            {/* Progress Bar */}
            {isOnDuty && stops.length > 0 && (
                <div className="progress-section">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-text">{currentStopIndex} / {stops.length} stops</span>
                </div>
            )}

            {/* Stop Info with ETA */}
            {isOnDuty && currentStop && !isRouteComplete && (
                <div className="stop-info">
                    <div className="current-stop">
                        <span className="stop-label">Current Stop</span>
                        <span className="stop-name">{currentStop.name}</span>
                    </div>
                    {nextStop && (
                        <div className="next-stop">
                            <span className="stop-label">Next</span>
                            <span className="stop-name">{nextStop.name}</span>
                            {eta && <span className="stop-eta">{eta}</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Route Complete Message */}
            {isOnDuty && isRouteComplete && (
                <div className="route-complete">
                    <PartyPopper size={18} /> Route completed!
                </div>
            )}

            {/* Action Buttons */}
            {isOnDuty && (
                <div className="action-buttons">
                    <Button
                        variant="secondary"
                        className="break-btn"
                        onClick={onBreakToggle}
                        loading={breakLoading}
                    >
                        {isPaused ? <><Play size={16} /> Resume</> : <><Coffee size={16} /> Break</>}
                    </Button>
                    <Button
                        variant="primary"
                        className="arrived-btn"
                        onClick={onNextStop}
                        disabled={isRouteComplete}
                    >
                        <Check size={16} /> Arrived
                    </Button>
                </div>
            )}

            {/* GPS Error */}
            {gpsError && (
                <div className="gps-error"><AlertTriangle size={16} /> {gpsError}</div>
            )}

            {/* No Schedule Message */}
            {!hasSchedule && !isOnDuty && (
                <div className="no-schedule-msg">
                    <p>No schedule for today.</p>
                    <p className="hint">Contact dispatch if needed.</p>
                </div>
            )}
        </div>
    );
}

export default RouteInfoPanel;

