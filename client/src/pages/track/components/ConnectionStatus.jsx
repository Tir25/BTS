/**
 * ConnectionStatus Component
 * Visual indicator for Firebase connection state
 * Single responsibility: Display connection status
 */
import './ConnectionStatus.css';

/**
 * @param {Object} props
 * @param {boolean} props.isConnected - Firebase connection status
 * @param {number} props.busCount - Number of active buses
 */
export function ConnectionStatus({ isConnected = true, busCount = 0 }) {
    return (
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-indicator" />
            {isConnected ? (
                <span className="status-text">
                    {busCount} Active Bus{busCount !== 1 ? 'es' : ''}
                </span>
            ) : (
                <span className="status-text">Reconnecting...</span>
            )}
        </div>
    );
}

export default ConnectionStatus;
