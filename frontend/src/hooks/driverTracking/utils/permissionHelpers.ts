/**
 * Helper functions for location permission handling
 */

export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

/**
 * Detects device type from user agent
 */
export function detectDeviceType(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  
  return { isMobile, isIOS, isAndroid };
}

/**
 * Gets device-specific permission error message
 */
export function getPermissionErrorMessage(deviceInfo: DeviceInfo, isManualRequest = false): string {
  let errorMsg = 'Location permission denied. ';
  
  if (deviceInfo.isIOS) {
    errorMsg += 'Please enable location access:\n1. Open iPhone Settings\n2. Go to Safari (or your browser)\n3. Enable Location Services\n4. Allow location access for this website\n5. Return here and try again';
    if (isManualRequest) {
      errorMsg += '\n\nThen tap "Request Permission" again.';
    }
  } else if (deviceInfo.isAndroid) {
    errorMsg += 'Please enable location access:\n1. Tap the menu (⋮) in your browser\n2. Go to Settings > Site Settings\n3. Enable Location permissions\n4. Allow location access for this website\n5. Return here and try again';
    if (isManualRequest) {
      errorMsg += '\n\nThen tap "Request Permission" again.';
    }
  } else if (deviceInfo.isMobile) {
    errorMsg += 'Please enable location access in your device/browser settings and allow this site to access your location.';
    if (isManualRequest) {
      errorMsg += ' Then tap "Request Permission" again.';
    }
  } else {
    errorMsg += 'Please enable location access in your browser settings and allow this site to access your location.';
    if (isManualRequest) {
      errorMsg += ' Then click "Request Permission" again.';
    }
  }
  
  return errorMsg;
}

