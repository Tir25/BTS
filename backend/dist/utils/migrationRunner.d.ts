export interface Migration {
    id: string;
    name: string;
    filename: string;
    executed_at?: Date;
}
export declare class MigrationRunner {
    private static instance;
    private migrationsPath;
    constructor();
    static getInstance(): MigrationRunner;
    private createMigrationsTable;
    private getExecutedMigrations;
    private getAvailableMigrations;
    private executeMigration;
    runMigrations(): Promise<void>;
    checkMigrationStatus(): Promise<{
        isUpToDate: boolean;
        pendingCount: number;
        executedCount: number;
    }>;
    rollbackMigration(migrationId: string): Promise<void>;
}
export default MigrationRunner;
//# sourceMappingURL=migrationRunner.d.ts.map