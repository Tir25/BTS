/**
 * RouteMap Component  
 * Interactive map for adding/viewing route stops with destination marker
 * Features: draggable markers, click to add, colored markers
 */
import { useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
import L from 'leaflet';
import { CircleDot, GraduationCap, MousePointer, MapPin, Circle } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom color markers
const createColorIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = createColorIcon('red');
const greenIcon = createColorIcon('green');
const blueIcon = createColorIcon('blue');

// Default center (Ganpat University)
const DEFAULT_CENTER = [23.529528, 72.457694];
const DEFAULT_ZOOM = 13;

// Map click handler component
function MapClickHandler({ onClick }) {
    useMapEvents({ click: onClick });
    return null;
}

// Map recenter component
function MapRecenter({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

// Draggable stop marker component
function DraggableMarker({ stop, index, onDragEnd, isFirst }) {
    const markerRef = useRef(null);

    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker) {
                const { lat, lng } = marker.getLatLng();
                onDragEnd?.(stop.id, lat, lng);
            }
        },
    }), [stop.id, onDragEnd]);

    return (
        <Marker
            ref={markerRef}
            position={[stop.lat, stop.lng]}
            icon={isFirst ? greenIcon : blueIcon}
            draggable={!!onDragEnd}
            eventHandlers={eventHandlers}
        >
            <Popup>
                <strong>#{index + 1} {stop.name}</strong>
                {isFirst && <div><CircleDot size={14} className="text-green" /> Starting Point</div>}
                {onDragEnd && (
                    <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                        Drag to reposition
                    </div>
                )}
            </Popup>
        </Marker>
    );
}

export function RouteMap({
    stops,
    destination,
    onMapClick,
    onStopDrag,
    centerOn
}) {
    // Determine center
    const center = centerOn
        ? [centerOn.lat, centerOn.lng]
        : destination
            ? [destination.lat, destination.lng]
            : stops[0]
                ? [stops[0].lat, stops[0].lng]
                : DEFAULT_CENTER;

    // Build polyline including destination
    const polylinePositions = [
        ...stops.map(s => [s.lat, s.lng]),
        ...(destination ? [[destination.lat, destination.lng]] : [])
    ];

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

                {onMapClick && <MapClickHandler onClick={onMapClick} />}
                {centerOn && <MapRecenter center={[centerOn.lat, centerOn.lng]} />}

                {/* Stop Markers - Draggable */}
                {stops.map((stop, index) => (
                    <DraggableMarker
                        key={stop.id}
                        stop={stop}
                        index={index}
                        onDragEnd={onStopDrag}
                        isFirst={index === 0}
                    />
                ))}

                {/* Destination Marker (Red) - Not draggable */}
                {destination && (
                    <Marker
                        position={[destination.lat, destination.lng]}
                        icon={redIcon}
                    >
                        <Popup>
                            <strong><GraduationCap size={14} /> {destination.name}</strong>
                            <div style={{ color: '#ef4444' }}>Final Destination</div>
                            {destination.address && (
                                <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
                                    {destination.address}
                                </div>
                            )}
                        </Popup>
                    </Marker>
                )}

                {/* Route Polyline */}
                {polylinePositions.length > 1 && (
                    <Polyline
                        positions={polylinePositions}
                        color="#4361ee"
                        weight={4}
                    />
                )}
            </MapContainer>

            <div className="map-instructions">
                {onMapClick
                    ? <><MousePointer size={14} /> Click map to add stops • Drag markers to reposition</>
                    : <><MapPin size={14} /> Route preview</>
                }
                {destination && (
                    <span style={{ marginLeft: '1rem', color: '#ef4444' }}>
                        <Circle size={14} /> {destination.name}
                    </span>
                )}
            </div>
        </div>
    );
}

export default RouteMap;
