import { logger } from '../../utils/logger';
import { validateGPSLocation } from '../../utils/gpsValidation';
import { 
  getOptimalPositionOptions, 
  getAccuracyMessage,
  isAccuracyAcceptable,
  shouldWarnAboutAccuracy 
} from '../../utils/gpsDetection';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  heading?: number;
  speed?: number;
}

/**
 * Tracking manager for location services
 * Handles watchPosition, polling fallback, and heartbeat
 */
export class TrackingManager {
  private watchId: number | null = null;
  private watchPositionMonitorInterval: NodeJS.Timeout | null = null;
  private pollFallbackInterval: NodeJS.Timeout | null = null;
  private persistentHeartbeatInterval: NodeJS.Timeout | null = null;
  private watchPositionProactiveRestartInterval: NodeJS.Timeout | null = null;
  
  private lastUpdateTime: number = 0;
  private consecutiveFailures: number = 0;
  private isUsingPollFallback = false;
  private lastPollAttempt: number = 0;
  private trackingStartTime: number = 0;
  private pollFallbackFailures: number = 0; // Track consecutive poll fallback failures
  private pollFallbackBackoffMs: number = 5000; // Exponential backoff starting at 5 seconds
  private pollFallbackCircuitBreakerOpen: boolean = false; // Circuit breaker state
  private lastSuccessfulPollTime: number = 0; // Track last successful poll
  
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  // CRITICAL FIX: Increased timeout for mobile GPS - GPS can take 20-45 seconds to acquire signal
  private readonly UPDATE_TIMEOUT_MS = 60000; // 60 seconds - allow more time for GPS to acquire signal
  private readonly POLL_FALLBACK_INTERVAL_MS = 5000; // 5 seconds
  private readonly POLL_FALLBACK_ENABLED = true;
  private readonly LOCATION_REQUEST_TIMEOUT_MS = 45000; // 45 seconds for mobile GPS (was 15s - too short)
  private readonly PERSISTENT_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly WATCHPOSITION_RESTART_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
  // Grace period for GPS to acquire signal - don't call getCurrentLocation during this time
  private readonly GPS_ACQUISITION_GRACE_PERIOD_MS = 60000; // 60 seconds for GPS devices
  // Poll fallback configuration
  private readonly POLL_FALLBACK_GRACE_PERIOD_MS = 30000; // 30 seconds - wait before starting poll fallback
  private readonly POLL_FALLBACK_MAX_FAILURES = 5; // Stop poll fallback after 5 consecutive failures
  private readonly POLL_FALLBACK_MAX_BACKOFF_MS = 60000; // Maximum backoff of 60 seconds
  private readonly POLL_FALLBACK_CIRCUIT_BREAKER_RESET_MS = 120000; // Reset circuit breaker after 2 minutes
  private readonly POLL_FALLBACK_WATCHPOSITION_ACTIVE_THRESHOLD_MS = 10000; // If watchPosition updated in last 10s, don't poll

  private deviceInfo: ReturnType<typeof import('../../utils/gpsDetection').detectGPSDeviceInfo>;
  private locationListeners: Set<(location: LocationData) => void> = new Set();
  private errorListeners: Set<(error: any) => void> = new Set();
  private getCurrentLocation: () => Promise<LocationData | null>;
  private calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;

  constructor(
    deviceInfo: ReturnType<typeof import('../../utils/gpsDetection').detectGPSDeviceInfo>,
    locationListeners: Set<(location: LocationData) => void>,
    errorListeners: Set<(error: any) => void>,
    getCurrentLocation: () => Promise<LocationData | null>,
    calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number
  ) {
    this.deviceInfo = deviceInfo;
    this.locationListeners = locationListeners;
    this.errorListeners = errorListeners;
    this.getCurrentLocation = getCurrentLocation;
    this.calculateDistance = calculateDistance;
  }

