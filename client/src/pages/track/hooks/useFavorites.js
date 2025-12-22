/**
 * useFavorites Hook
 * Manage favorite routes with localStorage persistence
 * Single responsibility: Favorites state management
 */
import { useState, useCallback, useEffect } from 'react';

const FAVORITES_KEY = 'unitrack_favorites';

/**
 * Load favorites from localStorage
 */
function loadFavorites() {
    try {
        const saved = localStorage.getItem(FAVORITES_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * Save favorites to localStorage
 */
function saveFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (err) {
        console.warn('Failed to save favorites:', err);
    }
}

/**
 * Manage favorite routes
 * @returns {Object} { favorites, toggleFavorite, isFavorite, showFavoritesOnly, setShowFavoritesOnly }
 */
export function useFavorites() {
    const [favorites, setFavorites] = useState(loadFavorites);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Sync with localStorage when favorites change
    useEffect(() => {
        saveFavorites(favorites);
    }, [favorites]);

    // Toggle a route as favorite
    const toggleFavorite = useCallback((routeId) => {
        setFavorites(prev => {
            if (prev.includes(routeId)) {
                return prev.filter(id => id !== routeId);
            }
            return [...prev, routeId];
        });
    }, []);

    // Check if route is favorite
    const isFavorite = useCallback((routeId) => {
        return favorites.includes(routeId);
    }, [favorites]);

    return {
        favorites,
        toggleFavorite,
        isFavorite,
        showFavoritesOnly,
        setShowFavoritesOnly
    };
}

export default useFavorites;
