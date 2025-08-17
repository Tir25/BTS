import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../config/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

class AuthService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private currentProfile: UserProfile | null = null;
  private authStateChangeListener: (() => void) | null = null;
  private _isInitialized: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Get initial session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Error getting session:', error);
        this._isInitialized = true;
        return;
      }

      if (session) {
        this.currentSession = session;
        this.currentUser = session.user;
        await this.loadUserProfile(session.user.id);
      }

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);

        this.currentSession = session;
        this.currentUser = session?.user || null;

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
      console.log('✅ Auth service initialized');

      // Cleanup subscription on unmount
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      this._isInitialized = true;
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      console.log('🔍 Attempting to load profile for user:', userId);

      // Simple profile loading without connection test
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error loading user profile:', error);
        // Set temporary profile immediately
        this.setTemporaryProfile(userId);
        return;
      }

      console.log('✅ Profile loaded successfully:', profile.role);
      this.currentProfile = {
        id: profile.id,
        email: this.currentUser?.email || '',
        role: profile.role,
        full_name: profile.full_name,
        first_name: profile.full_name?.split(' ')[0] || '',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
      // Set temporary profile on any error
      this.setTemporaryProfile(userId);
    }
  }

  private setTemporaryProfile(userId: string): void {
    console.log('🔄 Setting temporary profile for admin login');
    this.currentProfile = {
      id: userId,
      email: this.currentUser?.email || '',
      role: 'admin', // Assume admin for login purposes
      full_name:
        this.currentUser?.user_metadata?.full_name ||
        this.currentUser?.email?.split('@')[0] ||
        'Admin User',
      first_name:
        this.currentUser?.user_metadata?.full_name?.split(' ')[0] ||
        this.currentUser?.email?.split('@')[0] ||
        'Admin',
      last_name:
        this.currentUser?.user_metadata?.full_name
          ?.split(' ')
          .slice(1)
          .join(' ') || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // private async createDefaultProfile(userId: string): Promise<void> {
  //   try {
  //     const { data: profile, error } = await supabase
  //       .from('profiles')
  //       .insert({
  //         id: userId,
  //         full_name:
  //           this.currentUser?.user_metadata?.full_name || 'Unknown User',
  //         role: 'admin', // Changed to admin for admin login
  //       })
  //       .select()
  //       .single();

  //     if (error) {
  //       console.error('❌ Error creating default profile:', error);
  //       return;
  //     }

  //     this.currentProfile = {
  //       id: profile.id,
  //       email: this.currentUser?.email || '',
  //       role: profile.role,
  //       full_name: profile.full_name,
  //       first_name: profile.full_name?.split(' ')[0] || '',
  //       last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
  //       created_at: profile.created_at,
  //       updated_at: profile.updated_at,
  //     };
  //   } catch (error) {
  //     console.error('❌ Error in createDefaultProfile:', error);
  //   }
  // }

  // Sign in with email and password
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    try {
      console.log('🔐 Starting sign in process for:', email);

      // Direct authentication without connection test
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Supabase authentication successful');

      if (data.user && data.session) {
        console.log('👤 User data received:', data.user.email);
        this.currentUser = data.user;
        this.currentSession = data.session;

        console.log('📋 Loading user profile...');
        try {
          // Add timeout to profile loading
          const profilePromise = this.loadUserProfile(data.user.id);
          const profileTimeout = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error('Profile loading timeout')),
              3000
            );
          });

          await Promise.race([profilePromise, profileTimeout]);
          console.log('✅ Profile loaded:', this.currentProfile?.role);
        } catch (profileError) {
          console.warn(
            '⚠️ Profile loading failed, using temporary profile:',
            profileError
          );
          this.setTemporaryProfile(data.user.id);
        }

        // Notify listeners immediately after successful sign in
        if (this.authStateChangeListener) {
          this.authStateChangeListener();
        }

        return {
          success: true,
          user: this.currentProfile || undefined,
        };
      }

      console.error('❌ No user or session data received');
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      if (error instanceof Error && error.message.includes('NetworkError')) {
        return {
          success: false,
          error:
            'Network connection error. Please check your internet connection and try again.',
        };
      }
      return { success: false, error: 'Network error during sign in' };
    }
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
        // Create profile in profiles table
        const { error: profileError } = await supabase.from('profiles').insert({
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

  // Get access token for API calls
  getAccessToken(): string | null {
    return this.currentSession?.access_token || null;
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
          console.log('🔄 No session to refresh (expected for unauthenticated users)');
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
        .from('profiles')
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
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
