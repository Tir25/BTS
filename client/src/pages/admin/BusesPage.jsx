import { useState, useEffect } from 'react';
import { busesService } from '@/services/database';
import { Button, Card, CardBody, Input, useConfirm, useToast } from '@/components/ui';
import { BusCard } from '@/components/bus';
import BusForm from './BusForm';
import './BusesPage.css';

/**
 * Buses Management Page
 */
export function BusesPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingBus, setEditingBus] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { confirm } = useConfirm();
    const { toast } = useToast();

    useEffect(() => {
        loadBuses();
    }, []);

    const loadBuses = async () => {
        try {
            setLoading(true);
            const data = await busesService.getAll();
            setBuses(data);
        } catch (err) {
            setError('Failed to load buses');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingBus(null);
        setShowForm(true);
    };

    const handleEdit = (bus) => {
        setEditingBus(bus);
        setShowForm(true);
    };

    const handleDelete = async (id, number) => {
        const confirmed = await confirm({
            title: 'Delete Bus',
            message: `Are you sure you want to delete bus "${number}"?`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await busesService.delete(id);
            setBuses(prev => prev.filter(b => b.id !== id));
            toast.success('Bus deleted successfully');
        } catch (err) {
            setError('Failed to delete bus');
            toast.error('Failed to delete bus');
        }
    };

    const handleFormSubmit = async (data) => {
        try {
            if (editingBus) {
                await busesService.update(editingBus.id, data);
                setBuses(prev => prev.map(b =>
                    b.id === editingBus.id ? { ...b, ...data } : b
                ));
                toast.success('Bus updated successfully');
            } else {
                const newBus = await busesService.create(data);
                setBuses(prev => [newBus, ...prev]);
                toast.success('Bus added successfully');
            }
            setShowForm(false);
            setEditingBus(null);
        } catch (err) {
            toast.error(`Failed to ${editingBus ? 'update' : 'add'} bus`);
        }
    };

    const filteredBuses = buses.filter(bus =>
        bus.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bus.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="loading-state">Loading buses...</div>;
    }

    return (
        <div className="drivers-page">
            <header className="page-header">
                <h2>Buses Management</h2>
                <Button onClick={handleAdd}>+ Add Bus</Button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="search-bar">
                <Input
                    placeholder="Search by number or license plate..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredBuses.length === 0 ? (
                <Card className="empty-state">
                    <CardBody>
                        <p>No buses found. Add your first bus to get started.</p>
                    </CardBody>
                </Card>
            ) : (
                <div className="drivers-grid">
                    {filteredBuses.map(bus => (
                        <BusCard
                            key={bus.id}
                            bus={bus}
                            onEdit={() => handleEdit(bus)}
                            onDelete={() => handleDelete(bus.id, bus.number)}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <BusForm
                    bus={editingBus}
                    onSubmit={handleFormSubmit}
                    onClose={() => { setShowForm(false); setEditingBus(null); }}
                />
            )}
        </div>
    );
}

export default BusesPage;
