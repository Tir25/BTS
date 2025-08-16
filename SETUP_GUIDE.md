# 🚀 Bus Tracking System - Complete Setup Guide

## 📋 **SYSTEM OVERVIEW**

This is a comprehensive real-time bus tracking system with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Real-time**: WebSocket connections
- **Authentication**: Supabase Auth
- **Maps**: MapLibre GL JS

## 🔧 **PREREQUISITES**

- Node.js 18+ and npm
- Git
- Modern web browser
- Internet connection (for Supabase)

## 🚀 **QUICK START**

### Option 1: Automated Setup (Recommended)
```powershell
# Run the automated startup script
.\start-system.ps1
```

### Option 2: Manual Setup
Follow the detailed steps below.

## 📦 **MANUAL SETUP STEPS**

### 1. **Environment Configuration**

#### Frontend Environment
Create `frontend/env.local`:
```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Map Configuration
VITE_MAPLIBRE_TOKEN=
```

#### Backend Environment
Create `backend/env.local`:
```env
# Development Environment Configuration
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001

# Database Configuration - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.gthwmwfwvhyriygpcdlr:Tirth%20Raval27@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Supabase Configuration
SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175

# Rate Limiting (Development - More lenient)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5000

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

### 2. **Install Dependencies**

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. **Build Backend**

```bash
cd backend
npm run build
```

### 4. **Start the System**

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

## 🧪 **TESTING THE SYSTEM**

### Run System Tests
```bash
node test-system.js
```

### Manual Testing
1. **Backend Health**: http://localhost:3000/health
2. **Frontend**: http://localhost:5173
3. **Admin Panel**: http://localhost:5173/admin

## 🔐 **ADMIN ACCESS**

### Default Admin Credentials
- **Email**: `siddharthmali.211@gmail.com`
- **Password**: `Siddharth57`

### Creating New Admin User
1. Go to Supabase Dashboard
2. Navigate to Authentication → Users
3. Create a new user
4. Run the SQL script in `sql/add-admin-user.sql`

## 📊 **SYSTEM COMPONENTS**

### Frontend Routes
- `/` - Home page with system overview
- `/driver` - Driver interface for location updates
- `/student` - Student map with live bus tracking
- `/admin` - Admin panel with management tools

### Backend Endpoints
- `GET /health` - System health check
- `GET /health/detailed` - Detailed system status
- `GET /admin/*` - Admin management endpoints
- `GET /buses/*` - Bus management endpoints
- `GET /routes/*` - Route management endpoints
- `POST /storage/*` - File upload endpoints

### Database Tables
- `profiles` - User profiles and roles
- `users` - User authentication data
- `buses` - Bus information and assignments
- `routes` - Route definitions with geometry
- `live_locations` - Real-time bus locations

## 🛠️ **TROUBLESHOOTING**

### Common Issues

#### 1. **Backend Won't Start**
- Check if port 3000 is available
- Verify environment variables in `backend/env.local`
- Check database connection

#### 2. **Frontend Won't Connect to Backend**
- Ensure backend is running on port 3000
- Check CORS configuration
- Verify API URL in frontend environment

#### 3. **Database Connection Issues**
- Verify Supabase credentials
- Check network connectivity
- Ensure database tables exist

#### 4. **Authentication Problems**
- Verify Supabase configuration
- Check if user exists in Supabase Auth
- Ensure profile is created in database

### Debug Commands

```bash
# Check backend logs
cd backend && npm run dev

# Check frontend logs
cd frontend && npm run dev

# Test database connection
node test-database.js

# Test WebSocket connection
node test-websocket.js
```

## 🔧 **DEVELOPMENT**

### Project Structure
```
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── config/        # Configuration
│   │   └── types/         # TypeScript types
│   └── env.local          # Frontend environment
├── backend/           # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── config/        # Configuration
│   └── env.local          # Backend environment
├── sql/              # Database scripts
├── scripts/          # Utility scripts
└── docs/             # Documentation
```

### Available Scripts

#### Root Level
```bash
npm run dev              # Start both frontend and backend
npm run build            # Build both frontend and backend
npm run install:all      # Install all dependencies
```

#### Backend
```bash
cd backend
npm run dev              # Start development server
npm run build            # Build TypeScript
npm run start            # Start production server
```

#### Frontend
```bash
cd frontend
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🚀 **DEPLOYMENT**

### Production Environment
1. Set `NODE_ENV=production`
2. Update environment variables for production
3. Build both frontend and backend
4. Deploy to your hosting platform

### Environment Variables for Production
- Use production Supabase project
- Set proper CORS origins
- Configure rate limiting
- Enable SSL/TLS

## 📞 **SUPPORT**

### Getting Help
1. Check the troubleshooting section above
2. Review the logs for error messages
3. Test individual components
4. Verify environment configuration

### System Status
- **Backend Health**: http://localhost:3000/health
- **Database Status**: Check Supabase Dashboard
- **Frontend Status**: Check browser console

## 🎉 **SUCCESS INDICATORS**

Your system is working correctly when:
- ✅ Backend health check returns "healthy"
- ✅ Frontend loads without errors
- ✅ Admin login works
- ✅ Database tables are accessible
- ✅ WebSocket connections are established
- ✅ Real-time updates work

---

**🎯 System is now ready for use!**
