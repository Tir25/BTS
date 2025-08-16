-- Comprehensive Fix Script for Driver Authentication and Database Issues
-- This script fixes all known issues in the database

-- Step 1: Check if user exists in auth.users
SELECT 'Step 1: Checking auth.users' as status;
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmed'
        ELSE '❌ Email not confirmed'
    END as status
FROM auth.users 
WHERE email = 'tirthraval27@gmail.com';

-- Step 2: Create or update profile with driver role
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    'Tirth Raval',
    'driver',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'tirthraval27@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Tirth Raval',
    role = 'driver',
    updated_at = NOW();

-- Step 3: Create or update user record in users table
INSERT INTO public.users (id, email, role, first_name, last_name, phone, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    'driver',
    'Tirth',
    'Raval',
    '+1234567890',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'tirthraval27@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'driver',
    first_name = 'Tirth',
    last_name = 'Raval',
    updated_at = NOW();

-- Step 4: Ensure route exists with proper geometry (fixes the NOT NULL constraint error)
INSERT INTO public.routes (id, name, description, stops, geom, distance_km, estimated_duration_minutes, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Campus Route 1',
    'Main campus circular route',
    ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154, 72.5714 23.0225)', 4326),
    ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154, 72.5714 23.0225)', 4326),
    15.5,
    45,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.routes WHERE name = 'Campus Route 1'
);

-- Step 5: Create bus and assign to driver
INSERT INTO public.buses (id, code, number_plate, capacity, model, year, assigned_driver_id, route_id, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'BUS-001',
    'BUS-001',
    50,
    'Mercedes-Benz',
    2023,
    u.id,
    r.id,
    true,
    NOW(),
    NOW()
FROM auth.users u, public.routes r
WHERE u.email = 'tirthraval27@gmail.com'
  AND r.name = 'Campus Route 1'
  AND NOT EXISTS (
    SELECT 1 FROM public.buses WHERE number_plate = 'BUS-001'
  );

-- Step 6: Update existing bus assignment if bus already exists
UPDATE public.buses 
SET assigned_driver_id = (
    SELECT u.id FROM auth.users u
    WHERE u.email = 'tirthraval27@gmail.com'
    LIMIT 1
),
route_id = (
    SELECT r.id FROM public.routes r
    WHERE r.name = 'Campus Route 1'
    LIMIT 1
)
WHERE number_plate = 'BUS-001'
  AND assigned_driver_id IS NULL;

-- Step 7: Fix any existing routes without geometry (if any)
UPDATE public.routes 
SET stops = ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154, 72.5714 23.0225)', 4326)
WHERE stops IS NULL;

UPDATE public.routes 
SET geom = ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154, 72.5714 23.0225)', 4326)
WHERE geom IS NULL;

-- Step 8: Verify the fix
SELECT 'Step 8: Verification' as step;
SELECT 
    u.email,
    p.role as profile_role,
    usr.role as user_role,
    usr.first_name || ' ' || usr.last_name as driver_name,
    b.number_plate as assigned_bus,
    r.name as assigned_route,
    CASE 
        WHEN p.role = 'driver' AND usr.role = 'driver' AND b.assigned_driver_id IS NOT NULL 
        THEN '✅ All checks passed'
        ELSE '❌ Some issues remain'
    END as overall_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.users usr ON u.id = usr.id
LEFT JOIN public.buses b ON b.assigned_driver_id = u.id
LEFT JOIN public.routes r ON b.route_id = r.id
WHERE u.email = 'tirthraval27@gmail.com';

-- Step 9: Check for any remaining database issues
SELECT 'Step 9: Database health check' as step;

-- Check for routes without geometry
SELECT 
    'Routes without geometry' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All routes have geometry'
        ELSE '❌ Found routes without geometry'
    END as status
FROM public.routes 
WHERE stops IS NULL;

-- Check for buses without assigned drivers
SELECT 
    'Buses without assigned drivers' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All buses have drivers'
        ELSE '⚠️ Found buses without drivers'
    END as status
FROM public.buses 
WHERE assigned_driver_id IS NULL;

-- Check for users without profiles
SELECT 
    'Users without profiles' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All users have profiles'
        ELSE '⚠️ Found users without profiles'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Step 10: Final verification
SELECT 'Step 10: Final verification' as step;
SELECT 
    'Driver authentication setup complete' as message,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE u.email = 'tirthraval27@gmail.com' 
            AND p.role = 'driver'
        ) THEN '✅ Driver profile exists'
        ELSE '❌ Driver profile missing'
    END as profile_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.email = 'tirthraval27@gmail.com' 
            AND u.role = 'driver'
        ) THEN '✅ Driver user record exists'
        ELSE '❌ Driver user record missing'
    END as user_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.buses b
            JOIN public.users u ON b.assigned_driver_id = u.id
            WHERE u.email = 'tirthraval27@gmail.com'
        ) THEN '✅ Bus assigned to driver'
        ELSE '❌ No bus assigned to driver'
    END as bus_status;
