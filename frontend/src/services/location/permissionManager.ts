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

    // Log device info on first permission request
    logGPSDeviceInfo();

    try {
      const options = getOptimalPositionOptions(this.deviceInfo);
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
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
            // Only log if it's actually a permission error
            if (error.code === error.PERMISSION_DENIED) {
              // Update cache to reflect that permission is denied
              this.cachedPermissionState = 'denied';
              this.permissionCheckTime = Date.now();
              
              logger.warn('Location permission denied', 'LocationService', { 
                error: error.message,
                code: error.code,
                deviceType: this.deviceInfo.deviceType,
              });
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
}

// Export singleton instance
export const permissionManager = new PermissionManager();

