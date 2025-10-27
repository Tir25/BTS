import { logger } from '../utils/logger';
import pool from '../config/database';

/**
 * Location Archive Service
 * Handles archiving old location data from live_locations to locations table
 * and cleanup of old historical data
 */
class LocationArchiveService {
  private archiveInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Archive old locations from live_locations to locations table
   */
  async archiveOldLocations(): Promise<{ archived: number; deleted: number }> {
    try {
      logger.info('Starting location archive process', 'location-archive');

      // Call the database function to archive old locations
      const result = await pool.query('SELECT archive_old_locations()');

      // Get count of archived records
      const archiveCountResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM locations 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);

      const archived = parseInt(archiveCountResult.rows[0]?.count || '0', 10);

      // Get count of deleted records from live_locations
      const deletedResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM live_locations 
        WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);

      const deleted = parseInt(deletedResult.rows[0]?.count || '0', 10);

      logger.info('Location archive completed', 'location-archive', {
        archived,
        deleted,
      });

      return { archived, deleted };
    } catch (error) {
      logger.error('Error archiving locations', 'location-archive', { error });
      return { archived: 0, deleted: 0 };
    }
  }

  /**
   * Cleanup old historical location data (older than retention period)
   * Default retention: 90 days
   */
  async cleanupOldLocations(retentionDays: number = 90): Promise<number> {
    try {
      logger.info('Starting location cleanup', 'location-archive', {
        retentionDays,
      });

      const result = await pool.query(
        `
        DELETE FROM locations 
        WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
        RETURNING id
      `
      );

      const deletedCount = result.rowCount || 0;

      logger.info('Location cleanup completed', 'location-archive', {
        deletedCount,
        retentionDays,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up locations', 'location-archive', { error });
      return 0;
    }
  }

  /**
   * Start automatic archiving (runs every hour)
   */
  startAutoArchive(intervalMinutes: number = 60): void {
    if (this.archiveInterval) {
      logger.warn('Archive interval already running', 'location-archive');
      return;
    }

    logger.info('Starting automatic location archiving', 'location-archive', {
      intervalMinutes,
    });

    this.archiveInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.archiveOldLocations();
        } catch (error) {
          logger.error('Error in auto archive', 'location-archive', { error });
        } finally {
          this.isRunning = false;
        }
      }
    }, intervalMinutes * 60 * 1000);

    // Run immediately on start
    this.archiveOldLocations().catch((error) => {
      logger.error('Error in initial archive', 'location-archive', { error });
    });
  }

  /**
   * Start automatic cleanup (runs daily)
   */
  startAutoCleanup(intervalHours: number = 24): void {
    if (this.cleanupInterval) {
      logger.warn('Cleanup interval already running', 'location-archive');
      return;
    }

    logger.info('Starting automatic location cleanup', 'location-archive', {
      intervalHours,
    });

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOldLocations();
      } catch (error) {
        logger.error('Error in auto cleanup', 'location-archive', { error });
      }
    }, intervalHours * 60 * 60 * 1000);

    // Run immediately on start
    this.cleanupOldLocations().catch((error) => {
      logger.error('Error in initial cleanup', 'location-archive', { error });
    });
  }

  /**
   * Stop automatic archiving
   */
  stopAutoArchive(): void {
    if (this.archiveInterval) {
      clearInterval(this.archiveInterval);
      this.archiveInterval = null;
      logger.info('Stopped automatic location archiving', 'location-archive');
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Stopped automatic location cleanup', 'location-archive');
    }
  }

  /**
   * Stop all services
   */
  stop(): void {
    this.stopAutoArchive();
    this.stopAutoCleanup();
    logger.info('Location archive service stopped', 'location-archive');
  }
}

// Export singleton instance
export const locationArchiveService = new LocationArchiveService();
export default locationArchiveService;

