import { logger } from '../../utils/logger';

/**
 * Health monitor for location tracking
 * Monitors location update health and triggers recovery actions
 */
export class HealthMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastSuccessfulUpdateTime: number = 0;
  private trackingStartTime: number = 0;
  private readonly HEALTH_CHECK_INTERVAL_MS = 60000; // Check health every minute
  private readonly HEALTH_ALERT_THRESHOLD_MS = 120000; // Alert if no updates for 2 minutes

  /**
   * Start health monitoring
   */
  start(
    onHealthAlert: () => void,
    getLastUpdateTime: () => number
  ): void {
    // Clear existing health check if any
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.lastSuccessfulUpdateTime = Date.now();
    this.trackingStartTime = Date.now();

    // Check health every minute
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - getLastUpdateTime();
      const trackingDuration = now - this.trackingStartTime;

      // Alert if no updates for extended period (2 minutes)
      if (timeSinceLastUpdate > this.HEALTH_ALERT_THRESHOLD_MS) {
        logger.error('🚨 HEALTH ALERT: No location updates for extended period', 'LocationService', {
          timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
          trackingDuration: Math.round(trackingDuration / 1000 / 60) + ' minutes',
          lastUpdateTime: new Date(getLastUpdateTime()).toISOString(),
          action: 'Attempting recovery...',
        });

        // Trigger recovery action
        onHealthAlert();
      } else {
        // Log health status periodically (every 5 minutes)
        if (trackingDuration > 0 && Math.floor(trackingDuration / (5 * 60 * 1000)) > 0 && 
            Math.floor(trackingDuration / (5 * 60 * 1000)) % 1 === 0) {
          logger.info('✅ Health check: Location updates active', 'LocationService', {
            trackingDuration: Math.round(trackingDuration / 1000 / 60) + ' minutes',
            timeSinceLastUpdate: Math.round(timeSinceLastUpdate / 1000) + 's',
            lastSuccessfulUpdate: new Date(getLastUpdateTime()).toISOString(),
          });
        }
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);

    logger.info('✅ Long-term health monitoring started', 'LocationService', {
      checkInterval: this.HEALTH_CHECK_INTERVAL_MS / 1000 + 's',
      alertThreshold: this.HEALTH_ALERT_THRESHOLD_MS / 1000 + 's',
    });
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.lastSuccessfulUpdateTime = 0;
    this.trackingStartTime = 0;
  }

  /**
   * Update last successful update time
   */
  updateLastSuccessfulUpdate(): void {
    this.lastSuccessfulUpdateTime = Date.now();
  }

  /**
   * Get last successful update time
   */
  getLastSuccessfulUpdateTime(): number {
    return this.lastSuccessfulUpdateTime;
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();

