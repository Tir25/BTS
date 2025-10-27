import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { logger } from '../utils/logger';
import { errorHandler, CustomError } from '../utils/errorHandler';
import { getUserFriendlyError, ErrorContext } from '../utils/errorMessageTranslator';

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
  
  // PRODUCTION FIX: Auto-redirect when authentication completes AND bus assignment is ready
  // Enhanced to wait for bus assignment before redirecting
  useEffect(() => {
    // Only redirect if:
    // 1. User is authenticated
    // 2. Not currently loading
    // 3. Bus assignment is available
    // 4. Haven't already initiated navigation
    if (isAuthenticated && !isLoading && busAssignment && !navigationRef.current) {
      // Mark navigation as initiated to prevent duplicate redirects
      navigationRef.current = true;
      
      logger.info('🔄 Authentication complete, redirecting to dashboard', 'component', {
        hasBusAssignment: !!busAssignment,
        busNumber: busAssignment.bus_number,
        routeName: busAssignment.route_name
      });
      
      // Clear any pending redirect timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      // Small delay to ensure React state is fully propagated
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/driver-dashboard', { replace: true });
        redirectTimeoutRef.current = null;
      }, 150);
    }
    
    // Reset navigation guard if authentication is lost
    if (!isAuthenticated) {
      navigationRef.current = false;
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading, busAssignment, navigate]);

  // Client-side validation
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return undefined;
  };

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
        
        // Process error through centralized error handler for better user messages
        const appError = errorHandler.handleError(
          new Error(result.error || 'Login failed'), 
          'DriverLogin'
        );
        
        // Get user-friendly error message
        const userFriendlyMessage = getUserFriendlyError(
          appError.userMessage || appError.message,
          'Login failed. Please check your credentials and try again.'
        );
        
        setLoginError(userFriendlyMessage);
        return;
      }

      logger.info('✅ Driver login successful', 'component');
      
      // PRODUCTION FIX: Navigation is now handled by useEffect hook above
      // which waits for bus assignment to be loaded before redirecting
      // This ensures the dashboard has all required data when it mounts
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-2xl">🚌</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Driver Login</h1>
          <p className="text-blue-200">Sign in to start tracking your bus</p>
        </div>

        {/* Login Form */}
        <div className="card-glass p-8">
          {/* PRODUCTION FIX: Show loading state while waiting for bus assignment after login */}
          {isAuthenticated && isLoading && !loginError && (
            <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="loading-spinner" />
                <div>
                  <p className="text-blue-200 font-medium">Authenticated successfully!</p>
                  <p className="text-blue-300 text-sm mt-1">Loading your bus assignment...</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={loginForm.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  touched.email && validationErrors.email
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-white/20'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
                aria-invalid={touched.email && !!validationErrors.email}
                aria-describedby={touched.email && validationErrors.email ? 'email-error' : undefined}
              />
              {touched.email && validationErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-400" role="alert">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={loginForm.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  touched.password && validationErrors.password
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-white/20'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
                aria-invalid={touched.password && !!validationErrors.password}
                aria-describedby={touched.password && validationErrors.password ? 'password-error' : undefined}
              />
              {touched.password && validationErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-400" role="alert">
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Error Message */}
            {(loginError || error) && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-red-400 mr-2">⚠️</span>
                  <p className="text-red-200 text-sm">{loginError || error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="loading-spinner mr-2" />
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-white/70 text-sm">
              Having trouble? Contact your administrator for assistance.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-300 hover:text-blue-200 text-sm underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
