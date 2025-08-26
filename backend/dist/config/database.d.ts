import { Pool } from 'pg';
declare let pool: Pool;
export declare const checkDatabaseHealth: () => Promise<{
    healthy: boolean;
    details: Record<string, unknown>;
}>;
export declare const initializeDatabaseConnection: () => Promise<Pool>;
export declare const closeDatabaseConnection: () => Promise<void>;
export default pool;
//# sourceMappingURL=database.d.ts.map