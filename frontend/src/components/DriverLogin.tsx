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
  
  // PRODUCTION FIX: Auto-redirect when authentication completes
  // Previously waited for busAssignment; now redirect immediately after auth
  useEffect(() => {
    // Only redirect if:
    // 1. User is authenticated
    // 2. Not currently loading auth step
    // 3. Haven't already initiated navigation
    if (isAuthenticated && !isLoading && !navigationRef.current) {
      navigationRef.current = true;
      logger.info('🔄 Auth complete, redirecting to driver dashboard (assignment will load there)', 'component', {
        hasBusAssignment: !!busAssignment
      });

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/driver-dashboard', { replace: true });
        redirectTimeoutRef.current = null;
      }, 150);
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
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
                className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  touched.email && validationErrors.email
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                placeholder="driver@university.edu"
                disabled={isLoading}
                aria-invalid={touched.email && !!validationErrors.email}
                aria-describedby={touched.email && validationErrors.email ? 'email-error' : undefined}
              />
              {touched.email && validationErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
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
                className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  touched.password && validationErrors.password
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
                aria-invalid={touched.password && !!validationErrors.password}
                aria-describedby={touched.password && validationErrors.password ? 'password-error' : undefined}
              />
              {touched.password && validationErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.password}
                </p>
              )}
            </div>

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
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                isLoading
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
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
            <p className="text-slate-600 text-sm">
              Having trouble? Contact your administrator for assistance.
            </p>
          </div>
        </div>

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
