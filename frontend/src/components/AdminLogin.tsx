import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import GlassyCard from './ui/GlassyCard';
import PremiumButton from './ui/PremiumButton';
import { useTransition } from './transitions';

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
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  // Try to recover session on component mount
  useEffect(() => {
    const attemptSessionRecovery = async () => {
      try {
        console.log('🔄 Attempting automatic session recovery...');
        
        // Wait for auth service to be fully initialized
        while (!authService.isInitialized()) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const result = await authService.recoverSession();
        if (result.success && authService.isAdmin()) {
          console.log('✅ Session recovered, redirecting to admin panel');
          handleLoginSuccess();
        } else {
          console.log(
            '📝 Session recovery failed or user is not admin:',
            result.error
          );
        }
      } catch (error) {
        console.log('📝 No valid session to recover:', error);
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
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 8000); // Reduced from 15s to 8s
      });

      const loginPromise = authService.signIn(email, password);

      const result = (await Promise.race([loginPromise, timeoutPromise])) as {
        success: boolean;
        user?: { role: string };
        error?: string;
      };

              if (result.success && result.user) {
          if (result.user.role === 'admin') {
            setSuccess('Login successful! Loading admin dashboard...');
            setTimeout(() => {
              handleLoginSuccess();
            }, 1000); // Reduced from 1.5s to 1s
          } else {
            setError('Access denied. Admin privileges required.');
            await authService.signOut();
          }
        } else {
          setError(
            result.error || 'Login failed. Please check your credentials.'
          );
        }
    } catch (err) {
      console.error('❌ Login error:', err);
      if (err instanceof Error && err.message === 'Login timeout') {
        setError(
          'Login timed out. This might be due to slow network or profile loading. Please try again.'
        );
      } else if (
        err instanceof Error &&
        err.message.includes('environment variables')
      ) {
        setError('Configuration error. Please check your environment setup.');
      } else if (
        err instanceof Error &&
        err.message.includes('Profile loading timeout')
      ) {
        setError(
          'Profile loading is taking longer than expected. Please try again.'
        );
      } else {
        setError('Network error. Please check your connection and try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <GlassyCard
          variant="ultra"
          glow={true}
          className="p-8 relative"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-lg opacity-50"></div>
              <svg
                className="h-8 w-8 text-white relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Admin Login
            </h2>
            <p className="text-blue-200/80 mt-2 text-sm">
              Access the administrative dashboard
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Email Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  placeholder="admin@university.edu"
                  disabled={isLoading}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </motion.div>

            {/* 2FA Code Input (Optional) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <label htmlFor="twoFactorCode" className="block text-sm font-medium text-blue-200/80 mb-2">
                2FA Code <span className="text-blue-200/50">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  type="text"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                  placeholder="Enter 2FA code if enabled"
                  disabled={isLoading}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </motion.div>

            {/* Loading State */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center px-4 py-2 text-sm text-blue-200 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-xl">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full mr-3"
                    />
                    Signing in and loading profile...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4"
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-300">
                        Login Error
                      </h3>
                      <p className="text-sm text-red-200 mt-1">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4"
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-300">
                        Success
                      </h3>
                      <p className="text-sm text-green-200 mt-1">{success}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <PremiumButton
                variant="gradient"
                size="lg"
                className="w-full relative group"
                disabled={isLoading}
                loading={isLoading}
                icon={
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              >
                {isLoading ? 'Signing In...' : 'Admin Login'}
              </PremiumButton>
            </motion.div>

            {/* Additional Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="text-center space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-2 justify-center text-xs">
                <button
                  type="button"
                  onClick={handleRecoverSession}
                  disabled={isLoading}
                  className="text-blue-300 hover:text-blue-200 underline transition-colors duration-200"
                >
                  Recover Session
                </button>
                <span className="hidden sm:inline text-blue-200/50">•</span>
                <button
                  type="button"
                  onClick={handleForceFreshLogin}
                  disabled={isLoading}
                  className="text-red-300 hover:text-red-200 underline transition-colors duration-200"
                >
                  Force Fresh Login
                </button>
              </div>
              
              <div className="text-xs text-blue-200/50 space-y-1">
                <p>Enter your admin credentials to access the system</p>
                <p>Using Supabase Authentication</p>
              </div>
            </motion.div>
          </motion.form>
        </GlassyCard>
      </motion.div>


    </div>
  );
}
