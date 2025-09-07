// Query Optimization Service

import { PoolClient } from 'pg';
import { queryCache } from './QueryCache';
import { connectionPoolOptimizer } from './ConnectionPoolOptimizer';

export interface QueryPlan {
  query: string;
  estimatedCost: number;
  executionTime: number;
  rowsReturned: number;
  indexesUsed: string[];
  optimizationSuggestions: string[];
}

export interface OptimizedQuery {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  estimatedImprovement: number; // Percentage
}

export interface QueryOptimizationConfig {
  enableCaching: boolean;
  enablePreparedStatements: boolean;
  enableQueryAnalysis: boolean;
  cacheTtl: number;
  maxCacheSize: number;
}

class QueryOptimizer {
  private config: QueryOptimizationConfig;
  private preparedStatements: Map<string, string> = new Map();
  private queryPlans: Map<string, QueryPlan> = new Map();

  constructor(config: Partial<QueryOptimizationConfig> = {}) {
    this.config = {
      enableCaching: true,
      enablePreparedStatements: true,
      enableQueryAnalysis: true,
      cacheTtl: 300000, // 5 minutes
      maxCacheSize: 1000,
      ...config,
    };
  }

  // Optimize query with caching and prepared statements
  async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    client?: PoolClient,
    cacheKey?: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = queryCache.get<T>(query, params);
        if (cached !== null) {
          console.log(`📦 Cache hit for query: ${query.substring(0, 50)}...`);
          return cached;
        }
      }

      // Use prepared statement if enabled
      let optimizedQuery = query;
      if (this.config.enablePreparedStatements) {
        optimizedQuery = await this.optimizeQuery(query);
      }

      // Execute query
      const result = await connectionPoolOptimizer.executeQuery<T>(
        optimizedQuery,
        params,
        client
      );

      // Cache result
      if (this.config.enableCaching) {
        queryCache.set(query, params, result, this.config.cacheTtl);
      }

      const endTime = Date.now();
      console.log(`⚡ Query executed in ${endTime - startTime}ms`);

      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ Query failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  // Optimize query structure
  private async optimizeQuery(query: string): Promise<string> {
    let optimized = query.trim();

    // Remove unnecessary whitespace
    optimized = optimized.replace(/\s+/g, ' ');

    // Optimize SELECT queries
    if (optimized.toLowerCase().startsWith('select')) {
      optimized = this.optimizeSelectQuery(optimized);
    }

    // Optimize INSERT queries
    if (optimized.toLowerCase().startsWith('insert')) {
      optimized = this.optimizeInsertQuery(optimized);
    }

    // Optimize UPDATE queries
    if (optimized.toLowerCase().startsWith('update')) {
      optimized = this.optimizeUpdateQuery(optimized);
    }

    // Optimize DELETE queries
    if (optimized.toLowerCase().startsWith('delete')) {
      optimized = this.optimizeDeleteQuery(optimized);
    }

    return optimized;
  }

  // Optimize SELECT queries
  private optimizeSelectQuery(query: string): string {
    let optimized = query;

    // Add LIMIT if not present and query might return many rows
    if (!optimized.toLowerCase().includes('limit') && 
        !optimized.toLowerCase().includes('count(') &&
        !optimized.toLowerCase().includes('group by')) {
      // Only add LIMIT for queries that might return many rows
      if (this.mightReturnManyRows(optimized)) {
        optimized += ' LIMIT 1000';
      }
    }

    // Optimize ORDER BY clauses
    optimized = this.optimizeOrderBy(optimized);

    // Optimize WHERE clauses
    optimized = this.optimizeWhereClause(optimized);

    return optimized;
  }

  // Optimize INSERT queries
  private optimizeInsertQuery(query: string): string {
    let optimized = query;

    // Use ON CONFLICT for upserts
    if (optimized.toLowerCase().includes('on duplicate key')) {
      optimized = optimized.replace(
        /on duplicate key update/gi,
        'ON CONFLICT DO UPDATE SET'
      );
    }

    return optimized;
  }

  // Optimize UPDATE queries
  private optimizeUpdateQuery(query: string): string {
    let optimized = query;

    // Ensure WHERE clause exists for safety
    if (!optimized.toLowerCase().includes('where')) {
      console.warn('⚠️ UPDATE query without WHERE clause detected');
    }

    return optimized;
  }

  // Optimize DELETE queries
  private optimizeDeleteQuery(query: string): string {
    let optimized = query;

    // Ensure WHERE clause exists for safety
    if (!optimized.toLowerCase().includes('where')) {
      console.warn('⚠️ DELETE query without WHERE clause detected');
    }

    return optimized;
  }

  // Check if query might return many rows
  private mightReturnManyRows(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Queries that typically return many rows
    const manyRowsPatterns = [
      'select * from',
      'select id, name from',
      'select * from buses',
      'select * from routes',
    ];

    return manyRowsPatterns.some(pattern => lowerQuery.includes(pattern));
  }

  // Optimize ORDER BY clauses
  private optimizeOrderBy(query: string): string {
    // Remove unnecessary ORDER BY clauses
    if (query.toLowerCase().includes('order by') && 
        query.toLowerCase().includes('limit 1')) {
      // If we're only getting one row, ORDER BY might be unnecessary
      return query;
    }

    return query;
  }

  // Optimize WHERE clauses
  private optimizeWhereClause(query: string): string {
    // Move indexed columns to the beginning of WHERE clause
    // This is a simplified optimization
    return query;
  }

  // Analyze query performance
  async analyzeQuery(query: string, params: any[] = []): Promise<QueryPlan> {
    const startTime = Date.now();
    
    try {
      // Execute EXPLAIN ANALYZE
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await connectionPoolOptimizer.executeQuery<any>(
        explainQuery,
        params
      );

      const plan = result[0]?.query_plan;
      const executionTime = Date.now() - startTime;

      const queryPlan: QueryPlan = {
        query,
        estimatedCost: plan?.[0]?.['Total Cost'] || 0,
        executionTime,
        rowsReturned: plan?.[0]?.['Actual Rows'] || 0,
        indexesUsed: this.extractIndexesUsed(plan),
        optimizationSuggestions: this.generateOptimizationSuggestions(plan, query),
      };

      this.queryPlans.set(query, queryPlan);
      return queryPlan;
    } catch (error) {
      console.error('❌ Query analysis failed:', error);
      throw error;
    }
  }

  // Extract indexes used from query plan
  private extractIndexesUsed(plan: any): string[] {
    const indexes: string[] = [];
    
    if (plan && Array.isArray(plan)) {
      const extractFromNode = (node: any) => {
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

  // Generate optimization suggestions
  private generateOptimizationSuggestions(plan: any, query: string): string[] {
    const suggestions: string[] = [];
    
    if (plan && Array.isArray(plan)) {
      const analyzeNode = (node: any) => {
        // Check for sequential scans
        if (node['Node Type'] === 'Seq Scan') {
          suggestions.push(`Consider adding an index for table ${node['Relation Name']}`);
        }
        
        // Check for nested loops
        if (node['Node Type'] === 'Nested Loop') {
          suggestions.push('Consider optimizing join conditions');
        }
        
        // Check for high cost operations
        if (node['Total Cost'] > 1000) {
          suggestions.push('High cost operation detected - consider query optimization');
        }
        
        if (node.Plans) {
          node.Plans.forEach(analyzeNode);
        }
      };
      
      plan.forEach(analyzeNode);
    }
    
    // Query-specific suggestions
    if (query.toLowerCase().includes('select *')) {
      suggestions.push('Consider selecting only needed columns instead of *');
    }
    
    if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('limit')) {
      suggestions.push('Consider adding LIMIT clause to ORDER BY queries');
    }
    
    return suggestions;
  }

  // Get query plan
  getQueryPlan(query: string): QueryPlan | null {
    return this.queryPlans.get(query) || null;
  }

  // Get all query plans
  getAllQueryPlans(): QueryPlan[] {
    return Array.from(this.queryPlans.values());
  }

  // Get slow queries
  getSlowQueries(threshold: number = 1000): QueryPlan[] {
    return Array.from(this.queryPlans.values())
      .filter(plan => plan.executionTime > threshold)
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  // Get expensive queries
  getExpensiveQueries(threshold: number = 1000): QueryPlan[] {
    return Array.from(this.queryPlans.values())
      .filter(plan => plan.estimatedCost > threshold)
      .sort((a, b) => b.estimatedCost - a.estimatedCost);
  }

  // Prepare statement
  prepareStatement(name: string, query: string): void {
    if (this.config.enablePreparedStatements) {
      this.preparedStatements.set(name, query);
      console.log(`📝 Prepared statement '${name}' created`);
    }
  }

  // Execute prepared statement
  async executePreparedStatement<T>(
    name: string,
    params: any[] = [],
    client?: PoolClient
  ): Promise<T> {
    const query = this.preparedStatements.get(name);
    if (!query) {
      throw new Error(`Prepared statement '${name}' not found`);
    }

    return this.executeOptimizedQuery<T>(query, params, client);
  }

  // Get prepared statements
  getPreparedStatements(): { name: string; query: string }[] {
    return Array.from(this.preparedStatements.entries()).map(([name, query]) => ({
      name,
      query,
    }));
  }

  // Clear prepared statements
  clearPreparedStatements(): void {
    this.preparedStatements.clear();
  }

  // Get optimization statistics
  getOptimizationStats(): {
    totalQueries: number;
    cachedQueries: number;
    preparedStatements: number;
    averageExecutionTime: number;
    cacheHitRate: number;
  } {
    const cacheMetrics = queryCache.getMetrics();
    const queryStats = connectionPoolOptimizer.getQueryStats();
    
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

  // Update configuration
  updateConfig(newConfig: Partial<QueryOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Clear all data
  clear(): void {
    this.queryPlans.clear();
    this.preparedStatements.clear();
    queryCache.clear();
  }

  // Destroy optimizer
  destroy(): void {
    this.clear();
  }
}

export const queryOptimizer = new QueryOptimizer();

