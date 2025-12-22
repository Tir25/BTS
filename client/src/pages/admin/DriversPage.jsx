import { useState, useEffect } from 'react';
import { driversService } from '@/services/database';
import { Button, Card, CardBody, Input, useConfirm, useToast } from '@/components/ui';
import { DriverCard } from '@/components/driver';
import DriverForm from './DriverForm';
import './DriversPage.css';

/**
 * Drivers Management Page
 * Lists all drivers with add, edit, delete functionality
 */
export function DriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { confirm } = useConfirm();
    const { toast } = useToast();

    // Load drivers on mount
    useEffect(() => {
        loadDrivers();
    }, []);

    const loadDrivers = async () => {
        try {
            setLoading(true);
            const data = await driversService.getAll();
            setDrivers(data);
        } catch (err) {
            setError('Failed to load drivers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingDriver(null);
        setShowForm(true);
    };

    const handleEdit = (driver) => {
        setEditingDriver(driver);
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirm({
            title: 'Delete Driver',
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await driversService.delete(id);
            setDrivers(prev => prev.filter(d => d.id !== id));
            toast.success('Driver deleted successfully');
        } catch (err) {
            setError('Failed to delete driver');
            toast.error('Failed to delete driver');
        }
    };

    const handleFormSubmit = async (data) => {
        try {
            if (editingDriver) {
                await driversService.update(editingDriver.id, data);
                setDrivers(prev => prev.map(d =>
                    d.id === editingDriver.id ? { ...d, ...data } : d
                ));
                toast.success('Driver updated successfully');
            } else {
                const newDriver = await driversService.create(data);
                setDrivers(prev => [newDriver, ...prev]);
                toast.success('Driver added successfully');
            }
            setShowForm(false);
            setEditingDriver(null);
        } catch (err) {
            toast.error(`Failed to ${editingDriver ? 'update' : 'add'} driver`);
            throw err;
        }
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingDriver(null);
    };

    // Filter drivers by search
    const filteredDrivers = drivers.filter(driver =>
        driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone?.includes(searchQuery) ||
        driver.licenseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="loading-state">Loading drivers...</div>;
    }

    return (
        <div className="drivers-page">
            <header className="page-header">
                <h2>Drivers Management</h2>
                <Button onClick={handleAdd}>+ Add Driver</Button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="search-bar">
                <Input
                    placeholder="Search by name, phone, or license..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredDrivers.length === 0 ? (
                <Card className="empty-state">
                    <CardBody>
                        <p>No drivers found. Add your first driver to get started.</p>
                    </CardBody>
                </Card>
            ) : (
                <div className="drivers-grid">
                    {filteredDrivers.map(driver => (
                        <DriverCard
                            key={driver.id}
                            driver={driver}
                            onEdit={() => handleEdit(driver)}
                            onDelete={() => handleDelete(driver.id, driver.name)}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <DriverForm
                    driver={editingDriver}
                    onSubmit={handleFormSubmit}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

export default DriversPage;
