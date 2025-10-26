/**
 * Authentication Guard Component
 * Protects admin routes and provides clear authentication status
 */

import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import AdminLogin from './AdminLogin';

interface AuthenticationGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'driver' | 'student';
  fallbackComponent?: React.ReactNode;
}

export default function AuthenticationGuard({ 
  children, 
  requiredRole = 'admin',
  fallbackComponent 
}: AuthenticationGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user is authenticated
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        logger.info('🔒 No authenticated user found', 'auth-guard');
        setIsAuthenticated(false);
        setUserRole(null);
        return;
      }

      // Get user profile to check role
      const profile = authService.getCurrentProfile();
      if (!profile) {
        logger.warn('⚠️ User authenticated but no profile found', 'auth-guard');
        setError('User profile not found. Please log in again.');
        setIsAuthenticated(false);
        return;
      }

      const role = profile.role;
      setUserRole(role);

      // Check if user has required role
      if (role !== requiredRole) {
        logger.warn('🚫 User does not have required role', 'auth-guard', {
          userRole: role,
          requiredRole
        });
        setError(`Access denied. ${requiredRole} privileges required. Your current role is: ${role}`);
        setIsAuthenticated(false);
        return;
      }

      // User is authenticated and has correct role
      logger.info('✅ User authenticated with correct role', 'auth-guard', { role });
      setIsAuthenticated(true);

    } catch (err) {
      logger.error('❌ Authentication check failed', 'auth-guard', { error: String(err) });
      setError('Authentication check failed. Please try again.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    checkAuthentication();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-white/70">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="card-glass p-8 max-w-md">
            <h3 className="text-lg font-medium text-red-300 mb-2">
              Authentication Required
            </h3>
            <p className="text-red-200 mb-4">{error}</p>
            <div className="space-y-3">
              <button
                onClick={checkAuthentication}
                className="btn-primary bg-blue-600 hover:bg-blue-700 w-full"
              >
                Retry Authentication
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-secondary w-full"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Access Required
            </h1>
            <p className="text-white/70">
              Please log in with admin credentials to access this section
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <AdminLogin onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated with correct role - show protected content
  return <>{children}</>;
}
