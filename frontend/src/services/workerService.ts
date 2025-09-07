import { BusLocation } from '../types';

interface WorkerResponse {
  type: string;
  data: Record<string, unknown>;
}

class WorkerService {
  private worker: Worker | null = null;
  private callbacks: Map<string, (...args: any[]) => void> = new Map();
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof Worker !== 'undefined';
    if (this.isSupported) {
      this.initializeWorker();
    }
  }

  private initializeWorker(): void {
    try {
      this.worker = new Worker(
        new URL('../workers/calculations.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, data } = event.data;
        const callback = this.callbacks.get(type);
        if (callback) {
          callback(data);
          this.callbacks.delete(type);
        }
      };

      this.worker.onerror = error => {
        console.error('❌ Worker error:', error);
      };
    } catch (error) {
      console.warn('⚠️ Web Worker not supported, falling back to main thread');
      this.isSupported = false;
    }
  }

  // Calculate speed using Web Worker or fallback to main thread
  async calculateSpeed(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    timeDiffMs: number
  ): Promise<number> {
    if (!this.isSupported || !this.worker) {
      return this.calculateSpeedFallback(lat1, lon1, lat2, lon2, timeDiffMs);
    }

    return new Promise(resolve => {
      this.callbacks.set('SPEED_CALCULATED', resolve);
      this.worker!.postMessage({
        type: 'CALCULATE_SPEED',
        data: { lat1, lon1, lat2, lon2, timeDiffMs },
      });
    });
  }

  // Calculate ETA using Web Worker or fallback to main thread
  async calculateETA(
    currentLocation: BusLocation,
    destination: { latitude: number; longitude: number },
    averageSpeed: number = 30
  ): Promise<{
    estimated_arrival_minutes: number;
    distance_remaining: number;
    is_near_stop: boolean;
  }> {
    if (!this.isSupported || !this.worker) {
      return this.calculateETAFallback(
        currentLocation,
        destination,
        averageSpeed
      );
    }

    return new Promise(resolve => {
      this.callbacks.set('ETA_CALCULATED', resolve);
      this.worker!.postMessage({
        type: 'CALCULATE_ETA',
        data: { currentLocation, destination, averageSpeed },
      });
    });
  }

  // Calculate distance using Web Worker or fallback to main thread
  async calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): Promise<number> {
    if (!this.isSupported || !this.worker) {
      return this.calculateDistanceFallback(point1, point2);
    }

    return new Promise(resolve => {
      this.callbacks.set(
        'DISTANCE_CALCULATED',
        resolve as (value: unknown) => void
      );
      this.worker!.postMessage({
        type: 'CALCULATE_DISTANCE',
        data: { point1, point2 },
      });
    });
  }

  // Fallback calculations for main thread
  private calculateSpeedFallback(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    timeDiffMs: number
  ): number {
    const distance = this.calculateDistanceFallback(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    const speed = distance / timeDiffHours;
    return Math.round(speed * 10) / 10;
  }

  private calculateETAFallback(
    currentLocation: BusLocation,
    destination: { latitude: number; longitude: number },
    averageSpeed: number = 30
  ): {
    estimated_arrival_minutes: number;
    distance_remaining: number;
    is_near_stop: boolean;
  } {
    const distance = this.calculateDistanceFallback(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      destination
    );

    const estimatedTimeHours = distance / averageSpeed;
    const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);
    const isNearStop = distance < 0.5;

    return {
      estimated_arrival_minutes: estimatedTimeMinutes,
      distance_remaining: Math.round(distance * 10) / 10,
      is_near_stop: isNearStop,
    };
  }

  private calculateDistanceFallback(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Cleanup worker
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.callbacks.clear();
  }
}

export const workerService = new WorkerService();
