import pool from '../config/database';

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
        throw new Error(
          `Bus with number plate '${busData.number_plate}' already exists`
        );
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
        busData.is_active !== false,
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
      // Get drivers from profiles table
      const profilesQuery = `
        SELECT 
          p.id,
          p.email,
          p.full_name,
          p.role,
          p.created_at,
          p.updated_at,
          b.id as assigned_bus_id,
          b.number_plate as assigned_bus_plate
        FROM profiles p
        LEFT JOIN buses b ON p.id = b.assigned_driver_id
        WHERE p.role = 'driver'
      `;

      // Get drivers from users table (for dual-role users)
      const usersQuery = `
        SELECT 
          u.id,
          u.email,
          CONCAT(u.first_name, ' ', u.last_name) as full_name,
          u.role,
          u.created_at,
          u.updated_at,
          b.id as assigned_bus_id,
          b.number_plate as assigned_bus_plate
        FROM users u
        LEFT JOIN buses b ON u.id = b.assigned_driver_id
        WHERE u.role = 'driver'
      `;

      const [profilesResult, usersResult] = await Promise.all([
        pool.query(profilesQuery),
        pool.query(usersQuery)
      ]);

      // Combine results and remove duplicates based on email
      const allDrivers = [...profilesResult.rows, ...usersResult.rows];
      const uniqueDrivers = allDrivers.filter((driver, index, self) => 
        index === self.findIndex(d => d.email === driver.email)
      );

      // Sort by creation date
      uniqueDrivers.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      return uniqueDrivers;
    } catch (error) {
      console.error('❌ Error fetching all drivers:', error);
      throw error;
    }
  }

  static async getAssignedDrivers() {
    try {
      // Query assigned drivers from profiles table
      const profilesQuery = `
        SELECT 
          p.id as driver_id,
          p.full_name as driver_name,
          p.email as driver_email,
          b.id as bus_id,
          b.code as bus_code,
          b.number_plate,
          r.name as route_name
        FROM profiles p
        INNER JOIN buses b ON p.id = b.assigned_driver_id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE p.role = 'driver'
      `;

      // Query assigned drivers from users table
      const usersQuery = `
        SELECT 
          u.id as driver_id,
          CONCAT(u.first_name, ' ', u.last_name) as driver_name,
          u.email as driver_email,
          b.id as bus_id,
          b.code as bus_code,
          b.number_plate,
          r.name as route_name
        FROM users u
        INNER JOIN buses b ON u.id = b.assigned_driver_id
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE u.role = 'driver'
      `;

      const [profilesResult, usersResult] = await Promise.all([
        pool.query(profilesQuery),
        pool.query(usersQuery)
      ]);

      // Combine results and remove duplicates based on email
      const allAssignedDrivers = [...profilesResult.rows, ...usersResult.rows];
      const uniqueAssignedDrivers = allAssignedDrivers.filter((driver, index, self) =>
        index === self.findIndex(d => d.driver_email === driver.driver_email)
      );

      // Sort by driver name
      uniqueAssignedDrivers.sort((a, b) => a.driver_name.localeCompare(b.driver_name));

      return uniqueAssignedDrivers;
    } catch (error) {
      console.error('❌ Error fetching assigned drivers:', error);
      throw error;
    }
  }

  static async getDriverById(driverId: string) {
    try {
      const query = `
        SELECT 
          p.id,
          p.email,
          p.full_name,
          p.role,
          p.created_at,
          p.updated_at,
          b.id as assigned_bus_id,
          b.number_plate as assigned_bus_plate
        FROM profiles p
        LEFT JOIN buses b ON p.id = b.assigned_driver_id
        WHERE p.id = $1 AND p.role = 'driver'
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
        driverData.profile_photo_url || null,
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

      // Only delete from users table (not from profiles table which contains Supabase Auth users)
      const query =
        "DELETE FROM users WHERE id = $1 AND role = 'driver' RETURNING *";
      const result = await pool.query(query, [driverId]);

      if (result.rows.length === 0) {
        throw new Error(
          'Driver not found in users table. Supabase Auth users cannot be deleted from this interface.'
        );
      }

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
      const busCountQuery =
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM buses';
      const routeCountQuery =
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM routes';
      // Count drivers from both tables
      const driverCountQuery = `
        SELECT 
          COUNT(DISTINCT all_drivers.id) as total,
          COUNT(DISTINCT CASE WHEN all_drivers.id IN (SELECT assigned_driver_id FROM buses WHERE assigned_driver_id IS NOT NULL) THEN all_drivers.id END) as active
        FROM (
          SELECT id, email FROM profiles WHERE role = 'driver'
          UNION
          SELECT id, email FROM users WHERE role = 'driver'
        ) as all_drivers
      `;

      const [busResult, routeResult, driverResult] = await Promise.all([
        pool.query(busCountQuery),
        pool.query(routeCountQuery),
        pool.query(driverCountQuery),
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
        busUsageStats: usageResult.rows.map((row) => ({
          date: row.date,
          activeBuses: parseInt(row.active_buses),
          totalTrips: parseInt(row.total_trips),
        })),
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
        pool.query("SELECT COUNT(*) as count FROM profiles WHERE role = 'driver'"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver'"),
        pool.query(
          "SELECT COUNT(*) as count FROM live_locations WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'"
        ),
      ]);

      // Count unique drivers from both tables
      const profilesDrivers = parseInt(healthChecks[2].rows[0].count);
      const usersDrivers = parseInt(healthChecks[3].rows[0].count);
      
      // Get unique driver count by querying both tables and counting distinct emails
      const uniqueDriversQuery = `
        SELECT COUNT(DISTINCT email) as unique_count
        FROM (
          SELECT email FROM profiles WHERE role = 'driver'
          UNION
          SELECT email FROM users WHERE role = 'driver'
        ) as all_drivers
      `;
      
      const uniqueDriversResult = await pool.query(uniqueDriversQuery);
      const totalDrivers = parseInt(uniqueDriversResult.rows[0].unique_count);

      return {
        buses: parseInt(healthChecks[0].rows[0].count),
        routes: parseInt(healthChecks[1].rows[0].count),
        drivers: totalDrivers,
        recentLocations: parseInt(healthChecks[4].rows[0].count),
        timestamp: new Date().toISOString(),
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
          r.origin,
          r.destination,
          r.city,
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
          r.origin,
          r.destination,
          r.city,
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
    city: string;
    custom_destination?: string;
    custom_destination_coordinates?: [number, number];
    custom_origin?: string;
    custom_origin_coordinates?: [number, number];
    bus_stops?: any[];
    stops?: any;
  }) {
    try {


      // Validate required fields
      if (!routeData.name || !routeData.name.trim()) {
        throw new Error('Route name is required');
      }

      if (!routeData.city || !routeData.city.trim()) {
        throw new Error('City is required');
      }

      if (!routeData.description || !routeData.description.trim()) {
        throw new Error('Route description is required');
      }

      // Route creation with city and geometry
      const query = `
        INSERT INTO routes (
          name, 
          description, 
          distance_km, 
          estimated_duration_minutes, 
          is_active,
          city,
          geom
        )
        VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.4563 23.5295)', 4326))
        RETURNING *
      `;

      const values = [
        routeData.name,
        routeData.description,
        routeData.distance_km,
        routeData.estimated_duration_minutes,
        routeData.is_active,
        routeData.city.trim(), // Use trimmed city value
      ];



      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating route:', error);
      throw error;
    }
  }

  static async updateRoute(
    routeId: string,
    routeData: {
      name?: string;
      description?: string;
      distance_km?: number;
      estimated_duration_minutes?: number;
      is_active?: boolean;
      city?: string;
      custom_destination?: string;
      custom_destination_coordinates?: [number, number];
      custom_origin?: string;
      custom_origin_coordinates?: [number, number];
      bus_stops?: any[];
      stops?: any;
    }
  ) {
    try {
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Basic fields
      if (routeData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(routeData.name);
      }
      if (routeData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(routeData.description);
      }
      if (routeData.distance_km !== undefined) {
        updateFields.push(`distance_km = $${paramCount++}`);
        values.push(routeData.distance_km);
      }
      if (routeData.estimated_duration_minutes !== undefined) {
        updateFields.push(`estimated_duration_minutes = $${paramCount++}`);
        values.push(routeData.estimated_duration_minutes);
      }
      if (routeData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(routeData.is_active);
      }
      if (routeData.city !== undefined) {
        updateFields.push(`city = $${paramCount++}`);
        values.push(routeData.city);
      }

      // Custom destination
      if (routeData.custom_destination !== undefined) {
        updateFields.push(`custom_destination = $${paramCount++}`);
        values.push(routeData.custom_destination);
      }
      if (routeData.custom_destination_coordinates !== undefined) {
        updateFields.push(
          `custom_destination_coordinates = ST_GeomFromText('POINT($${paramCount} $${paramCount + 1})', 4326)`
        );
        values.push(routeData.custom_destination_coordinates[0]);
        values.push(routeData.custom_destination_coordinates[1]);
        paramCount += 2;
      }

      // Custom origin
      if (routeData.custom_origin !== undefined) {
        updateFields.push(`custom_origin = $${paramCount++}`);
        values.push(routeData.custom_origin);
      }
      if (routeData.custom_origin_coordinates !== undefined) {
        updateFields.push(
          `custom_origin_coordinates = ST_GeomFromText('POINT($${paramCount} $${paramCount + 1})', 4326)`
        );
        values.push(routeData.custom_origin_coordinates[0]);
        values.push(routeData.custom_origin_coordinates[1]);
        paramCount += 2;
      }

      // Bus stops
      if (routeData.bus_stops !== undefined) {
        updateFields.push(`bus_stops = $${paramCount++}`);
        values.push(JSON.stringify(routeData.bus_stops));
      }

      // Stops (legacy field)
      if (routeData.stops !== undefined) {
        updateFields.push(`stops = $${paramCount++}`);
        values.push(routeData.stops ? JSON.stringify(routeData.stops) : null);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(routeId);

      const query = `
        UPDATE routes 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating route:', error);
      throw error;
    }
  }

  static async deleteRoute(routeId: string) {
    try {
      // First, unassign this route from any buses
      await pool.query('UPDATE buses SET route_id = NULL WHERE route_id = $1', [
        routeId,
      ]);

      // Then delete the route
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

  // New method to calculate ETA for a route
  static async calculateRouteETA(
    routeId: string,
    currentLocation: [number, number]
  ) {
    try {
      // Get route details
      const route = await this.getRouteById(routeId);
      if (!route) {
        throw new Error('Route not found');
      }

      // Get destination coordinates
      let destinationCoords = [72.4563, 23.5295] as [number, number]; // Default Ganpat University
      if (route.destination_coordinates) {
        destinationCoords = route.destination_coordinates.coordinates;
      }

      // Calculate distance (simplified - in real app, use proper routing)
      const distance = this.calculateDistance(
        currentLocation,
        destinationCoords
      );

      // Estimate time (assuming average speed of 40 km/h)
      const estimatedMinutes = Math.round((distance / 40) * 60);

      // Update route with ETA
      await pool.query(
        `UPDATE routes 
         SET current_eta_minutes = $1, last_eta_calculation = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [estimatedMinutes, routeId]
      );

      return estimatedMinutes;
    } catch (error) {
      console.error('❌ Error calculating route ETA:', error);
      throw error;
    }
  }

  // Helper method to calculate distance between two points
  private static calculateDistance(
    point1: [number, number],
    point2: [number, number]
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((point2[1] - point1[1]) * Math.PI) / 180;
    const dLon = ((point2[0] - point1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1[1] * Math.PI) / 180) *
        Math.cos((point2[1] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get default destination from system constants
  static async getDefaultDestination() {
    try {
      const query = `
        SELECT constant_value 
        FROM system_constants 
        WHERE constant_name = 'default_destination'
      `;
      const result = await pool.query(query);
      return (
        result.rows[0]?.constant_value || {
          name: 'Ganpat University',
          address:
            'Ganpat Vidyanagar, Mehsana-Gozaria Highway, Kherva, Gujarat 384012',
          coordinates: [72.4563, 23.5295] as [number, number], // Correct Ganpat University coordinates
          city: 'Mehsana',
        }
      );
    } catch (error) {
      console.error('❌ Error fetching default destination:', error);
      // Return default values if table doesn't exist
      return {
        name: 'Ganpat University',
        address:
          'Ganpat Vidyanagar, Mehsana-Gozaria Highway, Kherva, Gujarat 384012',
        coordinates: [72.4563, 23.5295] as [number, number], // Correct Ganpat University coordinates
        city: 'Mehsana',
      };
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
        const routesResult = await client.query(
          'DELETE FROM routes RETURNING *'
        );

        // Clear drivers
        const driversResult = await client.query(
          "DELETE FROM users WHERE role = 'driver' RETURNING *"
        );

        // Clear live locations
        const locationsResult = await client.query(
          'DELETE FROM live_locations RETURNING *'
        );

        await client.query('COMMIT');

        return {
          deletedBuses: busesResult.rows.length,
          deletedRoutes: routesResult.rows.length,
          deletedDrivers: driversResult.rows.length,
          deletedLocations: locationsResult.rows.length,
          totalDeleted:
            busesResult.rows.length +
            routesResult.rows.length +
            driversResult.rows.length +
            locationsResult.rows.length,
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
