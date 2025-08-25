import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../config/supabase';
import { websocketService } from '../services/websocket';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
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

  // Handle video loading
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Slow down the video slightly

      const handleVideoLoad = () => setIsVideoLoaded(true);
      videoRef.current.addEventListener('loadeddata', handleVideoLoad);

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleVideoLoad);
        }
      };
    }
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

      websocketService.socket?.on('connect', () => {
        console.log('🔌 Driver: Connected to WebSocket server');
      });

      websocketService.socket?.on('error', (error) => {
        console.error('❌ Driver: Socket error:', error);
        setLoginError(error.message || 'Socket error occurred');
      });

      websocketService.socket?.on(
        'driver:authenticated',
        (data: { driverId: string; busId: string; busInfo: BusInfo }) => {
          console.log('✅ Driver: Authentication successful:', data);
          setIsAuthenticated(true);
          setBusInfo(data.busInfo);
          // Set transition type for login to dashboard
          setTransition('login-to-dashboard');
          
          // Navigate to driver dashboard after successful authentication
          setTimeout(() => {
            navigate('/driver-dashboard');
          }, 1000);
        }
      );

      websocketService.authenticateAsDriver(token);
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          preload="auto"
        >
          <source
            src="/videos/Animated_Countryside_University_Bus.mp4"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        {/* Video overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        {/* Loading overlay */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
        )}
      </div>

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
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />

            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

            {/* Content */}
            <div className="relative z-10 p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center mb-8"
              >
                <div className="card-icon-wrapper mb-4 flex items-center justify-center mx-auto">
                  <div className="icon-container">
                    <span 
                      className="animate-pulse" 
                      style={{ 
                        fontSize: '5rem', 
                        lineHeight: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      🚌
                    </span>
                  </div>
                </div>
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
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
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
