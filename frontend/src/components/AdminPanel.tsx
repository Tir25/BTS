import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();

    // Set up auth state change listener
    const handleAuthStateChange = () => {
      checkAuthStatus();
    };

    authService.onAuthStateChange(handleAuthStateChange);

    // Cleanup listener on unmount
    return () => {
      authService.removeAuthStateChangeListener();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const authenticated = authService.isAuthenticated();
      const admin = authService.isAdmin();

      setIsAuthenticated(authenticated);
      setIsAdmin(admin);

      if (authenticated && !admin) {
        setError('Access denied. Admin privileges required.');
      }
    } catch (err) {
      console.error('❌ Auth status check error:', err);
      setError('Failed to check authentication status');
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsAdmin(true);
    setError(null);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setError(null);
    } catch (err) {
      console.error('❌ Sign out error:', err);
      // Force clear state even if sign out fails
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Access Denied
            </h3>
            <p className="text-red-700 mb-4">
              You don't have admin privileges. Please contact your
              administrator.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}
