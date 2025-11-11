/**
 * Student Authentication Service
 * Handles student authentication using student-specific Supabase client
 */

import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../../types';
import { getStudentSupabaseClient } from '../../config/supabase';
import { timeoutConfig } from '../../config/timeoutConfig';
import { logger } from '../../utils/logger';
import { apiService } from '../../api/api';
import { tokenStorage } from './tokenStorage';
import { sessionHelpers } from './sessionHelpers';
import { profileHelpers } from './profileHelpers';

export interface StudentAuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

class StudentAuthService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private currentProfile: UserProfile | null = null;
  private authStateChangeListener: (() => void) | null = null;
  private authSubscription: any = null;
  private _isInitialized: boolean = false;
  private _isAuthenticating: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const studentSupabase = getStudentSupabaseClient();
      
      // Get initial session
      const {
        data: { session },
        error,
      } = await studentSupabase.auth.getSession();

      if (error) {
        logger.error('❌ Error getting student session', 'student-auth', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        this._isInitialized = true;
        return;
      }

      if (session) {
        logger.info(`🔑 Setting initial student session for user: ${session.user.email}`, 'student-auth');
        this.currentSession = session;
        this.currentUser = session.user;
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
      } = studentSupabase.auth.onAuthStateChange(async (event, session) => {
        logger.info(`🔄 Student auth state changed: ${event} for user: ${session?.user?.email || 'none'}`, 'student-auth');

        this.currentSession = session;
        this.currentUser = session?.user || null;

        // Clear token cache on session change
        tokenStorage.clearCache();

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
      logger.info('✅ Student auth service initialized', 'student-auth');

      // Store subscription for cleanup
      this.authSubscription = subscription;
    } catch (error) {
      logger.error('❌ Error initializing student auth', 'student-auth', { error: String(error) });
      this._isInitialized = true;
    }
  }

  /**
   * Load user profile
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      // Try cached profile first
      const cachedProfile = profileHelpers.tryLoadCachedProfile(userId);
      if (cachedProfile) {
        this.currentProfile = cachedProfile;
        return;
      }

      // Load profile from database
      const profile = await profileHelpers.loadUserProfile(userId, this.currentUser);
      this.currentProfile = profile;
      
      // Cache the profile
      try {
        localStorage.setItem(`student_profile_${userId}`, JSON.stringify({
          ...profile,
          _timestamp: Date.now()
        }));
      } catch (cacheError) {
        // Ignore cache errors
      }
    } catch (error) {
      logger.error('❌ Error in loadUserProfile', 'student-auth', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      
      // Create minimal profile as fallback
      if (!this.currentProfile && this.currentUser) {
        this.currentProfile = {
          id: userId,
          email: this.currentUser.email || '',
          role: (this.currentUser.user_metadata?.role as string) || 'student',
          full_name: this.currentUser.user_metadata?.full_name || this.currentUser.email?.split('@')[0] || 'Student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Sign in with email and password
   * Uses backend API for authentication
   */
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    // Prevent concurrent sign-in attempts
    if (this._isAuthenticating) {
      logger.warn('⚠️ Student sign-in already in progress, rejecting concurrent attempt', 'student-auth');
      return { success: false, error: 'Sign-in already in progress. Please wait.' };
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;

    try {
      logger.info(`🔐 Starting student sign in process for: ${email}`, 'student-auth');

      // Clear token cache before starting new authentication
      tokenStorage.clearCache();

      this._isAuthenticating = true;

      // Call backend student login API
      const loginPromise = apiService.studentLogin(email, password);
      
      // Timeout handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error(`Authentication timeout after ${timeoutConfig.auth.signIn / 1000}s`));
          }
        }, timeoutConfig.auth.signIn);
      });

      let result: { success: boolean; data?: any; error?: string };
      
      try {
        const raceResult = await Promise.race([
          loginPromise.then((res) => {
            if (!isResolved) {
              isResolved = true;
              if (timeoutId) clearTimeout(timeoutId);
              return res;
            }
            throw new Error('Authentication cancelled');
          }),
          timeoutPromise,
        ]);
        
        result = raceResult;
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          logger.error('❌ Student authentication timeout', 'student-auth', { error: raceError.message });
          tokenStorage.clearCache();
          return { 
            success: false, 
            error: 'Login is taking longer than expected. Please check your internet connection and try again.'
          };
        }
        throw raceError;
      }

      if (!result.success || !result.data) {
        logger.error('❌ Student sign in failed', 'student-auth', { error: result.error });
        tokenStorage.clearCache();
        return { 
          success: false, 
          error: result.error || 'Login failed'
        };
      }

      const { user, session } = result.data;
      logger.info('✅ Student authentication successful', 'student-auth');

      // Set session in student Supabase client
      const studentSupabase = getStudentSupabaseClient();
      const { error: setSessionError } = await studentSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (setSessionError) {
        logger.error('❌ Failed to set student session', 'student-auth', { error: setSessionError.message });
        // Continue anyway - we have the session data
      }

      // Get current session from Supabase
      const { data: { session: currentSession }, error: sessionError } = await studentSupabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        logger.error('❌ Failed to get student session after login', 'student-auth', { error: sessionError?.message });
        // Create session object from API response
        this.currentSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: Math.floor((session.expires_at * 1000 - Date.now()) / 1000),
          token_type: 'bearer',
          user: {
            id: user.id,
            email: user.email,
            aud: 'authenticated',
            role: 'authenticated',
            email_confirmed_at: user.email_verified ? new Date().toISOString() : null,
            phone: null,
            confirmed_at: user.email_verified ? new Date().toISOString() : null,
            last_sign_in_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {
              role: user.role,
              full_name: user.full_name,
            },
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        } as Session;
      } else {
        this.currentSession = currentSession;
      }

      this.currentUser = this.currentSession.user;

      // Load user profile
      await this.loadUserProfile(user.id);

      // Verify profile was loaded
      if (!this.currentProfile) {
        logger.error('❌ CRITICAL: No profile after student login', 'student-auth');
        // Create profile from API response
        this.currentProfile = {
          id: user.id,
          email: user.email,
          role: user.role as 'student',
          full_name: user.full_name,
          is_active: user.is_active,
          email_verified: user.email_verified,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // Notify listeners
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }

      return {
        success: true,
        user: this.currentProfile,
      };
    } catch (error) {
      logger.error('❌ Student sign in error:', 'student-auth', { error: String(error) });
      
      tokenStorage.clearCache();
      this._isAuthenticating = false;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
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
      }
      
      return { success: false, error: 'An error occurred during sign in. Please try again.' };
    } finally {
      this._isAuthenticating = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('🔐 Starting student sign out process...', 'student-auth');

      // Stop proactive session refresh
      sessionHelpers.stopProactiveRefresh();

      // Sign out from Supabase
      const studentSupabase = getStudentSupabaseClient();
      const { error } = await studentSupabase.auth.signOut();

      if (error) {
        logger.error('❌ Student sign out error:', 'student-auth', { error: error.message });
      } else {
        logger.info('✅ Student Supabase sign out completed', 'student-auth');
      }

      // Clear all auth state
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;

      // Clear token cache
      tokenStorage.clearCache();

      // Clear student-specific localStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('student') || key.includes('sb-') && key.includes('student'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            logger.debug(`🗑️ Removed localStorage key: ${key}`, 'student-auth');
          } catch (e) {
            logger.warn(`⚠️ Failed to remove localStorage key: ${key}`, 'student-auth', { error: e });
          }
        });
        
        logger.info('✅ All student authentication data cleared from storage', 'student-auth');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing storage during student sign out', 'student-auth', { error: storageError });
      }

      // Notify listeners
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }

      logger.info('✅ Student sign out process completed successfully', 'student-auth');
      return { success: true };
    } catch (error) {
      logger.error('❌ Student sign out error:', 'student-auth', { error: String(error) });
      // Even on error, clear the state
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      tokenStorage.clearCache();
      
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }
      
      return { success: false, error: 'Network error during sign out' };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get current user profile
   */
  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Check if auth service is initialized
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.currentSession;
  }

  /**
   * Check if user is a student
   */
  isStudent(): boolean {
    return this.currentProfile?.role === 'student';
  }

  /**
   * Get access token
   */
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

  /**
   * Validate token for API
   */
  async validateTokenForAPI(): Promise<{
    valid: boolean;
    token: string | null;
    refreshed: boolean;
  }> {
    return await sessionHelpers.validateTokenForAPI(this.currentSession);
  }

  /**
   * Set auth state change listener
   */
  onAuthStateChange(listener: () => void): void {
    this.authStateChangeListener = listener;
  }

  /**
   * Remove auth state change listener
   */
  removeAuthStateChangeListener(): void {
    this.authStateChangeListener = null;
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    
    // Stop proactive session refresh
    sessionHelpers.stopProactiveRefresh();
    
    // Clear token cache on cleanup
    tokenStorage.clearCache();
  }

  /**
   * Debug method to get current auth state
   */
  getAuthState() {
    return {
      initialized: this._isInitialized,
      user: this.currentUser,
      session: this.currentSession,
      profile: this.currentProfile,
      isAuthenticated: this.isAuthenticated(),
      isStudent: this.isStudent(),
    };
  }
}

// Export singleton instance
export const studentAuthService = new StudentAuthService();
export default studentAuthService;

