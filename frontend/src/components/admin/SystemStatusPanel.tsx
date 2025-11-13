/**
 * SystemStatusPanel Component
 * Displays system status and quick stats
 * Extracted from AdminDashboard for better separation of concerns
 */

import React from 'react';

interface AnalyticsData {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  activeRoutes: number;
  totalDrivers: number;
  activeDrivers: number;
  averageDelay: number;
}

interface SystemHealth {
  buses: number;
  routes: number;
  drivers: number;
  recentLocations: number;
  timestamp: string;
}

interface SystemStatusPanelProps {
  analytics: AnalyticsData;
  systemHealth: SystemHealth | null;
}

/**
 * SystemStatusPanel - Displays quick system status cards
 */
export default function SystemStatusPanel({ analytics, systemHealth }: SystemStatusPanelProps) {
  return (
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
  );
}

