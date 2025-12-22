/**
 * MapControlBar Component
 * Glassmorphism-styled control bar with map controls
 */
import { useMap } from 'react-leaflet';
import './MapControlBar.css';

// Inner component that has access to map
function MapControls({ onRecenter, canRecenter }) {
    const map = useMap();

    const handleZoomIn = () => {
        map.zoomIn();
    };

    const handleZoomOut = () => {
        map.zoomOut();
    };

    return (
        <>
            <button
                className="control-btn zoom-in"
                onClick={handleZoomIn}
                aria-label="Zoom in"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <button
                className="control-btn zoom-out"
                onClick={handleZoomOut}
                aria-label="Zoom out"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {canRecenter && (
                <button
                    className="control-btn recenter"
                    onClick={onRecenter}
                    aria-label="Recenter map"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    </svg>
                </button>
            )}
        </>
    );
}

export function MapControlBar({
    isOnDuty,
    isLoading,
    onToggleDuty,
    onRecenter,
    canRecenter = false
}) {
    return (
        <div className="map-control-bar">
            {/* Power/Tracking Button */}
            <button
                className={`control-btn power ${isOnDuty ? 'online' : 'offline'}`}
                onClick={onToggleDuty}
                disabled={isLoading}
                aria-label={isOnDuty ? 'Go offline' : 'Go online'}
            >
                {isLoading ? (
                    <div className="control-spinner" />
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v10" />
                        <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
                    </svg>
                )}
            </button>

            <div className="control-divider" />

            {/* Zoom & Recenter - will use map context */}
            <MapControls onRecenter={onRecenter} canRecenter={canRecenter} />
        </div>
    );
}

// Standalone version for use outside MapContainer
export function MapControlBarStandalone({
    isOnDuty,
    isLoading,
    onToggleDuty,
    onRecenter,
    onZoomIn,
    onZoomOut,
    canRecenter = false
}) {
    return (
        <div className="map-control-bar">
            {/* Power/Tracking Button */}
            <button
                className={`control-btn power ${isOnDuty ? 'online' : 'offline'}`}
                onClick={onToggleDuty}
                disabled={isLoading}
                aria-label={isOnDuty ? 'Go offline' : 'Go online'}
            >
                {isLoading ? (
                    <div className="control-spinner" />
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v10" />
                        <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
                    </svg>
                )}
            </button>

            <div className="control-divider" />

            <button
                className="control-btn zoom-in"
                onClick={onZoomIn}
                aria-label="Zoom in"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <button
                className="control-btn zoom-out"
                onClick={onZoomOut}
                aria-label="Zoom out"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {canRecenter && (
                <button
                    className="control-btn recenter"
                    onClick={onRecenter}
                    aria-label="Recenter map"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default MapControlBar;
