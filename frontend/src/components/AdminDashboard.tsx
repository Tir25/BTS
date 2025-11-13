import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiService } from '../api';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import UnifiedAdminManagementLazy from './lazy/UnifiedAdminManagementLazy';
import AdminHeader from './admin/AdminHeader';
import OverviewCards from './admin/OverviewCards';
import AnalyticsPanel from './admin/AnalyticsPanel';
import SystemStatusPanel from './admin/SystemStatusPanel';

interface AnalyticsData {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  activeRoutes: number;
  totalDrivers: number;
  activeDrivers: number;
  averageDelay: number;
  busUsageStats: {
    date: string;
    activeBuses: number;
    totalTrips: number;
  }[];
}

interface SystemHealth {
  buses: number;
  routes: number;
  drivers: number;
  recentLocations: number;
  timestamp: string;
}

const AdminDashboard = memo(function AdminDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'management'
  >('overview');

  useEffect(() => {
    loadDashboardData();
    
    // Listen for refresh events from management panels
    const handleRefresh = () => {
      loadDashboardData();
    };
    
    window.addEventListener('refreshDashboard', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshDashboard', handleRefresh);
    };
  }, []);

  const loadDashboardData = async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      // Load data sequentially to avoid rate limiting issues
      let analyticsResult = null;
      let healthResult = null;

      // First try to load analytics
      try {
        analyticsResult = await adminApiService.getAnalytics();
        if (analyticsResult.success && analyticsResult.data) {
          setAnalytics(analyticsResult.data);
        }
      } catch (err) {
        logger.warn('Warning', 'component', { data: 'Analytics loading failed:', err });
      }

      // Wait a bit before loading health data to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then try to load health data
      try {
        healthResult = await adminApiService.getSystemHealth();
        if (healthResult.success && healthResult.data) {
          setSystemHealth(healthResult.data);
        }
      } catch (err) {
        logger.warn('Warning', 'component', { data: 'Health data loading failed:', err });
      }

      // Check if we have at least some data
      if (!analyticsResult?.success && !healthResult?.success) {
        if (retryCount < 2) {
          // Retry after a delay
          setTimeout(() => loadDashboardData(retryCount + 1), 2000);
          return;
        }
        setError('Failed to load dashboard data. Please try again.');
      } else {
        // Clear any previous errors if we got some data
        setError(null);
      }
    } catch (err) {
      logger.error('Error occurred', 'component', { error: 'Dashboard data loading error:', err });
      if (retryCount < 2) {
        // Retry after a delay
        setTimeout(() => loadDashboardData(retryCount + 1), 2000);
        return;
      }
      setError('An error occurred while loading dashboard data');
      logger.error('Dashboard data loading error', 'admin-dashboard', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    // Prevent multiple simultaneous sign out attempts
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setSignOutError(null);

    try {
      logger.info('🔐 Starting sign out process...', 'admin-dashboard');
      
      // Call sign out service
      const result = await authService.signOut();
      
      // Helper function to ensure navigation happens reliably
      const performNavigation = () => {
        try {
          // Try React Router navigation first (non-blocking)
          navigate('/admin-login', { replace: true });
        } catch (navError) {
          logger.error('❌ React Router navigation error', 'admin-dashboard', { error: String(navError) });
        }
        
        // Always use window.location as a reliable fallback after a short delay
        // This ensures navigation happens even if React Router is blocked
        setTimeout(() => {
          // Use replace instead of href to prevent back button issues
          window.location.replace('/admin-login');
        }, 300);
      };
      
      if (result.success) {
        logger.info('✅ Sign out successful, redirecting to admin login', 'admin-dashboard');
        
        // Clear any auth-related state
        setSignOutError(null);
        
        // Perform navigation with reliable fallback
        performNavigation();
      } else {
        // Sign out returned an error
        const errorMessage = result.error || 'Sign out failed. Please try again.';
        logger.error('❌ Sign out failed', 'admin-dashboard', { error: errorMessage });
        setSignOutError(errorMessage);
        
        // Still attempt to redirect after a delay, but show error
        setTimeout(() => {
          try {
            navigate('/admin-login', { replace: true });
          } catch {
            window.location.replace('/admin-login');
          }
        }, 1500);
      }
    } catch (error) {
      // Unexpected error during sign out
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred during sign out.';
      
      logger.error('❌ Sign out error', 'admin-dashboard', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      setSignOutError('Sign out encountered an error. Redirecting to login...');
      
      // Even on error, attempt to redirect to login page
      // This ensures user can still access the app even if sign out fails
      setTimeout(() => {
        try {
          navigate('/admin-login', { replace: true });
        } catch {
          window.location.replace('/admin-login');
        }
      }, 1500);
    } finally {
      // Reset signing out state after navigation completes
      // Give enough time for navigation to happen
      setTimeout(() => {
        setSigningOut(false);
      }, 2000);
    }
  };

  const currentUser = authService.getCurrentProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Error Loading Dashboard
            </h3>
            <p className="text-red-800 mb-6">{error}</p>
            <button
              onClick={() => loadDashboardData()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <AdminHeader
        currentUser={currentUser}
        loading={loading}
        signingOut={signingOut}
        signOutError={signOutError}
        onRefresh={() => loadDashboardData()}
        onSignOut={handleSignOut}
      />

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'management'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Management
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="px-4 py-6 sm:px-0">
            <OverviewCards systemHealth={systemHealth} />

            {/* Quick Stats */}
            {analytics && (
              <SystemStatusPanel analytics={analytics} systemHealth={systemHealth} />
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <AnalyticsPanel analytics={analytics} />
        )}

        {/* Management Tab - Unified management interface */}
        {activeTab === 'management' && <UnifiedAdminManagementLazy />}
      </main>
    </div>
  );
});

export default AdminDashboard;
