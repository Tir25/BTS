/**
 * Admin Authentication Service
 * Role-specific auth service for admin users using admin Supabase client
 */

import { User, Session } from '@supabase/supabase-js';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import { UserProfile } from '../../types';
import { getAdminSupabaseClient } from '../../config/supabase';
import { timeoutConfig } from '../../config/timeoutConfig';
import { logger } from '../../utils/logger';
import { tokenStorage } from './tokenStorage';
import { sessionHelpers } from './sessionHelpers';
import { profileHelpers } from './profileHelpers';

const normalizeRole = (value: unknown): 'student' | 'driver' | 'admin' => {
  return value === 'driver' || value === 'admin' ? value : 'student';
};

export interface AdminAuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

class AdminAuthService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private currentProfile: UserProfile | null = null;
  private authStateChangeListener: (() => void) | null = null;
  private authSubscription: any = null;
  private _isInitialized: boolean = false;
  private _isAuthenticating: boolean = false;

  private get supabase() {
    return getAdminSupabaseClient();
  }

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error) {
        logger.error('❌ Error getting admin session', 'admin-auth', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        this._isInitialized = true;
        return;
      }

      if (session) {
        logger.info(`🔑 Setting initial admin session for user: ${session.user.email}`, 'admin-auth');
        this.currentSession = session;
        this.currentUser = session.user;
        await this.loadUserProfile(session.user.id);
        
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
      } = this.supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        logger.info(`🔄 Admin auth state changed: ${event}`, 'admin-auth', {
          user: session?.user?.email || 'none'
        });

        this.currentSession = session;
        this.currentUser = session?.user || null;
        tokenStorage.clearCache();

        if (session?.user) {
          this.loadUserProfile(session.user.id).catch(error => {
            logger.warn('⚠️ Admin profile loading failed (non-blocking)', 'admin-auth', {
              error: error instanceof Error ? error.message : String(error),
              userId: session.user.id
            });
          });
        } else {
          this.currentProfile = null;
        }

        if (this.authStateChangeListener) {
          this.authStateChangeListener();
        }
      });

      this.authSubscription = subscription;
      this._isInitialized = true;
    } catch (error) {
      logger.error('❌ Error initializing admin auth', 'admin-auth', { error });
      this._isInitialized = true;
    }
  }

  private async loadUserProfile(userId: string, forceFresh: boolean = false): Promise<void> {
    try {
      if (forceFresh) {
        try {
          localStorage.removeItem(`profile_${userId}`);
        } catch {
          logger.debug('⚠️ Could not clear profile cache (non-critical)', 'admin-auth');
        }
      } else {
        const cachedProfile = profileHelpers.tryLoadCachedProfile(userId);
        if (cachedProfile) {
          this.currentProfile = cachedProfile;
          logger.debug('✅ Using cached admin profile', 'admin-auth', { userId, role: cachedProfile.role });
          return;
        }
      }

      const profile = await profileHelpers.loadUserProfile(userId, this.currentUser, this.supabase);
      this.currentProfile = profile;
      
      logger.debug('✅ Admin profile loaded from database', 'admin-auth', {
        userId,
        role: profile.role,
        email: profile.email
      });
      
      try {
        localStorage.setItem(`profile_${userId}`, JSON.stringify({
          ...profile,
          _timestamp: Date.now()
        }));
      } catch (cacheError) {
        // Ignore cache errors
      }
    } catch (error) {
      logger.error('❌ Error in loadAdminProfile', 'admin-auth', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      
      if (!this.currentProfile && this.currentUser) {
        this.currentProfile = {
          id: userId,
          email: this.currentUser.email || '',
          role: normalizeRole(this.currentUser.user_metadata?.role),
          full_name: this.currentUser.user_metadata?.full_name || this.currentUser.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    if (this._isAuthenticating) {
      logger.warn('⚠️ Admin sign-in already in progress', 'admin-auth');
      return { success: false, error: 'Sign-in already in progress. Please wait.' };
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;

    try {
      logger.info(`🔐 Starting admin sign in for: ${email}`, 'admin-auth');
      tokenStorage.clearCache();

      const authPromise = this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error(`Authentication timeout after ${timeoutConfig.auth.signIn / 1000}s`));
          }
        }, timeoutConfig.auth.signIn);
      });

      this._isAuthenticating = true;

      let result: { data?: { user?: User; session?: Session }; error?: Error };
      
      try {
        const raceResult = await Promise.race([
          authPromise.then((res: Awaited<typeof authPromise>) => {
            if (!isResolved) {
              isResolved = true;
              if (timeoutId) clearTimeout(timeoutId);
              return res;
            }
            throw new Error('Authentication cancelled');
          }),
          timeoutPromise,
        ]);
        
        result = {
          data: raceResult.data ? {
            user: raceResult.data.user || undefined,
            session: raceResult.data.session || undefined
          } : undefined,
          error: raceResult.error ? new Error(raceResult.error.message) : undefined
        };
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          logger.error('❌ Admin authentication timeout', 'admin-auth', { error: raceError.message });
          tokenStorage.clearCache();
          return { 
            success: false, 
            error: 'Login is taking longer than expected. Please check your internet connection and try again.'
          };
        }
        throw raceError;
      }

      if (result.error) {
        logger.error('❌ Admin sign in error:', 'admin-auth', { error: result.error });
        tokenStorage.clearCache();
        return { 
          success: false, 
          error: this.getFormattedAuthError(result.error)
        };
      }

      if (!result.data) {
        logger.error('❌ No data received from admin authentication', 'admin-auth');
        tokenStorage.clearCache();
        return { success: false, error: 'No authentication data received' };
      }

      const { data } = result;
      logger.info('✅ Admin Supabase authentication successful', 'admin-auth');

      if (!data.user || !data.session) {
        logger.error('❌ Missing user or session in admin auth response', 'admin-auth');
        tokenStorage.clearCache();
        return { success: false, error: 'Invalid authentication response' };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;

      await this.loadUserProfile(data.user.id);

      if (!this.currentProfile) {
        logger.error('❌ Failed to load admin profile after sign in', 'admin-auth');
        tokenStorage.clearCache();
        return { success: false, error: 'Failed to load user profile' };
      }

      // Verify admin role
      if (this.currentProfile.role !== 'admin') {
        logger.warn('⚠️ Non-admin user attempted admin login', 'admin-auth', {
          email,
          role: this.currentProfile.role
        });
        await this.signOut();
        return { 
          success: false, 
          error: `Access denied. Admin privileges required. Your current role is: ${this.currentProfile.role}` 
        };
      }

      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }

      logger.info('✅ Admin sign in completed successfully', 'admin-auth', {
        email,
        userId: data.user.id
      });

      return {
        success: true,
        user: this.currentProfile,
      };
    } catch (error) {
      logger.error('❌ Admin sign in error:', 'admin-auth', { error });
      tokenStorage.clearCache();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred during login'
      };
    } finally {
      this._isAuthenticating = false;
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('🔐 Starting admin sign out process...', 'admin-auth');

      sessionHelpers.stopProactiveRefresh();

      const { error } = await this.supabase.auth.signOut();

      if (error) {
        logger.error('❌ Admin sign out error:', 'admin-auth', { error: error.message });
      }

      logger.info('✅ Admin Supabase sign out completed', 'admin-auth');

      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;

      tokenStorage.clearCache();

      // Clear admin-specific storage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-') || key.includes('profile_'))) {
            // Check if it's admin-specific
            if (key.includes('admin') || key.includes('sb-') && !key.includes('driver') && !key.includes('student')) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            logger.debug(`🗑️ Removed admin localStorage key: ${key}`, 'admin-auth');
          } catch (e) {
            logger.warn(`⚠️ Failed to remove localStorage key: ${key}`, 'admin-auth', { error: e });
          }
        });
        
        logger.info('✅ All admin authentication data cleared from storage', 'admin-auth');
      } catch (storageError) {
        logger.warn('⚠️ Error clearing admin storage during sign out', 'admin-auth', { error: storageError });
      }

      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }

      logger.info('✅ Admin sign out process completed successfully', 'admin-auth');
      return { success: true };
    } catch (error) {
      logger.error('❌ Admin sign out error:', 'admin-auth', { error: String(error) });
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      this.clearTokenCache();
      
      if (this.authStateChangeListener) {
        this.authStateChangeListener();
      }
      
      return { success: false, error: 'Network error during sign out' };
    }
  }

  private clearTokenCache(): void {
    tokenStorage.clearCache();
  }

  private getFormattedAuthError(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please verify your email address before signing in.';
    }
    if (message.includes('too many requests')) {
      return 'Too many login attempts. Please wait a moment and try again.';
    }
    return error.message || 'An error occurred during login. Please try again.';
  }

  async recoverSession(): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error || !session) {
        return { success: false, error: 'No active session found' };
      }

      this.currentSession = session;
      this.currentUser = session.user;
      await this.loadUserProfile(session.user.id);

      if (!this.currentProfile || this.currentProfile.role !== 'admin') {
        return { success: false, error: 'User is not an admin' };
      }

      return {
        success: true,
        user: this.currentProfile,
      };
    } catch (error) {
      logger.error('❌ Error recovering admin session', 'admin-auth', { error });
      return { success: false, error: 'Failed to recover session' };
    }
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  isAdmin(): boolean {
    return this.currentProfile?.role === 'admin';
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  getAccessToken(): string | null {
    return this.currentSession?.access_token || null;
  }

  isAuthenticated(): boolean {
    return !!this.currentSession && !!this.currentUser;
  }

  async refreshSession(): Promise<{ success: boolean; session?: Session; error?: string }> {
    if (!this.currentSession) {
      return { success: false, error: 'No session to refresh' };
    }

    try {
      const { data, error } = await this.supabase.auth.refreshSession(this.currentSession);
      
      if (error) {
        logger.error('❌ Admin session refresh error', 'admin-auth', { error: error.message });
        return { success: false, error: error.message };
      }

      if (data.session) {
        this.currentSession = data.session;
        this.currentUser = data.user || null;
        tokenStorage.clearCache();
        logger.info('✅ Admin session refreshed successfully', 'admin-auth');
        return { success: true, session: data.session };
      }

      return { success: false, error: 'Session refresh failed' };
    } catch (error) {
      logger.error('❌ Admin session refresh error', 'admin-auth', { error: String(error) });
      return { success: false, error: 'Network error during session refresh' };
    }
  }

  getAuthState(): AdminAuthState {
    return {
      user: this.currentUser,
      session: this.currentSession,
      profile: this.currentProfile,
      loading: !this._isInitialized,
    };
  }

  onAuthStateChange(listener: () => void): () => void {
    this.authStateChangeListener = listener;
    return () => {
      this.authStateChangeListener = null;
    };
  }

  cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    
    sessionHelpers.stopProactiveRefresh();
    tokenStorage.clearCache();
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();

