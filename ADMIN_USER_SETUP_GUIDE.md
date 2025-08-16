# 🚀 Admin User Setup Guide

## Adding siddharthmali.211@gmail.com as Admin User

Since you've already created the user in Supabase Authentication, we need to add the user to your database tables with the proper admin role.

---

## 📋 Prerequisites

✅ **User created in Supabase Auth** (Already done)
- Email: `siddharthmali.211@gmail.com`
- Password: `Siddharth57`

---

## 🔧 Method 1: Using SQL Script (Recommended)

### Step 1: Get User UUID from Supabase Dashboard

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Users**
3. Find the user `siddharthmali.211@gmail.com`
4. Copy the **User ID** (UUID)

### Step 2: Run SQL Script

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the following SQL:

```sql
-- Add Admin User Script for siddharthmali.211@gmail.com
-- Replace 'USER_UUID_HERE' with the actual UUID from Step 1

-- Step 1: Insert into users table
INSERT INTO public.users (id, email, role, first_name, last_name, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    'admin',
    'Siddharth',
    'Mali',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'siddharthmali.211@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    first_name = 'Siddharth',
    last_name = 'Mali',
    updated_at = NOW();

-- Step 2: Insert into profiles table
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    'Siddharth Mali',
    'admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'siddharthmali.211@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Siddharth Mali',
    role = 'admin',
    updated_at = NOW();

-- Step 3: Verify the setup
SELECT 
    'Admin User Setup Complete' as status,
    u.email,
    usr.role as user_role,
    p.role as profile_role,
    usr.first_name || ' ' || usr.last_name as full_name,
    CASE 
        WHEN usr.role = 'admin' AND p.role = 'admin' 
        THEN '✅ Admin role set correctly'
        ELSE '❌ Role mismatch detected'
    END as role_status
FROM auth.users u
LEFT JOIN public.users usr ON u.id = usr.id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'siddharthmali.211@gmail.com';
```

5. Click **Run** to execute the script

---

## 🔧 Method 2: Using Node.js Script

### Step 1: Ensure Environment Variables

Make sure your `backend/.env` file contains:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Run the Script

```bash
cd backend
node scripts/add-admin-user.js
```

---

## 🔧 Method 3: Manual Database Insert

If the above methods don't work, you can manually insert the records:

### Step 1: Get User UUID
1. Go to Supabase Dashboard → Authentication → Users
2. Copy the UUID for `siddharthmali.211@gmail.com`

### Step 2: Insert Records

```sql
-- Replace 'USER_UUID_HERE' with the actual UUID

-- Insert into users table
INSERT INTO public.users (id, email, role, first_name, last_name, created_at, updated_at)
VALUES (
    'USER_UUID_HERE',
    'siddharthmali.211@gmail.com',
    'admin',
    'Siddharth',
    'Mali',
    NOW(),
    NOW()
);

-- Insert into profiles table
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
VALUES (
    'USER_UUID_HERE',
    'Siddharth Mali',
    'admin',
    NOW(),
    NOW()
);
```

---

## ✅ Verification

After running any of the above methods, verify the setup:

### Check in Supabase Dashboard

1. Go to **Table Editor**
2. Check the `users` table:
   - Should have a record with email `siddharthmali.211@gmail.com`
   - Role should be `admin`

3. Check the `profiles` table:
   - Should have a record with the same UUID
   - Role should be `admin`
   - Full name should be `Siddharth Mali`

### Test Login

1. Start your frontend application:
   ```bash
   cd frontend
   npm run dev
   ```

2. Go to `http://localhost:5173/admin`

3. Login with:
   - **Email**: `siddharthmali.211@gmail.com`
   - **Password**: `Siddharth57`

4. You should be redirected to the admin dashboard

---

## 🚨 Troubleshooting

### Issue: "User not found in auth.users"
- **Solution**: Ensure the user exists in Supabase Authentication
- Go to Authentication → Users and verify the email exists

### Issue: "Role not set correctly"
- **Solution**: Check that both `users` and `profiles` tables have the admin role
- Run the verification query from Method 1

### Issue: "Cannot login to admin panel"
- **Solution**: 
  1. Check that the user has confirmed their email (if email confirmation is enabled)
  2. Verify the password is correct
  3. Check browser console for any errors

### Issue: "Access denied" after login
- **Solution**: Ensure the user has the `admin` role in both tables
- Check that your authentication middleware is working correctly

---

## 📞 Support

If you encounter any issues:

1. Check the browser console for errors
2. Check the backend server logs
3. Verify all environment variables are set correctly
4. Ensure the database tables exist and have the correct schema

---

## 🎉 Success!

Once completed, you should be able to:

- ✅ Login to the admin panel
- ✅ Access all admin features
- ✅ Manage buses, drivers, and routes
- ✅ View analytics and system health
- ✅ Access the live map with admin controls

**Login URL**: `http://localhost:5173/admin`
**Email**: `siddharthmali.211@gmail.com`
**Password**: `Siddharth57`




