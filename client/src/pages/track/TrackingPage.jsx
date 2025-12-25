/**
 * TrackingPage - Student/Faculty Bus Tracking
 * 
 * Modular page component that orchestrates all tracking features.
 * Uses custom hooks for data and small components for UI.
 * 
 * @file TrackingPage.jsx
 * @responsibility Page-level orchestration only
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, LogoIcon } from '@/components/ui';

// Custom hooks for data management
import { useBusLocations } from './hooks/useBusLocations';
import { useRoutes } from './hooks/useRoutes';
import { useFavorites } from './hooks/useFavorites';

// UI Components
import { FilterBar } from './components/FilterBar';
import { BusMap } from './components/BusMap';
import { BusListPanel } from './components/BusListPanel';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AlertTriangle } from 'lucide-react';

import './TrackingPage.css';

export function TrackingPage() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    // Data hooks
    const { buses, loading: busesLoading, error: busesError, isConnected, refresh: refreshBuses } = useBusLocations();
    const { activeRoutes, loading: routesLoading, error: routesError, getRouteById, refresh: refreshRoutes } = useRoutes();
    const { favorites, toggleFavorite, isFavorite, showFavoritesOnly, setShowFavoritesOnly } = useFavorites();

    // Filter state
    const [filterRoute, setFilterRoute] = useState('all');

    // Filtered buses based on route and favorites
    const filteredBuses = useMemo(() => {
        let result = buses;

        if (filterRoute !== 'all') {
            result = result.filter(bus => bus.routeId === filterRoute);
        }

        if (showFavoritesOnly) {
            result = result.filter(bus => favorites.includes(bus.routeId));
        }

        return result;
    }, [buses, filterRoute, showFavoritesOnly, favorites]);

    // Selected route for displaying polyline
    const selectedRoute = filterRoute !== 'all' ? getRouteById(filterRoute) : null;

    // Handle logout
    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    // Combined loading state
    const isLoading = busesLoading || routesLoading;
    const error = busesError || routesError;

    // Loading UI
    if (isLoading) {
        return (
            <div className="tracking-page loading">
                <div className="loading-content">
                    <div className="loading-spinner" />
                    <p>Loading bus locations...</p>
                </div>
            </div>
        );
    }

    // Error UI
    if (error) {
        return (
            <div className="tracking-page error">
                <div className="error-content">
                    <span className="error-icon"><AlertTriangle size={32} /></span>
                    <h2>Unable to Load</h2>
                    <p>{error}</p>
                    <Button onClick={() => { refreshBuses(); refreshRoutes(); }}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="tracking-page">
            {/* Header */}
            <header className="tracking-header">
                <div className="tracking-logo">
                    <LogoIcon size="md" />
                    <span className="logo-text">UniTrack</span>
                </div>
                <div className="header-actions">
                    <ConnectionStatus
                        isConnected={isConnected}
                        busCount={filteredBuses.length}
                    />
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                        Logout
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <FilterBar
                routes={activeRoutes}
                selectedRoute={filterRoute}
                onRouteChange={setFilterRoute}
                showFavoritesOnly={showFavoritesOnly}
                onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
                isFavorite={isFavorite}
            />

            {/* Main Content */}
            <main className="tracking-content">
                {/* Map */}
                <BusMap
                    buses={filteredBuses}
                    selectedRoute={selectedRoute}
                    toggleFavorite={toggleFavorite}
                    isFavorite={isFavorite}
                />

                {/* Bus List Panel */}
                <BusListPanel
                    buses={filteredBuses}
                    getRouteById={getRouteById}
                    toggleFavorite={toggleFavorite}
                    isFavorite={isFavorite}
                />

                {/* Empty State */}
                {filteredBuses.length === 0 && (
                    <div className="empty-state">
                        <LogoIcon size="xl" className="empty-icon" />
                        <p>
                            {showFavoritesOnly
                                ? 'No active buses in your favorites'
                                : 'No active buses at the moment'}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default TrackingPage;
