import { useState } from 'react';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import './UserForm.css';

/**
 * Shift Form Modal
 */
export function ShiftForm({ shift, onSubmit, onClose }) {
    const [formData, setFormData] = useState({
        name: shift?.name || 'morning',
        startTime: shift?.startTime || '06:00',
        endTime: shift?.endTime || '12:00',
        description: shift?.description || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await onSubmit(formData);
        } catch (err) {
            setError(err.message || 'Failed to save shift');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Card className="modal-content" onClick={e => e.stopPropagation()}>
                <CardHeader>
                    <h3>{shift ? 'Edit Shift' : 'Add New Shift'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </CardHeader>
                <CardBody>
                    {error && <div className="form-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="driver-form">
                        <div className="input-group">
                            <label className="input-label">Shift Name</label>
                            <select
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="morning">Morning</option>
                                <option value="noon">Noon</option>
                                <option value="evening">Evening</option>
                                <option value="night">Night</option>
                            </select>
                        </div>

                        <Input
                            label="Start Time"
                            name="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="End Time"
                            name="endTime"
                            type="time"
                            value={formData.endTime}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="Description (optional)"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="e.g., Early morning routes"
                        />

                        <div className="form-actions">
                            <Button variant="secondary" type="button" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {shift ? 'Save Changes' : 'Add Shift'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

export default ShiftForm;
