// Web Worker for heavy calculations
const ctx: Worker = self as any;

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ETACalculation {
  estimated_arrival_minutes: number;
  distance_remaining: number;
  is_near_stop: boolean;
}

interface WorkerMessage {
  type: 'CALCULATE_SPEED' | 'CALCULATE_ETA' | 'CALCULATE_DISTANCE';
  data: any;
}

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate speed between two points
function calculateSpeed(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  timeDiffMs: number
): number {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60); // Convert to hours
  const speed = distance / timeDiffHours; // Speed in km/h
  return Math.round(speed * 10) / 10; // Round to 1 decimal place
}

// Calculate ETA to destination
function calculateETA(
  currentLocation: LocationData,
  destination: { latitude: number; longitude: number },
  averageSpeed: number = 30 // Default average speed in km/h
): ETACalculation {
  const distance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    destination.latitude,
    destination.longitude
  );

  const estimatedTimeHours = distance / averageSpeed;
  const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);
  const isNearStop = distance < 0.5; // Within 500 meters

  return {
    estimated_arrival_minutes: estimatedTimeMinutes,
    distance_remaining: Math.round(distance * 10) / 10,
    is_near_stop: isNearStop,
  };
}

// Handle worker messages
ctx.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'CALCULATE_SPEED':
        const { lat1, lon1, lat2, lon2, timeDiffMs } = data;
        const speed = calculateSpeed(lat1, lon1, lat2, lon2, timeDiffMs);
        ctx.postMessage({ type: 'SPEED_CALCULATED', data: speed });
        break;

      case 'CALCULATE_ETA':
        const { currentLocation, destination, averageSpeed } = data;
        const eta = calculateETA(currentLocation, destination, averageSpeed);
        ctx.postMessage({ type: 'ETA_CALCULATED', data: eta });
        break;

      case 'CALCULATE_DISTANCE':
        const { point1, point2 } = data;
        const distance = calculateDistance(
          point1.latitude,
          point1.longitude,
          point2.latitude,
          point2.longitude
        );
        ctx.postMessage({ type: 'DISTANCE_CALCULATED', data: distance });
        break;

      default:
        ctx.postMessage({ type: 'ERROR', data: 'Unknown message type' });
    }
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      data: (error as Error).message || 'Unknown error',
    });
  }
});

export {};
