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
            {/* Main Routes */}
            <Route path="/" element={<PremiumHomepage />} />
            
            {/* Driver Routes */}
            <Route path="/driver" element={<DriverInterface />} />
            <Route path="/driver-login" element={<DriverLogin />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            
            {/* Student Routes */}
            <Route path="/student" element={<EnhancedStudentMap />} />
            <Route path="/student-map" element={<EnhancedStudentMap />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminPanel />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </GlobalTransitionWrapper>
      </TransitionProvider>
    </Router>
  );
}

export default App;
