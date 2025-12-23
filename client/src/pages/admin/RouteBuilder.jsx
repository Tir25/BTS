/**
 * RouteBuilder Component
 * Visual route builder with map, draggable stops, destination selection,
 * address search, and bi-directional route support
 */
import { useState, useCallback, useEffect } from 'react';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import { RouteMap, StopsList, DestinationSelector, AddressSearch } from '@/components/route';
import { destinationsService } from '@/services/destinations';
import './RouteBuilder.css';

// Route direction types
const DIRECTIONS = [
    { value: 'to_campus', label: 'To Campus', icon: '🏫' },
    { value: 'from_campus', label: 'From Campus', icon: '🏠' },
    { value: 'round_trip', label: 'Round Trip', icon: '🔄' }
];

export function RouteBuilder({ route, onSave, onCancel }) {
    const [name, setName] = useState(route?.name || '');
    const [description, setDescription] = useState(route?.description || '');
    const [stops, setStops] = useState(route?.stops || []);
    const [isActive, setIsActive] = useState(route?.isActive ?? true);
    const [destinationId, setDestinationId] = useState(route?.destinationId || '');
    const [direction, setDirection] = useState(route?.direction || 'to_campus');
    const [destination, setDestination] = useState(null);
    const [centerOn, setCenterOn] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load destination details when destinationId changes
    useEffect(() => {
        if (destinationId) {
            loadDestination(destinationId);
        } else {
            setDestination(null);
        }
    }, [destinationId]);

    const loadDestination = async (id) => {
        try {
            const dest = await destinationsService.getById(id);
            setDestination(dest);
        } catch (err) {
            console.error('Failed to load destination:', err);
        }
    };

    // Handle address search selection - add as new stop
    const handleAddressSelect = useCallback((result) => {
        const newStop = {
            id: Date.now(),
            lat: result.lat,
            lng: result.lng,
            name: result.name
        };
        setStops(prev => [...prev, newStop]);
        // Center map on new stop
        setCenterOn({ lat: result.lat, lng: result.lng });
    }, []);

    // Handle map click to add new stop
    const handleMapClick = useCallback((e) => {
        const newStop = {
            id: Date.now(),
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            name: `Stop ${stops.length + 1}`
        };
        setStops(prev => [...prev, newStop]);
    }, [stops.length]);

    // Handle stop drag - update coordinates
    const handleStopDrag = useCallback((stopId, lat, lng) => {
        setStops(prev => prev.map(s =>
            s.id === stopId ? { ...s, lat, lng } : s
        ));
    }, []);

    // Handle stop removal
    const handleRemoveStop = (id) => {
        setStops(prev => prev.filter(s => s.id !== id));
    };

    // Handle stop name change
    const handleStopNameChange = (id, newName) => {
        setStops(prev => prev.map(s =>
            s.id === id ? { ...s, name: newName } : s
        ));
    };

    // Handle stop reordering
    const handleReorderStops = (fromIndex, toIndex) => {
        const newStops = [...stops];
        const draggedItem = newStops[fromIndex];
        newStops.splice(fromIndex, 1);
        newStops.splice(toIndex, 0, draggedItem);
        setStops(newStops);
    };

    // Build final stops array with destination
    const buildFinalStops = () => {
        if (!destination) return stops;

        const destinationStop = {
            id: `dest-${destination.id}`,
            lat: destination.lat,
            lng: destination.lng,
            name: destination.name,
            isDestination: true
        };

        const regularStops = stops.filter(s => !s.isDestination);

        if (direction === 'to_campus') {
            return [...regularStops, destinationStop];
        } else if (direction === 'from_campus') {
            return [destinationStop, ...regularStops];
        } else {
            return [...regularStops, destinationStop];
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Route name is required');
            return;
        }
        if (!destinationId) {
            setError('Please select a destination');
            return;
        }
        if (stops.length < 1) {
            setError('Add at least 1 stop');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const finalStops = buildFinalStops();
            await onSave({
                name: name.trim(),
                description: description.trim(),
                stops: finalStops,
                destinationId,
                destinationName: destination?.name,
                direction,
                isActive,
                polyline: finalStops.map(s => ({ lat: s.lat, lng: s.lng }))
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
                <RouteMap
                    stops={stops}
                    destination={destination}
                    onMapClick={handleMapClick}
                    onStopDrag={handleStopDrag}
                    centerOn={centerOn}
                />

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
                                placeholder="e.g., Ahmedabad Express"
                                required
                            />

                            <Input
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description"
                            />

                            {/* Destination Selector */}
                            <DestinationSelector
                                value={destinationId}
                                onChange={setDestinationId}
                                label="Destination"
                                required
                            />

                            {/* Route Direction */}
                            <div className="input-group">
                                <label className="input-label">Route Direction</label>
                                <div className="direction-options">
                                    {DIRECTIONS.map(dir => (
                                        <label
                                            key={dir.value}
                                            className={`direction-option ${direction === dir.value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="direction"
                                                value={dir.value}
                                                checked={direction === dir.value}
                                                onChange={(e) => setDirection(e.target.value)}
                                            />
                                            <span className="direction-icon">{dir.icon}</span>
                                            <span className="direction-label">{dir.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

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

                            {/* Address Search */}
                            <div className="input-group">
                                <label className="input-label">Add Stop by Address</label>
                                <AddressSearch
                                    onSelect={handleAddressSelect}
                                    placeholder="Search location..."
                                />
                            </div>

                            <div className="stops-section">
                                <h4>
                                    Stops ({stops.length})
                                    <span className="drag-hint">↕ Drag to reorder</span>
                                </h4>
                                <p className="stops-hint">
                                    {direction === 'to_campus'
                                        ? '🎓 Destination will be added as final stop'
                                        : direction === 'from_campus'
                                            ? '🎓 Destination will be the starting point'
                                            : '🔄 Round trip: starts and ends at stops'}
                                </p>
                                <StopsList
                                    stops={stops}
                                    onRemove={handleRemoveStop}
                                    onNameChange={handleStopNameChange}
                                    onReorder={handleReorderStops}
                                />
                            </div>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

export default RouteBuilder;
