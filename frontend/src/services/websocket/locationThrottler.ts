import { logger } from '../../utils/logger';
import { validateGPSLocation } from '../../utils/gpsValidation';
import { detectGPSDeviceInfo } from '../../utils/gpsDetection';

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
 * PRODUCTION FIX: Adaptive throttling based on device GPS capabilities
 */
export class LocationThrottler {
  private lastSentLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null = null;
  private lastSendTime: number = 0;
  private deviceInfo = detectGPSDeviceInfo();
  // PRODUCTION FIX: Adaptive thresholds based on device type
  // Desktop GPS has low accuracy, so we need more lenient thresholds
  private readonly MIN_SEND_INTERVAL = 1000; // Aligned with backend rate limiter (1000ms)
  private readonly MIN_DISTANCE_THRESHOLD = this.deviceInfo.hasGPSHardware ? 5 : 100; // 5m for GPS, 100m for desktop (IP-based)
  private readonly RAPID_DUPLICATE_THRESHOLD = 100; // 100ms for rapid duplicate detection
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
    // PRODUCTION FIX: More lenient duplicate detection for desktop GPS
    if (this.lastSentLocation) {
      const latDiff = Math.abs(this.lastSentLocation.latitude - locationData.latitude);
      const lngDiff = Math.abs(this.lastSentLocation.longitude - locationData.longitude);
      
      // PRODUCTION FIX: For desktop GPS (IP-based), use coarser precision check
      // Desktop GPS can have same coordinates even when device moves slightly
      const precisionThreshold = this.deviceInfo.hasGPSHardware ? 0.000001 : 0.0001; // ~11m for desktop
      
      // Exact match (within device-appropriate precision)
      if (latDiff < precisionThreshold && lngDiff < precisionThreshold && timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        // PRODUCTION FIX: For desktop GPS, allow updates even if coordinates are same if enough time has passed
        // This handles the case where IP-based location doesn't change but we still want periodic updates
        // Reduced threshold from 2x to 1.5x for more frequent updates on desktop
        if (!this.deviceInfo.hasGPSHardware && timeSinceLastSend >= this.MIN_SEND_INTERVAL * 1.5) {
          // Allow update if it's been 1.5x the minimum interval (ensures periodic updates even with static location)
          logger.debug('Allowing desktop GPS periodic update (same coordinates)', 'component', {
            timeSinceLastSend,
            threshold: this.MIN_SEND_INTERVAL * 1.5,
          });
          return { shouldSend: true };
        }
        return { shouldSend: false, reason: 'exact_duplicate' };
      }

      // LAYER 3: Distance-based deduplication
      const distance = this.calculateDistance(
        this.lastSentLocation.latitude,
        this.lastSentLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );

      // PRODUCTION FIX: For desktop GPS, allow updates if enough time has passed even if distance is small
      if (distance < this.MIN_DISTANCE_THRESHOLD && timeSinceLastSend < this.MIN_SEND_INTERVAL) {
        return { shouldSend: false, reason: 'distance_threshold' };
      }
      
      // PRODUCTION FIX: For desktop GPS, allow periodic updates even if distance is small
      // Reduced threshold from 3x to 2x for more frequent updates on desktop
      if (!this.deviceInfo.hasGPSHardware && distance < this.MIN_DISTANCE_THRESHOLD && timeSinceLastSend >= this.MIN_SEND_INTERVAL * 2) {
        // Allow update if it's been 2x the minimum interval (ensures periodic updates)
        logger.debug('Allowing desktop GPS periodic update (small distance)', 'component', {
          distance,
          timeSinceLastSend,
          threshold: this.MIN_SEND_INTERVAL * 2,
        });
        return { shouldSend: true };
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
      let cleanedCount = 0;
      for (const [key, timestamp] of this.locationMessageQueue.entries()) {
        if (timestamp < cutoffTime) {
          this.locationMessageQueue.delete(key);
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        logger.debug('Cleaned up old location queue entries', 'component', {
          cleanedCount,
          remainingSize: this.locationMessageQueue.size
        });
      }
    }
    
    logger.debug('✅ Location update sent successfully', 'component', {
      driverId: locationData.driverId,
      busId: locationData.busId,
      lat: locationData.latitude,
      lng: locationData.longitude,
      queueSize: this.pendingLocationUpdatesQueue.length,
    });
  }

  /**
   * Process location update with throttling and deduplication
   * PRODUCTION FIX: Enhanced processing with better queue management
   */
  processLocationUpdate(
    locationData: LocationUpdateData,
    onSend: (data: LocationUpdateData) => void
  ): void {
    const check = this.shouldSendImmediately(locationData);
    
    if (!check.shouldSend) {
      // PRODUCTION FIX: Better logging for blocked updates
      logger.debug(`🚫 BLOCKED: ${check.reason}`, 'component', {
        lat: locationData.latitude,
        lng: locationData.longitude,
        driverId: locationData.driverId,
        busId: locationData.busId,
        deviceType: this.deviceInfo.deviceType,
        hasGPSHardware: this.deviceInfo.hasGPSHardware,
        timeSinceLastSend: Date.now() - this.lastSendTime,
      });
      
      if (check.reason === 'time_throttle') {
        // Queue for later
        this.queueLocationUpdate(locationData, onSend);
      } else if (check.reason === 'exact_duplicate' || check.reason === 'distance_threshold') {
        // PRODUCTION FIX: For desktop GPS, queue duplicate updates if enough time has passed
        // This ensures periodic updates even when location doesn't change
        // Reduced threshold from 2x to 1.5x for more frequent updates
        if (!this.deviceInfo.hasGPSHardware) {
          const timeSinceLastSend = Date.now() - this.lastSendTime;
          if (timeSinceLastSend >= this.MIN_SEND_INTERVAL * 1.5) {
            // Queue for sending after minimum interval
            this.queueLocationUpdate(locationData, onSend);
            logger.debug('Queued desktop GPS update (periodic update despite duplicate)', 'component', {
              timeSinceLastSend,
              threshold: this.MIN_SEND_INTERVAL * 1.5,
            });
            return;
          }
        }
        // For other reasons (duplicates, etc.), just skip silently
        logger.debug('Location update skipped (duplicate or invalid)', 'component', {
          reason: check.reason,
          lat: locationData.latitude,
          lng: locationData.longitude,
          deviceType: this.deviceInfo.deviceType,
        });
      } else {
        // For other reasons, just skip silently
        logger.debug('Location update skipped', 'component', {
          reason: check.reason,
          lat: locationData.latitude,
          lng: locationData.longitude,
        });
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
          queueSize: this.pendingLocationUpdatesQueue.length,
          driverId: locationData.driverId,
          busId: locationData.busId,
        });
        this.processPendingQueue(onSend);
      }
    }

    // All checks passed - send immediately
    this.sendLocationUpdate(locationData, onSend);
  }

  /**
   * Reset throttler state
   * PRODUCTION FIX: Re-detect device info on reset (in case device changes)
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
    // Re-detect device info in case device capabilities changed
    this.deviceInfo = detectGPSDeviceInfo();
  }
}

// Export singleton instance
export const locationThrottler = new LocationThrottler();

