import { useState, useEffect, memo } from 'react';
import { adminApiService } from '../services/adminApiService';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import UnifiedAdminManagementLazy from './lazy/UnifiedAdminManagementLazy';

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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'management'
  >('overview');

  useEffect(() => {
    loadDashboardData();
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
    try {
      await authService.signOut();
      window.location.href = '/';
    } catch (error) {
      logger.error('Sign out error', 'admin-dashboard', { error: String(error) });
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
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-slate-900">
                  🚍 Admin Dashboard
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-slate-600 sm:mr-2">
                Welcome,{' '}
                <span className="font-medium text-slate-900">
                  {currentUser?.first_name ||
                    currentUser?.full_name ||
                    currentUser?.email}
                </span>
              </span>
              <button
                onClick={() => loadDashboardData()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50 min-h-[44px] shadow-sm"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <button onClick={handleSignOut} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* System Health Cards */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-600 truncate">
                          Total Buses
                        </dt>
                        <dd className="text-2xl font-bold text-slate-900">
                          {systemHealth?.buses || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-600 truncate">
                          Total Routes
                        </dt>
                        <dd className="text-2xl font-bold text-slate-900">
                          {systemHealth?.routes || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-yellow-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-600 truncate">
                          Total Drivers
                        </dt>
                        <dd className="text-2xl font-bold text-slate-900">
                          {systemHealth?.drivers || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-600 truncate">
                          Recent Locations
                        </dt>
                        <dd className="text-2xl font-bold text-slate-900">
                          {systemHealth?.recentLocations || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {analytics && (
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      System Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Active Buses
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {analytics.activeBuses}/{analytics.totalBuses}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Active Routes
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {analytics.activeRoutes}/{analytics.totalRoutes}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Active Drivers
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {analytics.activeDrivers}/{analytics.totalDrivers}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Performance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          Average Delay
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {analytics.averageDelay.toFixed(1)} min
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">
                          System Health
                        </span>
                        <span className="text-sm font-semibold text-green-700">
                          Good
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Last Updated
                    </h3>
                    <div className="text-sm text-slate-600">
                      {systemHealth?.timestamp
                        ? new Date(systemHealth.timestamp).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* System Statistics */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  System Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-blue-900 font-medium">
                      Active Buses
                    </span>
                    <span className="text-2xl font-bold text-blue-700">
                      {analytics.activeBuses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <span className="text-green-900 font-medium">
                      Active Routes
                    </span>
                    <span className="text-2xl font-bold text-green-700">
                      {analytics.activeRoutes}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <span className="text-yellow-900 font-medium">
                      Active Drivers
                    </span>
                    <span className="text-2xl font-bold text-yellow-700">
                      {analytics.activeDrivers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="text-purple-900 font-medium">
                      Average Delay
                    </span>
                    <span className="text-2xl font-bold text-purple-700">
                      {analytics.averageDelay.toFixed(1)} min
                    </span>
                  </div>
                </div>
              </div>

              {/* System Distribution */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  System Distribution
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Active Buses
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-100 rounded-full h-2 mr-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(analytics.activeBuses / analytics.totalBuses) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-900 font-semibold">
                        {analytics.activeBuses}/{analytics.totalBuses}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Active Routes
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-100 rounded-full h-2 mr-3">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(analytics.activeRoutes / analytics.totalRoutes) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-900 font-semibold">
                        {analytics.activeRoutes}/{analytics.totalRoutes}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Active Drivers
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-slate-100 rounded-full h-2 mr-3">
                        <div
                          className="bg-yellow-600 h-2 rounded-full"
                          style={{
                            width: `${(analytics.activeDrivers / analytics.totalDrivers) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-900 font-semibold">
                        {analytics.activeDrivers}/{analytics.totalDrivers}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Management Tab - Unified management interface */}
        {activeTab === 'management' && <UnifiedAdminManagementLazy />}
      </main>
    </div>
  );
});

export default AdminDashboard;
