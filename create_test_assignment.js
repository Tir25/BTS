/**
 * Create Test Bus Assignment Script
 * Creates a bus assignment for the test driver prathambhatt771@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://gthwmwfwvhyriygpcdlr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestAssignment() {
  console.log('🚀 Creating test bus assignment for driver...');
  
  try {
    // First, check if the driver exists
    const { data: driver, error: driverError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'prathambhatt771@gmail.com')
      .single();

    if (driverError || !driver) {
      console.error('❌ Driver not found:', driverError);
      return;
    }

    console.log('✅ Driver found:', driver.email);

    // Check if driver already has an assignment
    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('assignment_history')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('action', 'assigned')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (existingAssignment) {
      console.log('✅ Driver already has an assignment:', existingAssignment);
      return existingAssignment;
    }

    // Get available buses
    const { data: buses, error: busesError } = await supabase
      .from('buses')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (busesError || !buses || buses.length === 0) {
      console.error('❌ No buses available:', busesError);
      return;
    }

    console.log('✅ Available buses:', buses.length);

    // Get available routes
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (routesError || !routes || routes.length === 0) {
      console.error('❌ No routes available:', routesError);
      return;
    }

    console.log('✅ Available routes:', routes.length);

    // Create assignment
    const assignment = {
      driver_id: driver.id,
      bus_id: buses[0].id,
      route_id: routes[0].id,
      assigned_by: driver.id, // Self-assigned for testing
      notes: 'Test assignment for driver dashboard testing',
      action: 'assigned',
      assigned_at: new Date().toISOString()
    };

    const { data: newAssignment, error: createError } = await supabase
      .from('assignment_history')
      .insert(assignment)
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create assignment:', createError);
      return;
    }

    console.log('✅ Assignment created successfully:', newAssignment);

    // Get the complete assignment with joined data
    const { data: completeAssignment, error: completeError } = await supabase
      .from('assignment_history')
      .select(`
        *,
        buses:bus_id (
          id,
          bus_number,
          vehicle_no,
          assignment_status
        ),
        routes:route_id (
          id,
          name,
          description,
          is_active
        ),
        drivers:driver_id (
          id,
          email,
          full_name
        )
      `)
      .eq('id', newAssignment.id)
      .single();

    if (completeError) {
      console.error('❌ Failed to get complete assignment:', completeError);
      return;
    }

    console.log('✅ Complete assignment data:', completeAssignment);

    return completeAssignment;

  } catch (error) {
    console.error('💥 Error creating test assignment:', error);
  }
}

// Run the script
if (require.main === module) {
  createTestAssignment().catch(console.error);
}

module.exports = { createTestAssignment };
