/**
 * Haptic Feedback Utilities - Enhanced Patterns
 * Provides haptic feedback for mobile devices using Vibration API
 */

const isVibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/**
 * Trigger a short haptic feedback (single tap)
 */
export function hapticLight() {
    if (isVibrationSupported) navigator.vibrate(10);
}

/**
 * Trigger a medium haptic feedback (button press)
 */
export function hapticMedium() {
    if (isVibrationSupported) navigator.vibrate(25);
}

/**
 * Trigger a strong haptic feedback
 */
export function hapticHeavy() {
    if (isVibrationSupported) navigator.vibrate(50);
}

/**
 * Success pattern - two short bursts (default)
 */
export function hapticSuccess() {
    if (isVibrationSupported) navigator.vibrate([20, 50, 20]);
}

/**
 * Error pattern - long vibration
 */
export function hapticError() {
    if (isVibrationSupported) navigator.vibrate(100);
}

/**
 * Notification pattern
 */
export function hapticNotification() {
    if (isVibrationSupported) navigator.vibrate([30, 100, 30]);
}

// ============== NEW ENHANCED PATTERNS ==============

/**
 * Double pulse - used for going online (confirmation feel)
 */
export function hapticDoublePulse() {
    if (isVibrationSupported) navigator.vibrate([30, 80, 30]);
}

/**
 * Celebration pattern - used for completing a route
 */
export function hapticCelebration() {
    if (isVibrationSupported) navigator.vibrate([50, 100, 50, 100, 100]);
}

/**
 * Arrival pattern - used when marking stop as arrived
 */
export function hapticArrival() {
    if (isVibrationSupported) navigator.vibrate([40, 60, 20]);
}

/**
 * Warning pattern - used for important alerts
 */
export function hapticWarning() {
    if (isVibrationSupported) navigator.vibrate([80, 50, 80]);
}

/**
 * Selection pattern - subtle feedback for selections
 */
export function hapticSelection() {
    if (isVibrationSupported) navigator.vibrate(5);
}

// Export as object for easy consumption
export default {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    error: hapticError,
    notification: hapticNotification,
    doublePulse: hapticDoublePulse,
    celebration: hapticCelebration,
    arrival: hapticArrival,
    warning: hapticWarning,
    selection: hapticSelection
};
