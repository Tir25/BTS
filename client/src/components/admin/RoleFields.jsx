/**
 * RoleFields Component
 * Role-specific form fields for user creation
 * Single responsibility: Render fields based on user role
 */
import { Input } from '@/components/ui';

export function RoleFields({ role, formData, onChange, isEditing }) {
    const isDriver = role === 'driver';
    const isFaculty = role === 'faculty';
    const isStudent = role === 'student';

    return (
        <>
            {/* Students need Roll Number */}
            {isStudent && (
                <Input
                    label="Roll Number"
                    name="rollNo"
                    value={formData.rollNo}
                    onChange={onChange}
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
                    onChange={onChange}
                    placeholder="driver@gmail.com"
                    required={!isEditing}
                    disabled={isEditing}
                />
            )}

            {/* Driver license number */}
            {isDriver && (
                <Input
                    label="License Number"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={onChange}
                    placeholder="GJ01-12345"
                    required={!isEditing}
                />
            )}
        </>
    );
}

export default RoleFields;
