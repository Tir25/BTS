import { useState } from 'react';
import BusManagementPanel from './BusManagementPanel';
import DriverManagementPanel from './DriverManagementPanel';
import RouteManagementPanel from './RouteManagementPanel';
import ProductionAssignmentPanel from './ProductionAssignmentPanel';
import ShiftsManager from './admin/ShiftsManager';

type ManagementTab = 'buses' | 'drivers' | 'routes' | 'assignments' | 'shifts';

export default function UnifiedAdminManagement() {
  const [activeTab, setActiveTab] = useState<ManagementTab>('buses');

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Management Dashboard</h2>
        <p className="text-slate-600">Manage buses, drivers, and routes</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto">
            {[
              { id: 'buses', label: 'Buses' },
              { id: 'drivers', label: 'Drivers' },
              { id: 'routes', label: 'Routes' },
              { id: 'assignments', label: 'Assignments' },
              { id: 'shifts', label: 'Shifts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagementTab)}
                className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'buses' && <BusManagementPanel />}
        {activeTab === 'drivers' && <DriverManagementPanel />}
        {activeTab === 'routes' && <RouteManagementPanel />}
        {activeTab === 'assignments' && <ProductionAssignmentPanel />}
        {activeTab === 'shifts' && <ShiftsManager />}
      </div>
    </div>
  );
}
