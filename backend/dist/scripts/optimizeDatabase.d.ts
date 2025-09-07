export interface IndexDefinition {
    name: string;
    table: string;
    columns: string[];
    type?: 'btree' | 'hash' | 'gist' | 'gin';
    condition?: string;
    description: string;
}
declare class DatabaseOptimizer {
    private createdIndexes;
    private failedIndexes;
    optimizeDatabase(): Promise<{
        success: boolean;
        created: number;
        failed: number;
        details: {
            created: string[];
            failed: Array<{
                name: string;
                error: string;
            }>;
        };
    }>;
    private checkExistingIndexes;
    private createIndex;
    private updateTableStatistics;
    getIndexStatus(): Promise<{
        total: number;
        performance: number;
        spatial: number;
        details: Array<{
            name: string;
            table: string;
            size: string;
            usage: string;
        }>;
    }>;
}
export declare const databaseOptimizer: DatabaseOptimizer;
export {};
//# sourceMappingURL=optimizeDatabase.d.ts.map