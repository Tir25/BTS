export type { UserRole, SupabaseProjectConfig, SupabaseClientOptions, DriverSupabaseClient, StudentSupabaseClient, DriverSupabaseAdminClient, StudentSupabaseAdminClient, ClientFactoryResult, } from './types';
export type { Database } from './database.types';
export { createSupabaseClient, validateSupabaseConfig, testSupabaseConnection, } from './clientFactory';
import { getDriverSupabaseAdmin, getDriverSupabaseConfig, resetDriverClient, testDriverConnection } from './driverClient';
import { getStudentSupabaseAdmin, getStudentSupabaseConfig, resetStudentClient, testStudentConnection } from './studentClient';
export { getDriverSupabaseAdmin, getDriverSupabaseConfig, resetDriverClient, testDriverConnection, };
export { getStudentSupabaseAdmin, getStudentSupabaseConfig, resetStudentClient, testStudentConnection, };
export declare function getSupabaseAdmin(): import("./types").DriverSupabaseAdminClient;
export declare function getSupabase(): import("./types").DriverSupabaseAdminClient;
export declare const supabaseAdmin: any;
export declare const supabase: any;
declare const _default: {
    getDriverSupabaseAdmin: typeof getDriverSupabaseAdmin;
    getStudentSupabaseAdmin: typeof getStudentSupabaseAdmin;
    getSupabaseAdmin: typeof getSupabaseAdmin;
    getSupabase: typeof getSupabase;
};
export default _default;
//# sourceMappingURL=index.d.ts.map