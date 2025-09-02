/**
 * Firefox Compatibility Utilities
 * Handles Firefox-specific issues with CORS, SSE, and WebSocket connections
 */

export interface BrowserInfo {
  isFirefox: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isEdge: boolean;
  version: string;
  userAgent: string;
}

/**
 * Detect browser and version
 */
export const detectBrowser = (): BrowserInfo => {
  const userAgent = navigator.userAgent;
  
  const isFirefox = /Firefox/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edge/.test(userAgent);
  
  let version = '';
  if (isFirefox) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : '';
  } else if (isChrome) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : '';
  } else if (isSafari) {
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : '';
  } else if (isEdge) {
    const match = userAgent.match(/Edge\/(\d+)/);
    version = match ? match[1] : '';
  }
  
  return {
    isFirefox,
    isChrome,
    isSafari,
    isEdge,
    version,
    userAgent
  };
};

/**
 * Get Firefox-specific EventSource options
 */
export const getFirefoxEventSourceOptions = (): EventSourceInit => {
  const browser = detectBrowser();
  
  if (browser.isFirefox) {
    console.log('🦊 Firefox detected - using Firefox-specific EventSource configuration');
    return {
      withCredentials: false, // Firefox has issues with credentials in some cases
    };
  }
  
  // For all browsers, try without credentials first for better compatibility
  return {
    withCredentials: false, // More compatible across browsers
  };
};

/**
 * Get Firefox-specific fetch options
 */
export const getFirefoxFetchOptions = (): RequestInit => {
  const browser = detectBrowser();
  
  if (browser.isFirefox) {
    console.log('🦊 Firefox detected - using Firefox-specific fetch configuration');
    return {
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
  }
  
  return {
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Check if Enhanced Tracking Protection is enabled (Firefox-specific)
 */
export const checkFirefoxTrackingProtection = (): boolean => {
  const browser = detectBrowser();
  
  if (!browser.isFirefox) {
    return false;
  }
  
  // Try to detect if Enhanced Tracking Protection is blocking requests
  // This is a heuristic - we can't directly detect it
  const hasTrackingProtection = navigator.userAgent.includes('Firefox') && 
    (navigator.userAgent.includes('Firefox/78') || 
     navigator.userAgent.includes('Firefox/79') || 
     navigator.userAgent.includes('Firefox/8') ||
     navigator.userAgent.includes('Firefox/9') ||
     navigator.userAgent.includes('Firefox/10') ||
     navigator.userAgent.includes('Firefox/11') ||
     navigator.userAgent.includes('Firefox/12'));
  
  if (hasTrackingProtection) {
    console.log('🦊 Firefox Enhanced Tracking Protection may be active');
  }
  
  return hasTrackingProtection;
};

/**
 * Get Firefox-specific recommendations
 */
export const getFirefoxRecommendations = (): string[] => {
  const browser = detectBrowser();
  const recommendations: string[] = [];
  
  if (browser.isFirefox) {
    recommendations.push(
      '🦊 Firefox detected - if you experience CORS issues:',
      '1. Disable Enhanced Tracking Protection for localhost',
      '2. Go to about:config and set security.fileuri.strict_origin_policy to false',
      '3. Try using Private Browsing mode',
      '4. Disable browser extensions temporarily'
    );
  }
  
  return recommendations;
};

/**
 * Log Firefox-specific debugging information
 */
export const logFirefoxDebugInfo = (): void => {
  const browser = detectBrowser();
  
  if (browser.isFirefox) {
    console.log('🦊 Firefox Debug Information:', {
      version: browser.version,
      userAgent: browser.userAgent,
      hasTrackingProtection: checkFirefoxTrackingProtection(),
      recommendations: getFirefoxRecommendations(),
    });
  }
};

export default {
  detectBrowser,
  getFirefoxEventSourceOptions,
  getFirefoxFetchOptions,
  checkFirefoxTrackingProtection,
  getFirefoxRecommendations,
  logFirefoxDebugInfo,
};
