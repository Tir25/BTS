import { logger } from '../../utils/logger';
import { validateGPSLocation } from '../../utils/gpsValidation';

export interface LocationUpdateData {
  driverId: string;
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

/**
 * Location throttler for WebSocket
 * Handles deduplication and throttling of location updates
 */
export class LocationThrottler {
  private lastSentLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null = null;
  private lastSendTime: number = 0;
  private readonly MIN_SEND_INTERVAL = 500; // Reduced from 1000ms to 500ms for desktop GPS
  private readonly MIN_DISTANCE_THRESHOLD = 1; // Reduced from 5m to 1m for desktop GPS
  private readonly RAPID_DUPLICATE_THRESHOLD = 50; // Reduced from 100ms to 50ms
  private sendThrottleTimeout: NodeJS.Timeout | null = null;
  private pendingLocationUpdatesQueue: LocationUpdateData[] = [];
  private readonly MAX_QUEUE_SIZE = 10;
  private locationMessageQueue: Map<string, number> = new Map();
  private readonly QUEUE_CLEANUP_INTERVAL = 5000;

  /**
   * Calculate distance between two coordinates in meters (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if location update should be sent immediately or queued
   */
  shouldSendImmediately(locationData: LocationUpdateData): {
    shouldSend: boolean;
    reason?: string;
  } {
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;

    // LAYER 1: Rapid duplicate detection
    if (timeSinceLastSend < this.RAPID_DUPLICATE_THRESHOLD) {
      const locationKey = `${locationData.latitude.toFixed(6)}_${locationData.longitude.toFixed(6)}`;
      const lastSendTimeForLocation = this.locationMessageQueue.get(locationKey);
      
      if (lastSendTimeForLocation && (now - lastSendTimeForLocation) < this.RAPID_DUPLICATE_THRESHOLD) {
        return { shouldSend: false, reason: 'rapid_duplicate' };
      }
    }

    // LAYER 2: Check if this is an exact duplicate location
    if (this.lastSentLocation) {
      const latDiff = Math.abs(this.lastSentLocation.latitude - locationData.latitude);
      const lngDiff = Math.abs(this.lastSentLocation.longitude - locationData.longitude);
      
      // Exact match (within floating point precision)
      if (latDiff < 0.000001 && lngDiff < 0.000001 && timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        return { shouldSend: false, reason: 'exact_duplicate' };
      }

      // LAYER 3: Distance-based deduplication
      const distance = this.calculateDistance(
        this.lastSentLocation.latitude,
        this.lastSentLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );

      if (distance < this.MIN_DISTANCE_THRESHOLD && timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        return { shouldSend: false, reason: 'distance_threshold' };
      }
    }

    // LAYER 4: Time-based throttling
    if (timeSinceLastSend < this.MIN_SEND_INTERVAL) {
      return { shouldSend: false, reason: 'time_throttle' };
    }

    return { shouldSend: true };
  }

  /**
   * Queue location update for later sending
   */
  queueLocationUpdate(locationData: LocationUpdateData, onSend: (data: LocationUpdateData) => void): void {
    // Prevent queue overflow
    if (this.pendingLocationUpdatesQueue.length >= this.MAX_QUEUE_SIZE) {
      const removed = this.pendingLocationUpdatesQueue.shift();
      logger.warn('Queue overflow: Removing oldest pending update', 'component', {
        queueSize: this.pendingLocationUpdatesQueue.length,
        removedUpdate: removed ? { lat: removed.latitude, lng: removed.longitude } : null
      });
    }
    
    this.pendingLocationUpdatesQueue.push(locationData);
    
    // If no throttle timeout is set, set one to process queue
    if (!this.sendThrottleTimeout) {
      const now = Date.now();
      const timeSinceLastSend = now - this.lastSendTime;
      const remainingTime = this.MIN_SEND_INTERVAL - timeSinceLastSend;
      
      this.sendThrottleTimeout = setTimeout(() => {
        this.processPendingQueue(onSend);
        this.sendThrottleTimeout = null;
      }, Math.max(remainingTime, 0));
    }
  }

