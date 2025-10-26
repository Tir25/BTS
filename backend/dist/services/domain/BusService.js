"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../utils/logger");
class BusService {
    static async getAllBuses() {
        try {
            const query = `
        SELECT 
          b.id,
          b.code,
          b.number_plate,
          b.capacity,
          b.model,
          b.year,
          b.bus_image_url,
          b.is_active,
          b.created_at,
          b.updated_at,
          COALESCE(p.id, u.id) as driver_id,
          COALESCE(p.full_name, CONCAT(u.first_name, ' ', u.last_name)) as driver_full_name,
          COALESCE(p.email, u.email) as driver_email,
          CASE 
            WHEN p.full_name IS NOT NULL THEN 
              SPLIT_PART(p.full_name, ' ', 1)
            WHEN u.first_name IS NOT NULL THEN 
              u.first_name
            ELSE NULL 
          END as driver_first_name,
          CASE 
            WHEN p.full_name IS NOT NULL THEN 
              CASE 
                WHEN POSITION(' ' IN p.full_name) > 0 THEN 
                  SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)
                ELSE NULL 
              END
            WHEN u.last_name IS NOT NULL THEN 
              u.last_name
            ELSE NULL 
          END as driver_last_name,
          r.id as route_id,
          r.name as route_name
        FROM buses b
        LEFT JOIN profiles p ON b.assigned_driver_id = p.id
        LEFT JOIN users u ON b.assigned_driver_id = u.id
        LEFT JOIN routes r ON b.route_id = r.id
        ORDER BY b.created_at DESC
      `;
            const result = await database_1.default.query(query);
            logger_1.logger.info(`Fetched ${result.rows.length} buses from database`, 'bus-service');
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error fetching all buses', 'bus-service', { error });
            throw error;
        }
    }
    static async getBusById(busId) {
        try {
            const query = `
        SELECT 
          b.id,
          b.code,
          b.number_plate,
          b.capacity,
          b.model,
          b.year,
          b.bus_image_url,
          b.is_active,
          b.created_at,
          b.updated_at,
          COALESCE(p.id, u.id) as driver_id,
          COALESCE(p.full_name, CONCAT(u.first_name, ' ', u.last_name)) as driver_full_name,
          COALESCE(p.email, u.email) as driver_email,
          CASE 
            WHEN p.full_name IS NOT NULL THEN 
              SPLIT_PART(p.full_name, ' ', 1)
            WHEN u.first_name IS NOT NULL THEN 
              u.first_name
            ELSE NULL 
          END as driver_first_name,
          CASE 
            WHEN p.full_name IS NOT NULL THEN 
              CASE 
                WHEN POSITION(' ' IN p.full_name) > 0 THEN 
                  SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)
                ELSE NULL 
              END
            WHEN u.last_name IS NOT NULL THEN 
              u.last_name
            ELSE NULL 
          END as driver_last_name,
          r.id as route_id,
          r.name as route_name
        FROM buses b
        LEFT JOIN profiles p ON b.assigned_driver_id = p.id
        LEFT JOIN users u ON b.assigned_driver_id = u.id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE b.id = $1
      `;
            const result = await database_1.default.query(query, [busId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error fetching bus by ID', 'bus-service', { error, busId });
            throw error;
        }
    }
    static async createBus(busData) {
        try {
            const query = `
        INSERT INTO buses (
          code, number_plate, capacity, model, year, 
          bus_image_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
            const values = [
                busData.code,
                busData.number_plate,
                busData.capacity,
                busData.model || null,
                busData.year || null,
                busData.bus_image_url || null,
                busData.is_active !== false
            ];
            const result = await database_1.default.query(query, values);
            logger_1.logger.info('Bus created successfully', 'bus-service', { busId: result.rows[0].id });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error creating bus', 'bus-service', { error, busData });
            throw error;
        }
    }
    static async updateBus(busId, busData) {
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            Object.entries(busData).forEach(([key, value]) => {
                if (value !== undefined && key !== 'id') {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            updateFields.push(`updated_at = NOW()`);
            values.push(busId);
            const query = `
        UPDATE buses 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
            const result = await database_1.default.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info('Bus updated successfully', 'bus-service', { busId });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error updating bus', 'bus-service', { error, busId, busData });
            throw error;
        }
    }
    static async deleteBus(busId) {
        try {
            const query = `
        DELETE FROM buses 
        WHERE id = $1 
        RETURNING *
      `;
            const result = await database_1.default.query(query, [busId]);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info('Bus deleted successfully', 'bus-service', { busId });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error deleting bus', 'bus-service', { error, busId });
            throw error;
        }
    }
    static async assignDriverToBus(busId, driverId) {
        try {
            const query = `
        UPDATE buses 
        SET assigned_driver_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
            const result = await database_1.default.query(query, [driverId, busId]);
            if (result.rows.length === 0) {
                return null;
            }
            logger_1.logger.info('Driver assigned to bus successfully', 'bus-service', { busId, driverId });
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Error assigning driver to bus', 'bus-service', { error, busId, driverId });
            throw error;
        }
    }
    static async unassignDriverFromBus(driverId) {
        try {
            const query = `
        UPDATE buses 
        SET assigned_driver_id = NULL, updated_at = NOW()
        WHERE assigned_driver_id = $1
        RETURNING *
      `;
            const result = await database_1.default.query(query, [driverId]);
            logger_1.logger.info('Driver unassigned from bus successfully', 'bus-service', { driverId });
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error unassigning driver from bus', 'bus-service', { error, driverId });
            throw error;
        }
    }
    static async getBusesByRoute(routeId) {
        try {
            const query = `
        SELECT 
          b.id,
          b.code,
          b.number_plate,
          b.capacity,
          b.model,
          b.year,
          b.bus_image_url,
          b.is_active,
          b.created_at,
          b.updated_at,
          COALESCE(p.id, u.id) as driver_id,
          COALESCE(p.full_name, CONCAT(u.first_name, ' ', u.last_name)) as driver_full_name,
          COALESCE(p.email, u.email) as driver_email,
          CASE 
            WHEN p.full_name IS NOT NULL THEN 
              SPLIT_PART(p.full_name, ' ', 1)
            WHEN u.first_name IS NOT NULL THEN 
              u.first_name
            ELSE NULL 
          END as driver_first_name,
          CASE 
            WHEN p.full_name IS NOT NULL THEN 
              CASE 
                WHEN POSITION(' ' IN p.full_name) > 0 THEN 
                  SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)
                ELSE NULL 
              END
            WHEN u.last_name IS NOT NULL THEN 
              u.last_name
            ELSE NULL 
          END as driver_last_name,
          r.id as route_id,
          r.name as route_name
        FROM buses b
        LEFT JOIN profiles p ON b.assigned_driver_id = p.id
        LEFT JOIN users u ON b.assigned_driver_id = u.id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE b.route_id = $1
        ORDER BY b.created_at DESC
      `;
            const result = await database_1.default.query(query, [routeId]);
            logger_1.logger.info(`Fetched ${result.rows.length} buses for route ${routeId}`, 'bus-service');
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error fetching buses by route', 'bus-service', { error, routeId });
            throw error;
        }
    }
}
exports.BusService = BusService;
//# sourceMappingURL=BusService.js.map