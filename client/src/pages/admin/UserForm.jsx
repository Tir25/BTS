/**
 * User Form Modal - Add/Edit individual users
 * Handles role-specific form fields
 */
import { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import { generateEmail, birthdayToPassword, validateUserData } from '@/services/userCreation';
import './UserForm.css';

const ROLES = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'driver', label: 'Driver' }
];

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

    const [preview, setPreview] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Update preview when relevant fields change
    useEffect(() => {
        if (!isEditing && formData.birthday) {
            // Pass name for faculty email generation
            const email = generateEmail(formData.role, formData.rollNo, formData.email, formData.name);
            const password = birthdayToPassword(new Date(formData.birthday));
            setPreview({ email: email || '—', password: password || '—' });
        }
    }, [formData.role, formData.rollNo, formData.email, formData.name, formData.birthday, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate
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

    const isDriver = formData.role === 'driver';
    const isFaculty = formData.role === 'faculty';

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
                        {/* Students need Roll Number */}
                        {formData.role === 'student' && (
                            <Input
                                label="Roll Number"
                                name="rollNo"
                                value={formData.rollNo}
                                onChange={handleChange}
                                placeholder="e.g., 24084231065"
                                required={!isEditing}
                                disabled={isEditing}
                            />
                        )}

                        {/* Faculty shows info - email is generated from name */}
                        {isFaculty && !isEditing && (
                            <div className="info-note">
                                <small>📧 Email will be generated from name (e.g., sagarshrivastav@gnu.ac.in)</small>
                            </div>
                        )}

                        {/* Drivers need email input */}
                        {isDriver && (
                            <Input
                                label="Email (Gmail)"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="driver@gmail.com"
                                required={!isEditing}
                                disabled={isEditing}
                            />
                        )}

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

                        {isDriver && (
                            <Input
                                label="License Number"
                                name="licenseNumber"
                                value={formData.licenseNumber}
                                onChange={handleChange}
                                placeholder="GJ01-12345"
                                required={!isEditing}
                            />
                        )}

                        {/* Credentials Preview */}
                        {!isEditing && formData.birthday && (
                            <div className="credentials-preview">
                                <h4>Generated Credentials</h4>
                                <div className="credential-row">
                                    <span className="credential-label">Email:</span>
                                    <code>{preview.email}</code>
                                </div>
                                <div className="credential-row">
                                    <span className="credential-label">Password:</span>
                                    <code>{preview.password}</code>
                                </div>
                            </div>
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

function formatDateForInput(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
}

export default UserForm;
