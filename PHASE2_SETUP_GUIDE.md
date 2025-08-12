# Phase 2 Setup Guide - Real-time Location Tracking

## 🚨 Issues Fixed

1. **Backend Build Issue** - Fixed package.json scripts to build TypeScript before starting
2. **CORS Configuration** - Updated CORS middleware to handle multiple origins
3. **Environment Files** - Created proper .env files for both backend and frontend
4. **Database Schema** - Created Supabase-specific initialization script
5. **Setup Automation** - Created PowerShell scripts for easy setup

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PowerShell (for Windows)
- Supabase account with PostgreSQL database

## 🚀 Quick Setup (Automated)

### Option 1: Run the Setup Script (Recommended)

```powershell
# Run the automated setup script
.\setup-phase2.ps1
```

This script will:
- Create all necessary .env files
- Install dependencies for both backend and frontend
- Build the backend TypeScript code
- Provide next steps

### Option 2: Manual Setup

If you prefer manual setup, follow the steps below.

## 📝 Manual Setup Steps

### Step 1: Create Environment Files

#### Backend (.env)
Create `backend\.env` with the following content:

```bash
# Development Environment Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.gthwmwfwvhyriygpcdlr:Tirth%20Raval27@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Supabase Configuration
SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting (Development - More lenient)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging (Development - Verbose)
LOG_LEVEL=debug
ENABLE_DEBUG_LOGS=true

# Database Pool Configuration (Development)
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000
DB_RETRY_DELAY=5000
DB_MAX_RETRIES=5
```

#### Frontend (.env)
Create `frontend\.env` with the following content:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Map Configuration
VITE_MAPLIBRE_TOKEN=
```

### Step 2: Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Step 3: Build Backend

```bash
cd backend
npm run build
```

### Step 4: Initialize Database

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `backend\scripts\init-database-supabase.sql`
4. Paste and run the script in the SQL Editor

### Step 5: Start the Servers

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## 🧪 Testing

### Run the Test Script

```powershell
.\test-phase2.ps1
```

### Manual Testing

1. **Backend Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

2. **WebSocket Test**
   ```bash
   cd backend
   node test-websocket.js
   ```

3. **Frontend Test**
   - Open http://localhost:5173
   - Navigate to `/driver`
   - Test the driver interface

## 🔧 Troubleshooting

### Issue 1: Backend Build Error
**Error**: `Cannot find module 'C:\College Project\backend\dist\server.js'`

**Solution**:
```bash
cd backend
npm run build
```

### Issue 2: CORS Error
**Error**: `Cross-Origin Request Blocked`

**Solution**: 
- Ensure both backend and frontend are running
- Check that the CORS configuration in `backend/src/middleware/cors.ts` is correct
- Verify the frontend URL in the backend .env file

### Issue 3: Database Connection Error
**Error**: `Database connection failed`

**Solution**:
- Verify your Supabase credentials in the .env file
- Ensure the database initialization script has been run
- Check that PostGIS extension is enabled in Supabase

### Issue 4: WebSocket Connection Failed
**Error**: `WebSocket connection failed`

**Solution**:
- Ensure the backend server is running
- Check that Socket.IO is properly configured
- Verify the frontend WebSocket URL

### Issue 5: Authentication Error
**Error**: `Authentication failed`

**Solution**:
- Verify Supabase credentials
- Ensure user profiles exist in the database
- Check that RLS policies are correctly configured

## 📁 File Structure

```
College Project/
├── backend/
│   ├── .env                    # Backend environment variables
│   ├── dist/                   # Built JavaScript files
│   ├── src/
│   │   ├── sockets/
│   │   │   └── websocket.ts    # WebSocket server
│   │   ├── services/
│   │   │   └── locationService.ts
│   │   ├── utils/
│   │   │   └── validation.ts
│   │   └── server.ts
│   └── scripts/
│       └── init-database-supabase.sql
├── frontend/
│   ├── .env                    # Frontend environment variables
│   └── src/
│       ├── components/
│       │   └── DriverInterface.tsx
│       └── App.tsx
├── setup-phase2.ps1            # Automated setup script
├── test-phase2.ps1             # Test script
└── PHASE2_SETUP_GUIDE.md       # This file
```

## 🎯 Features Implemented

- ✅ WebSocket server with Socket.IO
- ✅ Driver authentication via Supabase
- ✅ Real-time GPS location tracking
- ✅ Database storage with PostGIS
- ✅ Mobile-friendly driver interface
- ✅ Error handling and validation
- ✅ CORS configuration
- ✅ Environment configuration

## 🚀 Next Steps

After successful setup:

1. **Test the Driver Interface**
   - Open http://localhost:5173/driver
   - Sign in with a driver account
   - Test GPS tracking

2. **Test WebSocket Communication**
   - Run the WebSocket test script
   - Verify real-time updates

3. **Database Verification**
   - Check that location data is being saved
   - Verify driver assignments

4. **Prepare for Phase 3**
   - Student map interface
   - ETA calculations
   - Route visualization

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Run the test script to identify problems
3. Verify all environment variables are set correctly
4. Ensure the database initialization script has been run

## 🎉 Success Indicators

You'll know Phase 2 is working correctly when:

- ✅ Backend server starts without errors
- ✅ Frontend loads without CORS issues
- ✅ WebSocket connection is established
- ✅ Driver interface loads and authenticates
- ✅ GPS tracking sends location updates
- ✅ Database stores location data
- ✅ Real-time updates are broadcasted

---

**Phase 2 is now ready for real-time bus location tracking!** 🚌📍
