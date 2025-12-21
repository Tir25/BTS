/**
 * Users Management Page
 * Main page for managing all user types with search, filter, and CRUD
 */
import { useState, useEffect, useCallback } from 'react';
import { Button, Input, useConfirm, useToast } from '@/components/ui';
import { usersService } from '@/services/users';
import { createSingleUser, sendUserPasswordReset } from '@/services/userCreation';
import { useAuth } from '@/contexts/AuthContext';
import { UserStatsCards } from '@/components/admin/UserStatsCards';
import { UserCard } from '@/components/admin/UserCard';
import UserForm from './UserForm';
import BulkImportModal from './BulkImportModal';
import './UsersPage.css';


const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'student', label: 'Students' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'driver', label: 'Drivers' }
];

export function UsersPage() {
    const { user: adminUser } = useAuth();
    const { confirm } = useConfirm();
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ total: 0, student: 0, faculty: 0, driver: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Load data on mount and filter change
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [usersData, statsData] = await Promise.all([
                usersService.getAll(roleFilter),
                usersService.getStats()
            ]);
            setUsers(usersData);
            setStats(statsData);
            setError(null);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [roleFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter users by search query
    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.rollNo?.toLowerCase().includes(query)
        );
    });

    // Handle form submit
    const handleFormSubmit = async (formData) => {
        if (editingUser) {
            // Update existing user
            await usersService.update(editingUser.id, formData);
        } else {
            // Create new user - save admin credentials to re-auth
            const adminEmail = adminUser?.email;
            if (!adminEmail) throw new Error('Admin session not found');

            // Note: In production, use Cloud Functions to avoid logout
            await createSingleUser(formData);

            // The user creation logs out admin, need to re-authenticate
            // This is a workaround - production should use Admin SDK
        }
        setShowForm(false);
        setEditingUser(null);
        await loadData();
    };

    // Handle user deletion with confirm dialog
    const handleDelete = async (user) => {
        const confirmed = await confirm({
            title: 'Delete User',
            message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            await usersService.delete(user.id);
            toast.success(`User "${user.name}" deleted successfully`);
            await loadData();
        } catch (err) {
            setError('Failed to delete user');
            toast.error('Failed to delete user');
        }
    };

    // Handle password reset email
    const handleResetPassword = async (user) => {
        const confirmed = await confirm({
            title: 'Reset Password',
            message: `Send password reset email to "${user.email}"?\n\nAlternatively, their default password is their birthday in DDMMYYYY format.`,
            confirmText: 'Send Reset Email',
            cancelText: 'Cancel',
            variant: 'primary'
        });

        if (!confirmed) return;

        try {
            await sendUserPasswordReset(user.email);
            toast.success(`Password reset email sent to ${user.email}`);
        } catch (err) {
            console.error('Password reset error:', err);
            toast.warning(`Could not send reset email. Default password is birthday (DDMMYYYY).`);
        }
    };

    return (
        <div className="users-page">
            {/* Stats Row */}
            <UserStatsCards stats={stats} loading={loading} />

            {/* Header with Actions */}
            <div className="page-header">
                <h2>Users Management</h2>
                <div className="header-actions">
                    <Button variant="secondary" onClick={() => setShowBulkImport(true)}>
                        📥 Bulk Import
                    </Button>
                    <Button onClick={() => { setEditingUser(null); setShowForm(true); }}>
                        + Add User
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-row">
                <Input
                    placeholder="Search by name, email, or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="role-filter input"
                >
                    {ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Users List */}
            {loading ? (
                <div className="loading-state">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                    {searchQuery ? 'No users match your search' : 'No users found. Add your first user!'}
                </div>
            ) : (
                <div className="users-grid">
                    {filteredUsers.map(user => (
                        <UserCard
                            key={user.id}
                            user={user}
                            onEdit={(u) => { setEditingUser(u); setShowForm(true); }}
                            onDelete={handleDelete}
                            onResetPassword={handleResetPassword}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showForm && (
                <UserForm
                    user={editingUser}
                    onSubmit={handleFormSubmit}
                    onClose={() => { setShowForm(false); setEditingUser(null); }}
                />
            )}

            {showBulkImport && (
                <BulkImportModal
                    onClose={() => setShowBulkImport(false)}
                    onComplete={loadData}
                />
            )}
        </div>
    );
}

export default UsersPage;
