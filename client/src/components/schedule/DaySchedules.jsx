/**
 * Day Schedules Panel - Shows schedules for selected date
 * Single responsibility: Display and actions for a day's schedules
 */
import { Button, Card, CardBody } from '@/components/ui';

export function DaySchedules({ date, schedules, drivers, buses, routes, shifts, onEdit, onDelete, onAdd }) {
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const getDriver = (id) => drivers.find(d => d.id === id)?.name || 'Unknown';
    const getBus = (id) => buses.find(b => b.id === id)?.number || 'Unknown';
    const getRoute = (id) => routes.find(r => r.id === id)?.name || 'None';
    const getShift = (id) => {
        const shift = shifts.find(s => s.id === id);
        return shift ? `${shift.name} (${shift.startTime}-${shift.endTime})` : 'Unknown';
    };

    return (
        <Card className="day-schedules">
            <CardBody>
                <div className="day-header">
                    <h3>{dateStr}</h3>
                    <Button size="sm" onClick={onAdd}>+ Add</Button>
                </div>

                {schedules.length === 0 ? (
                    <p className="no-schedules">No schedules for this day</p>
                ) : (
                    <div className="schedule-list">
                        {schedules.map(schedule => (
                            <div key={schedule.id} className="schedule-item">
                                <div className="schedule-info">
                                    <div className="schedule-shift">{getShift(schedule.shiftId)}</div>
                                    <div className="schedule-details">
                                        <span>👤 {getDriver(schedule.driverId)}</span>
                                        <span>🚌 {getBus(schedule.busId)}</span>
                                        <span>🗺️ {getRoute(schedule.routeId)}</span>
                                    </div>
                                </div>
                                <div className="schedule-actions">
                                    <button
                                        className="edit-btn"
                                        onClick={() => onEdit(schedule)}
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => onDelete(schedule.id)}
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}

export default DaySchedules;
