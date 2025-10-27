import { logger } from '../utils/logger';

/**
 * Location utilities for enhanced location tracking and validation
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validates location data for accuracy and completeness
 */
export const validateLocationData = (location: LocationData): LocationValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!location.latitude || !location.longitude) {
    errors.push('Latitude and longitude are required');
  }

  // Validate coordinate ranges
  if (location.latitude < -90 || location.latitude > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }

  if (location.longitude < -180 || location.longitude > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }

  // Check accuracy
  if (location.accuracy && location.accuracy > 100) {
    warnings.push('Location accuracy is poor (>100m). Consider moving to a better location.');
  }

  // Check speed (if provided)
  if (location.speed && location.speed > 200) {
    warnings.push('Speed seems unrealistic (>200 km/h). Check GPS signal.');
  }

  // Check timestamp
  if (!location.timestamp) {
    errors.push('Timestamp is required');
  } else {
    const timestamp = new Date(location.timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - timestamp.getTime());
    
    if (timeDiff > 300000) { // 5 minutes
      warnings.push('Location data is older than 5 minutes');
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Calculates distance between two points using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates bearing between two points
 */
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Formats location data for display
 */
export const formatLocationData = (location: LocationData): string => {
  const lat = location.latitude.toFixed(6);
  const lng = location.longitude.toFixed(6);
  const accuracy = location.accuracy ? ` (±${Math.round(location.accuracy)}m)` : '';
  const speed = location.speed ? ` | ${Math.round(location.speed * 3.6)} km/h` : '';
  const heading = location.heading ? ` | ${Math.round(location.heading)}°` : '';
  
  return `${lat}, ${lng}${accuracy}${speed}${heading}`;
};

/**
 * Detects if location is stationary based on recent positions
 */
export const isLocationStationary = (
  locations: LocationData[],
  threshold: number = 10 // meters
): boolean => {
  if (locations.length < 2) return false;
  
  const recent = locations.slice(-5); // Last 5 positions
  const distances = [];
  
  for (let i = 1; i < recent.length; i++) {
    const dist = calculateDistance(
      recent[i-1].latitude,
      recent[i-1].longitude,
      recent[i].latitude,
      recent[i].longitude
    );
    distances.push(dist);
  }
  
  const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
  return avgDistance < threshold / 1000; // Convert to kilometers
};

/**
 * Optimizes location data for transmission
 */
export const optimizeLocationData = (location: LocationData): LocationData => {
  return {
    latitude: Math.round(location.latitude * 1000000) / 1000000, // 6 decimal places
    longitude: Math.round(location.longitude * 1000000) / 1000000,
    accuracy: location.accuracy ? Math.round(location.accuracy) : undefined,
    speed: location.speed ? Math.round(location.speed * 100) / 100 : undefined,
    heading: location.heading ? Math.round(location.heading) : undefined,
    timestamp: location.timestamp,
  };
};

/**
 * Checks if location permission is available
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  if (!navigator.geolocation) return false;
  
  if (!('permissions' in navigator)) return true; // Assume granted if API not available
  
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return permission.state === 'granted';
  } catch (error) {
    logger.warn('Warning', 'component', { data: 'Permission API not supported:', error });
    return true; // Assume granted if API not supported
  }
};

/**
 * Gets user-friendly error message for location errors
 */
export const getLocationErrorMessage = (error: GeolocationPositionError, isMobile: boolean = false): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return isMobile 
        ? 'Location permission denied. Please:\n1. Go to Settings\n2. Find this browser app\n3. Enable Location permission\n4. Refresh this page'
        : 'Location permission denied. Please enable location access in your browser settings.';
    
    case error.POSITION_UNAVAILABLE:
      return isMobile
        ? 'Location unavailable. Please:\n1. Go outdoors or near a window\n2. Wait 10-15 seconds\n3. Make sure GPS is enabled\n4. Try again'
        : 'Location information unavailable.';
    
    case error.TIMEOUT:
      return isMobile
        ? 'Location request timed out. Please:\n1. Go outdoors for better GPS signal\n2. Wait 30 seconds and try again\n3. Check if GPS is enabled'
        : 'Location request timed out. Please try again.';
    
    default:
      return 'Unknown location error occurred.';
  }
};

/**
 * Detects mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Gets optimal location tracking options based on device
 * PRODUCTION FIX: Mobile devices with GPS should use high accuracy
 */
export const getLocationOptions = (isMobile: boolean = false): PositionOptions => {
  // CRITICAL FIX: Mobile devices with GPS hardware SHOULD use high accuracy
  // Desktop browsers without GPS cannot improve accuracy even with enableHighAccuracy: true
  return {
    enableHighAccuracy: isMobile, // Mobile devices have GPS - use high accuracy
    timeout: isMobile ? 15000 : 10000, // Shorter timeout for both (faster failure)
    maximumAge: isMobile ? 5000 : 60000, // Mobile: fresh data, Desktop: allow cached IP location
  };
};
