/**
 * Shared Leaflet icon utilities
 * Single source of truth for map icons - eliminates duplicate code
 */
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icon (only run once)
let defaultIconFixed = false;
export function fixLeafletDefaultIcon() {
    if (defaultIconFixed) return;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });
    defaultIconFixed = true;
}

/**
 * Create a custom bus marker icon (SVG-based for cross-platform consistency)
 * @param {Object} options - Icon options
 * @param {number} options.heading - Bus heading in degrees (optional)
 * @param {string} options.color - Primary color (default: #4361ee)
 * @returns {L.DivIcon} Leaflet DivIcon
 */
export function createBusIcon({ heading = 0, color = '#4361ee' } = {}) {
    return new L.DivIcon({
        className: 'bus-marker-wrapper',
        html: `
            <div class="bus-marker-icon" style="transform: rotate(${heading}deg)">
                <svg viewBox="0 0 40 40" width="40" height="40">
                    <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
                    <path d="M20 8 L28 28 L20 24 L12 28 Z" fill="white"/>
                </svg>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
}

/**
 * Create a stop marker icon
 * @param {string} type - 'normal' | 'current' | 'passed'
 * @returns {L.Icon} Leaflet Icon
 */
export function createStopIcon(type = 'normal') {
    const configs = {
        normal: { size: 24, color: '#ef4444', innerRadius: 3 },
        current: { size: 32, color: '#22c55e', innerRadius: 4 },
        passed: { size: 20, color: '#6b7280', innerRadius: 0, checkmark: true }
    };

    const config = configs[type] || configs.normal;
    const half = config.size / 2;
    const radius = half - 4;

    let innerContent = '';
    if (config.checkmark) {
        innerContent = `<path d="M${half - 3} ${half}l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>`;
    } else {
        innerContent = `<circle cx="${half}" cy="${half}" r="${config.innerRadius}" fill="white"/>`;
    }

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.size} ${config.size}" width="${config.size}" height="${config.size}">
            <circle cx="${half}" cy="${half}" r="${radius}" fill="${config.color}" stroke="white" stroke-width="2"/>
            ${innerContent}
        </svg>
    `;

    return new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(svg.trim()),
        iconSize: [config.size, config.size],
        iconAnchor: [half, half],
        popupAnchor: [0, -half]
    });
}

// Pre-created stop icon instances for performance
export const stopIcons = {
    normal: createStopIcon('normal'),
    current: createStopIcon('current'),
    passed: createStopIcon('passed')
};
