import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Protected Route wrapper
 * Redirects to login if not authenticated
 * Optionally checks for specific roles
 * @param {string[]} allowedRoles - Roles that can access this route
 */
export function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user, userRole, loading } = useAuth();
    const location = useLocation();

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role access if roles are specified
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = getRedirectPath(userRole);
        return <Navigate to={redirectPath} replace />;
    }

    return children;
}

/**
 * Get redirect path based on user role
 */
export function getRedirectPath(role) {
    switch (role) {
        case 'admin':
            return '/admin';
        case 'driver':
            return '/driver';
        case 'student':
        case 'faculty':
            return '/track';
        default:
            return '/login';
    }
}

export default ProtectedRoute;
