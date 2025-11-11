"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
const router = express_1.default.Router();
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
        logger_1.logger.info('🎓 Student login attempt', 'auth', { email });
        let studentSupabaseAdmin;
        try {
            studentSupabaseAdmin = (0, supabase_1.getStudentSupabaseAdmin)();
        }
        catch (clientError) {
            logger_1.logger.error('❌ Failed to get student Supabase admin client', 'auth', {
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
            logger_1.logger.warn('❌ Student authentication failed', 'auth', { email, error: authError.message });
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
        const { data: profile, error: profileError } = await studentSupabaseAdmin
            .from('user_profiles')
            .select('id, full_name, role, is_active, last_login, email_verified')
            .eq('id', authData.user.id)
            .single();
        if (profileError || !profile) {
            logger_1.logger.error('❌ Failed to fetch user profile', 'auth', { userId: authData.user.id, error: profileError?.message });
            return res.status(500).json({
                success: false,
                error: 'Profile not found',
                message: 'Unable to retrieve your profile. Please contact your administrator.',
                code: 'PROFILE_NOT_FOUND'
            });
        }
        if (!profile.is_active) {
            logger_1.logger.warn('❌ Inactive account attempted login', 'auth', { userId: authData.user.id, email });
            return res.status(403).json({
                success: false,
                error: 'Account inactive',
                message: 'Your account is inactive. Please contact your administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        if (profile.role !== 'student') {
            logger_1.logger.warn('❌ Non-student attempted student login', 'auth', { userId: authData.user.id, email, role: profile.role });
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
        }
        catch (updateError) {
            logger_1.logger.warn('⚠️ Failed to update last login time', 'auth', { userId: authData.user.id, error: updateError instanceof Error ? updateError.message : 'Unknown error' });
        }
        logger_1.logger.info('✅ Student login successful', 'auth', {
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
    }
    catch (error) {
        logger_1.logger.error('❌ Student login error', 'auth', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred. Please try again.',
            code: 'INTERNAL_ERROR'
        });
    }
});
exports.default = router;
//# sourceMappingURL=student.js.map