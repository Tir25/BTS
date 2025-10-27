import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../config/supabase';
import { timeoutConfig } from '../config/timeoutConfig';
import { logger } from '../utils/logger';
import { standardBackoff } from './resilience/ExponentialBackoff';
import { resilientQuery } from './resilience/ResilientSupabaseService';

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
  
  // Concurrency control for session validation
  private validationInProgress = false;
  private validationPromise: Promise<{
    isValid: boolean;
    assignment: DriverBusAssignment | null;
    errorCode?: string;
    errorMessage?: string;
  }> | null = null;
  
  // Proactive session refresh
  private sessionRefreshInterval: NodeJS.Timeout | null = null;
  private isRefreshingSession = false;

  // Cleanup method
  public cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    
    // Stop proactive session refresh
    this.stopProactiveSessionRefresh();
    
    // PRODUCTION FIX: Clear token cache on cleanup
    this.clearTokenCache();
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
        
        // Start proactive session refresh
        this.startProactiveSessionRefresh();
      }

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.info(`🔄 Auth state changed: ${event} for user: ${session?.user?.email || 'none'}`, 'auth');

        this.currentSession = session;
        this.currentUser = session?.user || null;

        // PRODUCTION FIX: Clear token cache on session change
        this.clearTokenCache();

        if (session) {
          logger.debug(
            `🔑 Auth state change - Session access token: ${session.access_token ? 'Exists' : 'Missing'}`,
            'auth'
          );
        }

        if (session?.user) {
          await this.loadUserProfile(session.user.id);
          // Start proactive session refresh if we have a session
          this.startProactiveSessionRefresh();
        } else {
          this.currentProfile = null;
          // Stop proactive session refresh if no session
          this.stopProactiveSessionRefresh();
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

        // PRODUCTION FIX: Use resilient Supabase query with retry logic
        const result = await resilientQuery<{
          id: string;
          full_name: string;
          role: string;
          created_at: string;
          updated_at: string;
        }>(
          async () => {
            const queryResult = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .single();
            return queryResult;
          },
          {
            timeout: timeoutConfig.api.shortRunning,
            retryOnFailure: true,
            maxRetries: 3,
          }
        );

        if (result.error || !result.data) {
          logger.warn('⚠️ Error loading user profile, using temporary profile', 'auth', {
            error: result.error?.message || 'No data returned',
            retries: result.retries || 0,
          });
          this.setTemporaryProfileWithRoleCheck(userId, this.currentUser);
          return;
        }

        const profile = result.data;

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

      // Regular single-role user handling - PRODUCTION FIX: Use resilient query
      const result = await resilientQuery<{
        id: string;
        full_name: string;
        role: string;
        created_at: string;
        updated_at: string;
      }>(
        async () => {
          const queryResult = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return queryResult;
        },
        {
          timeout: timeoutConfig.api.shortRunning,
          retryOnFailure: true,
          maxRetries: 3,
        }
      );

      if (result.error || !result.data) {
        logger.warn('⚠️ Error loading user profile, using temporary profile', 'auth', {
          error: result.error?.message || 'No data returned',
          retries: result.retries || 0,
        });
        // Set temporary profile with role check
        this.setTemporaryProfileWithRoleCheck(userId, this.currentUser);
        return;
      }

      const profile = result.data;

      // Check if this is a known admin user - prioritize admin email over database role
      const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(
        (email: string) => email.trim().toLowerCase()
      ) || [
        'siddharthmali.211@gmail.com', // Keep this as fallback for development
      ];

      const isAdmin = adminEmails.includes(
        this.currentUser?.email?.toLowerCase() || ''
      );
      const role: 'admin' | 'driver' | 'student' = isAdmin ? 'admin' : (profile.role as 'admin' | 'driver' | 'student');

      logger.debug('User profile loaded', 'auth', {
        email: this.currentUser?.email,
        databaseRole: profile.role,
        adminCheck: isAdmin,
        finalRole: role,
      });

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
      logger.error('❌ Error in loadUserProfile', 'auth', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
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

  // Sign in with email and password - PRODUCTION-GRADE VERSION WITH RACE CONDITION FIX
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile | undefined }> {
    // Prevent concurrent sign-in attempts
    if (this._isAuthenticating) {
      logger.warn('⚠️ Sign-in already in progress, rejecting concurrent attempt', 'auth');
      return { success: false, error: 'Sign-in already in progress. Please wait.' };
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;

    try {
      logger.info(`🔐 Starting sign in process for: ${email}`, 'auth');

      // Clear token cache before starting new authentication
      this.clearTokenCache();

      // OPTIMIZATION: Set an early cache to speed up subsequent sign-ins
      this.setSignInCache(email);

      // Use centralized timeout configuration
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      // PRODUCTION FIX: Proper timeout handling with cancellation support
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error(`Authentication timeout after ${timeoutConfig.auth.signIn / 1000}s`));
          }
        }, timeoutConfig.auth.signIn);
      });

      // OPTIMIZATION: Add loading state indicator for UI feedback
      this._isAuthenticating = true;

      let result: { data?: { user?: User; session?: Session }; error?: Error };
      
      try {
        const raceResult = await Promise.race([
          authPromise.then((res) => {
            if (!isResolved) {
              isResolved = true;
              if (timeoutId) clearTimeout(timeoutId);
              return res;
            }
            throw new Error('Authentication cancelled');
          }),
          timeoutPromise,
        ]);
        
        // Type-safe conversion from Supabase response to our expected format
        result = {
          data: raceResult.data ? {
            user: raceResult.data.user || undefined,
            session: raceResult.data.session || undefined
          } : undefined,
          error: raceResult.error ? new Error(raceResult.error.message) : undefined
        };
      } catch (raceError) {
        // Handle race condition properly
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          logger.error('❌ Authentication timeout', 'auth', { error: raceError.message });
          // Clear token cache on timeout
          this.clearTokenCache();
          return { 
            success: false, 
            error: 'Login is taking longer than expected. Please check your internet connection and try again.'
          };
        }
        throw raceError;
      }

      if (result.error) {
        logger.error('❌ Sign in error:', 'auth', { error: result.error });
        // PRODUCTION FIX: Clear token cache on authentication failure
        this.clearTokenCache();
        return { 
          success: false, 
          error: this.getFormattedAuthError(result.error)
        };
      }

      if (!result.data) {
        logger.error('❌ No data received from authentication', 'auth');
        // PRODUCTION FIX: Clear token cache on authentication failure
        this.clearTokenCache();
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
          
          // Use centralized timeout for profile loading
          const profileTimeout = timeoutConfig.api.shortRunning;
          
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
      // PRODUCTION FIX: Clear token cache on authentication failure
      this.clearTokenCache();
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      logger.error('❌ Sign in error:', 'auth', { error: String(error) });
      
      // PRODUCTION FIX: Clear token cache on any authentication error
      this.clearTokenCache();
      
      // Reset authentication state on error
      this._isAuthenticating = false;
      
      // Ensure timeout is cleared
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
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
    } finally {
      // PRODUCTION FIX: Always reset authentication state and clear timeout
      this._isAuthenticating = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
      logger.info('🔐 Starting sign out process...', 'auth');

      // Stop proactive session refresh
      this.stopProactiveSessionRefresh();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('❌ Sign out error:', 'auth', { error: error.message });
        // Continue with cleanup even if signOut has an error
      }

      logger.info('✅ Supabase sign out completed', 'auth');

      // Clear all auth state
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      this.currentDriverAssignment = null;

      // Clear token cache
      this.clearTokenCache();

      // Clear localStorage and sessionStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('profile_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            logger.debug(`🗑️ Removed localStorage key: ${key}`, 'auth');
          } catch (e) {
            logger.warn(`⚠️ Failed to remove localStorage key: ${key}`, 'auth', { error: e });
          }
        });
        
        // Clear sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('profile_') || key.includes('driver_assignment'))) {
            try {
              sessionStorage.removeItem(key);
              logger.debug(`🗑️ Removed sessionStorage key: ${key}`, 'auth');
            } catch (e) {
              logger.warn(`⚠️ Failed to remove sessionStorage key: ${key}`, 'auth', { error: e });
            }
          }
        }
        
        logger.info('✅ All authentication data cleared from storage', 'auth');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing storage during sign out', 'auth', { error: storageError });
      }

      // Notify listeners immediately after sign out
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }

      logger.info('✅ Sign out process completed successfully', 'auth');
      return { success: true };
    } catch (error) {
      logger.error('❌ Sign out error:', 'auth', { error: String(error) });
      // Even on error, clear the state
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      this.currentDriverAssignment = null;
      this.clearTokenCache();
      
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }
      
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
  private tokenCache: { token: string | null; timestamp: number; ttl: number; expiresAt?: number } = {
    token: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5 minutes TTL
  };

  // PRODUCTION FIX: Clear token cache method
  private clearTokenCache(): void {
    this.tokenCache = { token: null, timestamp: 0, ttl: 5 * 60 * 1000 };
    logger.debug('🗑️ Token cache cleared', 'auth');
  }

  // PRODUCTION FIX: Check if token is expired based on session expiration
  private isTokenExpired(token: string | null, session: Session | null): boolean {
    if (!token || !session || !session.expires_at) {
      return false; // If we can't determine expiration, assume valid
    }

    // Convert expires_at (Unix timestamp in seconds) to milliseconds
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const bufferTime = 60 * 1000; // 1 minute buffer before expiration

    // Token is expired if current time is within 1 minute of expiration
    return now >= (expiresAt - bufferTime);
  }

  // Get access token for API calls with caching and expiration checking
  getAccessToken(): string | null {
    const now = Date.now();
    
    // PRODUCTION FIX: Check cache validity (both TTL and token expiration)
    if (this.tokenCache.token && (now - this.tokenCache.timestamp) < this.tokenCache.ttl) {
      // Additional check: verify token hasn't expired based on session
      if (!this.isTokenExpired(this.tokenCache.token, this.currentSession)) {
        return this.tokenCache.token;
      } else {
        // Token expired, clear cache
        logger.debug('🔑 Cached token expired, clearing cache', 'auth');
        this.clearTokenCache();
      }
    }

    // First try to get from current session
    let token = this.currentSession?.access_token || null;

    // PRODUCTION FIX: Validate token expiration before caching
    if (token && this.isTokenExpired(token, this.currentSession)) {
      logger.warn('⚠️ Session token expired, cannot use', 'auth');
      token = null;
      this.clearTokenCache();
    }

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
            const storedToken =
              parsedSession?.currentSession?.access_token ||
              parsedSession?.access_token ||
              parsedSession?.session?.access_token ||
              null;

            // PRODUCTION FIX: Check expiration of stored token
            if (storedToken) {
              const storedExpiresAt = parsedSession?.currentSession?.expires_at || 
                                      parsedSession?.expires_at ||
                                      parsedSession?.session?.expires_at;
              
              if (storedExpiresAt) {
                const expiresAt = storedExpiresAt * 1000;
                const bufferTime = 60 * 1000; // 1 minute buffer
                if (Date.now() >= (expiresAt - bufferTime)) {
                  logger.debug('🔑 Stored token expired, skipping', 'auth');
                  continue; // Try next key
                }
              }
              
              token = storedToken;
              logger.debug(`🔑 Retrieved token from localStorage fallback (${key})`, 'auth');
              break;
            }
          }
        }
      } catch (error) {
        logger.warn('⚠️ Error reading token from localStorage:', 'auth', { error: String(error) });
      }
    }

    // PRODUCTION FIX: Cache the token with expiration info
    const expiresAt = this.currentSession?.expires_at 
      ? this.currentSession.expires_at * 1000 
      : undefined;

    this.tokenCache = {
      token,
      timestamp: now,
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      expiresAt
    };

    logger.debug('🔑 getAccessToken called:', 'auth', {
      hasToken: !!token,
      hasSession: !!this.currentSession,
      fromCache: false,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : 'unknown'
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
        // Clear token cache after refresh
        this.clearTokenCache();
        logger.info('✅ Session refreshed successfully', 'auth');
        return { success: true };
      }

      return { success: false, error: 'Session refresh failed' };
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      return { success: false, error: 'Network error during session refresh' };
    }
  }

  /**
   * Check if session needs refresh and refresh proactively
   * PRODUCTION FIX: Enhanced handling for expired sessions and long-running sessions
   */
  private async checkAndRefreshSession(): Promise<void> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshingSession) {
      return;
    }

    if (!this.currentSession || !this.currentSession.expires_at) {
      // PRODUCTION FIX: If no session, try to recover from localStorage
      logger.warn('⚠️ No current session detected - attempting recovery', 'auth');
      const recoveryResult = await this.recoverSession();
      if (recoveryResult.success) {
        logger.info('✅ Session recovered from localStorage', 'auth');
        if (this.authStateChangeListener) {
          this.authStateChangeListener();
        }
      }
      return;
    }

    const expiresAt = this.currentSession.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshThreshold = timeoutConfig.session.refreshBeforeExpiry;

    // PRODUCTION FIX: Handle expired sessions (negative timeUntilExpiry)
    if (timeUntilExpiry <= 0) {
      logger.warn('⚠️ Session has expired - attempting refresh', 'auth', {
        expiredBy: Math.round(Math.abs(timeUntilExpiry) / 1000) + 's',
      });

      this.isRefreshingSession = true;
      try {
        const result = await this.refreshSession();
        if (result.success) {
          logger.info('✅ Expired session refreshed successfully', 'auth');
          if (this.authStateChangeListener) {
            this.authStateChangeListener();
          }
        } else {
          logger.error('❌ Failed to refresh expired session', 'auth', {
            error: result.error,
          });
          // PRODUCTION FIX: Attempt recovery if refresh fails
          const recoveryResult = await this.recoverSession();
          if (recoveryResult.success) {
            logger.info('✅ Session recovered after refresh failure', 'auth');
            if (this.authStateChangeListener) {
              this.authStateChangeListener();
            }
          } else {
            logger.error('❌ Session recovery failed - user may need to re-authenticate', 'auth');
          }
        }
      } catch (error) {
        logger.error('❌ Error refreshing expired session', 'auth', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.isRefreshingSession = false;
      }
      return;
    }

    // Refresh if session expires within the threshold
    if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
      this.isRefreshingSession = true;
      logger.info('🔄 Proactively refreshing session before expiry', 'auth', {
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + 's',
      });

      try {
        const result = await this.refreshSession();
        if (result.success) {
          logger.info('✅ Proactive session refresh successful', 'auth');
          // Notify listeners
          if (this.authStateChangeListener) {
            this.authStateChangeListener();
          }
        } else {
          logger.warn('⚠️ Proactive session refresh failed', 'auth', {
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('❌ Error during proactive session refresh', 'auth', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.isRefreshingSession = false;
      }
    }
  }

  /**
   * Start proactive session refresh interval
   */
  private startProactiveSessionRefresh(): void {
    // Stop existing interval if any
    this.stopProactiveSessionRefresh();

    // Start checking session expiry periodically
    this.sessionRefreshInterval = setInterval(() => {
      this.checkAndRefreshSession();
    }, timeoutConfig.session.checkInterval);

    logger.info('✅ Proactive session refresh started', 'auth', {
      checkInterval: timeoutConfig.session.checkInterval / 1000 + 's',
      refreshThreshold: timeoutConfig.session.refreshBeforeExpiry / 1000 + 's',
    });
  }

  /**
   * Stop proactive session refresh interval
   */
  private stopProactiveSessionRefresh(): void {
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
      this.sessionRefreshInterval = null;
      logger.info('🛑 Proactive session refresh stopped', 'auth');
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
   * Get driver-bus assignment from backend API with retry logic
   * Uses exponential backoff for transient failures
   */
  async getDriverBusAssignment(
    driverId: string
  ): Promise<DriverBusAssignment | null> {
    // Helper function to check if error is retriable
    const isRetriableError = (error: any): boolean => {
      if (!error) return false;
      
      // Network errors are retriable
      if (error.message?.includes('NetworkError') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('timeout')) {
        return true;
      }
      
      // 5xx server errors are retriable
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      
      // 408 Request Timeout is retriable
      if (error.status === 408) {
        return true;
      }
      
      // 429 Too Many Requests is retriable
      if (error.status === 429) {
        return true;
      }
      
      return false;
    };

    // Main fetch function with error handling
    const fetchAssignment = async (): Promise<DriverBusAssignment | null> => {
      logger.info('🔍 Fetching driver bus assignment via API', 'auth', { driverId });
      
      // Get access token for authenticated request
      const tokenResult = await this.validateTokenForAPI();
      if (!tokenResult.valid || !tokenResult.token) {
        logger.warn('❌ No valid token for API request', 'auth');
        return null;
      }

      // Use backend API with authentication
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(
        `${API_BASE_URL}/production-assignments/my-assignment`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenResult.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
        
        // Check if error is retriable
        if (isRetriableError(errorInfo)) {
          logger.warn('⚠️ Retriable error fetching bus assignment', 'auth', errorInfo);
          const retriableError: any = new Error(`Retriable error: ${response.status} ${response.statusText}`);
          retriableError.status = response.status;
          throw retriableError;
        }
        
        logger.error('❌ Non-retriable error fetching bus assignment from API', 'auth', errorInfo);
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        logger.info('✅ Bus assignment retrieved from API', 'auth', {
          bus_number: result.data.bus_number,
          route_name: result.data.route_name
        });
        return result.data;
      } else {
        logger.warn('⚠️ No bus assignment found', 'auth', { driverId });
        return null;
      }
    };

    // Fallback function for direct Supabase query - PRODUCTION FIX: Use resilient queries
    const fetchFromSupabase = async (): Promise<DriverBusAssignment | null> => {
      logger.info('🔄 Falling back to direct Supabase query', 'auth');
      
      // PRODUCTION FIX: Use resilient query with retry logic
      const busResult = await resilientQuery<{
        id: string;
        bus_number: string;
        route_id: string | null;
      }>(
        async () => {
          const queryResult = await supabase
            .from('buses')
            .select('id, bus_number, route_id')
            .eq('assigned_driver_profile_id', driverId)
            .eq('is_active', true)
            .single();
          return queryResult;
        },
        {
          timeout: timeoutConfig.api.shortRunning,
          retryOnFailure: true,
          maxRetries: 2,
        }
      );

      if (busResult.error || !busResult.data) {
        logger.error('❌ Fallback Supabase query failed', 'auth', {
          error: busResult.error?.message || 'No bus data returned',
          retries: busResult.retries || 0,
        });
        return null;
      }

      const busData = busResult.data;

      // Get route information - PRODUCTION FIX: Use resilient query
      let routeName = '';
      if (busData.route_id) {
        const routeResult = await resilientQuery<{ name: string }>(
          async () => {
            const queryResult = await supabase
              .from('routes')
              .select('name')
              .eq('id', busData.route_id)
              .single();
            return queryResult;
          },
          {
            timeout: timeoutConfig.api.shortRunning,
            retryOnFailure: true,
            maxRetries: 2,
          }
        );
        routeName = routeResult.data?.name || '';
      }

      // Get driver name - PRODUCTION FIX: Use resilient query
      let driverName = 'Unknown Driver';
      const profileResult = await resilientQuery<{ full_name: string }>(
        async () => {
          const queryResult = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', driverId)
            .single();
          return queryResult;
        },
        {
          timeout: timeoutConfig.api.shortRunning,
          retryOnFailure: true,
          maxRetries: 2,
        }
      );
      if (profileResult.data?.full_name) {
        driverName = profileResult.data.full_name;
      }

      return {
        driver_id: driverId,
        bus_id: busData.id,
        bus_number: busData.bus_number,
        route_id: busData.route_id || '',
        route_name: routeName,
        driver_name: driverName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    };

    // Execute with retry logic
    try {
      const backoffResult = await standardBackoff.execute(async () => {
        try {
          const result = await fetchAssignment();
          if (result === null) {
            // Null result might mean no assignment, which is not a retriable error
            // But we still want to try fallback
            throw new Error('No assignment found via API');
          }
          return result;
        } catch (error) {
          // Only retry if it's a retriable error
          if (isRetriableError(error)) {
            throw error;
          }
          // For non-retriable errors, try fallback immediately
          return await fetchFromSupabase();
        }
      }, (attempt, delay, error) => {
        logger.info(`🔄 Retrying bus assignment fetch (attempt ${attempt})`, 'auth', {
          delay: `${delay}ms`,
          error: error.message
        });
      });

      if (backoffResult.success && backoffResult.result) {
        return backoffResult.result;
      }

      // If retry failed, try Supabase fallback
      logger.info('🔄 API retry failed, trying Supabase fallback', 'auth');
      return await fetchFromSupabase();
    } catch (error) {
      logger.error('❌ Error in getDriverBusAssignment after retries:', 'auth', { error });
      
      // Final fallback to Supabase
      try {
        return await fetchFromSupabase();
      } catch (fallbackError) {
        logger.error('❌ All assignment fetch methods failed', 'auth', { error: fallbackError });
        return null;
      }
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
   * Check if user has valid driver session with race condition protection
   * PRODUCTION FIX: Enhanced concurrency control with proper error handling
   */
  async validateDriverSession(): Promise<{
    isValid: boolean;
    assignment: DriverBusAssignment | null;
    errorCode?: string;
    errorMessage?: string;
  }> {
    // Prevent concurrent validation calls
    if (this.validationInProgress && this.validationPromise) {
      logger.debug('🔄 Validation already in progress, returning existing promise', 'driver-validation');
      try {
        return await this.validationPromise;
      } catch (error) {
        // If existing promise failed, start new validation
        logger.warn('⚠️ Previous validation promise failed, starting new validation', 'driver-validation', { error });
        this.validationInProgress = false;
        this.validationPromise = null;
      }
    }

    // Start new validation with proper promise management
    this.validationInProgress = true;
    this.validationPromise = this.performDriverSessionValidation()
      .then((result) => {
        this.validationInProgress = false;
        this.validationPromise = null;
        return result;
      })
      .catch((error) => {
        // PRODUCTION FIX: Always reset concurrency control on error
        this.validationInProgress = false;
        this.validationPromise = null;
        logger.error('❌ Driver session validation error', 'driver-validation', { error });
        throw error;
      });

    try {
      return await this.validationPromise;
    } catch (error) {
      // PRODUCTION FIX: Return error result instead of throwing
      return {
        isValid: false,
        assignment: null,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Session validation failed'
      };
    }
  }

  /**
   * Internal method that performs the actual driver session validation
   */
  private async performDriverSessionValidation(): Promise<{
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

      // Get driver assignment with improved error handling and single attempt
      let assignment: DriverBusAssignment | null = null;
      
      try {
        assignment = await this.getDriverBusAssignment(this.currentUser.id);
      } catch (assignmentError) {
        logger.error('❌ Error fetching driver assignment', 'driver-validation', { 
          error: String(assignmentError),
          userId: this.currentUser.id
        });
        
        // Try to get from session storage as fallback
        try {
          const cachedAssignment = sessionStorage.getItem(`driver_assignment_${this.currentUser.id}`);
          if (cachedAssignment) {
            const parsed = JSON.parse(cachedAssignment);
            // Check if cache is not too old (5 minutes)
            if (Date.now() - parsed._timestamp < 5 * 60 * 1000) {
              assignment = parsed;
              logger.info('📱 Using cached assignment data', 'driver-validation');
            }
          }
        } catch (cacheError) {
          logger.warn('⚠️ Failed to read cached assignment', 'driver-validation', { error: cacheError });
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
