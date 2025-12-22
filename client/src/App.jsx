import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth';
import { ConfirmProvider, ToastProvider } from '@/components/ui';

// Lazy loaded pages for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const DriverView = lazy(() => import('@/pages/driver/DriverView'));
const TrackingPage = lazy(() => import('@/pages/track'));

// Loading fallback
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚌</div>
      <div>Loading...</div>
    </div>
  </div>
);

// Styles
import '@/styles/index.css';

/**
 * Main App Component
 * Sets up routing, authentication, and global providers with code splitting
 */
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Admin Routes */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Driver Routes */}
                <Route
                  path="/driver/*"
                  element={
                    <ProtectedRoute allowedRoles={['driver']}>
                      <DriverView />
                    </ProtectedRoute>
                  }
                />

                {/* Student/Faculty Routes */}
                <Route
                  path="/track/*"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'faculty']}>
                      <TrackingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
