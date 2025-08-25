import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { apiService } from './services/api';
import { authService } from './services/authService';
import { HealthResponse, User } from './types';
import DriverInterface from './components/DriverInterface';
import DriverLogin from './components/DriverLogin';
import DriverDashboard from './components/DriverDashboard';
import EnhancedStudentMap from './components/EnhancedStudentMap';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import PremiumHomepage from './components/PremiumHomepage';
import { TransitionProvider, GlobalTransitionWrapper } from './components/transitions';
import { initAllPerformanceMonitoring } from './utils/performance';

function App() {
  console.log('🚀 App component is rendering...');

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
  }>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);

        // Wait for auth service to be initialized before making API calls
        while (!authService.isInitialized()) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const healthData = await apiService.getHealth();
        setHealth(healthData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to connect to backend'
        );
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    
    // Initialize performance monitoring
    initAllPerformanceMonitoring();
  }, []);

  // Global auth state listener
  useEffect(() => {
    const updateAuthState = () => {
      const user = authService.getCurrentUser();
      const profile = authService.getCurrentProfile();

      setAuthState({
        isAuthenticated: !!user,
        user: profile || null,
        loading: false,
      });
    };

    // Set up auth state listener
    authService.onAuthStateChange(updateAuthState);

    // Initial auth state check
    updateAuthState();

    return () => {
      authService.removeAuthStateChangeListener();
    };
  }, []);

  // Legacy Homepage (for backward compatibility)
  const LegacyHomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full mx-auto">
        <div className="card-glass p-8">
          <h1 className="text-4xl font-bold gradient-text mb-6 text-center">
            🚍 University Bus Tracking System
          </h1>

          <div className="space-y-6">
            {loading && (
              <div className="text-center">
                <div className="loading-spinner mx-auto"></div>
                <p className="text-white/70 mt-4">
                  Checking backend connection...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
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
                      Connection Error
                    </h3>
                    <p className="text-sm text-red-200 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {health && (
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
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
                      Backend Connected
                    </h3>
                    <div className="text-sm text-green-200 mt-1 space-y-1">
                      <p>
                        <strong>Status:</strong> {health.status}
                      </p>
                      <p>
                        <strong>Database:</strong>{' '}
                        {health.services?.database?.status || 'Unknown'}
                      </p>
                      <p>
                        <strong>Environment:</strong> {health.environment}
                      </p>
                      <p>
                        <strong>Timestamp:</strong>{' '}
                        {new Date(health.timestamp).toLocaleString()}
                      </p>
                      {health.services?.database?.details && (
                        <div className="mt-2 text-xs">
                          <p>
                            <strong>PostgreSQL:</strong>{' '}
                            {health.services.database.details.details
                              ?.postgresVersion || 'Unknown'}
                          </p>
                          <p>
                            <strong>Pool Status:</strong>{' '}
                            {`Total: ${health.services.database.details.details?.poolSize || 0}, Idle: ${health.services.database.details.details?.idleCount || 0}, Waiting: ${health.services.database.details.details?.waitingCount || 0}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center text-sm text-white/60 mt-6">
              <p>Phase 5: Admin Panel & Analytics Dashboard ✅</p>
              <p className="mt-1">
                Role-based access control, analytics charts, and system
                management
              </p>
              {authState.isAuthenticated && (
                <p className="mt-2 text-green-400">
                  ✅ Authenticated as:{' '}
                  {authState.user?.full_name || authState.user?.email}
                </p>
              )}
            </div>

            {/* Navigation Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              <Link to="/driver" className="btn-primary text-center block">
                🚌 Driver Interface
              </Link>

              <Link to="/student" className="btn-primary text-center block">
                👨‍🎓 Student Map (Live Tracking)
              </Link>

              <Link to="/admin" className="btn-primary text-center block">
                👨‍💼 Admin Panel (Phase 5)
              </Link>

              <Link
                to="/premium-demo"
                className="btn-secondary text-center block"
              >
                ✨ Premium UI Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 404 Not Found Component
  const NotFound = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="card-glass p-8">
          <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-white/70 mb-6">
            The page you're looking for doesn't exist.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Go Back Home
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TransitionProvider>
        <GlobalTransitionWrapper>
          <Routes>
            {/* New Premium Homepage */}
            <Route path="/" element={<PremiumHomepage />} />

            {/* Legacy Routes */}
            <Route path="/legacy" element={<LegacyHomePage />} />
            <Route path="/driver" element={<DriverInterface />} />
            <Route path="/student" element={<EnhancedStudentMap />} />
            <Route path="/admin" element={<AdminPanel />} />

            {/* New Navigation Routes */}
            <Route path="/driver-login" element={<DriverLogin />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            <Route path="/student-map" element={<EnhancedStudentMap />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminPanel />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </GlobalTransitionWrapper>
      </TransitionProvider>
    </Router>
  );
}

export default App;
