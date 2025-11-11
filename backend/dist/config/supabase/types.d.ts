import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
export type UserRole = 'driver' | 'student' | 'admin';
export interface SupabaseProjectConfig {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
}
export interface SupabaseClientOptions {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    detectSessionInUrl?: boolean;
    storageKey?: string;
    headers?: Record<string, string>;
}
export type DriverSupabaseClient = SupabaseClient<Database>;
export type StudentSupabaseClient = SupabaseClient<Database>;
export type DriverSupabaseAdminClient = SupabaseClient<Database>;
export type StudentSupabaseAdminClient = SupabaseClient<Database>;
export interface ClientFactoryResult<T> {
    client: T;
    config: SupabaseProjectConfig;
    error?: Error;
}
//# sourceMappingURL=types.d.ts.map