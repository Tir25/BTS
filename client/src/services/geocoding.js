/**
 * Geocoding Service
 * Wrapper for Nominatim OpenStreetMap geocoding API
 * Handles address search with Gujarat region bias
 */

// Nominatim API endpoint (free, no API key needed)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Gujarat bounding box for local bias
// Format: west,south,east,north (min_lon, min_lat, max_lon, max_lat)
const GUJARAT_VIEWBOX = '68.1,20.1,74.5,24.7';

// Default search options
const DEFAULT_OPTIONS = {
    format: 'json',
    addressdetails: 1,
    limit: 8,
    countrycodes: 'in',
    viewbox: GUJARAT_VIEWBOX,
    bounded: 0 // Set to 1 to restrict to viewbox only
};

/**
 * Search for addresses using Nominatim
 * @param {string} query - Search query
 * @param {object} options - Optional search options
 * @returns {Promise<Array>} Array of results
 */
export async function searchAddress(query, options = {}) {
    if (!query || query.trim().length < 2) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            q: query.trim(),
            ...DEFAULT_OPTIONS,
            ...options
        });

        const response = await fetch(`${NOMINATIM_URL}?${params}`, {
            headers: {
                'Accept': 'application/json',
                // User-Agent required by Nominatim policy
                'User-Agent': 'UniTrack-CampusBusTracker/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }

        const data = await response.json();
        return formatResults(data);
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

/**
 * Format Nominatim results to simplified structure
 */
function formatResults(results) {
    return results.map(result => ({
        id: result.place_id,
        name: result.name || result.display_name.split(',')[0],
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type,
        address: formatAddress(result.address)
    }));
}

/**
 * Format address components into readable string
 */
function formatAddress(address) {
    if (!address) return '';

    const parts = [];

    if (address.road) parts.push(address.road);
    if (address.neighbourhood) parts.push(address.neighbourhood);
    if (address.suburb) parts.push(address.suburb);
    if (address.city || address.town || address.village) {
        parts.push(address.city || address.town || address.village);
    }
    if (address.state_district) parts.push(address.state_district);

    return parts.join(', ');
}

/**
 * Debounce utility for search input
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 */
export function debounce(fn, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Reverse geocode - get address from coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export async function reverseGeocode(lat, lng) {
    try {
        const params = new URLSearchParams({
            lat,
            lon: lng,
            format: 'json',
            addressdetails: 1
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${params}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'UniTrack-CampusBusTracker/1.0'
                }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        return {
            name: data.name || data.display_name.split(',')[0],
            displayName: data.display_name,
            address: formatAddress(data.address)
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

export default {
    searchAddress,
    reverseGeocode,
    debounce
};