  /**
   * Start watchPosition with improved config
   */
  startWatchPosition(
    onLocationUpdate: (location: LocationData) => void,
    onError: (error: GeolocationPositionError) => void
  ): void {
    // Clear existing watch if any
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    const watchOptions = getOptimalPositionOptions(this.deviceInfo);
    
    logger.info('Starting watchPosition with device-optimized options', 'LocationService', {
      enableHighAccuracy: watchOptions.enableHighAccuracy,
      timeout: watchOptions.timeout,
      maximumAge: watchOptions.maximumAge,
      deviceType: this.deviceInfo.deviceType,
      hasGPSHardware: this.deviceInfo.hasGPSHardware,
    });

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.consecutiveFailures = 0;
        this.lastUpdateTime = Date.now();

        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed ? position.coords.speed * 3.6 : undefined,
        };

        // Validate GPS location
        const validation = validateGPSLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
        });

        if (!validation.isValid && validation.shouldReject) {
          logger.warn('GPS location rejected - invalid coordinates or stale data', 'LocationService', {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            error: validation.error,
            rejectionReason: validation.rejectionReason,
            deviceType: this.deviceInfo.deviceType,
          });
          
          this.consecutiveFailures++;
          
          if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
            logger.error('Multiple consecutive location rejections - GPS may be unstable', 'LocationService', {
              consecutiveFailures: this.consecutiveFailures,
            });
          }
          
          return;
        }

        if (validation.shouldWarn && validation.warning) {
          const accuracyMsg = getAccuracyMessage(location.accuracy, this.deviceInfo);
          logger.warn('GPS location warning - low accuracy but accepted', 'LocationService', {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            warning: validation.warning,
            deviceType: this.deviceInfo.deviceType,
            accuracyMessage: accuracyMsg.message,
            severity: accuracyMsg.severity,
          });
        }
        
        // Warn about IP-based positioning
        if (location.accuracy > 1000) {
          logger.warn('⚠️ IP-based positioning detected - location may be inaccurate', 'LocationService', {
            accuracy: location.accuracy,
            latitude: location.latitude,
            longitude: location.longitude,
            deviceType: this.deviceInfo.deviceType,
            hasGPSHardware: this.deviceInfo.hasGPSHardware,
            warning: 'Browser is using IP-based location (city/region level, not GPS coordinates)',
            recommendation: 'For accurate tracking, use a mobile device with GPS hardware'
          });
        }
        
        if (!isAccuracyAcceptable(location.accuracy, this.deviceInfo)) {
          logger.warn('GPS accuracy below acceptable threshold for device', 'LocationService', {
            accuracy: location.accuracy,
            deviceType: this.deviceInfo.deviceType,
            threshold: this.deviceInfo.accuracyWarningThreshold,
          });
        }

        onLocationUpdate(location);
      },
      (error) => {
        this.consecutiveFailures++;
        this.lastUpdateTime = Date.now();
        onError(error);

        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          logger.warn('Too many consecutive errors - restarting watchPosition', 'LocationService', {
            consecutiveFailures: this.consecutiveFailures,
          });
          this.restartWatchPosition(onLocationUpdate, onError);
        }
      },
      watchOptions
    );

    logger.info('watchPosition started with improved configuration', 'LocationService', {
      enableHighAccuracy: watchOptions.enableHighAccuracy,
      timeout: watchOptions.timeout,
      maximumAge: watchOptions.maximumAge,
    });
  }

  /**
   * Start monitoring for watchPosition inactivity
   */
  startWatchPositionMonitoring(
    onInactive: () => void
  ): void {
    if (this.watchPositionMonitorInterval) {
      clearInterval(this.watchPositionMonitorInterval);
    }

    this.watchPositionMonitorInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
      
      if (timeSinceLastUpdate > this.UPDATE_TIMEOUT_MS) {
        logger.warn('watchPosition appears inactive - restarting and enabling fallback', 'LocationService', {
          timeSinceLastUpdate: `${Math.round(timeSinceLastUpdate / 1000)  }s`,
          lastUpdateTime: new Date(this.lastUpdateTime).toISOString(),
          deviceType: this.deviceInfo.deviceType,
        });
        
        onInactive();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Start polling fallback for desktop browsers
   * PRODUCTION FIX: Only activate when watchPosition is not providing updates
   * - Respects GPS acquisition grace period
   * - Checks if watchPosition is working before polling
   * - Implements circuit breaker to stop after repeated failures
   * - Uses exponential backoff for failures
   */
  startPollFallback(
    onLocationUpdate: (location: LocationData) => void,
    getLastLocation: () => LocationData | null
  ): void {
    if (this.pollFallbackInterval) {
      clearInterval(this.pollFallbackInterval);
    }

    // Reset poll fallback state
    this.pollFallbackFailures = 0;
    this.pollFallbackBackoffMs = this.POLL_FALLBACK_INTERVAL_MS;
    this.pollFallbackCircuitBreakerOpen = false;
    this.lastSuccessfulPollTime = 0;

    const pollInterval = this.deviceInfo.hasGPSHardware ? 
      this.POLL_FALLBACK_INTERVAL_MS : 
      Math.min(this.POLL_FALLBACK_INTERVAL_MS, 3000); // 3 seconds for desktop

    this.pollFallbackInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceTrackingStart = now - this.trackingStartTime;
      const timeSinceLastPoll = now - this.lastPollAttempt;
      const timeSinceLastUpdate = now - this.lastUpdateTime;
      const timeSinceLastSuccessfulPoll = now - this.lastSuccessfulPollTime;

      // 1. Check if we're still in GPS acquisition grace period
      const isInGracePeriod = this.trackingStartTime > 0 && 
                               timeSinceTrackingStart < this.GPS_ACQUISITION_GRACE_PERIOD_MS &&
                               this.deviceInfo.hasGPSHardware;
      
      if (isInGracePeriod) {
        logger.debug('Poll fallback: Skipping during GPS acquisition grace period', 'LocationService', {
          timeSinceTrackingStart: `${Math.round(timeSinceTrackingStart / 1000)  }s`,
          gracePeriod: `${Math.round(this.GPS_ACQUISITION_GRACE_PERIOD_MS / 1000)  }s`,
        });
        return;
      }

      // 2. Check if poll fallback grace period has passed (wait before starting poll fallback)
      if (this.lastSuccessfulPollTime === 0 && timeSinceTrackingStart < this.POLL_FALLBACK_GRACE_PERIOD_MS) {
        logger.debug('Poll fallback: Waiting for grace period before starting', 'LocationService', {
          timeSinceTrackingStart: `${Math.round(timeSinceTrackingStart / 1000)  }s`,
          gracePeriod: `${Math.round(this.POLL_FALLBACK_GRACE_PERIOD_MS / 1000)  }s`,
        });
        return;
      }

      // 3. Check if watchPosition is actively providing updates (don't poll if it is)
      if (timeSinceLastUpdate < this.POLL_FALLBACK_WATCHPOSITION_ACTIVE_THRESHOLD_MS) {
        // watchPosition is working - reset poll fallback state and skip polling
        if (this.pollFallbackFailures > 0 || this.pollFallbackCircuitBreakerOpen) {
          logger.info('Poll fallback: watchPosition is working - resetting poll fallback state', 'LocationService', {
            timeSinceLastUpdate: `${Math.round(timeSinceLastUpdate / 1000)  }s`,
            previousFailures: this.pollFallbackFailures,
          });
          this.pollFallbackFailures = 0;
          this.pollFallbackBackoffMs = this.POLL_FALLBACK_INTERVAL_MS;
          this.pollFallbackCircuitBreakerOpen = false;
          this.lastSuccessfulPollTime = now;
        }
        return;
      }

      // 4. Check circuit breaker - if open, only retry after reset period
      if (this.pollFallbackCircuitBreakerOpen) {
        if (timeSinceLastSuccessfulPoll < this.POLL_FALLBACK_CIRCUIT_BREAKER_RESET_MS) {
          logger.debug('Poll fallback: Circuit breaker open - skipping poll', 'LocationService', {
            timeSinceLastSuccessfulPoll: `${Math.round(timeSinceLastSuccessfulPoll / 1000)  }s`,
            resetAfter: `${Math.round(this.POLL_FALLBACK_CIRCUIT_BREAKER_RESET_MS / 1000)  }s`,
          });
          return;
        } else {
          // Reset circuit breaker
          logger.info('Poll fallback: Circuit breaker reset - attempting poll', 'LocationService');
          this.pollFallbackCircuitBreakerOpen = false;
          this.pollFallbackFailures = 0;
          this.pollFallbackBackoffMs = this.POLL_FALLBACK_INTERVAL_MS;
        }
      }

      // 5. Check exponential backoff - don't poll if we're in backoff period
      if (timeSinceLastPoll < this.pollFallbackBackoffMs) {
        return;
      }

      // 6. Check minimum poll interval
      const minPollInterval = this.deviceInfo.hasGPSHardware ? 2000 : 1000;
      if (timeSinceLastPoll < minPollInterval) {
        return;
      }

      // 7. Only poll if watchPosition hasn't provided updates recently
      const minUpdateInterval = this.deviceInfo.hasGPSHardware ? 3000 : 1000;
      if (timeSinceLastUpdate < minUpdateInterval) {
        return;
      }

      // 8. Attempt to get location via poll fallback
      try {
        this.lastPollAttempt = now;
        this.isUsingPollFallback = true;
        
        const location = await this.getCurrentLocation();
        
        this.isUsingPollFallback = false;
        
        if (location) {
          // Success - reset failure tracking
          this.lastUpdateTime = Date.now();
          this.consecutiveFailures = 0;
          this.pollFallbackFailures = 0;
          this.pollFallbackBackoffMs = this.POLL_FALLBACK_INTERVAL_MS;
          this.lastSuccessfulPollTime = now;
          this.pollFallbackCircuitBreakerOpen = false;
          
          const currentLastLocation = getLastLocation();
          
          // For desktop, send heartbeat updates even if coordinates unchanged
          if (currentLastLocation && !this.deviceInfo.hasGPSHardware) {
            const distance = this.calculateDistance(
              currentLastLocation.latitude,
              currentLastLocation.longitude,
              location.latitude,
              location.longitude
            );
            
            if (distance < 50) {
              const heartbeatLocation: LocationData = {
                ...currentLastLocation,
                timestamp: Date.now(),
                accuracy: location.accuracy,
              };
              onLocationUpdate(heartbeatLocation);
              return;
            }
          }
          
          onLocationUpdate(location);
        } else {
          // getCurrentLocation returned null - treat as failure
          this.handlePollFallbackFailure();
        }
      } catch (error) {
        this.isUsingPollFallback = false;
        this.handlePollFallbackFailure();
        
        // Only log if not in circuit breaker state (to reduce spam)
        if (!this.pollFallbackCircuitBreakerOpen) {
          logger.warn('Poll fallback: Failed to get location', 'LocationService', { 
            error: error instanceof Error ? error.message : String(error),
            deviceType: this.deviceInfo.deviceType,
            failures: this.pollFallbackFailures,
            backoffMs: this.pollFallbackBackoffMs,
          });
        }
      }
    }, pollInterval);
    
    logger.info('Enhanced polling fallback started with intelligent activation', 'LocationService', {
      interval: `${pollInterval / 1000  }s`,
      deviceType: this.deviceInfo.deviceType,
      hasGPSHardware: this.deviceInfo.hasGPSHardware,
      gracePeriod: `${Math.round(this.POLL_FALLBACK_GRACE_PERIOD_MS / 1000)  }s`,
      watchPositionActiveThreshold: `${Math.round(this.POLL_FALLBACK_WATCHPOSITION_ACTIVE_THRESHOLD_MS / 1000)  }s`,
      maxFailures: this.POLL_FALLBACK_MAX_FAILURES,
      circuitBreakerReset: `${Math.round(this.POLL_FALLBACK_CIRCUIT_BREAKER_RESET_MS / 1000)  }s`,
    });
  }

  /**
   * Handle poll fallback failure - implement exponential backoff and circuit breaker
   */
  private handlePollFallbackFailure(): void {
    this.pollFallbackFailures++;
    
    // Exponential backoff - double the backoff time (capped at max)
    this.pollFallbackBackoffMs = Math.min(
      this.pollFallbackBackoffMs * 2,
      this.POLL_FALLBACK_MAX_BACKOFF_MS
    );
    
    // Open circuit breaker if too many failures
    if (this.pollFallbackFailures >= this.POLL_FALLBACK_MAX_FAILURES) {
      this.pollFallbackCircuitBreakerOpen = true;
      logger.error('Poll fallback: Circuit breaker opened - too many consecutive failures', 'LocationService', {
        failures: this.pollFallbackFailures,
        maxFailures: this.POLL_FALLBACK_MAX_FAILURES,
        resetAfter: `${Math.round(this.POLL_FALLBACK_CIRCUIT_BREAKER_RESET_MS / 1000)  }s`,
        note: 'Poll fallback will be disabled until circuit breaker resets or watchPosition starts working',
      });
    }
  }

  /**
   * Start persistent heartbeat
   * Note: getCurrentLocation is only called if we're past the GPS acquisition grace period
   * This prevents errors when GPS hasn't had time to acquire signal yet
   * 
   * @param onLocationUpdate - Callback when location is available
   * @param getLastLocation - Function to get the current last location (not a stale closure value)
   * @param getCurrentLocation - Function to get current location if needed
   */
  startPersistentHeartbeat(
    onLocationUpdate: (location: LocationData) => void,
    getLastLocation: () => LocationData | null,
    getCurrentLocation: () => Promise<LocationData | null>
  ): void {
    if (this.persistentHeartbeatInterval) {
      clearInterval(this.persistentHeartbeatInterval);
    }

    this.persistentHeartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastUpdateTime;
      const timeSinceTrackingStart = now - this.trackingStartTime;

      // Don't call getCurrentLocation if we're still in the GPS acquisition grace period
      // This prevents errors when GPS hasn't had time to acquire signal yet
      const isInGracePeriod = this.trackingStartTime > 0 && 
                               timeSinceTrackingStart < this.GPS_ACQUISITION_GRACE_PERIOD_MS &&
                               this.deviceInfo.hasGPSHardware;

      if (timeSinceLastUpdate > this.PERSISTENT_HEARTBEAT_INTERVAL_MS) {
        // Get current lastLocation (not stale closure value)
        const currentLastLocation = getLastLocation();
        if (currentLastLocation) {
          const heartbeatLocation: LocationData = {
            ...currentLastLocation,
            timestamp: Date.now(),
          };
          onLocationUpdate(heartbeatLocation);
        } else if (!isInGracePeriod) {
          // Only try to get current location if we're past the grace period
          // This prevents errors when GPS is still acquiring signal
          try {
            const location = await getCurrentLocation();
            if (location) {
              onLocationUpdate(location);
            }
          } catch (error) {
            logger.warn('💓 Heartbeat: Failed to get current location', 'LocationService', { error });
          }
        } else {
          // Still in grace period - wait for GPS to acquire signal
          logger.debug('💓 Heartbeat: Skipping getCurrentLocation during GPS acquisition grace period', 'LocationService', {
            timeSinceTrackingStart: `${Math.round(timeSinceTrackingStart / 1000)  }s`,
            gracePeriod: `${Math.round(this.GPS_ACQUISITION_GRACE_PERIOD_MS / 1000)  }s`,
            hasGPSHardware: this.deviceInfo.hasGPSHardware,
          });
        }
      }
    }, this.PERSISTENT_HEARTBEAT_INTERVAL_MS);

    logger.info('✅ Persistent heartbeat started', 'LocationService', {
      interval: `${this.PERSISTENT_HEARTBEAT_INTERVAL_MS / 1000  }s`,
    });
  }

  /**
   * Schedule proactive watchPosition restart
   */
  scheduleProactiveWatchPositionRestart(
    onRestart: () => void
  ): void {
    if (this.watchPositionProactiveRestartInterval) {
      clearTimeout(this.watchPositionProactiveRestartInterval);
    }

    this.watchPositionProactiveRestartInterval = setTimeout(() => {
      logger.info('🔄 Proactive watchPosition restart scheduled (every 4 hours)', 'LocationService', {
        trackingDuration: `${Math.round((Date.now() - this.trackingStartTime) / 1000 / 60)  } minutes`,
      });

      onRestart();

      // Reschedule next restart
      this.scheduleProactiveWatchPositionRestart(onRestart);
    }, this.WATCHPOSITION_RESTART_INTERVAL_MS);

    logger.info('✅ Proactive watchPosition restart scheduled', 'LocationService', {
      restartInterval: `${this.WATCHPOSITION_RESTART_INTERVAL_MS / 1000 / 60 / 60  } hours`,
    });
  }

  /**
   * Restart watchPosition
   */
  restartWatchPosition(
    onLocationUpdate: (location: LocationData) => void,
    onError: (error: GeolocationPositionError) => void
  ): void {
    logger.info('Restarting watchPosition due to inactivity', 'LocationService', {
      deviceType: this.deviceInfo.deviceType,
      hasGPSHardware: this.deviceInfo.hasGPSHardware,
      isUsingPollFallback: this.isUsingPollFallback,
    });
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.consecutiveFailures = 0;
    
    this.startWatchPosition(onLocationUpdate, onError);
    
    // Ensure polling fallback is active for low-accuracy devices
    if (this.POLL_FALLBACK_ENABLED && !this.deviceInfo.hasGPSHardware && !this.pollFallbackInterval) {
      this.startPollFallback(onLocationUpdate, () => null);
      logger.info('Polling fallback activated during watchPosition restart', 'LocationService');
    }
  }

  /**
   * Stop all tracking
   */
  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.watchPositionMonitorInterval) {
      clearInterval(this.watchPositionMonitorInterval);
      this.watchPositionMonitorInterval = null;
    }

    if (this.pollFallbackInterval) {
      clearInterval(this.pollFallbackInterval);
      this.pollFallbackInterval = null;
    }

    if (this.persistentHeartbeatInterval) {
      clearInterval(this.persistentHeartbeatInterval);
      this.persistentHeartbeatInterval = null;
    }

    if (this.watchPositionProactiveRestartInterval) {
      clearTimeout(this.watchPositionProactiveRestartInterval);
      this.watchPositionProactiveRestartInterval = null;
    }

    this.lastUpdateTime = 0;
    this.consecutiveFailures = 0;
    this.isUsingPollFallback = false;
    this.trackingStartTime = 0;
  }

  /**
   * Get last update time
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * Update last update time
   */
  updateLastUpdateTime(): void {
    this.lastUpdateTime = Date.now();
  }

  /**
   * Set tracking start time
   */
  setTrackingStartTime(time: number): void {
    this.trackingStartTime = time;
  }

  /**
   * Check if polling fallback is enabled
   */
  isPollFallbackEnabled(): boolean {
    return this.POLL_FALLBACK_ENABLED;
  }

  /**
   * Check if device has GPS hardware
   */
  hasGPSHardware(): boolean {
    return this.deviceInfo.hasGPSHardware;
  }
}

