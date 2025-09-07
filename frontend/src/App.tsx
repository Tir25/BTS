import { useEffect } from 'react';
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

// Lazy load all large components for better performance
const DriverInterface = createLazyComponent(
  () => import('./components/DriverInterface'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const DriverLogin = createLazyComponent(
  () => import('./components/DriverLogin'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const DriverDashboard = createLazyComponent(
  () => import('./components/DriverDashboard'),
  () => <div className="loading-spinner mx-auto mb-4" />
);

const EnhancedStudentMap = createLazyComponent(
  () => import('./components/EnhancedStudentMap'),
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

function App() {
  console.log('🚀 App component is rendering...');

  // Zustand auth store
  const {
    loading: authLoading,
    error: authError,
    setUser,
    setLoading,
    setError,
  } = useAuthStore();

  // React Query health check
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = useHealthCheck();

  // Global auth state listener
  useEffect(() => {
    const updateAuthState = () => {
      const currentUser = authService.getCurrentUser();

      setUser(
        currentUser
          ? {
              id: currentUser.id,
              email: currentUser.email || '',
              role: 'student' as const,
              created_at: currentUser.created_at,
              updated_at: currentUser.updated_at,
            }
          : null
      );

      setLoading(false);
    };

    // Set up auth state listener
    authService.onAuthStateChange(updateAuthState);

    // Initial auth state check
    updateAuthState();

    return () => {
      authService.removeAuthStateChangeListener();
    };
  }, [setUser, setLoading]);

  // Handle health check errors
  useEffect(() => {
    if (healthError) {
      setError('Failed to connect to backend');
    } else {
      setError(null);
    }
  }, [healthError, setError]);

  // Legacy Homepage (for backward compatibility)
  const LegacyHomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full mx-auto">
        <div className="card-glass p-8">
          <h1 className="text-4xl font-bold gradient-text mb-6 text-center">
            🚍 University Bus Tracking System
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Driver Interface */}
            <Link
              to="/driver-login"
              className="card-glass p-6 text-center hover:scale-105 transition-transform duration-300"
            >
              <div className="text-4xl mb-4">🚌</div>
              <h2 className="text-xl font-semibold mb-2">Driver Interface</h2>
              <p className="text-white/70">
                Real-time location sharing & navigation
              </p>
            </Link>

            {/* Student Map */}
            <Link
              to="/student-map"
              className="card-glass p-6 text-center hover:scale-105 transition-transform duration-300"
            >
              <div className="text-4xl mb-4">🗺️</div>
              <h2 className="text-xl font-semibold mb-2">Student Map</h2>
              <p className="text-white/70">
                Live bus tracking & route information
              </p>
            </Link>

            {/* Admin Panel */}
            <Link
              to="/admin-login"
              className="card-glass p-6 text-center hover:scale-105 transition-transform duration-300"
            >
              <div className="text-4xl mb-4">⚙️</div>
              <h2 className="text-xl font-semibold mb-2">Admin Panel</h2>
              <p className="text-white/70">
                Fleet management & analytics dashboard
              </p>
            </Link>
          </div>

          {/* Health Status */}
          {health && (
            <div className="mt-8 p-4 bg-green-500/20 border border-green-400/30 rounded-xl">
              <p className="text-green-200 text-center">
                ✅ Backend Status: {health.status}
              </p>
            </div>
          )}

          {authError && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
              <p className="text-red-200 text-center">{authError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Loading state
  if (authLoading || healthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-white">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <NetworkStatus
          onNetworkChange={isOnline => {
            console.log(
              `🌐 Network status changed: ${isOnline ? 'Online' : 'Offline'}`
            );
          }}
        />
        <TransitionProvider>
          <GlobalTransitionWrapper>
            <Routes>
              {/* Homepage Routes */}
              <Route path="/" element={<PremiumHomepage />} />
              <Route path="/legacy" element={<LegacyHomePage />} />

              {/* Driver Routes */}
              <Route path="/driver-login" element={<DriverLogin />} />
              <Route path="/driver-dashboard" element={<DriverDashboard />} />
              <Route path="/driver-interface" element={<DriverInterface />} />

              {/* Student Routes */}
              <Route path="/student-map" element={<EnhancedStudentMap />} />

              {/* Admin Routes */}
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />

              {/* Fallback */}
              <Route path="*" element={<PremiumHomepage />} />
            </Routes>
          </GlobalTransitionWrapper>
        </TransitionProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
