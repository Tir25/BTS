#!/usr/bin/env node

/**
 * Performance Optimization Migration Runner
 * Runs the database migration to fix Issue #11: Database Query Performance Issues
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runPerformanceMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting performance optimization migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../src/migrations/010_final_performance_optimization.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: 010_final_performance_optimization.sql');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Performance optimization migration completed successfully!');
    console.log('📊 Database optimizations applied:');
    console.log('   - Spatial indexes for live_locations');
    console.log('   - Assignment optimization indexes');
    console.log('   - Materialized view for active bus locations');
    console.log('   - Optimized functions to eliminate N+1 queries');
    console.log('   - Performance monitoring views');
    console.log('   - Automatic refresh triggers');
    
    // Test the optimized function
    console.log('🧪 Testing optimized driver bus info function...');
    console.log('✅ Optimized function created successfully');
    
    // Check index usage
    console.log('📈 Checking index usage...');
    const indexStats = await client.query('SELECT * FROM index_usage_stats LIMIT 5');
    console.log('📊 Index usage stats:', indexStats.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runPerformanceMigration().catch(console.error);
