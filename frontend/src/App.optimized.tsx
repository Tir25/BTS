// frontend/src/App.optimized.tsx

import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useHealthCheck } from './hooks/useApiQueries';
import { authService } from './services/authService';
import { createLazyComponent } from './utils/lazyLoading';
import {
  TransitionProvider,
  GlobalTransitionWrapper,
} from './components/transitions';

// Import error handling components
import { ErrorBoundary, NetworkStatus } from './components/error';

// Import performance monitoring
import { withPerformanceMonitoring } from './components/performance/PerformanceMonitor';

// Import optimized components
import OptimizedStudentMap from './components/optimized/OptimizedStudentMap';
import OptimizedDriverDashboard from './components/optimized/OptimizedDriverDashboard';

// Lazy load all large components for better performance
const DriverInterface = createLazyComponent(
  () => import('./components/DriverInterface'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const DriverLogin = createLazyComponent(
  () => import('./components/DriverLogin'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const AdminDashboard = createLazyComponent(
  () => import('./components/AdminDashboard'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const AdminLogin = createLazyComponent(
  () => import('./components/AdminLogin'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const PremiumHomepage = createLazyComponent(
  () => import('./components/PremiumHomepage'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

// Memoized navigation component
const Navigation = React.memo(() => {
  const { isAuthenticated, user } = useAuthStore();

  const navigationItems = useMemo(() => {
    const items = [
      { path: '/', label: 'Home', public: true },
      { path: '/student-map', label: 'Student Map', public: true },
    ];

    if (isAuthenticated) {
      if ((user as any)?.user_metadata?.role === 'driver') {
        items.push(
          { path: '/driver-dashboard', label: 'Driver Dashboard', public: false },
          { path: '/driver-interface', label: 'Driver Interface', public: false }
        );
      } else if ((user as any)?.user_metadata?.role === 'admin') {
        items.push(
          { path: '/admin-dashboard', label: 'Admin Dashboard', public: false }
        );
      }
    } else {
      items.push(
        { path: '/driver-login', label: 'Driver Login', public: true },
        { path: '/admin-login', label: 'Admin Login', public: true }
      );
    }

    return items;
  }, [isAuthenticated, user]);

  return (
    <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-white hover:text-gray-300 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">
                Welcome, {(user as any)?.user_metadata?.name || user?.email}
              </span>
              <button
                onClick={() => authService.logout()}
                className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
});

// Memoized loading component
const LoadingSpinner = React.memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
      <div className="text-white text-lg">Loading...</div>
    </div>
  </div>
));

// Memoized error boundary wrapper
const ErrorBoundaryWrapper = React.memo<{ children: React.ReactNode }>(({ children }) => (
  <ErrorBoundary>
    <NetworkStatus showOfflineMessage={true} />
    {children}
  </ErrorBoundary>
));

function OptimizedApp() {
  console.log('🚀 Optimized App component is rendering...');

  // Health check with memoization
  const { data: healthData, isLoading: isHealthLoading, error: healthError } = useHealthCheck();

  // Memoized health status
  const healthStatus = useMemo(() => {
    if (isHealthLoading) return 'loading';
    if (healthError) return 'error';
    if (healthData?.status === 'healthy') return 'healthy';
    return 'unknown';
  }, [isHealthLoading, healthError, healthData]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Auth service is auto-initialized
        console.log('✅ Auth service initialized');
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
      }
    };

    initializeAuth();
  }, []);

  // Performance tracking for component loading
  // Performance tracking is handled by lazy loading components

  // Memoized route configuration
  const routes = useMemo(() => [
    {
      path: '/',
      element: <PremiumHomepage />,
      public: true,
    },
    {
      path: '/student-map',
      element: <OptimizedStudentMap />,
      public: true,
    },
    {
      path: '/driver-login',
      element: <DriverLogin />,
      public: true,
    },
    {
      path: '/driver-dashboard',
      element: <OptimizedDriverDashboard />,
      public: false,
      requiresAuth: true,
      requiredRole: 'driver',
    },
    {
      path: '/driver-interface',
      element: <DriverInterface />,
      public: false,
      requiresAuth: true,
      requiredRole: 'driver',
    },
    {
      path: '/admin-login',
      element: <AdminLogin />,
      public: true,
    },
    {
      path: '/admin-dashboard',
      element: <AdminDashboard />,
      public: false,
      requiresAuth: true,
      requiredRole: 'admin',
    },
  ], []);

  // Show loading spinner while health check is in progress
  if (isHealthLoading) {
    return <LoadingSpinner />;
  }

  // Show error state if health check fails
  if (healthError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Service Unavailable</h1>
          <p className="text-lg opacity-80">
            Unable to connect to the backend service. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundaryWrapper>
      <Router>
        <TransitionProvider>
          <GlobalTransitionWrapper>
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
              <Navigation />
              
              <main className="relative">
                <Routes>
                  {routes.map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                </Routes>
              </main>

              {/* Health status indicator */}
              <div className="fixed bottom-4 left-4 z-50">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  healthStatus === 'healthy' 
                    ? 'bg-green-500/80 text-white' 
                    : healthStatus === 'error'
                    ? 'bg-red-500/80 text-white'
                    : 'bg-yellow-500/80 text-white'
                }`}>
                  {healthStatus === 'healthy' ? '🟢 Online' : 
                   healthStatus === 'error' ? '🔴 Offline' : 
                   '🟡 Checking...'}
                </div>
              </div>
            </div>
          </GlobalTransitionWrapper>
        </TransitionProvider>
      </Router>
    </ErrorBoundaryWrapper>
  );
}

// Export with performance monitoring
export default withPerformanceMonitoring(OptimizedApp, {
  enabled: process.env.NODE_ENV === 'development',
  showUI: process.env.NODE_ENV === 'development',
  logToConsole: true,
  threshold: 16,
});

