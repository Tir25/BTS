import { useState, useEffect } from 'react';
import { destinationsService, DESTINATION_TYPES } from '@/services/destinations';
import { Button, Card, CardBody, Input, useConfirm, useToast } from '@/components/ui';
import DestinationForm from './DestinationForm';
import { MapPin } from 'lucide-react';
import './DestinationsPage.css';

/**
 * Destinations Management Page
 * Manage university campus and custom destinations (field trips, events)
 */
export function DestinationsPage() {
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingDestination, setEditingDestination] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { confirm } = useConfirm();
    const { toast } = useToast();

    useEffect(() => {
        loadDestinations();
    }, []);

    const loadDestinations = async () => {
        try {
            setLoading(true);
            // Seed default if needed, then load all
            await destinationsService.seedDefaultIfNeeded();
            const data = await destinationsService.getAll();
            setDestinations(data);
        } catch (err) {
            setError('Failed to load destinations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingDestination(null);
        setShowForm(true);
    };

    const handleEdit = (destination) => {
        setEditingDestination(destination);
        setShowForm(true);
    };

    const handleDelete = async (destination) => {
        if (destination.isDefault) {
            toast.error('Cannot delete the default university destination');
            return;
        }

        const confirmed = await confirm({
            title: 'Delete Destination',
            message: `Are you sure you want to delete "${destination.name}"?`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await destinationsService.delete(destination.id);
            setDestinations(prev => prev.filter(d => d.id !== destination.id));
            toast.success('Destination deleted successfully');
        } catch (err) {
            toast.error(err.message || 'Failed to delete destination');
        }
    };

    const handleFormSubmit = async (data) => {
        try {
            if (editingDestination) {
                await destinationsService.update(editingDestination.id, data);
                setDestinations(prev => prev.map(d =>
                    d.id === editingDestination.id ? { ...d, ...data } : d
                ));
                toast.success('Destination updated successfully');
            } else {
                const newDest = await destinationsService.create(data);
                setDestinations(prev => [newDest, ...prev]);
                toast.success('Destination added successfully');
            }
            setShowForm(false);
            setEditingDestination(null);
        } catch (err) {
            toast.error(`Failed to ${editingDestination ? 'update' : 'add'} destination`);
        }
    };

    const getTypeInfo = (type) => {
        return DESTINATION_TYPES.find(t => t.value === type) || DESTINATION_TYPES[3];
    };

    const filteredDestinations = destinations.filter(dest =>
        dest.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dest.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="loading-state">Loading destinations...</div>;
    }

    return (
        <div className="destinations-page">
            <header className="page-header">
                <h2>Destinations Management</h2>
                <Button onClick={handleAdd}>+ Add Destination</Button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="search-bar">
                <Input
                    placeholder="Search destinations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredDestinations.length === 0 ? (
                <Card className="empty-state">
                    <CardBody>
                        <p>No destinations found. Add your first destination to get started.</p>
                    </CardBody>
                </Card>
            ) : (
                <div className="destinations-grid">
                    {filteredDestinations.map(dest => {
                        const typeInfo = getTypeInfo(dest.type);
                        return (
                            <Card key={dest.id} className="destination-card" hoverable>
                                <CardBody>
                                    <div className="destination-header">
                                        <div
                                            className="destination-marker"
                                            style={{ backgroundColor: dest.color || '#ef4444' }}
                                        >
                                            {typeInfo.icon}
                                        </div>
                                        <div className="destination-info">
                                            <h4>
                                                {dest.name}
                                                {dest.isDefault && (
                                                    <span className="default-badge">Default</span>
                                                )}
                                            </h4>
                                            {dest.shortName && (
                                                <span className="short-name">{dest.shortName}</span>
                                            )}
                                            <p className="text-muted">{dest.address || 'No address'}</p>
                                        </div>
                                    </div>
                                    <div className="destination-meta">
                                        <span className={`type-badge ${dest.type}`}>
                                            {typeInfo.label}
                                        </span>
                                        <span className="coordinates">
                                            <MapPin size={14} /> {dest.lat?.toFixed(4)}, {dest.lng?.toFixed(4)}
                                        </span>
                                    </div>
                                    <div className="destination-actions">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(dest)}>
                                            Edit
                                        </Button>
                                        {!dest.isDefault && (
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(dest)}>
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}

            {showForm && (
                <DestinationForm
                    destination={editingDestination}
                    onSubmit={handleFormSubmit}
                    onClose={() => { setShowForm(false); setEditingDestination(null); }}
                />
            )}
        </div>
    );
}

export default DestinationsPage;
