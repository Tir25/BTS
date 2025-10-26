"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../utils/logger");
class DriverService {
    static async getAllDrivers() {
        try {
            const query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.profile_photo_url,
          u.role,
          u.created_at,
          u.updated_at,
          b.id as assigned_bus_id,
          b.code as bus_code,
          b.number_plate as bus_number_plate,
          r.id as assigned_route_id,
          r.name as route_name,
          b.updated_at as assigned_at
        FROM users u
        LEFT JOIN buses b ON u.id = b.assigned_driver_id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE u.role = 'driver'
        ORDER BY u.created_at DESC
      `;
            const result = await database_1.default.query(query);
            logger_1.logger.info(`Fetched ${result.rows.length} drivers from database`, 'driver-service');
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error fetching all drivers', 'driver-service', { error });
            throw error;
        }
    }
    static async getDriverById(driverId) {
        try {
            const query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.profile_photo_url,
          u.role,
          u.created_at,
          u.updated_at,
          b.id as assigned_bus_id,
          b.code as bus_code,
          b.number_plate as bus_number_plate,
          r.id as assigned_route_id,
          r.name as route_name,
          b.updated_at as assigned_at
        FROM users u
        LEFT JOIN buses b ON u.id = b.assigned_driver_id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE u.id = $1 AND u.role = 'driver'
      `;
            const result = await database_1.default.query(query, [driverId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error fetching driver by ID', 'driver-service', { error, driverId });
            throw error;
        }
    }
    static async getAssignedDrivers() {
        try {
            const query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.profile_photo_url,
          u.role,
          u.created_at,
          u.updated_at,
          b.id as assigned_bus_id,
          b.code as bus_code,
          b.number_plate as bus_number_plate,
          r.id as assigned_route_id,
          r.name as route_name,
          b.updated_at as assigned_at
        FROM users u
        INNER JOIN buses b ON u.id = b.assigned_driver_id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE u.role = 'driver'
        ORDER BY b.updated_at DESC
      `;
            const result = await database_1.default.query(query);
            logger_1.logger.info(`Fetched ${result.rows.length} assigned drivers from database`, 'driver-service');
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error fetching assigned drivers', 'driver-service', { error });
            throw error;
        }
    }
    static async createDriver(driverData) {
        try {
            const query = `
        INSERT INTO users (
          email, first_name, last_name, phone, 
          profile_photo_url, role
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
            const values = [
                driverData.email,
                driverData.first_name,
                driverData.last_name,
                driverData.phone || null,
                driverData.profile_photo_url || null,
                'driver'
            ];
            const result = await database_1.default.query(query, values);
            logger_1.logger.info('Driver created successfully', 'driver-service', { driverId: result.rows[0].id });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error creating driver', 'driver-service', { error, driverData });
            throw error;
        }
    }
    static async updateDriver(driverId, driverData) {
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            Object.entries(driverData).forEach(([key, value]) => {
                if (value !== undefined && key !== 'id' && key !== 'role') {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            updateFields.push(`updated_at = NOW()`);
            values.push(driverId);
            const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND role = 'driver'
        RETURNING *
      `;
            const result = await database_1.default.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info('Driver updated successfully', 'driver-service', { driverId });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error updating driver', 'driver-service', { error, driverId, driverData });
            throw error;
        }
    }
    static async deleteDriver(driverId) {
        try {
            const query = `
        DELETE FROM users 
        WHERE id = $1 AND role = 'driver'
        RETURNING *
      `;
            const result = await database_1.default.query(query, [driverId]);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info('Driver deleted successfully', 'driver-service', { driverId });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error deleting driver', 'driver-service', { error, driverId });
            throw error;
        }
    }
    static async getDriverStats() {
        try {
            const query = `
        SELECT 
          COUNT(*) as total_drivers,
          COUNT(CASE WHEN b.assigned_driver_id IS NOT NULL THEN 1 END) as assigned_drivers,
          COUNT(CASE WHEN b.assigned_driver_id IS NULL THEN 1 END) as unassigned_drivers
        FROM users u
        LEFT JOIN buses b ON u.id = b.assigned_driver_id
        WHERE u.role = 'driver'
      `;
            const result = await database_1.default.query(query);
            const stats = result.rows[0];
            return {
                totalDrivers: parseInt(stats.total_drivers),
                activeDrivers: parseInt(stats.total_drivers),
                assignedDrivers: parseInt(stats.assigned_drivers),
                unassignedDrivers: parseInt(stats.unassigned_drivers)
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching driver statistics', 'driver-service', { error });
            throw error;
        }
    }
}
exports.DriverService = DriverService;
//# sourceMappingURL=DriverService.js.map