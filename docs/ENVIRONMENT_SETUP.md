# Environment Variables Setup Guide

## Required Environment Variables

### Admin Supabase Configuration (NEW)
These are required for the admin panel to work with isolated authentication:

```env
VITE_ADMIN_SUPABASE_URL=https://your-admin-project.supabase.co
VITE_ADMIN_SUPABASE_ANON_KEY=your-admin-anon-key
```

**Note**: If you're using the same Supabase project for all roles, you can use the same URL and key for all three (admin, driver, student). The isolation is achieved through different storage keys, not different projects.

### Driver Supabase Configuration
```env
VITE_DRIVER_SUPABASE_URL=https://your-driver-project.supabase.co
VITE_DRIVER_SUPABASE_ANON_KEY=your-driver-anon-key
```

### Student Supabase Configuration
```env
VITE_STUDENT_SUPABASE_URL=https://your-student-project.supabase.co
VITE_STUDENT_SUPABASE_ANON_KEY=your-student-anon-key
```

### Legacy/Backward Compatibility
If you haven't migrated to role-specific clients yet, these will be used as fallback:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Admin Email Configuration
For admin role detection:

```env
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Setup Instructions

### 1. Create `.env` file in `frontend/` directory

```bash
cd frontend
touch .env
```

### 2. Add environment variables

Copy the template below and fill in your values:

```env
# Admin Supabase (NEW - Required for admin panel)
VITE_ADMIN_SUPABASE_URL=https://xxx.supabase.co
VITE_ADMIN_SUPABASE_ANON_KEY=xxx

# Driver Supabase
VITE_DRIVER_SUPABASE_URL=https://xxx.supabase.co
VITE_DRIVER_SUPABASE_ANON_KEY=xxx

# Student Supabase
VITE_STUDENT_SUPABASE_URL=https://xxx.supabase.co
VITE_STUDENT_SUPABASE_ANON_KEY=xxx

# Legacy (fallback, optional)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Admin Emails
VITE_ADMIN_EMAILS=admin@example.com
```

### 3. Verify Configuration

Run the validation script:

```bash
npm run env:validate
```

### 4. Restart Development Server

After adding environment variables, restart your dev server:

```bash
npm run dev
```

## Verification

To verify that environment variables are loaded correctly:

1. Check browser console for Supabase client initialization logs
2. Look for messages like:
   - `✅ admin Supabase client created successfully`
   - `✅ driver Supabase client created successfully`
   - `✅ student Supabase client created successfully`

## Troubleshooting

### Issue: "Invalid admin Supabase URL"
- Check that `VITE_ADMIN_SUPABASE_URL` is set correctly
- Ensure the URL format is: `https://xxx.supabase.co`

### Issue: "Invalid admin Supabase anon key"
- Verify `VITE_ADMIN_SUPABASE_ANON_KEY` is set
- Check that the key is the correct anon/public key (not service role key)

### Issue: Admin login not working
- Verify admin email is in `VITE_ADMIN_EMAILS`
- Check that user profile in database has `role = 'admin'`
- Verify admin Supabase client is being used (check console logs)

## Production Deployment

For production deployments (Vercel, Render, etc.):

1. Add environment variables in your deployment platform's dashboard
2. Ensure all `VITE_*` variables are set
3. Redeploy after adding variables

### Vercel
- Go to Project Settings → Environment Variables
- Add each variable for Production, Preview, and Development environments

### Render
- Go to Environment → Environment Variables
- Add each variable

## Security Notes

- **Never commit `.env` files** to version control
- Use `.env.example` as a template (without actual values)
- Use different Supabase projects for production vs development if possible
- Rotate keys regularly
- Use service role keys only on backend, never in frontend

