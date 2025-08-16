import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { apiService } from './services/api';
import { authService } from './services/authService';
import { HealthResponse, User } from './types';
import DriverInterface from './components/DriverInterface';
import StudentMap from './components/StudentMap';
import AdminPanel from './components/AdminPanel';

function App() {
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

  const HomePage = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🚍 University Bus Tracking System
          </h1>

          <div className="space-y-4">
            {loading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">
                  Checking backend connection...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
                    <h3 className="text-sm font-medium text-red-800">
                      Connection Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {health && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
                    <h3 className="text-sm font-medium text-green-800">
                      Backend Connected
                    </h3>
                    <div className="text-sm text-green-700 mt-1 space-y-1">
                      <p>
                        <strong>Status:</strong> {health.status}
                      </p>
                      <p>
                        <strong>Database:</strong>{' '}
                        {health.database?.status || 'Unknown'}
                      </p>
                      <p>
                        <strong>Environment:</strong> {health.environment}
                      </p>
                      <p>
                        <strong>Timestamp:</strong>{' '}
                        {new Date(health.timestamp).toLocaleString()}
                      </p>
                      {health.database?.details && (
                        <div className="mt-2 text-xs">
                          <p>
                            <strong>PostgreSQL:</strong>{' '}
                            {health.database.details?.postgresVersion ||
                              'Unknown'}
                          </p>
                          <p>
                            <strong>Pool Status:</strong>{' '}
                            {JSON.stringify(
                              health.database.details?.poolStatus || {}
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center text-sm text-gray-500 mt-6">
              <p>Phase 5: Admin Panel & Analytics Dashboard ✅</p>
              <p className="mt-1">
                Role-based access control, analytics charts, and system
                management
              </p>
              {authState.isAuthenticated && (
                <p className="mt-2 text-green-600">
                  ✅ Authenticated as:{' '}
                  {authState.user?.full_name || authState.user?.email}
                </p>
              )}
            </div>

            {/* Navigation Links */}
            <div className="mt-6 space-y-3">
              <Link
                to="/driver"
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              >
                🚌 Driver Interface
              </Link>

              <Link
                to="/student"
                className="block w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
              >
                👨‍🎓 Student Map (Live Tracking)
              </Link>

              <Link
                to="/admin"
                className="block w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
              >
                👨‍💼 Admin Panel (Phase 5)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 404 Not Found Component
  const NotFound = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 text-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/driver" element={<DriverInterface />} />
        <Route path="/student" element={<StudentMap />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
