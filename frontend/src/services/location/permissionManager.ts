import { logger } from '../../utils/logger';
import { 
  detectGPSDeviceInfo, 
  getOptimalPositionOptions, 
  logGPSDeviceInfo 
} from '../../utils/gpsDetection';

/**
 * Permission manager for location services
 * Handles geolocation permission checking and requesting
 */
export class PermissionManager {
  private deviceInfo = detectGPSDeviceInfo();
  private cachedPermissionState: PermissionState | null = null;
  private permissionCheckTime: number = 0;
  private readonly PERMISSION_CACHE_MS = 30000; // Cache permission for 30 seconds

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check current permission status (with caching to avoid repeated API calls)
   * PRODUCTION FIX: Handle iOS Safari and mobile browsers that don't support permissions API
   */
  async checkPermission(): Promise<PermissionState> {
    if (!this.isSupported()) {
      return 'denied';
    }

    // Return cached permission if still valid
    const now = Date.now();
    if (this.cachedPermissionState && (now - this.permissionCheckTime) < this.PERMISSION_CACHE_MS) {
      return this.cachedPermissionState;
    }

    // PRODUCTION FIX: Check if permissions API is supported (not available on iOS Safari)
    if (!navigator.permissions || !navigator.permissions.query) {
      logger.debug('Permissions API not available (likely iOS Safari)', 'LocationService', {
        deviceType: this.deviceInfo.deviceType,
        isMobile: this.deviceInfo.isMobile,
        userAgent: navigator.userAgent
      });
      // On mobile browsers without permissions API, we can't check permission state
      // Return 'prompt' to allow attempting permission request
      // The actual permission state will be determined when we try to get location
      return this.cachedPermissionState || 'prompt';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      this.cachedPermissionState = permission.state;
      this.permissionCheckTime = now;
      
      // Listen for permission changes and update cache
      permission.addEventListener('change', () => {
        this.cachedPermissionState = permission.state;
        this.permissionCheckTime = Date.now();
        logger.info('Geolocation permission state changed', 'LocationService', { 
          newState: permission.state 
        });
      });
      
      return permission.state;
    } catch (error) {
      logger.warn('Could not check geolocation permission', 'LocationService', { error });
      // If we have a cached value, use it; otherwise default to 'prompt'
      return this.cachedPermissionState || 'prompt';
    }
  }

  /**
   * Request location permission
   * PRODUCTION FIX: Improved mobile permission handling with better error detection
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      const error = new Error('Geolocation is not supported by this browser');
      logger.error('Geolocation not supported', 'LocationService', { error: error.message });
      return false;
    }

    // Check if permission is already granted before requesting
    const currentPermission = await this.checkPermission();
    if (currentPermission === 'granted') {
      logger.info('Location permission already granted', 'LocationService', {
        deviceType: this.deviceInfo.deviceType,
      });
      // Update cache to ensure we remember it's granted
      this.cachedPermissionState = 'granted';
      this.permissionCheckTime = Date.now();
      return true;
    }

    // PRODUCTION FIX: If permission was previously denied, return false immediately
    // On mobile browsers, once denied, user must enable it manually in browser settings
    if (currentPermission === 'denied') {
      logger.warn('Location permission was previously denied', 'LocationService', {
        deviceType: this.deviceInfo.deviceType,
        isMobile: this.deviceInfo.isMobile,
        note: 'User must enable location permission in browser settings'
      });
      return false;
    }

    // Log device info on first permission request
    logGPSDeviceInfo();

    try {
      // PRODUCTION FIX: Use more lenient timeout for mobile devices (GPS needs time to acquire signal)
      const options = getOptimalPositionOptions(this.deviceInfo);
      // CRITICAL FIX: Increased timeout for mobile GPS - GPS can take 20-45 seconds to acquire signal
      // The getOptimalPositionOptions already sets 45s for GPS devices, but we ensure it here too
      if (this.deviceInfo.isMobile && this.deviceInfo.hasGPSHardware) {
        options.timeout = 45000; // 45 seconds for mobile GPS (was 20s - too short)
      }
      
      return new Promise((resolve) => {
        // PRODUCTION FIX: Add timeout to prevent hanging on mobile devices
        const timeoutId = setTimeout(() => {
          logger.warn('Location permission request timed out', 'LocationService', {
            deviceType: this.deviceInfo.deviceType,
            timeout: options.timeout,
            note: 'This may indicate permission was denied or GPS is taking too long'
          });
          resolve(false);
        }, (options.timeout || 15000) + 5000); // Add 5 seconds buffer

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            // Update cache to reflect that permission is granted
            this.cachedPermissionState = 'granted';
            this.permissionCheckTime = Date.now();
            
            logger.info('Location permission granted', 'LocationService', {
              hasGPSHardware: this.deviceInfo.hasGPSHardware,
              deviceType: this.deviceInfo.deviceType,
              accuracy: position.coords.accuracy,
            });
            resolve(true);
          },
          (error) => {
            clearTimeout(timeoutId);
            // PRODUCTION FIX: Handle all error types properly
            if (error.code === error.PERMISSION_DENIED) {
              // Update cache to reflect that permission is denied
              this.cachedPermissionState = 'denied';
              this.permissionCheckTime = Date.now();
              
              logger.warn('Location permission denied', 'LocationService', { 
                error: error.message,
                code: error.code,
                deviceType: this.deviceInfo.deviceType,
                isMobile: this.deviceInfo.isMobile,
                note: this.deviceInfo.isMobile 
                  ? 'User must enable location permission in device/browser settings'
                  : 'User denied location permission'
              });
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              logger.warn('Location unavailable', 'LocationService', {
                error: error.message,
                code: error.code,
                deviceType: this.deviceInfo.deviceType,
                note: 'GPS signal may be weak or unavailable'
              });
              // Don't cache this as denied - it might work later
            } else if (error.code === error.TIMEOUT) {
              logger.warn('Location request timed out', 'LocationService', {
                error: error.message,
                code: error.code,
                deviceType: this.deviceInfo.deviceType,
                timeout: options.timeout,
                note: 'GPS may be taking longer than expected to acquire signal'
              });
              // Don't cache this as denied - it might work with more time
            }
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

  /**
   * Get device info
   */
  getDeviceInfo() {
    return this.deviceInfo;
  }

  /**
   * Get optimal position options for device
   */
  getOptimalPositionOptions() {
    return getOptimalPositionOptions(this.deviceInfo);
  }

  /**
   * Reset permission cache and attempt to request permission again
   * PRODUCTION FIX: Allow users to manually retry permission request
   * Useful when permission was denied but user has enabled it in browser settings
   */
  resetPermissionCache(): void {
    this.cachedPermissionState = null;
    this.permissionCheckTime = 0;
    logger.info('Permission cache reset', 'LocationService', {
      deviceType: this.deviceInfo.deviceType,
      note: 'User can now retry permission request'
    });
  }

  /**
   * Check if permission is currently denied (cached)
   */
  isPermissionDenied(): boolean {
    return this.cachedPermissionState === 'denied';
  }
}

// Export singleton instance
export const permissionManager = new PermissionManager();

