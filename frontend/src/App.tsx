import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useHealthCheck } from './hooks/useApiQueries';
import { authService } from './services/authService';
import { DriverAuthProvider } from './context/DriverAuthContext';
// Enhanced lazy loading with retry logic for dynamic imports
const lazyWithRetry = (importFunction: () => Promise<any>) => {
  return React.lazy(() =>
    importFunction().catch((error) => {
      console.error('Retrying import due to error:', error);
      // Retry the import once
      return importFunction().catch((retryError) => {
        console.error('Import retry failed:', retryError);
        // If retry fails, reload the page to get fresh modules
        if (retryError.message.includes('dynamically imported module') || 
            retryError.message.includes('Failed to fetch')) {
          console.warn('Dynamic import failed, reloading page to get fresh modules...');
          setTimeout(() => window.location.reload(), 1000);
        }
        throw retryError;
      });
    })
  );
};

// Lazy load components for better performance with retry logic
const UnifiedDriverInterface = lazyWithRetry(() => import('./components/UnifiedDriverInterface'));
const DriverLogin = lazyWithRetry(() => import('./components/DriverLogin'));
const StudentLogin = lazyWithRetry(() => import('./components/StudentLogin'));
const StudentMap = lazyWithRetry(() => import('./components/StudentMap'));
const StudentMapWrapper = lazyWithRetry(() => import('./components/StudentMapWrapper'));
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'));
const AdminLogin = lazyWithRetry(() => import('./components/AdminLogin'));
const PremiumHomepage = lazyWithRetry(() => import('./components/PremiumHomepage'));
import {
  TransitionProvider,
  GlobalTransitionWrapper,
} from './components/transitions';

// Import error handling components
import { ErrorBoundary } from './components/error/ErrorBoundary';
import NotificationContainer from './components/NotificationContainer';
import { logger } from './utils/logger';

function App() {
  logger.componentMount('App');

  // Add global Vite preload error handling
  useEffect(() => {
    const handlePreloadError = (event: Event) => {
      console.warn('Vite preload error detected:', event);
      // Reload the page to get fresh modules
      setTimeout(() => {
        console.log('Reloading page due to preload error...');
        window.location.reload();
      }, 1000);
    };

    // Listen for Vite preload errors
    window.addEventListener('vite:preloadError', handlePreloadError);

    // Also listen for general module loading errors
    const handleModuleError = (event: ErrorEvent) => {
      if (event.error && (
        event.error.message.includes('dynamically imported module') ||
        event.error.message.includes('Failed to fetch') ||
        event.error.message.includes('Loading chunk')
      )) {
        console.warn('Module loading error detected:', event.error);
        setTimeout(() => {
          console.log('Reloading page due to module loading error...');
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener('error', handleModuleError);

    return () => {
      window.removeEventListener('vite:preloadError', handlePreloadError);
      window.removeEventListener('error', handleModuleError);
    };
  }, []);

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
        <TransitionProvider>
          <GlobalTransitionWrapper>
            <Routes>
              {/* Homepage Routes */}
              <Route 
                path="/" 
                element={
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                      <div className="text-center">
                        <div className="loading-spinner mx-auto mb-4" />
                        <p className="text-white text-lg">Loading Homepage...</p>
                      </div>
                    </div>
                  }>
                    <PremiumHomepage />
                  </Suspense>
                } 
              />
              <Route path="/legacy" element={<LegacyHomePage />} />

              {/* Driver Routes */}
              <Route 
                path="/driver-login" 
                element={
                  <DriverAuthProvider>
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                        <div className="text-center">
                          <div className="loading-spinner mx-auto mb-4" />
                          <p className="text-white text-lg">Loading Driver Login...</p>
                        </div>
                      </div>
                    }>
                      <DriverLogin />
                    </Suspense>
                  </DriverAuthProvider>
                } 
              />
              <Route 
                path="/driver-dashboard" 
                element={
                  <DriverAuthProvider>
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                        <div className="text-center">
                          <div className="loading-spinner mx-auto mb-4" />
                          <p className="text-white text-lg">Loading Driver Dashboard...</p>
                        </div>
                      </div>
                    }>
                      <UnifiedDriverInterface mode="dashboard" />
                    </Suspense>
                  </DriverAuthProvider>
                } 
              />
              <Route 
                path="/driver-interface" 
                element={
                  <DriverAuthProvider>
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                        <div className="text-center">
                          <div className="loading-spinner mx-auto mb-4" />
                          <p className="text-white text-lg">Loading Driver Interface...</p>
                        </div>
                      </div>
                    }>
                      <UnifiedDriverInterface mode="dashboard" />
                    </Suspense>
                  </DriverAuthProvider>
                } 
              />

              {/* Student Routes */}
              <Route
                path="/student-login"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                        <div className="text-center">
                          <div className="loading-spinner mx-auto mb-4" />
                          <p className="text-white text-lg">
                            Loading Student Login...
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <StudentLogin />
                  </Suspense>
                }
              />
              <Route
                path="/student-map"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                        <div className="text-center">
                          <div className="loading-spinner mx-auto mb-4" />
                          <p className="text-white text-lg">
                            Loading Student Map...
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <StudentMapWrapper />
                  </Suspense>
                }
              />

              {/* Admin Routes */}
              <Route 
                path="/admin-login" 
                element={
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                      <div className="text-center">
                        <div className="loading-spinner mx-auto mb-4" />
                        <p className="text-white text-lg">Loading Admin Login...</p>
                      </div>
                    </div>
                  }>
                    <AdminLogin />
                  </Suspense>
                } 
              />
              <Route 
                path="/admin-dashboard" 
                element={
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                      <div className="text-center">
                        <div className="loading-spinner mx-auto mb-4" />
                        <p className="text-white text-lg">Loading Admin Dashboard...</p>
                      </div>
                    </div>
                  }>
                    <AdminDashboard />
                  </Suspense>
                } 
              />

              {/* Fallback */}
              <Route 
                path="*" 
                element={
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                      <div className="text-center">
                        <div className="loading-spinner mx-auto mb-4" />
                        <p className="text-white text-lg">Loading...</p>
                      </div>
                    </div>
                  }>
                    <PremiumHomepage />
                  </Suspense>
                } 
              />
            </Routes>
          </GlobalTransitionWrapper>
        </TransitionProvider>
        <NotificationContainer />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
