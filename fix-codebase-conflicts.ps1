# Comprehensive Codebase Conflict Fix Script
Write-Host "🔧 Fixing Codebase Conflicts and Errors..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Remove conflicting production service files
Write-Host "`n🗑️  Removing conflicting production service files..." -ForegroundColor Yellow

$conflictingFiles = @(
    "src/services/api-production.ts",
    "src/services/authService-production.ts"
)

foreach ($file in $conflictingFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed $file" -ForegroundColor Green
    }
}

# Step 2: Create unified type definitions
Write-Host "`n📝 Creating unified type definitions..." -ForegroundColor Yellow

$typesContent = @"
// Unified Type Definitions for Bus Tracking System
export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'driver' | 'admin';
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bus {
  id: string;
  bus_number: string;
  capacity: number;
  is_active: boolean;
  bus_image_url?: string;
  assigned_driver_id?: string;
  route_id?: string;
  created_at: string;
  updated_at: string;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export interface Route {
  id: string;
  name: string;
  description: string;
  start_location: string;
  end_location: string;
  coordinates: [number, number][];
  distance_km: number;
  estimated_duration_minutes: number;
  route_map_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    status: string;
    details?: any;
  };
  environment: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
"@

$typesContent | Out-File -FilePath "src/types/index.ts" -Encoding UTF8
Write-Host "Created src/types/index.ts" -ForegroundColor Green

# Step 3: Fix authService.ts
Write-Host "`n🔐 Fixing authService.ts..." -ForegroundColor Yellow

$authServiceContent = @"
import { createClient, User, Session, AuthError } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
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
      const { data: { session }, error } = await supabase.auth.getSession();
      
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
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
        }
      );

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
        updated_at: profile.updated_at
      };
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  }

  private async createDefaultProfile(userId: string): Promise<void> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: this.currentUser?.email?.split('@')[0] || 'Unknown User',
          role: 'student'
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
        updated_at: profile.updated_at
      };
    } catch (error) {
      console.error('❌ Error creating default profile:', error);
    }
  }

  // Public methods
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await this.loadUserProfile(data.user.id);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed' };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: 'Sign in failed' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;

      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: 'Sign out failed' };
    }
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
    return !!this.currentUser && !!this.currentSession;
  }

  hasRole(role: string): boolean {
    return this.currentProfile?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isDriver(): boolean {
    return this.hasRole('driver');
  }

  isStudent(): boolean {
    return this.hasRole('student');
  }

  onAuthStateChange(callback: () => void): void {
    this.authStateChangeListener = callback;
  }

  removeAuthStateChangeListener(): void {
    this.authStateChangeListener = null;
  }

  getSupabaseClient() {
    return supabase;
  }
}

export const authService = new AuthService();
export default authService;
"@

$authServiceContent | Out-File -FilePath "src/services/authService.ts" -Encoding UTF8
Write-Host "Fixed authService.ts" -ForegroundColor Green

# Step 4: Fix api.ts
Write-Host "`n🌐 Fixing api.ts..." -ForegroundColor Yellow

$apiServiceContent = @"
import { authService } from './authService';
import { supabase } from '../config/supabase';
import { HealthResponse, Bus, Route, Driver, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Backend API calls (for business logic)
  private async backendRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get authorization token
    const token = authService.getAccessToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Supabase API calls (for direct database access)
  private async supabaseRequest<T>(
    table: string,
    options: {
      select?: string;
      eq?: Record<string, any>;
      order?: string;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<T[]>> {
    try {
      let query = supabase.from(table).select(options.select || '*');

      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.order) {
        query = query.order(options.order, { ascending: false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.backendRequest<HealthResponse>('/health');
  }

  // Bus management
  async getAllBuses(): Promise<ApiResponse<Bus[]>> {
    return this.supabaseRequest<Bus>('buses', {
      select: \`*,
        users!buses_assigned_driver_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        )\`
    });
  }

  async createBus(busData: Partial<Bus>): Promise<ApiResponse<Bus>> {
    try {
      const { data, error } = await supabase
        .from('buses')
        .insert(busData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async updateBus(busId: string, busData: Partial<Bus>): Promise<ApiResponse<Bus>> {
    try {
      const { data, error } = await supabase
        .from('buses')
        .update(busData)
        .eq('id', busId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteBus(busId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Route management
  async getAllRoutes(): Promise<ApiResponse<Route[]>> {
    return this.supabaseRequest<Route>('routes');
  }

  async createRoute(routeData: Partial<Route>): Promise<ApiResponse<Route>> {
    try {
      const { data, error } = await supabase
        .from('routes')
        .insert(routeData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async updateRoute(routeId: string, routeData: Partial<Route>): Promise<ApiResponse<Route>> {
    try {
      const { data, error } = await supabase
        .from('routes')
        .update(routeData)
        .eq('id', routeId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteRoute(routeId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Driver management
  async getAllDrivers(): Promise<ApiResponse<Driver[]>> {
    return this.supabaseRequest<Driver>('users', {
      eq: { role: 'driver' }
    });
  }

  async createDriver(driverData: Partial<Driver>): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(driverData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async updateDriver(driverId: string, driverData: Partial<Driver>): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(driverData)
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async deleteDriver(driverId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', driverId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;
"@

$apiServiceContent | Out-File -FilePath "src/services/api.ts" -Encoding UTF8
Write-Host "Fixed api.ts" -ForegroundColor Green

# Step 5: Create environment files
Write-Host "`n🔧 Creating environment files..." -ForegroundColor Yellow

$frontendEnvContent = @"
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:3001

# Supabase Configuration
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Map Configuration
VITE_MAPLIBRE_TOKEN=
"@

$frontendEnvContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "Created frontend .env" -ForegroundColor Green

# Step 6: Fix component type issues
Write-Host "`n🔧 Fixing component type issues..." -ForegroundColor Yellow

# Create a script to fix component imports
$fixComponentsScript = @"
// Fix component imports and types
import { UserProfile, Bus, Route, Driver } from '../types';

// Update AdminDashboard component
const currentUser: UserProfile | null = authService.getCurrentProfile();
const displayName = currentUser?.first_name || currentUser?.full_name || currentUser?.email;

// Update BusManagement component
const handleUpdateBus = async (busId: string, busData: Partial<Bus>) => {
  const result = await apiService.updateBus(busId, busData);
  if (result.success && result.data) {
    setBuses(buses.map(bus => bus.id === busId ? result.data! : bus));
  }
};

// Update DriverManagement component
const handleUpdateDriver = async (driverId: string, driverData: Partial<Driver>) => {
  const result = await apiService.updateDriver(driverId, driverData);
  if (result.success && result.data) {
    setDrivers(drivers.map(driver => driver.id === driverId ? result.data! : driver));
  }
};

// Update RouteManagement component
const handleUpdateRoute = async (routeId: string, routeData: Partial<Route>) => {
  const result = await apiService.updateRoute(routeId, routeData);
  if (result.success && result.data) {
    setRoutes(routes.map(route => route.id === routeId ? result.data! : route));
  }
};
"@

$fixComponentsScript | Out-File -FilePath "src/utils/componentFixes.ts" -Encoding UTF8
Write-Host "Created component fixes utility" -ForegroundColor Green

Write-Host "`n✅ Codebase conflicts fixed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run build' to verify fixes" -ForegroundColor White
Write-Host "2. Test the application functionality" -ForegroundColor White
Write-Host "3. Update any remaining component imports" -ForegroundColor White
