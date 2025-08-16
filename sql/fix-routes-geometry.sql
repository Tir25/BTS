-- Fix Routes Table Geometry Columns
-- This script ensures both 'stops' and 'geom' columns exist and are properly configured

-- Step 1: Add geom column if it doesn't exist
ALTER TABLE routes ADD COLUMN IF NOT EXISTS geom GEOMETRY(LINESTRING, 4326);

-- Step 2: Update existing records to have geom values
UPDATE routes 
SET geom = stops 
WHERE geom IS NULL AND stops IS NOT NULL;

-- Step 3: Set default geometry for any remaining NULL geom values
UPDATE routes 
SET geom = ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326)
WHERE geom IS NULL;

-- Step 4: Make geom column NOT NULL (only if all records have values)
-- ALTER TABLE routes ALTER COLUMN geom SET NOT NULL;

-- Step 5: Create index on geom column for better performance
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST(geom);

-- Step 6: Verify the fix
SELECT 
    'Routes table geometry fix completed' as status,
    COUNT(*) as total_routes,
    COUNT(stops) as routes_with_stops,
    COUNT(geom) as routes_with_geom,
    COUNT(CASE WHEN stops IS NULL THEN 1 END) as null_stops,
    COUNT(CASE WHEN geom IS NULL THEN 1 END) as null_geom
FROM routes;
