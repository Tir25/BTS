interface LocationData {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export const validateLocationData = (data: LocationData): string | null => {
  // Validate required fields
  if (!data.driverId || typeof data.driverId !== 'string') {
    return 'Driver ID is required and must be a string';
  }

  if (data.driverId.trim().length === 0) {
    return 'Driver ID cannot be empty';
  }

  // Validate latitude
  if (typeof data.latitude !== 'number' || isNaN(data.latitude)) {
    return 'Latitude must be a valid number';
  }

  if (data.latitude < -90 || data.latitude > 90) {
    return 'Latitude must be between -90 and 90 degrees';
  }

  // Validate longitude
  if (typeof data.longitude !== 'number' || isNaN(data.longitude)) {
    return 'Longitude must be a valid number';
  }

  if (data.longitude < -180 || data.longitude > 180) {
    return 'Longitude must be between -180 and 180 degrees';
  }

  // Validate timestamp
  if (!data.timestamp || typeof data.timestamp !== 'string') {
    return 'Timestamp is required and must be a string';
  }

  const timestamp = new Date(data.timestamp);
  if (isNaN(timestamp.getTime())) {
    return 'Timestamp must be a valid ISO date string';
  }

  // Check if timestamp is not too far in the future (more than 1 minute)
  const now = new Date();
  const timeDiff = timestamp.getTime() - now.getTime();
  if (timeDiff > 60000) {
    // 1 minute in milliseconds
    return 'Timestamp cannot be more than 1 minute in the future';
  }

  // Check if timestamp is not too old (more than 5 minutes)
  if (timeDiff < -300000) {
    // 5 minutes in milliseconds
    return 'Timestamp cannot be more than 5 minutes in the past';
  }

  // Validate speed (optional)
  if (data.speed !== undefined) {
    if (typeof data.speed !== 'number' || isNaN(data.speed)) {
      return 'Speed must be a valid number';
    }

    if (data.speed < 0 || data.speed > 200) {
      // 200 km/h max reasonable speed
      return 'Speed must be between 0 and 200 km/h';
    }
  }

  // Validate heading (optional)
  if (data.heading !== undefined) {
    if (typeof data.heading !== 'number' || isNaN(data.heading)) {
      return 'Heading must be a valid number';
    }

    if (data.heading < 0 || data.heading > 360) {
      return 'Heading must be between 0 and 360 degrees';
    }
  }

  return null; // No validation errors
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
};

export const validateBusNumber = (busNumber: string): string | null => {
  if (!busNumber || typeof busNumber !== 'string') {
    return 'Bus number is required and must be a string';
  }

  if (busNumber.trim().length === 0) {
    return 'Bus number cannot be empty';
  }

  if (busNumber.length > 20) {
    return 'Bus number cannot be longer than 20 characters';
  }

  return null;
};

export const validateRouteName = (routeName: string): string | null => {
  if (!routeName || typeof routeName !== 'string') {
    return 'Route name is required and must be a string';
  }

  if (routeName.trim().length === 0) {
    return 'Route name cannot be empty';
  }

  if (routeName.length > 100) {
    return 'Route name cannot be longer than 100 characters';
  }

  return null;
};

export const validateRouteData = (
  routeData: Record<string, unknown>
): string | null => {
  // Validate name
  const name = routeData.name;
  if (typeof name !== 'string') {
    return 'Route name is required and must be a string';
  }
  const nameError = validateRouteName(name);
  if (nameError) return nameError;

  // Validate description
  if (!routeData.description || typeof routeData.description !== 'string') {
    return 'Description is required and must be a string';
  }

  if (routeData.description.trim().length === 0) {
    return 'Description cannot be empty';
  }

  // Validate coordinates
  if (!routeData.coordinates || !Array.isArray(routeData.coordinates)) {
    return 'Coordinates are required and must be an array';
  }

  if (routeData.coordinates.length < 2) {
    return 'Route must have at least 2 coordinate points';
  }

  // Validate each coordinate
  for (let i = 0; i < routeData.coordinates.length; i++) {
    const coord = routeData.coordinates[i];
    if (!Array.isArray(coord) || coord.length !== 2) {
      return `Coordinate ${i + 1} must be an array with 2 elements [longitude, latitude]`;
    }

    const [lng, lat] = coord;
    if (typeof lng !== 'number' || isNaN(lng)) {
      return `Longitude at coordinate ${i + 1} must be a valid number`;
    }

    if (lng < -180 || lng > 180) {
      return `Longitude at coordinate ${i + 1} must be between -180 and 180 degrees`;
    }

    if (typeof lat !== 'number' || isNaN(lat)) {
      return `Latitude at coordinate ${i + 1} must be a valid number`;
    }

    if (lat < -90 || lat > 90) {
      return `Latitude at coordinate ${i + 1} must be between -90 and 90 degrees`;
    }
  }

  // Validate distance
  if (
    typeof routeData.distance_km !== 'number' ||
    isNaN(routeData.distance_km)
  ) {
    return 'Distance must be a valid number';
  }

  if (routeData.distance_km <= 0) {
    return 'Distance must be greater than 0';
  }

  // Validate duration
  if (
    typeof routeData.estimated_duration_minutes !== 'number' ||
    isNaN(routeData.estimated_duration_minutes)
  ) {
    return 'Estimated duration must be a valid number';
  }

  if (routeData.estimated_duration_minutes <= 0) {
    return 'Estimated duration must be greater than 0';
  }

  return null; // No validation errors
};
