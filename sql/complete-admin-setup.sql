-- Complete Admin Setup for University Bus Tracking System
-- Run this script in your Supabase SQL Editor

-- Step 1: Verify admin user exists in our users table
SELECT 'Step 1: Checking admin user in users table' as step;
SELECT * FROM users WHERE email = 'admin@university.edu';

-- Step 2: Verify admin user exists in auth.users
SELECT 'Step 2: Checking admin user in auth.users' as step;
SELECT id, email, raw_app_meta_data FROM auth.users WHERE email = 'admin@university.edu';

-- Step 3: Create function to set custom claims
SELECT 'Step 3: Creating set_claim function' as step;
CREATE OR REPLACE FUNCTION public.set_claim(uid uuid, claim jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || claim
  WHERE id = uid;
END;
$$;

-- Step 4: Set admin role claim for the user
-- Replace 'dfb97ec8-fcc0-4e1a-ae5e-a8c5ca2a78f6' with the actual UUID from Step 2
SELECT 'Step 4: Setting admin role claim' as step;
SELECT public.set_claim(
  'dfb97ec8-fcc0-4e1a-ae5e-a8c5ca2a78f6', -- Replace with actual UUID from Step 2
  jsonb_build_object('role', 'admin')
);

-- Step 5: Verify the setup
SELECT 'Step 5: Verifying admin setup' as step;
SELECT 
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    au.raw_app_meta_data
FROM users u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.email = 'admin@university.edu';

-- Step 6: Test admin role claim
SELECT 'Step 6: Testing admin role claim' as step;
SELECT 
    email,
    raw_app_meta_data->>'role' as jwt_role
FROM auth.users 
WHERE email = 'admin@university.edu';

-- Success message
SELECT '✅ Admin setup completed successfully!' as status;
SELECT 'You can now login to the admin panel with:' as info;
SELECT 'Email: admin@university.edu' as credentials;
SELECT 'Password: password123' as credentials;
SELECT 'URL: http://localhost:5174/admin' as admin_url;
