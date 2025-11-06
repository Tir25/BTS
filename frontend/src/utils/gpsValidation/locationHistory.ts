import { logger } from '../logger';

/**
 * Last valid location structure
 */
interface LastValidLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

/**
 * Location history tracker
 * Tracks last valid location per driver/bus for anomaly detection
 */
class LocationHistory {
  private lastValidLocations = new Map<string, LastValidLocation>();

  /**
   * Get last valid location for a key
   */
  getLastLocation(key: string): LastValidLocation | undefined {
    return this.lastValidLocations.get(key);
  }

  /**
   * Update last valid location
   */
  updateLastLocation(
    key: string,
    latitude: number,
    longitude: number,
    timestamp: number,
    speed?: number
  ): void {
    this.lastValidLocations.set(key, {
      latitude,
      longitude,
      timestamp,
      speed
    });

    // Clean up old entries (keep only last 100)
    if (this.lastValidLocations.size > 100) {
      const entries = Array.from(this.lastValidLocations.entries());
      this.lastValidLocations.clear();
      entries.slice(-50).forEach(([key, value]) => {
        this.lastValidLocations.set(key, value);
      });
    }
  }

  /**
   * Clear location history for a specific key or all keys
   */
  clear(key?: string): void {
    if (key) {
      this.lastValidLocations.delete(key);
      logger.info('Location history cleared', 'gps-validation', { key });
    } else {
      this.lastValidLocations.clear();
      logger.info('All location history cleared', 'gps-validation');
    }
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    trackedLocations: number;
    lastValidLocations: Array<{ key: string; timestamp: number }>;
  } {
    const entries = Array.from(this.lastValidLocations.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp
    }));
    
    return {
      trackedLocations: this.lastValidLocations.size,
      lastValidLocations: entries
    };
  }
}

// Export singleton instance
export const locationHistory = new LocationHistory();

