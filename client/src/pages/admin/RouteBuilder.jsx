import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import 'leaflet/dist/leaflet.css';
import './RouteBuilder.css';

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

/**
 * Visual Route Builder with map and drag-to-reorder stops
 */
export function RouteBuilder({ route, onSave, onCancel }) {
    const [name, setName] = useState(route?.name || '');
    const [description, setDescription] = useState(route?.description || '');
    const [stops, setStops] = useState(route?.stops || []);
    const [isActive, setIsActive] = useState(route?.isActive ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleMapClick = useCallback((e) => {
        const newStop = {
            id: Date.now(),
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            name: `Stop ${stops.length + 1}`
        };
        setStops(prev => [...prev, newStop]);
    }, [stops.length]);

    const handleRemoveStop = (id) => {
        setStops(prev => prev.filter(s => s.id !== id));
    };

    const handleStopNameChange = (id, newName) => {
        setStops(prev => prev.map(s =>
            s.id === id ? { ...s, name: newName } : s
        ));
    };

    // Drag and drop handlers
    const handleDragStart = (index) => {
        dragItem.current = index;
    };

    const handleDragEnter = (index) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) return;

        const newStops = [...stops];
        const draggedItem = newStops[dragItem.current];
        newStops.splice(dragItem.current, 1);
        newStops.splice(dragOverItem.current, 0, draggedItem);

        setStops(newStops);
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Route name is required');
            return;
        }
        if (stops.length < 2) {
            setError('Add at least 2 stops');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                stops,
                isActive,
                polyline: stops.map(s => [s.lat, s.lng])
            });
        } catch (err) {
            setError(err.message || 'Failed to save route');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="route-builder">
            <header className="builder-header">
                <h2>{route ? 'Edit Route' : 'Create New Route'}</h2>
                <div className="builder-actions">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={loading}>Save Route</Button>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <div className="builder-content">
                {/* Map */}
                <div className="map-container">
                    <MapContainer
                        center={stops[0] ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER}
                        zoom={DEFAULT_ZOOM}
                        className="route-map"
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap'
                        />
                        <MapClickHandler onClick={handleMapClick} />

                        {/* Stop Markers */}
                        {stops.map((stop, idx) => (
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

                {/* Sidebar */}
                <Card className="builder-sidebar">
                    <CardHeader>
                        <h3>Route Details</h3>
                    </CardHeader>
                    <CardBody>
                        <form className="route-form" onSubmit={handleSubmit}>
                            <Input
                                label="Route Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Campus Loop"
                                required
                            />

                            <Input
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description"
                            />

                            <div className="input-group">
                                <label className="input-label">Status</label>
                                <select
                                    value={isActive ? 'active' : 'inactive'}
                                    onChange={(e) => setIsActive(e.target.value === 'active')}
                                    className="input"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="stops-section">
                                <h4>Stops ({stops.length}) <span className="drag-hint">↕ Drag to reorder</span></h4>
                                {stops.length === 0 ? (
                                    <p className="text-muted">Click on map to add stops</p>
                                ) : (
                                    <ul className="stops-list">
                                        {stops.map((stop, idx) => (
                                            <li
                                                key={stop.id}
                                                className="stop-item"
                                                draggable
                                                onDragStart={() => handleDragStart(idx)}
                                                onDragEnter={() => handleDragEnter(idx)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => e.preventDefault()}
                                            >
                                                <span className="stop-drag">⋮⋮</span>
                                                <span className="stop-number">{idx + 1}</span>
                                                <input
                                                    type="text"
                                                    value={stop.name}
                                                    onChange={(e) => handleStopNameChange(stop.id, e.target.value)}
                                                    className="stop-name-input"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStop(stop.id)}
                                                    className="stop-remove"
                                                >
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

// Map click handler component
function MapClickHandler({ onClick }) {
    useMapEvents({
        click: onClick
    });
    return null;
}

export default RouteBuilder;
