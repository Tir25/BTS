# Test Data Cleanup Guide

## Identified Test Data

### Bus
- **ID**: `fe874704-f54c-4ae3-8556-1d26e1254fff`
- **Vehicle Number**: `GJ-02-XY-7777`
- **Name**: `null`

### Route
- **ID**: `b147a23e-1d7e-4390-9a61-a11109eb83a0`
- **Name**: `Route I - Visnagar to Campus`

## Cleanup Options

### Option 1: Delete Test Data (Recommended for Production)
```sql
-- Delete route first (due to foreign key constraints)
DELETE FROM routes WHERE id = 'b147a23e-1d7e-4390-9a61-a11109eb83a0';

-- Delete bus
DELETE FROM buses WHERE id = 'fe874704-f54c-4ae3-8556-1d26e1254fff';
```

### Option 2: Archive Test Data (Recommended for Development)
```sql
-- Mark route as inactive
UPDATE routes 
SET is_active = false, 
    updated_at = NOW()
WHERE id = 'b147a23e-1d7e-4390-9a61-a11109eb83a0';

-- Mark bus as inactive
UPDATE buses 
SET is_active = false, 
    updated_at = NOW()
WHERE id = 'fe874704-f54c-4ae3-8556-1d26e1254fff';
```

### Option 3: Rename for Future Use
```sql
-- Rename route
UPDATE routes 
SET name = 'TEST - Route I - Visnagar to Campus (Archived)',
    is_active = false,
    updated_at = NOW()
WHERE id = 'b147a23e-1d7e-4390-9a61-a11109eb83a0';

-- Rename bus
UPDATE buses 
SET vehicle_no = 'TEST-GJ-02-XY-7777',
    is_active = false,
    updated_at = NOW()
WHERE id = 'fe874704-f54c-4ae3-8556-1d26e1254fff';
```

## Related Data to Check

Before deleting, check for related records:

```sql
-- Check assignments
SELECT * FROM assignment_history 
WHERE bus_id = 'fe874704-f54c-4ae3-8556-1d26e1254fff' 
   OR route_id = 'b147a23e-1d7e-4390-9a61-a11109eb83a0';

-- Check live locations
SELECT * FROM live_locations 
WHERE bus_id = 'fe874704-f54c-4ae3-8556-1d26e1254fff';

-- Check route stops
SELECT * FROM route_stops 
WHERE route_id = 'b147a23e-1d7e-4390-9a61-a11109eb83a0';
```

## Recommendation

For **development/testing environments**: Use Option 2 (Archive) to preserve data for future testing.

For **production environments**: Use Option 1 (Delete) after verifying no critical data depends on these records.

