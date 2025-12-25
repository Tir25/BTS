/**
 * RouteCard Component
 * Displays assigned route with stops progress
 * Single responsibility: Show route info and stop tracking
 */
import { Button, Card, CardBody } from '@/components/ui';
import { Map, Clock, Bus, Check } from 'lucide-react';

export function RouteCard({
    route,
    shift,
    bus,
    isOnDuty,
    currentStopIndex,
    onNextStop
}) {
    const stops = route?.stops || [];
    const nextStop = stops[currentStopIndex];

    return (
        <Card className="route-card">
            <CardBody>
                <h3><Map size={18} /> Today's Route</h3>

                {route ? (
                    <>
                        <div className="route-name">{route.name}</div>
                        {route.description && (
                            <p className="route-desc">{route.description}</p>
                        )}

                        {/* Shift & Bus Info */}
                        {(shift || bus) && (
                            <div className="schedule-info">
                                {shift && (
                                    <div className="info-item">
                                        <span className="info-label"><Clock size={14} /> Shift:</span>
                                        <span>{shift.name} ({shift.startTime} - {shift.endTime})</span>
                                    </div>
                                )}
                                {bus && (
                                    <div className="info-item">
                                        <span className="info-label"><Bus size={14} /> Bus:</span>
                                        <span>{bus.number}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Next Stop */}
                        {isOnDuty && nextStop && (
                            <div className="next-stop">
                                <div className="next-stop-label">Next Stop:</div>
                                <div className="next-stop-name">{nextStop.name}</div>
                                <Button size="sm" onClick={onNextStop}>
                                    <Check size={14} /> Arrived at Stop
                                </Button>
                            </div>
                        )}

                        {/* Stops Progress */}
                        <div className="stops-progress">
                            {stops.map((stop, idx) => (
                                <div
                                    key={stop.id || idx}
                                    className={`stop-item ${idx < currentStopIndex ? 'completed' : ''} ${idx === currentStopIndex ? 'current' : ''}`}
                                >
                                    <span className="stop-marker">
                                        {idx < currentStopIndex ? <Check size={12} /> : idx + 1}
                                    </span>
                                    <span className="stop-name">{stop.name}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-muted">No route assigned for this schedule</p>
                )}
            </CardBody>
        </Card>
    );
}

export default RouteCard;

