// Web Worker for heavy calculations to avoid blocking the main thread
export interface CalculationRequest {
  type: 'distance' | 'eta' | 'clustering' | 'routeOptimization';
  data: unknown;
  id: string;
}

export interface CalculationResponse {
  type: string;
  data: unknown;
  id: string;
  success: boolean;
  error?: string;
}

// Distance calculation between two points using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate ETA based on distance and speed
const calculateETA = (
  distance: number,
  speed: number,
  currentTime: Date
): { eta: Date; duration: number } => {
  const durationHours = distance / speed;
  const durationMinutes = durationHours * 60;
  const eta = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);

  return {
    eta,
    duration: durationMinutes,
  };
};

// Spatial clustering algorithm for bus locations
const calculateClusters = (
  locations: Array<{ lat: number; lng: number; id: string }>,
  radius: number
): Array<{
  center: { lat: number; lng: number };
  buses: string[];
  count: number;
}> => {
  const clusters: Array<{
    center: { lat: number; lng: number };
    buses: string[];
    count: number;
  }> = [];
  const processed = new Set<string>();

  locations.forEach(location => {
    if (processed.has(location.id)) return;

    const clusterBuses = [location.id];
    processed.add(location.id);

    locations.forEach(otherLocation => {
      if (processed.has(otherLocation.id)) return;

      const distance = calculateDistance(
        location.lat,
        location.lng,
        otherLocation.lat,
        otherLocation.lng
      );

      if (distance <= radius) {
        clusterBuses.push(otherLocation.id);
        processed.add(otherLocation.id);
      }
    });

    if (clusterBuses.length > 1) {
      // Calculate cluster center
      const clusterLocations = locations.filter(loc =>
        clusterBuses.includes(loc.id)
      );
      const centerLat =
        clusterLocations.reduce((sum, loc) => sum + loc.lat, 0) /
        clusterLocations.length;
      const centerLng =
        clusterLocations.reduce((sum, loc) => sum + loc.lng, 0) /
        clusterLocations.length;

      clusters.push({
        center: { lat: centerLat, lng: centerLng },
        buses: clusterBuses,
        count: clusterBuses.length,
      });
    }
  });

  return clusters;
};

// Route optimization using nearest neighbor algorithm
const optimizeRoute = (
  stops: Array<{ lat: number; lng: number; id: string }>
): Array<string> => {
  if (stops.length <= 2) {
    return stops.map(stop => stop.id);
  }

  const route: string[] = [];
  const unvisited = new Set(stops.map(stop => stop.id));
  let current = stops[0];

  route.push(current.id);
  unvisited.delete(current.id);

  while (unvisited.size > 0) {
    let minDistance = Infinity;
    let nearest: { lat: number; lng: number; id: string } | null = null;

    for (const stop of stops) {
      if (!unvisited.has(stop.id)) continue;

      const distance = calculateDistance(
        current.lat,
        current.lng,
        stop.lat,
        stop.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = stop;
      }
    }

    if (nearest) {
      route.push(nearest.id);
      unvisited.delete(nearest.id);
      current = nearest;
    }
  }

  return route;
};

// Main worker message handler
self.addEventListener('message', (event: MessageEvent<CalculationRequest>) => {
  const { type, data, id } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case 'distance': {
        const { lat1, lon1, lat2, lon2 } = data as {
          lat1: number;
          lon1: number;
          lat2: number;
          lon2: number;
        };
        result = calculateDistance(lat1, lon1, lat2, lon2);
        break;
      }

      case 'eta': {
        const { distance, speed, currentTime } = data as {
          distance: number;
          speed: number;
          currentTime: string;
        };
        result = calculateETA(distance, speed, new Date(currentTime));
        break;
      }

      case 'clustering': {
        const { locations, radius } = data as {
          locations: Array<{ lat: number; lng: number; id: string }>;
          radius: number;
        };
        result = calculateClusters(locations, radius);
        break;
      }

      case 'routeOptimization': {
        const { stops } = data as {
          stops: Array<{ lat: number; lng: number; id: string }>;
        };
        result = optimizeRoute(stops);
        break;
      }

      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }

    const response: CalculationResponse = {
      type,
      data: result,
      id,
      success: true,
    };

    self.postMessage(response);
  } catch (error) {
    const response: CalculationResponse = {
      type,
      data: null,
      id,
      success: false,
      error: (error as Error).message || 'Unknown error',
    };

    self.postMessage(response);
  }
});
