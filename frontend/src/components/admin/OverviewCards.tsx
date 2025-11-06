import React from 'react';

interface SystemHealth {
  buses: number;
  routes: number;
  drivers: number;
  recentLocations: number;
}

const OverviewCards: React.FC<{ systemHealth: SystemHealth | null }> = ({ systemHealth }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-600 truncate">Total Buses</dt>
                <dd className="text-2xl font-bold text-slate-900">{systemHealth?.buses || 0}</dd>
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
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-600 truncate">Total Routes</dt>
                <dd className="text-2xl font-bold text-slate-900">{systemHealth?.routes || 0}</dd>
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
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-600 truncate">Total Drivers</dt>
                <dd className="text-2xl font-bold text-slate-900">{systemHealth?.drivers || 0}</dd>
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
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-600 truncate">Recent Locations</dt>
                <dd className="text-2xl font-bold text-slate-900">{systemHealth?.recentLocations || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCards;


