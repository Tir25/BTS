import { createClient, User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

      // Cleanup subscription on unmount
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
    }
  }

  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error loading user profile:', error);
        // Create default profile if it doesn't exist
        await this.createDefaultProfile(userId);
        return;
      }

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
    }
  }

  private async createDefaultProfile(userId: string): Promise<void> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name:
            this.currentUser?.user_metadata?.full_name || 'Unknown User',
          role: 'student', // Default role
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating default profile:', error);
        return;
      }

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
      console.error('❌ Error in createDefaultProfile:', error);
    }
  }

  // Sign in with email and password
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        this.currentUser = data.user;
        this.currentSession = data.session;
        await this.loadUserProfile(data.user.id);

        return {
          success: true,
          user: this.currentProfile || undefined,
        };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('❌ Sign in error:', error);
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
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        return { success: false, error: error.message };
      }

      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;

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
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
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

  // Get Supabase client (for direct access if needed)
  getSupabaseClient() {
    return supabase;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
