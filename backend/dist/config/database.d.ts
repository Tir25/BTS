import { Pool } from 'pg';
export declare const pool: Pool;
export declare const checkDatabaseHealth: () => Promise<{
    healthy: boolean;
    error?: string;
}>;
export declare const closeDatabasePool: () => Promise<void>;
export declare const queryWithRetry: (text: string, params?: any[], maxRetries?: number) => Promise<any>;
export declare const initializeDatabase: () => Promise<void>;
export default pool;
//# sourceMappingURL=database.d.ts.map