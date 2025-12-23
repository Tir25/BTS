/**
 * TemplateForm Component
 * Create or edit schedule templates with weekday picker
 */
import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Input } from '@/components/ui';
import { DAYS_OF_WEEK } from '@/services/scheduleTemplates';
import './TemplateForm.css';

export function TemplateForm({
    template,
    drivers,
    buses,
    routes,
    shifts,
    onSubmit,
    onCancel
}) {
    const isEditing = !!template;

    const [formData, setFormData] = useState({
        name: '',
        driverId: '',
        busId: '',
        routeId: '',
        shiftId: '',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initialize form for edit mode
    useEffect(() => {
        if (template) {
            setFormData({
                name: template.name || '',
                driverId: template.driverId || '',
                busId: template.busId || '',
                routeId: template.routeId || '',
                shiftId: template.shiftId || '',
                daysOfWeek: template.daysOfWeek || []
            });
        }
    }, [template]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const toggleDay = (dayKey) => {
        setFormData(prev => {
            const days = prev.daysOfWeek.includes(dayKey)
                ? prev.daysOfWeek.filter(d => d !== dayKey)
                : [...prev.daysOfWeek, dayKey];
            return { ...prev, daysOfWeek: days };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Template name is required');
            return;
        }
        if (!formData.driverId || !formData.busId || !formData.shiftId) {
            setError('Driver, Bus, and Shift are required');
            return;
        }
        if (formData.daysOfWeek.length === 0) {
            setError('Select at least one day');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (err) {
            setError(err.message || 'Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <Card className="template-form-modal">
                <CardBody>
                    <h3>{isEditing ? 'Edit Template' : 'Create Schedule Template'}</h3>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Template Name *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Morning Ahmedabad Route (Mon-Fri)"
                                required
                            />
                        </div>

                        <div className="form-row">
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
                                            #{b.busNo || b.number}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
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
                        </div>

                        <div className="form-group">
                            <label>Days of Week *</label>
                            <div className="weekday-picker">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day.key}
                                        type="button"
                                        className={`day-btn ${formData.daysOfWeek.includes(day.key) ? 'active' : ''}`}
                                        onClick={() => toggleDay(day.key)}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-actions">
                            <Button type="button" variant="ghost" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {isEditing ? 'Save Changes' : 'Create Template'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

export default TemplateForm;
