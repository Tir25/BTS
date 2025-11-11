import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../config/supabase';
import { timeoutConfig } from '../config/timeoutConfig';
import { logger } from '../utils/logger';
import { tokenStorage } from './auth/tokenStorage';
import { sessionHelpers } from './auth/sessionHelpers';
import { profileHelpers } from './auth/profileHelpers';
import { assignmentHelpers, DriverBusAssignment } from './auth/assignmentHelpers';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

// DriverBusAssignment interface moved to assignmentHelpers.ts
export type { DriverBusAssignment } from './auth/assignmentHelpers';

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

  // Cleanup method
  public cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    
    // Stop proactive session refresh
    sessionHelpers.stopProactiveRefresh();
    
    // PRODUCTION FIX: Clear token cache on cleanup
    tokenStorage.clearCache();
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
        sessionHelpers.startProactiveRefresh(
          this.currentSession,
          (session, user) => {
            this.currentSession = session;
            this.currentUser = user || null;
            if (this.authStateChangeListener) {
              this.authStateChangeListener();
            }
          }
        );
      }

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.info(`🔄 Auth state changed: ${event} for user: ${session?.user?.email || 'none'}`, 'auth');

        this.currentSession = session;
        this.currentUser = session?.user || null;

        // PRODUCTION FIX: Clear token cache on session change
        tokenStorage.clearCache();

        if (session) {
          logger.debug(
            `🔑 Auth state change - Session access token: ${session.access_token ? 'Exists' : 'Missing'}`,
            'auth'
          );
        }

        if (session?.user) {
          await this.loadUserProfile(session.user.id);
          // Start proactive session refresh if we have a session
          sessionHelpers.startProactiveRefresh(
            this.currentSession,
            (updatedSession, updatedUser) => {
              this.currentSession = updatedSession;
              this.currentUser = updatedUser || null;
              if (this.authStateChangeListener) {
                this.authStateChangeListener();
              }
            }
          );
        } else {
          this.currentProfile = null;
          // Stop proactive session refresh if no session
          sessionHelpers.stopProactiveRefresh();
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

  /**
   * Load user profile - PRODUCTION FIX: Always ensures profile is set
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      // Try cached profile first
      const cachedProfile = profileHelpers.tryLoadCachedProfile(userId);
      if (cachedProfile) {
        this.currentProfile = cachedProfile;
        return;
      }

      // PRODUCTION FIX: loadUserProfile now always returns a profile (never null)
      const profile = await profileHelpers.loadUserProfile(userId, this.currentUser);
      this.currentProfile = profile;
      
      // PRODUCTION FIX: Cache the profile for faster future loads
      try {
        localStorage.setItem(`profile_${userId}`, JSON.stringify({
          ...profile,
          _timestamp: Date.now()
        }));
      } catch (cacheError) {
        // Ignore cache errors
      }
    } catch (error) {
      logger.error('❌ Error in loadUserProfile', 'auth', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      
      // PRODUCTION FIX: Last resort - create minimal profile
      if (!this.currentProfile && this.currentUser) {
        this.currentProfile = {
          id: userId,
          email: this.currentUser.email || '',
          role: (this.currentUser.user_metadata?.role as string) || 'student',
          full_name: this.currentUser.user_metadata?.full_name || this.currentUser.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }
  }

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
      tokenStorage.clearCache();

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
          tokenStorage.clearCache();
          return { 
            success: false, 
            error: 'Login is taking longer than expected. Please check your internet connection and try again.'
          };
        }
        throw raceError;
      }

      if (result.error) {
        logger.error('❌ Sign in error:', 'auth', { 
          error: result.error.message || String(result.error),
          errorCode: (result.error as any).status || (result.error as any).code
        });
        
        // PRODUCTION FIX: Clear token cache on authentication failure
        tokenStorage.clearCache();
        
        // PRODUCTION FIX: Stop authentication state to prevent retry loops
        this._isAuthenticating = false;
        
        // Check for invalid credentials specifically
        const errorMessage = result.error.message || String(result.error);
        if (errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('invalid_credentials') ||
            errorMessage.includes('400')) {
          logger.warn('⚠️ Invalid credentials detected - stopping authentication', 'auth', { email });
          return { 
            success: false, 
            error: 'Invalid email or password. Please check your credentials and try again.'
          };
        }
        
        return { 
          success: false, 
          error: this.getFormattedAuthError(result.error)
        };
      }

      if (!result.data) {
        logger.error('❌ No data received from authentication', 'auth');
        // PRODUCTION FIX: Clear token cache on authentication failure
        tokenStorage.clearCache();
        return { success: false, error: 'No authentication data received' };
      }

      const { data } = result;
      logger.info('✅ Supabase authentication successful', 'auth');

      if (data.user && data.session) {
        logger.info(`👤 User data received: ${data.user.email}`, 'auth');
        
        // OPTIMIZATION: Set current user and session immediately for faster perceived performance
        this.currentUser = data.user;
        this.currentSession = data.session;

        // PRODUCTION FIX: Ensure profile is ALWAYS loaded before returning
        // This guarantees authentication works on first try
        logger.info('📋 Loading user profile...', 'auth');
        
        try {
          // PRODUCTION FIX: Check cached profile first (fast path)
          const cachedProfile = profileHelpers.tryLoadCachedProfile(data.user.id);
          if (cachedProfile) {
            this.currentProfile = cachedProfile;
            logger.info('✅ Using cached profile', 'auth', { role: cachedProfile.role });
          } else {
            // PRODUCTION FIX: Load profile from database with timeout
            const profileTimeout = timeoutConfig.api.shortRunning || 5000; // 5 seconds for profile load
            const profilePromise = this.loadUserProfile(data.user.id);
            const timeoutPromise = new Promise<void>((_, reject) => {
              setTimeout(() => reject(new Error('Profile loading timeout')), profileTimeout);
            });

            try {
              await Promise.race([profilePromise, timeoutPromise]);
              
              // PRODUCTION FIX: Verify profile was actually loaded
              if (!this.currentProfile) {
                throw new Error('Profile not loaded after successful promise');
              }
              
              logger.info(`✅ Profile loaded from database: ${this.currentProfile.role}`, 'auth');
            } catch (timeoutError) {
              logger.warn('⚠️ Profile loading timed out, creating temporary profile', 'auth', { 
                error: timeoutError instanceof Error ? timeoutError.message : String(timeoutError) 
              });

              // PRODUCTION FIX: Always ensure we have a profile, even if temporary
              // loadUserProfile now always returns a profile (never null)
              if (!this.currentProfile) {
                this.currentProfile = await profileHelpers.loadUserProfile(data.user.id, data.user);
                logger.info('✅ Created temporary profile', 'auth', { role: this.currentProfile.role });
              }
            }
          }
          
          // PRODUCTION FIX: Final verification - ensure profile exists
          if (!this.currentProfile) {
            logger.error('❌ CRITICAL: No profile after all attempts', 'auth');
            throw new Error('Failed to load or create user profile');
          }
          
          logger.info(`✅ Profile ready: ${this.currentProfile.role}`, 'auth', {
            userId: this.currentProfile.id,
            email: this.currentProfile.email
          });
        } catch (profileError) {
          logger.error('❌ Critical error in profile loading', 'auth', { 
            error: profileError instanceof Error ? profileError.message : String(profileError) 
          });
          
          // PRODUCTION FIX: Last resort - create minimal profile to prevent auth failure
          if (!this.currentProfile && data.user) {
            this.currentProfile = {
              id: data.user.id,
              email: data.user.email || email,
              role: (data.user.user_metadata?.role as string) || 'student',
              full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            logger.warn('⚠️ Created emergency minimal profile', 'auth', { 
              role: this.currentProfile.role 
            });
          }
          
          // If we still don't have a profile, authentication must fail
          if (!this.currentProfile) {
            this._isAuthenticating = false;
            return { 
              success: false, 
              error: 'Failed to load user profile. Please try again or contact support.' 
            };
          }
        } finally {
          // PRODUCTION FIX: Reset authentication state
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

        // PRODUCTION FIX: Guarantee profile exists before returning
        if (!this.currentProfile) {
          logger.error('❌ CRITICAL: Profile missing after sign-in', 'auth');
          return { 
            success: false, 
            error: 'Authentication succeeded but profile loading failed. Please try again.' 
          };
        }
        
        return {
          success: true,
          user: this.currentProfile,
        };
      }

      logger.error('❌ No user or session data received', 'auth');
      // PRODUCTION FIX: Clear token cache on authentication failure
      tokenStorage.clearCache();
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      logger.error('❌ Sign in error:', 'auth', { error: String(error) });
      
      // PRODUCTION FIX: Clear token cache on any authentication error
      tokenStorage.clearCache();
      
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
      sessionHelpers.stopProactiveRefresh();

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
      tokenStorage.clearCache();

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

  // Get access token with proper caching
  getAccessToken(): string | null {
    // Check if cached token is still valid
    const cachedToken = tokenStorage.getCachedToken();
    if (cachedToken) {
      return cachedToken;
    }

    // Get token from current session
    const token = this.currentSession?.access_token || null;
    
    if (token && this.currentSession?.expires_at) {
      // Cache the token with expiration
      tokenStorage.cacheToken(token, this.currentSession.expires_at);
    } else {
      // Clear cache if no valid token
      tokenStorage.clearCache();
    }
    
    return token;
  }

  // Enhanced token validation with race condition protection
  async validateTokenForAPI(): Promise<{
    valid: boolean;
    token: string | null;
    refreshed: boolean;
  }> {
    return await sessionHelpers.validateTokenForAPI(this.currentSession);
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
    return await assignmentHelpers.getDriverBusAssignment(driverId, this.currentSession);
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

      // PRODUCTION FIX: If profile not loaded, try to load it now
      if (!this.currentProfile) {
        logger.warn('⚠️ Profile not loaded, attempting to load now', 'driver-validation', {
          userId: this.currentUser.id
        });
        try {
          await this.loadUserProfile(this.currentUser.id);
          // Double-check after loading
          if (!this.currentProfile) {
            logger.error('❌ Driver session validation failed: Profile could not be loaded', 'driver-validation');
            return { 
              isValid: false, 
              assignment: null,
              errorCode: 'NO_PROFILE',
              errorMessage: 'Unable to load your driver profile. Please try logging in again.'
            };
          }
        } catch (profileLoadError) {
          logger.error('❌ Failed to load profile during validation', 'driver-validation', {
            error: profileLoadError instanceof Error ? profileLoadError.message : String(profileLoadError)
          });
          return { 
            isValid: false, 
            assignment: null,
            errorCode: 'PROFILE_LOAD_FAILED',
            errorMessage: 'Unable to load your driver profile. Please try logging in again.'
          };
        }
      }

      // Check if user is a driver with improved error message and recovery mechanism
      if (this.currentProfile?.role !== 'driver') {
        logger.warn(`❌ User is not a driver: ${this.currentProfile?.role || 'unknown role'}`, 'driver-validation', {
          profileCreatedAt: this.currentProfile?.created_at,
          profileUpdatedAt: this.currentProfile?.updated_at
        });
        
        // PRODUCTION FIX: If we have a temporary profile, try to reload the actual profile from database
        const isTemporaryProfile = this.currentProfile?.created_at === this.currentProfile?.updated_at &&
                                  new Date(this.currentProfile.created_at).getTime() > Date.now() - 60000; // Created within last minute
        
        if (isTemporaryProfile && this.currentUser?.id) {
          logger.info('🔄 Detected temporary profile, attempting to reload actual profile from database', 'driver-validation');
          
          try {
            // Attempt to reload the actual profile
            await this.loadUserProfile(this.currentUser.id);
            
            // Check again after reload
            if (this.currentProfile?.role === 'driver') {
              logger.info('✅ Profile reload successful - user is actually a driver', 'driver-validation', {
                newRole: this.currentProfile.role
              });
              // Continue with validation - don't return here
            } else {
              logger.warn('❌ Profile reload confirmed user is not a driver', 'driver-validation', {
                reloadedRole: this.currentProfile?.role
              });
              return { 
                isValid: false, 
                assignment: null,
                errorCode: 'NOT_A_DRIVER',
                errorMessage: 'You do not have driver privileges. Please contact your administrator if you believe this is an error.'
              };
            }
          } catch (reloadError) {
            logger.error('❌ Failed to reload profile during driver validation', 'driver-validation', {
              error: reloadError instanceof Error ? reloadError.message : String(reloadError)
            });
            
            return { 
              isValid: false, 
              assignment: null,
              errorCode: 'PROFILE_RELOAD_FAILED',
              errorMessage: 'Unable to verify your driver status. Please try logging in again.'
            };
          }
        } else {
          // Not a temporary profile, user is genuinely not a driver
          return { 
            isValid: false, 
            assignment: null,
            errorCode: 'NOT_A_DRIVER',
            errorMessage: 'You do not have driver privileges. Please contact your administrator if you believe this is an error.'
          };
        }
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
        
        // Try to get from cache as fallback
        assignment = assignmentHelpers.getCachedAssignment(this.currentUser.id);
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

      // Store the assignment in memory and cache
      this.currentDriverAssignment = assignment;
      assignmentHelpers.cacheAssignment(this.currentUser.id, assignment);
      
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
