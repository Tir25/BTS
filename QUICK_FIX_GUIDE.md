# 🚨 QUICK FIX: Reset Password for adhyarumohit@gmail.com

## The Problem
Login is failing with "Invalid credentials" error. The password in Supabase Auth doesn't match "Mohit Adhyaru".

## ✅ QUICK FIX (2 minutes)

### Option 1: Supabase Dashboard (Recommended - Fastest)

1. **Go to**: https://supabase.com/dashboard
2. **Select project**: `gthwmwfwvhyriygpcdlr` (driver project)
3. **Click**: Authentication > Users
4. **Search**: `adhyarumohit@gmail.com`
5. **Click user** > **Update User**
6. **Set password**: `Mohit Adhyaru`
7. **Save**
8. **Clear browser cache** (F12 > Application > Clear Storage)
9. **Try login again**

### Option 2: Wait for Backend (If dashboard doesn't work)

The backend endpoint will be available once deployment completes:
- Endpoint: `POST https://bus-tracking-backend-sxh8.onrender.com/auth/driver/reset-password`
- Body: `{"email": "adhyarumohit@gmail.com", "newPassword": "Mohit Adhyaru"}`

## Why This Happened

The password was set incorrectly when the driver was created/updated. Our code fixes prevent this from happening again, but the existing password needs to be reset.

## After Reset

- ✅ Login will work immediately
- ✅ Future password updates will work correctly
- ✅ No more password mismatches

---

**DO THIS NOW**: Reset password via Supabase Dashboard to fix login immediately.

