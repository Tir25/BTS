/**
 * User Card Component
 * Displays individual user with actions
 */
import { Button, Card, CardBody } from '@/components/ui';
import './UserCard.css';

/**
 * Get role badge styling class
 */
function getRoleClass(role) {
    const classes = {
        student: 'role-purple',
        faculty: 'role-green',
        driver: 'role-orange',
        admin: 'role-blue'
    };
    return classes[role] || 'role-blue';
}

/**
 * Get role display icon
 */
function getRoleIcon(role) {
    const icons = {
        student: '🎓',
        faculty: '👨‍🏫',
        driver: '🚌',
        admin: '⚙️'
    };
    return icons[role] || '👤';
}

export function UserCard({ user, onEdit, onDelete, onResetPassword }) {
    const { name, email, role, rollNo, phone, createdAt } = user;

    // Format creation date
    const createdDate = createdAt?.toDate
        ? createdAt.toDate().toLocaleDateString()
        : createdAt
            ? new Date(createdAt).toLocaleDateString()
            : 'N/A';

    return (
        <Card className="user-card" hoverable>
            <CardBody>
                <div className="user-info">
                    <div className="user-avatar">
                        {name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="user-details">
                        <h4>{name}</h4>
                        <p className="text-muted">{email}</p>
                        {rollNo && <p className="text-muted roll-no">ID: {rollNo}</p>}
                    </div>
                </div>

                <div className="user-meta">
                    <span className={`role-badge ${getRoleClass(role)}`}>
                        {getRoleIcon(role)} {role}
                    </span>
                    {phone && <span className="phone-badge">📱 {phone}</span>}
                </div>

                <div className="user-footer">
                    <span className="created-date">Joined: {createdDate}</span>
                    <div className="user-actions">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(user)}>
                            Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onResetPassword(user)}>
                            Reset
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(user)}>
                            Delete
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default UserCard;
