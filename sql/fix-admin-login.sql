-- Fix Admin Login Issue
-- Run this in Supabase SQL Editor

-- Step 1: Set admin role for the auth user that's actually being used for login
SELECT public.set_claim(
    'dfb97ec8-fcc0-4e1a-ae5e-a8c5ca2a78f6',
    jsonb_build_object('role', 'admin')
);

-- Step 2: Update the custom users table to match the auth user ID
UPDATE users 
SET id = 'dfb97ec8-fcc0-4e1a-ae5e-a8c5ca2a78f6'
WHERE email = 'admin@university.edu';

-- Step 3: Verify the changes
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.raw_app_meta_data as auth_role,
    u.id as user_id,
    u.email as user_email,
    u.role as user_role
FROM auth.users au
LEFT JOIN users u ON au.email = u.email
WHERE au.email = 'admin@university.edu';

-- Step 4: Test the admin role is set correctly
SELECT 
    id,
    email,
    raw_app_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'admin@university.edu';
