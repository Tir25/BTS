/**
 * RouteBuilder Component
 * Visual route builder with map and draggable stops
 * Single responsibility: Compose route editing UI
 */
import { useState, useCallback } from 'react';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import { RouteMap, StopsList } from '@/components/route';
import './RouteBuilder.css';

export function RouteBuilder({ route, onSave, onCancel }) {
    const [name, setName] = useState(route?.name || '');
    const [description, setDescription] = useState(route?.description || '');
    const [stops, setStops] = useState(route?.stops || []);
    const [isActive, setIsActive] = useState(route?.isActive ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    // Handle form submission
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
                // Convert to array of objects instead of nested arrays (Firestore limitation)
                polyline: stops.map(s => ({ lat: s.lat, lng: s.lng }))
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
                <RouteMap stops={stops} onMapClick={handleMapClick} />

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
                                <h4>
                                    Stops ({stops.length})
                                    <span className="drag-hint">↕ Drag to reorder</span>
                                </h4>
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
