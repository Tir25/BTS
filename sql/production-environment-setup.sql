-- Production Environment Setup and Verification
-- Run this script in Supabase SQL Editor to verify production readiness

-- Step 1: Verify Database Schema
SELECT 
    'Database Schema Status:' as info,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'buses', 'routes', 'users', 'live_locations');

-- Step 2: Verify RLS Policies
SELECT 
    'RLS Policies Status:' as info,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 3: Verify User Roles
SELECT 
    'User Roles Distribution:' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN raw_app_meta_data->>'role' = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN raw_app_meta_data->>'role' = 'driver' THEN 1 END) as driver_users,
    COUNT(CASE WHEN raw_app_meta_data->>'role' = 'student' THEN 1 END) as student_users,
    COUNT(CASE WHEN raw_app_meta_data->>'role' IS NULL THEN 1 END) as users_without_role
FROM auth.users;

-- Step 4: Verify Profiles Table
SELECT 
    'Profiles Table Status:' as info,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_profiles,
    COUNT(CASE WHEN role = 'driver' THEN 1 END) as driver_profiles,
    COUNT(CASE WHEN role = 'student' THEN 1 END) as student_profiles
FROM public.profiles;

-- Step 5: Check for Admin Users
SELECT 
    'Admin Users:' as info,
    u.email,
    u.email_confirmed_at,
    u.raw_app_meta_data->>'role' as user_role,
    p.role as profile_role,
    p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.raw_app_meta_data->>'role' = 'admin' OR p.role = 'admin'
ORDER BY u.created_at;

-- Step 6: Verify Extensions
SELECT 
    'Required Extensions:' as info,
    extname,
    extversion
FROM pg_extension
WHERE extname IN ('postgis', 'pgcrypto', 'uuid-ossp');

-- Step 7: Production Security Check
SELECT 
    'Security Status:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND policyname LIKE '%admin%'
        ) THEN '✅ Admin policies exist'
        ELSE '❌ Admin policies missing'
    END as admin_policies,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND policyname LIKE '%user%'
        ) THEN '✅ User policies exist'
        ELSE '❌ User policies missing'
    END as user_policies,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE raw_app_meta_data->>'role' = 'admin'
        ) THEN '✅ Admin users exist'
        ELSE '❌ No admin users found'
    END as admin_users_exist;

-- Step 8: Final Production Readiness
SELECT 
    'Production Readiness Summary:' as info,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') >= 5 
        THEN '✅ RLS Policies: READY'
        ELSE '❌ RLS Policies: INCOMPLETE'
    END as rls_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin') > 0 
        THEN '✅ Admin Users: READY'
        ELSE '❌ Admin Users: MISSING'
    END as admin_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.profiles) > 0 
        THEN '✅ Profiles Table: READY'
        ELSE '❌ Profiles Table: EMPTY'
    END as profiles_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_extension WHERE extname = 'postgis') > 0 
        THEN '✅ PostGIS Extension: READY'
        ELSE '❌ PostGIS Extension: MISSING'
    END as postgis_status;
