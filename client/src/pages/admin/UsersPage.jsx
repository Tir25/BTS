/**
 * Users Management Page
 * Main page for managing all user types with search, filter, and CRUD
 * Single responsibility: Compose user management UI from modular components
 */
import { useState, useMemo } from 'react';
import { Button, useConfirm, useToast } from '@/components/ui';
import { useUsersData } from '@/hooks';
import { createSingleUser, sendUserPasswordReset } from '@/services/userCreation';
import { useAuth } from '@/contexts/AuthContext';
import { UserStatsCards, UsersFilters, UsersGrid } from '@/components/admin';
import UserForm from './UserForm';
import BulkImportModal from './BulkImportModal';
import './UsersPage.css';

export function UsersPage() {
    const { user: adminUser } = useAuth();
    const { confirm } = useConfirm();
    const { toast } = useToast();

    // State for filters
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Fetch users data with role filter
    const { users, stats, loading, error, refresh, deleteUser } = useUsersData(roleFilter);

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Filter users by search query (client-side)
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.rollNo?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Handle form submit
    const handleFormSubmit = async (formData) => {
        if (editingUser) {
            await useUsersData.updateUser?.(editingUser.id, formData);
        } else {
            await createSingleUser(formData);
        }
        setShowForm(false);
        setEditingUser(null);
        await refresh();
    };

    // Handle user deletion
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
            await deleteUser(user.id);
            toast.success(`User "${user.name}" deleted successfully`);
        } catch (err) {
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

    // Handle edit
    const handleEdit = (user) => {
        setEditingUser(user);
        setShowForm(true);
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
            <UsersFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                roleFilter={roleFilter}
                onRoleChange={setRoleFilter}
            />

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <span>{error}</span>
                    <button onClick={refresh}>Retry</button>
                </div>
            )}

            {/* Users List */}
            {loading ? (
                <div className="loading-state">Loading users...</div>
            ) : (
                <UsersGrid
                    users={filteredUsers}
                    searchQuery={searchQuery}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onResetPassword={handleResetPassword}
                />
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
                    onComplete={refresh}
                />
            )}
        </div>
    );
}

export default UsersPage;
