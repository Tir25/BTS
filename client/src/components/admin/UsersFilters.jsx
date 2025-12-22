/**
 * UsersFilters Component
 * Search and filter controls for users list
 * Single responsibility: User filtering UI
 */
import { Input } from '@/components/ui';

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'student', label: 'Students' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'driver', label: 'Drivers' },
    { value: 'admin', label: 'Admins' }
];

export function UsersFilters({ searchQuery, onSearchChange, roleFilter, onRoleChange }) {
    return (
        <div className="filters-row">
            <Input
                placeholder="Search by name, email, or roll number..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="search-input"
            />
            <select
                value={roleFilter}
                onChange={(e) => onRoleChange(e.target.value)}
                className="role-filter input"
            >
                {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

export default UsersFilters;
