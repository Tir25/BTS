import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase } from '../config/supabase';

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
        console.log('🔑 Setting initial session for user:', session.user.email);
        this.currentSession = session;
        this.currentUser = session.user;
        console.log(
          '🔑 Session access token:',
          session.access_token ? 'Exists' : 'Missing'
        );
        await this.loadUserProfile(session.user.id);
      }

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);

        this.currentSession = session;
        this.currentUser = session?.user || null;

        if (session) {
          console.log(
            '🔑 Auth state change - Session access token:',
            session.access_token ? 'Exists' : 'Missing'
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
          .from('profiles')
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
        .from('profiles')
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
      ) || [];

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

  private setTemporaryProfileWithRoleCheck(
    userId: string,
    user: { email?: string; user_metadata?: { full_name?: string } } | null
  ): void {
    if (!user) return;
    console.log('🔄 Setting temporary profile with role check for user login');

    // Check if this is a known admin user - use environment variable
    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(
      (email: string) => email.trim().toLowerCase()
    ) || [];

    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
    const role = isAdmin ? 'admin' : 'student';

    console.log(`🔍 User ${user.email} assigned role: ${role}`);

    this.currentProfile = {
      id: userId,
      email: user.email || '',
      role: role,
      full_name:
        user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      first_name:
        user.user_metadata?.full_name?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        'User',
      last_name:
        user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
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

  // Sign in with email and password - OPTIMIZED VERSION
  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    try {
      console.log('🔐 Starting sign in process for:', email);

      // Direct authentication with timeout
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timeout')), 5000); // 5s timeout
      });

      const { data, error } = (await Promise.race([
        authPromise,
        timeoutPromise,
      ])) as unknown as {
        data: {
          user: { id: string; email?: string } | null;
          session: { access_token: string } | null;
        } | null;
        error: { message: string } | null;
      };

      if (error) {
        console.error('❌ Sign in error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Supabase authentication successful');

      if (data?.user && data?.session) {
        console.log('👤 User data received:', data.user.email);
        // Convert from partial User type to full User type
        this.currentUser = {
          ...data.user,
          app_metadata: {},
          user_metadata:
            (data.user as { user_metadata?: Record<string, unknown> })
              .user_metadata || {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User;

        // Convert from partial Session type to full Session type
        this.currentSession = {
          ...data.session,
          refresh_token: '',
          expires_in: 3600,
          token_type: 'bearer',
          user: this.currentUser,
        } as Session;

        console.log('📋 Loading user profile...');
        try {
          // Load profile with timeout
          const profilePromise = this.loadUserProfile(data.user.id);
          const profileTimeout = new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error('Profile loading timeout')),
              3000 // Reduced from 5s to 3s for better UX
            );
          });

          await Promise.race([profilePromise, profileTimeout]);
          console.log('✅ Profile loaded:', this.currentProfile?.role);
        } catch (profileError) {
          console.warn(
            '⚠️ Profile loading failed, using temporary profile:',
            profileError
          );

          // Set temporary profile immediately for faster response
          this.setTemporaryProfileWithRoleCheck(data.user.id, data.user);
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
      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Login timed out. Please try again.',
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
              console.log(
                `🔑 Retrieved token from localStorage fallback (${key})`
              );
              break;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error reading token from localStorage:', error);
      }
    }

    console.log(
      '🔑 getAccessToken called:',
      token ? 'Token exists' : 'No token',
      'Session:',
      !!this.currentSession
    );
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

      keysToRemove.forEach(key => {
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

      // Get driver name from profiles
      let driverName = 'Unknown Driver';
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
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
   * Check if user has valid driver session
   */
  async validateDriverSession(): Promise<{
    isValid: boolean;
    assignment: DriverBusAssignment | null;
  }> {
    try {
      // First validate the session
      const isSessionValid = await this.validateSession();
      if (!isSessionValid) {
        return { isValid: false, assignment: null };
      }

      // Wait for profile to be loaded if it's not available yet
      if (!this.currentProfile && this.currentUser) {
        console.log('🔄 Profile not loaded yet, waiting for profile...');
        await this.loadUserProfile(this.currentUser.id);
        
        // Wait a bit more for the profile to be set
        let attempts = 0;
        while (!this.currentProfile && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      // Check if user is a driver
      if (this.currentProfile?.role !== 'driver') {
        console.log('❌ User is not a driver. Current profile:', this.currentProfile);
        console.log('❌ User role:', this.currentProfile?.role);
        return { isValid: false, assignment: null };
      }

      console.log('✅ User is a driver, checking for bus assignment...');

      // Get driver assignment from database
      const assignment = await this.getDriverBusAssignment(
        this.currentUser!.id
      );
      if (!assignment) {
        console.log('❌ No active bus assignment found for driver');
        return { isValid: false, assignment: null };
      }

      this.currentDriverAssignment = assignment;
      return { isValid: true, assignment };
    } catch (error) {
      console.error('❌ Error validating driver session:', error);
      return { isValid: false, assignment: null };
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
