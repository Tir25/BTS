import { lazy, Suspense } from 'react';

// Lazy load the unified admin management component
const UnifiedAdminManagement = lazy(() => import('../UnifiedAdminManagement'));

const UnifiedAdminManagementLazy = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="text-white text-lg">
              Loading Admin Management Interface...
            </p>
          </div>
        </div>
      }
    >
      <UnifiedAdminManagement />
    </Suspense>
  );
};

export default UnifiedAdminManagementLazy;
