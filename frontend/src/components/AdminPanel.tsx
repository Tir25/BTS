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

          // Wait for auth service to be initialized
    while (!authService.isInitialized()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

      const authenticated = authService.isAuthenticated();
      const admin = authService.isAdmin();

      console.log('🔍 Auth Status Check:', {
        initialized: authService.isInitialized(),
        authenticated,
        admin,
      });



      setIsAuthenticated(authenticated);
      setIsAdmin(admin);

      // Only show access denied error if user is authenticated but not admin
      if (authenticated && !admin) {
        setError('Access denied. Admin privileges required.');
      } else if (!authenticated) {
        // Clear any previous errors when not authenticated
        setError(null);
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
      const result = await authService.signOut();
      if (result.success) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setError(null);
      } else {
        console.error('❌ Sign out failed:', result.error);
        // Force clear state even if sign out fails
        setIsAuthenticated(false);
        setIsAdmin(false);
        setError('Sign out failed, but you have been logged out locally.');
      }
    } catch (err) {
      console.error('❌ Sign out error:', err);
      // Force clear state even if sign out fails
      setIsAuthenticated(false);
      setIsAdmin(false);
      setError('Sign out failed, but you have been logged out locally.');
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
    // Check if there are configuration errors
    if (error && error.includes('environment variables')) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">
                Configuration Error
              </h3>
              <p className="text-yellow-700 mb-4">
                The application is not properly configured. Please check your
                environment variables.
              </p>
              <p className="text-sm text-yellow-600 mb-4">
                Make sure the .env file exists in the frontend directory with
                the correct Supabase configuration.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

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
