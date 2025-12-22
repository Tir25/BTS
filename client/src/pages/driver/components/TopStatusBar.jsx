/**
 * TopStatusBar Component
 * Displays online/offline status, GPS quality, and network indicators
 */
import './TopStatusBar.css';

export function TopStatusBar({
    isOnDuty,
    isPaused,
    isOffline,
    gpsQuality,
    queueCount,
    onLogout
}) {
    return (
        <div className="top-status-bar">
            <div className="status-left">
                <div className={`online-indicator ${isOnDuty ? (isPaused ? 'paused' : 'online') : 'offline'}`}>
                    <span className="indicator-dot" />
                    <span className="indicator-text">
                        {isOnDuty ? (isPaused ? 'Break' : 'Online') : 'Offline'}
                    </span>
                </div>

                {isOnDuty && gpsQuality && (
                    <span
                        className={`gps-quality ${gpsQuality.level}`}
                        title={`${gpsQuality.accuracy.toFixed(0)}m accuracy`}
                    >
                        {gpsQuality.label}
                    </span>
                )}

                {isOffline && (
                    <span className="network-badge" title="No internet">📴</span>
                )}
            </div>

            <div className="status-right">
                {queueCount > 0 && (
                    <span className="queue-badge" title={`${queueCount} updates queued`}>
                        {queueCount}
                    </span>
                )}
                <button className="menu-btn" onClick={onLogout} aria-label="Logout">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16,17 21,12 16,7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default TopStatusBar;
