/**
 * RouteMap Component  
 * Interactive map for adding/viewing route stops
 * Single responsibility: Map visualization for routes
 */
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad, India
const DEFAULT_ZOOM = 13;

// Map click handler component
function MapClickHandler({ onClick }) {
    useMapEvents({
        click: onClick
    });
    return null;
}

export function RouteMap({ stops, onMapClick }) {
    const center = stops[0] ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER;

    return (
        <div className="map-container">
            <MapContainer
                center={center}
                zoom={DEFAULT_ZOOM}
                className="route-map"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                />
                <MapClickHandler onClick={onMapClick} />

                {/* Stop Markers */}
                {stops.map((stop) => (
                    <Marker key={stop.id} position={[stop.lat, stop.lng]} />
                ))}

                {/* Route Polyline */}
                {stops.length > 1 && (
                    <Polyline
                        positions={stops.map(s => [s.lat, s.lng])}
                        color="#4361ee"
                        weight={4}
                    />
                )}
            </MapContainer>

            <div className="map-instructions">
                Click on the map to add stops
            </div>
        </div>
    );
}

export default RouteMap;
