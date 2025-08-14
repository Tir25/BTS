-- Reset Admin Password
-- Run this in Supabase SQL Editor

-- Step 1: Reset the admin password
UPDATE auth.users 
SET 
    encrypted_password = crypt('password123', gen_salt('bf')),
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@university.edu';

-- Step 2: Ensure admin role is set
UPDATE auth.users 
SET 
    raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@university.edu';

-- Step 3: Verify the changes
SELECT 
    id,
    email,
    raw_app_meta_data->>'role' as role,
    updated_at
FROM auth.users 
WHERE email = 'admin@university.edu';

-- Step 4: Test login credentials
-- Email: admin@university.edu
-- Password: password123
