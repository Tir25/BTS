import { useState } from 'react';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import './DriverForm.css'; // Reuse driver form styles

/**
 * Bus Form Modal - Add/Edit bus
 */
export function BusForm({ bus, onSubmit, onClose }) {
    const [formData, setFormData] = useState({
        number: bus?.number || '',
        licensePlate: bus?.licensePlate || '',
        capacity: bus?.capacity || 40,
        status: bus?.status || 'active'
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
            await onSubmit({
                ...formData,
                capacity: parseInt(formData.capacity) || 40
            });
        } catch (err) {
            setError(err.message || 'Failed to save bus');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Card className="modal-content" onClick={e => e.stopPropagation()}>
                <CardHeader>
                    <h3>{bus ? 'Edit Bus' : 'Add New Bus'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </CardHeader>
                <CardBody>
                    {error && <div className="form-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="driver-form">
                        <Input
                            label="Bus Number"
                            name="number"
                            value={formData.number}
                            onChange={handleChange}
                            placeholder="e.g., BUS-001"
                            required
                        />

                        <Input
                            label="License Plate"
                            name="licensePlate"
                            value={formData.licensePlate}
                            onChange={handleChange}
                            placeholder="Enter license plate"
                            required
                        />

                        <Input
                            label="Capacity (seats)"
                            name="capacity"
                            type="number"
                            value={formData.capacity}
                            onChange={handleChange}
                            min="1"
                            max="100"
                            required
                        />

                        <div className="input-group">
                            <label className="input-label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <Button variant="secondary" type="button" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {bus ? 'Save Changes' : 'Add Bus'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

export default BusForm;
