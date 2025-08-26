"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const database_1 = __importDefault(require("../config/database"));
class AdminService {
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
            console.log(`✅ Fetched ${result.rows.length} buses from database`);
            return result.rows;
        }
        catch (error) {
            console.error('❌ Error fetching all buses:', error);
            return [];
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
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error fetching bus by ID:', error);
            throw error;
        }
    }
    static async createBus(busData) {
        try {
            const existingCodeCheck = await database_1.default.query('SELECT id FROM buses WHERE code = $1', [busData.code]);
            if (existingCodeCheck.rows.length > 0) {
                throw new Error(`Bus with code '${busData.code}' already exists`);
            }
            const existingPlateCheck = await database_1.default.query('SELECT id FROM buses WHERE number_plate = $1', [busData.number_plate]);
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
                busData.is_active !== false,
            ];
            const result = await database_1.default.query(query, values);
            console.log('✅ Bus created successfully:', result.rows[0].code);
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ Error creating bus:', error);
            throw error;
        }
    }
    static async updateBus(busId, busData) {
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 1;
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
            const result = await database_1.default.query(query, values);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error updating bus:', error);
            throw error;
        }
    }
    static async deleteBus(busId) {
        try {
            const query = 'DELETE FROM buses WHERE id = $1 RETURNING *';
            const result = await database_1.default.query(query, [busId]);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error deleting bus:', error);
            throw error;
        }
    }
    static async getAllDrivers() {
        try {
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
                database_1.default.query(profilesQuery),
                database_1.default.query(usersQuery),
            ]);
            const allDrivers = [...profilesResult.rows, ...usersResult.rows];
            const uniqueDriversMap = new Map();
            allDrivers.forEach((driver) => {
                const idKey = driver.id;
                if (!uniqueDriversMap.has(idKey)) {
                    uniqueDriversMap.set(idKey, driver);
                }
                else {
                    const existing = uniqueDriversMap.get(idKey);
                    if (!existing.email && driver.email) {
                        uniqueDriversMap.set(idKey, driver);
                    }
                    else if (existing.email && driver.email) {
                        if (!existing.full_name && driver.full_name) {
                            uniqueDriversMap.set(idKey, driver);
                        }
                    }
                }
            });
            const uniqueDrivers = Array.from(uniqueDriversMap.values());
            uniqueDrivers.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB.getTime() - dateA.getTime();
            });
            return uniqueDrivers;
        }
        catch (error) {
            console.error('❌ Error fetching all drivers:', error);
            throw error;
        }
    }
    static async getAssignedDrivers() {
        try {
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
                database_1.default.query(profilesQuery),
                database_1.default.query(usersQuery),
            ]);
            const allAssignedDrivers = [...profilesResult.rows, ...usersResult.rows];
            const uniqueAssignedDriversMap = new Map();
            allAssignedDrivers.forEach((driver) => {
                const idKey = driver.driver_id;
                if (!uniqueAssignedDriversMap.has(idKey)) {
                    uniqueAssignedDriversMap.set(idKey, driver);
                }
                else {
                    const existing = uniqueAssignedDriversMap.get(idKey);
                    if (!existing.driver_email && driver.driver_email) {
                        uniqueAssignedDriversMap.set(idKey, driver);
                    }
                    else if (existing.driver_email && driver.driver_email) {
                        if (!existing.driver_name && driver.driver_name) {
                            uniqueAssignedDriversMap.set(idKey, driver);
                        }
                    }
                }
            });
            const uniqueAssignedDrivers = Array.from(uniqueAssignedDriversMap.values());
            uniqueAssignedDrivers.sort((a, b) => a.driver_name.localeCompare(b.driver_name));
            return uniqueAssignedDrivers;
        }
        catch (error) {
            console.error('❌ Error fetching assigned drivers:', error);
            throw error;
        }
    }
    static async getDriverById(driverId) {
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
            const result = await database_1.default.query(query, [driverId]);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error fetching driver by ID:', error);
            throw error;
        }
    }
    static async assignDriverToBus(driverId, busId) {
        try {
            await database_1.default.query('UPDATE buses SET assigned_driver_id = NULL WHERE assigned_driver_id = $1', [driverId]);
            const query = `
        UPDATE buses 
        SET assigned_driver_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
            const result = await database_1.default.query(query, [driverId, busId]);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error assigning driver to bus:', error);
            throw error;
        }
    }
    static async unassignDriverFromBus(driverId) {
        try {
            const query = `
        UPDATE buses 
        SET assigned_driver_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE assigned_driver_id = $1
        RETURNING *
      `;
            const result = await database_1.default.query(query, [driverId]);
            return result.rows;
        }
        catch (error) {
            console.error('❌ Error unassigning driver from bus:', error);
            throw error;
        }
    }
    static async createDriver(driverData) {
        try {
            if (!driverData.email ||
                !driverData.first_name ||
                !driverData.last_name ||
                !driverData.password) {
                throw new Error('Email, first name, last name, and password are required');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(driverData.email)) {
                throw new Error('Invalid email format');
            }
            if (driverData.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require('../config/supabase')));
            console.log(`🔍 Checking for existing driver with email: ${driverData.email}`);
            const { data: existingProfiles, error: profilesCheckError } = await supabaseAdmin
                .from('profiles')
                .select('id, email, full_name')
                .eq('email', driverData.email)
                .eq('role', 'driver');
            const { data: existingUsers, error: usersCheckError } = await supabaseAdmin
                .from('users')
                .select('id, email, first_name, last_name')
                .eq('email', driverData.email)
                .eq('role', 'driver');
            const { data: authUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
            const existingAuthUser = authUsers.users.find((user) => user.email?.toLowerCase() === driverData.email.toLowerCase());
            if (profilesCheckError || usersCheckError || authCheckError) {
                console.error('❌ Error checking existing driver:', profilesCheckError || usersCheckError || authCheckError);
                throw new Error(`Failed to check existing driver: ${(profilesCheckError || usersCheckError || authCheckError)?.message}`);
            }
            if (existingProfiles && existingProfiles.length > 0) {
                console.log(`❌ Driver already exists in profiles table: ${existingProfiles[0].full_name} (${existingProfiles[0].email})`);
                throw new Error(`Driver with email ${driverData.email} already exists in profiles table`);
            }
            if (existingUsers && existingUsers.length > 0) {
                console.log(`❌ Driver already exists in users table: ${existingUsers[0].first_name} ${existingUsers[0].last_name} (${existingUsers[0].email})`);
                throw new Error(`Driver with email ${driverData.email} already exists in users table`);
            }
            if (existingAuthUser) {
                console.log(`❌ Driver already exists in Supabase Auth: ${existingAuthUser.email}`);
                throw new Error(`Driver with email ${driverData.email} already exists in Supabase Auth`);
            }
            console.log(`✅ No existing driver found with email: ${driverData.email}`);
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: driverData.email,
                password: driverData.password,
                email_confirm: true,
                user_metadata: {
                    full_name: `${driverData.first_name} ${driverData.last_name}`,
                    role: 'driver',
                    phone: driverData.phone || null,
                },
            });
            if (authError) {
                console.error('❌ Supabase Auth error:', authError);
                throw new Error(`Failed to create Supabase Auth user: ${authError.message}`);
            }
            if (!authData.user) {
                throw new Error('Failed to create Supabase Auth user: No user data returned');
            }
            const { data: existingProfile, error: checkError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', authData.user.id)
                .single();
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ Error checking existing profile:', checkError);
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw new Error(`Failed to check existing profile: ${checkError.message}`);
            }
            if (!existingProfile) {
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
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    throw new Error(`Failed to create profile: ${profileError.message}`);
                }
                console.log(`✅ Profile created successfully for user ${authData.user.id}`);
            }
            else {
                console.log(`ℹ️ Profile already exists for user ${authData.user.id}, skipping profile creation`);
            }
            console.log(`📝 Creating backup record in users table for ${authData.user.id}`);
            const checkUserQuery = 'SELECT id FROM users WHERE id = $1';
            const existingUser = await database_1.default.query(checkUserQuery, [authData.user.id]);
            if (existingUser.rows.length === 0) {
                if (!driverData.email) {
                    console.error('❌ Cannot create user record with null email');
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
                    authData.user.id,
                    driverData.email,
                    driverData.first_name,
                    driverData.last_name,
                    driverData.phone || null,
                    'driver',
                    driverData.profile_photo_url || null,
                    new Date().toISOString(),
                    new Date().toISOString(),
                ];
                const result = await database_1.default.query(query, values);
                console.log(`✅ Driver created successfully: ${driverData.email} (ID: ${authData.user.id})`);
                return {
                    ...result.rows[0],
                    supabase_user_id: authData.user.id,
                };
            }
            else {
                console.log(`ℹ️ User already exists in users table for ${authData.user.id}, skipping user creation`);
                return {
                    ...existingUser.rows[0],
                    supabase_user_id: authData.user.id,
                };
            }
        }
        catch (error) {
            console.error('❌ Error creating driver:', error);
            throw error;
        }
    }
    static async updateDriver(driverId, driverData) {
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 1;
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
            const result = await database_1.default.query(query, values);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error updating driver:', error);
            throw error;
        }
    }
    static async deleteDriver(driverId) {
        try {
            console.log(`🗑️ Starting deletion of driver: ${driverId}`);
            const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require('../config/supabase')));
            const busUpdateResult = await database_1.default.query('UPDATE buses SET assigned_driver_id = NULL WHERE assigned_driver_id = $1 RETURNING id', [driverId]);
            if (busUpdateResult.rows.length > 0) {
                console.log(`✅ Unassigned driver from ${busUpdateResult.rows.length} bus(es)`);
            }
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', driverId)
                .eq('role', 'driver');
            if (profileError) {
                console.log(`⚠️ Error deleting from profiles: ${profileError.message}`);
            }
            else {
                console.log(`✅ Deleted driver from profiles table`);
            }
            const userDeleteResult = await database_1.default.query("DELETE FROM users WHERE id = $1 AND role = 'driver' RETURNING *", [driverId]);
            if (userDeleteResult.rows.length === 0) {
                console.log(`⚠️ Driver not found in users table`);
            }
            else {
                console.log(`✅ Deleted driver from users table`);
            }
            try {
                const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(driverId);
                if (authError) {
                    console.log(`⚠️ Error deleting from Supabase Auth: ${authError.message}`);
                }
                else {
                    console.log(`✅ Deleted driver from Supabase Auth`);
                }
            }
            catch (authError) {
                console.log(`⚠️ Auth deletion error (may not exist): ${authError}`);
            }
            const deletedData = userDeleteResult.rows[0] || {
                id: driverId,
                deleted: true,
            };
            console.log(`✅ Driver deletion completed for: ${driverId}`);
            return deletedData;
        }
        catch (error) {
            console.error('❌ Error deleting driver:', error);
            throw error;
        }
    }
    static async getAnalytics() {
        try {
            const busCountQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM buses';
            const routeCountQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM routes';
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
                database_1.default.query(busCountQuery),
                database_1.default.query(routeCountQuery),
                database_1.default.query(driverCountQuery),
            ]);
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
            const delayResult = await database_1.default.query(delayQuery);
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
            const usageResult = await database_1.default.query(usageQuery);
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
        }
        catch (error) {
            console.error('❌ Error fetching analytics:', error);
            throw error;
        }
    }
    static async getSystemHealth() {
        try {
            const healthChecks = await Promise.all([
                database_1.default.query('SELECT COUNT(*) as count FROM buses'),
                database_1.default.query('SELECT COUNT(*) as count FROM routes'),
                database_1.default.query("SELECT COUNT(*) as count FROM profiles WHERE role = 'driver'"),
                database_1.default.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver'"),
                database_1.default.query("SELECT COUNT(*) as count FROM live_locations WHERE recorded_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'"),
            ]);
            const uniqueDriversQuery = `
        SELECT COUNT(DISTINCT email) as unique_count
        FROM (
          SELECT email FROM profiles WHERE role = 'driver'
          UNION
          SELECT email FROM users WHERE role = 'driver'
        ) as all_drivers
      `;
            const uniqueDriversResult = await database_1.default.query(uniqueDriversQuery);
            const totalDrivers = parseInt(uniqueDriversResult.rows[0].unique_count);
            return {
                buses: parseInt(healthChecks[0].rows[0].count),
                routes: parseInt(healthChecks[1].rows[0].count),
                drivers: totalDrivers,
                recentLocations: parseInt(healthChecks[4].rows[0].count),
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('❌ Error fetching system health:', error);
            throw error;
        }
    }
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
            const result = await database_1.default.query(query);
            return result.rows;
        }
        catch (error) {
            console.error('❌ Error fetching all routes:', error);
            throw error;
        }
    }
    static async getRouteById(routeId) {
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
            const result = await database_1.default.query(query, [routeId]);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error fetching route by ID:', error);
            throw error;
        }
    }
    static async createRoute(routeData) {
        try {
            if (!routeData.name || !routeData.name.trim()) {
                throw new Error('Route name is required');
            }
            if (!routeData.city || !routeData.city.trim()) {
                throw new Error('City is required');
            }
            if (!routeData.description || !routeData.description.trim()) {
                throw new Error('Route description is required');
            }
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
                routeData.city.trim(),
            ];
            const result = await database_1.default.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            console.error('❌ Error creating route:', error);
            throw error;
        }
    }
    static async updateRoute(routeId, routeData) {
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 1;
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
            if (routeData.custom_destination !== undefined) {
                updateFields.push(`custom_destination = $${paramCount++}`);
                values.push(routeData.custom_destination);
            }
            if (routeData.custom_destination_coordinates !== undefined) {
                updateFields.push(`custom_destination_coordinates = ST_GeomFromText('POINT($${paramCount} $${paramCount + 1})', 4326)`);
                values.push(routeData.custom_destination_coordinates[0]);
                values.push(routeData.custom_destination_coordinates[1]);
                paramCount += 2;
            }
            if (routeData.custom_origin !== undefined) {
                updateFields.push(`custom_origin = $${paramCount++}`);
                values.push(routeData.custom_origin);
            }
            if (routeData.custom_origin_coordinates !== undefined) {
                updateFields.push(`custom_origin_coordinates = ST_GeomFromText('POINT($${paramCount} $${paramCount + 1})', 4326)`);
                values.push(routeData.custom_origin_coordinates[0]);
                values.push(routeData.custom_origin_coordinates[1]);
                paramCount += 2;
            }
            if (routeData.bus_stops !== undefined) {
                updateFields.push(`bus_stops = $${paramCount++}`);
                values.push(JSON.stringify(routeData.bus_stops));
            }
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
            const result = await database_1.default.query(query, values);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error updating route:', error);
            throw error;
        }
    }
    static async deleteRoute(routeId) {
        try {
            await database_1.default.query('UPDATE buses SET route_id = NULL WHERE route_id = $1', [
                routeId,
            ]);
            const query = `
        DELETE FROM routes 
        WHERE id = $1
        RETURNING *
      `;
            const result = await database_1.default.query(query, [routeId]);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('❌ Error deleting route:', error);
            throw error;
        }
    }
    static async calculateRouteETA(routeId, currentLocation) {
        try {
            const route = await this.getRouteById(routeId);
            if (!route) {
                throw new Error('Route not found');
            }
            let destinationCoords = [72.4563, 23.5295];
            if (route.destination_coordinates) {
                destinationCoords = route.destination_coordinates.coordinates;
            }
            const distance = this.calculateDistance(currentLocation, destinationCoords);
            const estimatedMinutes = Math.round((distance / 40) * 60);
            await database_1.default.query(`UPDATE routes 
         SET current_eta_minutes = $1, last_eta_calculation = CURRENT_TIMESTAMP 
         WHERE id = $2`, [estimatedMinutes, routeId]);
            return estimatedMinutes;
        }
        catch (error) {
            console.error('❌ Error calculating route ETA:', error);
            throw error;
        }
    }
    static calculateDistance(point1, point2) {
        const R = 6371;
        const dLat = ((point2[1] - point1[1]) * Math.PI) / 180;
        const dLon = ((point2[0] - point1[0]) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((point1[1] * Math.PI) / 180) *
                Math.cos((point2[1] * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    static async getDefaultDestination() {
        try {
            const query = `
        SELECT constant_value 
        FROM system_constants 
        WHERE constant_name = 'default_destination'
      `;
            const result = await database_1.default.query(query);
            return (result.rows[0]?.constant_value || {
                name: 'Ganpat University',
                address: 'Ganpat Vidyanagar, Mehsana-Gozaria Highway, Kherva, Gujarat 384012',
                coordinates: [72.4563, 23.5295],
                city: 'Mehsana',
            });
        }
        catch (error) {
            console.error('❌ Error fetching default destination:', error);
            return {
                name: 'Ganpat University',
                address: 'Ganpat Vidyanagar, Mehsana-Gozaria Highway, Kherva, Gujarat 384012',
                coordinates: [72.4563, 23.5295],
                city: 'Mehsana',
            };
        }
    }
    static async clearAllData() {
        try {
            const client = await database_1.default.connect();
            try {
                await client.query('BEGIN');
                await client.query('UPDATE buses SET assigned_driver_id = NULL');
                const busesResult = await client.query('DELETE FROM buses RETURNING *');
                const routesResult = await client.query('DELETE FROM routes RETURNING *');
                const driversResult = await client.query("DELETE FROM users WHERE role = 'driver' RETURNING *");
                const locationsResult = await client.query('DELETE FROM live_locations RETURNING *');
                await client.query('COMMIT');
                return {
                    deletedBuses: busesResult.rows.length,
                    deletedRoutes: routesResult.rows.length,
                    deletedDrivers: driversResult.rows.length,
                    deletedLocations: locationsResult.rows.length,
                    totalDeleted: busesResult.rows.length +
                        routesResult.rows.length +
                        driversResult.rows.length +
                        locationsResult.rows.length,
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('❌ Error clearing all data:', error);
            throw error;
        }
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=adminService.js.map