import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, LogoIcon } from '@/components/ui';
import {
    LayoutDashboard,
    TrendingUp,
    User,
    Bus,
    Map,
    MapPin,
    Clock,
    Calendar,
    Users,
    LogOut
} from 'lucide-react';
import './AdminDashboard.css';

// Admin sub-pages
import DashboardHome from './DashboardHome';
import DriversPage from './DriversPage';
import BusesPage from './BusesPage';
import RoutesPage from './RoutesPage';
import DestinationsPage from './DestinationsPage';
import ShiftsPage from './ShiftsPage';
import SchedulesPage from './SchedulesPage';
import UsersPage from './UsersPage';
import AnalyticsPage from './AnalyticsPage';

/**
 * NavItem Component
 * Sidebar navigation link with active state highlighting
 */
function NavItem({ to, icon: Icon, label, end = false }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={end}
        >
            <span className="nav-icon"><Icon size={20} /></span>
            <span className="nav-label">{label}</span>
        </NavLink>
    );
}

/**
 * Admin Dashboard Layout with sidebar navigation
 * Single responsibility: Layout structure and routing
 */
export function AdminDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <LogoIcon size="md" />
                    <span className="logo-text">UniTrack</span>
                </div>

                <nav className="sidebar-nav">
                    <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" end />
                    <NavItem to="/admin/analytics" icon={TrendingUp} label="Analytics" />
                    <NavItem to="/admin/drivers" icon={User} label="Drivers" />
                    <NavItem to="/admin/buses" icon={Bus} label="Buses" />
                    <NavItem to="/admin/routes" icon={Map} label="Routes" />
                    <NavItem to="/admin/destinations" icon={MapPin} label="Stops" />
                    <NavItem to="/admin/shifts" icon={Clock} label="Shifts" />
                    <NavItem to="/admin/schedules" icon={Calendar} label="Schedules" />
                    <NavItem to="/admin/users" icon={Users} label="Users" />
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <span className="user-avatar"><User size={18} /></span>
                        <span className="user-name">{user?.name || 'Admin'}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                        <LogOut size={16} /> Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-content">
                <Routes>
                    <Route index element={<DashboardHome />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="drivers/*" element={<DriversPage />} />
                    <Route path="buses/*" element={<BusesPage />} />
                    <Route path="routes/*" element={<RoutesPage />} />
                    <Route path="destinations/*" element={<DestinationsPage />} />
                    <Route path="shifts/*" element={<ShiftsPage />} />
                    <Route path="schedules/*" element={<SchedulesPage />} />
                    <Route path="users/*" element={<UsersPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default AdminDashboard;

