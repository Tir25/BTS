# Deployment Checklist for Bus Tracking System

This document provides step-by-step instructions for deploying the Bus Tracking System, with specific focus on the Driver Panel components.

## Prerequisites

- Supabase account and project created
- Vercel account
- Render account
- Access to all repositories and codebases

## 1. Supabase Configuration

### Database Setup
- [ ] Run the complete database recreation script (`complete_database_recreation.sql`) in Supabase SQL Editor
- [ ] Verify all tables are created: `users`, `profiles`, `drivers`, `routes`, `buses`, `live_locations`, `system_constants`
- [ ] Check that all indexes and triggers are properly created

### Row Level Security (RLS) Policies
- [ ] Enable RLS on all tables
- [ ] Create policies for driver access:
  ```sql
  -- Allow drivers to view their own profile
  create policy "drivers_view_own_profile"
  on profiles for select
  using (auth.uid() = id);

  -- Allow drivers to view their assigned bus
  create policy "drivers_view_assigned_bus"
  on buses for select
  using (assigned_driver_id = auth.uid());

  -- Allow drivers to update their bus location
  create policy "drivers_update_location"
  on live_locations for insert
  with check (
    exists(
      select 1 from buses 
      where buses.id = live_locations.bus_id 
      and buses.assigned_driver_id = auth.uid()
    )
  );
  ```

### Authentication Settings
- [ ] Configure Site URL in Supabase Auth Settings to match your Vercel domain
- [ ] Add all necessary Redirect URLs, including:
  - `https://{your-vercel-domain}`
  - `https://{your-vercel-domain}/driver`
  - `https://{your-vercel-domain}/admin`
- [ ] Ensure Email Auth provider is enabled

### Storage Buckets
- [ ] Create necessary buckets:
  - `profile-photos` - For user profile images
  - `bus-photos` - For bus images
  - `public-assets` - For public files
- [ ] Set appropriate bucket policies:
  ```sql
  -- Allow authenticated users to upload their own profile photos
  create policy "allow_auth_users_own_folder"
  on storage.objects for insert
  with check (
    auth.role() = 'authenticated' AND
    (bucket_id = 'profile-photos' AND path LIKE auth.uid() || '/%')
  );

  -- Allow public read access to certain buckets
  create policy "allow_public_read"
  on storage.objects for select
  using (bucket_id = 'public-assets');
  ```

### API Keys
- [ ] Note down the following from Supabase Project Settings:
  - Project URL
  - Anon Key
  - Service Role Key (for backend only)

## 2. Backend Configuration (Render)

### Project Setup
- [ ] Fork/clone the backend repository
- [ ] Connect Render to your GitHub repository
- [ ] Create a new Web Service in Render pointing to the backend repository

### Environment Variables
Set the following environment variables in Render Dashboard:

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`
- [ ] `SUPABASE_URL` = `https://your-project-id.supabase.co`
- [ ] `SUPABASE_ANON_KEY` = `your-anon-key`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
- [ ] `JWT_SECRET` = `your-jwt-secret` (generate a secure random string)
- [ ] `ADMIN_EMAILS` = `email1@example.com,email2@example.com`
- [ ] `DATABASE_URL` = `postgres://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres` (if using direct DB connection)

### Build Configuration
- [ ] Verify `buildCommand` in render.yaml: `npm install && npm run build`
- [ ] Verify `startCommand` in render.yaml: `npm start`
- [ ] Ensure backend `package.json` includes `"postinstall": "npm run build"`

### CORS Configuration
- [ ] Verify CORS is properly configured to accept requests from your Vercel domain:
  ```js
  // In your Express setup
  app.use(cors({
    origin: [
      'https://your-vercel-domain.vercel.app',
      'https://your-custom-domain.com'
    ],
    credentials: true
  }));
  ```

### Socket.IO Configuration
- [ ] Verify Socket.IO CORS settings:
  ```js
  const io = new Server(server, {
    cors: {
      origin: [
        'https://your-vercel-domain.vercel.app',
        'https://your-custom-domain.com'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  ```

## 3. Frontend Configuration (Vercel)

### Project Setup
- [ ] Fork/clone the frontend repository
- [ ] Connect Vercel to your GitHub repository
- [ ] Create a new Project in Vercel pointing to the frontend repository

### Environment Variables
Set the following environment variables in Vercel Dashboard:

- [ ] `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
- [ ] `VITE_ADMIN_EMAILS` = `email1@example.com,email2@example.com`
- [ ] `VITE_API_URL` = `https://your-backend-domain.onrender.com`
- [ ] `VITE_WEBSOCKET_URL` = `wss://your-backend-domain.onrender.com`

### Build Configuration
- [ ] Verify vercel.json contains proper rewrites for SPA routing:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- [ ] Ensure proper build commands in package.json:
  ```json
  "build": "tsc && vite build",
  "vercel-build": "npm run build"
  ```

### Route Configuration
- [ ] Verify routes in React Router point to the correct components for driver panel:
  ```jsx
  <Route path="/driver/login" element={<DriverLogin />} />
  <Route path="/driver/dashboard" element={<DriverDashboard />} />
  ```

## 4. Post-Deployment Verification

### Backend Tests
- [ ] Verify backend health endpoint (e.g., `GET /health` or `GET /api/status`)
- [ ] Test Socket.IO connection with a simple client
- [ ] Verify JWT authentication works correctly
- [ ] Check Supabase connectivity from backend

### Frontend Tests
- [ ] Verify driver login page loads correctly
- [ ] Test driver authentication flow
- [ ] Verify driver dashboard loads after login
- [ ] Test real-time location updates via Socket.IO
- [ ] Check map component renders correctly
- [ ] Verify all assets (images, styles) load properly

### Authentication Tests
- [ ] Test driver login with valid credentials
- [ ] Verify session persistence after page reload
- [ ] Check authorization guards for protected routes
- [ ] Test JWT token refreshing

### Database Tests
- [ ] Verify RLS policies work correctly:
  - Drivers can only see their assigned bus
  - Drivers can update their location
  - Admin can see all buses
- [ ] Check trigger functions execute correctly

## 5. Common Issues & Solutions

### CORS Errors
- Check that your backend CORS settings include your Vercel domain
- Verify WebSocket CORS settings
- Ensure credentials mode is properly configured

### Authentication Issues
- Confirm Supabase Site URL and Redirect URLs are set correctly
- Verify environment variables are correctly set in both Vercel and Render
- Check JWT secret is consistent

### WebSocket Connection Failures
- Verify WebSocket URL is using secure WebSockets (wss://) in production
- Ensure Socket.IO versions match between client and server
- Check Socket.IO transport configuration

### Database Permission Errors
- Review RLS policies for each table
- Verify user role assignments
- Check that auth.uid() is being used correctly in RLS policies

## 6. Maintenance & Monitoring

- [ ] Set up logging with a service like LogRocket or Sentry
- [ ] Configure performance monitoring
- [ ] Set up database backup routine
- [ ] Create monitoring alerts for critical services
- [ ] Document regular maintenance procedures

---

## Quick Reference: Required Environment Variables

### Supabase Keys
```
Project URL: https://your-project-id.supabase.co
Anon Key: your-anon-key
Service Role Key: your-service-role-key
```

### Backend (Render)
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
ADMIN_EMAILS=email1@example.com,email2@example.com
DATABASE_URL=postgres://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### Frontend (Vercel)
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_EMAILS=email1@example.com,email2@example.com
VITE_API_URL=https://your-backend-domain.onrender.com
VITE_WEBSOCKET_URL=wss://your-backend-domain.onrender.com
```
