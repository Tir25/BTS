import { useState } from 'react';
import BusManagementPanel from './BusManagementPanel';
import DriverManagementPanel from './DriverManagementPanel';
import RouteManagementPanel from './RouteManagementPanel';
import ProductionAssignmentPanel from './ProductionAssignmentPanel';

type ManagementTab = 'buses' | 'drivers' | 'routes' | 'assignments';

export default function UnifiedAdminManagement() {
  const [activeTab, setActiveTab] = useState<ManagementTab>('buses');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Management Dashboard</h2>
        <p className="text-white/70">Manage buses, drivers, and routes</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-white/20">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'buses', label: 'Buses' },
              { id: 'drivers', label: 'Drivers' },
              { id: 'routes', label: 'Routes' },
              { id: 'assignments', label: 'Assignments' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagementTab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
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
      </div>
    </div>
  );
}
