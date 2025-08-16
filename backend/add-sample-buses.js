const { Pool } = require('pg');
require('dotenv').config({ path: './backend/env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addSampleBuses() {
  try {
    console.log('🚌 Adding sample buses to database...\n');

    // First, check if we have any users (drivers)
    const usersResult = await pool.query('SELECT id, first_name, last_name FROM users WHERE role = \'driver\'');
    const drivers = usersResult.rows;
    
    console.log(`📋 Found ${drivers.length} drivers in database`);
    
    if (drivers.length === 0) {
      console.log('⚠️ No drivers found. Creating sample driver...');
      const driverResult = await pool.query(`
        INSERT INTO users (email, role, first_name, last_name) 
        VALUES ('driver1@university.edu', 'driver', 'John', 'Driver')
        ON CONFLICT (email) DO NOTHING
        RETURNING id, first_name, last_name;
      `);
      drivers.push(driverResult.rows[0]);
    }

    // Check if we have any routes
    const routesResult = await pool.query('SELECT id, name FROM routes WHERE is_active = true');
    const routes = routesResult.rows;
    
    console.log(`🗺️ Found ${routes.length} routes in database`);
    
    if (routes.length === 0) {
      console.log('⚠️ No routes found. Creating sample route...');
      const routeResult = await pool.query(`
        INSERT INTO routes (name, description, stops, geom, distance_km, estimated_duration_minutes, is_active) 
        VALUES ('Campus Route', 'Main campus transportation route', 
                ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326),
                ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326),
                25.5, 45, true)
        ON CONFLICT DO NOTHING
        RETURNING id, name;
      `);
      routes.push(routeResult.rows[0]);
    }

    // Add sample buses
    const sampleBuses = [
      {
        code: 'BUS001',
        number_plate: 'UNI001',
        capacity: 50,
        model: 'Mercedes-Benz O500',
        year: 2020,
        driver_id: drivers[0]?.id,
        route_id: routes[0]?.id
      },
      {
        code: 'BUS002',
        number_plate: 'UNI002',
        capacity: 45,
        model: 'Volvo B7R',
        year: 2019,
        driver_id: null,
        route_id: routes[0]?.id
      },
      {
        code: 'BUS003',
        number_plate: 'UNI003',
        capacity: 55,
        model: 'Scania K250',
        year: 2021,
        driver_id: null,
        route_id: routes[0]?.id
      }
    ];

    for (const bus of sampleBuses) {
      const result = await pool.query(`
        INSERT INTO buses (code, number_plate, capacity, model, year, assigned_driver_id, route_id, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (code) DO UPDATE SET
          number_plate = EXCLUDED.number_plate,
          capacity = EXCLUDED.capacity,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          assigned_driver_id = EXCLUDED.assigned_driver_id,
          route_id = EXCLUDED.route_id,
          is_active = true
        RETURNING id, code, number_plate, assigned_driver_id, route_id;
      `, [bus.code, bus.number_plate, bus.capacity, bus.model, bus.year, bus.driver_id, bus.route_id]);
      
      console.log(`✅ Added/Updated bus: ${bus.code} (${bus.number_plate})`);
    }

    // Verify buses were added
    const verifyResult = await pool.query(`
      SELECT b.id, b.code, b.number_plate, b.capacity, b.model, b.is_active,
             u.first_name, u.last_name,
             r.name as route_name
      FROM buses b
      LEFT JOIN users u ON b.assigned_driver_id = u.id
      LEFT JOIN routes r ON b.route_id = r.id
      WHERE b.is_active = true
      ORDER BY b.code;
    `);

    console.log('\n📊 Current buses in database:');
    verifyResult.rows.forEach(bus => {
      console.log(`   🚌 ${bus.code} (${bus.number_plate})`);
      console.log(`      Model: ${bus.model}`);
      console.log(`      Capacity: ${bus.capacity}`);
      console.log(`      Driver: ${bus.first_name ? `${bus.first_name} ${bus.last_name}` : 'No driver assigned'}`);
      console.log(`      Route: ${bus.route_name || 'No route assigned'}`);
      console.log(`      Active: ${bus.is_active}`);
      console.log('');
    });

    console.log('🎉 Sample buses added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding sample buses:', error);
  } finally {
    await pool.end();
  }
}

addSampleBuses();
