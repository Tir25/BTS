import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { authService } from '../services/authService';

import { logger } from '../utils/logger';

interface LoginForm {
  email: string;
  password: string;
}

const DriverLogin: React.FC = () => {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      logger.info('🔐 Attempting driver login...', 'component');
      
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        logger.error('❌ Supabase auth error:', 'component', { error });
        setLoginError(error.message);
        return;
      }

      if (!data.user) {
        setLoginError('Login failed. Please check your credentials.');
        return;
      }

      logger.info('✅ Supabase authentication successful', 'component');

      // Validate driver session and get bus assignment with enhanced error handling
      const { isValid, assignment, errorCode, errorMessage } = await authService.validateDriverSession();

      if (!isValid || !assignment) {
        // Use the specific error message provided by the validation service
        const displayError = errorMessage || 'Driver validation failed. Please contact your administrator.';
        const errorCodeMsg = errorCode ? ` (Error: ${errorCode})` : '';
        
        logger.error(`❌ Driver validation failed: ${displayError}${errorCodeMsg}`, 'component');
        setLoginError(displayError);
        
        // Sign out from Supabase if driver validation fails
        await supabase.auth.signOut();
        return;
      }

      logger.debug('Debug info', 'component', { data: '✅ Driver validation successful:', assignment });

      // Store the assignment for future use
      // Note: Assignment is already stored in authService during validation

      // Navigate to driver dashboard
      navigate('/driver-dashboard');
      
    } catch (error) {
      logger.error('❌ Login error:', 'component', { error });
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                disabled={isLoading}
              />
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
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-red-400 mr-2">⚠️</span>
                  <p className="text-red-200 text-sm">{loginError}</p>
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
