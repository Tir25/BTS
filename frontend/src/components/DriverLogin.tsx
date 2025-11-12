/**
 * DriverLogin
 * Authenticates drivers and redirects to the dashboard; uses shared UI and validation utilities.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverAuth } from '../context/DriverAuthContext';
import { logger } from '../utils/logger';
import { errorHandler, CustomError } from '../utils/errorHandler';
import { getUserFriendlyError, ErrorContext } from '../utils/errorMessageTranslator';
import { Input } from './common/Input';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { validateEmail, validatePassword } from '../utils/validation';

interface LoginForm {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

const DriverLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated, busAssignment } = useDriverAuth();
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  
  // PRODUCTION FIX: Navigation guard to prevent multiple redirects
  const navigationRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // PRODUCTION FIX: Auto-redirect when authentication completes
  // Previously waited for busAssignment; now redirect immediately after auth
  useEffect(() => {
    // PRODUCTION FIX: More aggressive redirect logic - redirect as soon as authenticated
    // Don't wait for loading to clear, redirect immediately when authenticated
    if (isAuthenticated && !navigationRef.current) {
      navigationRef.current = true;
      logger.info('🔄 Auth complete, redirecting to driver dashboard', 'component', {
        hasBusAssignment: !!busAssignment,
        isLoading,
        currentPath: window.location.pathname
      });

      // Clear any existing timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      // PRODUCTION FIX: Use requestAnimationFrame for better state propagation
      // This ensures React state updates are flushed before navigation
      redirectTimeoutRef.current = setTimeout(() => {
        if (isAuthenticated && navigationRef.current) {
          // Use double RAF to ensure all state updates are propagated
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
        if (isAuthenticated && navigationRef.current) {
          logger.info('✅ Executing redirect to driver dashboard', 'component');
          navigate('/driver-dashboard', { replace: true });
          redirectTimeoutRef.current = null;
        }
            });
          });
        }
      }, 50); // Reduced delay since we're using RAF
    }

    if (!isAuthenticated) {
      navigationRef.current = false;
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading, busAssignment, navigate]);

  // Client-side validation (reused utilities)

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    const emailError = validateEmail(loginForm.email);
    if (emailError) errors.email = emailError;
    
    const passwordError = validatePassword(loginForm.password);
    if (passwordError) errors.password = passwordError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Clear validation error for this field
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear login error when user starts typing
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate the field
    let error: string | undefined;
    if (name === 'email') {
      error = validateEmail(value);
    } else if (name === 'password') {
      error = validatePassword(value);
    }
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    clearError();

    // Client-side validation before submission
    if (!validateForm()) {
      logger.warn('⚠️ Form validation failed', 'component', { errors: validationErrors });
      return;
    }

    try {
      logger.info('🔐 Attempting driver login...', 'component');
      
      const result = await login(loginForm.email, loginForm.password);

      if (!result.success) {
        logger.error('❌ Driver login failed:', 'component', { error: result.error });
        
        // PRODUCTION FIX: Use error message directly from backend response
        // The backend already provides user-friendly error messages (e.g., "Invalid email or password")
        // Translate it to ensure consistency, but preserve the specific message
        const errorMessage = result.error || 'Login failed';
        const userFriendlyMessage = getUserFriendlyError(
          errorMessage,
          'Login failed. Please check your credentials and try again.'
        );
        
        setLoginError(userFriendlyMessage);
        return;
      }

      logger.info('✅ Driver login successful', 'component');

      // PRODUCTION FIX: Use requestAnimationFrame for state propagation before redirect
      // This ensures all state updates are flushed before navigation
      navigationRef.current = true;
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      
      // Use double RAF to ensure state is fully propagated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (navigationRef.current) {
            logger.info('✅ Executing immediate redirect to driver dashboard', 'component');
      navigate('/driver-dashboard', { replace: true });
          }
        });
      });
      
      // PRODUCTION FIX: Immediate navigation keeps the UX responsive even if background initialization runs longer.
      // The useEffect hook remains as a fallback for scenarios where a session already exists on mount.
      
    } catch (error) {
      logger.error('❌ Login error:', 'component', { error });
      
      // Process error through centralized error handler
      const appError = errorHandler.handleError(error, 'DriverLogin');
      
      // Get user-friendly error message
      const userFriendlyMessage = getUserFriendlyError(
        appError.userMessage || appError.message,
        'Login failed. Please try again.'
      );
      
      setLoginError(userFriendlyMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Driver Login</h1>
          <p className="text-slate-600">Sign in to start tracking your bus</p>
        </div>

        {/* Login Form */}
        <Card padding="lg">
          {/* PRODUCTION FIX: Show loading state while waiting for bus assignment after login */}
          {isAuthenticated && isLoading && !loginError && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="loading-spinner" />
                <div>
                  <p className="text-blue-900 font-medium">Authenticated successfully!</p>
                  <p className="text-blue-700 text-sm mt-1">Loading your bus assignment...</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <Input
              type="email"
              id="email"
              name="email"
              label="Email Address"
              value={loginForm.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              required
              placeholder="driver@university.edu"
              disabled={isLoading}
              error={touched.email ? validationErrors.email : undefined}
            />

            {/* Password Field */}
            <Input
              type="password"
              id="password"
              name="password"
              label="Password"
              value={loginForm.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              required
              placeholder="Enter your password"
              disabled={isLoading}
              error={touched.password ? validationErrors.password : undefined}
            />

            {/* Error Message */}
            {(loginError || error) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm">{loginError || error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" fullWidth variant="primary" isLoading={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Having trouble? Contact your administrator for assistance.
            </p>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
