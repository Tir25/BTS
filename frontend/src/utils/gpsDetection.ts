/**
 * GPS Hardware Detection and Capability Assessment
 * 
 * Detects whether the device has GPS hardware capabilities
 * and provides adaptive location tracking strategies
 */

import { logger } from './logger';

export interface GPSDeviceInfo {
  hasGPSHardware: boolean;
  deviceType: 'mobile-gps' | 'desktop-mock' | 'tablet-gps' | 'unknown';
  isMobile: boolean;
  recommendedAccuracyMode: 'high' | 'low' | 'balanced';
  accuracyWarningThreshold: number; // meters
}

/**
 * Detects if device is mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detects if device is tablet
 */
function isTabletDevice(): boolean {
  return /iPad|Android.*Mobile/i.test(navigator.userAgent);
}

/**
 * Estimates GPS hardware availability based on device type and user agent
 * Mobile devices typically have GPS hardware, desktops rely on IP/WiFi positioning
 */
export function detectGPSDeviceInfo(): GPSDeviceInfo {
  const isMobile = isMobileDevice();
  const isTablet = isTabletDevice();
  
  // Mobile devices (smartphones) typically have GPS hardware
  if (isMobile && !isTablet) {
    return {
      hasGPSHardware: true,
      deviceType: 'mobile-gps',
      isMobile: true,
      recommendedAccuracyMode: 'high',
      accuracyWarningThreshold: 50, // Warn if accuracy > 50m on mobile GPS
    };
  }
  
  // Tablets may or may not have GPS (iPad does, Android tablets vary)
  if (isTablet) {
    const hasTabletGPS = /iPad/i.test(navigator.userAgent) || 
                        /Android.*Mobile/i.test(navigator.userAgent);
    return {
      hasGPSHardware: hasTabletGPS,
      deviceType: hasTabletGPS ? 'tablet-gps' : 'desktop-mock',
      isMobile: true,
      recommendedAccuracyMode: hasTabletGPS ? 'high' : 'balanced',
      accuracyWarningThreshold: hasTabletGPS ? 50 : 1000, // Higher threshold for non-GPS tablets
    };
  }
  
  // Desktop browsers use IP/WiFi positioning - no GPS hardware
  return {
    hasGPSHardware: false,
    deviceType: 'desktop-mock',
    isMobile: false,
    recommendedAccuracyMode: 'low',
    accuracyWarningThreshold: 1000, // Expect poor accuracy on desktop (IP-based)
  };
}

/**
 * Categorizes GPS accuracy level
 */
export function categorizeAccuracy(accuracy: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  description: string;
  color: string;
} {
  if (accuracy <= 10) {
    return {
      level: 'excellent',
      description: 'Excellent GPS signal',
      color: 'green',
    };
  }
  if (accuracy <= 50) {
    return {
      level: 'good',
      description: 'Good GPS signal',
      color: 'green',
    };
  }
  if (accuracy <= 100) {
    return {
      level: 'fair',
      description: 'Fair GPS signal',
      color: 'yellow',
    };
  }
  if (accuracy <= 1000) {
    return {
      level: 'poor',
      description: 'Poor GPS signal',
      color: 'orange',
    };
  }
  return {
    level: 'very-poor',
    description: 'Very poor GPS signal (likely IP-based positioning)',
    color: 'red',
  };
}

/**
 * Gets user-friendly accuracy message based on device and accuracy
 */
export function getAccuracyMessage(
  accuracy: number,
  deviceInfo?: GPSDeviceInfo
): {
  message: string;
  severity: 'info' | 'warning' | 'error';
  suggestions?: string[];
} {
  const device = deviceInfo || detectGPSDeviceInfo();
  const category = categorizeAccuracy(accuracy);
  
  // Desktop mock GPS - always warn
  if (device.deviceType === 'desktop-mock') {
    return {
      message: `GPS accuracy is ${Math.round(accuracy / 1000)}km (expected for desktop browser without GPS hardware)`,
      severity: accuracy > 1000 ? 'warning' : 'info',
      suggestions: [
        'Desktop browsers use IP-based location which is inaccurate',
        'For accurate tracking, use a mobile device with GPS',
        'The location shown is approximate city/region level',
      ],
    };
  }
  
  // Mobile GPS with poor accuracy
  if (device.hasGPSHardware && accuracy > device.accuracyWarningThreshold) {
    return {
      message: `GPS accuracy is ${Math.round(accuracy)}m (${category.description})`,
      severity: accuracy > 1000 ? 'error' : 'warning',
      suggestions: [
        'Move to an open area with clear sky view',
        'Wait 10-15 seconds for GPS to acquire signal',
        'Check if GPS is enabled in device settings',
        'If indoors, move near a window',
      ],
    };
  }
  
  // Good accuracy
  return {
    message: `GPS accuracy: ${Math.round(accuracy)}m (${category.description})`,
    severity: 'info',
  };
}

/**
 * Checks if accuracy should trigger validation warnings
 */
export function shouldWarnAboutAccuracy(accuracy: number, deviceInfo?: GPSDeviceInfo): boolean {
  const device = deviceInfo || detectGPSDeviceInfo();
  return accuracy > device.accuracyWarningThreshold;
}

/**
 * Checks if accuracy is acceptable for location tracking
 * (Even poor accuracy is better than no location)
 */
export function isAccuracyAcceptable(accuracy: number, deviceInfo?: GPSDeviceInfo): boolean {
  const device = deviceInfo || detectGPSDeviceInfo();
  
  // Desktop mock GPS - accept any accuracy (it's the best we can get)
  if (device.deviceType === 'desktop-mock') {
    return true;
  }
  
  // Mobile GPS - accept up to 5000m (5km) - very lenient
  // Poor GPS is better than no GPS
  return accuracy <= 5000;
}

/**
 * Gets optimal PositionOptions based on device capabilities
 * CRITICAL FIX: Optimized for desktop browsers with IP-based positioning
 */
export function getOptimalPositionOptions(deviceInfo?: GPSDeviceInfo): PositionOptions {
  const device = deviceInfo || detectGPSDeviceInfo();
  
  // Mobile devices with GPS hardware should use high accuracy
  if (device.hasGPSHardware) {
    return {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds for mobile GPS to acquire signal
      maximumAge: 5000, // Accept up to 5 seconds old data (GPS updates frequently)
    };
  }
  
  // CRITICAL FIX: Desktop/IP-based positioning - optimized for frequent updates
  // Desktop browsers need more aggressive polling to maintain location updates
  return {
    enableHighAccuracy: false, // No point requesting high accuracy without GPS
    timeout: 10000, // Reduced timeout for faster polling fallback
    maximumAge: 10000, // Accept cached data up to 10 seconds (more frequent updates)
  };
}

/**
 * Logs GPS device information for debugging
 */
export function logGPSDeviceInfo(): void {
  const deviceInfo = detectGPSDeviceInfo();
  logger.info('GPS device detection', 'gps-detection', {
    hasGPSHardware: deviceInfo.hasGPSHardware,
    deviceType: deviceInfo.deviceType,
    isMobile: deviceInfo.isMobile,
    recommendedAccuracyMode: deviceInfo.recommendedAccuracyMode,
    accuracyWarningThreshold: deviceInfo.accuracyWarningThreshold,
    userAgent: navigator.userAgent,
  });
}

