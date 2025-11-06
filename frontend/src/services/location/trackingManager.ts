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
  
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly UPDATE_TIMEOUT_MS = 15000; // 15 seconds
  private readonly POLL_FALLBACK_INTERVAL_MS = 5000; // 5 seconds
  private readonly POLL_FALLBACK_ENABLED = true;
  private readonly LOCATION_REQUEST_TIMEOUT_MS = 15000; // 15 seconds
  private readonly PERSISTENT_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly WATCHPOSITION_RESTART_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

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
          timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
          lastUpdateTime: new Date(this.lastUpdateTime).toISOString(),
          deviceType: this.deviceInfo.deviceType,
        });
        
        onInactive();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Start polling fallback for desktop browsers
   */
  startPollFallback(
    onLocationUpdate: (location: LocationData) => void,
    lastLocation: LocationData | null
  ): void {
    if (this.pollFallbackInterval) {
      clearInterval(this.pollFallbackInterval);
    }

    const pollInterval = this.deviceInfo.hasGPSHardware ? 
      this.POLL_FALLBACK_INTERVAL_MS : 
      Math.min(this.POLL_FALLBACK_INTERVAL_MS, 3000); // 3 seconds for desktop

    this.pollFallbackInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastPoll = now - this.lastPollAttempt;
      const minPollInterval = this.deviceInfo.hasGPSHardware ? 2000 : 1000;
      
      if (timeSinceLastPoll < minPollInterval) {
        return;
      }

      const timeSinceLastUpdate = now - this.lastUpdateTime;
      const minUpdateInterval = this.deviceInfo.hasGPSHardware ? 3000 : 1000;
      
      if (timeSinceLastUpdate < minUpdateInterval) {
        return;
      }

      try {
        this.lastPollAttempt = now;
        this.isUsingPollFallback = true;
        
        const location = await this.getCurrentLocation();
        
        this.isUsingPollFallback = false;
        
        if (location) {
          this.lastUpdateTime = Date.now();
          this.consecutiveFailures = 0;
          
          // For desktop, send heartbeat updates even if coordinates unchanged
          if (lastLocation && !this.deviceInfo.hasGPSHardware) {
            const distance = this.calculateDistance(
              lastLocation.latitude,
              lastLocation.longitude,
              location.latitude,
              location.longitude
            );
            
            if (distance < 50) {
              const heartbeatLocation: LocationData = {
                ...lastLocation,
                timestamp: Date.now(),
                accuracy: location.accuracy,
              };
              onLocationUpdate(heartbeatLocation);
              return;
            }
          }
          
          onLocationUpdate(location);
        }
      } catch (error) {
        this.isUsingPollFallback = false;
        logger.warn('Polling fallback: Failed to get location', 'LocationService', { 
          error: error instanceof Error ? error.message : String(error),
          deviceType: this.deviceInfo.deviceType,
        });
      }
    }, pollInterval);
    
    logger.info('Enhanced polling fallback started', 'LocationService', {
      interval: pollInterval / 1000 + 's',
      deviceType: this.deviceInfo.deviceType,
      hasGPSHardware: this.deviceInfo.hasGPSHardware,
      aggressiveMode: !this.deviceInfo.hasGPSHardware,
    });
  }

  /**
   * Start persistent heartbeat
   */
  startPersistentHeartbeat(
    onLocationUpdate: (location: LocationData) => void,
    lastLocation: LocationData | null,
    getCurrentLocation: () => Promise<LocationData | null>
  ): void {
    if (this.persistentHeartbeatInterval) {
      clearInterval(this.persistentHeartbeatInterval);
    }

    this.persistentHeartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastUpdateTime;

      if (timeSinceLastUpdate > this.PERSISTENT_HEARTBEAT_INTERVAL_MS) {
        if (lastLocation) {
          const heartbeatLocation: LocationData = {
            ...lastLocation,
            timestamp: Date.now(),
          };
          onLocationUpdate(heartbeatLocation);
        } else {
          try {
            const location = await getCurrentLocation();
            if (location) {
              onLocationUpdate(location);
            }
          } catch (error) {
            logger.warn('💓 Heartbeat: Failed to get current location', 'LocationService', { error });
          }
        }
      }
    }, this.PERSISTENT_HEARTBEAT_INTERVAL_MS);

    logger.info('✅ Persistent heartbeat started', 'LocationService', {
      interval: this.PERSISTENT_HEARTBEAT_INTERVAL_MS / 1000 + 's',
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
        trackingDuration: Math.round((Date.now() - this.trackingStartTime) / 1000 / 60) + ' minutes',
      });

      onRestart();

      // Reschedule next restart
      this.scheduleProactiveWatchPositionRestart(onRestart);
    }, this.WATCHPOSITION_RESTART_INTERVAL_MS);

    logger.info('✅ Proactive watchPosition restart scheduled', 'LocationService', {
      restartInterval: this.WATCHPOSITION_RESTART_INTERVAL_MS / 1000 / 60 / 60 + ' hours',
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
      this.startPollFallback(onLocationUpdate, null);
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

