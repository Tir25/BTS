const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres.gthwmwfwvhyriygpcdlr:Tirth%20Raval27@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSqlFix() {
  try {
    console.log('🔧 Running SQL fix for routes table...');
    
    // Step 1: Add geom column if it doesn't exist
    await pool.query(`
      ALTER TABLE routes ADD COLUMN IF NOT EXISTS geom GEOMETRY(LINESTRING, 4326);
    `);
    console.log('✅ Step 1: Added geom column');

    // Step 2: Update existing records to have geom values
    const updateResult = await pool.query(`
      UPDATE routes 
      SET geom = stops 
      WHERE geom IS NULL AND stops IS NOT NULL;
    `);
    console.log(`✅ Step 2: Updated ${updateResult.rowCount} records`);

    // Step 3: Set default geometry for any remaining NULL geom values
    const defaultResult = await pool.query(`
      UPDATE routes 
      SET geom = ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326)
      WHERE geom IS NULL;
    `);
    console.log(`✅ Step 3: Set default geometry for ${defaultResult.rowCount} records`);

    // Step 4: Create index on geom column for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST(geom);
    `);
    console.log('✅ Step 4: Created geom index');

    // Step 5: Verify the fix
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_routes,
        COUNT(stops) as routes_with_stops,
        COUNT(geom) as routes_with_geom,
        COUNT(CASE WHEN stops IS NULL THEN 1 END) as null_stops,
        COUNT(CASE WHEN geom IS NULL THEN 1 END) as null_geom
      FROM routes;
    `);
    
    const stats = verifyResult.rows[0];
    console.log('✅ Step 5: Verification complete');
    console.log(`   Total routes: ${stats.total_routes}`);
    console.log(`   Routes with stops: ${stats.routes_with_stops}`);
    console.log(`   Routes with geom: ${stats.routes_with_geom}`);
    console.log(`   Null stops: ${stats.null_stops}`);
    console.log(`   Null geom: ${stats.null_geom}`);

    console.log('🎉 SQL fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running SQL fix:', error);
  } finally {
    await pool.end();
  }
}

runSqlFix();
