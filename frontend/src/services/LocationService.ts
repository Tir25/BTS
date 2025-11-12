import { logger } from '../utils/logger';
import { errorHandler } from '../utils/errorHandler';
import { validateGPSLocation } from '../utils/gpsValidation';
import { permissionManager } from './location/permissionManager';
import { TrackingManager } from './location/trackingManager';
import { healthMonitor } from './location/healthMonitor';

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
  private isTracking = false;
  private lastLocation: LocationData | null = null;
  private locationListeners: Set<(location: LocationData) => void> = new Set();
  private errorListeners: Set<(error: LocationError) => void> = new Set();
  private trackingMgr: TrackingManager;
  // PRODUCTION FIX: Throttle error logging to reduce spam
  private lastPermissionDeniedLogged = false;
  private lastErrorLogTime: number = 0;
  private readonly ERROR_LOG_THROTTLE_MS = 5000; // Log errors at most once per 5 seconds

  constructor() {
    const deviceInfo = permissionManager.getDeviceInfo();
    this.trackingMgr = new TrackingManager(
      deviceInfo,
      this.locationListeners,
      this.errorListeners as any,
      () => this.getCurrentLocation(),
      this.calculateDistance.bind(this)
    );
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Check if geolocation is supported
  isSupported(): boolean {
    return permissionManager.isSupported();
  }

  // Check current permission status
  async checkPermission(): Promise<PermissionState> {
    return await permissionManager.checkPermission();
  }

  // Request location permission
  async requestPermission(): Promise<boolean> {
    return await permissionManager.requestPermission();
  }

  // Get current location once
  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.isSupported()) {
      const error = new Error('Geolocation is not supported by this browser');
      logger.error('Geolocation not supported', 'LocationService', { error: error.message });
      return null;
    }

    try {
      const options = permissionManager.getOptimalPositionOptions();
      // CRITICAL FIX: Increased timeout for mobile GPS - GPS can take 20-45 seconds to acquire signal
      const deviceInfo = permissionManager.getDeviceInfo();
      const LOCATION_REQUEST_TIMEOUT_MS = deviceInfo.hasGPSHardware ? 45000 : 15000; // 45s for GPS, 15s for desktop
      
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          logger.warn('getCurrentLocation timeout - location request took too long', 'LocationService', {
            timeout: LOCATION_REQUEST_TIMEOUT_MS,
            deviceType: permissionManager.getDeviceInfo().deviceType,
          });
          resolve(null);
        }, LOCATION_REQUEST_TIMEOUT_MS);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            
            const location: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed ? position.coords.speed * 3.6 : undefined,
            };

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
              resolve(null);
              return;
            }

            this.lastLocation = location;
            logger.info('Current location obtained and validated', 'LocationService', {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              isValid: validation.isValid,
              deviceType: permissionManager.getDeviceInfo().deviceType,
            });

            resolve(location);
          },
          (error) => {
            clearTimeout(timeoutId);
            const locationError = this.handleLocationError(error);
            // PRODUCTION FIX: Only log errors that are meaningful - reduce spam
            // Don't log permission denied errors repeatedly if permission is already denied
            if (error.code === error.PERMISSION_DENIED) {
              // Only log permission denied once per session to reduce spam
              if (!this.lastPermissionDeniedLogged) {
                logger.warn('Location permission denied - user needs to enable location access', 'LocationService', { 
                  error: locationError.message,
                  code: locationError.code,
                  deviceType: permissionManager.getDeviceInfo().deviceType,
                  note: 'This error will not be logged again until permission changes'
                });
                this.lastPermissionDeniedLogged = true;
              }
            } else {
              // Log other errors normally but throttle repeated errors
              const now = Date.now();
              if (!this.lastErrorLogTime || (now - this.lastErrorLogTime) > 5000) {
                logger.error('Failed to get current location', 'LocationService', { 
                  error: locationError.message,
                  code: locationError.code,
                  deviceType: permissionManager.getDeviceInfo().deviceType,
                });
                this.lastErrorLogTime = now;
              }
            }
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
      const deviceInfo = permissionManager.getDeviceInfo();
      const now = Date.now();
      this.trackingMgr.setTrackingStartTime(now);
      this.trackingMgr.updateLastUpdateTime();
      
      // Start watchPosition
      this.trackingMgr.startWatchPosition(
        (location) => {
          this.lastLocation = location;
          healthMonitor.updateLastSuccessfulUpdate();
          // Reset error logging flags on successful location update
          // If we get a location update, permission is likely granted
          if (this.lastPermissionDeniedLogged) {
            this.lastPermissionDeniedLogged = false;
          }
          this.locationListeners.forEach(listener => {
            try {
              listener(location);
            } catch (error) {
              logger.error('Error in location listener', 'LocationService', { error });
            }
          });
        },
        (error) => {
          const locationError = this.handleLocationError(error);
          // PRODUCTION FIX: Throttle error notifications to reduce spam
          const now = Date.now();
          const shouldNotifyError = 
            (error.code === error.PERMISSION_DENIED && !this.lastPermissionDeniedLogged) ||
            (error.code !== error.PERMISSION_DENIED && (!this.lastErrorLogTime || (now - this.lastErrorLogTime) > this.ERROR_LOG_THROTTLE_MS));
          
          if (error.code === error.PERMISSION_DENIED) {
            this.lastPermissionDeniedLogged = true;
          } else {
            this.lastErrorLogTime = now;
          }
          
          if (shouldNotifyError) {
            this.errorListeners.forEach(listener => {
              try {
                listener(locationError);
              } catch (listenerError) {
                logger.error('Error in error listener', 'LocationService', { error: listenerError });
              }
            });
          }
        }
      );
      
      // Start polling fallback if needed (only for non-GPS devices as fallback when watchPosition fails)
      // PRODUCTION FIX: Poll fallback will only activate when watchPosition is not providing updates
      if (this.trackingMgr.isPollFallbackEnabled() && !this.trackingMgr.hasGPSHardware()) {
        this.trackingMgr.startPollFallback(
          (location) => {
            this.lastLocation = location;
            healthMonitor.updateLastSuccessfulUpdate();
            // Reset error logging flags on successful location update
            if (this.lastPermissionDeniedLogged) {
              this.lastPermissionDeniedLogged = false;
            }
            this.locationListeners.forEach(listener => {
              try {
                listener(location);
              } catch (error) {
                logger.error('Error in location listener (poll fallback)', 'LocationService', { error });
              }
            });
          },
          () => this.lastLocation // Pass function to get current lastLocation (not stale closure value)
        );
        logger.info('Polling fallback enabled for desktop/low-accuracy device (will activate only if watchPosition fails)', 'LocationService', {
          deviceType: deviceInfo.deviceType,
          hasGPSHardware: deviceInfo.hasGPSHardware,
          note: 'Poll fallback will only activate when watchPosition is not providing updates',
        });
      }
      
      // Start monitoring for inactivity
      this.trackingMgr.startWatchPositionMonitoring(() => {
        this.trackingMgr.restartWatchPosition(
          (location) => {
            this.lastLocation = location;
            healthMonitor.updateLastSuccessfulUpdate();
            this.locationListeners.forEach(listener => {
              try {
                listener(location);
              } catch (error) {
                logger.error('Error in location listener', 'LocationService', { error });
              }
            });
          },
          (error) => {
            const locationError = this.handleLocationError(error);
            // PRODUCTION FIX: Throttle error notifications to reduce spam
            const now = Date.now();
            const shouldNotifyError = 
              (error.code === error.PERMISSION_DENIED && !this.lastPermissionDeniedLogged) ||
              (error.code !== error.PERMISSION_DENIED && (!this.lastErrorLogTime || (now - this.lastErrorLogTime) > this.ERROR_LOG_THROTTLE_MS));
            
            if (error.code === error.PERMISSION_DENIED) {
              this.lastPermissionDeniedLogged = true;
            } else {
              this.lastErrorLogTime = now;
            }
            
            if (shouldNotifyError) {
              this.errorListeners.forEach(listener => {
                try {
                  listener(locationError);
                } catch (listenerError) {
                  logger.error('Error in error listener', 'LocationService', { error: listenerError });
                }
              });
            }
          }
        );
        
        if (this.trackingMgr.isPollFallbackEnabled() && !this.trackingMgr.hasGPSHardware()) {
          this.trackingMgr.startPollFallback(
            (location) => {
              this.lastLocation = location;
              healthMonitor.updateLastSuccessfulUpdate();
              // Reset error logging flags on successful location update
              if (this.lastPermissionDeniedLogged) {
                this.lastPermissionDeniedLogged = false;
              }
              this.locationListeners.forEach(listener => {
                try {
                  listener(location);
                } catch (error) {
                  logger.error('Error in location listener (poll fallback)', 'LocationService', { error });
                }
              });
            },
            () => this.lastLocation // Pass function to get current lastLocation (not stale closure value)
          );
        }
      });
      
      // Start health monitoring
      healthMonitor.start(
        () => {
          // Health alert - restart tracking
          this.trackingMgr.restartWatchPosition(
            (location) => {
              this.lastLocation = location;
              healthMonitor.updateLastSuccessfulUpdate();
              this.locationListeners.forEach(listener => {
                try {
                  listener(location);
                } catch (error) {
                  logger.error('Error in location listener', 'LocationService', { error });
                }
              });
            },
            (error) => {
              const locationError = this.handleLocationError(error);
              this.errorListeners.forEach(listener => {
                try {
                  listener(locationError);
                } catch (listenerError) {
                  logger.error('Error in error listener', 'LocationService', { error: listenerError });
                }
              });
            }
          );
          
          if (this.trackingMgr.isPollFallbackEnabled() && !this.trackingMgr.hasGPSHardware()) {
            this.trackingMgr.startPollFallback(
              (location) => {
                this.lastLocation = location;
                healthMonitor.updateLastSuccessfulUpdate();
                // Reset error logging flags on successful location update
                if (this.lastPermissionDeniedLogged) {
                  this.lastPermissionDeniedLogged = false;
                }
                this.locationListeners.forEach(listener => {
                  try {
                    listener(location);
                  } catch (error) {
                    logger.error('Error in location listener (poll fallback)', 'LocationService', { error });
                  }
                });
              },
              () => this.lastLocation // Pass function to get current lastLocation (not stale closure value)
            );
          }
        },
        () => this.trackingMgr.getLastUpdateTime()
      );
      
      // Start persistent heartbeat
      this.trackingMgr.startPersistentHeartbeat(
        (location) => {
          healthMonitor.updateLastSuccessfulUpdate();
          this.locationListeners.forEach(listener => {
            try {
              listener(location);
            } catch (error) {
              logger.error('Error in location listener (heartbeat)', 'LocationService', { error });
            }
          });
        },
        () => this.lastLocation, // Pass function to get current lastLocation (not stale closure value)
        () => this.getCurrentLocation()
      );
      
      // Schedule proactive watchPosition restart
      this.trackingMgr.scheduleProactiveWatchPositionRestart(() => {
        this.trackingMgr.restartWatchPosition(
          (location) => {
            this.lastLocation = location;
            healthMonitor.updateLastSuccessfulUpdate();
            this.locationListeners.forEach(listener => {
              try {
                listener(location);
              } catch (error) {
                logger.error('Error in location listener', 'LocationService', { error });
              }
            });
          },
          (error) => {
            const locationError = this.handleLocationError(error);
            this.errorListeners.forEach(listener => {
              try {
                listener(locationError);
              } catch (listenerError) {
                logger.error('Error in error listener', 'LocationService', { error: listenerError });
              }
            });
          }
        );
      });

      this.isTracking = true;
      logger.info('Location tracking started with enhanced monitoring and long-term health checks', 'LocationService', {
        hasGPSHardware: deviceInfo.hasGPSHardware,
        deviceType: deviceInfo.deviceType,
        pollFallbackEnabled: this.trackingMgr.isPollFallbackEnabled() && !this.trackingMgr.hasGPSHardware(),
        healthMonitoringEnabled: true,
        persistentHeartbeatEnabled: true,
      });
      return true;
    } catch (error) {
      logger.error('Error starting location tracking', 'LocationService', { error });
      return false;
    }
  }

  // Stop tracking location
  stopTracking(): void {
    this.trackingMgr.stop();
    healthMonitor.stop();
    this.isTracking = false;
    logger.info('Location tracking stopped - all timers cleared', 'LocationService');
  }

  // NOTE: All tracking methods have been moved to trackingManager and healthMonitor
  // The following methods are now handled by the managers:
  // - startWatchPosition() -> trackingManager.startWatchPosition()
  // - startWatchPositionMonitoring() -> trackingManager.startWatchPositionMonitoring()
  // - startPollFallback() -> trackingManager.startPollFallback()
  // - restartWatchPosition() -> trackingManager.restartWatchPosition()
  // - startHealthMonitoring() -> healthMonitor.start()
  // - startPersistentHeartbeat() -> trackingManager.startPersistentHeartbeat()
  // - scheduleProactiveWatchPositionRestart() -> trackingManager.scheduleProactiveWatchPositionRestart()

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
    logger.info('LocationService destroyed - all listeners and timers cleared', 'LocationService');
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
export default locationService;
