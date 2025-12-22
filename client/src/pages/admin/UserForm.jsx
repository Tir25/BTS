/**
 * User Form Modal - Add/Edit individual users
 * Single responsibility: Compose user form UI
 */
import { useState } from 'react';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import { validateUserData } from '@/services/userCreation';
import { CredentialsPreview, RoleFields } from '@/components/admin';
import './UserForm.css';

const ROLES = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'driver', label: 'Driver' }
];

/**
 * Format date for input field
 */
function formatDateForInput(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
}

export function UserForm({ user, onSubmit, onClose }) {
    const isEditing = !!user;

    const [formData, setFormData] = useState({
        role: user?.role || 'student',
        rollNo: user?.rollNo || '',
        email: user?.email || '',
        name: user?.name || '',
        birthday: user?.birthday ? formatDateForInput(user.birthday) : '',
        phone: user?.phone || '',
        licenseNumber: user?.licenseNumber || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate for new users
        if (!isEditing) {
            const errors = validateUserData({
                ...formData,
                birthday: formData.birthday ? new Date(formData.birthday) : null
            });
            if (errors.length > 0) {
                setError(errors.join('. '));
                return;
            }
        }

        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                birthday: formData.birthday ? new Date(formData.birthday) : null
            });
        } catch (err) {
            setError(err.message || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Card className="modal-content user-form-modal" onClick={e => e.stopPropagation()}>
                <CardHeader>
                    <h3>{isEditing ? 'Edit User' : 'Add New User'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </CardHeader>
                <CardBody>
                    {error && <div className="form-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="user-form">
                        {/* Role Selection */}
                        <div className="input-group">
                            <label className="input-label">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="input"
                                disabled={isEditing}
                            >
                                {ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Role-specific fields */}
                        <RoleFields
                            role={formData.role}
                            formData={formData}
                            onChange={handleChange}
                            isEditing={isEditing}
                        />

                        {/* Common fields */}
                        <Input
                            label="Full Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter full name"
                            required
                        />

                        {!isEditing && (
                            <Input
                                label="Birthday (Password will be DDMMYYYY)"
                                name="birthday"
                                type="date"
                                value={formData.birthday}
                                onChange={handleChange}
                                required
                            />
                        )}

                        <Input
                            label="Phone Number"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="9876543210"
                        />

                        {/* Credentials Preview */}
                        {!isEditing && (
                            <CredentialsPreview
                                role={formData.role}
                                rollNo={formData.rollNo}
                                email={formData.email}
                                name={formData.name}
                                birthday={formData.birthday}
                            />
                        )}

                        <div className="form-actions">
                            <Button variant="secondary" type="button" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {isEditing ? 'Save Changes' : 'Create User'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

export default UserForm;
