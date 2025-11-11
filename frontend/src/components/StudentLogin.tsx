import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { studentAuthService } from '../services/auth/studentAuthService';
import { useAuthStore } from '../stores/useAuthStore';
import { logger } from '../utils/logger';
import { validateEmail, validatePassword } from '../utils/validation';

interface LoginForm {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

interface StudentLoginProps {
  onLoginSuccess?: () => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
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
  const [isLoading, setIsLoading] = useState(false);

  // Client-side validation
  const validateEmailField = (email: string): string | undefined => {
    return validateEmail(email);
  };

  const validatePasswordField = (password: string): string | undefined => {
    return validatePassword(password);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    const emailError = validateEmailField(loginForm.email);
    const passwordError = validatePasswordField(loginForm.password);
    
    if (emailError) errors.email = emailError;
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
    setTouched(prev => ({ ...prev, [name as keyof typeof prev]: true }));
    
    // Clear validation error for this field
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name as keyof ValidationErrors]: undefined }));
    }
    
    // Clear login error when user starts typing
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name as keyof typeof prev]: true }));
    
    // Validate the field
    let error: string | undefined;
    if (name === 'email') {
      error = validateEmailField(value);
    } else if (name === 'password') {
      error = validatePasswordField(value);
    }
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name as keyof ValidationErrors]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    // Client-side validation before submission
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      logger.info('🔐 Attempting student login...', 'component');
      
      // Call student authentication service
      const result = await studentAuthService.signIn(loginForm.email, loginForm.password);

      if (!result.success) {
        logger.error('❌ Student login failed:', 'component', { error: result.error });
        setLoginError(result.error || 'Login failed. Please check your credentials and try again.');
        return;
      }

      if (result.user) {
        logger.info('✅ Student login successful', 'component');
        
        // Store user in auth store
        useAuthStore.getState().setUser({
          id: result.user.id,
          email: result.user.email,
          role: result.user.role as 'student',
          full_name: result.user.full_name,
          created_at: result.user.created_at,
          updated_at: result.user.updated_at,
        });

        // Redirect to student map
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/student-map', { replace: true });
        }
      } else {
        setLoginError('Login failed. Please try again.');
      }
    } catch (error) {
      logger.error('❌ Student login error:', 'component', { error });
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Student Portal</h1>
          <p className="text-slate-600">Sign in to view live bus tracking</p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8"
        >
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
                placeholder="Enter your email address"
                disabled={isLoading}
              />
              {touched.email && validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
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
              />
              {touched.password && validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            {/* Error Message */}
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl"
              >
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-800">{loginError}</p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                isLoading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-center text-sm text-slate-600"
        >
          <p>University Bus Tracking System</p>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentLogin;
