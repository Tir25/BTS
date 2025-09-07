"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryOptimizer = void 0;
const QueryCache_1 = require("./QueryCache");
const ConnectionPoolOptimizer_1 = require("./ConnectionPoolOptimizer");
class QueryOptimizer {
    constructor(config = {}) {
        this.preparedStatements = new Map();
        this.queryPlans = new Map();
        this.config = {
            enableCaching: true,
            enablePreparedStatements: true,
            enableQueryAnalysis: true,
            cacheTtl: 300000,
            maxCacheSize: 1000,
            ...config,
        };
    }
    async executeOptimizedQuery(query, params = [], client, cacheKey) {
        const startTime = Date.now();
        try {
            if (this.config.enableCaching) {
                const cached = QueryCache_1.queryCache.get(query, params);
                if (cached !== null) {
                    console.log(`📦 Cache hit for query: ${query.substring(0, 50)}...`);
                    return cached;
                }
            }
            let optimizedQuery = query;
            if (this.config.enablePreparedStatements) {
                optimizedQuery = await this.optimizeQuery(query);
            }
            const result = await ConnectionPoolOptimizer_1.connectionPoolOptimizer.executeQuery(optimizedQuery, params, client);
            if (this.config.enableCaching) {
                QueryCache_1.queryCache.set(query, params, result, this.config.cacheTtl);
            }
            const endTime = Date.now();
            console.log(`⚡ Query executed in ${endTime - startTime}ms`);
            return result;
        }
        catch (error) {
            const endTime = Date.now();
            console.error(`❌ Query failed after ${endTime - startTime}ms:`, error);
            throw error;
        }
    }
    async optimizeQuery(query) {
        let optimized = query.trim();
        optimized = optimized.replace(/\s+/g, ' ');
        if (optimized.toLowerCase().startsWith('select')) {
            optimized = this.optimizeSelectQuery(optimized);
        }
        if (optimized.toLowerCase().startsWith('insert')) {
            optimized = this.optimizeInsertQuery(optimized);
        }
        if (optimized.toLowerCase().startsWith('update')) {
            optimized = this.optimizeUpdateQuery(optimized);
        }
        if (optimized.toLowerCase().startsWith('delete')) {
            optimized = this.optimizeDeleteQuery(optimized);
        }
        return optimized;
    }
    optimizeSelectQuery(query) {
        let optimized = query;
        if (!optimized.toLowerCase().includes('limit') &&
            !optimized.toLowerCase().includes('count(') &&
            !optimized.toLowerCase().includes('group by')) {
            if (this.mightReturnManyRows(optimized)) {
                optimized += ' LIMIT 1000';
            }
        }
        optimized = this.optimizeOrderBy(optimized);
        optimized = this.optimizeWhereClause(optimized);
        return optimized;
    }
    optimizeInsertQuery(query) {
        let optimized = query;
        if (optimized.toLowerCase().includes('on duplicate key')) {
            optimized = optimized.replace(/on duplicate key update/gi, 'ON CONFLICT DO UPDATE SET');
        }
        return optimized;
    }
    optimizeUpdateQuery(query) {
        let optimized = query;
        if (!optimized.toLowerCase().includes('where')) {
            console.warn('⚠️ UPDATE query without WHERE clause detected');
        }
        return optimized;
    }
    optimizeDeleteQuery(query) {
        let optimized = query;
        if (!optimized.toLowerCase().includes('where')) {
            console.warn('⚠️ DELETE query without WHERE clause detected');
        }
        return optimized;
    }
    mightReturnManyRows(query) {
        const lowerQuery = query.toLowerCase();
        const manyRowsPatterns = [
            'select * from',
            'select id, name from',
            'select * from buses',
            'select * from routes',
        ];
        return manyRowsPatterns.some(pattern => lowerQuery.includes(pattern));
    }
    optimizeOrderBy(query) {
        if (query.toLowerCase().includes('order by') &&
            query.toLowerCase().includes('limit 1')) {
            return query;
        }
        return query;
    }
    optimizeWhereClause(query) {
        return query;
    }
    async analyzeQuery(query, params = []) {
        const startTime = Date.now();
        try {
            const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
            const result = await ConnectionPoolOptimizer_1.connectionPoolOptimizer.executeQuery(explainQuery, params);
            const plan = result[0]?.query_plan;
            const executionTime = Date.now() - startTime;
            const queryPlan = {
                query,
                estimatedCost: plan?.[0]?.['Total Cost'] || 0,
                executionTime,
                rowsReturned: plan?.[0]?.['Actual Rows'] || 0,
                indexesUsed: this.extractIndexesUsed(plan),
                optimizationSuggestions: this.generateOptimizationSuggestions(plan, query),
            };
            this.queryPlans.set(query, queryPlan);
            return queryPlan;
        }
        catch (error) {
            console.error('❌ Query analysis failed:', error);
            throw error;
        }
    }
    extractIndexesUsed(plan) {
        const indexes = [];
        if (plan && Array.isArray(plan)) {
            const extractFromNode = (node) => {
                if (node['Index Name']) {
                    indexes.push(node['Index Name']);
                }
                if (node.Plans) {
                    node.Plans.forEach(extractFromNode);
                }
            };
            plan.forEach(extractFromNode);
        }
        return indexes;
    }
    generateOptimizationSuggestions(plan, query) {
        const suggestions = [];
        if (plan && Array.isArray(plan)) {
            const analyzeNode = (node) => {
                if (node['Node Type'] === 'Seq Scan') {
                    suggestions.push(`Consider adding an index for table ${node['Relation Name']}`);
                }
                if (node['Node Type'] === 'Nested Loop') {
                    suggestions.push('Consider optimizing join conditions');
                }
                if (node['Total Cost'] > 1000) {
                    suggestions.push('High cost operation detected - consider query optimization');
                }
                if (node.Plans) {
                    node.Plans.forEach(analyzeNode);
                }
            };
            plan.forEach(analyzeNode);
        }
        if (query.toLowerCase().includes('select *')) {
            suggestions.push('Consider selecting only needed columns instead of *');
        }
        if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('limit')) {
            suggestions.push('Consider adding LIMIT clause to ORDER BY queries');
        }
        return suggestions;
    }
    getQueryPlan(query) {
        return this.queryPlans.get(query) || null;
    }
    getAllQueryPlans() {
        return Array.from(this.queryPlans.values());
    }
    getSlowQueries(threshold = 1000) {
        return Array.from(this.queryPlans.values())
            .filter(plan => plan.executionTime > threshold)
            .sort((a, b) => b.executionTime - a.executionTime);
    }
    getExpensiveQueries(threshold = 1000) {
        return Array.from(this.queryPlans.values())
            .filter(plan => plan.estimatedCost > threshold)
            .sort((a, b) => b.estimatedCost - a.estimatedCost);
    }
    prepareStatement(name, query) {
        if (this.config.enablePreparedStatements) {
            this.preparedStatements.set(name, query);
            console.log(`📝 Prepared statement '${name}' created`);
        }
    }
    async executePreparedStatement(name, params = [], client) {
        const query = this.preparedStatements.get(name);
        if (!query) {
            throw new Error(`Prepared statement '${name}' not found`);
        }
        return this.executeOptimizedQuery(query, params, client);
    }
    getPreparedStatements() {
        return Array.from(this.preparedStatements.entries()).map(([name, query]) => ({
            name,
            query,
        }));
    }
    clearPreparedStatements() {
        this.preparedStatements.clear();
    }
    getOptimizationStats() {
        const cacheMetrics = QueryCache_1.queryCache.getMetrics();
        const queryStats = ConnectionPoolOptimizer_1.connectionPoolOptimizer.getQueryStats();
        const totalQueries = queryStats.reduce((sum, stat) => sum + stat.count, 0);
        const averageExecutionTime = queryStats.length > 0
            ? queryStats.reduce((sum, stat) => sum + stat.averageTime, 0) / queryStats.length
            : 0;
        return {
            totalQueries,
            cachedQueries: cacheMetrics.hits,
            preparedStatements: this.preparedStatements.size,
            averageExecutionTime,
            cacheHitRate: cacheMetrics.hitRate,
        };
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    clear() {
        this.queryPlans.clear();
        this.preparedStatements.clear();
        QueryCache_1.queryCache.clear();
    }
    destroy() {
        this.clear();
    }
}
exports.queryOptimizer = new QueryOptimizer();
//# sourceMappingURL=QueryOptimizer.js.map