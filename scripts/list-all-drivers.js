#!/usr/bin/env node

/**
 * List All Drivers Script
 * University Bus Tracking System
 * 
 * This script retrieves and displays all drivers from the database.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listAllDrivers() {
  console.log('🚗 Listing All Drivers in the System...\n');

  try {
    // 1. Get all drivers from profiles table
    console.log('📊 Step 1: Retrieving drivers from profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error querying profiles table:', profilesError);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} drivers in profiles table`);
    }

    // 2. Get all drivers from users table
    console.log('\n📊 Step 2: Retrieving drivers from users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error querying users table:', usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} drivers in users table`);
    }

    // 3. Get all drivers from Supabase Auth
    console.log('\n📊 Step 3: Retrieving drivers from Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error querying auth users:', authError);
    } else {
      const driverUsers = authUsers.users.filter(user => 
        user.user_metadata?.role === 'driver' || 
        user.user_metadata?.roles?.includes('driver')
      );
      console.log(`✅ Found ${driverUsers.length} drivers in Supabase Auth`);
    }

    // 4. Get bus assignments
    console.log('\n📊 Step 4: Retrieving bus assignments...');
    const { data: buses, error: busesError } = await supabase
      .from('buses')
      .select(`
        id,
        number_plate,
        assigned_driver_id,
        profiles!inner(id, full_name, email, role)
      `)
      .eq('profiles.role', 'driver');

    if (busesError) {
      console.error('❌ Error querying bus assignments:', busesError);
    } else {
      console.log(`✅ Found ${buses?.length || 0} buses with assigned drivers`);
    }

    // 5. Display comprehensive driver list
    console.log('\n' + '='.repeat(80));
    console.log('🚗 COMPLETE DRIVER LIST');
    console.log('='.repeat(80));

    // Combine all drivers and remove duplicates
    const allDrivers = new Map();

    // Add drivers from profiles table
    if (profiles) {
      profiles.forEach(driver => {
        allDrivers.set(driver.email, {
          id: driver.id,
          email: driver.email,
          name: driver.full_name || 'Unknown Name',
          role: driver.role,
          created_at: driver.created_at,
          source: 'profiles',
          phone: driver.phone || 'N/A',
          assigned_bus: null
        });
      });
    }

    // Add drivers from users table
    if (users) {
      users.forEach(driver => {
        if (!allDrivers.has(driver.email)) {
          allDrivers.set(driver.email, {
            id: driver.id,
            email: driver.email,
            name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unknown Name',
            role: driver.role,
            created_at: driver.created_at,
            source: 'users',
            phone: driver.phone || 'N/A',
            assigned_bus: null
          });
        }
      });
    }

    // Add bus assignments
    if (buses) {
      buses.forEach(bus => {
        const driverEmail = bus.profiles.email;
        if (allDrivers.has(driverEmail)) {
          const driver = allDrivers.get(driverEmail);
          driver.assigned_bus = bus.number_plate;
          allDrivers.set(driverEmail, driver);
        }
      });
    }

    // Convert to array and sort by creation date
    const driverList = Array.from(allDrivers.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (driverList.length === 0) {
      console.log('❌ No drivers found in the system.');
      return;
    }

    // Display drivers in a formatted table
    console.log(`\n📋 Total Unique Drivers: ${driverList.length}\n`);
    
    console.log('┌' + '─'.repeat(78) + '┐');
    console.log('│ ' + 'DRIVER LIST'.padEnd(76) + ' │');
    console.log('├' + '─'.repeat(78) + '┤');

    driverList.forEach((driver, index) => {
      const date = new Date(driver.created_at).toLocaleDateString();
      const time = new Date(driver.created_at).toLocaleTimeString();
      const name = driver.name || 'Unknown Name';
      const email = driver.email || 'No Email';
      const phone = driver.phone || 'N/A';
      const assignedBus = driver.assigned_bus || 'Not Assigned';
      const source = driver.source || 'Unknown';
      const id = driver.id ? driver.id.slice(0, 8) + '...' : 'Unknown';
      
      console.log(`│ ${(index + 1).toString().padStart(2)}. ${name.padEnd(25)} │ ${email.padEnd(30)} │ ${assignedBus.padEnd(15)} │`);
      console.log(`│    📧 ${email.padEnd(25)} │ 📱 ${phone.padEnd(30)} │ 🚌 ${assignedBus.padEnd(15)} │`);
      console.log(`│    📅 Created: ${date} ${time.padEnd(15)} │ Source: ${source.padEnd(25)} │ ID: ${id.padEnd(15)} │`);
      
      if (index < driverList.length - 1) {
        console.log('├' + '─'.repeat(78) + '┤');
      }
    });

    console.log('└' + '─'.repeat(78) + '┘');

    // 6. Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('─'.repeat(50));
    
    const profilesCount = profiles?.length || 0;
    const usersCount = users?.length || 0;
    const authCount = authUsers?.users.filter(u => u.user_metadata?.role === 'driver').length || 0;
    const assignedCount = driverList.filter(d => d.assigned_bus).length;
    const unassignedCount = driverList.filter(d => !d.assigned_bus).length;

    console.log(`   Total drivers in profiles table: ${profilesCount}`);
    console.log(`   Total drivers in users table: ${usersCount}`);
    console.log(`   Total drivers in Supabase Auth: ${authCount}`);
    console.log(`   Unique drivers (deduplicated): ${driverList.length}`);
    console.log(`   Drivers assigned to buses: ${assignedCount}`);
    console.log(`   Drivers not assigned to buses: ${unassignedCount}`);

    // 7. Recent activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDrivers = driverList.filter(d => new Date(d.created_at) > oneDayAgo);
    
    if (recentDrivers.length > 0) {
      console.log(`\n🆕 Recent Activity (Last 24 hours):`);
      console.log('─'.repeat(50));
      recentDrivers.forEach(driver => {
        const timeAgo = getTimeAgo(new Date(driver.created_at));
        console.log(`   • ${driver.name} (${driver.email}) - Created ${timeAgo}`);
      });
    }

    // 8. Simple list format
    console.log('\n📋 SIMPLE DRIVER LIST:');
    console.log('─'.repeat(50));
    driverList.forEach((driver, index) => {
      const date = new Date(driver.created_at).toLocaleDateString();
      const assignedStatus = driver.assigned_bus ? `🚌 ${driver.assigned_bus}` : '❌ Not Assigned';
      console.log(`${index + 1}. ${driver.name} (${driver.email}) - ${assignedStatus} - Created: ${date}`);
    });

    console.log('\n✅ Driver list retrieved successfully!');

  } catch (error) {
    console.error('❌ Error retrieving driver list:', error);
    process.exit(1);
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    return `${diffInDays} days ago`;
  }
}

// Run the script
listAllDrivers()
  .then(() => {
    console.log('\n🚀 Driver list operation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
