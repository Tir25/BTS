import express from 'express';
import { getStudentSupabaseAdmin, getStudentSupabaseConfig, createSupabaseClient } from '../../config/supabase';
import { logger } from '../../utils/logger';

const router = express.Router();

// Student Authentication Endpoint
router.post('/student/login', async (req, res) => {
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

    logger.info('🎓 Student login attempt', 'auth', { email });

    // PRODUCTION FIX: Pre-initialize admin client to ensure it's ready
    // This prevents race conditions on first request
    let studentSupabaseAdmin: ReturnType<typeof getStudentSupabaseAdmin>;
    try {
      studentSupabaseAdmin = getStudentSupabaseAdmin();
      // Warm up the client with a simple query to ensure it's fully initialized
      await studentSupabaseAdmin.from('user_profiles').select('id').limit(1);
    } catch (initError) {
      logger.error('❌ Failed to initialize student Supabase admin client', 'auth', {
        email,
        error: initError instanceof Error ? initError.message : String(initError),
      });
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
        message: 'Failed to initialize authentication service. Please try again.',
        code: 'SERVICE_ERROR'
      });
    }

    // Use an anon-key Supabase client for password authentication so that the resulting
    // refresh token is compatible with frontend clients (which also use the anon key).
    // PRODUCTION FIX: Add retry logic for client creation
    let studentAuthClientResult = createSupabaseClient(
      getStudentSupabaseConfig(),
      'student-auth',
      false,
      {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      }
    );

    // Retry client creation if it fails (up to 2 retries)
    let retryCount = 0;
    const maxRetries = 2;
    while ((studentAuthClientResult.error || !studentAuthClientResult.client) && retryCount < maxRetries) {
      retryCount++;
      logger.warn(`⚠️ Student auth client creation failed, retrying (${retryCount}/${maxRetries})`, 'auth', {
        email,
        error: studentAuthClientResult.error?.message || 'Unknown error',
      });
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
      
      studentAuthClientResult = createSupabaseClient(
        getStudentSupabaseConfig(),
        'student-auth',
        false,
        {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        }
      );
    }

    if (studentAuthClientResult.error || !studentAuthClientResult.client) {
      logger.error('❌ Failed to initialize student auth Supabase client after retries', 'auth', {
        email,
        error: studentAuthClientResult.error?.message || 'Unknown error',
        retries: retryCount,
      });
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
        message: 'Failed to initialize authentication service. Please try again.',
        code: 'SERVICE_ERROR'
      });
    }

    const studentSupabaseAuth = studentAuthClientResult.client;

    // PRODUCTION FIX: Add retry logic for authentication with exponential backoff
    let authData: any = null;
    let authError: any = null;
    let authRetryCount = 0;
    const maxAuthRetries = 2;
    
    while (authRetryCount <= maxAuthRetries) {
      const authResult = await studentSupabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

      authData = authResult.data;
      authError = authResult.error;

      // If authentication succeeds, break out of retry loop
      if (!authError && authData?.user) {
        break;
      }

      // If it's a credential error, don't retry (user error, not system error)
      if (authError && (
        authError.message.includes('Invalid login credentials') ||
        authError.message.includes('Email not confirmed') ||
        authError.message.includes('User not found')
      )) {
        break;
      }

      // Retry for system errors (network, timeout, etc.)
      if (authRetryCount < maxAuthRetries) {
        authRetryCount++;
        const retryDelay = 200 * authRetryCount; // Exponential backoff: 200ms, 400ms
        logger.warn(`⚠️ Authentication attempt ${authRetryCount} failed, retrying in ${retryDelay}ms...`, 'auth', {
          email,
          error: authError?.message || 'Unknown error',
          attempt: authRetryCount,
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        break;
      }
    }

    if (authError) {
      logger.warn('❌ Student authentication failed', 'auth', { email, error: authError.message });
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
      return res.status(401).json({ success: false, error: errorMessage, message: errorMessage, code: errorCode });
    }

    if (!authData.user) {
      logger.warn('❌ No user data received from Supabase', 'auth', { email });
      return res.status(401).json({ success: false, error: 'Authentication failed', message: 'Invalid credentials', code: 'AUTH_FAILED' });
    }

    logger.info('✅ Supabase authentication successful', 'auth', { userId: authData.user.id, email: authData.user.email });

    const { data: profile, error: profileError } = await studentSupabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role, is_active, last_login, email_verified')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      logger.error('❌ Failed to fetch user profile', 'auth', { userId: authData.user.id, error: profileError?.message });
      return res.status(500).json({
        success: false,
        error: 'Profile not found',
        message: 'Unable to retrieve your profile. Please contact your administrator.',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    if (!profile.is_active) {
      logger.warn('❌ Inactive account attempted login', 'auth', { userId: authData.user.id, email });
      return res.status(403).json({
        success: false,
        error: 'Account inactive',
        message: 'Your account is inactive. Please contact your administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    if (profile.role !== 'student') {
      logger.warn('❌ Non-student attempted student login', 'auth', { userId: authData.user.id, email, role: profile.role });
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have student privileges. Please use the appropriate login portal.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    try {
      await studentSupabaseAdmin
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);
    } catch (updateError) {
      logger.warn('⚠️ Failed to update last login time', 'auth', { userId: authData.user.id, error: updateError instanceof Error ? updateError.message : 'Unknown error' });
    }

    logger.info('✅ Student login successful', 'auth', {
      userId: authData.user.id,
      email: authData.user.email,
      studentName: profile.full_name
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: profile.full_name,
          role: profile.role,
          is_active: profile.is_active,
          email_verified: (profile as any).email_verified
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
    logger.error('❌ Student login error', 'auth', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;


