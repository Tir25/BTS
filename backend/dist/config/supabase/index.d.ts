export type { UserRole, SupabaseProjectConfig, SupabaseClientOptions, DriverSupabaseClient, StudentSupabaseClient, DriverSupabaseAdminClient, StudentSupabaseAdminClient, ClientFactoryResult, } from './types';
export type { Database } from './database.types';
export { createSupabaseClient, validateSupabaseConfig, testSupabaseConnection, } from './clientFactory';
export { getDriverSupabaseAdmin, getDriverSupabaseConfig, resetDriverClient, testDriverConnection, } from './driverClient';
export { getStudentSupabaseAdmin, getStudentSupabaseConfig, resetStudentClient, testStudentConnection, } from './studentClient';
export declare function getSupabaseAdmin(): import("./types").DriverSupabaseAdminClient;
export declare function getSupabase(): import("./types").DriverSupabaseAdminClient;
export declare const supabaseAdmin: import("./types").DriverSupabaseAdminClient;
export declare const supabase: import("./types").DriverSupabaseAdminClient;
//# sourceMappingURL=index.d.ts.map