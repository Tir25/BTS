import { useState, useEffect } from 'react';
import { adminApiService } from '../services/adminApiService';
import { authService } from '../services/authService';
import MediaManagement from './MediaManagement';
import StreamlinedManagement from './StreamlinedManagement';

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

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'management' | 'media'
  >('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsResult, healthResult] = await Promise.all([
        adminApiService.getAnalytics(),
        adminApiService.getSystemHealth(),
      ]);

      if (analyticsResult.success && analyticsResult.data) {
        setAnalytics(analyticsResult.data);
      }

      if (healthResult.success && healthResult.data) {
        setSystemHealth(healthResult.data);
      }

      if (!analyticsResult.success || !healthResult.success) {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('An error occurred while loading dashboard data');
      console.error('❌ Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const currentUser = authService.getCurrentProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-white/70">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="card-glass p-8">
            <h3 className="text-lg font-medium text-red-300 mb-2">
              Error Loading Dashboard
            </h3>
            <p className="text-red-200 mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="btn-primary bg-red-600 hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">
                  🚍 Admin Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/80">
                Welcome,{' '}
                {currentUser?.first_name ||
                  currentUser?.full_name ||
                  currentUser?.email}
              </span>
              <button
                onClick={loadDashboardData}
                className="btn-primary text-sm"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <button
                onClick={handleSignOut}
                className="btn-secondary text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-white/20">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'overview'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/40'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'analytics'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/40'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'management'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/40'
              }`}
            >
              Management
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'media'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/40'
              }`}
            >
              Media
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
              <div className="card-glass overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/70 truncate">
                          Total Buses
                        </dt>
                        <dd className="text-lg font-medium text-white">
                          {systemHealth?.buses || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-glass overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
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
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/70 truncate">
                          Total Routes
                        </dt>
                        <dd className="text-lg font-medium text-white">
                          {systemHealth?.routes || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-glass overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/70 truncate">
                          Total Drivers
                        </dt>
                        <dd className="text-lg font-medium text-white">
                          {systemHealth?.drivers || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-glass overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
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
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-white/70 truncate">
                          Recent Locations
                        </dt>
                        <dd className="text-lg font-medium text-white">
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
                <div className="card-glass overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-white mb-4">
                      System Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/70">
                          Active Buses
                        </span>
                        <span className="text-sm font-medium text-white">
                          {analytics.activeBuses}/{analytics.totalBuses}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/70">
                          Active Routes
                        </span>
                        <span className="text-sm font-medium text-white">
                          {analytics.activeRoutes}/{analytics.totalRoutes}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/70">
                          Active Drivers
                        </span>
                        <span className="text-sm font-medium text-white">
                          {analytics.activeDrivers}/{analytics.totalDrivers}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-glass overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-white mb-4">
                      Performance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-white/70">
                          Average Delay
                        </span>
                        <span className="text-sm font-medium text-white">
                          {analytics.averageDelay.toFixed(1)} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-white/70">
                          System Health
                        </span>
                        <span className="text-sm font-medium text-green-400">
                          Good
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-glass overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-white mb-4">
                      Last Updated
                    </h3>
                    <div className="text-sm text-white/70">
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
              <div className="card-glass p-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  System Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                    <span className="text-blue-300 font-medium">
                      Active Buses
                    </span>
                    <span className="text-2xl font-bold text-blue-200">
                      {analytics.activeBuses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-500/20 rounded-lg border border-green-400/30">
                    <span className="text-green-300 font-medium">
                      Active Routes
                    </span>
                    <span className="text-2xl font-bold text-green-200">
                      {analytics.activeRoutes}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                    <span className="text-yellow-300 font-medium">
                      Active Drivers
                    </span>
                    <span className="text-2xl font-bold text-yellow-200">
                      {analytics.activeDrivers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-500/20 rounded-lg border border-purple-400/30">
                    <span className="text-purple-300 font-medium">
                      Average Delay
                    </span>
                    <span className="text-2xl font-bold text-purple-200">
                      {analytics.averageDelay.toFixed(1)} min
                    </span>
                  </div>
                </div>
              </div>

              {/* System Distribution */}
              <div className="card-glass p-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  System Distribution
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">
                      Active Buses
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-white/20 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{
                            width: `${(analytics.activeBuses / analytics.totalBuses) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-white/70">
                        {analytics.activeBuses}/{analytics.totalBuses}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">
                      Active Routes
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-white/20 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-400 h-2 rounded-full"
                          style={{
                            width: `${(analytics.activeRoutes / analytics.totalRoutes) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-white/70">
                        {analytics.activeRoutes}/{analytics.totalRoutes}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">
                      Active Drivers
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-white/20 rounded-full h-2 mr-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{
                            width: `${(analytics.activeDrivers / analytics.totalDrivers) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-white/70">
                        {analytics.activeDrivers}/{analytics.totalDrivers}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Management Tab - All bus, driver, and route management */}
        {activeTab === 'management' && <StreamlinedManagement />}

        {/* Media Management Tab */}
        {activeTab === 'media' && <MediaManagement />}
      </main>
    </div>
  );
}
