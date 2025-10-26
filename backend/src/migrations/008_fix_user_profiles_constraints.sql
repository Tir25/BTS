-- Fix user_profiles table foreign key constraints
-- This migration safely handles existing data and constraints

-- First, drop the problematic foreign key constraint if it exists
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Update the user_profiles table to handle existing auth users
-- Create a trigger to automatically create user_profiles when auth.users are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert any existing auth users that don't have profiles
INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'last_name', ''),
  COALESCE(raw_user_meta_data->>'role', 'student'),
  true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Ensure the admin user exists with proper role
INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'siddharthmali.211@gmail.com',
  'Siddharth Mali',
  'Siddharth',
  'Mali',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- Create indexes for buses table
CREATE INDEX IF NOT EXISTS idx_buses_number ON buses(bus_number);
CREATE INDEX IF NOT EXISTS idx_buses_vehicle ON buses(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_buses_driver ON buses(assigned_driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_active ON buses(is_active);

-- Create indexes for routes table
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);
