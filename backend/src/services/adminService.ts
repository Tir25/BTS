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
        pool.query(usersQuery),
      ]);

      // Combine results and remove duplicates based on email and ID
      const allDrivers = [...profilesResult.rows, ...usersResult.rows];

      // Create a Map to track unique drivers by ID first, then by email
      const uniqueDriversMap = new Map();

      allDrivers.forEach((driver) => {
        const idKey = driver.id;

        if (!uniqueDriversMap.has(idKey)) {
          // First time seeing this ID
          uniqueDriversMap.set(idKey, driver);
        } else {
          // We already have this ID, check if we should replace it
          const existing = uniqueDriversMap.get(idKey);

          // Prefer the entry with email over null email
          if (!existing.email && driver.email) {
            uniqueDriversMap.set(idKey, driver);
          }
          // If both have emails, prefer the one with more complete data
          else if (existing.email && driver.email) {
            // Keep the existing one unless the new one has more complete data
            if (!existing.full_name && driver.full_name) {
              uniqueDriversMap.set(idKey, driver);
            }
          }
        }
      });

      const uniqueDrivers = Array.from(uniqueDriversMap.values());

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
        pool.query(usersQuery),
      ]);

      // Combine results and remove duplicates based on email and ID
      const allAssignedDrivers = [...profilesResult.rows, ...usersResult.rows];

      // Create a Map to track unique assigned drivers by ID first, then by email
      const uniqueAssignedDriversMap = new Map();

      allAssignedDrivers.forEach((driver) => {
        const idKey = driver.driver_id;

        if (!uniqueAssignedDriversMap.has(idKey)) {
          // First time seeing this ID
          uniqueAssignedDriversMap.set(idKey, driver);
        } else {
          // We already have this ID, check if we should replace it
          const existing = uniqueAssignedDriversMap.get(idKey);

          // Prefer the entry with email over null email
          if (!existing.driver_email && driver.driver_email) {
            uniqueAssignedDriversMap.set(idKey, driver);
          }
          // If both have emails, prefer the one with more complete data
          else if (existing.driver_email && driver.driver_email) {
            // Keep the existing one unless the new one has more complete data
            if (!existing.driver_name && driver.driver_name) {
              uniqueAssignedDriversMap.set(idKey, driver);
            }
          }
        }
      });

      const uniqueAssignedDrivers = Array.from(
        uniqueAssignedDriversMap.values()
      );

      // Sort by driver name
      uniqueAssignedDrivers.sort((a, b) =>
        a.driver_name.localeCompare(b.driver_name)
      );

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

  static async createDriver(driverData: DriverData & { password: string }) {
    try {
      // Step 0: Validate required fields
      if (
        !driverData.email ||
        !driverData.first_name ||
        !driverData.last_name ||
        !driverData.password
      ) {
        throw new Error(
          'Email, first name, last name, and password are required'
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(driverData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password length
      if (driverData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Import Supabase admin client
      const { supabaseAdmin } = await import('../config/supabase');

      // Step 1: Comprehensive duplicate check across all tables
      console.log(
        `🔍 Checking for existing driver with email: ${driverData.email}`
      );

      // Check profiles table
      const { data: existingProfiles, error: profilesCheckError } =
        await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', driverData.email)
          .eq('role', 'driver');

      // Check users table
      const { data: existingUsers, error: usersCheckError } =
        await supabaseAdmin
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('email', driverData.email)
          .eq('role', 'driver');

      // Check Supabase Auth
      const { data: authUsers, error: authCheckError } =
        await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers.users.find(
        (user: any) => user.email?.toLowerCase() === driverData.email.toLowerCase()
      );

      if (profilesCheckError || usersCheckError || authCheckError) {
        console.error(
          '❌ Error checking existing driver:',
          profilesCheckError || usersCheckError || authCheckError
        );
        throw new Error(
          `Failed to check existing driver: ${(profilesCheckError || usersCheckError || authCheckError)?.message}`
        );
      }

      // Check for any existing entries
      if (existingProfiles && existingProfiles.length > 0) {
        console.log(
          `❌ Driver already exists in profiles table: ${existingProfiles[0].full_name} (${existingProfiles[0].email})`
        );
        throw new Error(
          `Driver with email ${driverData.email} already exists in profiles table`
        );
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log(
          `❌ Driver already exists in users table: ${existingUsers[0].first_name} ${existingUsers[0].last_name} (${existingUsers[0].email})`
        );
        throw new Error(
          `Driver with email ${driverData.email} already exists in users table`
        );
      }

      if (existingAuthUser) {
        console.log(
          `❌ Driver already exists in Supabase Auth: ${existingAuthUser.email}`
        );
        throw new Error(
          `Driver with email ${driverData.email} already exists in Supabase Auth`
        );
      }

      console.log(
        `✅ No existing driver found with email: ${driverData.email}`
      );

      // Step 2: Create Supabase Auth user
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: driverData.email,
          password: driverData.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: `${driverData.first_name} ${driverData.last_name}`,
            role: 'driver',
            phone: driverData.phone || null,
          },
        });

      if (authError) {
        console.error('❌ Supabase Auth error:', authError);
        throw new Error(
          `Failed to create Supabase Auth user: ${authError.message}`
        );
      }

      if (!authData.user) {
        throw new Error(
          'Failed to create Supabase Auth user: No user data returned'
        );
      }

      // Step 3: Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing profile:', checkError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(
          `Failed to check existing profile: ${checkError.message}`
        );
      }

      // Only create profile if it doesn't exist
      if (!existingProfile) {
        // Additional safeguard: ensure email is not null
        if (!driverData.email) {
          console.error('❌ Cannot create profile with null email');
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw new Error('Cannot create profile with null email');
        }

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: driverData.email,
            full_name: `${driverData.first_name} ${driverData.last_name}`,
            role: 'driver',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('❌ Error creating profile:', profileError);
          // Clean up auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        console.log(
          `✅ Profile created successfully for user ${authData.user.id}`
        );
      } else {
        console.log(
          `ℹ️ Profile already exists for user ${authData.user.id}, skipping profile creation`
        );
      }

      // Step 4: Create backup record in users table for compatibility
      console.log(
        `📝 Creating backup record in users table for ${authData.user.id}`
      );

      // First check if user already exists in users table
      const checkUserQuery = 'SELECT id FROM users WHERE id = $1';
      const existingUser = await pool.query(checkUserQuery, [authData.user.id]);

      if (existingUser.rows.length === 0) {
        // Additional safeguard: ensure email is not null
        if (!driverData.email) {
          console.error('❌ Cannot create user record with null email');
          // Clean up auth user and profile if user creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', authData.user.id);
          throw new Error('Cannot create user record with null email');
        }

      const query = `
          INSERT INTO users (id, email, first_name, last_name, phone, role, profile_photo_url, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
          authData.user.id, // Use Supabase Auth user ID
        driverData.email,
        driverData.first_name,
        driverData.last_name,
        driverData.phone || null,
        'driver',
        driverData.profile_photo_url || null,
          new Date().toISOString(),
          new Date().toISOString(),
      ];

      const result = await pool.query(query, values);

        console.log(
          `✅ Driver created successfully: ${driverData.email} (ID: ${authData.user.id})`
        );

        // Return the created driver with Supabase Auth user ID
        return {
          ...result.rows[0],
          supabase_user_id: authData.user.id,
        };
      } else {
        console.log(
          `ℹ️ User already exists in users table for ${authData.user.id}, skipping user creation`
        );

        // Return the existing user data
        return {
          ...existingUser.rows[0],
          supabase_user_id: authData.user.id,
        };
      }
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
      console.log(`🗑️ Starting deletion of driver: ${driverId}`);

      // Import Supabase admin client
      const { supabaseAdmin } = await import('../config/supabase');

      // Step 1: Unassign from any bus
      const busUpdateResult = await pool.query(
        'UPDATE buses SET assigned_driver_id = NULL WHERE assigned_driver_id = $1 RETURNING id',
        [driverId]
      );

      if (busUpdateResult.rows.length > 0) {
        console.log(
          `✅ Unassigned driver from ${busUpdateResult.rows.length} bus(es)`
        );
      }

      // Step 2: Delete from profiles table (Supabase managed)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', driverId)
        .eq('role', 'driver');

      if (profileError) {
        console.log(`⚠️ Error deleting from profiles: ${profileError.message}`);
      } else {
        console.log(`✅ Deleted driver from profiles table`);
      }

      // Step 3: Delete from users table (PostgreSQL managed)
      const userDeleteResult = await pool.query(
        "DELETE FROM users WHERE id = $1 AND role = 'driver' RETURNING *",
        [driverId]
      );

      if (userDeleteResult.rows.length === 0) {
        console.log(`⚠️ Driver not found in users table`);
      } else {
        console.log(`✅ Deleted driver from users table`);
      }

      // Step 4: Delete from Supabase Auth (if exists)
      try {
        const { error: authError } =
          await supabaseAdmin.auth.admin.deleteUser(driverId);

        if (authError) {
          console.log(
            `⚠️ Error deleting from Supabase Auth: ${authError.message}`
          );
        } else {
          console.log(`✅ Deleted driver from Supabase Auth`);
        }
      } catch (authError) {
        console.log(`⚠️ Auth deletion error (may not exist): ${authError}`);
      }

      // Return the deleted user data if available
      const deletedData = userDeleteResult.rows[0] || {
        id: driverId,
        deleted: true,
      };

      console.log(`✅ Driver deletion completed for: ${driverId}`);
      return deletedData;
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
        pool.query(
          "SELECT COUNT(*) as count FROM profiles WHERE role = 'driver'"
        ),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver'"),
        pool.query(
          "SELECT COUNT(*) as count FROM live_locations WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'"
        ),
      ]);

      // Count unique drivers from both tables (for reference)
      // const profilesDrivers = parseInt(healthChecks[2].rows[0].count);
      // const usersDrivers = parseInt(healthChecks[3].rows[0].count);
      
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
