/**
 * FullScreenMap Component - Production Grade
 * 
 * Features:
 * - Uses route.polyline if available
 * - Bus icon rotates with heading
 * - Integrated MapControlBar with glassmorphism
 */
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { Check, MapPin } from 'lucide-react';
import './MapControlBar.css';

// Custom stop icon
const stopIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="#ef4444" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
        </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Current stop icon (highlighted)
const currentStopIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
        </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

// Passed stop icon (grayed out)
const passedStopIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
            <circle cx="10" cy="10" r="7" fill="#6b7280" stroke="white" stroke-width="2"/>
            <path d="M7 10l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
        </svg>
    `),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

// Create rotatable bus icon
function createBusIcon(heading = 0) {
    return new DivIcon({
        className: 'bus-marker-wrapper',
        html: `
            <div class="bus-marker-icon" style="transform: rotate(${heading}deg)">
                <svg viewBox="0 0 40 40" width="40" height="40">
                    <circle cx="20" cy="20" r="18" fill="#4361ee" stroke="white" stroke-width="2"/>
                    <path d="M20 8 L28 28 L20 24 L12 28 Z" fill="white"/>
                </svg>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

// Map controller with recenter and zoom
function MapController({ location, route, isTracking, setCanRecenter, setMapControls }) {
    const map = useMap();
    const [autoCenter, setAutoCenter] = useState(true);
    const userInteractedRef = useRef(false);
    const lastCenterRef = useRef(null);

    // Expose map controls to parent
    useEffect(() => {
        setMapControls({
            zoomIn: () => map.zoomIn(),
            zoomOut: () => map.zoomOut(),
            recenter: () => {
                if (location) {
                    map.setView([location.lat, location.lng], 15, { animate: true });
                    setAutoCenter(true);
                }
            }
        });
    }, [map, location, setMapControls]);

    // Update canRecenter state
    useEffect(() => {
        setCanRecenter(!autoCenter && isTracking);
    }, [autoCenter, isTracking, setCanRecenter]);

    // Disable auto-center when user pans
    useEffect(() => {
        const handleMoveStart = () => {
            userInteractedRef.current = true;
        };

        const handleMoveEnd = () => {
            if (userInteractedRef.current && location) {
                const center = map.getCenter();
                const distance = map.distance(center, [location.lat, location.lng]);
                if (distance > 100) {
                    setAutoCenter(false);
                }
            }
            userInteractedRef.current = false;
        };

        map.on('movestart', handleMoveStart);
        map.on('moveend', handleMoveEnd);

        return () => {
            map.off('movestart', handleMoveStart);
            map.off('moveend', handleMoveEnd);
        };
    }, [map, location]);

    // Recenter on location changes
    useEffect(() => {
        if (!autoCenter || !location) return;

        if (lastCenterRef.current) {
            const distance = map.distance(
                [lastCenterRef.current.lat, lastCenterRef.current.lng],
                [location.lat, location.lng]
            );
            if (distance < 20) return;
        }

        lastCenterRef.current = location;
        map.setView([location.lat, location.lng], map.getZoom(), { animate: true });
    }, [location, autoCenter, map]);

    // Initial centering
    useEffect(() => {
        if (location) {
            map.setView([location.lat, location.lng], 15);
            lastCenterRef.current = location;
        } else if (route?.stops?.length > 0) {
            const firstStop = route.stops[0];
            map.setView([firstStop.lat, firstStop.lng], 14);
        }
    }, []);

    return null;
}

// Glassmorphism Control Bar
function ControlBar({ isOnDuty, isLoading, onToggleDuty, canRecenter, mapControls }) {
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

            {/* Zoom In */}
            <button
                className="control-btn"
                onClick={() => mapControls?.zoomIn?.()}
                aria-label="Zoom in"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {/* Zoom Out */}
            <button
                className="control-btn"
                onClick={() => mapControls?.zoomOut?.()}
                aria-label="Zoom out"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {/* Recenter */}
            {canRecenter && (
                <button
                    className="control-btn recenter"
                    onClick={() => mapControls?.recenter?.()}
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

export function FullScreenMap({
    location,
    route,
    currentStopIndex = 0,
    isOnDuty = false,
    isLoading = false,
    onToggleDuty
}) {
    const stops = route?.stops || [];
    const [busIcon, setBusIcon] = useState(() => createBusIcon(0));
    const [canRecenter, setCanRecenter] = useState(false);
    const [mapControls, setMapControls] = useState({});

    // Update bus icon rotation when heading changes
    useEffect(() => {
        const heading = location?.heading || 0;
        setBusIcon(createBusIcon(heading));
    }, [location?.heading]);

    // Default center
    const defaultCenter = location
        ? [location.lat, location.lng]
        : stops.length > 0
            ? [stops[0].lat, stops[0].lng]
            : [23.0225, 72.5714];

    const routePath = route?.polyline || stops.map(stop => [stop.lat, stop.lng]);

    const getStopIcon = (idx) => {
        if (idx < currentStopIndex) return passedStopIcon;
        if (idx === currentStopIndex) return currentStopIcon;
        return stopIcon;
    };

    return (
        <div className="fullscreen-map">
            <MapContainer
                center={defaultCenter}
                zoom={14}
                className="map-container"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                    location={location}
                    route={route}
                    isTracking={!!location}
                    setCanRecenter={setCanRecenter}
                    setMapControls={setMapControls}
                />

                {/* Route polyline */}
                {routePath.length > 1 && (
                    <Polyline
                        positions={routePath}
                        color="#4361ee"
                        weight={4}
                        opacity={0.8}
                        dashArray="10, 10"
                    />
                )}

                {/* Stop markers */}
                {stops.map((stop, idx) => (
                    <Marker
                        key={stop.id || idx}
                        position={[stop.lat, stop.lng]}
                        icon={getStopIcon(idx)}
                    >
                        <Popup>
                            <strong>{stop.name}</strong>
                            <br />
                            {idx < currentStopIndex && <span className="stop-status passed"><Check size={12} /> Passed</span>}
                            {idx === currentStopIndex && <span className="stop-status current"><MapPin size={12} /> Current</span>}
                            {idx > currentStopIndex && <span className="stop-status upcoming">→ Upcoming</span>}
                        </Popup>
                    </Marker>
                ))}

                {/* Driver location marker */}
                {location && (
                    <Marker position={[location.lat, location.lng]} icon={busIcon}>
                        <Popup>
                            <strong>Your Location</strong>
                            <br />
                            <small>
                                {location.speed ? `${(location.speed * 3.6).toFixed(0)} km/h` : 'Stationary'}
                                {location.accuracy ? ` • ±${location.accuracy.toFixed(0)}m` : ''}
                            </small>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Glassmorphism Control Bar */}
            <ControlBar
                isOnDuty={isOnDuty}
                isLoading={isLoading}
                onToggleDuty={onToggleDuty}
                canRecenter={canRecenter}
                mapControls={mapControls}
            />
        </div>
    );
}

export default FullScreenMap;
