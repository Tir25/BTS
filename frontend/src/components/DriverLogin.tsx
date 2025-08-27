import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../config/supabase';
import { websocketService } from '../services/websocket';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { useTransition } from './transitions';

interface BusInfo {
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_id: string;
  driver_name: string;
}

interface LoginForm {
  email: string;
  password: string;
}

const DriverLogin: React.FC = () => {
  const navigate = useNavigate();
  const { setTransition } = useTransition();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);



  // Initialize Supabase auth listener (same as original)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await authenticateWithSocket(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setBusInfo(null);
        disconnectSocket();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        setLoginError(error.message);
        return;
      }

      if (data.user && data.session) {
        console.log('✅ Login successful:', data.user.email);
        await authenticateWithSocket(data.session.access_token);
        setLoginForm({ email: '', password: '' });
      } else {
        setLoginError('Login failed - no user data received');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setLoginError('An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithSocket = async (token: string) => {
    try {
      console.log('🔌 Driver: Connecting to WebSocket...');
      await websocketService.connect();
      
      // Wait for connection to be established - REDUCED TIMEOUT
      let connectionAttempts = 0;
      const maxAttempts = 5; // Reduced from 10 to 5 attempts
      
      while (!websocketService.isConnected() && connectionAttempts < maxAttempts) {
        console.log(`⏳ Waiting for WebSocket connection... (attempt ${connectionAttempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        connectionAttempts++;
      }
      
      if (!websocketService.isConnected()) {
        throw new Error('Failed to establish WebSocket connection');
      }
      
      console.log('✅ WebSocket connection established');

      websocketService.socket?.on('connect', () => {
        console.log('🔌 Driver: Connected to WebSocket server');
      });

      websocketService.socket?.on('disconnect', () => {
        console.log('🔌 Driver: Disconnected from WebSocket server');
      });

      websocketService.socket?.on('error', (error) => {
        console.error('❌ Driver: Socket error:', error);
        setLoginError(error.message || 'Socket error occurred');
      });

      // Wait a moment for connection to stabilize - REDUCED WAIT TIME
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1s to 500ms
      
      // Double-check connection status
      if (!websocketService.isConnected()) {
        throw new Error('WebSocket connection failed to establish');
      }

      // Set up authentication response handler
      const handleAuthenticationSuccess = async (data: { driverId: string; busId: string; busInfo: BusInfo }) => {
        console.log('✅ Driver: Authentication successful:', data);
        
        try {
          // Store driver-bus assignment in database instead of localStorage
          const assignment = {
            driver_id: data.driverId,
            bus_id: data.busId,
            bus_number: data.busInfo.bus_number,
            route_id: data.busInfo.route_id,
            route_name: data.busInfo.route_name,
            driver_name: data.busInfo.driver_name,
          };
          
          console.log('💾 Storing driver assignment:', assignment);
          const stored = await authService.storeDriverBusAssignment(assignment);
          console.log('💾 Assignment stored result:', stored);
          
          if (!stored) {
            console.error('❌ Failed to store driver assignment in database');
            setLoginError('Failed to store authentication data');
            return;
          }
          
          console.log('✅ Setting authentication state...');
          setIsAuthenticated(true);
          setBusInfo(data.busInfo);
          
          // Set transition type for login to dashboard
          setTransition('login-to-dashboard');
          
          // Navigate to driver dashboard after successful authentication
          console.log('🚀 Driver: Navigating to dashboard immediately...');
          navigate('/driver-dashboard');
          
          console.log('✅ Navigation initiated successfully');
        } catch (error) {
          console.error('❌ Error storing authentication data:', error);
          setLoginError('Failed to complete authentication');
        }
      };

      const handleAuthenticationFailed = (error: any) => {
        console.error('❌ Driver: Authentication failed:', error);
        setLoginError('Authentication failed: ' + (error.message || 'Unknown error'));
      };

      // Add timeout for authentication (increased to 30 seconds)
      const authTimeout = setTimeout(() => {
        console.error('❌ Driver: Authentication timeout');
        setLoginError('Authentication timeout - please try again');
        // Clean up listeners
        websocketService.socket?.off('driver:authenticated', handleAuthenticationSuccess);
        websocketService.socket?.off('driver:authentication_failed', handleAuthenticationFailed);
      }, 30000);

      console.log('🔐 Driver: Sending authentication request...');
      
      // Ensure we have a valid token
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Send authentication request with callbacks
      websocketService.authenticateAsDriver(token, {
        onSuccess: (data) => {
          clearTimeout(authTimeout);
          handleAuthenticationSuccess(data);
        },
        onFailure: (error) => {
          clearTimeout(authTimeout);
          handleAuthenticationFailed(error);
        },
        onError: (error) => {
          clearTimeout(authTimeout);
          console.error('❌ Driver: Authentication error:', error);
          setLoginError('Authentication error: ' + (error.message || 'Unknown error'));
        }
      });
      
      console.log('📤 Authentication request sent, waiting for response...');
    } catch (error) {
      console.error('❌ Driver: Authentication error:', error);
      setLoginError('Failed to authenticate with server');
    }
  };

  const disconnectSocket = () => {
    websocketService.disconnect();
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated && busInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="loading-spinner mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Authentication Successful!
          </h2>
          <p className="text-white/70">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }}
          className="w-full max-w-md"
        >
          {/* Glassy Login Panel */}
          <motion.div
            whileHover={!isMobile ? { scale: 1.02 } : {}}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 hover:bg-opacity-100 transition-all duration-500" />

            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 hover:bg-opacity-100 transition-all duration-500 rounded-3xl" />

            {/* Content */}
            <div className="relative z-10 p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center mb-8"
              >
                <div className="text-6xl mb-4 animate-pulse">🚌</div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Driver Login
                </h1>
                <p className="text-white/70">
                  Sign in to start tracking your bus
                </p>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4 mb-6"
                  >
                    <p className="text-red-200 text-sm">{loginError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                onSubmit={handleLogin}
                className="space-y-6"
              >
                {/* Email Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-white/90 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your email"
                  />
                </motion.div>

                {/* Password Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-white/90 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your password"
                  />
                </motion.div>

                {/* Login Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  whileHover={!isMobile ? { scale: 1.02, y: -2 } : {}}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </motion.form>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-6 text-center"
              >
                <p className="text-sm text-white/60">
                  Please contact your administrator for login credentials
                </p>
              </motion.div>
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full hover:translate-x-full transition-transform duration-1000" />
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(isMobile ? 8 : 15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default DriverLogin;
