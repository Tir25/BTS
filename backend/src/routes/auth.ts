import express from 'express';
import { getDriverSupabaseAdmin, getStudentSupabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { UnifiedDatabaseService } from '../services/UnifiedDatabaseService';

const router = express.Router();

/**
 * Driver Authentication Endpoint
 * Validates driver credentials and returns driver information with bus assignment
 */
router.post('/driver/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please enter a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    logger.info('🔐 Driver login attempt', 'auth', { email });

    // Authenticate with Driver Supabase project
    const driverSupabaseAdmin = getDriverSupabaseAdmin();
    const { data: authData, error: authError } = await driverSupabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      logger.warn('❌ Driver authentication failed', 'auth', { 
        email, 
        error: authError.message 
      });
      
      // Map Supabase errors to user-friendly messages
      let errorMessage = 'Invalid credentials';
      let errorCode = 'INVALID_CREDENTIALS';
      
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in';
        errorCode = 'EMAIL_NOT_CONFIRMED';
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again';
        errorCode = 'TOO_MANY_REQUESTS';
      }

      return res.status(401).json({
        success: false,
        error: errorMessage,
        message: errorMessage,
        code: errorCode
      });
    }

    if (!authData.user) {
      logger.warn('❌ No user data received from Supabase', 'auth', { email });
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials',
        code: 'AUTH_FAILED'
      });
    }

    logger.info('✅ Supabase authentication successful', 'auth', { 
      userId: authData.user.id, 
      email: authData.user.email 
    });

    // Get user profile to verify driver role
    const { data: profileRaw, error: profileError } = await driverSupabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role, is_active, last_login')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileRaw) {
      logger.error('❌ Failed to fetch user profile', 'auth', { 
        userId: authData.user.id,
        error: profileError?.message 
      });
      return res.status(500).json({
        success: false,
        error: 'Profile not found',
        message: 'Unable to retrieve your profile. Please contact your administrator.',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    const profile = profileRaw as {
      id: string;
      full_name: string | null;
      role: 'driver' | 'student' | 'admin';
      is_active: boolean;
      last_login?: string | null;
      email_verified?: boolean;
    };

    // Check if account is active
    if (!profile.is_active) {
      logger.warn('❌ Inactive account attempted login', 'auth', { 
        userId: authData.user.id,
        email 
      });
      return res.status(403).json({
        success: false,
        error: 'Account inactive',
        message: 'Your account is inactive. Please contact your administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if user is a driver
    if (profile.role !== 'driver') {
      logger.warn('❌ Non-driver attempted driver login', 'auth', { 
        userId: authData.user.id,
        email,
        role: profile.role 
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have driver privileges. Please contact your administrator.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Get driver's bus assignment from buses table
    const { data: busDataRaw, error: busError } = await driverSupabaseAdmin
      .from('buses')
      .select(`
        id,
        bus_number,
        vehicle_no,
        assigned_driver_profile_id,
        route_id,
        assignment_status,
        assignment_notes,
        updated_at
      `)
      .eq('assigned_driver_profile_id', authData.user.id)
      .eq('is_active', true)
      .single();

    const busData = busDataRaw as {
      id: string;
      bus_number: string;
      vehicle_no: string;
      assigned_driver_profile_id: string | null;
      route_id: string | null;
      assignment_status: string;
      assignment_notes?: string | null;
      updated_at: string;
    } | null;

    if (busError || !busData) {
      if (busError?.code === 'PGRST116') {
        // No rows returned - no active assignment
        logger.warn('❌ No bus assignment found for driver', 'auth', { 
          userId: authData.user.id,
          email 
        });
        return res.status(404).json({
          success: false,
          error: 'No bus assignment',
          message: 'No active bus assignment found. Please contact your administrator to get assigned to a bus.',
          code: 'NO_BUS_ASSIGNMENT'
        });
      }

      logger.error('❌ Error fetching bus assignment', 'auth', { 
        userId: authData.user.id,
        error: busError?.message 
      });
      return res.status(500).json({
        success: false,
        error: 'Assignment fetch failed',
        message: 'Unable to retrieve your bus assignment. Please try again.',
        code: 'ASSIGNMENT_FETCH_FAILED'
      });
    }

    // Get route information
    let routeName = '';
    if (busData.route_id) {
      const { data: routeData, error: routeError } = await driverSupabaseAdmin
        .from('routes')
        .select('name')
        .eq('id', busData.route_id)
        .single();

      if (!routeError && routeData) {
        routeName = (routeData as any).name;
      }
    }

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
      updated_at: busData.updated_at
    };

    // Update last login time
    try {
      await (driverSupabaseAdmin as any)
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);
    } catch (updateError) {
      // Log but don't fail the request
      logger.warn('⚠️ Failed to update last login time', 'auth', { 
        userId: authData.user.id,
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }

    logger.info('✅ Driver login successful', 'auth', {
      userId: authData.user.id,
      email: authData.user.email,
      driverName: profile.full_name,
      busNumber: assignment.bus_number,
      routeName: assignment.route_name
    });

    // Return success response with driver data
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
          updated_at: assignment.updated_at
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

  } catch (error) {
    logger.error('❌ Driver login error', 'auth', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Get Driver Bus Assignment
 * Returns the current bus assignment for the authenticated driver
 */
router.get('/driver/assignment', async (req, res) => {
  try {
    // Get the driver ID from query parameter or auth token
    const { driver_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing driver ID',
        message: 'Driver ID is required',
        code: 'MISSING_DRIVER_ID'
      });
    }

    logger.info('🔍 Fetching driver bus assignment', 'auth', { driver_id });

    // Get bus assignment from buses table using driver Supabase client
    const driverSupabaseAdmin = getDriverSupabaseAdmin();
    const { data: busData2, error: busError } = await driverSupabaseAdmin
      .from('buses')
      .select('id, bus_number, vehicle_no, route_id')
      .eq('assigned_driver_profile_id', driver_id as string)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (busError) {
      logger.error('❌ Error fetching bus assignment', 'auth', { 
        driver_id,
        error: busError.message 
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bus assignment',
        message: 'Database error occurred',
        code: 'DB_ERROR'
      });
    }

    if (!busData2) {
      logger.warn('⚠️ No bus assignment found for driver', 'auth', { driver_id });
      return res.json({
        success: true,
        data: null,
        message: 'No active bus assignment found',
        code: 'NO_ASSIGNMENT'
      });
    }

    const bus = busData2 as {
      id: string;
      bus_number: string;
      route_id: string | null;
    };

    // Get route information
    let routeName = '';
    if (bus.route_id) {
      const { data: routeData, error: routeError } = await driverSupabaseAdmin
        .from('routes')
        .select('name')
        .eq('id', bus.route_id)
        .single();

      if (!routeError && routeData) {
        routeName = (routeData as any).name;
      }
    }

    // Get driver name from user_profiles
    let driverName = 'Unknown Driver';
    const { data: profileData } = await driverSupabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('id', driver_id)
      .maybeSingle();

    if ((profileData as any)?.full_name) {
      driverName = (profileData as any).full_name;
    }

    const assignment = {
      driver_id: driver_id as string,
      bus_id: bus.id,
      bus_number: bus.bus_number,
      route_id: bus.route_id || '',
      route_name: routeName,
      driver_name: driverName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    logger.info('✅ Bus assignment retrieved successfully', 'auth', {
      bus_number: bus.bus_number,
      route_name: routeName
    });

    return res.json({
      success: true,
      data: assignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Error getting driver assignment', 'auth', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to get driver assignment',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Driver Session Validation Endpoint
 * Validates an existing driver session and returns current assignment
 */
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

    // Verify token with Driver Supabase project
    const driverSupabaseAdmin = getDriverSupabaseAdmin();
    const { data: { user }, error } = await driverSupabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('❌ Token validation failed', 'auth', { 
        error: error?.message 
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Your session has expired. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user profile
    const { data: profile2, error: profileError } = await driverSupabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role, is_active')
      .eq('id', user.id)
      .single();

    const profile = profile2 as {
      id: string;
      full_name: string | null;
      role: 'driver' | 'student' | 'admin';
      is_active: boolean;
    } | null;

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Check if user is a driver
    if (profile.role !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Driver privileges required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Get current bus assignment from buses table
    const { data: busData3, error: busError } = await driverSupabaseAdmin
      .from('buses')
      .select(`
        id,
        bus_number,
        vehicle_no,
        assigned_driver_profile_id,
        route_id,
        assignment_status,
        assignment_notes,
        updated_at
      `)
      .eq('assigned_driver_profile_id', user.id)
      .eq('is_active', true)
      .single();

    const busData = busData3 as {
      id: string;
      bus_number: string;
      vehicle_no: string;
      assigned_driver_profile_id: string | null;
      route_id: string | null;
      assignment_status: string;
      updated_at: string;
    } | null;

    if (busError || !busData) {
      return res.status(404).json({
        success: false,
        error: 'No assignment',
        message: 'No active bus assignment found',
        code: 'NO_BUS_ASSIGNMENT'
      });
    }

    // Get route information
    let routeName = '';
    if (busData.route_id) {
      const { data: routeData } = await driverSupabaseAdmin
        .from('routes')
        .select('name')
        .eq('id', busData.route_id)
        .single();
      routeName = (routeData as any)?.name || '';
    }

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
      updated_at: busData.updated_at
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
          updated_at: assignment.updated_at
        }
      },
      message: 'Session validation successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Session validation error', 'auth', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Student Authentication Endpoint
 * Validates student credentials and returns student information
 */
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please enter a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    logger.info('🎓 Student login attempt', 'auth', { email });

    // Authenticate with Student Supabase project
    let studentSupabaseAdmin;
    try {
      studentSupabaseAdmin = getStudentSupabaseAdmin();
    } catch (clientError) {
      logger.error('❌ Failed to get student Supabase admin client', 'auth', {
        error: clientError instanceof Error ? clientError.message : String(clientError),
        email
      });
      return res.status(500).json({
        success: false,
        error: 'Authentication service error',
        message: 'Failed to initialize authentication service. Please contact your administrator.',
        code: 'SERVICE_ERROR'
      });
    }

    const { data: authData, error: authError } = await studentSupabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      logger.warn('❌ Student authentication failed', 'auth', { 
        email, 
        error: authError.message 
      });
      
      // Map Supabase errors to user-friendly messages
      let errorMessage = 'Invalid credentials';
      let errorCode = 'INVALID_CREDENTIALS';
      
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in';
        errorCode = 'EMAIL_NOT_CONFIRMED';
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again';
        errorCode = 'TOO_MANY_REQUESTS';
      }

      return res.status(401).json({
        success: false,
        error: errorMessage,
        message: errorMessage,
        code: errorCode
      });
    }

    if (!authData.user) {
      logger.warn('❌ No user data received from Supabase', 'auth', { email });
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid credentials',
        code: 'AUTH_FAILED'
      });
    }

    logger.info('✅ Supabase authentication successful', 'auth', { 
      userId: authData.user.id, 
      email: authData.user.email 
    });

    // Get user profile to verify student role
    const { data: profile, error: profileError } = await studentSupabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role, is_active, last_login, email_verified')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      logger.error('❌ Failed to fetch user profile', 'auth', { 
        userId: authData.user.id,
        error: profileError?.message 
      });
      return res.status(500).json({
        success: false,
        error: 'Profile not found',
        message: 'Unable to retrieve your profile. Please contact your administrator.',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Check if account is active
    if (!profile.is_active) {
      logger.warn('❌ Inactive account attempted login', 'auth', { 
        userId: authData.user.id,
        email 
      });
      return res.status(403).json({
        success: false,
        error: 'Account inactive',
        message: 'Your account is inactive. Please contact your administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if user is a student
    if (profile.role !== 'student') {
      logger.warn('❌ Non-student attempted student login', 'auth', { 
        userId: authData.user.id,
        email,
        role: profile.role 
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have student privileges. Please use the appropriate login portal.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Update last login time
    try {
      await studentSupabaseAdmin
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);
    } catch (updateError) {
      // Log but don't fail the request
      logger.warn('⚠️ Failed to update last login time', 'auth', { 
        userId: authData.user.id,
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }

    logger.info('✅ Student login successful', 'auth', {
      userId: authData.user.id,
      email: authData.user.email,
      studentName: profile.full_name
    });

    // Return success response with student data
    return res.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: profile.full_name,
          role: profile.role,
          is_active: profile.is_active,
          email_verified: profile.email_verified
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at
        }
      },
      message: 'Student login successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Student login error', 'auth', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
