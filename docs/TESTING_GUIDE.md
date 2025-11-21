# End-to-End Testing Guide

## Prerequisites

1. ✅ Environment variables set (see `docs/ENVIRONMENT_SETUP.md`)
2. ✅ Backend server running
3. ✅ Frontend dev server running
4. ✅ Database accessible

## Quick Test Checklist

### 1. Admin Isolation Test

**Steps:**
1. Open browser to admin login page
2. Login with admin credentials: `tirthraval27@gmail.com` / `Tirth Raval27`
3. Open browser DevTools → Application → Local Storage
4. Verify storage key: `sb-gthwmwfwvhyriygpcdlr-admin-auth` exists
5. Verify admin dashboard loads
6. Try to navigate to `/driver` - should redirect to driver login

**Expected Results:**
- ✅ Admin login successful
- ✅ Admin storage key present
- ✅ Admin dashboard accessible
- ✅ Redirected away from driver routes

### 2. Driver Isolation Test

**Steps:**
1. Open new browser tab (or clear admin session)
2. Navigate to driver login page
3. Login with driver credentials
4. Open browser DevTools → Application → Local Storage
5. Verify storage key: `sb-gthwmwfwvhyriygpcdlr-driver-auth` exists
6. Verify driver interface loads
7. Try to access admin panel - should require admin login

**Expected Results:**
- ✅ Driver login successful
- ✅ Driver storage key present
- ✅ Driver interface accessible
- ✅ Cannot access admin panel without admin login

### 3. Student Isolation Test

**Steps:**
1. Open new browser tab
2. Navigate to student login page
3. Login with student credentials: `teststudent@university.edu` / `testpassword123`
4. Open browser DevTools → Application → Local Storage
5. Verify storage key: `sb-gthwmwfwvhyriygpcdlr-student-auth` exists
6. Verify student map loads

**Expected Results:**
- ✅ Student login successful
- ✅ Student storage key present
- ✅ Student map accessible

### 4. Multi-Role Simultaneous Test

**Steps:**
1. Open 3 browser tabs
2. Tab 1: Login as admin
3. Tab 2: Login as driver
4. Tab 3: Login as student
5. Verify all three remain logged in simultaneously
6. Logout from one - verify others remain logged in

**Expected Results:**
- ✅ All three roles can be logged in simultaneously
- ✅ No session bleeding between tabs
- ✅ Logout from one doesn't affect others

### 5. Route Coordinates Test

**Steps:**
1. Login as admin
2. Navigate to Route Management
3. Click "Add New Route"
4. Fill in route details (name, description, etc.)
5. In the "Route Path" section:
   - Click "Start Drawing"
   - Click on map to add route points (at least 2 points)
   - Click "Stop Drawing"
6. Click "Create Route"
7. Verify route is created
8. Navigate to student map
9. Verify route displays with path on map

**Expected Results:**
- ✅ Route created successfully
- ✅ Coordinates saved to database
- ✅ Route path visible on student map

### 6. Route Without Coordinates Test (Backward Compatibility)

**Steps:**
1. Login as admin
2. Navigate to Route Management
3. Click "Add New Route"
4. Fill in route details
5. **Do NOT** draw route path (skip the map section)
6. Click "Create Route"
7. Verify route is created without coordinates

**Expected Results:**
- ✅ Route created successfully
- ✅ Route works without coordinates (backward compatible)

### 7. Navigation Guards Test

**Steps:**
1. Login as driver
2. Manually navigate to `/driver` - should work
3. Try to access `/admin` - should redirect or show error
4. Login as admin
5. Try to access `/driver` - should redirect to driver login

**Expected Results:**
- ✅ Drivers can access driver routes
- ✅ Drivers cannot access admin routes
- ✅ Admins cannot access driver routes without driver login

## Console Verification

### Check for Success Messages

Open browser console and look for:

```
✅ admin Supabase client created successfully
✅ driver Supabase client created successfully
✅ student Supabase client created successfully
```

### Check for Errors

Watch for any errors like:
- ❌ "Invalid admin Supabase URL"
- ❌ "Failed to create admin Supabase client"
- ❌ "User is not a driver" (when logged in as admin)

## Database Verification

### Check Route Coordinates

```sql
SELECT 
  id, 
  name, 
  ST_AsGeoJSON(stops)::json as route_path
FROM routes 
WHERE stops IS NOT NULL
LIMIT 5;
```

### Check Storage Keys

In browser DevTools → Application → Local Storage, verify:
- `sb-gthwmwfwvhyriygpcdlr-admin-auth` (admin)
- `sb-gthwmwfwvhyriygpcdlr-driver-auth` (driver)
- `sb-gthwmwfwvhyriygpcdlr-student-auth` (student)

## Troubleshooting

### Issue: Admin login fails
- Check `VITE_ADMIN_EMAILS` includes your admin email
- Verify user profile in database has `role = 'admin'`
- Check console for Supabase client errors

### Issue: Routes not displaying on map
- Verify coordinates were saved (check database)
- Check browser console for map rendering errors
- Verify route has `coordinates` or `stops.coordinates` field

### Issue: Session bleeding between roles
- Clear all localStorage
- Verify each role uses different storage keys
- Check that `adminAuthService`, `driverAuthService`, etc. are used correctly

## Automated Testing (Future)

Consider adding:
- Unit tests for auth services
- Integration tests for route creation
- E2E tests with Playwright/Cypress

