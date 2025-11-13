/**
 * AnalyticsPanel Component
 * Displays system analytics and statistics
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
  busUsageStats: {
    date: string;
    activeBuses: number;
    totalTrips: number;
  }[];
}

interface AnalyticsPanelProps {
  analytics: AnalyticsData;
}

/**
 * AnalyticsPanel - Displays analytics data in a grid layout
 */
export default function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  return (
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
  );
}

