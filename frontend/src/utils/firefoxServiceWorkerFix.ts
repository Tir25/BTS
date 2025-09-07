// Firefox-specific Service Worker fixes
// Based on web search results about Firefox privacy settings blocking Service Worker

export interface FirefoxPrivacySettings {
  hasRestrictiveSettings: boolean;
  canUseServiceWorker: boolean;
  recommendations: string[];
}

/**
 * Check Firefox privacy settings that might block Service Worker
 */
export function checkFirefoxPrivacySettings(): FirefoxPrivacySettings {
  const userAgent = navigator.userAgent;
  const isFirefox = userAgent.includes('Firefox');
  
  if (!isFirefox) {
    return {
      hasRestrictiveSettings: false,
      canUseServiceWorker: true,
      recommendations: [],
    };
  }
  
  const recommendations: string[] = [];
  let hasRestrictiveSettings = false;
  
  // Check for common Firefox privacy settings that block Service Worker
  try {
    // Check if storage is available
    if (typeof navigator.storage !== 'undefined') {
      // This is a basic check - Firefox might have additional restrictions
      console.log('🔍 Firefox detected - checking storage permissions');
    }
    
    // Check for private browsing mode
    if (typeof navigator.storage !== 'undefined' && 
        typeof navigator.storage.estimate === 'function') {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.quota === 0) {
          hasRestrictiveSettings = true;
          recommendations.push('Private browsing mode detected - Service Worker may not work');
        }
      }).catch(() => {
        // Storage API not available
        hasRestrictiveSettings = true;
        recommendations.push('Storage API not available - check Firefox privacy settings');
      });
    }
    
    // Check for Enhanced Tracking Protection
    if (typeof navigator.doNotTrack !== 'undefined' && navigator.doNotTrack === '1') {
      recommendations.push('Enhanced Tracking Protection is enabled - may affect Service Worker');
    }
    
    // Check for strict privacy settings
    if (typeof navigator.cookieEnabled !== 'undefined' && !navigator.cookieEnabled) {
      hasRestrictiveSettings = true;
      recommendations.push('Cookies are disabled - Service Worker may not work properly');
    }
    
  } catch (error) {
    console.warn('⚠️ Error checking Firefox privacy settings:', error);
    hasRestrictiveSettings = true;
    recommendations.push('Unable to check privacy settings - Service Worker may be blocked');
  }
  
  return {
    hasRestrictiveSettings,
    canUseServiceWorker: !hasRestrictiveSettings,
    recommendations,
  };
}

/**
 * Get Firefox-specific recommendations for Service Worker issues
 */
export function getFirefoxServiceWorkerRecommendations(): string[] {
  const settings = checkFirefoxPrivacySettings();
  
  if (!settings.hasRestrictiveSettings) {
    return [];
  }
  
  const recommendations = [
    'Firefox Privacy Settings Recommendations:',
    '1. Go to about:preferences#privacy',
    '2. Ensure "Delete cookies and site data when Firefox is closed" is unchecked',
    '3. Check that Enhanced Tracking Protection is not set to "Strict"',
    '4. Verify that cookies are enabled for this site',
    '5. If in private browsing mode, Service Worker will not work',
    '6. Consider adding this site to exceptions if needed',
  ];
  
  return [...recommendations, ...settings.recommendations];
}

/**
 * Display Firefox-specific help message
 */
export function displayFirefoxServiceWorkerHelp(): void {
  const recommendations = getFirefoxServiceWorkerRecommendations();
  
  if (recommendations.length > 0) {
    console.group('🦊 Firefox Service Worker Help');
    recommendations.forEach(rec => console.log(rec));
    console.groupEnd();
  }
}

/**
 * Check if we should skip Service Worker registration in Firefox
 */
export function shouldSkipServiceWorkerInFirefox(): boolean {
  const settings = checkFirefoxPrivacySettings();
  return settings.hasRestrictiveSettings;
}
