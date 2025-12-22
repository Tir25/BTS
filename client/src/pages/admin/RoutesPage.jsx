import { useState, useEffect } from 'react';
import { routesService } from '@/services/database';
import { Button, Card, CardBody, Input, useConfirm, useToast } from '@/components/ui';
import { RouteCard } from '@/components/route';
import RouteBuilder from './RouteBuilder';
import './RoutesPage.css';

/**
 * Routes Management Page
 * List routes and create/edit with visual map builder
 */
export function RoutesPage() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { confirm } = useConfirm();
    const { toast } = useToast();

    useEffect(() => {
        loadRoutes();
    }, []);

    const loadRoutes = async () => {
        try {
            setLoading(true);
            const data = await routesService.getAll();
            setRoutes(data);
        } catch (err) {
            setError('Failed to load routes');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingRoute(null);
        setShowBuilder(true);
    };

    const handleEdit = (route) => {
        setEditingRoute(route);
        setShowBuilder(true);
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirm({
            title: 'Delete Route',
            message: `Are you sure you want to delete route "${name}"?`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await routesService.delete(id);
            setRoutes(prev => prev.filter(r => r.id !== id));
            toast.success('Route deleted successfully');
        } catch (err) {
            setError('Failed to delete route');
            toast.error('Failed to delete route');
        }
    };

    const handleSave = async (routeData) => {
        try {
            if (editingRoute) {
                await routesService.update(editingRoute.id, routeData);
                setRoutes(prev => prev.map(r =>
                    r.id === editingRoute.id ? { ...r, ...routeData } : r
                ));
                toast.success('Route updated successfully');
            } else {
                const newRoute = await routesService.create(routeData);
                setRoutes(prev => [newRoute, ...prev]);
                toast.success('Route created successfully');
            }
            setShowBuilder(false);
            setEditingRoute(null);
        } catch (err) {
            toast.error(`Failed to ${editingRoute ? 'update' : 'create'} route`);
        }
    };

    const filteredRoutes = routes.filter(route =>
        route.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="loading-state">Loading routes...</div>;
    }

    if (showBuilder) {
        return (
            <RouteBuilder
                route={editingRoute}
                onSave={handleSave}
                onCancel={() => { setShowBuilder(false); setEditingRoute(null); }}
            />
        );
    }

    return (
        <div className="routes-page">
            <header className="page-header">
                <h2>Routes Management</h2>
                <Button onClick={handleAdd}>+ Create Route</Button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="search-bar">
                <Input
                    placeholder="Search routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredRoutes.length === 0 ? (
                <Card className="empty-state">
                    <CardBody>
                        <p>No routes found. Create your first route to get started.</p>
                    </CardBody>
                </Card>
            ) : (
                <div className="routes-list">
                    {filteredRoutes.map(route => (
                        <RouteCard
                            key={route.id}
                            route={route}
                            onEdit={() => handleEdit(route)}
                            onDelete={() => handleDelete(route.id, route.name)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default RoutesPage;
