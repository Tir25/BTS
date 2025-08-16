import pool from '../config/database';
import { RouteService } from './routeService';

export interface BusData {
  id?: string;
  code: string;
  number_plate: string;
  capacity: number;
  model?: string;
  year?: number;
  bus_image_url?: string;
  assigned_driver_id?: string;
  route_id?: string;
  is_active?: boolean;
}

export interface DriverData {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  profile_photo_url?: string;
  role: 'driver';
}

export interface AnalyticsData {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  activeRoutes: number;
  totalDrivers: number;
  activeDrivers: number;
  averageDelay: number;
  busUsageStats: {
    date: string;
    activeBuses: number;
    totalTrips: number;
  }[];
}

export class AdminService {
  // Bus Management
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
          u.id as driver_id,
          u.first_name as driver_first_name,
          u.last_name as driver_last_name,
          u.email as driver_email,
          u.profile_photo_url as driver_photo_url,
          r.id as route_id,
          r.name as route_name
        FROM buses b
        LEFT JOIN users u ON b.assigned_driver_id = u.id
        LEFT JOIN routes r ON b.route_id = r.id
        ORDER BY b.created_at DESC
      `;
      
      const result = await pool.query(query);
      console.log(`✅ Fetched ${result.rows.length} buses from database`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching all buses:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  static async getBusById(busId: string) {
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
          u.id as driver_id,
          u.first_name as driver_first_name,
          u.last_name as driver_last_name,
          u.email as driver_email,
          u.profile_photo_url as driver_photo_url,
          r.id as route_id,
          r.name as route_name
        FROM buses b
        LEFT JOIN users u ON b.assigned_driver_id = u.id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE b.id = $1
      `;
      
      const result = await pool.query(query, [busId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching bus by ID:', error);
      throw error;
    }
  }

  static async createBus(busData: BusData) {
    try {
      // Check if bus with same code already exists
      const existingCodeCheck = await pool.query(
        'SELECT id FROM buses WHERE code = $1',
        [busData.code]
      );
      
      if (existingCodeCheck.rows.length > 0) {
        throw new Error(`Bus with code '${busData.code}' already exists`);
      }

      // Check if bus with same number plate already exists
      const existingPlateCheck = await pool.query(
        'SELECT id FROM buses WHERE number_plate = $1',
        [busData.number_plate]
      );
      
      if (existingPlateCheck.rows.length > 0) {
        throw new Error(`Bus with number plate '${busData.number_plate}' already exists`);
      }

      const query = `
        INSERT INTO buses (code, number_plate, capacity, model, year, assigned_driver_id, route_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        busData.code,
        busData.number_plate,
        busData.capacity,
        busData.model || null,
        busData.year || null,
        busData.assigned_driver_id || null,
        busData.route_id || null,
        busData.is_active !== false
      ];
      
      const result = await pool.query(query, values);
      console.log('✅ Bus created successfully:', result.rows[0].code);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating bus:', error);
      throw error;
    }
  }

  static async updateBus(busId: string, busData: Partial<BusData>) {
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic update query
      if (busData.code !== undefined) {
        updateFields.push(`code = $${paramCount++}`);
        values.push(busData.code);
      }
      if (busData.number_plate !== undefined) {
        updateFields.push(`number_plate = $${paramCount++}`);
        values.push(busData.number_plate);
      }
      if (busData.capacity !== undefined) {
        updateFields.push(`capacity = $${paramCount++}`);
        values.push(busData.capacity);
      }
      if (busData.model !== undefined) {
        updateFields.push(`model = $${paramCount++}`);
        values.push(busData.model);
      }
      if (busData.year !== undefined) {
        updateFields.push(`year = $${paramCount++}`);
        values.push(busData.year);
      }
      if (busData.assigned_driver_id !== undefined) {
        updateFields.push(`assigned_driver_id = $${paramCount++}`);
        values.push(busData.assigned_driver_id);
      }
      if (busData.route_id !== undefined) {
        updateFields.push(`route_id = $${paramCount++}`);
        values.push(busData.route_id);
      }
      if (busData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(busData.is_active);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(busId);

      const query = `
        UPDATE buses 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating bus:', error);
      throw error;
    }
  }

