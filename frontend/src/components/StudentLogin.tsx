import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LoginForm {
  studentId: string;
  password: string;
}

interface ValidationErrors {
  studentId?: string;
  password?: string;
}

interface StudentLoginProps {
  onLoginSuccess: () => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
  const [loginForm, setLoginForm] = useState<LoginForm>({
    studentId: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ studentId: boolean; password: boolean }>({
    studentId: false,
    password: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // PRODUCTION FIX: Removed hardcoded credentials
  // Student authentication has been removed - this component is deprecated
  // This component should not be used in production

  // Client-side validation
  const validateStudentId = (studentId: string): string | undefined => {
    if (!studentId) {
      return 'Student ID is required';
    }
    if (studentId.trim().length === 0) {
      return 'Student ID cannot be empty';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 3) {
      return 'Password must be at least 3 characters';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    const studentIdError = validateStudentId(loginForm.studentId);
    const passwordError = validatePassword(loginForm.password);
    
    if (studentIdError) errors.studentId = studentIdError;
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
    if (name === 'studentId') {
      error = validateStudentId(value);
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
    setIsLoading(true);

    // Client-side validation before submission
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // PRODUCTION FIX: Student authentication has been removed
      // This component is deprecated and should not be used
      // Always show error to prevent usage
      setLoginError('Student login is no longer required. Please access the student map directly.');
      console.warn('⚠️ StudentLogin component is deprecated. Student authentication has been removed.');
    } catch (error) {
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
            {/* Student ID Field */}
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-slate-700 mb-2">
                Student ID
              </label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={loginForm.studentId}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
                className={`w-full px-4 py-3 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  touched.studentId && validationErrors.studentId
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                placeholder="Enter your student ID"
                disabled={isLoading}
              />
              {touched.studentId && validationErrors.studentId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.studentId}</p>
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
