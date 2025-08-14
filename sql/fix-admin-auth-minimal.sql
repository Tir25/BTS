-- Fix Admin Authentication - Minimal Approach
-- Run this in Supabase SQL Editor

-- Step 1: Update the admin password directly
UPDATE auth.users 
SET 
    encrypted_password = crypt('password123', gen_salt('bf')),
    raw_app_meta_data = '{"role": "admin", "provider": "email", "providers": ["email"]}',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@university.edu';

-- Step 2: Update the custom users table
UPDATE users 
SET 
    role = 'admin',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@university.edu';

-- Step 3: Verify the changes
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.raw_app_meta_data->>'role' as auth_role,
    u.id as user_id,
    u.email as user_email,
    u.role as user_role
FROM auth.users au
LEFT JOIN users u ON au.email = u.email
WHERE au.email = 'admin@university.edu';

-- Step 4: Test login credentials
-- Email: admin@university.edu
-- Password: password123
