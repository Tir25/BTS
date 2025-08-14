-- Fix Admin Authentication - Simple Approach
-- Run this in Supabase SQL Editor

-- Step 1: Delete existing admin user if exists
DELETE FROM auth.users WHERE email = 'admin@university.edu';

-- Step 2: Create a new admin user with correct credentials
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    gen_random_uuid(),
    'admin@university.edu',
    crypt('password123', gen_salt('bf')),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '{"role": "admin", "provider": "email", "providers": ["email"]}',
    '{"first_name": "Admin", "last_name": "User"}',
    false,
    '',
    '',
    '',
    ''
);

-- Step 3: Get the new user ID
SELECT id, email, raw_app_meta_data 
FROM auth.users 
WHERE email = 'admin@university.edu';

-- Step 4: Update the custom users table
DELETE FROM users WHERE email = 'admin@university.edu';

INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@university.edu'),
    'admin@university.edu',
    'Admin',
    'User',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Step 5: Verify the setup
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

-- Step 6: Test login credentials
-- Email: admin@university.edu
-- Password: password123
