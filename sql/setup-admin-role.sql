-- Setup Admin Role for Supabase User
-- Run this in your Supabase SQL Editor

-- First, let's check if the user exists in our users table
SELECT * FROM users WHERE email = 'admin@university.edu';

-- If the user doesn't exist, insert them
INSERT INTO users (email, role, first_name, last_name) 
VALUES ('admin@university.edu', 'admin', 'Admin', 'User')
ON CONFLICT (email) DO UPDATE SET 
    role = 'admin',
    first_name = 'Admin',
    last_name = 'User';

-- Create function to set custom claims (if it doesn't exist)
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

-- Get the user's UUID from auth.users
-- Replace 'user-uuid-here' with the actual UUID from the query below
-- SELECT id FROM auth.users WHERE email = 'admin@university.edu';

-- Set the admin role claim (uncomment and replace UUID after running the query above)
-- SELECT public.set_claim(
--   'user-uuid-here', -- Replace with actual UUID
--   jsonb_build_object('role', 'admin')
-- );

-- Verify the setup
SELECT 
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    au.raw_app_meta_data
FROM users u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.email = 'admin@university.edu';
