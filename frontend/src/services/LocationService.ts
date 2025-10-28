import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { validateGPSLocation } from '../utils/gpsValidation';
import { 
  detectGPSDeviceInfo, 
  getOptimalPositionOptions, 
  getAccuracyMessage,
  isAccuracyAcceptable,
  shouldWarnAboutAccuracy,
  logGPSDeviceInfo 
} from '../utils/gpsDetection';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  heading?: number;
  speed?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private isTracking = false;
  private lastLocation: LocationData | null = null;
  private locationListeners: Set<(location: LocationData) => void> = new Set();
  private errorListeners: Set<(error: LocationError) => void> = new Set();
  private deviceInfo = detectGPSDeviceInfo(); // Cache device info

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Check if geolocation is supported
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Check current permission status
  async checkPermission(): Promise<PermissionState> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return permission.state;
    } catch (error) {
      logger.warn('Could not check geolocation permission', 'LocationService', { error });
      return 'prompt';
    }
  }

  // Request location permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      const error = new Error('Geolocation is not supported by this browser');
      logger.error('Geolocation not supported', 'LocationService', { error: error.message });
      return false;
    }

    // Log device info on first permission request
    logGPSDeviceInfo();

    try {
      const options = getOptimalPositionOptions(this.deviceInfo);
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            logger.info('Location permission granted', 'LocationService', {
              hasGPSHardware: this.deviceInfo.hasGPSHardware,
              deviceType: this.deviceInfo.deviceType,
              accuracy: position.coords.accuracy,
            });
            resolve(true);
          },
          (error) => {
            logger.warn('Location permission denied', 'LocationService', { 
              error: error.message,
              code: error.code,
              deviceType: this.deviceInfo.deviceType,
            });
            resolve(false);
          },
          options
        );
      });
    } catch (error) {
      logger.error('Error requesting location permission', 'LocationService', { error });
      return false;
    }
  }

  // Get current location once
  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.isSupported()) {
      const error = new Error('Geolocation is not supported by this browser');
      logger.error('Geolocation not supported', 'LocationService', { error: error.message });
      return null;
    }

    try {
      const options = getOptimalPositionOptions(this.deviceInfo);
      return new Promise((resolve) => {
        // PRODUCTION FIX: Add timeout to prevent hanging Promises
        const timeoutId = setTimeout(() => {
          logger.warn('getCurrentLocation timeout - location request took too long', 'LocationService', {
            timeout: this.LOCATION_REQUEST_TIMEOUT_MS,
            deviceType: this.deviceInfo.deviceType,
          });
          resolve(null);
        }, this.LOCATION_REQUEST_TIMEOUT_MS);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId); // Clear timeout on success
            
            const location: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
            };

            // PRODUCTION FIX: Check accuracy acceptability based on device capabilities
            if (!isAccuracyAcceptable(location.accuracy, this.deviceInfo)) {
              logger.warn('GPS accuracy unacceptable for device type', 'LocationService', {
                accuracy: location.accuracy,
                deviceType: this.deviceInfo.deviceType,
                hasGPSHardware: this.deviceInfo.hasGPSHardware,
              });
              // Still proceed - poor accuracy is better than no location
            }

            // Log accuracy information
            if (shouldWarnAboutAccuracy(location.accuracy, this.deviceInfo)) {
              const accuracyMsg = getAccuracyMessage(location.accuracy, this.deviceInfo);
              logger.warn('GPS accuracy warning', 'LocationService', {
                accuracy: location.accuracy,
                message: accuracyMsg.message,
                severity: accuracyMsg.severity,
                suggestions: accuracyMsg.suggestions,
              });
            }

            // Validate GPS location before returning
            const validation = validateGPSLocation({
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: location.timestamp,
              speed: location.speed,
              heading: location.heading,
              accuracy: location.accuracy,
            });

            if (!validation.isValid && validation.shouldReject) {
              logger.warn('GPS location rejected', 'LocationService', {
                latitude: location.latitude,
                longitude: location.longitude,
                error: validation.error,
                rejectionReason: validation.rejectionReason,
              });
              resolve(null); // Return null for invalid location
              return;
            }

            this.lastLocation = location;
            logger.info('Current location obtained and validated', 'LocationService', {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              isValid: validation.isValid,
              deviceType: this.deviceInfo.deviceType,
            });

            resolve(location);
          },
          (error) => {
            clearTimeout(timeoutId); // Clear timeout on error
            const locationError = this.handleLocationError(error);
            logger.error('Failed to get current location', 'LocationService', { 
              error: locationError.message,
              code: locationError.code,
              deviceType: this.deviceInfo.deviceType,
            });
            resolve(null);
          },
          options
        );
      });
    } catch (error) {
      logger.error('Error getting current location', 'LocationService', { error });
      return null;
    }
  }

  // Helper method to calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Monitoring for watchPosition inactivity
  private lastUpdateTime: number = 0;
  private watchPositionMonitorInterval: NodeJS.Timeout | null = null;
  private pollFallbackInterval: NodeJS.Timeout | null = null; // Fallback polling for low-accuracy scenarios
  private consecutiveFailures: number = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly UPDATE_TIMEOUT_MS = 15000; // 15 seconds - reduced for faster detection
  private readonly POLL_FALLBACK_INTERVAL_MS = 5000; // 5 seconds - reduced for better desktop support
  private readonly POLL_FALLBACK_ENABLED = true; // Enable proactive polling fallback
  private readonly LOCATION_REQUEST_TIMEOUT_MS = 15000; // 15 seconds timeout for getCurrentPosition (increased for desktop/IP-based geolocation)
  private isUsingPollFallback = false; // Track if we're using polling fallback
  private lastPollAttempt: number = 0; // Track last polling attempt to prevent overlapping requests
  
  // PRODUCTION FIX: Long-term health monitoring and persistent heartbeat
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastSuccessfulUpdateTime: number = 0; // Track last successful location update sent
  private readonly HEALTH_CHECK_INTERVAL_MS = 60000; // Check health every minute
  private readonly HEALTH_ALERT_THRESHOLD_MS = 120000; // Alert if no updates for 2 minutes
  private persistentHeartbeatInterval: NodeJS.Timeout | null = null;
  private readonly PERSISTENT_HEARTBEAT_INTERVAL_MS = 30000; // Guaranteed update every 30 seconds minimum
  private watchPositionProactiveRestartInterval: NodeJS.Timeout | null = null;
  private readonly WATCHPOSITION_RESTART_INTERVAL_MS = 4 * 60 * 60 * 1000; // Proactively restart every 4 hours
  private trackingStartTime: number = 0; // Track when tracking started

  // Start tracking location
  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      logger.warn('Location tracking already active', 'LocationService');
      return true;
    }

    if (!this.isSupported()) {
      const error = new Error('Geolocation is not supported by this browser');
      logger.error('Geolocation not supported', 'LocationService', { error: error.message });
      return false;
    }

    try {
      this.lastUpdateTime = Date.now();
      this.lastSuccessfulUpdateTime = Date.now();
      this.trackingStartTime = Date.now();
      this.consecutiveFailures = 0;
      this.isUsingPollFallback = false;
      
      // CRITICAL FIX: Start watchPosition with improved configuration
      this.startWatchPosition();
      
      // PRODUCTION FIX: Start proactive polling fallback for low-accuracy scenarios
      // Desktop browsers and devices with poor GPS accuracy benefit from periodic polling
      if (this.POLL_FALLBACK_ENABLED && !this.deviceInfo.hasGPSHardware) {
        this.startPollFallback();
        logger.info('Polling fallback enabled for desktop/low-accuracy device', 'LocationService', {
          deviceType: this.deviceInfo.deviceType,
          hasGPSHardware: this.deviceInfo.hasGPSHardware,
        });
      }
      
      // Start monitoring for inactivity
      this.startWatchPositionMonitoring();
      
      // PRODUCTION FIX: Start long-term health monitoring
      this.startHealthMonitoring();
      
      // PRODUCTION FIX: Start persistent heartbeat to ensure continuous updates
      this.startPersistentHeartbeat();
      
      // PRODUCTION FIX: Schedule proactive watchPosition restart
      this.scheduleProactiveWatchPositionRestart();

      this.isTracking = true;
      logger.info('Location tracking started with enhanced monitoring and long-term health checks', 'LocationService', {
        hasGPSHardware: this.deviceInfo.hasGPSHardware,
        deviceType: this.deviceInfo.deviceType,
        pollFallbackEnabled: this.POLL_FALLBACK_ENABLED && !this.deviceInfo.hasGPSHardware,
        healthMonitoringEnabled: true,
        persistentHeartbeatEnabled: true,
      });
      return true;
    } catch (error) {
      logger.error('Error starting location tracking', 'LocationService', { error });
      return false;
    }
  }

  // Internal method to start watchPosition with improved config
  private startWatchPosition(): void {
    // Clear existing watch if any
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    // PRODUCTION FIX: Use device-optimized position options
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
        // Reset failure counter on successful update
        this.consecutiveFailures = 0;
        this.lastUpdateTime = Date.now();

        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
        };

        // CRITICAL FIX: Accept ALL valid coordinates, regardless of accuracy
        // Desktop browsers with IP-based positioning should NOT be rejected
        const validation = validateGPSLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
        });

        // PRODUCTION FIX: Only reject locations that are truly invalid (coordinates, stale, teleport)
        // NEVER reject based on accuracy - desktop IP-based positioning is valid
        if (!validation.isValid && validation.shouldReject) {
          logger.warn('GPS location rejected - invalid coordinates or stale data', 'LocationService', {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            error: validation.error,
            rejectionReason: validation.rejectionReason,
            deviceType: this.deviceInfo.deviceType,
          });
          
          // Increment failure counter for rejected locations
          this.consecutiveFailures++;
          
          // If too many rejections, this might indicate a problem
          if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
            logger.error('Multiple consecutive location rejections - GPS may be unstable', 'LocationService', {
              consecutiveFailures: this.consecutiveFailures,
            });
          }
          
          return; // Reject invalid location silently
        }

        // PRODUCTION FIX: Enhanced accuracy logging with device context
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
        
        // CRITICAL FIX: Warn about IP-based positioning (accuracy > 1000m typically indicates IP geolocation)
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
        
        // Check if accuracy is acceptable for this device type
        if (!isAccuracyAcceptable(location.accuracy, this.deviceInfo)) {
          logger.warn('GPS accuracy below acceptable threshold for device', 'LocationService', {
            accuracy: location.accuracy,
            deviceType: this.deviceInfo.deviceType,
            threshold: this.deviceInfo.accuracyWarningThreshold,
          });
        }

        this.lastLocation = location;
        
        // PRODUCTION FIX: Update last successful update time
        this.lastSuccessfulUpdateTime = Date.now();
        
        // Notify listeners only if location is valid
        this.locationListeners.forEach(listener => {
          try {
            listener(location);
          } catch (error) {
            logger.error('Error in location listener', 'LocationService', { error });
          }
        });

        logger.info('Location update received and validated', 'LocationService', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          isValid: validation.isValid,
          updateCount: this.locationListeners.size,
        });
      },
      (error) => {
        this.consecutiveFailures++;
        this.lastUpdateTime = Date.now(); // Update time even on error to prevent restart loop
        
        const locationError = this.handleLocationError(error);
        
        // Notify error listeners
        this.errorListeners.forEach(listener => {
          try {
            listener(locationError);
          } catch (listenerError) {
            logger.error('Error in error listener', 'LocationService', { error: listenerError });
          }
        });

        logger.error('Location tracking error', 'LocationService', { 
          error: locationError.message,
          code: locationError.code,
          consecutiveFailures: this.consecutiveFailures,
        });

        // If too many consecutive errors, restart watchPosition
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          logger.warn('Too many consecutive errors - restarting watchPosition', 'LocationService', {
            consecutiveFailures: this.consecutiveFailures,
          });
          this.restartWatchPosition();
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

  // Monitor watchPosition for inactivity and restart if needed
  private startWatchPositionMonitoring(): void {
    // Clear existing monitor if any
    if (this.watchPositionMonitorInterval) {
      clearInterval(this.watchPositionMonitorInterval);
    }

    // Check every 5 seconds for faster detection (reduced from 10s)
    this.watchPositionMonitorInterval = setInterval(() => {
      if (!this.isTracking) {
        return; // Stop monitoring if tracking stopped
      }

      const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
      
      // PRODUCTION FIX: Restart watchPosition if inactive AND enable polling fallback if needed
      if (timeSinceLastUpdate > this.UPDATE_TIMEOUT_MS) {
        logger.warn('watchPosition appears inactive - restarting and enabling fallback', 'LocationService', {
          timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
          lastUpdateTime: new Date(this.lastUpdateTime).toISOString(),
          deviceType: this.deviceInfo.deviceType,
        });
        
        // Restart watchPosition
        this.restartWatchPosition();
        
        // PRODUCTION FIX: Enable polling fallback if not already active
        // This ensures we continue getting updates even if watchPosition fails
        if (this.POLL_FALLBACK_ENABLED && !this.pollFallbackInterval) {
          this.startPollFallback();
          logger.info('Polling fallback activated due to watchPosition inactivity', 'LocationService');
        }
      }
    }, 5000); // Check every 5 seconds for faster detection
  }

  // CRITICAL FIX: Enhanced polling fallback for desktop browsers
  private startPollFallback(): void {
    // Clear existing poll fallback if any
    if (this.pollFallbackInterval) {
      clearInterval(this.pollFallbackInterval);
    }

    // CRITICAL FIX: More aggressive polling for desktop browsers
    const pollInterval = this.deviceInfo.hasGPSHardware ? 
      this.POLL_FALLBACK_INTERVAL_MS : 
      Math.min(this.POLL_FALLBACK_INTERVAL_MS, 3000); // 3 seconds for desktop

    // Start periodic polling as fallback
    this.pollFallbackInterval = setInterval(async () => {
      if (!this.isTracking) {
        return; // Stop polling if tracking stopped
      }

      // CRITICAL FIX: Less restrictive overlapping prevention for desktop
      const now = Date.now();
      const timeSinceLastPoll = now - this.lastPollAttempt;
      const minPollInterval = this.deviceInfo.hasGPSHardware ? 2000 : 1000; // 1s for desktop, 2s for mobile
      
      if (timeSinceLastPoll < minPollInterval) {
        return; // Skip if previous poll hasn't completed
      }

      // CRITICAL FIX: More frequent updates for desktop browsers
      const timeSinceLastUpdate = now - this.lastUpdateTime;
      const minUpdateInterval = this.deviceInfo.hasGPSHardware ? 3000 : 1000; // 1s for desktop, 3s for mobile
      
      if (timeSinceLastUpdate < minUpdateInterval) {
        return; // Recent update, skip polling
      }

      try {
        this.lastPollAttempt = now;
        this.isUsingPollFallback = true;
        logger.debug('Polling fallback: Requesting location', 'LocationService', {
          timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
          deviceType: this.deviceInfo.deviceType,
          hasGPSHardware: this.deviceInfo.hasGPSHardware,
        });
        
        const location = await this.getCurrentLocation();
        
        // Reset flag immediately after attempt (whether successful or not)
        this.isUsingPollFallback = false;
        
        if (location) {
          // Reset flag and update time
          this.lastUpdateTime = Date.now();
          this.consecutiveFailures = 0;
          
          // CRITICAL FIX: Always send updates for desktop browsers, even if coordinates don't change
          // Desktop IP-based positioning rarely changes coordinates, but we need frequent updates
          if (this.lastLocation && !this.deviceInfo.hasGPSHardware) {
            // Desktop/IP-based positioning - send heartbeat updates even if coordinates unchanged
            const distance = this.calculateDistance(
              this.lastLocation.latitude,
              this.lastLocation.longitude,
              location.latitude,
              location.longitude
            );
            
            // CRITICAL FIX: For desktop, always send updates regardless of distance
            // This ensures continuous location updates even with IP-based positioning
            if (distance < 50) { // 50m threshold for desktop
              logger.debug('Polling fallback: Desktop location unchanged, sending heartbeat update', 'LocationService', {
                distance: Math.round(distance) + 'm',
                accuracy: location.accuracy,
                deviceType: this.deviceInfo.deviceType,
              });
              
              // Create location update with same coordinates but new timestamp
              const heartbeatLocation: LocationData = {
                ...this.lastLocation,
                timestamp: Date.now(), // Update timestamp for heartbeat
                accuracy: location.accuracy, // Update accuracy from new reading
              };
              
              // Notify listeners with heartbeat location
              this.locationListeners.forEach(listener => {
                try {
                  listener(heartbeatLocation);
                } catch (error) {
                  logger.error('Error in location listener (poll fallback heartbeat)', 'LocationService', { error });
                }
              });
              
              return; // Early return after heartbeat
            }
          }
          
          // PRODUCTION FIX: Update last successful update time
          this.lastSuccessfulUpdateTime = Date.now();
          
          // Notify listeners manually since getCurrentLocation doesn't trigger listeners
          this.locationListeners.forEach(listener => {
            try {
              listener(location);
            } catch (error) {
              logger.error('Error in location listener (poll fallback)', 'LocationService', { error });
            }
          });
          
          logger.debug('Polling fallback: Location obtained successfully', 'LocationService', {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            deviceType: this.deviceInfo.deviceType,
          });
        } else {
          // Location request failed or returned null
          logger.debug('Polling fallback: No location obtained', 'LocationService', {
            deviceType: this.deviceInfo.deviceType,
          });
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

  // Stop polling fallback
  private stopPollFallback(): void {
    if (this.pollFallbackInterval) {
      clearInterval(this.pollFallbackInterval);
      this.pollFallbackInterval = null;
      this.isUsingPollFallback = false;
      logger.info('Polling fallback stopped', 'LocationService');
    }
  }

  // Restart watchPosition when it becomes inactive
  private restartWatchPosition(): void {
    logger.info('Restarting watchPosition due to inactivity', 'LocationService', {
      deviceType: this.deviceInfo.deviceType,
      hasGPSHardware: this.deviceInfo.hasGPSHardware,
      isUsingPollFallback: this.isUsingPollFallback,
    });
    
    // Clear existing watch
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    // Reset failure counter
    this.consecutiveFailures = 0;
    // Don't update lastUpdateTime here - let it track actual updates
    
    // Restart watchPosition
    this.startWatchPosition();
    
    // PRODUCTION FIX: Ensure polling fallback is active for low-accuracy devices
    if (this.POLL_FALLBACK_ENABLED && !this.deviceInfo.hasGPSHardware && !this.pollFallbackInterval) {
      this.startPollFallback();
      logger.info('Polling fallback activated during watchPosition restart', 'LocationService');
    }
  }

  // PRODUCTION FIX: Long-term health monitoring to detect when updates stop
  private startHealthMonitoring(): void {
    // Clear existing health check if any
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check health every minute
    this.healthCheckInterval = setInterval(() => {
      if (!this.isTracking) {
        return; // Stop monitoring if tracking stopped
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastSuccessfulUpdateTime;
      const trackingDuration = now - this.trackingStartTime;

      // Alert if no updates for extended period (2 minutes)
      if (timeSinceLastUpdate > this.HEALTH_ALERT_THRESHOLD_MS) {
        logger.error('🚨 HEALTH ALERT: No location updates for extended period', 'LocationService', {
          timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
          trackingDuration: Math.round(trackingDuration / 1000 / 60) + ' minutes',
          lastUpdateTime: new Date(this.lastSuccessfulUpdateTime).toISOString(),
          action: 'Attempting recovery...',
        });

        // Attempt recovery: restart watchPosition and enable polling fallback
        this.restartWatchPosition();
        
        // Force enable polling fallback if not already active
        if (!this.pollFallbackInterval) {
          this.startPollFallback();
          logger.info('🔄 Recovery: Polling fallback activated due to health alert', 'LocationService');
        }
      } else {
        // Log health status periodically (every 5 minutes)
        if (trackingDuration > 0 && Math.floor(trackingDuration / (5 * 60 * 1000)) > 0 && 
            Math.floor(trackingDuration / (5 * 60 * 1000)) % 1 === 0) {
          logger.info('✅ Health check: Location updates active', 'LocationService', {
            trackingDuration: Math.round(trackingDuration / 1000 / 60) + ' minutes',
            timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
            lastSuccessfulUpdate: new Date(this.lastSuccessfulUpdateTime).toISOString(),
          });
        }
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);

    logger.info('✅ Long-term health monitoring started', 'LocationService', {
      checkInterval: this.HEALTH_CHECK_INTERVAL_MS / 1000 + 's',
      alertThreshold: this.HEALTH_ALERT_THRESHOLD_MS / 1000 + 's',
    });
  }

  // PRODUCTION FIX: Persistent heartbeat to ensure continuous updates
  private startPersistentHeartbeat(): void {
    // Clear existing heartbeat if any
    if (this.persistentHeartbeatInterval) {
      clearInterval(this.persistentHeartbeatInterval);
    }

    // Send heartbeat updates every 30 seconds minimum
    this.persistentHeartbeatInterval = setInterval(async () => {
      if (!this.isTracking) {
        return; // Stop heartbeat if tracking stopped
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastUpdateTime;

      // Only send heartbeat if no recent update (prevent duplicates)
      if (timeSinceLastUpdate > this.PERSISTENT_HEARTBEAT_INTERVAL_MS) {
        // Check if we have a last known location
        if (this.lastLocation) {
          logger.debug('💓 Sending persistent heartbeat location update', 'LocationService', {
            timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
            location: {
              lat: this.lastLocation.latitude,
              lng: this.lastLocation.longitude,
              accuracy: this.lastLocation.accuracy,
            },
          });

          // Create heartbeat location with updated timestamp
          const heartbeatLocation: LocationData = {
            ...this.lastLocation,
            timestamp: Date.now(), // Update timestamp for heartbeat
          };

          // Notify listeners with heartbeat location
          this.locationListeners.forEach(listener => {
            try {
              listener(heartbeatLocation);
            } catch (error) {
              logger.error('Error in location listener (heartbeat)', 'LocationService', { error });
            }
          });

          // Update last successful update time
          this.lastSuccessfulUpdateTime = Date.now();
        } else {
          // No last location - try to get current location
          logger.debug('💓 Heartbeat: No last location, attempting to get current location', 'LocationService');
          try {
            const location = await this.getCurrentLocation();
            if (location) {
              this.lastSuccessfulUpdateTime = Date.now();
              logger.debug('💓 Heartbeat: Obtained current location successfully', 'LocationService');
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

  // PRODUCTION FIX: Proactively restart watchPosition every 4 hours to prevent degradation
  private scheduleProactiveWatchPositionRestart(): void {
    // Clear existing schedule if any
    if (this.watchPositionProactiveRestartInterval) {
      clearTimeout(this.watchPositionProactiveRestartInterval);
    }

    // Schedule restart after 4 hours
    this.watchPositionProactiveRestartInterval = setTimeout(() => {
      if (!this.isTracking) {
        return; // Don't restart if tracking stopped
      }

      logger.info('🔄 Proactive watchPosition restart scheduled (every 4 hours)', 'LocationService', {
        trackingDuration: Math.round((Date.now() - this.trackingStartTime) / 1000 / 60) + ' minutes',
      });

      // Restart watchPosition proactively
      this.restartWatchPosition();

      // Reschedule next restart
      this.scheduleProactiveWatchPositionRestart();
    }, this.WATCHPOSITION_RESTART_INTERVAL_MS);

    logger.info('✅ Proactive watchPosition restart scheduled', 'LocationService', {
      restartInterval: this.WATCHPOSITION_RESTART_INTERVAL_MS / 1000 / 60 / 60 + ' hours',
    });
  }

  // Stop tracking location
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    // Stop monitoring
    if (this.watchPositionMonitorInterval) {
      clearInterval(this.watchPositionMonitorInterval);
      this.watchPositionMonitorInterval = null;
    }

    // Stop polling fallback
    this.stopPollFallback();

    // PRODUCTION FIX: Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // PRODUCTION FIX: Stop persistent heartbeat
    if (this.persistentHeartbeatInterval) {
      clearInterval(this.persistentHeartbeatInterval);
      this.persistentHeartbeatInterval = null;
    }

    // PRODUCTION FIX: Cancel proactive restart schedule
    if (this.watchPositionProactiveRestartInterval) {
      clearTimeout(this.watchPositionProactiveRestartInterval);
      this.watchPositionProactiveRestartInterval = null;
    }

    this.isTracking = false;
    this.consecutiveFailures = 0;
    this.isUsingPollFallback = false;
    this.lastSuccessfulUpdateTime = 0;
    this.trackingStartTime = 0;
    logger.info('Location tracking stopped - all timers cleared', 'LocationService');
  }

  // Add location listener
  addLocationListener(listener: (location: LocationData) => void): void {
    this.locationListeners.add(listener);
    logger.debug('Location listener added', 'LocationService', { 
      totalListeners: this.locationListeners.size 
    });
  }

  // Remove location listener
  removeLocationListener(listener: (location: LocationData) => void): void {
    const removed = this.locationListeners.delete(listener);
    if (removed) {
      logger.debug('Location listener removed', 'LocationService', { 
        remainingListeners: this.locationListeners.size 
      });
    }
  }

  // Add error listener
  addErrorListener(listener: (error: LocationError) => void): void {
    this.errorListeners.add(listener);
    logger.debug('Error listener added', 'LocationService', { 
      totalListeners: this.errorListeners.size 
    });
  }

  // Remove error listener
  removeErrorListener(listener: (error: LocationError) => void): void {
    const removed = this.errorListeners.delete(listener);
    if (removed) {
      logger.debug('Error listener removed', 'LocationService', { 
        remainingListeners: this.errorListeners.size 
      });
    }
  }

  // Get last known location
  getLastLocation(): LocationData | null {
    return this.lastLocation;
  }

  // Check if currently tracking
  getIsTracking(): boolean {
    return this.isTracking;
  }

  // Handle location errors
  private handleLocationError(error: GeolocationPositionError): LocationError {
    let message: string;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied. Please enable location permissions in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable. Please check your GPS settings.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
      default:
        message = 'An unknown location error occurred.';
    }

    return {
      code: error.code,
      message,
    };
  }

  // Cleanup
  destroy(): void {
    this.stopTracking();
    this.locationListeners.clear();
    this.errorListeners.clear();
    this.lastLocation = null;
    this.lastUpdateTime = 0;
    this.consecutiveFailures = 0;
    this.isUsingPollFallback = false;
    logger.info('LocationService destroyed - all listeners and timers cleared', 'LocationService');
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
export default locationService;
