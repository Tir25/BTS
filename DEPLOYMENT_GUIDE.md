# 🚀 Bus Tracking System Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying the Bus Tracking System to production on Render (Backend) and Vercel (Frontend).

## ✅ Pre-Deployment Checklist

### 1. Code Changes Committed ✅
- ✅ Driver login authentication timeout fixes
- ✅ WebSocket integration improvements
- ✅ localStorage integration for bus info persistence
- ✅ CSS opacity parsing errors fixed
- ✅ Environment configuration updates for production

### 2. Configuration Files Verified ✅
- ✅ `render.yaml` - Backend and frontend services configured
- ✅ `frontend/vercel.json` - Vercel deployment configuration
- ✅ Environment variables properly configured
- ✅ TypeScript configurations valid
- ✅ Package.json scripts present

## 🚀 Deployment Steps

### Step 1: Backend Deployment (Render)

#### 1.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your GitHub repository

#### 1.2 Deploy Backend Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `Tir25/BTS`
3. Configure the service:
   - **Name**: `bus-tracking-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

#### 1.3 Set Environment Variables
Add these environment variables in Render dashboard:

```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk3MTQ1NSwiZXhwIjoyMDcwNTQ3NDU1fQ.LuwfYUuGMRQh3Gbc7NQuRCqZxLsS5CrQOd1eMjiWj2o
ADMIN_EMAILS=tirthraval27@gmail.com
```

#### 1.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note the service URL: `https://bus-tracking-backend.onrender.com`

### Step 2: Frontend Deployment (Vercel)

#### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Import your GitHub repository

#### 2.2 Configure Deployment
1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

#### 2.3 Set Environment Variables
Add these environment variables in Vercel dashboard:

```bash
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI
VITE_API_URL=https://bus-tracking-backend.onrender.com
VITE_WEBSOCKET_URL=wss://bus-tracking-backend.onrender.com
VITE_ADMIN_EMAILS=tirthraval27@gmail.com
```

#### 2.4 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Note the frontend URL: `https://bus-tracking-frontend.vercel.app`

## 🔧 Post-Deployment Verification

### 1. Test Backend Health
```bash
curl https://bus-tracking-backend.onrender.com/api/health
```
Expected response: `{"success":true,"message":"Server is running"}`

### 2. Test Frontend
1. Open `https://bus-tracking-frontend.vercel.app`
2. Verify the homepage loads correctly
3. Test navigation between pages

### 3. Test Driver Login
1. Go to Driver Login page
2. Use test credentials:
   - **Email**: `prathambhatt771@gmail.com`
   - **Password**: (your driver password)
3. Verify authentication works without timeout
4. Verify redirect to driver dashboard
5. Verify bus info is displayed correctly

### 4. Test WebSocket Connection
1. Open browser developer tools
2. Check console for WebSocket connection logs
3. Verify no authentication timeout errors
4. Verify real-time location updates work

## 🐛 Troubleshooting

### Common Issues

#### 1. Backend Deployment Fails
- **Issue**: Build errors
- **Solution**: Check build logs in Render dashboard
- **Common causes**: Missing dependencies, TypeScript errors

#### 2. Frontend Can't Connect to Backend
- **Issue**: CORS errors
- **Solution**: Verify environment variables are set correctly
- **Check**: `VITE_API_URL` points to correct backend URL

#### 3. WebSocket Connection Fails
- **Issue**: WebSocket connection timeout
- **Solution**: Verify `VITE_WEBSOCKET_URL` is set correctly
- **Check**: Backend WebSocket service is running

#### 4. Driver Login Timeout
- **Issue**: Authentication timeout after 10 seconds
- **Solution**: Check backend logs for authentication errors
- **Verify**: Supabase credentials are correct

### Debug Commands

#### Check Backend Logs
```bash
# In Render dashboard
# Go to your service → Logs
```

#### Check Frontend Build
```bash
# Local testing
cd frontend
npm run build
```

#### Verify Environment Variables
```bash
# Run verification script
node scripts/verify-deployment-config.js
```

## 📊 Monitoring

### 1. Render Dashboard
- Monitor backend service health
- Check deployment logs
- Monitor resource usage

### 2. Vercel Dashboard
- Monitor frontend deployment
- Check build logs
- Monitor performance

### 3. Supabase Dashboard
- Monitor database connections
- Check authentication logs
- Monitor API usage

## 🔄 Continuous Deployment

### Automatic Deployments
- **Render**: Automatically deploys on push to `main` branch
- **Vercel**: Automatically deploys on push to `main` branch

### Manual Deployments
- **Render**: Go to service → Manual Deploy
- **Vercel**: Go to project → Deployments → Redeploy

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review deployment logs in Render/Vercel dashboards
3. Verify environment variables are set correctly
4. Test locally first: `npm run dev` in both frontend and backend

## 🎉 Success Criteria

Deployment is successful when:

- ✅ Backend health check returns success
- ✅ Frontend loads without errors
- ✅ Driver login works without timeout
- ✅ WebSocket connection establishes successfully
- ✅ Real-time location updates work
- ✅ All environment variables are properly set

---

**Last Updated**: December 2024
**Version**: 1.0
