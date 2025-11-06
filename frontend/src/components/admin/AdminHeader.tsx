import React from 'react';

interface AdminHeaderProps {
  currentUser: any;
  loading: boolean;
  signingOut: boolean;
  signOutError: string | null;
  onRefresh: () => void;
  onSignOut: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentUser,
  loading,
  signingOut,
  signOutError,
  onRefresh,
  onSignOut,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-slate-900">🚍 Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-slate-600 sm:mr-2">
                Welcome,{' '}
                <span className="font-medium text-slate-900">
                  {currentUser?.first_name || currentUser?.full_name || currentUser?.email}
                </span>
              </span>
              <button
                onClick={onRefresh}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50 min-h-[44px] shadow-sm"
                disabled={loading || signingOut}
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <button
                onClick={onSignOut}
                disabled={signingOut}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium min-h-[44px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={signingOut ? 'Signing out...' : 'Sign out of admin panel'}
              >
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
            {signOutError && (
              <div className="w-full sm:w-auto">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 animate-pulse">
                  <span className="font-medium">⚠️</span> {signOutError}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;


