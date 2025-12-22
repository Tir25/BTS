/**
 * MapControls Component
 * Glassmorphism control bar for map zoom/recenter
 * Single responsibility: Map navigation controls
 */
import './MapControls.css';

/**
 * @param {Object} props
 * @param {Function} props.onZoomIn - Zoom in handler
 * @param {Function} props.onZoomOut - Zoom out handler
 * @param {Function} props.onRecenter - Recenter handler
 * @param {boolean} props.showRecenter - Show recenter button
 */
export function MapControls({ onZoomIn, onZoomOut, onRecenter, showRecenter = false }) {
    return (
        <div className="map-controls">
            <button
                className="control-btn"
                onClick={onZoomIn}
                aria-label="Zoom in"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <button
                className="control-btn"
                onClick={onZoomOut}
                aria-label="Zoom out"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {showRecenter && (
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

export default MapControls;
