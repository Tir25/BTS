require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBackendAPI() {
  console.log('🧪 Testing Backend API...\n');

  try {
    // First, sign in as admin
    console.log('🔐 Signing in as admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'siddharthmali.211@gmail.com',
      password: 'your-password-here' // You'll need to provide the actual password
    });

    if (authError) {
      console.log('❌ Auth error:', authError.message);
      return;
    }

    console.log('✅ Signed in successfully');

    // Get the access token
    const accessToken = authData.session.access_token;
    console.log('🔑 Access token obtained');

    // Test the backend API
    console.log('\n📡 Testing /drivers endpoint...');
    const response = await fetch((process.env.API_URL || 'http://localhost:3000') + '/drivers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }

    const drivers = await response.json();
    console.log('✅ API Response:');
    console.log(JSON.stringify(drivers, null, 2));

    console.log('\n📊 Driver Count:', drivers.length);
    console.log('\n📋 Driver Details:');
    drivers.forEach((driver, index) => {
      console.log(`${index + 1}. ID: ${driver.id}`);
      console.log(`   Email: ${driver.email || 'null'}`);
      console.log(`   Name: ${driver.first_name} ${driver.last_name}`);
      console.log(`   Role: ${driver.role}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testBackendAPI();
