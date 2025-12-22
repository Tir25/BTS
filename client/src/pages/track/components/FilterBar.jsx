/**
 * FilterBar Component
 * Route dropdown and favorites filter for tracking page
 * Single responsibility: Filter controls UI
 */
import './FilterBar.css';

/**
 * @param {Object} props
 * @param {Array} props.routes - Available routes
 * @param {string} props.selectedRoute - Currently selected route ID
 * @param {Function} props.onRouteChange - Route selection handler
 * @param {boolean} props.showFavoritesOnly - Favorites filter state
 * @param {Function} props.onToggleFavorites - Toggle favorites filter
 * @param {Function} props.isFavorite - Check if route is favorite
 */
export function FilterBar({
    routes = [],
    selectedRoute = 'all',
    onRouteChange,
    showFavoritesOnly = false,
    onToggleFavorites,
    isFavorite
}) {
    return (
        <div className="filter-bar">
            <select
                value={selectedRoute}
                onChange={(e) => onRouteChange(e.target.value)}
                className="route-filter"
                aria-label="Filter by route"
            >
                <option value="all">All Routes</option>
                {routes.map(route => (
                    <option key={route.id} value={route.id}>
                        {isFavorite?.(route.id) ? '⭐ ' : ''}{route.name}
                    </option>
                ))}
            </select>

            <button
                className={`favorites-btn ${showFavoritesOnly ? 'active' : ''}`}
                onClick={onToggleFavorites}
                aria-label={showFavoritesOnly ? 'Show all routes' : 'Show favorites only'}
                aria-pressed={showFavoritesOnly}
            >
                ⭐ Favorites
            </button>
        </div>
    );
}

export default FilterBar;
