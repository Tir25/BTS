# 🚨 URGENT: Password Reset Instructions for adhyarumohit@gmail.com

## Problem
The driver `adhyarumohit@gmail.com` cannot log in because the password stored in Supabase Auth doesn't match the expected password "Mohit Adhyaru".

## ✅ SOLUTION: Reset Password via Supabase Dashboard (FASTEST)

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your **driver Supabase project** (the one with URL: `gthwmwfwvhyriygpcdlr.supabase.co`)

### Step 2: Navigate to Authentication
1. Click on **"Authentication"** in the left sidebar
2. Click on **"Users"** tab

### Step 3: Find and Update the User
1. Search for: `adhyarumohit@gmail.com`
2. Click on the user to open their details
3. Click **"Update User"** or **"Reset Password"** button
4. Set the new password to: `Mohit Adhyaru`
5. Click **"Save"** or **"Update"**

### Step 4: Verify and Test
1. Wait 10-15 seconds for the change to propagate
2. Clear browser cache and localStorage:
   - Open browser DevTools (F12)
   - Go to Application tab
   - Click "Clear storage" or manually clear:
     - localStorage
     - sessionStorage
     - Cookies
3. Try logging in with:
   - Email: `adhyarumohit@gmail.com`
   - Password: `Mohit Adhyaru`

## Alternative Solution: Wait for Backend Deployment

If the backend deployment has completed, you can use the password reset endpoint:

### Option A: Using cURL
```bash
curl -X POST https://bus-tracking-backend-sxh8.onrender.com/auth/driver/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adhyarumohit@gmail.com",
    "newPassword": "Mohit Adhyaru"
  }'
```

### Option B: Using the Script (once backend is deployed)
```bash
node scripts/reset-driver-password-production.js adhyarumohit@gmail.com "Mohit Adhyaru"
```

## Why This Is Happening

The code fixes we deployed will **prevent** this issue from happening again in the future, but they don't fix the **existing** password mismatch. The password for this user needs to be reset manually.

## After Password Reset

Once the password is reset:
1. ✅ The driver should be able to log in successfully
2. ✅ Future password updates through admin panel will work correctly (thanks to our fixes)
3. ✅ No more password mismatches will occur

## Verification

After resetting the password, verify:
1. ✅ User can log in with new password
2. ✅ No retry loops occur
3. ✅ Login completes successfully
4. ✅ Driver dashboard loads correctly

## Notes

- **Backend deployment**: The password reset endpoint might not be available yet if deployment is in progress
- **Render free tier**: The backend might be sleeping, which could cause delays
- **Supabase Dashboard**: This is the fastest and most reliable method to reset the password

## Contact

If you continue to experience issues after resetting the password:
1. Check backend logs on Render dashboard
2. Check Supabase Auth logs
3. Verify the user exists and is not banned
4. Verify the email is correct

---

**Status**: ⚠️ Password needs to be reset manually via Supabase Dashboard
**Priority**: 🔴 URGENT - Driver cannot log in until password is reset

