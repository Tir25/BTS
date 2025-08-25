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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-white/70">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Check if there are configuration errors
    if (error && error.includes('environment variables')) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="card-glass p-8 max-w-md">
              <h3 className="text-lg font-medium text-yellow-300 mb-2">
                Configuration Error
              </h3>
              <p className="text-yellow-200 mb-4">
                The application is not properly configured. Please check your
                environment variables.
              </p>
              <p className="text-sm text-yellow-100 mb-4">
                Make sure the .env file exists in the frontend directory with
                the correct Supabase configuration.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="card-glass p-8 max-w-md">
            <h3 className="text-lg font-medium text-red-300 mb-2">
              Access Denied
            </h3>
            <p className="text-red-200 mb-4">
              You don't have admin privileges. Please contact your
              administrator.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="btn-primary bg-red-600 hover:bg-red-700"
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
