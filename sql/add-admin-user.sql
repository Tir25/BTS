-- Add Admin User Script for siddharthmali.211@gmail.com
-- This script adds the new admin user to both users and profiles tables

-- Step 1: Insert into users table (if not exists)
INSERT INTO public.users (id, email, role, first_name, last_name, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    'admin',
    'Siddharth',
    'Mali',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'siddharthmali.211@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    first_name = 'Siddharth',
    last_name = 'Mali',
    updated_at = NOW();

-- Step 2: Insert into profiles table (if not exists)
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    'Siddharth Mali',
    'admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'siddharthmali.211@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Siddharth Mali',
    role = 'admin',
    updated_at = NOW();

-- Step 3: Verify the user was added successfully
SELECT 
    'Admin User Setup Complete' as status,
    u.email,
    usr.role as user_role,
    p.role as profile_role,
    usr.first_name || ' ' || usr.last_name as full_name,
    CASE 
        WHEN usr.role = 'admin' AND p.role = 'admin' 
        THEN 'Admin role set correctly'
        ELSE 'Role mismatch detected'
    END as role_status
FROM auth.users u
LEFT JOIN public.users usr ON u.id = usr.id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'siddharthmali.211@gmail.com';
