-- Fix Database Schema - Add Missing Columns
-- Run this in Supabase SQL Editor

-- Step 1: Add route_id column to buses table
ALTER TABLE buses 
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);

-- Step 2: Add estimated_duration_minutes column to routes table if it doesn't exist
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 30;

-- Step 3: Update some sample buses to have route assignments
UPDATE buses 
SET route_id = (SELECT id FROM routes LIMIT 1)
WHERE route_id IS NULL 
AND id IN (SELECT id FROM buses LIMIT 2);

-- Step 4: Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('buses', 'routes')
AND column_name IN ('route_id', 'estimated_duration_minutes')
ORDER BY table_name, column_name;

-- Step 5: Show current bus assignments
SELECT 
    b.id,
    b.number_plate,
    b.route_id,
    r.name as route_name,
    u.first_name as driver_name
FROM buses b
LEFT JOIN routes r ON b.route_id = r.id
LEFT JOIN users u ON b.assigned_driver_id = u.id;
