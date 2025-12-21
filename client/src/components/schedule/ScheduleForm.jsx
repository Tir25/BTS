/**
 * Schedule Form Modal - Create or edit schedule with conflict detection
 * Supports both create and edit modes
 */
import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Input, useConfirm } from '@/components/ui';
import './ScheduleForm.css';

export function ScheduleForm({
    schedule, // null for create, object for edit
    date,
    drivers,
    buses,
    routes,
    shifts,
    checkConflicts,
    onSubmit,
    onCancel
}) {
    const isEditing = !!schedule;
    const { confirm } = useConfirm();

    const [formData, setFormData] = useState({
        date: date.toISOString().split('T')[0],
        driverId: '',
        busId: '',
        routeId: '',
        shiftId: ''
    });
    const [conflicts, setConflicts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initialize form for edit mode
    useEffect(() => {
        if (schedule) {
            setFormData({
                date: schedule.date,
                driverId: schedule.driverId || '',
                busId: schedule.busId || '',
                routeId: schedule.routeId || '',
                shiftId: schedule.shiftId || ''
            });
        }
    }, [schedule]);

    const handleChange = (field, value) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);

        // Check conflicts when key fields are selected
        if (newData.driverId && newData.busId && newData.shiftId) {
            setConflicts(checkConflicts(newData));
        } else {
            setConflicts([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (conflicts.length > 0) {
            const proceed = await confirm({
                title: 'Scheduling Conflicts',
                message: 'There are conflicts with this schedule. Continue anyway?',
                confirmText: 'Continue',
                cancelText: 'Go Back',
                variant: 'warning'
            });
            if (!proceed) return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <Card className="schedule-form-modal">
                <CardBody>
                    <h3>{isEditing ? 'Edit Schedule' : 'Create Schedule'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Date</label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Shift *</label>
                            <select
                                className="input"
                                value={formData.shiftId}
                                onChange={(e) => handleChange('shiftId', e.target.value)}
                                required
                            >
                                <option value="">Select Shift</option>
                                {shifts.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.startTime}-{s.endTime})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Driver *</label>
                            <select
                                className="input"
                                value={formData.driverId}
                                onChange={(e) => handleChange('driverId', e.target.value)}
                                required
                            >
                                <option value="">Select Driver</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Bus *</label>
                            <select
                                className="input"
                                value={formData.busId}
                                onChange={(e) => handleChange('busId', e.target.value)}
                                required
                            >
                                <option value="">Select Bus</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.number} ({b.capacity} seats)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Route</label>
                            <select
                                className="input"
                                value={formData.routeId}
                                onChange={(e) => handleChange('routeId', e.target.value)}
                            >
                                <option value="">No Route</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        {conflicts.length > 0 && (
                            <div className="conflict-warnings">
                                {conflicts.map((c, i) => (
                                    <div key={i} className="conflict-item">⚠️ {c.message}</div>
                                ))}
                            </div>
                        )}

                        <div className="form-actions">
                            <Button type="button" variant="ghost" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {isEditing ? 'Save Changes' : 'Create Schedule'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

export default ScheduleForm;
