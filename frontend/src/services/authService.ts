import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../config/supabase';

import { logger } from '../utils/logger';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

export interface DriverBusAssignment {
  driver_id: string;
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_name: string;
  driver_name: string;
  created_at: string;
  updated_at: string;
}

class AuthService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private currentProfile: UserProfile | null = null;
  private currentDriverAssignment: DriverBusAssignment | null = null;
  private authStateChangeListener: (() => void) | null = null;
  private authSubscription: any = null;

  // Cleanup method
  public cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    // Clear token cache on cleanup
    this.tokenCache = { token: null, timestamp: 0, ttl: 5 * 60 * 1000 };
  }
  private _isInitialized: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Get initial session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error('❌ Error getting session', 'component', { error: error instanceof Error ? error.message : String(error) });
        this._isInitialized = true;
        return;
      }

      if (session) {
        logger.info(`🔑 Setting initial session for user: ${session.user.email}`, 'auth');
        this.currentSession = session;
        this.currentUser = session.user;
        logger.debug(
          `🔑 Session access token: ${session.access_token ? 'Exists' : 'Missing'}`,
          'auth'
        );
        await this.loadUserProfile(session.user.id);
      }

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.info(`🔄 Auth state changed: ${event} for user: ${session?.user?.email || 'none'}`, 'auth');

        this.currentSession = session;
        this.currentUser = session?.user || null;

        // Clear token cache on session change
        this.tokenCache = { token: null, timestamp: 0, ttl: 5 * 60 * 1000 };

        if (session) {
          logger.debug(
            `🔑 Auth state change - Session access token: ${session.access_token ? 'Exists' : 'Missing'}`,
            'auth'
          );
        }

        if (session?.user) {
          await this.loadUserProfile(session.user.id);
        } else {
          this.currentProfile = null;
        }

        // Notify listeners
        if (this.authStateChangeListener) {
          this.authStateChangeListener();
        }
      });

      this._isInitialized = true;
      logger.info('✅ Auth service initialized', 'auth');

      // Store subscription for cleanup
      this.authSubscription = subscription;
    } catch (error) {
      logger.error('❌ Error initializing auth', 'auth', { error: String(error) });
      this._isInitialized = true;
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      // Check if user has dual roles in auth metadata
      const authRoles = this.currentUser?.user_metadata?.roles;
      const isDualRoleUser =
        authRoles && Array.isArray(authRoles) && authRoles.length > 1;

      if (isDualRoleUser) {
        // For dual-role users, determine role based on current interface
        const currentPath = window.location.pathname;
        let role: 'admin' | 'driver' | 'student' = 'admin'; // Default to admin

        if (currentPath.includes('/driver')) {
          role = 'driver';
        } else if (currentPath.includes('/admin')) {
          role = 'admin';
        } else {
          // If not on a specific interface, check if admin email
          const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(
            (email: string) => email.trim().toLowerCase()
          ) || ['siddharthmali.211@gmail.com'];
          role = adminEmails.includes(
            this.currentUser?.email?.toLowerCase() || ''
          )
            ? 'admin'
            : 'driver';
        }

        // Load profile from database but override role
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('❌ Error loading user profile:', error);
          this.setTemporaryProfileWithRoleCheck(userId, this.currentUser);
          return;
        }

        this.currentProfile = {
          id: profile.id,
          email: this.currentUser?.email || '',
          role: role, // Use determined role instead of database role
          full_name: profile.full_name,
          first_name: profile.full_name?.split(' ')[0] || '',
          last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        return;
      }

      // Regular single-role user handling
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error loading user profile:', error);
        // Set temporary profile with role check
        this.setTemporaryProfileWithRoleCheck(userId, this.currentUser);
        return;
      }

      // Check if this is a known admin user - prioritize admin email over database role
      const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(
        (email: string) => email.trim().toLowerCase()
      ) || [
        'siddharthmali.211@gmail.com', // Keep this as fallback for development
      ];

      const isAdmin = adminEmails.includes(
        this.currentUser?.email?.toLowerCase() || ''
      );
      const role = isAdmin ? 'admin' : profile.role;

      console.log(
        `🔍 User ${this.currentUser?.email} - Database role: ${profile.role}, Admin check: ${isAdmin}, Final role: ${role}`
      );

      this.currentProfile = {
        id: profile.id,
        email: this.currentUser?.email || '',
        role: role,
        full_name: profile.full_name,
        first_name: profile.full_name?.split(' ')[0] || '',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
      // Set temporary profile with role check on any error
      this.setTemporaryProfileWithRoleCheck(userId, this.currentUser);
    }
  }

  // Removed unused setTemporaryProfile function

  private setTemporaryProfileWithRoleCheck(userId: string, user: User | null): void {
    console.log('🔄 Setting temporary profile with role check for user login');

    if (!user) {
      console.log('❌ No user data available for profile creation');
      return;
    }

    // Check if this is a known admin user - use environment variable
    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(
      (email: string) => email.trim().toLowerCase()
    ) || [
      'siddharthmali.211@gmail.com', // Keep this as fallback for development
    ];

    const userEmail = user.email?.toLowerCase() || '';
    const isAdmin = adminEmails.includes(userEmail);
    const role = isAdmin ? 'admin' : 'student';

    console.log(`🔍 User ${user.email} assigned role: ${role}`);

    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';
    const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';

    this.currentProfile = {
      id: userId,
      email: user.email || '',
      role: role,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Removed redundant createDefaultProfile method

  // Sign in with email and password - OPTIMIZED VERSION 2.0
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile | undefined }> {
    try {
      logger.info(`🔐 Starting sign in process for: ${email}`, 'auth');

      // OPTIMIZATION: Set an early cache to speed up subsequent sign-ins
      this.setSignInCache(email);

      // OPTIMIZATION: Use a faster timeout for better UX
      const timeoutMs = 8000; // 8s timeout - increased for reliability
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      // OPTIMIZATION: Better timeout handling with detailed error messages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Authentication timeout after ${timeoutMs/1000}s`)), timeoutMs);
      });

      // OPTIMIZATION: Add loading state indicator for UI feedback
      this._isAuthenticating = true;

      const result = await Promise.race([
        authPromise,
        timeoutPromise,
      ]) as { data?: { user?: User; session?: Session }; error?: Error };

      if (result.error) {
        logger.error('❌ Sign in error:', 'auth', { error: result.error });
        return { 
          success: false, 
          error: this.getFormattedAuthError(result.error)
        };
      }

      if (!result.data) {
        logger.error('❌ No data received from authentication', 'auth');
        return { success: false, error: 'No authentication data received' };
      }

      const { data } = result;
      logger.info('✅ Supabase authentication successful', 'auth');

      if (data.user && data.session) {
        logger.info(`👤 User data received: ${data.user.email}`, 'auth');
        
        // OPTIMIZATION: Set current user and session immediately for faster perceived performance
        this.currentUser = data.user;
        this.currentSession = data.session;

        // OPTIMIZATION: Start profile loading with a more graceful fallback strategy
        logger.info('📋 Loading user profile...', 'auth');
        
        try {
          // OPTIMIZATION: Use Promise.any instead of race to try multiple profile loading strategies
          const directProfilePromise = this.loadUserProfile(data.user.id);
          
          // OPTIMIZATION: Simultaneously try to use cached profile data if available
          const cachedProfilePromise = this.tryLoadCachedProfile(data.user.id);
          
          // Set a reasonable timeout that won't block the UI
          const profileTimeout = 2500; // 2.5s
          
          // Try both approaches and use whichever succeeds first
          // Using Promise.race instead of Promise.any for better compatibility
          const profilePromise = Promise.race([
            directProfilePromise.then(result => result),
            cachedProfilePromise.then(result => result)
          ]);
          
          // Use Promise.race with the timeout
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Profile loading timeout')), profileTimeout);
          });

          await Promise.race([profilePromise, timeoutPromise]);
          logger.info(`✅ Profile loaded: ${this.currentProfile?.role}`, 'auth');
        } catch (profileError) {
          logger.warn('⚠️ Profile loading timed out, using temporary profile', 'auth', { error: String(profileError) });

          // OPTIMIZATION: Use a more accurate temporary profile based on user metadata
          this.setTemporaryProfileWithRoleCheck(data.user.id, data.user);
        } finally {
          // OPTIMIZATION: Reset authentication state
          this._isAuthenticating = false;
        }

        // OPTIMIZATION: Pre-fetch any required data for faster initial loading
        this.prefetchUserData(data.user.id).catch(err => 
          logger.debug('Non-critical prefetch error', 'auth', { error: String(err) })
        );

        // Notify listeners immediately after successful sign in
        if (this.authStateChangeListener) {
          this.authStateChangeListener();
        }

        return {
          success: true,
          user: this.currentProfile || undefined,
        };
      }

      logger.error('❌ No user or session data received', 'auth');
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      logger.error('❌ Sign in error:', 'auth', { error: String(error) });
      
      // Reset authentication state on error
      this._isAuthenticating = false;
      
      // OPTIMIZATION: More detailed error handling with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('network')) {
          return {
            success: false,
            error: 'Network connection error. Please check your internet connection and try again.',
          };
        }
        if (error.message.includes('timeout')) {
          return {
            success: false,
            error: 'Login is taking longer than expected. Please try again or check your connection.',
          };
        }
        if (error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            error: 'Invalid email or password. Please check your credentials and try again.',
          };
        }
      }
      
      return { success: false, error: 'An error occurred during sign in. Please try again.' };
    }
  }
  
  // OPTIMIZATION: Helper methods to improve login performance
  
  private _isAuthenticating = false;
  
  private setSignInCache(email: string): void {
    try {
      sessionStorage.setItem('last_signin_attempt', email);
      sessionStorage.setItem('last_signin_time', Date.now().toString());
    } catch (e) {
      // Ignore errors if sessionStorage is unavailable
    }
  }
  
  private async tryLoadCachedProfile(userId: string): Promise<void> {
    try {
      const cachedProfile = localStorage.getItem(`profile_${userId}`);
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        const cacheTime = parsedProfile._timestamp || 0;
        
        // Only use cache if it's less than 1 hour old
        if (Date.now() - cacheTime < 3600000) {
          this.currentProfile = {
            id: parsedProfile.id,
            email: parsedProfile.email,
            role: parsedProfile.role,
            full_name: parsedProfile.full_name,
            first_name: parsedProfile.first_name,
            last_name: parsedProfile.last_name,
            created_at: parsedProfile.created_at,
            updated_at: parsedProfile.updated_at,
          };
          logger.info('✅ Used cached profile data', 'auth');
          return;
        }
      }
      throw new Error('No valid cached profile');
    } catch (e) {
      throw new Error('Failed to load from cache');
    }
  }
  
  private async prefetchUserData(userId: string): Promise<void> {
    // Prefetch common data needed after login to improve perceived performance
    if (this.currentProfile?.role === 'driver') {
      // For drivers, prefetch their bus assignment
      this.getDriverBusAssignment(userId).catch(() => {});
    }
  }
  
  private getFormattedAuthError(error: Error): string {
    const errorMsg = error.message || 'Authentication failed';
    
    if (errorMsg.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (errorMsg.includes('Too many requests')) {
      return 'Too many login attempts. Please try again later.';
    }
    
    if (errorMsg.includes('Email not confirmed')) {
      return 'Email not verified. Please check your inbox for a verification email.';
    }
    
    return errorMsg;
  }

  // Sign up with email and password
  async signUp(
    email: string,
    password: string,
    profile: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: profile.full_name,
            role: profile.role || 'student',
          },
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create profile in user_profiles table
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: data.user.id,
          full_name: profile.full_name || 'Unknown User',
          role: profile.role || 'student',
        });

        if (profileError) {
          console.error('❌ Error creating profile:', profileError);
          return { success: false, error: 'Profile creation failed' };
        }

        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { success: false, error: 'Network error during sign up' };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Starting sign out process...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Sign out successful');

      // Clear all auth state
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;

      // Notify listeners immediately after sign out
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: 'Network error during sign out' };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current session
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  // Get current user profile
  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  // Check if auth service is initialized
  isInitialized(): boolean {
    return this._isInitialized;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.currentSession;
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.currentProfile?.role === role;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  // Check if user is driver
  isDriver(): boolean {
    return this.hasRole('driver');
  }

  // Check if user is student
  isStudent(): boolean {
    return this.hasRole('student');
  }

  // Token cache for performance optimization
  private tokenCache: { token: string | null; timestamp: number; ttl: number } = {
    token: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5 minutes TTL
  };

  // Get access token for API calls with caching
  getAccessToken(): string | null {
    const now = Date.now();
    
    // Return cached token if still valid
    if (this.tokenCache.token && (now - this.tokenCache.timestamp) < this.tokenCache.ttl) {
      return this.tokenCache.token;
    }

    // First try to get from current session
    let token = this.currentSession?.access_token || null;

    // If no token in current session, try to get from localStorage as fallback
    if (!token) {
      try {
        // Try multiple localStorage keys that Supabase might use
        const possibleKeys = [
          'supabase.auth.token',
          'sb-gthwmwfwvhyriygpcdlr-auth-token', // Supabase project-specific key
          'supabase.auth.session',
        ];

        for (const key of possibleKeys) {
          const storedSession = localStorage.getItem(key);
          if (storedSession) {
            const parsedSession = JSON.parse(storedSession);
            token =
              parsedSession?.currentSession?.access_token ||
              parsedSession?.access_token ||
              parsedSession?.session?.access_token ||
              null;

            if (token) {
              logger.debug(`🔑 Retrieved token from localStorage fallback (${key})`, 'auth');
              break;
            }
          }
        }
      } catch (error) {
        logger.warn('⚠️ Error reading token from localStorage:', 'auth', { error: String(error) });
      }
    }

    // Cache the token
    this.tokenCache = {
      token,
      timestamp: now,
      ttl: 5 * 60 * 1000 // 5 minutes TTL
    };

    logger.debug('🔑 getAccessToken called:', 'auth', {
      hasToken: !!token,
      hasSession: !!this.currentSession,
      fromCache: false
    });
    
    return token;
  }

  // Enhanced token validation for API calls with automatic refresh
  async validateTokenForAPI(): Promise<{
    valid: boolean;
    token: string | null;
    refreshed: boolean;
  }> {
    let token = this.getAccessToken();
    let refreshed = false;

    if (!token) {
      return { valid: false, token: null, refreshed: false };
    }

    try {
      // First, try to validate the current token
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.log(
          '🔄 Token validation failed, attempting refresh:',
          error?.message
        );

        // Try to refresh the session
        const refreshResult = await this.refreshSession();
        if (refreshResult.success) {
          token = this.getAccessToken();
          refreshed = true;
          console.log('✅ Token refreshed successfully');
        } else {
          console.log('❌ Token refresh failed:', refreshResult.error);
          return { valid: false, token: null, refreshed: false };
        }
      }

      // Validate the token again (either original or refreshed)
      if (token) {
        const {
          data: { user: validatedUser },
          error: validationError,
        } = await supabase.auth.getUser(token);

        if (validationError || !validatedUser) {
          console.log(
            '❌ Final token validation failed:',
            validationError?.message
          );
          return { valid: false, token: null, refreshed };
        }

        return { valid: true, token, refreshed };
      }

      return { valid: false, token: null, refreshed };
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return { valid: false, token: null, refreshed: false };
    }
  }

  // Refresh session
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if we have a current session before attempting refresh
      if (!this.currentSession) {
        console.log('🔄 No current session to refresh');
        return { success: false, error: 'No session to refresh' };
      }

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        // Don't log AuthSessionMissingError as an error since it's expected when no session exists
        if (error.message.includes('Auth session missing')) {
          console.log(
            '🔄 No session to refresh (expected for unauthenticated users)'
          );
          return { success: false, error: 'No session to refresh' };
        }
        console.error('❌ Session refresh error:', error);
        return { success: false, error: error.message };
      }

      if (data.session) {
        this.currentSession = data.session;
        this.currentUser = data.user;
        return { success: true };
      }

      return { success: false, error: 'Session refresh failed' };
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      return { success: false, error: 'Network error during session refresh' };
    }
  }

  // Update user profile
  async updateProfile(
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'No authenticated user' };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', this.currentUser.id);

      if (error) {
        console.error('❌ Profile update error:', error);
        return { success: false, error: error.message };
      }

      // Reload profile
      await this.loadUserProfile(this.currentUser.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return { success: false, error: 'Network error during profile update' };
    }
  }

  // Set auth state change listener
  onAuthStateChange(listener: () => void): void {
    this.authStateChangeListener = listener;
  }

  // Remove auth state change listener
  removeAuthStateChangeListener(): void {
    this.authStateChangeListener = null;
  }

  // Debug method to get current auth state
  getAuthState() {
    return {
      initialized: this._isInitialized,
      user: this.currentUser,
      session: this.currentSession,
      profile: this.currentProfile,
      isAuthenticated: this.isAuthenticated(),
      isAdmin: this.isAdmin(),
    };
  }

  // Method to force a fresh login and clear any stale sessions
  async forceFreshLogin(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Forcing fresh login...');

      // Clear all localStorage auth data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes('supabase') ||
            key.includes('auth') ||
            key.includes('sb-'))
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage key: ${key}`);
      });

      // Clear current session
      this.currentSession = null;
      this.currentUser = null;
      this.currentProfile = null;

      console.log('✅ Fresh login state prepared');
      return { success: true };
    } catch (error) {
      console.error('❌ Error forcing fresh login:', error);
      return { success: false, error: 'Failed to force fresh login' };
    }
  }

  // Method to recover session from localStorage for cross-device scenarios
  async recoverSession(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Attempting to recover session from localStorage...');

      // Try multiple localStorage keys that Supabase might use
      const possibleKeys = [
        'supabase.auth.token',
        'sb-gthwmwfwvhyriygpcdlr-auth-token', // Supabase project-specific key
        'supabase.auth.session',
      ];

      let storedSession = null;
      let usedKey = null;

      for (const key of possibleKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          storedSession = stored;
          usedKey = key;
          console.log(`📝 Found session in localStorage key: ${key}`);
          break;
        }
      }

      if (!storedSession) {
        console.log('📝 No stored session found in any localStorage key');
        return { success: false, error: 'No stored session' };
      }

      let parsedSession;
      try {
        parsedSession = JSON.parse(storedSession);
      } catch (parseError) {
        console.log('❌ Failed to parse stored session:', parseError);
        return { success: false, error: 'Invalid session format' };
      }

      // Try different session structures
      const accessToken =
        parsedSession?.currentSession?.access_token ||
        parsedSession?.access_token ||
        parsedSession?.session?.access_token;

      if (!accessToken) {
        console.log(
          '🔑 No access token found in stored session structure:',
          parsedSession
        );
        return { success: false, error: 'No access token in stored session' };
      }

      console.log('🔑 Found access token, validating...');

      // Verify the token is still valid
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (error || !user) {
        console.log('❌ Stored token is invalid:', error?.message);
        if (usedKey) {
          localStorage.removeItem(usedKey);
        }
        return { success: false, error: 'Stored token is invalid' };
      }

      // Set the recovered session
      this.currentSession = {
        access_token: accessToken,
        refresh_token:
          parsedSession?.currentSession?.refresh_token ||
          parsedSession?.refresh_token,
        expires_in:
          parsedSession?.currentSession?.expires_in ||
          parsedSession?.expires_in,
        token_type: 'bearer',
        user: user,
      } as Session;

      this.currentUser = user;

      // Load user profile
      await this.loadUserProfile(user.id);

      console.log('✅ Session recovered successfully for user:', user.email);
      return { success: true };
    } catch (error) {
      console.error('❌ Error recovering session:', error);
      return { success: false, error: 'Failed to recover session' };
    }
  }

  // New methods for proper authentication state management

  /**
   * Get driver-bus assignment from database
   */
  async getDriverBusAssignment(
    driverId: string
  ): Promise<DriverBusAssignment | null> {
    try {
      // Get bus assignment directly from buses table (matching backend logic)
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('id, number_plate, route_id')
        .eq('assigned_driver_id', driverId)
        .eq('is_active', true)
        .single();

      if (busError || !busData) {
        console.error('❌ Error fetching bus assignment:', busError);
        return null;
      }

      // Get route information
      let routeName = '';
      if (busData.route_id) {
        const { data: routeData, error: routeError } = await supabase
          .from('routes')
          .select('name')
          .eq('id', busData.route_id)
          .single();

        if (!routeError && routeData) {
          routeName = routeData.name;
        }
      }

      // Get driver name from user_profiles
      let driverName = 'Unknown Driver';
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', driverId)
        .single();

      if (!profileError && profileData?.full_name) {
        driverName = profileData.full_name;
      } else {
        // Fallback to users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', driverId)
          .single();

        if (!userError && userData) {
          driverName =
            `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
            'Unknown Driver';
        }
      }

      return {
        driver_id: driverId,
        bus_id: busData.id,
        bus_number: busData.number_plate,
        route_id: busData.route_id || '',
        route_name: routeName,
        driver_name: driverName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error in getDriverBusAssignment:', error);
      return null;
    }
  }

  /**
   * Store driver-bus assignment in database
   */
  async storeDriverBusAssignment(
    assignment: Omit<DriverBusAssignment, 'created_at' | 'updated_at'>
  ): Promise<boolean> {
    try {
      // Since the backend already has the assignment in the buses table,
      // we just need to store the assignment in memory for the frontend
      this.currentDriverAssignment = {
        ...assignment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('✅ Driver bus assignment stored in memory successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in storeDriverBusAssignment:', error);
      return false;
    }
  }

  /**
   * Clear driver-bus assignment from database
   */
  async clearDriverBusAssignment(): Promise<boolean> {
    try {
      // Just clear from memory since the backend handles the actual assignment
      this.currentDriverAssignment = null;
      console.log('✅ Driver bus assignment cleared from memory');
      return true;
    } catch (error) {
      console.error('❌ Error in clearDriverBusAssignment:', error);
      return false;
    }
  }

  /**
   * Get current driver assignment from memory (cached)
   */
  getCurrentDriverAssignment(): DriverBusAssignment | null {
    return this.currentDriverAssignment;
  }

  /**
   * Validate session and refresh if needed
   */
  async validateSession(): Promise<boolean> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Session validation error:', error);
        return false;
      }

      if (!session) {
        console.log('❌ No active session found');
        return false;
      }

      // Check if session is expired or about to expire
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      // If session expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 Session expiring soon, refreshing...');
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ Session refresh error:', refreshError);
          return false;
        }

        if (refreshedSession) {
          this.currentSession = refreshedSession;
          this.currentUser = refreshedSession.user;
          console.log('✅ Session refreshed successfully');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return false;
    }
  }

  /**
   * Check if user has valid driver session with enhanced error handling
   */
  async validateDriverSession(): Promise<{
    isValid: boolean;
    assignment: DriverBusAssignment | null;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      // First validate the session with detailed error reporting
      const isSessionValid = await this.validateSession();
      if (!isSessionValid) {
        logger.warn('❌ Driver session validation failed: Invalid session', 'driver-validation');
        return { 
          isValid: false, 
          assignment: null,
          errorCode: 'INVALID_SESSION',
          errorMessage: 'Your login session has expired. Please sign in again.'
        };
      }

      // Check if user exists
      if (!this.currentUser || !this.currentUser.id) {
        logger.warn('❌ Driver session validation failed: No user data', 'driver-validation');
        return { 
          isValid: false, 
          assignment: null,
          errorCode: 'NO_USER_DATA',
          errorMessage: 'Unable to retrieve your user information. Please sign in again.'
        };
      }

      // Check if user profile was loaded
      if (!this.currentProfile) {
        logger.warn('❌ Driver session validation failed: No profile data', 'driver-validation');
        return { 
          isValid: false, 
          assignment: null,
          errorCode: 'NO_PROFILE',
          errorMessage: 'Unable to load your driver profile. Please contact your administrator.'
        };
      }

      // Check if user is a driver with improved error message
      if (this.currentProfile?.role !== 'driver') {
        logger.warn(`❌ User is not a driver: ${this.currentProfile?.role || 'unknown role'}`, 'driver-validation');
        return { 
          isValid: false, 
          assignment: null,
          errorCode: 'NOT_A_DRIVER',
          errorMessage: 'You do not have driver privileges. Please contact your administrator if you believe this is an error.'
        };
      }

      // Get driver assignment from database with retry logic
      let assignment: DriverBusAssignment | null = null;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!assignment && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            logger.info(`Retrying driver assignment fetch (attempt ${retryCount})`, 'driver-validation');
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Exponential backoff
          }
          
          assignment = await this.getDriverBusAssignment(this.currentUser.id);
          retryCount++;
          
          if (!assignment && retryCount <= maxRetries) {
            logger.warn(`No assignment found, retry ${retryCount}/${maxRetries}`, 'driver-validation');
          }
        } catch (retryError) {
          logger.error(`Error fetching driver assignment (attempt ${retryCount})`, 'driver-validation', { 
            error: String(retryError) 
          });
          retryCount++;
        }
      }
      
      if (!assignment) {
        logger.warn('❌ No active bus assignment found for driver', 'driver-validation', {
          driverId: this.currentUser.id,
          driverEmail: this.currentUser.email
        });
        
        return { 
          isValid: false, 
          assignment: null,
          errorCode: 'NO_BUS_ASSIGNMENT',
          errorMessage: 'You do not have an active bus assignment. Please contact your administrator to get assigned to a bus.'
        };
      }

      // Store the assignment in memory
      this.currentDriverAssignment = assignment;
      
      // Also store in session storage for faster recovery
      try {
        sessionStorage.setItem(
          `driver_assignment_${this.currentUser.id}`, 
          JSON.stringify({...assignment, _timestamp: Date.now()})
        );
      } catch (e) {
        // Ignore storage errors
      }
      
      logger.info('✅ Driver session validated successfully', 'driver-validation', {
        busId: assignment.bus_id,
        busNumber: assignment.bus_number,
        routeId: assignment.route_id
      });
      
      return { isValid: true, assignment };
    } catch (error) {
      logger.error('❌ Error validating driver session:', 'driver-validation', { 
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: this.currentUser?.id,
        userEmail: this.currentUser?.email
      });
      
      return { 
        isValid: false, 
        assignment: null,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'An error occurred while validating your driver status. Please try again or contact support.'
      };
    }
  }

  /**
   * Logout and clear all session data
   */
  async logout(): Promise<void> {
    try {
      // Clear driver assignment if exists
      if (this.currentUser && this.currentProfile?.role === 'driver') {
        await this.clearDriverBusAssignment();
      }

      // Clear current state
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      this.currentDriverAssignment = null;

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out:', error);
      } else {
        console.log('✅ Logged out successfully');
      }
    } catch (error) {
      console.error('❌ Error in logout:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
