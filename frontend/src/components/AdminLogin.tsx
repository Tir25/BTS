import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';
import { useTransition } from './transitions';

import { logger } from '../utils/logger';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const navigate = useNavigate();
  const { setTransition } = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  // Try to recover session on component mount
  useEffect(() => {
    const attemptSessionRecovery = async () => {
      try {
        logger.info('🔄 Attempting automatic session recovery...', 'component');

        // Wait for auth service to be fully initialized
        while (!authService.isInitialized()) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const result = await authService.recoverSession();
        if (result.success && authService.isAdmin()) {
          logger.info('✅ Session recovered, redirecting to admin panel', 'component');
          handleLoginSuccess();
        } else {
          logger.debug('Session recovery failed or user is not admin', 'AdminLogin', { error: result.error });
        }
      } catch (error) {
        logger.debug('No valid session to recover', 'AdminLogin', { error: String(error) });
      }
    };

    // Delay the recovery attempt to ensure auth service is fully initialized
    setTimeout(attemptSessionRecovery, 2000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the improved authService.signIn method directly
      // It already handles timeouts and has better error handling
      const result = await authService.signIn(email, password);

      if (result.success && result.user) {
        // Check if the user has admin role
        if (result.user.role === 'admin') {
          setSuccess('Login successful! Loading admin dashboard...');
          
          // Slight delay for better UI transition
          setTimeout(() => {
            handleLoginSuccess();
          }, 500);
        } else {
          // Specific error message for role mismatch
          const userRole = result.user.role || 'unknown';
          setError(`Access denied. Admin privileges required. Your current role is: ${userRole}`);
          
          // Log this security event
          logger.warn('Non-admin user attempted to access admin panel', 'admin-login', {
            userEmail: email,
            userRole,
            timestamp: new Date().toISOString()
          });
          
          // Sign out immediately for security
          await authService.signOut();
        }
      } else {
        // Display the error returned from authService
        setError(result.error || 'Login failed. Please check your credentials.');
        
        // Log the error for monitoring
        logger.error('Authentication error during admin login', 'admin-login', {
          error: result.error || 'Unknown authentication error',
          userEmail: email
        });
      }
    } catch (err) {
      // Log the unexpected error
      logger.error('Unexpected error in admin login process', 'admin-login', { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Provide user-friendly error messages based on error type
      if (err instanceof Error) {
        // Handle specific error cases
        if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          setError(
            'The login process is taking longer than expected. This might be due to network issues. Please try again.'
          );
        } else if (err.message.includes('environment') || err.message.includes('config')) {
          setError('System configuration error. Please contact the administrator.');
        } else if (err.message.includes('network') || err.message.includes('connection')) {
          setError('Network connection error. Please check your internet connection and try again.');
        } else if (err.message.includes('profile') || err.message.includes('Profile')) {
          setError(
            'Unable to load your user profile. Please try again or contact support.'
          );
        } else {
          // Generic error message for other cases
          setError('An unexpected error occurred. Please try again or contact support.');
        }
      } else {
        // Handle non-Error objects
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    // Set transition type for login to dashboard
    setTransition('login-to-dashboard');

    // Add a small delay to ensure session is properly set
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // Use replace to avoid 404 issues
        navigate('/admin-dashboard', { replace: true });
      }
    }, 500);
  };

  const handleRecoverSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.recoverSession();
      if (result.success && authService.isAdmin()) {
        setSuccess('Session recovered! Redirecting...');
        setTimeout(() => {
          handleLoginSuccess();
        }, 1000);
      } else {
        setError('No valid session found. Please log in again.');
      }
    } catch (error) {
      setError('Session recovery failed. Please log in again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceFreshLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.forceFreshLogin();
      setSuccess('Session cleared. Please log in again with your credentials.');
    } catch (error) {
      setError('Failed to clear session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Admin Login
            </h2>
            <p className="text-slate-600 mt-2 text-sm">
              Access the administrative dashboard
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="admin@university.edu"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>


            {/* Loading State */}
            {isLoading && (
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="loading-spinner mr-3" />
                  Signing in and loading profile...
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-500 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-700">
                      Login Error
                    </h3>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-green-500 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-700">
                      Success
                    </h3>
                    <p className="text-sm text-green-600 mt-1">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                isLoading
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? 'Signing In...' : 'Admin Login'}
            </button>

            {/* Additional Actions */}
            <div className="text-center space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 justify-center text-xs">
                <button
                  type="button"
                  onClick={handleRecoverSession}
                  disabled={isLoading}
                  className="text-purple-600 hover:text-purple-700 underline transition-colors"
                >
                  Recover Session
                </button>
                <span className="hidden sm:inline text-slate-400">•</span>
                <button
                  type="button"
                  onClick={handleForceFreshLogin}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 underline transition-colors"
                >
                  Force Fresh Login
                </button>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p>Enter your admin credentials to access the system</p>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
