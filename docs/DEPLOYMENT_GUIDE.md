# Deployment Guide

This guide covers deploying the University Bus Tracking System to various environments, from development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment](#development-environment)
3. [Production Deployment](#production-deployment)
4. [Render Backend Deployment](#render-backend-deployment)
5. [Vercel Frontend Deployment](#vercel-frontend-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher with PostGIS extension
- **Supabase Account**: For database and authentication services
- **Render Account**: For backend deployment
- **Vercel Account**: For frontend deployment

### Software Installation

#### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (for local development)
sudo apt install postgresql postgresql-contrib postgis -y
```

#### Windows
- Download and install Node.js from [nodejs.org](https://nodejs.org/)
- Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/)

## Development Environment

### Local Setup

1. **Clone Repository**
```bash
git clone https://github.com/tirthraval27/bus-tracking-system.git
cd bus-tracking-system
```

2. **Install Dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

3. **Environment Configuration**
```bash
# Backend
cp backend/env.example backend/env.local
# Edit backend/env.local with your configuration

# Frontend
cp frontend/env.example frontend/env.local
# Edit frontend/env.local with your configuration
```

4. **Database Setup**
```bash
# The project uses Supabase as the primary database
# No local database setup required for development
```

## Production Deployment

### Current Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│   (Supabase)    │
│   Vercel        │    │   Render        │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Deployment URLs

- **Frontend**: https://bts-frontend-navy.vercel.app
- **Backend**: https://bus-tracking-backend-sxh8.onrender.com
- **WebSocket**: wss://bus-tracking-backend-sxh8.onrender.com
- **Database**: Supabase (gthwmwfwvhyriygpcdlr.supabase.co)

## Render Backend Deployment

### Prerequisites
- Render account
- GitHub repository connected to Render
- Supabase project with API keys

### Deployment Steps

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `bus-tracking-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`

3. **Environment Variables**
   ```bash
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ADMIN_EMAILS=tirthraval27@gmail.com
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your backend

## Vercel Frontend Deployment

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Deployment Steps

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Environment Variables**
```bash
   VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=https://bus-tracking-backend-sxh8.onrender.com
   VITE_WEBSOCKET_URL=wss://bus-tracking-backend-sxh8.onrender.com
   VITE_ADMIN_EMAILS=tirthraval27@gmail.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy your frontend

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Server port | Yes | `3000` |
| `SUPABASE_URL` | Supabase project URL | Yes | `https://gthwmwfwvhyriygpcdlr.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `ADMIN_EMAILS` | Admin user emails | Yes | `admin@example.com,admin2@example.com` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://gthwmwfwvhyriygpcdlr.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_API_URL` | Backend API URL | Yes | `https://bus-tracking-backend-sxh8.onrender.com` |
| `VITE_WEBSOCKET_URL` | WebSocket connection URL | Yes | `wss://bus-tracking-backend-sxh8.onrender.com` |
| `VITE_ADMIN_EMAILS` | Admin user emails | Yes | `admin@example.com,admin2@example.com` |

## SSL/HTTPS Setup

### Render (Backend)
- SSL/HTTPS is automatically enabled
- Custom domains supported
- Automatic certificate renewal

### Vercel (Frontend)
- SSL/HTTPS is automatically enabled
- Custom domains supported
- Automatic certificate renewal

## Monitoring and Logging

### Render Monitoring
- Built-in logging and monitoring
- Performance metrics
- Error tracking
- Uptime monitoring

### Vercel Monitoring
- Built-in analytics
- Performance monitoring
- Error tracking
- Real-time logs

## Backup and Recovery

### Database Backup
- Supabase provides automatic backups
- Point-in-time recovery available
- Manual backup exports supported

### Code Backup
- GitHub repository serves as primary backup
- Multiple deployment environments
- Rollback capabilities

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure CORS origins are configured correctly
   - Check environment variables for API URLs

2. **WebSocket Connection Issues**
   - Verify WebSocket URL is correct
   - Check firewall settings
   - Ensure SSL certificates are valid

3. **Authentication Issues**
   - Verify Supabase keys are correct
   - Check environment variables
   - Ensure database is accessible

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript compilation errors
   - Fix syntax errors in code (e.g., mismatched braces)
   - Ensure BusInfo interface has all required properties

### Known Deployment Issues and Solutions

1. **TypeScript Error: Property 'assigned_driver_id' does not exist on type 'BusInfo'**
   - **Issue**: The BusInfo interface doesn't include the assigned_driver_id property used in the buses.ts route
   - **Solution**: Update the BusInfo interface in backend/src/services/locationService.ts to include the assigned_driver_id property

2. **TypeScript Error: Declaration or statement expected**
   - **Issue**: Syntax error in frontend/src/components/DriverDashboard.tsx due to misplaced code
   - **Solution**: Move the marker creation code inside the try block in the initializeMap function

3. **WebGL Context Loss in Maps**
   - **Issue**: MapLibre GL maps may lose WebGL context on some devices
   - **Solution**: Add preserveDrawingBuffer: true to the map initialization options

### Support Resources
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project GitHub Issues](https://github.com/tirthraval27/bus-tracking-system/issues)
