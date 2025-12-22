import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { ref, onValue } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { realtimeDb, db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, CardBody } from '@/components/ui';
import 'leaflet/dist/leaflet.css';
import './TrackingPage.css';

// Fix Leaflet marker icons
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

// Custom bus icon (SVG for cross-platform consistency - FIX #8)
const busIcon = new L.DivIcon({
    className: 'bus-marker-wrapper',
    html: `<div class="bus-marker-icon">
        <svg viewBox="0 0 40 40" width="40" height="40">
            <circle cx="20" cy="20" r="18" fill="#4361ee" stroke="white" stroke-width="2"/>
            <rect x="12" y="12" width="16" height="14" rx="2" fill="white"/>
            <rect x="14" y="14" width="5" height="5" fill="#4361ee"/>
            <rect x="21" y="14" width="5" height="5" fill="#4361ee"/>
            <circle cx="14" cy="26" r="2.5" fill="#333"/>
            <circle cx="26" cy="26" r="2.5" fill="#333"/>
        </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad
const DEFAULT_ZOOM = 13;
const FAVORITES_KEY = 'unitrack_favorites';

/**
 * Student/Faculty Tracking Page
 * Real-time bus location map with ETA and route filtering
 */
export function TrackingPage() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [selectedBus, setSelectedBus] = useState(null);
    const [filterRoute, setFilterRoute] = useState('all');
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem(FAVORITES_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Load routes
    useEffect(() => {
        const loadRoutes = async () => {
            try {
                const routesRef = collection(db, 'routes');
                const snapshot = await getDocs(routesRef);
                const routesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setRoutes(routesData);
            } catch (err) {
                console.error('Failed to load routes:', err);
            }
        };
        loadRoutes();
    }, []);

    // Subscribe to live bus locations
    useEffect(() => {
        const locationsRef = ref(realtimeDb, 'busLocations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const activeBuses = Object.entries(data)
                    .filter(([_, bus]) => bus.isActive)
                    .map(([id, bus]) => ({ id, ...bus }));
                setBuses(activeBuses);
            } else {
                setBuses([]);
            }
        });

        return () => unsubscribe();
    }, []);

    // Filtered buses
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

    // Toggle favorite
    const toggleFavorite = (routeId) => {
        const newFavorites = favorites.includes(routeId)
            ? favorites.filter(id => id !== routeId)
            : [...favorites, routeId];
        setFavorites(newFavorites);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    };

    // Calculate ETA (simplified - based on distance and average speed)
    const calculateETA = (bus, targetLat, targetLng) => {
        if (!bus.lat || !bus.lng) return null;

        const distance = getDistance(bus.lat, bus.lng, targetLat, targetLng);
        const avgSpeed = bus.speed && bus.speed > 1 ? bus.speed : 8.33; // m/s, default 30km/h
        const timeSeconds = distance / avgSpeed;

        if (timeSeconds < 60) return 'Less than 1 min';
        const minutes = Math.ceil(timeSeconds / 60);
        if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        return `${minutes} min`;
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    // Get route for a bus
    const getBusRoute = (routeId) => routes.find(r => r.id === routeId);

    return (
        <div className="tracking-page">
            <header className="tracking-header">
                <div className="tracking-logo">
                    <span className="logo-icon">🚌</span>
                    <span className="logo-text">UniTrack</span>
                </div>
                <div className="header-actions">
                    <span className="bus-count">{filteredBuses.length} Active</span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                        Logout
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <div className="filter-bar">
                <select
                    value={filterRoute}
                    onChange={(e) => setFilterRoute(e.target.value)}
                    className="route-filter"
                >
                    <option value="all">All Routes</option>
                    {routes.filter(r => r.isActive).map(route => (
                        <option key={route.id} value={route.id}>
                            {favorites.includes(route.id) ? '⭐ ' : ''}{route.name}
                        </option>
                    ))}
                </select>
                <button
                    className={`favorites-btn ${showFavoritesOnly ? 'active' : ''}`}
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                    ⭐ Favorites
                </button>
            </div>

            <main className="tracking-content">
                {/* Map */}
                <div className="map-container">
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={DEFAULT_ZOOM}
                        className="tracking-map"
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap'
                        />

                        {/* Route Polylines */}
                        {filterRoute !== 'all' && getBusRoute(filterRoute)?.polyline && (
                            <Polyline
                                positions={getBusRoute(filterRoute).polyline}
                                color="#4361ee"
                                weight={4}
                                opacity={0.6}
                            />
                        )}

                        {/* Bus Markers */}
                        {filteredBuses.map(bus => {
                            const busRoute = getBusRoute(bus.routeId);
                            return (
                                <Marker
                                    key={bus.id}
                                    position={[bus.lat, bus.lng]}
                                    icon={busIcon}
                                    eventHandlers={{
                                        click: () => setSelectedBus(bus)
                                    }}
                                >
                                    <Popup>
                                        <div className="bus-popup">
                                            <strong>{bus.routeName || 'Bus Active'}</strong>
                                            <p>Speed: {bus.speed ? (bus.speed * 3.6).toFixed(1) : 0} km/h</p>
                                            <p>Updated: {getTimeAgo(bus.lastUpdated)}</p>
                                            {busRoute && (
                                                <button
                                                    className="favorite-popup-btn"
                                                    onClick={() => toggleFavorite(bus.routeId)}
                                                >
                                                    {favorites.includes(bus.routeId) ? '⭐ Remove Favorite' : '☆ Add to Favorites'}
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Bus List with ETA */}
                {filteredBuses.length > 0 && (
                    <Card className="bus-list-card">
                        <CardBody>
                            <h3>Active Buses</h3>
                            <div className="bus-list">
                                {filteredBuses.map(bus => {
                                    const busRoute = getBusRoute(bus.routeId);
                                    // Calculate ETA to first stop on route
                                    const firstStop = busRoute?.stops?.[0];
                                    const eta = firstStop ? calculateETA(bus, firstStop.lat, firstStop.lng) : null;

                                    return (
                                        <div key={bus.id} className="bus-list-item">
                                            <div className="bus-info">
                                                <span className="bus-icon">🚌</span>
                                                <div>
                                                    <div className="bus-route-name">{bus.routeName || 'Unknown Route'}</div>
                                                    <div className="bus-speed">{(bus.speed * 3.6).toFixed(1)} km/h</div>
                                                </div>
                                            </div>
                                            {eta && (
                                                <div className="bus-eta">
                                                    <span className="eta-label">ETA:</span>
                                                    <span className="eta-value">{eta}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Status Bar */}
                <Card className="status-bar">
                    <CardBody>
                        {filteredBuses.length === 0 ? (
                            <p className="no-buses">No active buses {showFavoritesOnly ? 'in favorites' : 'at the moment'}</p>
                        ) : (
                            <p className="buses-active">
                                <span className="pulse-dot" />
                                {filteredBuses.length} bus{filteredBuses.length > 1 ? 'es' : ''} currently active
                            </p>
                        )}
                    </CardBody>
                </Card>
            </main>
        </div>
    );
}

// Utility functions
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return 'Long ago';
}

function getDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export default TrackingPage;
