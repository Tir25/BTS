# Driver Removal Summary

## Issue
Driver `adhyarumohit@gmail.com` (Mohit Adhyaru) was experiencing login issues:
- Continuous sign-in loop
- Error: `POST https://gthwmwfwvhyriygpcdlr.supabase.co/auth/v1/token?grant_type=password 400 (Bad Request)`
- Other drivers could login successfully

## Root Cause
The driver had an **orphaned auth user**:
- ✅ User existed in `auth.users` (Supabase Auth)
- ❌ User did NOT exist in `user_profiles` table
- This caused authentication to fail because the application expects users to exist in both places

## Resolution
Successfully removed the orphaned driver from the system:

### 1. Verified Orphaned Status
- ✅ User ID: `59349138-8d34-468c-a093-193af483473d`
- ✅ Email: `adhyarumohit@gmail.com`
- ✅ Existed in `auth.users` but not in `user_profiles`
- ✅ No related data in database tables (locations, assignments, etc.)

### 2. Deleted Auth User
- ✅ Deleted from `auth.users` using Supabase Admin API
- ✅ Related records automatically cleaned up (cascade delete):
  - `auth.identities`
  - `auth.sessions`
  - `auth.refresh_tokens`

### 3. Verification
- ✅ User no longer exists in `auth.users`
- ✅ User no longer exists in `auth.identities`
- ✅ No user_profiles record exists
- ✅ No related data in any database tables

## Script Created
Created cleanup script: `scripts/delete-orphaned-driver.js`
- Can be used to remove orphaned auth users in the future
- Includes verification and safety checks
- Uses Supabase Admin API for secure deletion

## Result
✅ **Driver completely removed from the system**
✅ **Login errors should no longer occur for this email**
✅ **No data inconsistencies remaining**

## Next Steps
1. ✅ Driver removed from Supabase Auth
2. ✅ All related data cleaned up
3. ✅ System is now consistent

If someone tries to login with `adhyarumohit@gmail.com`, they will receive a proper "user not found" error instead of getting stuck in a login loop.

---

**Date:** 2025-11-11
**Status:** ✅ Complete
**Driver Email:** adhyarumohit@gmail.com
**Driver ID:** 59349138-8d34-468c-a093-193af483473d

