const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addAdminUser() {
  try {
    console.log('🔄 Adding admin user: siddharthmali.211@gmail.com');
    
    // Step 1: Get the user from Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const user = authUser.users.find(u => u.email === 'siddharthmali.211@gmail.com');
    
    if (authError) {
      console.error('❌ Error fetching user from auth:', authError.message);
      return;
    }
    
    if (!user) {
      console.error('❌ User not found in Supabase Auth');
      console.error('Please ensure the user exists in Authentication > Users in your Supabase dashboard');
      return;
    }
    
    console.log('✅ User found in Supabase Auth:', user.id);
    
    // Step 2: Add user to public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: user.id,
        email: 'siddharthmali.211@gmail.com',
        role: 'admin',
        first_name: 'Siddharth',
        last_name: 'Mali',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (userError) {
      console.error('❌ Error adding user to users table:', userError.message);
      return;
    }
    
    console.log('✅ User added to public.users table');
    
    // Step 3: Add user to public.profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: 'Siddharth Mali',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (profileError) {
      console.error('❌ Error adding user to profiles table:', profileError.message);
      return;
    }
    
    console.log('✅ User added to public.profiles table');
    
    // Step 4: Verify the setup
    const { data: verifyUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'siddharthmali.211@gmail.com')
      .single();
    
    const { data: verifyProfile, error: verifyProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (verifyError || verifyProfileError) {
      console.error('❌ Error verifying user setup:', verifyError || verifyProfileError);
      return;
    }
    
    console.log('\n🎉 Admin user setup completed successfully!');
    console.log('📋 User Details:');
    console.log(`   Email: ${verifyUser.email}`);
    console.log(`   Role: ${verifyUser.role}`);
    console.log(`   Name: ${verifyUser.first_name} ${verifyUser.last_name}`);
    console.log(`   Profile Role: ${verifyProfile.role}`);
    console.log(`   Profile Name: ${verifyProfile.full_name}`);
    
    console.log('\n✅ The user can now log in to the admin panel with:');
    console.log('   Email: siddharthmali.211@gmail.com');
    console.log('   Password: Siddharth57');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
addAdminUser();



