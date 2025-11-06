import React from 'react';
import StudentMap from '../StudentMap';

interface DriverMapSectionProps {
  isAuthenticated: boolean;
  busAssignment: any | null;
  tracking: { accuracy?: number | null; isTracking: boolean };
  studentMapConfig: any;
}

const DriverMapSection: React.FC<DriverMapSectionProps> = ({
  isAuthenticated,
  busAssignment,
  tracking,
  studentMapConfig,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6 order-2 xl:order-1">
      {tracking.accuracy && tracking.accuracy > 1000 && tracking.isTracking && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-red-900 mb-2">Location Accuracy Warning</h4>
              <p className="text-sm text-red-800 mb-2">
                Your current location accuracy is <strong>±{(tracking.accuracy / 1000).toFixed(1)}km</strong>, which indicates IP-based positioning.
              </p>
              <div className="text-xs text-red-800 space-y-1">
                <p><strong>Why this happens:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Desktop browsers don't have GPS hardware</li>
                  <li>Browser uses your IP address to estimate location (city/region level)</li>
                  <li>This is not your exact physical location</li>
                </ul>
                <p className="mt-2"><strong>Solution:</strong> Use a mobile device with GPS for accurate tracking (±10-50m accuracy)</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px]">
        {isAuthenticated && busAssignment ? (
          <StudentMap config={studentMapConfig} />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
            <div className="text-center">
              <div className="text-slate-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">Map will load after authentication</p>
              <p className="text-slate-600 text-sm">Please complete login to view real-time bus tracking</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverMapSection;


