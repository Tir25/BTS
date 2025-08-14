-- Create New Admin User with Correct Credentials
-- Run this in Supabase SQL Editor

-- Step 1: Create a new admin user in auth.users
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
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('password123', gen_salt('bf')),
    raw_app_meta_data = '{"role": "admin", "provider": "email", "providers": ["email"]}',
    updated_at = CURRENT_TIMESTAMP;

-- Step 2: Get the user ID
SELECT id, email, raw_app_meta_data 
FROM auth.users 
WHERE email = 'admin@university.edu';

-- Step 3: Update the custom users table to match
INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@university.edu'),
    'admin@university.edu',
    'Admin',
    'User',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    id = (SELECT id FROM auth.users WHERE email = 'admin@university.edu'),
    role = 'admin',
    updated_at = CURRENT_TIMESTAMP;

-- Step 4: Verify the setup
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
