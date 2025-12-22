/**
 * BusListPanel Component
 * Displays list of active buses with ETA information
 * Single responsibility: Bus list sidebar/panel UI
 */
import { Card, CardBody } from '@/components/ui';
import { formatSpeed, calculateETA, formatTimeAgo } from '../utils/tracking';
import './BusListPanel.css';

/**
 * @param {Object} props
 * @param {Array} props.buses - Active buses to display
 * @param {Function} props.getRouteById - Function to get route info
 * @param {Function} props.onBusSelect - Handler for bus selection
 * @param {Function} props.toggleFavorite - Toggle route as favorite
 * @param {Function} props.isFavorite - Check if route is favorite
 */
export function BusListPanel({
    buses = [],
    getRouteById,
    onBusSelect,
    toggleFavorite,
    isFavorite
}) {
    if (buses.length === 0) {
        return null;
    }

    return (
        <Card className="bus-list-panel">
            <CardBody>
                <h3 className="panel-title">
                    🚌 Active Buses
                    <span className="count">{buses.length}</span>
                </h3>
                <div className="bus-list">
                    {buses.map(bus => {
                        const route = getRouteById?.(bus.routeId);
                        const firstStop = route?.stops?.[0];
                        const eta = firstStop
                            ? calculateETA(bus, firstStop.lat, firstStop.lng)
                            : null;

                        return (
                            <div
                                key={bus.id}
                                className="bus-item"
                                onClick={() => onBusSelect?.(bus)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="bus-info">
                                    <span className="bus-icon">🚌</span>
                                    <div className="bus-details">
                                        <div className="bus-route">
                                            {bus.routeName || 'Unknown Route'}
                                        </div>
                                        <div className="bus-meta">
                                            {formatSpeed(bus.speed)} • {formatTimeAgo(bus.lastUpdated)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bus-actions">
                                    {eta && (
                                        <div className="bus-eta">
                                            <span className="eta-label">ETA</span>
                                            <span className="eta-value">{eta}</span>
                                        </div>
                                    )}
                                    {bus.routeId && (
                                        <button
                                            className={`favorite-btn ${isFavorite?.(bus.routeId) ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite?.(bus.routeId);
                                            }}
                                            aria-label={isFavorite?.(bus.routeId) ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                            {isFavorite?.(bus.routeId) ? '⭐' : '☆'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardBody>
        </Card>
    );
}

export default BusListPanel;
