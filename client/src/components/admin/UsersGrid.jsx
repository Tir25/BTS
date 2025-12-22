/**
 * UsersGrid Component
 * Grid display of user cards with empty state
 * Single responsibility: Render users list/grid
 */
import { UserCard } from '@/components/admin';

export function UsersGrid({
    users,
    searchQuery,
    onEdit,
    onDelete,
    onResetPassword
}) {
    if (users.length === 0) {
        return (
            <div className="empty-state">
                {searchQuery ? 'No users match your search' : 'No users found. Add your first user!'}
            </div>
        );
    }

    return (
        <div className="users-grid">
            {users.map(user => (
                <UserCard
                    key={user.id}
                    user={user}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onResetPassword={onResetPassword}
                />
            ))}
        </div>
    );
}

export default UsersGrid;