  /**
   * Process pending location updates queue
   */
  private processPendingQueue(onSend: (data: LocationUpdateData) => void): void {
    if (this.pendingLocationUpdatesQueue.length === 0) {
      return;
    }

    // Send the oldest update in queue (FIFO)
    const updateToSend = this.pendingLocationUpdatesQueue.shift();
    if (updateToSend) {
      logger.debug('📤 Processing queued location update', 'component', {
        queueSize: this.pendingLocationUpdatesQueue.length,
        lat: updateToSend.latitude,
        lng: updateToSend.longitude
      });
      
      this.sendLocationUpdate(updateToSend, onSend);
      
      // If there are more updates in queue, schedule next send
      if (this.pendingLocationUpdatesQueue.length > 0 && !this.sendThrottleTimeout) {
        this.sendThrottleTimeout = setTimeout(() => {
          this.processPendingQueue(onSend);
          this.sendThrottleTimeout = null;
        }, this.MIN_SEND_INTERVAL);
      }
    }
  }

  /**
   * Send location update (marks as sent and updates tracking)
   */
  sendLocationUpdate(locationData: LocationUpdateData, onSend: (data: LocationUpdateData) => void): void {
    const now = Date.now();
    const locationKey = `${locationData.latitude.toFixed(6)}_${locationData.longitude.toFixed(6)}`;

    // Validate GPS location before sending
    const timestampMs = new Date(locationData.timestamp).getTime();
    const validation = validateGPSLocation({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: timestampMs,
      speed: locationData.speed,
      heading: locationData.heading,
    }, locationData.driverId, locationData.busId);

    if (!validation.isValid && validation.shouldReject) {
      logger.warn('GPS location update rejected before sending', 'UnifiedWebSocketService', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        driverId: locationData.driverId,
        busId: locationData.busId,
        error: validation.error,
        rejectionReason: validation.rejectionReason,
      });
      return;
    }

    if (validation.shouldWarn && validation.warning) {
      logger.warn('GPS location update warning', 'UnifiedWebSocketService', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        warning: validation.warning,
      });
    }

    // Send the update
    onSend(locationData);
    
    // Update tracking for all deduplication layers
    this.lastSentLocation = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: now,
    };
    this.lastSendTime = now;
    
    // Track in message queue for rapid duplicate detection
    this.locationMessageQueue.set(locationKey, now);
    
    // Clean up old queue entries periodically
    if (this.locationMessageQueue.size > 100) {
      const cutoffTime = now - this.QUEUE_CLEANUP_INTERVAL;
      for (const [key, timestamp] of this.locationMessageQueue.entries()) {
        if (timestamp < cutoffTime) {
          this.locationMessageQueue.delete(key);
        }
      }
    }
    
    logger.info('✅ Location update sent successfully', 'component');
  }

  /**
   * Process location update with throttling and deduplication
   */
  processLocationUpdate(
    locationData: LocationUpdateData,
    onSend: (data: LocationUpdateData) => void
  ): void {
    const check = this.shouldSendImmediately(locationData);
    
    if (!check.shouldSend) {
      logger.debug(`🚫 BLOCKED: ${check.reason}`, 'component', {
        lat: locationData.latitude,
        lng: locationData.longitude,
      });
      
      if (check.reason === 'time_throttle') {
        // Queue for later
        this.queueLocationUpdate(locationData, onSend);
      }
      return;
    }

    // Clear any pending throttle and process queue if needed
    if (this.sendThrottleTimeout) {
      clearTimeout(this.sendThrottleTimeout);
      this.sendThrottleTimeout = null;
      
      // Process any queued updates before sending new one
      if (this.pendingLocationUpdatesQueue.length > 0) {
        logger.debug('Processing pending queue before immediate send', 'component', {
          queueSize: this.pendingLocationUpdatesQueue.length
        });
        this.processPendingQueue(onSend);
      }
    }

    // All checks passed - send immediately
    this.sendLocationUpdate(locationData, onSend);
  }

  /**
   * Reset throttler state
   */
  reset(): void {
    this.lastSentLocation = null;
    this.lastSendTime = 0;
    this.pendingLocationUpdatesQueue = [];
    if (this.sendThrottleTimeout) {
      clearTimeout(this.sendThrottleTimeout);
      this.sendThrottleTimeout = null;
    }
    this.locationMessageQueue.clear();
  }
}

// Export singleton instance
export const locationThrottler = new LocationThrottler();

