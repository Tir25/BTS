/**
 * UserLocationMarker Component
 * Displays user's current location on the map
 * Single responsibility: User location marker UI
 */
import { Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import './UserLocationMarker.css';

// Create user location icon
const userIcon = new L.DivIcon({
    className: 'user-location-marker',
    html: `
        <div class="user-marker-pulse"></div>
        <div class="user-marker-dot"></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

/**
 * @param {Object} props
 * @param {Object} props.location - { lat, lng, accuracy }
 * @param {boolean} props.showAccuracy - Show accuracy circle (default: true)
 * @param {boolean} props.centerOnMount - Center map on user location initially
 */
export function UserLocationMarker({
    location,
    showAccuracy = true,
    centerOnMount = false
}) {
    const map = useMap();

    // Center map on user location when first available
    useEffect(() => {
        if (centerOnMount && location) {
            map.setView([location.lat, location.lng], 15, { animate: true });
        }
    }, [centerOnMount, location, map]);

    if (!location) return null;

    return (
        <>
            {/* Accuracy circle */}
            {showAccuracy && location.accuracy && (
                <Circle
                    center={[location.lat, location.lng]}
                    radius={location.accuracy}
                    pathOptions={{
                        color: '#4361ee',
                        fillColor: '#4361ee',
                        fillOpacity: 0.1,
                        weight: 1
                    }}
                />
            )}

            {/* User marker */}
            <Marker
                position={[location.lat, location.lng]}
                icon={userIcon}
            >
                <Popup>
                    <div className="user-location-popup">
                        <strong>📍 Your Location</strong>
                        {location.accuracy && (
                            <p>Accuracy: ±{Math.round(location.accuracy)}m</p>
                        )}
                    </div>
                </Popup>
            </Marker>
        </>
    );
}

export default UserLocationMarker;
