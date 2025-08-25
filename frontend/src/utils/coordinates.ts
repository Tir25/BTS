// Coordinate utilities for the bus management system

export interface Location {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
  city: string;
}

// Ganpat University coordinates (verified from distancesfrom.com)
export const GANPAT_UNIVERSITY: Location = {
  name: 'Ganpat University',
  coordinates: [72.4563, 23.5295], // [longitude, latitude] - Correct coordinates
  address: 'Ganpat Vidyanagar, Mehsana-Gozaria Highway, Kherva, Gujarat 384012',
  city: 'Mehsana',
};

// Common cities in Gujarat for reference
export const GUJARAT_CITIES: Location[] = [
  {
    name: 'Ahmedabad',
    coordinates: [72.5714, 23.0225],
    address: 'Ahmedabad, Gujarat, India',
    city: 'Ahmedabad',
  },
  {
    name: 'Gandhinagar',
    coordinates: [72.6369, 23.2154], // Gandhinagar coordinates (different from Ganpat University)
    address: 'Gandhinagar, Gujarat, India',
    city: 'Gandhinagar',
  },
  {
    name: 'Vadodara',
    coordinates: [73.1811, 22.3072],
    address: 'Vadodara, Gujarat, India',
    city: 'Vadodara',
  },
  {
    name: 'Surat',
    coordinates: [72.8311, 21.1702],
    address: 'Surat, Gujarat, India',
    city: 'Surat',
  },
  {
    name: 'Rajkot',
    coordinates: [70.8022, 22.3039],
    address: 'Rajkot, Gujarat, India',
    city: 'Rajkot',
  },
];

// Function to verify coordinates
export const verifyCoordinates = (coordinates: [number, number]): boolean => {
  const [lng, lat] = coordinates;

  // Check if coordinates are within reasonable bounds for Gujarat, India
  return lng >= 68 && lng <= 75 && lat >= 20 && lat <= 25;
};

// Function to get distance between two points (Haversine formula)
export const calculateDistance = (
  point1: [number, number],
  point2: [number, number]
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((point2[1] - point1[1]) * Math.PI) / 180;
  const dLon = ((point2[0] - point1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1[1] * Math.PI) / 180) *
      Math.cos((point2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Function to format coordinates for display
export const formatCoordinates = (coordinates: [number, number]): string => {
  const [lng, lat] = coordinates;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

// Function to get location name from coordinates (approximate)
export const getLocationName = (coordinates: [number, number]): string => {
  const [lng, lat] = coordinates;

  // Check if it's Ganpat University (correct coordinates)
  if (Math.abs(lng - 72.4563) < 0.01 && Math.abs(lat - 23.5295) < 0.01) {
    return 'Ganpat University';
  }

  // Check other known locations
  for (const city of GUJARAT_CITIES) {
    if (
      Math.abs(lng - city.coordinates[0]) < 0.1 &&
      Math.abs(lat - city.coordinates[1]) < 0.1
    ) {
      return city.name;
    }
  }

  return 'Unknown Location';
};
