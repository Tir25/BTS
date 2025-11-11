"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
const router = express_1.default.Router();
const fetchShiftDetails = async (supabaseClient, shiftId) => {
    if (!shiftId)
        return null;
    const { data, error } = await supabaseClient
        .from('shifts')
        .select('id,name,start_time,end_time')
        .eq('id', shiftId)
        .maybeSingle();
    if (error) {
        logger_1.logger.warn('Error fetching shift details', 'auth', { error: error.message, shiftId });
        return null;
    }
    if (!data) {
        logger_1.logger.warn('Shift not found', 'auth', { shiftId });
        return null;
    }
    return {
        id: data.id,
        name: data.name || null,
        start_time: data.start_time ?? null,
        end_time: data.end_time ?? null,
    };
};
router.post('/driver/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing credentials',
                message: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                message: 'Please enter a valid email address',
                code: 'INVALID_EMAIL'
            });
        }
        logger_1.logger.info('🔐 Driver login attempt', 'auth', { email });
        const driverSupabaseAdmin = (0, supabase_1.getDriverSupabaseAdmin)();
        const { data: authData, error: authError } = await driverSupabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });
        if (authError) {
            logger_1.logger.warn('❌ Driver authentication failed', 'auth', { email, error: authError.message });
            let errorMessage = 'Invalid credentials';
            let errorCode = 'INVALID_CREDENTIALS';
            if (authError.message.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password';
            }
            else if (authError.message.includes('Email not confirmed')) {
                errorMessage = 'Please verify your email address before logging in';
                errorCode = 'EMAIL_NOT_CONFIRMED';
            }
            else if (authError.message.includes('Too many requests')) {
                errorMessage = 'Too many login attempts. Please wait a moment and try again';
                errorCode = 'TOO_MANY_REQUESTS';
            }
            return res.status(401).json({ success: false, error: errorMessage, message: errorMessage, code: errorCode });
        }
        if (!authData.user) {
            logger_1.logger.warn('❌ No user data received from Supabase', 'auth', { email });
            return res.status(401).json({ success: false, error: 'Authentication failed', message: 'Invalid credentials', code: 'AUTH_FAILED' });
        }
        logger_1.logger.info('✅ Supabase authentication successful', 'auth', { userId: authData.user.id, email: authData.user.email });
        const { data: profileRaw, error: profileError } = await driverSupabaseAdmin
            .from('user_profiles')
            .select('id, full_name, role, is_active, last_login')
            .eq('id', authData.user.id)
            .single();
        if (profileError || !profileRaw) {
            logger_1.logger.error('❌ Failed to fetch user profile', 'auth', { userId: authData.user.id, error: profileError?.message });
            return res.status(500).json({
                success: false,
                error: 'Profile not found',
                message: 'Unable to retrieve your profile. Please contact your administrator.',
                code: 'PROFILE_NOT_FOUND'
            });
        }
        const profile = profileRaw;
        if (!profile.is_active) {
            logger_1.logger.warn('❌ Inactive account attempted login', 'auth', { userId: authData.user.id, email });
            return res.status(403).json({
                success: false,
                error: 'Account inactive',
                message: 'Your account is inactive. Please contact your administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        if (profile.role !== 'driver') {
            logger_1.logger.warn('❌ Non-driver attempted driver login', 'auth', { userId: authData.user.id, email, role: profile.role });
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have driver privileges. Please contact your administrator.',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        const { data: busDataRaw, error: busError } = await driverSupabaseAdmin
            .from('buses')
            .select(`
        id,
        bus_number,
        vehicle_no,
        assigned_driver_profile_id,
        route_id,
        assigned_shift_id,
        assignment_status,
        assignment_notes,
        updated_at
      `)
            .eq('assigned_driver_profile_id', authData.user.id)
            .eq('is_active', true)
            .single();
        const busData = busDataRaw;
        if (busError || !busData) {
            if (busError?.code === 'PGRST116') {
                logger_1.logger.warn('❌ No bus assignment found for driver', 'auth', { userId: authData.user.id, email });
                return res.status(404).json({
                    success: false,
                    error: 'No bus assignment',
                    message: 'No active bus assignment found. Please contact your administrator to get assigned to a bus.',
                    code: 'NO_BUS_ASSIGNMENT'
                });
            }
            logger_1.logger.error('❌ Error fetching bus assignment', 'auth', { userId: authData.user.id, error: busError?.message });
            return res.status(500).json({
                success: false,
                error: 'Assignment fetch failed',
                message: 'Unable to retrieve your bus assignment. Please try again.',
                code: 'ASSIGNMENT_FETCH_FAILED'
            });
        }
        let routeName = '';
        if (busData.route_id) {
            const { data: routeData, error: routeError } = await driverSupabaseAdmin
                .from('routes')
                .select('name')
                .eq('id', busData.route_id)
                .single();
            if (!routeError && routeData) {
                routeName = routeData.name;
            }
        }
        const shiftDetails = await fetchShiftDetails(driverSupabaseAdmin, busData.assigned_shift_id || null);
        const assignment = {
            id: busData.id,
            driver_id: authData.user.id,
            bus_id: busData.id,
            bus_number: busData.bus_number,
            route_id: busData.route_id || '',
            route_name: routeName,
            driver_name: profile.full_name,
            is_active: busData.assignment_status === 'assigned',
            created_at: busData.updated_at,
            updated_at: busData.updated_at,
            shift_id: busData.assigned_shift_id || null,
            shift_name: shiftDetails?.name || null,
            shift_start_time: shiftDetails?.start_time || null,
            shift_end_time: shiftDetails?.end_time || null,
        };
        try {
            await driverSupabaseAdmin
                .from('user_profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', authData.user.id);
        }
        catch (updateError) {
            logger_1.logger.warn('⚠️ Failed to update last login time', 'auth', { userId: authData.user.id, error: updateError instanceof Error ? updateError.message : 'Unknown error' });
        }
        logger_1.logger.info('✅ Driver login successful', 'auth', {
            userId: authData.user.id,
            email: authData.user.email,
            driverName: profile.full_name,
            busNumber: assignment.bus_number,
            routeName: assignment.route_name
        });
        return res.json({
            success: true,
            data: {
                user: {
                    id: authData.user.id,
                    email: authData.user.email,
                    full_name: profile.full_name,
                    role: profile.role,
                    is_active: profile.is_active
                },
                assignment: {
                    id: assignment.id,
                    driver_id: assignment.driver_id,
                    bus_id: assignment.bus_id,
                    bus_number: assignment.bus_number,
                    route_id: assignment.route_id,
                    route_name: assignment.route_name,
                    driver_name: assignment.driver_name,
                    is_active: assignment.is_active,
                    created_at: assignment.created_at,
                    updated_at: assignment.updated_at,
                    shift_id: assignment.shift_id,
                    shift_name: assignment.shift_name,
                    shift_start_time: assignment.shift_start_time,
                    shift_end_time: assignment.shift_end_time,
                },
                session: {
                    access_token: authData.session.access_token,
                    refresh_token: authData.session.refresh_token,
                    expires_at: authData.session.expires_at
                }
            },
            message: 'Driver login successful',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Driver login error', 'auth', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred. Please try again.',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.get('/driver/assignment', async (req, res) => {
    try {
        const { driver_id } = req.query;
        if (!driver_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing driver ID',
                message: 'Driver ID is required',
                code: 'MISSING_DRIVER_ID'
            });
        }
        logger_1.logger.info('🔍 Fetching driver bus assignment', 'auth', { driver_id });
        const driverSupabaseAdmin = (0, supabase_1.getDriverSupabaseAdmin)();
        const { data: busData2, error: busError } = await driverSupabaseAdmin
            .from('buses')
            .select('id, bus_number, vehicle_no, route_id, assigned_shift_id')
            .eq('assigned_driver_profile_id', driver_id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        if (busError) {
            logger_1.logger.error('❌ Error fetching bus assignment', 'auth', { driver_id, error: busError.message });
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch bus assignment',
                message: 'Database error occurred',
                code: 'DB_ERROR'
            });
        }
        if (!busData2) {
            logger_1.logger.warn('⚠️ No bus assignment found for driver', 'auth', { driver_id });
            return res.json({
                success: true,
                data: null,
                message: 'No active bus assignment found',
                code: 'NO_ASSIGNMENT'
            });
        }
        const bus = busData2;
        let routeName = '';
        if (bus.route_id) {
            const { data: routeData, error: routeError } = await driverSupabaseAdmin
                .from('routes')
                .select('name')
                .eq('id', bus.route_id)
                .single();
            if (!routeError && routeData) {
                routeName = routeData.name;
            }
        }
        let driverName = 'Unknown Driver';
        const { data: profileData } = await driverSupabaseAdmin
            .from('user_profiles')
            .select('full_name')
            .eq('id', driver_id)
            .maybeSingle();
        if (profileData?.full_name) {
            driverName = profileData.full_name;
        }
        const shiftDetails = await fetchShiftDetails(driverSupabaseAdmin, bus.assigned_shift_id || null);
        const assignment = {
            driver_id: driver_id,
            bus_id: bus.id,
            bus_number: bus.bus_number,
            route_id: bus.route_id || '',
            route_name: routeName,
            driver_name: driverName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            shift_id: bus.assigned_shift_id || null,
            shift_name: shiftDetails?.name || null,
            shift_start_time: shiftDetails?.start_time || null,
            shift_end_time: shiftDetails?.end_time || null,
        };
        logger_1.logger.info('✅ Bus assignment retrieved successfully', 'auth', { bus_number: bus.bus_number, route_name: routeName });
        return res.json({
            success: true,
            data: assignment,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error getting driver assignment', 'auth', { error });
        return res.status(500).json({
            success: false,
            error: 'Failed to get driver assignment',
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.post('/driver/validate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Missing token',
                message: 'Authorization token is required',
                code: 'MISSING_TOKEN'
            });
        }
        const token = authHeader.substring(7);
        const driverSupabaseAdmin = (0, supabase_1.getDriverSupabaseAdmin)();
        const { data: { user }, error } = await driverSupabaseAdmin.auth.getUser(token);
        if (error || !user) {
            logger_1.logger.warn('❌ Token validation failed', 'auth', { error: error?.message });
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Your session has expired. Please log in again.',
                code: 'INVALID_TOKEN'
            });
        }
        const { data: profile2, error: profileError } = await driverSupabaseAdmin
            .from('user_profiles')
            .select('id, full_name, role, is_active')
            .eq('id', user.id)
            .single();
        const profile = profile2;
        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found',
                message: 'User profile not found',
                code: 'PROFILE_NOT_FOUND'
            });
        }
        if (profile.role !== 'driver') {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'Driver privileges required',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        const { data: busData3, error: busError } = await driverSupabaseAdmin
            .from('buses')
            .select(`
        id,
        bus_number,
        vehicle_no,
        assigned_driver_profile_id,
        route_id,
        assigned_shift_id,
        assignment_status,
        assignment_notes,
        updated_at
      `)
            .eq('assigned_driver_profile_id', user.id)
            .eq('is_active', true)
            .single();
        const busData = busData3;
        if (busError || !busData) {
            return res.status(404).json({
                success: false,
                error: 'No assignment',
                message: 'No active bus assignment found',
                code: 'NO_BUS_ASSIGNMENT'
            });
        }
        let routeName = '';
        if (busData.route_id) {
            const { data: routeData } = await driverSupabaseAdmin
                .from('routes')
                .select('name')
                .eq('id', busData.route_id)
                .single();
            routeName = routeData?.name || '';
        }
        const shiftDetails = await fetchShiftDetails(driverSupabaseAdmin, busData.assigned_shift_id || null);
        const assignment = {
            id: busData.id,
            driver_id: user.id,
            bus_id: busData.id,
            bus_number: busData.bus_number,
            route_id: busData.route_id || '',
            route_name: routeName,
            driver_name: profile.full_name,
            is_active: busData.assignment_status === 'assigned',
            created_at: busData.updated_at,
            updated_at: busData.updated_at,
            shift_id: busData.assigned_shift_id || null,
            shift_name: shiftDetails?.name || null,
            shift_start_time: shiftDetails?.start_time || null,
            shift_end_time: shiftDetails?.end_time || null,
        };
        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: profile.full_name,
                    role: profile.role,
                    is_active: profile.is_active
                },
                assignment: {
                    id: assignment.id,
                    driver_id: assignment.driver_id,
                    bus_id: assignment.bus_id,
                    bus_number: assignment.bus_number,
                    route_id: assignment.route_id,
                    route_name: assignment.route_name,
                    driver_name: assignment.driver_name,
                    is_active: assignment.is_active,
                    created_at: assignment.created_at,
                    updated_at: assignment.updated_at,
                    shift_id: assignment.shift_id,
                    shift_name: assignment.shift_name,
                    shift_start_time: assignment.shift_start_time,
                    shift_end_time: assignment.shift_end_time,
                }
            },
            message: 'Session validation successful',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Session validation error', 'auth', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
});
exports.default = router;
//# sourceMappingURL=driver.js.map