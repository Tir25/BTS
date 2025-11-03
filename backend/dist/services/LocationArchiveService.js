"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationArchiveService = void 0;
const logger_1 = require("../utils/logger");
const database_1 = __importDefault(require("../config/database"));
class LocationArchiveService {
    constructor() {
        this.archiveInterval = null;
        this.cleanupInterval = null;
        this.isRunning = false;
    }
    async archiveOldLocations() {
        try {
            logger_1.logger.info('Starting location archive process', 'location-archive');
            const result = await database_1.default.query('SELECT archive_old_locations()');
            const archiveCountResult = await database_1.default.query(`
        SELECT COUNT(*) as count 
        FROM locations 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);
            const archived = parseInt(archiveCountResult.rows[0]?.count || '0', 10);
            const deletedResult = await database_1.default.query(`
        SELECT COUNT(*) as count 
        FROM live_locations 
        WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);
            const deleted = parseInt(deletedResult.rows[0]?.count || '0', 10);
            logger_1.logger.info('Location archive completed', 'location-archive', {
                archived,
                deleted,
            });
            return { archived, deleted };
        }
        catch (error) {
            logger_1.logger.error('Error archiving locations', 'location-archive', { error });
            return { archived: 0, deleted: 0 };
        }
    }
    async cleanupOldLocations(retentionDays = 90) {
        try {
            logger_1.logger.info('Starting location cleanup', 'location-archive', {
                retentionDays,
            });
            const result = await database_1.default.query(`
        DELETE FROM locations 
        WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
        RETURNING id
      `);
            const deletedCount = result.rowCount || 0;
            logger_1.logger.info('Location cleanup completed', 'location-archive', {
                deletedCount,
                retentionDays,
            });
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up locations', 'location-archive', { error });
            return 0;
        }
    }
    startAutoArchive(intervalMinutes = 60) {
        if (this.archiveInterval) {
            logger_1.logger.warn('Archive interval already running', 'location-archive');
            return;
        }
        logger_1.logger.info('Starting automatic location archiving', 'location-archive', {
            intervalMinutes,
        });
        this.archiveInterval = setInterval(async () => {
            if (!this.isRunning) {
                this.isRunning = true;
                try {
                    await this.archiveOldLocations();
                }
                catch (error) {
                    logger_1.logger.error('Error in auto archive', 'location-archive', { error });
                }
                finally {
                    this.isRunning = false;
                }
            }
        }, intervalMinutes * 60 * 1000);
        this.archiveOldLocations().catch((error) => {
            logger_1.logger.error('Error in initial archive', 'location-archive', { error });
        });
    }
    startAutoCleanup(intervalHours = 24) {
        if (this.cleanupInterval) {
            logger_1.logger.warn('Cleanup interval already running', 'location-archive');
            return;
        }
        logger_1.logger.info('Starting automatic location cleanup', 'location-archive', {
            intervalHours,
        });
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.cleanupOldLocations();
            }
            catch (error) {
                logger_1.logger.error('Error in auto cleanup', 'location-archive', { error });
            }
        }, intervalHours * 60 * 60 * 1000);
        this.cleanupOldLocations().catch((error) => {
            logger_1.logger.error('Error in initial cleanup', 'location-archive', { error });
        });
    }
    stopAutoArchive() {
        if (this.archiveInterval) {
            clearInterval(this.archiveInterval);
            this.archiveInterval = null;
            logger_1.logger.info('Stopped automatic location archiving', 'location-archive');
        }
    }
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger_1.logger.info('Stopped automatic location cleanup', 'location-archive');
        }
    }
    stop() {
        this.stopAutoArchive();
        this.stopAutoCleanup();
        logger_1.logger.info('Location archive service stopped', 'location-archive');
    }
}
exports.locationArchiveService = new LocationArchiveService();
exports.default = exports.locationArchiveService;
//# sourceMappingURL=LocationArchiveService.js.map