  static async deleteBus(busId: string) {
    try {
      const query = 'DELETE FROM buses WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [busId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error deleting bus:', error);
      throw error;
    }
  }

  // Driver Management
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
          u.created_at,
          u.updated_at,
          b.id as assigned_bus_id,
          b.number_plate as assigned_bus_plate
        FROM users u
        LEFT JOIN buses b ON u.id = b.assigned_driver_id
        WHERE u.role = 'driver'
        ORDER BY u.created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching all drivers:', error);
      throw error;
    }
  }

  static async getDriverById(driverId: string) {
    try {
      const query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.profile_photo_url,
          u.created_at,
          u.updated_at,
          b.id as assigned_bus_id,
          b.number_plate as assigned_bus_plate
        FROM users u
        LEFT JOIN buses b ON u.id = b.assigned_driver_id
        WHERE u.id = $1 AND u.role = 'driver'
      `;
      
      const result = await pool.query(query, [driverId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching driver by ID:', error);
      throw error;
    }
  }

  static async assignDriverToBus(driverId: string, busId: string) {
    try {
      // First, unassign the driver from any other bus
      await pool.query(
        'UPDATE buses SET assigned_driver_id = NULL WHERE assigned_driver_id = $1',
        [driverId]
      );

      // Then assign to the new bus
      const query = `
        UPDATE buses 
        SET assigned_driver_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [driverId, busId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error assigning driver to bus:', error);
      throw error;
    }
  }

  static async unassignDriverFromBus(driverId: string) {
    try {
      const query = `
        UPDATE buses 
        SET assigned_driver_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE assigned_driver_id = $1
        RETURNING *
      `;
      
      const result = await pool.query(query, [driverId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error unassigning driver from bus:', error);
      throw error;
    }
  }

  static async createDriver(driverData: DriverData) {
    try {
      const query = `
        INSERT INTO users (email, first_name, last_name, phone, role, profile_photo_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        driverData.email,
        driverData.first_name,
        driverData.last_name,
        driverData.phone || null,
        'driver',
        driverData.profile_photo_url || null
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating driver:', error);
      throw error;
    }
  }

  static async updateDriver(driverId: string, driverData: Partial<DriverData>) {
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic update query
      if (driverData.email !== undefined) {
        updateFields.push(`email = $${paramCount++}`);
        values.push(driverData.email);
      }
      if (driverData.first_name !== undefined) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(driverData.first_name);
      }
      if (driverData.last_name !== undefined) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(driverData.last_name);
      }
      if (driverData.phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(driverData.phone);
      }
      if (driverData.profile_photo_url !== undefined) {
        updateFields.push(`profile_photo_url = $${paramCount++}`);
        values.push(driverData.profile_photo_url);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(driverId);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND role = 'driver'
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating driver:', error);
      throw error;
    }
  }

  static async deleteDriver(driverId: string) {
    try {
      // First, unassign from any bus
      await pool.query(
        'UPDATE buses SET assigned_driver_id = NULL WHERE assigned_driver_id = $1',
        [driverId]
      );

      // Then delete the driver
      const query = 'DELETE FROM users WHERE id = $1 AND role = \'driver\' RETURNING *';
      const result = await pool.query(query, [driverId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error deleting driver:', error);
      throw error;
    }
  }

  // Analytics
  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      // Get basic counts
      const busCountQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM buses';
      const routeCountQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM routes';
      const driverCountQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE id IN (SELECT assigned_driver_id FROM buses WHERE assigned_driver_id IS NOT NULL)) as active FROM users WHERE role = \'driver\'';

      const [busResult, routeResult, driverResult] = await Promise.all([
        pool.query(busCountQuery),
        pool.query(routeCountQuery),
        pool.query(driverCountQuery)
      ]);

      // Calculate average delay (simplified - based on estimated vs actual duration)
      const delayQuery = `
        SELECT AVG(COALESCE(actual_duration_minutes - estimated_duration_minutes, 0)) as avg_delay
        FROM (
          SELECT 
            COALESCE(r.estimated_duration_minutes, 30) as estimated_duration_minutes,
            EXTRACT(EPOCH FROM (ll.recorded_at - ll2.recorded_at)) / 60 as actual_duration_minutes
          FROM buses b
          LEFT JOIN routes r ON b.route_id = r.id
          JOIN live_locations ll ON b.id = ll.bus_id
          JOIN live_locations ll2 ON b.id = ll2.bus_id
          WHERE ll.recorded_at > ll2.recorded_at
          AND ll.recorded_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ) as delays
      `;

      const delayResult = await pool.query(delayQuery);

      // Get bus usage stats for the last 7 days
      const usageQuery = `
        SELECT 
          DATE(ll.recorded_at) as date,
          COUNT(DISTINCT ll.bus_id) as active_buses,
          COUNT(*) as total_trips
        FROM live_locations ll
        WHERE ll.recorded_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(ll.recorded_at)
        ORDER BY date DESC
      `;

      const usageResult = await pool.query(usageQuery);

      return {
        totalBuses: parseInt(busResult.rows[0].total),
        activeBuses: parseInt(busResult.rows[0].active),
        totalRoutes: parseInt(routeResult.rows[0].total),
        activeRoutes: parseInt(routeResult.rows[0].active),
        totalDrivers: parseInt(driverResult.rows[0].total),
        activeDrivers: parseInt(driverResult.rows[0].active),
        averageDelay: parseFloat(delayResult.rows[0]?.avg_delay || '0'),
        busUsageStats: usageResult.rows.map(row => ({
          date: row.date,
          activeBuses: parseInt(row.active_buses),
          totalTrips: parseInt(row.total_trips)
        }))
      };
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      throw error;
    }
  }

  // System Health
  static async getSystemHealth() {
    try {
      const healthChecks = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM buses'),
        pool.query('SELECT COUNT(*) as count FROM routes'),
        pool.query('SELECT COUNT(*) as count FROM users WHERE role = \'driver\''),
        pool.query('SELECT COUNT(*) as count FROM live_locations WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL \'1 hour\'')
      ]);

      return {
        buses: parseInt(healthChecks[0].rows[0].count),
        routes: parseInt(healthChecks[1].rows[0].count),
        drivers: parseInt(healthChecks[2].rows[0].count),
        recentLocations: parseInt(healthChecks[3].rows[0].count),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching system health:', error);
      throw error;
    }
  }

  // Route Management
  static async getAllRoutes() {
    try {
      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.distance_km,
          r.estimated_duration_minutes,
          r.is_active,
          r.created_at,
          r.updated_at,
          CASE 
            WHEN r.stops IS NOT NULL THEN ST_AsGeoJSON(r.stops)::json
            ELSE NULL
          END as stops
        FROM routes r
        ORDER BY r.created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching all routes:', error);
      throw error;
    }
  }

  static async getRouteById(routeId: string) {
    try {
      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.distance_km,
          r.estimated_duration_minutes,
          r.is_active,
          r.created_at,
          r.updated_at,
          CASE 
            WHEN r.stops IS NOT NULL THEN ST_AsGeoJSON(r.stops)::json
            ELSE NULL
          END as stops
        FROM routes r
        WHERE r.id = $1
      `;
      
      const result = await pool.query(query, [routeId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching route by ID:', error);
      throw error;
    }
  }

  static async createRoute(routeData: {
    name: string;
    description: string;
    distance_km: number;
    estimated_duration_minutes: number;
    is_active: boolean;
    stops?: any;
  }) {
    try {
      // Create a default geometry if stops is not provided
      let geometryValue = null;
      if (routeData.stops && routeData.stops.coordinates && routeData.stops.coordinates.length > 0) {
        const coordinates = routeData.stops.coordinates.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(',');
        geometryValue = `ST_GeomFromText('LINESTRING(${coordinates})', 4326)`;
      } else {
        // Default geometry for testing
        geometryValue = `ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326)`;
      }

      // First, ensure the geom column exists
      try {
        await pool.query(`
          ALTER TABLE routes ADD COLUMN IF NOT EXISTS geom GEOMETRY(LINESTRING, 4326);
        `);
      } catch (alterError) {
        console.warn('⚠️ Could not add geom column (might already exist):', alterError);
      }

      // Insert with both stops and geom columns
      const query = `
        INSERT INTO routes (name, description, distance_km, estimated_duration_minutes, is_active, stops, geom)
        VALUES ($1, $2, $3, $4, $5, ${geometryValue}, ${geometryValue})
        RETURNING *
      `;
      
      const values = [
        routeData.name,
        routeData.description,
        routeData.distance_km,
        routeData.estimated_duration_minutes,
        routeData.is_active
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating route:', error);
      throw error;
    }
  }

  static async updateRoute(routeId: string, routeData: {
    name?: string;
    description?: string;
    distance_km?: number;
    estimated_duration_minutes?: number;
    is_active?: boolean;
    stops?: any;
  }) {
    try {
      const query = `
        UPDATE routes 
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            distance_km = COALESCE($3, distance_km),
            estimated_duration_minutes = COALESCE($4, estimated_duration_minutes),
            is_active = COALESCE($5, is_active),
            stops = COALESCE($6, stops),
            updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
      
      const values = [
        routeData.name,
        routeData.description,
        routeData.distance_km,
        routeData.estimated_duration_minutes,
        routeData.is_active,
        routeData.stops ? JSON.stringify(routeData.stops) : null,
        routeId
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating route:', error);
      throw error;
    }
  }

  static async deleteRoute(routeId: string) {
    try {
      const query = `
        DELETE FROM routes 
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pool.query(query, [routeId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error deleting route:', error);
      throw error;
    }
  }

  // Clear all data (Development only)
  static async clearAllData() {
    try {
      // Start transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Clear buses (unassign drivers first)
        await client.query('UPDATE buses SET assigned_driver_id = NULL');
        const busesResult = await client.query('DELETE FROM buses RETURNING *');
        
        // Clear routes
        const routesResult = await client.query('DELETE FROM routes RETURNING *');
        
        // Clear drivers
        const driversResult = await client.query('DELETE FROM users WHERE role = \'driver\' RETURNING *');
        
        // Clear live locations
        const locationsResult = await client.query('DELETE FROM live_locations RETURNING *');

        await client.query('COMMIT');

        return {
          deletedBuses: busesResult.rows.length,
          deletedRoutes: routesResult.rows.length,
          deletedDrivers: driversResult.rows.length,
          deletedLocations: locationsResult.rows.length,
          totalDeleted: busesResult.rows.length + routesResult.rows.length + driversResult.rows.length + locationsResult.rows.length
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error clearing all data:', error);
      throw error;
    }
  }
}
