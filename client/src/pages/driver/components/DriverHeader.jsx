/**
 * DriverHeader Component
 * Header with logo, offline badge, and logout button
 * Single responsibility: Display driver app header
 */
import { Button } from '@/components/ui';

export function DriverHeader({ isOffline, onLogout }) {
    return (
        <header className="driver-header">
            <div className="header-left">
                <span className="logo-icon">🚌</span>
                <h1>UniTrack Driver</h1>
            </div>
            <div className="header-right">
                {isOffline && <span className="offline-badge">Offline</span>}
                <Button variant="ghost" size="sm" onClick={onLogout}>
                    Logout
                </Button>
            </div>
        </header>
    );
}

export default DriverHeader;
