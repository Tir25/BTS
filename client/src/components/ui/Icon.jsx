/**
 * Icon Component
 * Reusable SVG icon system with built-in icon library
 * Lightweight inline SVGs - no external dependencies
 */
import './Icon.css';

// Icon paths library - add more as needed
const ICONS = {
    // Navigation & UI
    arrowRight: 'M13 5l7 7-7 7M5 12h15',
    arrowLeft: 'M11 19l-7-7 7-7m8 14V5',
    chevronDown: 'M19 9l-7 7-7-7',
    menu: 'M4 6h16M4 12h16M4 18h16',
    x: 'M6 18L18 6M6 6l12 12',

    // Map & Location
    mapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 100-6 3 3 0 000 6z',
    map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16',
    navigation: 'M3 11l19-9-9 19-2-8-8-2z',

    // Time & Schedule
    clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
    calendar: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z M16 2v4 M8 2v4 M3 10h18',

    // Status & Actions
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    starFilled: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    check: 'M20 6L9 17l-5-5',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',

    // Users & People
    user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',

    // Transport
    bus: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M4 10h16 M8 18v2 M16 18v2 M7 14h.01 M17 14h.01',
    route: 'M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z M12 10a2 2 0 110-4 2 2 0 010 4z',

    // Communication
    bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
    info: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01',

    // Misc
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    signal: 'M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01',
    globe: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'
};

/**
 * Icon component with SVG icons
 * @param {string} name - Icon name from ICONS library
 * @param {string} size - Size: 'xs', 'sm', 'md', 'lg', 'xl' or number
 * @param {string} color - CSS color value
 * @param {string} className - Additional classes
 * @param {boolean} filled - Fill the icon (for star, etc.)
 */
export function Icon({
    name,
    size = 'md',
    color = 'currentColor',
    className = '',
    filled = false,
    ...props
}) {
    const path = ICONS[name];

    if (!path) {
        console.warn(`Icon "${name}" not found`);
        return null;
    }

    // Size mapping
    const sizeMap = {
        xs: 14,
        sm: 18,
        md: 24,
        lg: 32,
        xl: 48
    };
    const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 24;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={pixelSize}
            height={pixelSize}
            viewBox="0 0 24 24"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`icon icon-${name} ${className}`}
            aria-hidden="true"
            {...props}
        >
            <path d={path} />
        </svg>
    );
}

// Export icon names for autocomplete
export const iconNames = Object.keys(ICONS);

export default Icon;
