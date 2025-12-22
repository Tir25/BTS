/**
 * BusMap Component
 * Interactive map displaying live bus locations
 * Single responsibility: Map rendering with bus markers
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { fixLeafletDefaultIcon, createBusIcon, createStaleBusIcon } from '@/utils/leafletIcons';
import { formatSpeed, DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/tracking';
import { useUserLocation } from '../hooks/useUserLocation';
import { isStale } from '../hooks/useTimeAgo';
import { MapControls } from './MapControls';
import { TimeAgo } from './TimeAgo';
import { UserLocationMarker } from './UserLocationMarker';
import 'leaflet/dist/leaflet.css';
import './BusMap.css';

// Fix Leaflet icons on import
fixLeafletDefaultIcon();

/**
 * MapController - Handles map interactions and exposes controls
 */
function MapController({ onControlsReady, buses }) {
    const map = useMap();
    const [showRecenter, setShowRecenter] = useState(false);
    const lastCenterRef = useRef(null);

    // Expose controls to parent
    useEffect(() => {
        onControlsReady({
            zoomIn: () => map.zoomIn(),
            zoomOut: () => map.zoomOut(),
            recenter: () => {
                if (buses.length > 0) {
                    const firstBus = buses[0];
                    map.setView([firstBus.lat, firstBus.lng], 15, { animate: true });
                    setShowRecenter(false);
                }
            }
        });
    }, [map, buses, onControlsReady]);

    // Track user pan to show recenter button
    useEffect(() => {
        const handleMoveEnd = () => {
            if (buses.length === 0) return;

            const center = map.getCenter();
            const firstBus = buses[0];
            const distance = map.distance(center, [firstBus.lat, firstBus.lng]);
            setShowRecenter(distance > 500);
        };

        map.on('moveend', handleMoveEnd);
        return () => map.off('moveend', handleMoveEnd);
    }, [map, buses]);

    // Initial centering on first bus
    useEffect(() => {
        if (buses.length > 0 && !lastCenterRef.current) {
            const firstBus = buses[0];
            map.setView([firstBus.lat, firstBus.lng], 14);
            lastCenterRef.current = [firstBus.lat, firstBus.lng];
        }
    }, [buses, map]);

    return null;
}

/**
 * @param {Object} props
 * @param {Array} props.buses - Active buses to display
 * @param {Object} props.selectedRoute - Selected route object
 * @param {Function} props.onBusClick - Bus marker click handler
 * @param {Function} props.toggleFavorite - Toggle favorite handler
 * @param {Function} props.isFavorite - Check if route is favorite
 */
export function BusMap({
    buses = [],
    selectedRoute = null,
    onBusClick,
    toggleFavorite,
    isFavorite
}) {
    const [mapControls, setMapControls] = useState({});
    const [busIcons, setBusIcons] = useState({});

    // Get user's location (disabled for now to avoid confusion with bus marker)
    // const { location: userLocation } = useUserLocation({ enabled: true });
    const userLocation = null; // Disabled - uncomment above to enable

    // Create/update bus icons when headings or stale status changes
    useEffect(() => {
        const icons = {};
        buses.forEach(bus => {
            const stale = isStale(bus.lastUpdated, 30000);
            icons[bus.id] = stale
                ? createStaleBusIcon({ heading: bus.heading || 0 })
                : createBusIcon({ heading: bus.heading || 0 });
        });
        setBusIcons(icons);
    }, [buses]);

    const handleControlsReady = useCallback((controls) => {
        setMapControls(controls);
    }, []);

    // Route polyline
    const routePath = selectedRoute?.polyline ||
        (selectedRoute?.stops?.length > 1
            ? selectedRoute.stops.map(s => [s.lat, s.lng])
            : null);

    return (
        <div className="bus-map-container">
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                className="bus-map"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                />

                <MapController
                    onControlsReady={handleControlsReady}
                    buses={buses}
                />

                {/* User location marker */}
                <UserLocationMarker location={userLocation} />

                {/* Route polyline */}
                {routePath && (
                    <Polyline
                        positions={routePath}
                        color="#4361ee"
                        weight={4}
                        opacity={0.7}
                    />
                )}

                {/* Bus markers */}
                {buses.map(bus => (
                    <Marker
                        key={bus.id}
                        position={[bus.lat, bus.lng]}
                        icon={busIcons[bus.id] || createBusIcon()}
                        eventHandlers={{
                            click: () => onBusClick?.(bus)
                        }}
                    >
                        <Popup>
                            <div className="bus-popup">
                                <strong>{bus.routeName || 'Active Bus'}</strong>
                                <p>{formatSpeed(bus.speed)}</p>
                                <p>Updated: <TimeAgo timestamp={bus.lastUpdated} /></p>
                                {bus.routeId && (
                                    <button
                                        className="popup-favorite-btn"
                                        onClick={() => toggleFavorite?.(bus.routeId)}
                                    >
                                        {isFavorite?.(bus.routeId)
                                            ? '⭐ Remove Favorite'
                                            : '☆ Add to Favorites'}
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Map Controls */}
            <MapControls
                onZoomIn={mapControls.zoomIn}
                onZoomOut={mapControls.zoomOut}
                onRecenter={mapControls.recenter}
                showRecenter={buses.length > 0}
            />
        </div>
    );
}

export default BusMap;
