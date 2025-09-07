"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseOptimizer = void 0;
const database_1 = require("../config/database");
const performanceIndexes = [
    {
        name: 'idx_live_locations_bus_id_timestamp',
        table: 'live_locations',
        columns: ['bus_id', 'recorded_at DESC'],
        type: 'btree',
        description: 'Optimize bus location history queries',
    },
    {
        name: 'idx_live_locations_recorded_at_recent',
        table: 'live_locations',
        columns: ['recorded_at DESC'],
        type: 'btree',
        condition: 'recorded_at > NOW() - INTERVAL \'1 hour\'',
        description: 'Optimize recent location queries',
    },
    {
        name: 'idx_buses_assigned_driver_active',
        table: 'buses',
        columns: ['assigned_driver_id', 'is_active'],
        type: 'btree',
        condition: 'is_active = true',
        description: 'Optimize active bus queries by driver',
    },
    {
        name: 'idx_buses_route_active',
        table: 'buses',
        columns: ['route_id', 'is_active'],
        type: 'btree',
        condition: 'is_active = true',
        description: 'Optimize active bus queries by route',
    },
    {
        name: 'idx_routes_active_name',
        table: 'routes',
        columns: ['is_active', 'name'],
        type: 'btree',
        condition: 'is_active = true',
        description: 'Optimize active route queries',
    },
    {
        name: 'idx_profiles_role_active',
        table: 'profiles',
        columns: ['role', 'created_at'],
        type: 'btree',
        description: 'Optimize user role queries',
    },
    {
        name: 'idx_bus_stops_route_order',
        table: 'bus_stops',
        columns: ['route_id', 'stop_order'],
        type: 'btree',
        condition: 'is_active = true',
        description: 'Optimize bus stop ordering queries',
    },
    {
        name: 'idx_live_locations_location_spatial',
        table: 'live_locations',
        columns: ['location'],
        type: 'gist',
        description: 'Spatial index for location-based queries',
    },
    {
        name: 'idx_bus_stops_location_spatial',
        table: 'bus_stops',
        columns: ['location'],
        type: 'gist',
        description: 'Spatial index for bus stop location queries',
    },
    {
        name: 'idx_routes_geom_spatial',
        table: 'routes',
        columns: ['geom'],
        type: 'gist',
        description: 'Spatial index for route geometry queries',
    },
];
class DatabaseOptimizer {
    constructor() {
        this.createdIndexes = [];
        this.failedIndexes = [];
    }
    async optimizeDatabase() {
        console.log('🔄 Starting database optimization...');
        try {
            await this.checkExistingIndexes();
            for (const index of performanceIndexes) {
                await this.createIndex(index);
            }
            await this.updateTableStatistics();
            console.log(`✅ Database optimization completed`);
            console.log(`📊 Created: ${this.createdIndexes.length} indexes`);
            console.log(`❌ Failed: ${this.failedIndexes.length} indexes`);
            return {
                success: this.failedIndexes.length === 0,
                created: this.createdIndexes.length,
                failed: this.failedIndexes.length,
                details: {
                    created: this.createdIndexes,
                    failed: this.failedIndexes.map(f => ({ name: f.index.name, error: f.error })),
                },
            };
        }
        catch (error) {
            console.error('❌ Database optimization failed:', error);
            throw error;
        }
    }
    async checkExistingIndexes() {
        console.log('🔍 Checking existing indexes...');
        const query = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
    `;
        const result = await database_1.pool.query(query);
        const existingIndexes = result.rows.map(row => row.indexname);
        console.log(`📋 Found ${existingIndexes.length} existing performance indexes`);
    }
    async createIndex(index) {
        try {
            const existsQuery = `
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )
      `;
            const existsResult = await database_1.pool.query(existsQuery, [index.name]);
            if (existsResult.rows[0].exists) {
                console.log(`⏭️  Index ${index.name} already exists, skipping`);
                return;
            }
            let createIndexQuery = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${index.name} ON ${index.table}`;
            if (index.type === 'gist') {
                createIndexQuery += ` USING GIST (${index.columns.join(', ')})`;
            }
            else if (index.type === 'gin') {
                createIndexQuery += ` USING GIN (${index.columns.join(', ')})`;
            }
            else {
                createIndexQuery += ` (${index.columns.join(', ')})`;
            }
            if (index.condition) {
                createIndexQuery += ` WHERE ${index.condition}`;
            }
            console.log(`🔨 Creating index: ${index.name}`);
            console.log(`   Description: ${index.description}`);
            await database_1.pool.query(createIndexQuery);
            this.createdIndexes.push(index.name);
            console.log(`✅ Created index: ${index.name}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to create index ${index.name}:`, errorMessage);
            this.failedIndexes.push({
                index,
                error: errorMessage,
            });
        }
    }
    async updateTableStatistics() {
        console.log('📊 Updating table statistics...');
        const tables = [
            'live_locations',
            'buses',
            'routes',
            'bus_stops',
            'profiles',
            'users',
        ];
        for (const table of tables) {
            try {
                await database_1.pool.query(`ANALYZE ${table}`);
                console.log(`✅ Updated statistics for ${table}`);
            }
            catch (error) {
                console.warn(`⚠️  Failed to update statistics for ${table}:`, error);
            }
        }
    }
    async getIndexStatus() {
        const query = `
      SELECT 
        i.indexname,
        i.tablename,
        pg_size_pretty(pg_relation_size(i.indexname::regclass)) as size,
        s.idx_scan as usage_count
      FROM pg_indexes i
      LEFT JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
      WHERE i.schemaname = 'public'
      AND i.indexname LIKE 'idx_%'
      ORDER BY i.tablename, i.indexname
    `;
        const result = await database_1.pool.query(query);
        const performance = result.rows.filter(row => !row.indexname.includes('spatial')).length;
        const spatial = result.rows.filter(row => row.indexname.includes('spatial')).length;
        return {
            total: result.rows.length,
            performance,
            spatial,
            details: result.rows.map(row => ({
                name: row.indexname,
                table: row.tablename,
                size: row.size,
                usage: row.usage_count || '0',
            })),
        };
    }
}
exports.databaseOptimizer = new DatabaseOptimizer();
//# sourceMappingURL=optimizeDatabase.js.map